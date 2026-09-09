import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const WIX_SUBSCRIPTIONS_URL = 'https://www.wixapis.com/payments/base44/v1/subscriptions';

// Self-service subscription management for the signed-in subscriber.
//   status — read the live Wix subscription status for their own paid purchase.
//   cancel  — buyer-facing cancel: soft cancel first (auto-renew off, access
//             continues through the paid period), falling back to an immediate
//             cancel when soft cancel is not possible. The payments webhook
//             (SUBSCRIPTION_CANCELED / SUBSCRIPTION_ENDED) revokes access.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Resolve the caller's own paid purchase (RLS already limits reads to
    // their records; the id check keeps the selection explicit).
    const purchases = await base44.entities.Base44Purchase.filter({ status: 'paid' });
    const mine = (purchases || [])
      .filter((p) => (p.appUserId === user.id || p.created_by_id === user.id) && p.subscriptionId)
      .sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
    const purchase = mine[0];

    if (!purchase) {
      return Response.json({ error: 'No active subscription found for your account.' }, { status: 404 });
    }

    const apiKey = secrets.get('WIX_CHECKOUT_API_KEY');
    const siteId = secrets.get('WIX_CHECKOUT_SITE_ID');
    if (!apiKey || !siteId) {
      console.error('manage-subscription: missing Wix credentials');
      return Response.json({ error: 'Subscription management is not configured.' }, { status: 500 });
    }
    const headers = {
      'Authorization': apiKey,
      'wix-site-id': siteId,
    };

    if (action === 'status') {
      const res = await fetch(`${WIX_SUBSCRIPTIONS_URL}/${purchase.subscriptionId}`, { method: 'GET', headers });
      if (!res.ok) {
        console.error(`manage-subscription: status fetch failed (${res.status})`);
        return Response.json({ error: 'Could not read your subscription status right now.' }, { status: 502 });
      }
      const data = await res.json();
      return Response.json({
        subscription: { id: purchase.subscriptionId, status: data?.subscription?.status || 'UNKNOWN' },
        paid_at: purchase.paidAt,
      });
    }

    if (action === 'cancel') {
      const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 500) : undefined;
      const attempt = async (immediate) => {
        const res = await fetch(`${WIX_SUBSCRIPTIONS_URL}/${purchase.subscriptionId}/cancel`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription_id: purchase.subscriptionId, reason, immediate }),
        });
        const data = await res.json().catch(() => null);
        return { ok: res.ok, data };
      };
      // Soft cancel first so the buyer keeps the period they paid for; fall
      // back to an immediate cancel when soft cancel is not possible.
      let result = await attempt(false);
      let immediate = false;
      if (!result.ok) {
        result = await attempt(true);
        immediate = true;
      }
      if (!result.ok) {
        console.error('manage-subscription: cancel failed', result.data);
        return Response.json({ error: 'Cancellation failed. Please try again in a moment.' }, { status: 502 });
      }
      await base44.entities.AuditLog.create({
        action: 'subscription_canceled_by_user',
        entity_type: 'Base44Purchase',
        entity_id: purchase.id,
        details: `User-initiated cancel (immediate: ${immediate})`,
      });
      return Response.json({ immediate, status: result.data?.subscription?.status || 'CANCELED' });
    }

    return Response.json({ error: 'Unknown action. Use "status" or "cancel".' }, { status: 400 });
  } catch (error) {
    console.error('manage-subscription failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
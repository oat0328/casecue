import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const today = () => new Date().toISOString().slice(0, 10);
const validThrough = (value) => !value || String(value) >= today();

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const orgId = user?.organization_id || user?.data?.organization_id || null;

    let subscription = null;
    if (orgId) {
      const subs = await svc.entities.Subscription.filter({ organization_id: orgId }, '-created_date', 5);
      subscription = (subs || [])[0] || null;
    }

    if (subscription) {
      if (subscription.status === 'demo') {
        return Response.json({ allowed: true, source: 'demo', subscription });
      }
      if (subscription.status === 'active') {
        return Response.json({ allowed: true, source: 'organization_subscription', subscription });
      }
      if (subscription.status === 'complimentary' && validThrough(subscription.complimentary_end)) {
        return Response.json({ allowed: true, source: 'complimentary', subscription });
      }
      if (subscription.status === 'trialing' && validThrough(subscription.trial_end)) {
        return Response.json({ allowed: true, source: 'trial', subscription });
      }
    }

    let purchases = await svc.entities.Base44Purchase.filter({ appUserId: user.id, status: 'paid' }, '-paidAt', 20);
    if ((!purchases || !purchases.length) && user.email) {
      purchases = await svc.entities.Base44Purchase.filter({ buyerEmail: user.email, status: 'paid' }, '-paidAt', 20);
    }
    if (purchases && purchases.length) {
      return Response.json({ allowed: true, source: 'paid_purchase', purchase_id: purchases[0].id, subscription });
    }

    return Response.json({
      allowed: false,
      source: subscription?.status || 'no_active_access',
      trial_end: subscription?.trial_end || null,
      subscription,
    });
  } catch (error) {
    console.error('subscriptionAccess failed:', error);
    return Response.json({ error: 'Could not verify subscription access.' }, { status: 500 });
  }
}

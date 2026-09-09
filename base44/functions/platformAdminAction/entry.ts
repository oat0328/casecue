import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { daysFromNow, getActiveMembership } from "../../shared/orgService.ts";

// Platform Owner account actions — free access grants, trials, suspension,
// restore, and private notes. Platform-owner-only (school admins are denied); every action requires a reason and
// is recorded in the audit log. No Stripe, no payment information.
const TRIAL_LENGTHS = [7, 14, 30, 60, 90];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;
    const membership = await getActiveMembership(svc, user.id);
    if (!membership || membership.org_role !== 'platform_owner') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const organizationId = body.organization_id;
    const reason = String(body.reason || '').trim();

    if (!action || !organizationId) {
      return Response.json({ error: 'Missing action or organization.' }, { status: 400 });
    }
    if (action !== 'set_note' && reason.length < 3) {
      return Response.json({ error: 'A reason is required for this action.' }, { status: 400 });
    }

    const subs = await svc.entities.Subscription.filter({ organization_id: organizationId }, '-created_date', 10);
    const sub = subs && subs.length ? subs[0] : null;

    let data;
    let createIfMissing = false;

    switch (action) {
      case 'grant_complimentary': {
        const until = body.until_date ? String(body.until_date).slice(0, 10) : null;
        data = { status: 'complimentary', complimentary_end: until, trial_end: null };
        createIfMissing = true;
        break;
      }
      case 'start_trial': {
        const days = Number(body.days);
        if (!TRIAL_LENGTHS.includes(days)) {
          return Response.json({ error: 'Trial length must be 7, 14, 30, 60, or 90 days.' }, { status: 400 });
        }
        data = { status: 'trialing', trial_end: daysFromNow(days), complimentary_end: null };
        createIfMissing = true;
        break;
      }
      case 'extend_trial': {
        if (!sub) return Response.json({ error: 'This organization has no trial to extend.' }, { status: 400 });
        const days = Number(body.days);
        if (!days || days < 1 || days > 365) {
          return Response.json({ error: 'Extension must be 1-365 days.' }, { status: 400 });
        }
        const today = new Date().toISOString().slice(0, 10);
        const base = sub.trial_end && sub.trial_end > today ? new Date(sub.trial_end) : new Date();
        base.setDate(base.getDate() + days);
        data = { status: 'trialing', trial_end: base.toISOString().slice(0, 10) };
        break;
      }
      case 'revoke_free_access': {
        if (!sub) return Response.json({ error: 'This organization has no free access to revoke.' }, { status: 400 });
        data = { status: 'expired', trial_end: null, complimentary_end: null };
        break;
      }
      case 'suspend': {
        if (!sub) return Response.json({ error: 'This organization has no subscription record.' }, { status: 400 });
        data = { status: 'suspended', previous_status: sub.status || 'trialing' };
        break;
      }
      case 'restore': {
        if (!sub) return Response.json({ error: 'This organization has no subscription record.' }, { status: 400 });
        const prev = sub.previous_status && sub.previous_status !== 'suspended' ? sub.previous_status : 'trialing';
        data = { status: prev, previous_status: null };
        break;
      }
      case 'set_note': {
        data = { internal_note: String(body.note || '').slice(0, 2000) };
        break;
      }
      default:
        return Response.json({ error: 'Unknown action.' }, { status: 400 });
    }

    if (!sub && !createIfMissing) {
      return Response.json({ error: 'No subscription found for this organization.' }, { status: 400 });
    }

    let updated;
    if (sub) {
      updated = await svc.entities.Subscription.update(sub.id, data);
    } else {
      updated = await svc.entities.Subscription.create({ organization_id: organizationId, monthly_price: 0, ...data });
    }

    await svc.entities.AuditLog.create({
      action: `platform_admin_${action}`,
      entity_type: 'Subscription',
      entity_id: sub ? sub.id : updated.id,
      details: `Org ${organizationId} — by ${user.email}. Reason: ${reason || 'note update'}`,
    });

    return Response.json({
      ok: true,
      subscription: {
        id: updated.id,
        status: updated.status,
        trial_end: updated.trial_end || null,
        complimentary_end: updated.complimentary_end || null,
      },
    });
  } catch (error) {
    console.error('platformAdminAction failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
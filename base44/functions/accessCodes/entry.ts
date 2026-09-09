import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { daysFromNow, getActiveMembership } from "../../shared/orgService.ts";

// Free access-code system — no Stripe, no payment information.
// Seeds the default codes (CASECUEBETA / TEACHERDEMO / FOUNDER) on first use.
const DEFAULT_CODES = [
  { code: 'CASECUEBETA', label: 'Beta Trial — 30 Days Free', grant_type: 'trial', trial_days: 30, max_redemptions: 100, active: true },
  { code: 'TEACHERDEMO', label: 'Teacher Demo — Fictional Data', grant_type: 'demo', max_redemptions: 500, active: true },
  { code: 'FOUNDER', label: 'Founding Teacher — Complimentary Access', grant_type: 'complimentary', max_redemptions: 10, active: true },
];

async function ensureSeeded(svc) {
  const existing = await svc.entities.AccessCode.list('-created_date', 100);
  if (existing && existing.length) return existing;
  for (const c of DEFAULT_CODES) {
    await svc.entities.AccessCode.create(c);
  }
  return svc.entities.AccessCode.list('-created_date', 100);
}

function grantFor(code) {
  if (code.grant_type === 'demo') {
    return { status: 'demo', plan_name: 'CaseCue Demo', trial_end: null, complimentary_end: null, ends: null };
  }
  if (code.grant_type === 'complimentary') {
    return { status: 'complimentary', plan_name: code.label || 'Complimentary Access', trial_end: null, complimentary_end: null, ends: null };
  }
  const days = code.trial_days || 14;
  const end = daysFromNow(days);
  return { status: 'trialing', plan_name: code.label || `Trial — ${days} Days Free`, trial_end: end, complimentary_end: null, ends: end };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    if (body.action === 'list') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const codes = await ensureSeeded(svc);
      return Response.json({
        codes: codes.map((c) => ({
          id: c.id,
          code: c.code,
          label: c.label,
          grant_type: c.grant_type,
          trial_days: c.trial_days || null,
          max_redemptions: c.max_redemptions || null,
          redemption_count: (c.redemptions || []).length,
          active: !!c.active,
          expiration_date: c.expiration_date || null,
        })),
      });
    }

    if (body.action === 'redeem') {
      const codeStr = String(body.code || '').trim().toUpperCase();
      if (!codeStr) return Response.json({ error: 'Enter an access code.' }, { status: 400 });
      const codes = await ensureSeeded(svc);
      const match = codes.find((c) => String(c.code || '').toUpperCase() === codeStr);
      if (!match) return Response.json({ error: 'That access code is not valid.' }, { status: 400 });
      if (!match.active) return Response.json({ error: 'This access code is no longer active.' }, { status: 400 });
      if (match.expiration_date && match.expiration_date < new Date().toISOString().slice(0, 10)) {
        return Response.json({ error: 'This access code has expired.' }, { status: 400 });
      }
      const history = match.redemptions || [];
      if (history.some((r) => r.user_id === user.id)) {
        return Response.json({ error: 'You have already redeemed this code.' }, { status: 400 });
      }
      if (match.max_redemptions && history.length >= match.max_redemptions) {
        return Response.json({ error: 'This access code has reached its redemption limit.' }, { status: 400 });
      }
      const membership = await getActiveMembership(svc, user.id);
      if (!membership) {
        return Response.json({ error: 'Finish setting up your workspace before redeeming a code.' }, { status: 400 });
      }

      const grant = grantFor(match);
      const payload = {
        organization_id: membership.organization_id,
        status: grant.status,
        plan_name: grant.plan_name,
        monthly_price: 0,
        trial_end: grant.trial_end,
        complimentary_end: grant.complimentary_end,
      };
      const existingSubs = await svc.entities.Subscription.filter(
        { organization_id: membership.organization_id }, '-created_date', 10
      );
      if (existingSubs && existingSubs.length) {
        await svc.entities.Subscription.update(existingSubs[0].id, payload);
      } else {
        await svc.entities.Subscription.create(payload);
      }

      await svc.entities.AccessCode.update(match.id, {
        redemptions: [...history, { user_id: user.id, user_email: user.email, redeemed_at: new Date().toISOString() }],
      });
      await svc.entities.AuditLog.create({
        action: 'access_code_redeemed',
        entity_type: 'AccessCode',
        entity_id: match.id,
        details: `Code ${match.code} redeemed by ${user.email} — access: ${grant.status}`,
      });

      return Response.json({ ok: true, access: { status: grant.status, plan_name: grant.plan_name, ends: grant.ends } });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('accessCodes failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
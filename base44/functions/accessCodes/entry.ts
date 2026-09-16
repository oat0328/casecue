import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { daysFromNow, getActiveMembership } from "../../shared/orgService.ts";

// Free access-code system — no Stripe, no payment information.
// Seeds the real production codes on first use; the Platform Owner can create,
// edit, and deactivate additional codes from the Admin Center.

const DEFAULT_CODES = [
  {
    code: 'CASECUEBETA',
    label: 'Beta Founding Teacher — 30 Days Complimentary',
    description: '30 days of complimentary Founding Teacher access. No payment method required.',
    grant_type: 'complimentary',
    access_days: 30,
    plan_name: 'Founding Teacher',
    max_redemptions: 25,
    active: true,
  },
  {
    code: 'FOUNDER25',
    label: 'Founding Teacher — $29.99/month',
    description: 'Founding Teacher plan for $29.99 per month with a 14-day free trial.',
    grant_type: 'trial',
    trial_days: 14,
    plan_name: 'Founding Teacher',
    monthly_price: 29.99,
    max_redemptions: 100,
    active: true,
  },
  {
    code: 'TEACHERDEMO',
    label: 'Teacher Demo — Fictional Data Only',
    description: 'Demo access with fictional students only. No real student uploads.',
    grant_type: 'demo',
    plan_name: 'CaseCue Demo',
    max_redemptions: 100,
    active: true,
  },
  {
    code: 'PILOT90',
    label: 'Pilot Program — 90 Days Complimentary',
    description: '90 days of complimentary access for pilot programs. Inactive until the Platform Owner activates it.',
    grant_type: 'complimentary',
    access_days: 90,
    plan_name: 'Founding Teacher',
    max_redemptions: 10,
    active: false,
  },
];

async function listCodes(svc) {
  return svc.entities.AccessCode.list('-created_date', 100);
}

async function ensureSeeded(svc) {
  const existing = await listCodes(svc);
  if (existing && existing.length) return existing;
  for (const c of DEFAULT_CODES) {
    await svc.entities.AccessCode.create(c);
  }
  return listCodes(svc);
}

function grantFor(code) {
  if (code.grant_type === 'demo') {
    return { status: 'demo', plan_name: code.plan_name || 'CaseCue Demo', monthly_price: 0, trial_end: null, complimentary_end: null, ends: null };
  }
  if (code.grant_type === 'complimentary') {
    const end = daysFromNow(code.access_days || 30);
    return { status: 'complimentary', plan_name: code.plan_name || 'Complimentary Access', monthly_price: 0, trial_end: null, complimentary_end: end, ends: end };
  }
  const days = code.trial_days || 14;
  const end = daysFromNow(days);
  return { status: 'trialing', plan_name: code.plan_name || `Trial — ${days} Days Free`, monthly_price: code.monthly_price || 0, trial_end: end, complimentary_end: null, ends: end };
}

function publicCode(c) {
  return {
    id: c.id,
    code: c.code,
    label: c.label,
    description: c.description || '',
    grant_type: c.grant_type,
    plan_name: c.plan_name || '',
    monthly_price: c.monthly_price || 0,
    discount_pct: c.discount_pct || 0,
    trial_days: c.trial_days || null,
    access_days: c.access_days || null,
    start_date: c.start_date || null,
    expiration_date: c.expiration_date || null,
    max_redemptions: c.max_redemptions || null,
    redemption_count: (c.redemptions || []).length,
    active: !!c.active,
    created_by: c.created_by || '',
    created_date: c.created_date || null,
    redemptions: (c.redemptions || []).map((r) => ({ user_email: r.user_email, redeemed_at: r.redeemed_at })),
  };
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
      return Response.json({ codes: codes.map(publicCode) });
    }

    if (body.action === 'create') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const codeStr = String(body.code || '').trim().toUpperCase();
      if (!codeStr) return Response.json({ error: 'Enter a code.' }, { status: 400 });
      const codes = await listCodes(svc);
      // Case-insensitive duplicate prevention
      if (codes.some((c) => String(c.code || '').toUpperCase() === codeStr)) {
        return Response.json({ error: 'A code with this name already exists.' }, { status: 400 });
      }
      const created = await svc.entities.AccessCode.create({
        code: codeStr,
        label: String(body.label || codeStr).slice(0, 120),
        description: String(body.description || '').slice(0, 500),
        grant_type: ['trial', 'complimentary', 'demo'].includes(body.grant_type) ? body.grant_type : 'trial',
        plan_name: String(body.plan_name || '').slice(0, 120),
        monthly_price: Number(body.monthly_price) || 0,
        discount_pct: Number(body.discount_pct) || 0,
        trial_days: Number(body.trial_days) || null,
        access_days: Number(body.access_days) || null,
        start_date: body.start_date || null,
        expiration_date: body.expiration_date || null,
        max_redemptions: Number(body.max_redemptions) || null,
        active: body.active !== false,
        created_by: user.email,
      });
      await svc.entities.AuditLog.create({
        action: 'access_code_created',
        entity_type: 'AccessCode',
        entity_id: created.id,
        details: `Code ${codeStr} created by ${user.email}`,
      });
      return Response.json({ ok: true, code: publicCode(created) });
    }

    if (body.action === 'update') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const codes = await listCodes(svc);
      const match = codes.find((c) => c.id === body.id);
      if (!match) return Response.json({ error: 'Code not found.' }, { status: 404 });
      const patch = {};
      if (body.label !== undefined) patch.label = String(body.label).slice(0, 120);
      if (body.description !== undefined) patch.description = String(body.description).slice(0, 500);
      if (body.max_redemptions !== undefined) patch.max_redemptions = Number(body.max_redemptions) || null;
      if (body.expiration_date !== undefined) patch.expiration_date = body.expiration_date || null;
      if (body.active !== undefined) patch.active = !!body.active;
      if (!Object.keys(patch).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 });
      await svc.entities.AccessCode.update(match.id, patch);
      await svc.entities.AuditLog.create({
        action: 'access_code_updated',
        entity_type: 'AccessCode',
        entity_id: match.id,
        details: `Code ${match.code} updated by ${user.email}: ${Object.keys(patch).join(', ')}`,
      });
      return Response.json({ ok: true });
    }

    if (body.action === 'redeem') {
      const codeStr = String(body.code || '').trim().toUpperCase();
      if (!codeStr) return Response.json({ error: 'Enter an access code.' }, { status: 400 });
      const codes = await ensureSeeded(svc);
      const match = codes.find((c) => String(c.code || '').toUpperCase() === codeStr);
      if (!match) return Response.json({ error: 'That access code is not valid.' }, { status: 400 });
      if (!match.active) return Response.json({ error: 'This access code is no longer active.' }, { status: 400 });
      const today = new Date().toISOString().slice(0, 10);
      if (match.start_date && match.start_date > today) {
        return Response.json({ error: 'This access code is not active yet.' }, { status: 400 });
      }
      if (match.expiration_date && match.expiration_date < today) {
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
        monthly_price: grant.monthly_price,
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
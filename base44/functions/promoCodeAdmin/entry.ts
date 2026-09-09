import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Platform-owner promo code management: list / create / duplicate / update
// (edit, pause, extend) / delete — every action audit-logged. Admin-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const audit = (a, id, details) =>
      base44.entities.AuditLog.create({ action: a, entity_type: 'PromoCode', entity_id: id || '', details: String(details || '') });

    if (action === 'list') {
      const codes = await base44.entities.PromoCode.list('-created_date', 200);
      return Response.json({ codes });
    }

    if (action === 'create' || action === 'duplicate') {
      const code = String(body.code || '').trim().toUpperCase();
      if (!code) return Response.json({ error: 'Code is required' }, { status: 400 });
      const existing = await base44.entities.PromoCode.filter({ code });
      if ((existing || []).length > 0) return Response.json({ error: 'That code already exists' }, { status: 400 });

      const rec = await base44.entities.PromoCode.create({
        code,
        description: String(body.description || ''),
        discount_type: String(body.discount_type || 'percent_off'),
        value: Number(body.value) || 0,
        start_date: body.start_date || '',
        expiration_date: body.expiration_date || '',
        max_uses: Number(body.max_uses) || 0,
        active: body.active !== false,
        single_use_per_user: !!body.single_use_per_user,
        allowed_email_domains: (body.allowed_email_domains || []).map(String),
        invite_emails: (body.invite_emails || []).map(String),
        founding_member: !!body.founding_member,
        beta_tester: !!body.beta_tester,
        redemptions: [],
        validation_count: 0,
      });
      await audit(action === 'duplicate' ? 'promo_code_duplicated' : 'promo_code_created', rec.id,
        `${code} — ${rec.discount_type} value ${rec.value}${rec.max_uses ? `, max ${rec.max_uses} uses` : ''}`);
      return Response.json({ code: rec });
    }

    if (action === 'update') {
      const id = String(body.id || '');
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const updates = {};
      if (body.description !== undefined) updates.description = String(body.description);
      if (body.value !== undefined) updates.value = Number(body.value) || 0;
      if (body.start_date !== undefined) updates.start_date = body.start_date || '';
      if (body.expiration_date !== undefined) updates.expiration_date = body.expiration_date || '';
      if (body.max_uses !== undefined) updates.max_uses = Number(body.max_uses) || 0;
      if (body.active !== undefined) updates.active = !!body.active;
      if (body.single_use_per_user !== undefined) updates.single_use_per_user = !!body.single_use_per_user;
      if (body.founding_member !== undefined) updates.founding_member = !!body.founding_member;
      if (body.beta_tester !== undefined) updates.beta_tester = !!body.beta_tester;
      const rec = await base44.entities.PromoCode.update(id, updates);
      await audit('promo_code_edited', id, `Updated: ${Object.keys(updates).join(', ') || 'no changes'}`);
      return Response.json({ code: rec });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
      const rec = await base44.entities.PromoCode.get(id).catch(() => null);
      await base44.entities.PromoCode.delete(id);
      await audit('promo_code_deleted', id, `${rec?.code || id} deleted`);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
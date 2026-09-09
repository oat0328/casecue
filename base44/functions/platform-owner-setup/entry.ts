import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getActiveMembership } from "../../shared/orgService.ts";

// One-time secure assignment of the Platform Owner role.
// The app owner enters the secret setup key at /platform-owner-setup; this
// function verifies the key server-side and elevates the signed-in account.
// The key never grants access on its own — it only applies to the caller's
// own signed-in account and requires an existing workspace membership.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Sign in to your CaseCue account first, then return to this page.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const key = String(body.setup_key || '');
    const expected = process.env.PLATFORM_OWNER_SETUP_KEY;
    if (!expected || key !== expected) {
      return Response.json({ error: 'Invalid setup key.' }, { status: 403 });
    }

    const svc = base44.asServiceRole;

    // Elevate the app role so admin-gated navigation is visible.
    try {
      await svc.entities.User.update(user.id, { role: 'admin' });
    } catch (e) {
      console.error('platform-owner-setup: role update failed', e);
    }

    // Mark this user's membership as platform_owner.
    const membership = await getActiveMembership(svc, user.id);
    if (!membership) {
      return Response.json(
        { error: 'Complete your workspace setup first, then return to this page.' },
        { status: 400 }
      );
    }
    await svc.entities.OrganizationMembership.update(membership.id, { org_role: 'platform_owner' });

    await svc.entities.AuditLog.create({
      action: 'platform_owner_assigned',
      entity_type: 'User',
      entity_id: user.id,
      details: `Platform Owner role assigned to ${user.email} via setup key`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('platform-owner-setup failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
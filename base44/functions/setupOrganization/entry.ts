import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { daysFromNow, getActiveMembership, migrateUserRecords } from "../../shared/orgService.ts";

// Creates the caller's organization workspace: Organization + membership +
// default subscription, and migrates their existing records into it.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orgType = body.orgType;
    const allowedTypes = ['individual_teacher', 'school', 'district', 'demo'];
    if (!allowedTypes.includes(orgType)) {
      return Response.json({ error: 'Invalid organization type' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    // Idempotent: if the caller already has an active membership, return it.
    const existing = await getActiveMembership(svc, user.id);
    if (existing) {
      return Response.json({ organization_id: existing.organization_id, already_exists: true, migrated: 0 });
    }

    const rawName = (body.name || '').toString().trim().slice(0, 120);
    const name = rawName ||
      (orgType === 'individual_teacher'
        ? `${user.full_name || user.email}'s Workspace`
        : orgType === 'demo' ? 'Demo Organization' : 'New Organization');
    const state = (body.state || '').toString().trim().slice(0, 60) || undefined;

    const org = await svc.entities.Organization.create({
      name, org_type: orgType, state, owner_user_id: user.id,
      members: [user.id], status: 'active',
    });

    const orgRole = orgType === 'school' || orgType === 'district'
      ? 'school_admin'
      : orgType === 'demo' ? 'demo_user' : 'teacher';
    await svc.entities.OrganizationMembership.create({
      organization_id: org.id, user_id: user.id, user_email: user.email,
      org_role: orgRole, status: 'active',
    });

    // Default subscription: demo organizations get the free demo plan,
    // everyone else starts a plan trial. Prices live only in the Plan table.
    const planCode = orgType === 'demo' ? 'free_demo'
      : orgType === 'individual_teacher' ? 'teacher_professional' : 'school_team';
    const plans = await svc.entities.Plan.filter({ code: planCode }, '-created_date', 1);
    const plan = plans && plans.length ? plans[0] : null;
    const trialDays = (plan && plan.trial_days) || 14;
    await svc.entities.Subscription.create({
      organization_id: org.id,
      plan_id: plan ? plan.id : undefined,
      plan_name: plan ? plan.name : (orgType === 'demo' ? 'Free Demo' : 'Teacher Professional'),
      status: orgType === 'demo' ? 'demo' : 'trialing',
      trial_end: orgType === 'demo' ? undefined : daysFromNow(trialDays),
      monthly_price: 0,
      seats: (plan && plan.seats) || 1,
    });

    const migrated = await migrateUserRecords(svc, user.id, org.id);

    await svc.entities.AuditLog.create({
      action: 'organization_created',
      entity_type: 'Organization',
      entity_id: org.id,
      details: `User ${user.email} created a ${orgType} organization; ${migrated} existing records migrated.`,
    });

    return Response.json({
      organization_id: org.id,
      organization: { id: org.id, name, org_type: orgType },
      migrated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
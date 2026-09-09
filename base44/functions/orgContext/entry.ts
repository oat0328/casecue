import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns the caller's organization context: organization, role, subscription, plan.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // User-scoped reads — RLS shows only the caller's own membership/org/subscription.
    const memberships = await base44.entities.OrganizationMembership.filter(
      { user_id: user.id, status: 'active' }, '-created_date', 5
    );
    const membership = memberships && memberships.length ? memberships[0] : null;
    if (!membership) return Response.json({ needs_setup: true });

    const org = await base44.entities.Organization.get(membership.organization_id);
    const subs = await base44.entities.Subscription.filter(
      { organization_id: org.id }, '-created_date', 1
    );
    const subscription = subs && subs.length ? subs[0] : null;
    const plan = subscription && subscription.plan_id
      ? await base44.entities.Plan.get(subscription.plan_id)
      : null;

    return Response.json({
      organization: { id: org.id, name: org.name, org_type: org.org_type, state: org.state },
      org_role: membership.org_role,
      subscription: subscription
        ? {
            status: subscription.status,
            plan_name: subscription.plan_name,
            trial_end: subscription.trial_end,
            complimentary_end: subscription.complimentary_end,
            seats: subscription.seats,
          }
        : null,
      plan: plan
        ? {
            name: plan.name, code: plan.code, student_limit: plan.student_limit,
            ai_monthly_limit: plan.ai_monthly_limit, features: plan.features,
          }
        : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
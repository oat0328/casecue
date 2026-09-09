import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Platform Owner dashboard metrics. Admin-only. Returns totals, growth series,
// and customer rows (technical metadata only — never student names or IEP content).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const [users, orgs, memberships, subs, purchases, auditLogs, students] = await Promise.all([
      svc.entities.User.list('-created_date', 500),
      svc.entities.Organization.list('-created_date', 500),
      svc.entities.OrganizationMembership.list('-created_date', 500),
      svc.entities.Subscription.list('-created_date', 500),
      svc.entities.Base44Purchase.list('-created_date', 500),
      svc.entities.AuditLog.list('-created_date', 500),
      svc.entities.Student.list('-created_date', 500),
    ]);

    // ---- login/signup activity from the audit log (no PII beyond email, no student data)
    const loginsByUser = {};
    const signupByUser = {};
    auditLogs.forEach((a) => {
      const uid = a.entity_id || a.created_by_id;
      if (!uid) return;
      const ts = new Date(a.created_date).getTime();
      if (isNaN(ts)) return;
      if (a.action === 'login') {
        if (!loginsByUser[uid] || ts > loginsByUser[uid]) loginsByUser[uid] = ts;
      } else if (a.action === 'signup') {
        if (!signupByUser[uid] || ts < signupByUser[uid]) signupByUser[uid] = ts;
      }
    });

    const day = 86400000;
    const now = Date.now();
    const ts = (u) => new Date(u.created_date).getTime();
    const newWeek = users.filter((u) => ts(u) >= now - 7 * day).length;
    const newMonth = users.filter((u) => ts(u) >= now - 30 * day).length;
    const active14 = users.filter((u) => loginsByUser[u.id] && loginsByUser[u.id] >= now - 14 * day).length;

    const orgsByType = { individual_teacher: 0, school: 0, district: 0, demo: 0 };
    orgs.forEach((o) => { if (orgsByType[o.org_type] !== undefined) orgsByType[o.org_type]++; });

    const subsByStatus = { demo: 0, complimentary: 0, trialing: 0, active: 0, past_due: 0, canceled: 0, suspended: 0, expired: 0 };
    subs.forEach((s) => { if (subsByStatus[s.status] !== undefined) subsByStatus[s.status]++; });
    const mrr = subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + (s.monthly_price || 0), 0);
    const paidCount = subsByStatus.active + subsByStatus.past_due;
    const concluded = paidCount + subsByStatus.canceled + subsByStatus.expired;
    const conversionRate = concluded > 0 ? Math.round((paidCount / concluded) * 100) : 0;

    // Cumulative user growth, last 12 weeks
    const growth = [];
    for (let i = 11; i >= 0; i--) {
      const end = now - i * 7 * day;
      growth.push({
        week: new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: users.filter((u) => ts(u) <= end).length,
      });
    }

    // ---- join maps
    const orgById = {};
    orgs.forEach((o) => { orgById[o.id] = o; });
    const studentsByOrg = {};
    students.forEach((s) => {
      const k = s.organization_id || 'unassigned';
      studentsByOrg[k] = (studentsByOrg[k] || 0) + 1;
    });
    const subByOrg = {};
    subs.forEach((s) => { if (!subByOrg[s.organization_id]) subByOrg[s.organization_id] = s; }); // newest first
    const memByUser = {};
    memberships.forEach((m) => { if (m.status === 'active' && !memByUser[m.user_id]) memByUser[m.user_id] = m; });

    const customers = users.slice(0, 200).map((u) => {
      const m = memByUser[u.id];
      const org = m ? orgById[m.organization_id] : null;
      const sub = m ? subByOrg[m.organization_id] : null;
      return {
        id: u.id,
        name: u.full_name || '',
        email: u.email,
        app_role: u.role,
        org_id: org ? org.id : null,
        org_name: org ? org.name : null,
        org_type: org ? org.org_type : null,
        org_role: m ? m.org_role : null,
        plan: sub ? sub.plan_name : null,
        status: sub ? sub.status : 'free',
        monthly_price: sub ? (sub.monthly_price ?? null) : null,
        registered: u.created_date,
        trial_end: sub ? (sub.trial_end || null) : null,
        complimentary_end: sub ? (sub.complimentary_end || null) : null,
        last_login: loginsByUser[u.id] ? new Date(loginsByUser[u.id]).toISOString() : null,
        student_count: m ? (studentsByOrg[m.organization_id] || 0) : 0,
      };
    });

    const recentPayments = purchases.filter((p) => p.status === 'paid').slice(0, 10)
      .map((p) => ({ id: p.id, email: p.buyerEmail, amount: p.amount, product: p.productName, date: p.paidAt || p.created_date }));
    const failedPayments = purchases.filter((p) => p.status === 'canceled').slice(0, 10)
      .map((p) => ({ id: p.id, email: p.buyerEmail, amount: p.amount, product: p.productName, date: p.canceledAt || p.created_date }));
    const soon = now + 7 * day;
    const trialsEndingSoon = subs.filter((s) => s.status === 'trialing' && s.trial_end && new Date(s.trial_end).getTime() <= soon)
      .slice(0, 10)
      .map((s) => ({ org: orgById[s.organization_id] ? orgById[s.organization_id].name : s.organization_id, trial_end: s.trial_end, plan: s.plan_name }));
    const inactive14 = users.filter((u) => loginsByUser[u.id] && loginsByUser[u.id] < now - 14 * day)
      .slice(0, 20)
      .map((u) => ({ email: u.email, name: u.full_name, last_login: new Date(loginsByUser[u.id]).toISOString() }));
    const neverLoggedIn = users.filter((u) => !loginsByUser[u.id] && !signupByUser[u.id] && ts(u) < now - 7 * day)
      .slice(0, 20)
      .map((u) => ({ email: u.email, name: u.full_name, registered: u.created_date }));

    return Response.json({
      totals: {
        users: users.length,
        active_14d: active14,
        new_this_week: newWeek,
        new_this_month: newMonth,
        organizations: orgs.length,
        orgs_by_type: orgsByType,
        subs_by_status: subsByStatus,
        mrr,
        conversion_rate: conversionRate,
      },
      growth,
      customers,
      recent_registrations: customers.slice(0, 10),
      recent_payments: recentPayments,
      failed_payments: failedPayments,
      trials_ending_soon: trialsEndingSoon,
      inactive_14d: inactive14,
      never_logged_in: neverLoggedIn,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
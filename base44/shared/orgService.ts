// Shared organization (tenant) logic used by multiple backend functions.

// Every entity that holds organization-owned case data.
export const ORG_ENTITIES = [
  "Student", "Goal", "ProgressData", "SessionLog", "GradebookAssignment",
  "Document", "Meeting", "Lesson", "SubPlan", "ScheduleEntry", "SavedReport",
  "IEPReview", "AIConversation", "Task",
];

export function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Latest active membership of a user, or null.
export async function getActiveMembership(serviceClient, userId) {
  const memberships = await serviceClient.entities.OrganizationMembership.filter(
    { user_id: userId, status: "active" },
    "-created_date",
    10
  );
  return memberships && memberships.length ? memberships[0] : null;
}

// Moves every record a user created before joining an organization into that
// organization, so team members can see it and other tenants never can.
// The query excludes already-migrated records so re-runs always make progress.
export async function migrateUserRecords(serviceClient, userId, organizationId) {
  let migrated = 0;
  for (const name of ORG_ENTITIES) {
    let hasMore = true;
    let guard = 0;
    while (hasMore && guard < 20) {
      const res = await serviceClient.entities[name].updateMany(
        { created_by_id: userId, organization_id: { $ne: organizationId } },
        { $set: { organization_id: organizationId } }
      );
      if (res && typeof res.updated === "number") migrated += res.updated;
      hasMore = !!(res && res.has_more);
      guard++;
    }
  }
  return migrated;
}
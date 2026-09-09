import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});

// ===== Organization stamping =====
// Every record created in these organization-owned entities is automatically
// tagged with the current user's organization, so backend security rules can
// keep each school's/teacher's data completely separate.
const ORG_ENTITIES = [
  'Student', 'Goal', 'ProgressData', 'SessionLog', 'GradebookAssignment',
  'Document', 'Meeting', 'Lesson', 'SubPlan', 'ScheduleEntry', 'SavedReport',
  'IEPReview', 'AIConversation', 'Task',
];

let cachedOrgId;
const resolveOrgId = async () => {
  // Cached once found; re-checked on every create until the user has one,
  // so an organization set up mid-session is picked up immediately.
  if (cachedOrgId) return cachedOrgId;
  try {
    const me = await base44.auth.me();
    cachedOrgId = me?.organization_id || me?.data?.organization_id || null;
  } catch {
    cachedOrgId = null;
  }
  return cachedOrgId;
};

ORG_ENTITIES.forEach((name) => {
  const entity = base44.entities[name];
  if (!entity) return;
  const create = entity.create.bind(entity);
  const bulkCreate = entity.bulkCreate.bind(entity);
  entity.create = async (data = {}) => {
    const organization_id = await resolveOrgId();
    return organization_id ? create({ ...data, organization_id }) : create(data);
  };
  entity.bulkCreate = async (records = []) => {
    if (!Array.isArray(records) || records.length === 0) return bulkCreate(records);
    const organization_id = await resolveOrgId();
    return organization_id
      ? bulkCreate(records.map((r) => ({ ...r, organization_id })))
      : bulkCreate(records);
  };
});
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

// ===== Global student roster order =====
// Canonical CaseCue order: Last Name A-Z, then First Name A-Z.
// Enforce this once at the shared client so every page, tab, dropdown,
// selector, schedule, gradebook, report, and workflow receives students
// in the same predictable alphabetical order.
const compareStudents = (a = {}, b = {}) => {
  const last = String(a.last_name || '').trim().localeCompare(String(b.last_name || '').trim(), undefined, { sensitivity: 'base', numeric: true });
  if (last !== 0) return last;
  const first = String(a.first_name || '').trim().localeCompare(String(b.first_name || '').trim(), undefined, { sensitivity: 'base', numeric: true });
  if (first !== 0) return first;
  return String(a.student_id || a.id || '').localeCompare(String(b.student_id || b.id || ''), undefined, { sensitivity: 'base', numeric: true });
};

const sortStudentResult = (result) => {
  if (Array.isArray(result)) return [...result].sort(compareStudents);
  if (result && Array.isArray(result.data)) return { ...result, data: [...result.data].sort(compareStudents) };
  if (result && Array.isArray(result.items)) return { ...result, items: [...result.items].sort(compareStudents) };
  return result;
};

const studentEntity = base44.entities.Student;
if (studentEntity) {
  ['list', 'filter'].forEach((methodName) => {
    if (typeof studentEntity[methodName] !== 'function') return;
    const original = studentEntity[methodName].bind(studentEntity);
    studentEntity[methodName] = async (...args) => sortStudentResult(await original(...args));
  });
}

// ===== Organization stamping =====
const ORG_ENTITIES = [
  'Student', 'Goal', 'ProgressData', 'SessionLog', 'GradebookAssignment',
  'Document', 'Meeting', 'Lesson', 'SubPlan', 'ScheduleEntry', 'SavedReport',
  'IEPReview', 'AIConversation', 'Task', 'IepWorkspace', 'SessionRecord', 'MeetingCheatSheet',
  'ParentResource', 'TransitionPlan', 'Modification', 'AccommodationLog', 'ResourceItem', 'EvaluationRecord', 'RetentionPolicy', 'WorkEvidence', 'InputRecord', 'FamilyRequest', 'InterventionPhase', 'SupportPlan', 'StateConfig', 'IntegrationConfig',
  'StudentEvidence', 'TeachingMaterial', 'ParaNote', 'ParaAssignment', 'ParaStudentAccess', 'ParaScheduleBlock', 'AccommodationShare', 'TeacherAccommodationBrief', 'IepCycle', 'IepDocumentVersion', 'AssignmentUse', 'BaselineAssessment',
];

let cachedOrgId;
const resolveOrgId = async () => {
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
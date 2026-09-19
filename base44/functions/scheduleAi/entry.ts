import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Schedule AI: one function, three modes.
//  - analyze:   extract groups/students/times from an uploaded schedule file
//  - recommend: suggest best group placement for one student
//  - optimize:  suggest group combination / pairing / block improvements
// All output is advisory — the teacher reviews everything before saving.

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group_name: { type: 'string' },
          delivery: { type: 'string', enum: ['pull-out', 'push-in', 'consultation'] },
          day: { type: 'string' },
          start_time: { type: 'string' },
          end_time: { type: 'string' },
          service_minutes: { type: 'number' },
          teacher_classroom: { type: 'string' },
          notes: { type: 'string' },
          week_pattern: { type: 'string', enum: ['every_week','A_week','B_week','alternating'] },
          cycle_day: { type: 'string' },
          period: { type: 'string' },
          recurrence_note: { type: 'string' },
          students: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                student_id: { type: 'string' },
                match_type: { type: 'string', enum: ['exact', 'fuzzy', 'unmatched'] },
                confidence: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
              },
              required: ['name', 'student_id', 'match_type', 'confidence'],
            },
          },
        },
        required: ['group_name', 'delivery', 'day', 'start_time', 'end_time', 'students'],
      },
    },
    unmatched_names: { type: 'array', items: { type: 'string' } },
    conflicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          severity: { type: 'string', enum: ['warning', 'info'] },
        },
        required: ['description'],
      },
    },
    non_instructional_blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          day: { type: 'string' },
          start_time: { type: 'string' },
          end_time: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['label','day','start_time','end_time'],
      },
    },
    extraction_notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['groups'],
};

const RECOMMEND_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group_name: { type: 'string' },
          is_new_group: { type: 'boolean' },
          delivery: { type: 'string', enum: ['pull-out', 'push-in', 'consultation'] },
          day: { type: 'string' },
          start_time: { type: 'string' },
          end_time: { type: 'string' },
          service_minutes: { type: 'number' },
          reasoning: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['group_name', 'is_new_group', 'delivery', 'day', 'start_time', 'end_time', 'service_minutes', 'reasoning', 'confidence'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['recommendations'],
};

const OPTIMIZE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['combination', 'pairing', 'block', 'improvement'] },
          review_level: { type: 'string', enum: ['safe_cleanup', 'planning_opportunity', 'educator_review'] },
          title: { type: 'string' },
          description: { type: 'string' },
          groups: { type: 'array', items: { type: 'string' } },
          evidence: { type: 'array', items: { type: 'string' } },
          could_affect: { type: 'array', items: { type: 'string' } },
          verify_before_changing: { type: 'array', items: { type: 'string' } },
          reasoning: { type: 'string' },
        },
        required: ['type', 'review_level', 'title', 'description', 'evidence', 'could_affect', 'verify_before_changing', 'reasoning'],
      },
    },
    data_notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['recommendations', 'summary'],
};

async function analyze(base44, body) {
  const fileUris = Array.isArray(body.file_uris) ? body.file_uris.filter(Boolean) : (body.file_uri ? [body.file_uri] : []);
  const fileUrls = [];
  for (const fileUri of fileUris.slice(0, 20)) {
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: String(fileUri), expires_in: 600 });
    if (signed?.signed_url) fileUrls.push(signed.signed_url);
  }
  if (body.file_url && /^https?:\/\//.test(String(body.file_url))) fileUrls.push(String(body.file_url));
  if (!fileUrls.length) return Response.json({ error: 'At least one schedule file is required.' }, { status: 400 });
  const pullPreferences = String(body.pull_preferences || '').trim();

  const students = await base44.entities.Student.list('-updated_date', 300);
  const goals = await base44.entities.Goal.list('-created_date', 500);
  const goalAreas = {};
  for (const g of goals || []) {
    if (!g || !g.student_id) continue;
    if (!goalAreas[g.student_id]) goalAreas[g.student_id] = [];
    goalAreas[g.student_id].push(g.goal_area || 'General');
  }

  const roster = (students || [])
    .map((s) => `- ${s.first_name} ${s.last_name} | id: ${s.id} | grade: ${s.grade || 'unknown'} | required weekly minutes: ${s.service_minutes != null ? s.service_minutes : 'unknown'} | services: ${(s.services || []).join(', ') || 'none'}`)
    .join('\n');

  const prompt = `You are analyzing a special education teacher's schedule document (it may be a PDF, spreadsheet export, word-processing document, photo, or screenshot).

TASK: The uploaded files may include a SCHOOL BELL SCHEDULE, one or more STUDENT/CLASS SCHEDULES, and/or a CURRENT RESOURCE/CASE-MANAGER SCHEDULE. Read every page, table, row, column, merged cell, legend, note, and continuation page. Build a PROPOSED special-education service schedule — do not mistake a student's general-education class schedule for an already-delivered SPED service block.

TEACHER'S PLANNING PREFERENCES:
${pullPreferences || '(No preference entered — preserve explicit service blocks from the documents and flag places where teacher input is needed.)'}

TEACHER'S ROSTER (name | id | grade | required weekly service minutes | services):
${roster || '(roster is empty)'}

RULES:
1. Use ONLY information present in the files, the roster below, and the teacher's stated planning preferences. Never invent students, IEP minutes, classes, groups, times, or locations.
1A. Distinguish source types: bell schedules define available periods; student schedules define where a student is assigned; resource schedules define existing/proposed service blocks. Do NOT convert every class on a student schedule into a SPED group.
1B. When the teacher provides preferred pull-out/push-in windows, propose groups only where those windows do not visibly conflict with the uploaded student schedules. Flag any unresolved conflict for educator review.
1C. Compare each matched student's proposed WEEKLY scheduled service minutes against the "required weekly minutes" in the CaseCue roster. If proposed minutes are below or above that recorded amount, add a conflict/info item stating the student's name, recorded weekly minutes, proposed weekly minutes, and difference. This is a planning check, not a legal/compliance determination.
2. For every service block, output one entry in "groups":
   - group_name: the group name as written in the document. If none is given, derive a short descriptive name (e.g. "Reading Group A").
   - delivery: "pull-out" (students leave the classroom), "push-in" (support delivered in the classroom), or "consultation".
   - day: exactly one of Monday, Tuesday, Wednesday, Thursday, Friday. If the document says "daily", "every day", "Mon-Fri", "M-F", or otherwise clearly applies the block/student across multiple weekdays, EXPAND it into one separate entry for EACH supported weekday. If a note says M/W/F or Tue/Thu, create entries for each named day. If different students attend the same block on different days, create separate day entries with the correct student list for each day.
   - start_time / end_time: 24-hour HH:MM format. If only a start time is given, leave end_time "".
   - service_minutes: minutes per session (stated in the document, or the start-to-end duration). 0 if unknown.
   - teacher_classroom: provider/teacher name and location if shown.
   - week_pattern: "every_week" unless the document explicitly identifies A week, B week, or an alternating schedule.
   - cycle_day: any explicit rotation day (e.g. A Day, B Day, Day 1, Day 2); otherwise "".
   - period: any explicit class period/block (e.g. Period 5, Block 2); otherwise "".
   - recurrence_note: preserve source wording such as "daily", "M/W/F", "Tue/Thu", or "A-week only" when shown.
   - students: every student named for that block. For each student: "name" exactly as written in the document; "student_id" = the roster id if you can match (identical name = "exact", nickname/spelling variant = "fuzzy"), otherwise "" with match_type "unmatched"; confidence high/medium/low/none.
3. Any name you could not match also goes in "unmatched_names".
4. "conflicts": scheduling problems visible in the document (same student in two blocks at once, overlapping blocks, blocks with no time). One item per problem, severity "warning" or "info".
5. "non_instructional_blocks": extract the teacher's OWN lunch, prep/planning, IEP/meeting, duty, and other unavailable blocks whenever explicitly shown. Expand recurring/daily blocks to each applicable weekday. These are schedule constraints and MUST NOT be omitted just because they are not student service groups. Do not treat a student's lunch or class period as the teacher's unavailable block unless the document explicitly says so.
6. "extraction_notes": anything missing or ambiguous (e.g. "no end times given for Tuesday blocks"). Flag it — never guess.
7. COMPLETENESS CHECK BEFORE RETURNING: compare all five weekdays against the source. If the source contains service information for a weekday, that weekday must appear in groups. Re-scan the document for recurring notes such as daily, M/W/F, Tue/Thu, every day, Period 1-6, or continuation tables. Do not omit later weekdays just because the layout repeats.
8. Preserve recurrence details in notes when useful, but do not use a note as a substitute for creating the actual weekday entries.
9. Before returning, explicitly verify that any teacher Lunch, Prep/Planning, IEP/Meeting, Duty, or other blocked time visible in the source is represented in non_instructional_blocks.

Return JSON matching the schema exactly.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: fileUrls,
    response_json_schema: ANALYSIS_SCHEMA,
  });

  const groups = Array.isArray(result.groups) ? result.groups.slice(0, 120) : [];
  const non_instructional_blocks = Array.isArray(result.non_instructional_blocks) ? result.non_instructional_blocks.slice(0, 80) : [];
  return Response.json({ ...result, groups, non_instructional_blocks });
}

async function recommend(base44, body) {
  const studentId = String(body.student_id || '');
  if (!studentId) return Response.json({ error: 'student_id is required' }, { status: 400 });

  const students = await base44.entities.Student.list('-updated_date', 300);
  const student = (students || []).find((s) => s.id === studentId);
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  const goals = await base44.entities.Goal.filter({ student_id: studentId }, '-created_date', 20);
  const entries = await base44.entities.ScheduleEntry.list('-day', 200);

  const scheduleLines = (entries || [])
    .filter((e) => !e.archived)
    .map((e) => `- ${e.group_name} | ${e.day} ${e.start_time || '?'}-${e.end_time || '?'} | ${e.delivery} | ${e.service_minutes || 0} min | ${e.teacher_classroom || 'no room'} | ${(e.student_ids || []).length} student(s)`)
    .join('\n');

  const prompt = `You are helping a special education teacher place a student into instructional groups. The teacher remains in control — your job is to recommend, not decide.

STUDENT: ${student.first_name} ${student.last_name}, grade ${student.grade || 'unknown'}, required weekly service minutes: ${student.service_minutes != null ? student.service_minutes : 'unknown'}, services: ${(student.services || []).join(', ') || 'none'}
GOAL AREAS: ${((goals || []).map((g) => g.goal_area).filter(Boolean).join(', ')) || 'none recorded'}

EXISTING WEEKLY SCHEDULE (group | day time | delivery | minutes | teacher/room | size):
${scheduleLines || '(no schedule entries yet)'}

TASK: Recommend up to 3 placements.
- Prefer existing groups that share this student's grade level and goal areas, whose time slot does not overlap the blocks above.
- You may propose a new group if no existing group fits; suggest a free time slot based on gaps in the existing schedule.
- Base every claim on the data above. If information is missing (e.g. grade unknown), say so in the reasoning — do not invent facts.
- "confidence" reflects how strongly the data above supports the recommendation.

Return JSON matching the schema exactly.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: RECOMMEND_SCHEMA,
  });
  return Response.json(result);
}

const timeMinutes = (value = '') => {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const overlaps = (a, b) => {
  if (String(a.day || '') !== String(b.day || '')) return false;
  const as = timeMinutes(a.start_time), ae = timeMinutes(a.end_time), bs = timeMinutes(b.start_time), be = timeMinutes(b.end_time);
  return [as, ae, bs, be].every(Number.isFinite) && Math.max(as, bs) < Math.min(ae, be);
};
const goalCategory = (value = '') => {
  const s = String(value || '').toLowerCase();
  if (/reading|fluency|comprehension|phonics|vocab/.test(s)) return 'reading';
  if (/writing|written|sentence|paragraph|composition|convention/.test(s)) return 'writing';
  if (/math|multiplication|division|fraction|decimal|number|algebra|geometry|computation/.test(s)) return 'math';
  if (/behavior|self[- ]?regulation|social|sel|attention/.test(s)) return 'behavior';
  if (/executive|organization|task initiation|planning/.test(s)) return 'executive functioning';
  if (/speech|language|communication|articulation/.test(s)) return 'communication';
  return String(value || '').trim().toLowerCase();
};
const groupCategory = (entry) => goalCategory(String(entry.group_name || '').split('·')[0]);
const idsForEntry = (entry) => [...new Set([
  ...(entry.student_ids || []),
  ...((entry.student_pull_details || []).map((d) => d.student_id).filter(Boolean)),
])];

async function optimize(base44) {
  void OPTIMIZE_SCHEMA;
  const entries = (await base44.entities.ScheduleEntry.list('-day', 500))
    .filter((x) => !x.archived && !String(x.notes || '').includes('NON-INSTRUCTIONAL / UNAVAILABLE'));
  const students = (await base44.entities.Student.list('-updated_date', 500))
    .filter((s) => s.roster_status !== 'archived' && s.status !== 'exited');
  const goals = (await base44.entities.Goal.list('-created_date', 1500))
    .filter((g) => String(g.status || 'active') !== 'met');

  if (!entries.length) {
    return Response.json({
      summary: 'No confirmed instructional schedule exists yet, so CaseCue is not generating optimization suggestions.',
      recommendations: [],
      data_notes: ['Build and confirm the instructional schedule first. Suggestions run only against saved schedule data.'],
    });
  }

  const nameById = Object.fromEntries(students.map((s) => [s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim()]));
  const studentById = Object.fromEntries(students.map((s) => [s.id, s]));
  const goalCatsByStudent = {};
  for (const g of goals) {
    if (!g.student_id) continue;
    const cat = goalCategory(g.goal_area || g.goal_text || '');
    if (!cat) continue;
    (goalCatsByStudent[g.student_id] ||= new Set()).add(cat);
  }

  const recommendations = [];
  const dataNotes = [];
  const studentsScheduled = new Set(entries.flatMap(idsForEntry));
  const missingGoalCount = [...studentsScheduled].filter((id) => !(goalCatsByStudent[id]?.size)).length;
  const sourceDetailCount = entries.reduce((n, e) => n + (e.student_pull_details || []).filter((d) => d.source_subject || d.source_period || d.class_start_time || d.class_end_time).length, 0);

  if (sourceDetailCount === 0) {
    dataNotes.push('Gen Ed source-class schedules are not loaded. CaseCue will not recommend retiming students, reducing pull-outs, or moving students between periods.');
  }
  if (missingGoalCount > 0) {
    dataNotes.push(`${missingGoalCount} scheduled student${missingGoalCount === 1 ? '' : 's'} do not have active goal-area data. CaseCue will not use those students to justify group-combination or pairing suggestions.`);
  }

  const emptyByGroup = new Map();
  for (const e of entries) {
    if (idsForEntry(e).length) continue;
    const key = String(e.group_name || 'Unnamed service block');
    if (!emptyByGroup.has(key)) emptyByGroup.set(key, []);
    emptyByGroup.get(key).push(e);
  }
  for (const [name, rows] of emptyByGroup) {
    recommendations.push({
      type: 'improvement',
      review_level: 'safe_cleanup',
      title: `Review empty block: ${name}`,
      description: 'This saved instructional block currently has zero confirmed students.',
      groups: [name],
      evidence: rows.slice(0, 8).map((e) => `${e.day} ${e.start_time || '?'}–${e.end_time || '?'}: 0 confirmed students`),
      could_affect: ['Removing the block would remove a saved placeholder from the weekly schedule.'],
      verify_before_changing: ['Confirm the block is not intentionally reserved for make-up services, consultation, or future placement.'],
      reasoning: 'This is a cleanup candidate because the saved block has no confirmed student membership. CaseCue is not assuming the block is unnecessary.',
    });
  }

  const duplicateBuckets = new Map();
  for (const e of entries) {
    const ids = idsForEntry(e).sort();
    const key = [e.day, e.start_time, e.end_time, e.group_name, e.delivery, ids.join(',')].join('|');
    if (!duplicateBuckets.has(key)) duplicateBuckets.set(key, []);
    duplicateBuckets.get(key).push(e);
  }
  for (const rows of duplicateBuckets.values()) {
    if (rows.length < 2) continue;
    const e = rows[0];
    recommendations.push({
      type: 'improvement',
      review_level: 'safe_cleanup',
      title: `Possible duplicate block: ${e.group_name || 'Unnamed group'}`,
      description: 'Two or more saved entries have the same day, time, delivery, group name, and student membership.',
      groups: [e.group_name || 'Unnamed group'],
      evidence: [`${e.day} ${e.start_time || '?'}–${e.end_time || '?'} appears ${rows.length} times with the same confirmed students.`],
      could_affect: ['Removing a true duplicate would reduce duplicate schedule records without changing the intended student group.'],
      verify_before_changing: ['Confirm these records are not intentionally separate A/B week or rotation entries.'],
      reasoning: 'The duplicate signature is based on saved schedule fields, not an AI interpretation.',
    });
  }

  const seenOverlap = new Set();
  for (const studentId of studentsScheduled) {
    const rows = entries.filter((e) => idsForEntry(e).includes(studentId));
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      if (!overlaps(a, b) || a.id === b.id) continue;
      const key = [studentId, a.day, a.id, b.id].sort().join('|');
      if (seenOverlap.has(key)) continue;
      seenOverlap.add(key);
      recommendations.push({
        type: 'block',
        review_level: 'educator_review',
        title: `Resolve overlapping service assignments for ${nameById[studentId] || 'student'}`,
        description: 'The same confirmed student is scheduled in two instructional blocks that overlap in time.',
        groups: [a.group_name || 'Group A', b.group_name || 'Group B'],
        evidence: [
          `${a.day}: ${a.group_name || 'Group A'} ${a.start_time || '?'}–${a.end_time || '?'}`,
          `${b.day}: ${b.group_name || 'Group B'} ${b.start_time || '?'}–${b.end_time || '?'}`,
        ],
        could_affect: ['Student service minutes', 'Instructional focus', 'Pull-from class timing'],
        verify_before_changing: ['Confirm whether the two records are truly simultaneous services or alternative/rotating groups.', 'Check required service minutes and source-class availability before moving or removing either block.'],
        reasoning: 'This suggestion is based on a direct time overlap for the same confirmed student. CaseCue is not choosing which service should change.',
      });
    }
  }

  const combinationSeen = new Set();
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.day !== b.day || a.start_time !== b.start_time || a.end_time !== b.end_time || a.delivery !== b.delivery) continue;
    if (a.group_name === b.group_name) continue;
    const aIds = idsForEntry(a), bIds = idsForEntry(b);
    if (!aIds.length || !bIds.length) continue;
    const combined = [...new Set([...aIds, ...bIds])];
    if (combined.length > 4) continue;
    const aCat = groupCategory(a), bCat = groupCategory(b);
    if (!aCat || aCat !== bCat) continue;
    if (combined.some((id) => !(goalCatsByStudent[id]?.size))) continue;
    const common = combined
      .map((id) => goalCatsByStudent[id])
      .reduce((acc, set) => new Set([...acc].filter((x) => set.has(x))));
    if (!common.has(aCat)) continue;
    const key = [a.day, a.start_time, a.end_time, a.group_name, b.group_name].sort().join('|');
    if (combinationSeen.has(key)) continue;
    combinationSeen.add(key);
    recommendations.push({
      type: 'combination',
      review_level: 'planning_opportunity',
      title: `Possible ${aCat} group combination`,
      description: 'These same-time groups share the same instructional area and every confirmed student has an active goal in that area.',
      groups: [a.group_name, b.group_name],
      evidence: [
        `${a.day} ${a.start_time}–${a.end_time}: both groups use ${a.delivery} delivery.`,
        `Combined confirmed group size would be ${combined.length}.`,
        `Shared active goal area: ${aCat}.`,
      ],
      could_affect: ['Group size', 'Instructional intensity', 'Individual pacing', 'Service delivery experience'],
      verify_before_changing: ['Confirm the students have compatible instructional levels and SDI needs.', 'Confirm the combined group size is allowed by your school/district expectations.', 'Confirm service minutes and source-class schedules remain appropriate.'],
      reasoning: 'CaseCue found a same-time, same-area grouping opportunity with confirmed goal overlap. It is not recommending a merge based on time alone.',
    });
  }

  const limited = recommendations.slice(0, 20);
  const safe = limited.filter((r) => r.review_level === 'safe_cleanup').length;
  const planning = limited.filter((r) => r.review_level === 'planning_opportunity').length;
  const review = limited.filter((r) => r.review_level === 'educator_review').length;
  const summary = limited.length
    ? `CaseCue found ${limited.length} evidence-backed schedule item${limited.length === 1 ? '' : 's'} to review: ${safe} cleanup, ${planning} planning opportunit${planning === 1 ? 'y' : 'ies'}, and ${review} educator/IEP review item${review === 1 ? '' : 's'}.`
    : 'CaseCue did not find enough confirmed evidence to support a schedule-change recommendation right now.';

  return Response.json({ summary, recommendations: limited, data_notes: dataNotes });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (body.mode === 'analyze') return await analyze(base44, body);
    if (body.mode === 'recommend') return await recommend(base44, body);
    if (body.mode === 'optimize') return await optimize(base44);
    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
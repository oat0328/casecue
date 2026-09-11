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
          title: { type: 'string' },
          description: { type: 'string' },
          groups: { type: 'array', items: { type: 'string' } },
          reasoning: { type: 'string' },
        },
        required: ['type', 'title', 'description', 'reasoning'],
      },
    },
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
5. "extraction_notes": anything missing or ambiguous (e.g. "no end times given for Tuesday blocks"). Flag it — never guess.
6. COMPLETENESS CHECK BEFORE RETURNING: compare all five weekdays against the source. If the source contains service information for a weekday, that weekday must appear in groups. Re-scan the document for recurring notes such as daily, M/W/F, Tue/Thu, every day, Period 1-6, or continuation tables. Do not omit later weekdays just because the layout repeats.
7. Preserve recurrence details in notes when useful, but do not use a note as a substitute for creating the actual weekday entries.

Return JSON matching the schema exactly.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: fileUrls,
    response_json_schema: ANALYSIS_SCHEMA,
  });

  const groups = Array.isArray(result.groups) ? result.groups.slice(0, 60) : [];
  return Response.json({ ...result, groups });
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

async function optimize(base44) {
  const entries = await base44.entities.ScheduleEntry.list('-day', 200);
  const students = await base44.entities.Student.list('-updated_date', 300);
  const nameById = {};
  for (const s of students || []) nameById[s.id] = `${s.first_name} ${s.last_name}`;

  const groups = {};
  for (const e of (entries || []).filter((x) => !x.archived)) {
    if (!groups[e.group_name]) groups[e.group_name] = { days: new Set(), students: new Set(), delivery: e.delivery, minutes: e.service_minutes || 0 };
    const g = groups[e.group_name];
    g.days.add(`${e.day} ${e.start_time || '?'}-${e.end_time || '?'}`);
    for (const id of e.student_ids || []) if (nameById[id]) g.students.add(nameById[id]);
  }
  const groupLines = Object.entries(groups)
    .map(([name, g]) => `- ${name} | ${g.delivery} | ${[...g.days].join('; ')} | ${g.minutes} min/session | ${g.students.size} student(s): ${[...g.students].join(', ') || 'none'}`)
    .join('\n');

  const prompt = `You are reviewing a special education teacher's instructional groups and weekly schedule. The teacher remains in control — recommend, do not decide.

CURRENT GROUPS:
${groupLines || '(no groups yet)'}

TASK: Recommend improvements the teacher could make. Consider:
- combination: groups that could be combined (same delivery, similar times, shared goal areas)
- pairing: students who would work well grouped together based on the groupings shown
- block: service blocks that could be consolidated or re-timed (e.g. several small groups back-to-back)
- improvement: any scheduling problem you can see (gaps, overload, tiny groups)
Base every recommendation only on the data above — never invent students, times, or facts. If the data is too sparse to support a recommendation, say so. Return JSON matching the schema exactly.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: OPTIMIZE_SCHEMA,
  });
  return Response.json(result);
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
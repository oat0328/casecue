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
  const fileUrl = String(body.file_url || '');
  if (!/^https?:\/\//.test(fileUrl)) {
    return Response.json({ error: 'file_url is required' }, { status: 400 });
  }

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

TASK: Extract every recurring instructional service block, and match the students named in it to the teacher's roster.

TEACHER'S ROSTER (name | id | grade | required weekly service minutes | services):
${roster || '(roster is empty)'}

RULES:
1. Use ONLY information present in the document. Never invent students, groups, times, or locations.
2. For every service block, output one entry in "groups":
   - group_name: the group name as written in the document. If none is given, derive a short descriptive name (e.g. "Reading Group A").
   - delivery: "pull-out" (students leave the classroom), "push-in" (support delivered in the classroom), or "consultation".
   - day: exactly one of Monday, Tuesday, Wednesday, Thursday, Friday. If the document shows a range (e.g. "Mon-Fri" or "daily"), create one entry per weekday it covers.
   - start_time / end_time: 24-hour HH:MM format. If only a start time is given, leave end_time "".
   - service_minutes: minutes per session (stated in the document, or the start-to-end duration). 0 if unknown.
   - teacher_classroom: provider/teacher name and location if shown.
   - students: every student named for that block. For each student: "name" exactly as written in the document; "student_id" = the roster id if you can match (identical name = "exact", nickname/spelling variant = "fuzzy"), otherwise "" with match_type "unmatched"; confidence high/medium/low/none.
3. Any name you could not match also goes in "unmatched_names".
4. "conflicts": scheduling problems visible in the document (same student in two blocks at once, overlapping blocks, blocks with no time). One item per problem, severity "warning" or "info".
5. "extraction_notes": anything missing or ambiguous (e.g. "no end times given for Tuesday blocks"). Flag it — never guess.

Return JSON matching the schema exactly.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [fileUrl],
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
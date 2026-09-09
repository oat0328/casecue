import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// Substitute teacher plan built from REAL data only: student records, the
// weekly schedule, Lesson Studio lessons with their materials and connected
// resource links, and IEP goal areas. Returns the sources used and the
// information CaseCue does not have — the plan never invents school-specific
// facts, and when no lesson materials exist the sub plan includes AI-generated
// emergency assignments labeled as such.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const planType = body.plan_type || 'daily';
    const date = body.date || '';

    const students = await base44.entities.Student.list('-updated_date', 100);
    const lessons = await base44.entities.Lesson.list('-updated_date', 20);
    const schedule = await base44.entities.ScheduleEntry.list('day', 50);
    const goals = await base44.entities.Goal.list('-updated_date', 200);

    const sources = [];
    const missing = [];

    const lines = ['STUDENT RECORDS (verified):'];
    students.forEach((s) => {
      lines.push(`- ${s.first_name} ${s.last_name} (Grade ${s.grade || '?'}): Services: ${(s.services || []).join(', ') || 'not recorded'} | Minutes: ${s.service_minutes || 'not recorded'} | Accommodations: ${s.accommodations || 'not recorded'}`);
    });
    if (students.length) sources.push(`Student records (${students.length})`);

    if (schedule.length) {
      lines.push('\nWEEKLY SCHEDULE (verified):');
      schedule.forEach((e) => {
        lines.push(`- ${e.day} ${e.start_time || '?'}-${e.end_time || '?'}: ${e.group_name || 'group'} (${e.delivery || 'pull-out'})${e.teacher_classroom ? ` — ${e.teacher_classroom}` : ''}`);
      });
      sources.push(`Weekly schedule (${schedule.length} groups)`);
    } else {
      missing.push('Weekly schedule / group times');
    }

    const lessonsWithMaterials = lessons.filter(
      (l) => (l.practice_materials || []).length || (l.resources || []).length || l.plan
    );
    if (lessonsWithMaterials.length) {
      lines.push('\nLESSON STUDIO LESSONS (teacher materials):');
      lessonsWithMaterials.forEach((l) => {
        lines.push(`- "${l.title}"${l.subject ? ` (${l.subject})` : ''}${l.grade ? ` — ${l.grade}` : ''}`);
        (l.practice_materials || []).slice(0, 3).forEach((m) => {
          lines.push(`  * Assignment: ${m.title || m.material_type || 'practice material'} (source: Lesson Studio)`);
        });
        (l.resources || []).slice(0, 3).forEach((r) => {
          lines.push(`  * Resource link: ${r.label || r.site || 'resource'} (source: ${r.site || 'Connected Resource'})`);
        });
      });
      sources.push(`Lesson Studio (${lessonsWithMaterials.length} lessons with materials)`);
    } else {
      missing.push('Lesson plans with student materials');
    }

    const goalAreas = [...new Set(goals.map((g) => g.goal_area).filter(Boolean))];
    if (goalAreas.length) {
      lines.push(`\nGOAL AREAS ON FILE (verified): ${goalAreas.join(', ')}`);
      sources.push(`IEP goals (${goals.length})`);
    }

    missing.push('Classroom contacts list');
    missing.push('School-specific emergency procedures');

    lines.push(`\nPlan type: ${planType}${date ? ` | Date: ${date}` : ''}`);

    const assignmentRule = lessonsWithMaterials.length
      ? 'Use the lesson materials and practice materials provided, and label each assignment with its source (Lesson Studio, Teacher Upload, or Connected Resource). Do not invent assignments.'
      : "No lesson materials exist. Instead, generate practical, printable emergency activities based on the students' grade levels and the goal areas on file, and label each one 'AI Generated.' Make them usable by a substitute with no preparation.";

    const prompt = `${CASECUE_SYSTEM_PROMPT}

Generate a substitute teacher plan using ONLY the verified data below. If something is not in the data, say it is not recorded — never invent school-specific information (names, rooms, procedures, contacts).

Required sections, in this order:
1. OVERVIEW — one short paragraph orienting the substitute.
2. DAILY SCHEDULE — from the weekly schedule data; if none exists write exactly: "Schedule not recorded in CaseCue — check with the front office."
3. STUDENT GROUPS & SUPPORTS — per student/group: services, minutes, accommodations, and any behavior supports from the records.
4. ASSIGNMENTS FOR THE DAY — ${assignmentRule}
5. PROGRESS MONITORING — what the substitute should mark (participation, completion, behavior notes) without collecting formal IEP data.
6. EMERGENCY PROCEDURES — write "Follow the school's own emergency procedures" and list what to ask the front office for. Do not invent school-specific procedures.
7. END-OF-DAY CHECKLIST — 5-8 items (materials returned, notes left for the teacher, etc.).
8. MISSING INFORMATION — list exactly: ${missing.join('; ')}.

${lines.join('\n')}

Return the plan as structured markdown text. End with "Draft — Educator Review Required."`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'automatic' });
    const content = typeof result === 'string' ? result : (result?.output || result?.text || JSON.stringify(result));

    return Response.json({
      content,
      sources,
      missing,
      has_materials: lessonsWithMaterials.length > 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// Substitute teacher plan built from REAL data only: student records, the
// weekly schedule, Lesson Studio lessons with their materials and connected
// resource links, teacher-uploaded assignments, saved goal assignments, and
// IEP goal areas. Returns the sources used and the
// information CaseCue does not have — the plan never invents school-specific
// facts, and when no lesson materials exist the sub plan includes system-generated
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
    // Teacher uploads may not be propagated to every runtime yet — degrade to
    // "no uploads" instead of failing the whole plan.
    let materials = [];
    try {
      materials = await base44.entities.TeachingMaterial.list('-updated_date', 20);
    } catch (e) {
      materials = [];
    }
    const goalAssignments = await base44.entities.SavedReport.filter({ report_type: 'goal_assignment' }, '-created_date', 10);

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

    if (materials.length) {
      lines.push('\nTEACHER-UPLOADED ASSIGNMENTS (real student work):');
      materials.forEach((m) => {
        lines.push(`- "${m.title}" (${m.material_type || 'material'}${m.subject ? `, ${m.subject}` : ''}${m.grade ? `, grade ${m.grade}` : ''}) — file: ${m.filename || 'uploaded file'}${m.notes ? ` | Teacher notes: ${m.notes}` : ''}`);
      });
      sources.push(`Teacher uploads (${materials.length})`);
    }

    if (goalAssignments.length) {
      lines.push('\nGOAL-ALIGNED ASSIGNMENTS (System Generated, saved by the teacher — include these in full):');
      goalAssignments.forEach((r) => {
        const a = r.content?.assignment || {};
        lines.push(`- "${a.activity_title || 'Goal assignment'}" for ${r.student_name || 'student'} (${r.content?.goal_area || 'goal'}):`);
        lines.push(`  Activity: ${String(a.activity || '').slice(0, 1500)}`);
        (a.items || []).slice(0, 8).forEach((it, i) => {
          lines.push(`  ${i + 1}. ${it.question}`);
          lines.push(`     ANSWER KEY: ${it.answer}`);
        });
        if (a.probe) lines.push(`  Progress probe: ${String(a.probe).slice(0, 800)}`);
        if (a.accommodations_reminder) lines.push(`  Accommodations: ${a.accommodations_reminder}`);
      });
      sources.push(`Goal assignments (${goalAssignments.length})`);
    }

    const goalAreas = [...new Set(goals.map((g) => g.goal_area).filter(Boolean))];
    if (goalAreas.length) {
      lines.push(`\nGOAL AREAS ON FILE (verified): ${goalAreas.join(', ')}`);
      sources.push(`IEP goals (${goals.length})`);
    }

    missing.push('Classroom contacts list');
    missing.push('School-specific emergency procedures');

    lines.push(`\nPlan type: ${planType}${date ? ` | Date: ${date}` : ''}`);

    const hasRealWork = lessonsWithMaterials.length || materials.length || goalAssignments.length;
    const assignmentRule = hasRealWork
      ? "Use ONLY the assignments listed in the data below (Lesson Studio materials, teacher uploads, and saved goal assignments). Include each assignment's full directions and answer key where provided, label each with its source exactly as given, and do not invent new assignments."
      : "No assignments exist anywhere in the account. Instead, generate practical, printable emergency activities based on the students' grade levels and the goal areas on file, and label each one 'System Generated.' Make them usable by a substitute with no preparation.";

    const prompt = `${CASECUE_SYSTEM_PROMPT}

Generate a substitute teacher plan using ONLY the verified data below. If something is not in the data, say it is not recorded — never invent school-specific information (names, rooms, procedures, contacts).

Required sections, in this order:
1. OVERVIEW — one short paragraph orienting the substitute.
2. DAILY SCHEDULE — from the weekly schedule data; if none exists write exactly: "Schedule not recorded in CaseCue — check with the front office."
3. STUDENT GROUPS & SUPPORTS — per student/group: services, minutes, accommodations, and any behavior supports from the records.
4. ASSIGNMENTS FOR THE DAY — ${assignmentRule}
5. ANSWER KEYS (TEACHER COPY ONLY) — for each assignment above that has one, restate the answers clearly under a heading labeled "Teacher Copy Only — do not hand to students." For uploaded files with no key in CaseCue, write "Answer key is inside the uploaded file."
6. TEACHER NOTES — any teacher notes or directions attached to the lessons or uploaded materials; if there are none, write exactly "No teacher notes provided."
7. PROGRESS MONITORING — what the substitute should mark (participation, completion, behavior notes) without collecting formal IEP data.
8. EMERGENCY PROCEDURES — write "Follow the school's own emergency procedures" and list what to ask the front office for. Do not invent school-specific procedures.
9. END-OF-DAY CHECKLIST — 5-8 items (materials returned, notes left for the teacher, etc.).
10. MISSING INFORMATION — list exactly: ${missing.join('; ')}.

${lines.join('\n')}

Return the plan as structured markdown text. End with "Draft — Educator Review Required."`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'automatic' });
    const content = typeof result === 'string' ? result : (result?.output || result?.text || JSON.stringify(result));

    return Response.json({
      content,
      sources,
      missing,
      has_materials: Boolean(hasRealWork),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
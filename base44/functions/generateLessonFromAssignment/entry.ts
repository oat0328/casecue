import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";
import { LESSON_PLAN_SCHEMA, LESSON_PLAN_SECTIONS } from "../../shared/lessonPlanFormat.ts";

// Generates a complete, structured lesson plan from a teacher-corrected
// assignment analysis plus verified student context (IEP goals and the
// accommodations documented on the students' records).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const analysis = body.analysis && typeof body.analysis === 'object' ? body.analysis : null;
    if (!analysis) return Response.json({ error: 'An assignment analysis is required.' }, { status: 400 });

    const goals = Array.isArray(body.goals) ? body.goals.slice(0, 12) : [];
    const verifiedAccommodations = Array.isArray(body.verified_accommodations) ? body.verified_accommodations.slice(0, 12) : [];
    const standards = Array.isArray(body.standards) ? body.standards.slice(0, 10) : [];
    const header = {
      teacher: String(body.teacher_name || '').slice(0, 100),
      date: String(body.date || '').slice(0, 10),
      grade: String(body.grade || '').slice(0, 50),
      subject: String(body.subject || '').slice(0, 80),
      duration: String(body.duration || '').slice(0, 30),
      target: String(body.target_label || 'Instructional group').slice(0, 120)
    };

    const sectionInstructions = LESSON_PLAN_SECTIONS
      .map((s, i) => `${i + 1}. ${s.key} (${s.label}): ${s.guidance}`)
      .join('\n');

    const goalBlock = goals.length
      ? goals.map((g, i) => `  ${i + 1}. [${(g.goal_area || 'Goal')}] ${g.goal_text} | Baseline: ${g.baseline || '—'} | Criterion: ${g.criterion || '—'} | Measurement: ${g.measurement_method || '—'}`).join('\n')
      : '  No specific IEP goals attached — write the plan so the teacher can align it to goals later.';

    const accommodationBlock = verifiedAccommodations.length
      ? verifiedAccommodations.map((a) => `  - ${a.student}: ${a.accommodations}`).join('\n')
      : '  No student selected or no accommodations on file.';

    const prompt = `${CASECUE_SYSTEM_PROMPT}

Create a COMPLETE resource-room lesson plan from the assignment analysis below, at the professional detail level of a veteran special education teacher's written lesson plan (warm, practical, ready to teach tomorrow).

Write the plan for: ${header.target}
Teacher: ${header.teacher || '(not provided)'} | Date: ${header.date || '(not provided)'}
Grade/instructional group: ${header.grade || 'not specified'} | Subject/skill: ${header.subject || 'from analysis'}
Estimated duration: ${header.duration || '30 minutes'}
Standards to address: ${standards.length ? standards.join(', ') : 'suggest relevant Common Core or state standards based on the skills'}

The plan must be built on the skills and questions found in the assignment analysis — never invent assignment questions that are not there, and never copy long passages from the assignment.

VERIFIED IEP GOALS (from student records):
${goalBlock}

VERIFIED ACCOMMODATIONS DOCUMENTED ON STUDENT RECORDS (these are facts):
${accommodationBlock}

SECTIONS — return each key exactly, as a string:
${sectionInstructions}

CRITICAL ACCOMMODATION RULE: the accommodations_note field MUST open with "Only use accommodations documented in the student's IEP." AI-suggested supports are ideas for the IEP team to review against the IEP — never present them as IEP-mandated, and never change a student's IEP, goal, service, placement, or accommodation.

End the iep_objective with the note: "Draft — Educator/IEP Team Review Required."

ASSIGNMENT ANALYSIS (teacher-corrected):
${JSON.stringify(analysis, null, 2)}

Return JSON matching the schema exactly.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: LESSON_PLAN_SCHEMA
    });
    const plan = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ plan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";
import { LESSON_PLAN_SCHEMA, LESSON_PLAN_SECTIONS } from "../../shared/lessonPlanFormat.ts";

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
      teacher: String(body.teacher_name || '').slice(0, 100), date: String(body.date || '').slice(0, 10),
      grade: String(body.grade || '').slice(0, 50), subject: String(body.subject || '').slice(0, 80),
      duration: String(body.duration || '').slice(0, 30), target: String(body.target_label || 'Instructional group').slice(0, 120)
    };
    const sectionInstructions = LESSON_PLAN_SECTIONS.map((s,i)=>`${i+1}. ${s.key} (${s.label}): ${s.guidance}`).join('\n');
    const goalBlock = goals.length ? goals.map((g,i)=>`  ${i+1}. [${g.goal_area||'Goal'}] ${g.goal_text} | Baseline: ${g.baseline||'not supplied'} | Criterion: ${g.criterion||'not supplied'} | Measurement: ${g.measurement_method||'not supplied'}`).join('\n') : '  No verified IEP goals attached. Do not invent an IEP goal.';
    const accommodationBlock = verifiedAccommodations.length ? verifiedAccommodations.map(a=>`  - ${a.student}: ${a.accommodations}`).join('\n') : '  No verified accommodations supplied.';

    const prompt = `${CASECUE_SYSTEM_PROMPT}

Create a FULL, ADMIN-READY special education resource lesson plan that is also practical enough to teach directly from. The teacher-facing workflow is intentionally simple, but the saved plan must document strong instructional planning in professional detail.

PLAN FOR: ${header.target}
Teacher: ${header.teacher || '(not provided)'} | Date: ${header.date || '(not provided)'}
Grade/group: ${header.grade || 'not specified'} | Subject/skill: ${header.subject || 'from analysis'} | Duration: ${header.duration || '30 minutes'}
Standards supplied by teacher/source: ${standards.length ? standards.join(', ') : 'none verified'}

ADMIN-QUALITY REQUIREMENTS:
- Make I Do / We Do / You Do explicit, sequential, timed, observable, and ready to teach.
- Include objective, success criteria, standards rationale, baseline connection, academic vocabulary, prerequisite skill, materials/prep, questioning, checks for understanding, misconceptions/corrections, differentiation, small-group delivery, engagement supports, progress monitoring, quantitative + qualitative data collection, exit ticket, scoring guide, reteach decision rules, evidence to retain, reflection, and next step.
- Use measurable language. Make clear what the teacher does and what students do.
- The progress-monitoring section must support correct/total, percentage, prompting/support, qualitative observation, and evidence source.
- Do NOT turn a Gen Ed assignment grade into IEP mastery. Assignment performance is contextual evidence unless it directly measures the attached goal under an appropriate measurement method.
- If information was not supplied, say so rather than fabricating it.
- Never invent an IEP goal, baseline, criterion, accommodation, service, placement, BIP, or student need.
- Do not claim compliance or mastery from one data point.
- Build from the source assignment without copying long copyrighted passages.

VERIFIED IEP GOALS:
${goalBlock}

VERIFIED ACCOMMODATIONS:
${accommodationBlock}

RETURN EVERY SECTION:
${sectionInstructions}

The accommodations_note MUST begin exactly: "Only use accommodations documented in the student's IEP."
End iep_objective with: "Draft — Educator/IEP Team Review Required."

ASSIGNMENT ANALYSIS:
${JSON.stringify(analysis,null,2)}

Return JSON matching the schema exactly.`;
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model:'automatic', response_json_schema: LESSON_PLAN_SCHEMA });
    const plan = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ plan });
  } catch(error) { return Response.json({ error:error.message }, { status:500 }); }
}

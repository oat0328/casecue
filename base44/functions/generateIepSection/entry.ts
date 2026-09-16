import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const studentId = body.student_id;
    const sectionType = (body.section_type || '').toString().trim();
    const extra = (body.extra || '').toString().trim();

    if (!studentId) return Response.json({ error: 'A student is required.' }, { status: 400 });
    if (!sectionType) return Response.json({ error: 'A section type is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(studentId);
    const goals = await base44.entities.Goal.filter({ student_id: studentId });
    const progress = await base44.entities.ProgressData.filter({ student_id: studentId }, '-date', 20);
    const contextBlock = buildStudentContext(student, goals, progress);

    const sectionGuide = {
      "present_levels": "Draft a Present Levels of Performance statement summarizing the student's current performance, strengths, and needs based ONLY on verified data.",
      "strengths": "Draft a Strengths section based ONLY on verified data.",
      "needs": "Draft an Areas of Need section based ONLY on verified data.",
      "annual_goal": "Draft one measurable annual goal with condition, observable skill, measurable baseline, measurable target/criterion, progress-monitoring method, and data schedule. Explicitly connect it to a documented present-level need and evaluation/progress evidence.",
      "disability_impact": "Draft the educational impact statement explaining how the documented disability affects involvement and progress in the general curriculum or functional participation. Use only verified evidence.",
      "accommodations": "Draft accommodation language connected to the student's documented needs. Separate access accommodations from modifications and avoid vague or unsupported wording.",
      "sdi": "Draft Specially Designed Instruction (SDI) / support language connected to the student's documented needs and goals. State skill/instructional focus rather than generic classroom help.",
      "services": "Draft a services/minutes review from documented services and needs. Preserve documented provider, frequency, duration, setting, and delivery. Any new/change decision must be labeled Team decision required.",
      "progress_measurement": "Draft how progress will be measured and reported for the documented goals, using the actual measurement methods/data sources available. Mark missing cadence or method as Needs verification.",
      "transition": "Draft transition content only when age-appropriate transition evidence exists: preferences/interests, assessments, postsecondary goals, courses of study, services/activities, agency considerations, and student invitation/participation. Mark missing evidence as Needs verification.",
      "lre": "Draft an LRE/participation discussion from documented services, settings, and participation evidence. Do not select placement; label placement decisions Team decision required.",
      "esy": "Draft an ESY consideration summary from documented regression/recoupment, critical-skill, emerging-skill, interruption, or other evidence. Do not decide ESY; label the final determination Team decision required.",
      "assistive_technology": "Draft assistive-technology consideration from documented access/communication/academic/functional needs and existing tools. Do not prescribe unsupported devices.",
      "progress_summary": "Draft a progress summary based ONLY on the recent progress data provided.",
      "meeting_notes": "Draft meeting notes based on the verified context.",
      "parent_communication": "Draft a parent communication message based on verified context.",
      "student_summary": "Write a complete AI Student Summary: a concise snapshot covering eligibility, strengths, areas of need, present levels, accommodations, services, and current progress — based ONLY on verified data."
    };
    const guide = sectionGuide[sectionType] || `Draft the following IEP section: ${sectionType}.`;

    const prompt = `${CASECUE_SYSTEM_PROMPT}\n\nVERIFIED CONTEXT (use only this — never invent):\n${contextBlock}\n\nTASK: ${guide}\n${extra ? "Additional instructions: " + extra : ""}\n\nEnd your response with the line: "Draft — Educator/IEP Team Review Required."`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'automatic' });
    const draft = typeof result === 'string' ? result : (result?.output || result?.text || JSON.stringify(result));
    return Response.json({ draft });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
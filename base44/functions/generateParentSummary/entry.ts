import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// Dedicated Parent Summary generator: a plain-language, parent-friendly
// summary built ONLY from the student's verified record, goals, and logged
// progress data. Never invents facts; states plainly what is not on file.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const studentId = String(body.student_id || '').trim();
    if (!studentId) return Response.json({ error: 'student_id is required' }, { status: 400 });

    const student = await base44.entities.Student.get(studentId);
    const goals = await base44.entities.Goal.filter({ student_id: studentId });
    const progress = await base44.entities.ProgressData.filter({ student_id: studentId }, 'date', 200);

    const goalLines = goals.map((g) =>
      `- ${g.goal_area || 'General'}: ${g.goal_text || 'not recorded'} (starting point: ${g.baseline || 'not recorded'}, goal: ${g.target || 'not recorded'})`
    ).join('\n') || '- No goals on file.';
    const progressLines = progress.map((p) =>
      `${p.date}: ${p.percentage != null ? p.percentage + '%' : (p.correct != null && p.total ? p.correct + '/' + p.total : 'recorded')}`
    ).join(', ') || 'No progress data logged yet.';

    const context = [
      `Student: ${student.first_name} ${student.last_name} (Grade ${student.grade || 'not recorded'})`,
      `Eligibility: ${student.eligibility_category || 'not recorded'}`,
      `Strengths: ${student.strengths || 'not recorded'}`,
      `Areas of need: ${student.areas_of_need || 'not recorded'}`,
      `Present levels: ${student.present_levels || 'not recorded'}`,
      `Accommodations: ${student.accommodations || 'not recorded'}`,
      `Services: ${(student.services || []).join(', ') || 'not recorded'}`,
      `Goals:\n${goalLines}`,
      `Progress data: ${progressLines}`,
    ].join('\n');

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are writing a summary of this student for their PARENT or GUARDIAN. Use ONLY the verified information provided — never invent facts, scores, dates, or observations. Where something is not recorded, say so plainly and warmly (e.g. "we do not have that on file yet"). Write in warm, plain, jargon-free language a non-educator can understand: spell out or avoid acronyms and special-education jargon. Structure it as: a friendly opening about the student, what is going well, what we are working on, how progress is measured and how it is going so far, the supports in place, and a closing encouraging the family to reach out with questions. Keep it roughly 250-400 words.

${context}

Return JSON with a single key "summary" containing the parent-friendly summary text.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
      },
    });

    return Response.json({ summary: res.summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
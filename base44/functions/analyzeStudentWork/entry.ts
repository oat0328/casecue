import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from '../../shared/casecueContext.ts';

const SCHEMA = {
  type: 'object',
  properties: {
    detected_title: { type: 'string' },
    evidence_type: { type: 'string' },
    subject: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    score_earned: { type: 'number' },
    score_possible: { type: 'number' },
    percentage: { type: 'number' },
    scoring_confidence: { type: 'string', enum: ['high','medium','low','not_scored'] },
    scoring_basis: { type: 'string' },
    qualitative_notes: { type: 'string' },
    error_patterns: { type: 'array', items: { type: 'string' } },
    strengths_observed: { type: 'array', items: { type: 'string' } },
    teacher_observation_draft: { type: 'string' },
    goal_alignment: { type: 'string' },
    cautions: { type: 'array', items: { type: 'string' } }
  },
  required: ['detected_title','evidence_type','skills','score_earned','score_possible','percentage','scoring_confidence','scoring_basis','qualitative_notes','error_patterns','strengths_observed','teacher_observation_draft','goal_alignment','cautions']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const studentId = String(body.student_id || '');
    const fileUrl = String(body.file_url || '');
    if (!studentId || !/^https?:\/\//i.test(fileUrl)) return Response.json({ error: 'Student and uploaded work are required.' }, { status: 400 });

    const student = await base44.entities.Student.get(studentId);
    if (!student) return Response.json({ error: 'Student not found.' }, { status: 404 });
    const goalId = String(body.goal_id || '');
    let goal = null;
    if (goalId) {
      try { goal = await base44.entities.Goal.get(goalId); } catch {}
      if (goal && goal.student_id !== studentId) goal = null;
    }

    const possiblePoints = Number(body.score_possible || 0);
    const answerKey = String(body.answer_key || '').slice(0, 10000);
    const rubric = String(body.rubric || '').slice(0, 10000);
    const teacherDirections = String(body.teacher_directions || '').slice(0, 5000);

    const prompt = `${CASECUE_SYSTEM_PROMPT}\n\nYou are analyzing ONE student's uploaded work sample for a special education teacher. Read every visible page carefully.\n\nSTUDENT: ${student.first_name} ${student.last_name}, grade ${student.grade || 'not entered'}\nGOAL (if selected): ${goal ? `${goal.goal_area || 'Goal'} — ${goal.goal_text || ''}` : 'No goal selected'}\nTEACHER-PROVIDED POSSIBLE POINTS: ${possiblePoints || 'not provided'}\nANSWER KEY (optional): ${answerKey || 'not provided'}\nRUBRIC (optional): ${rubric || 'not provided'}\nTEACHER DIRECTIONS (optional): ${teacherDirections || 'not provided'}\n\nRULES:\n1. Never invent an answer key, rubric, score, or student response.\n2. If the work is objectively scorable from visible responses plus a provided or clearly embedded answer key, calculate score_earned, score_possible, and percentage.\n3. If scoring is subjective or an answer key/rubric is missing, set scoring_confidence to low or not_scored and use 0 for score fields rather than guessing. Explain what the teacher must confirm in scoring_basis/cautions.\n4. teacher_observation_draft must be a short evidence-based observation from what is actually visible in the work, not a diagnosis or conclusion.\n5. goal_alignment should say how the observed task aligns to the selected goal, or "No goal selected".\n6. Flag illegible/cropped/missing pages or ambiguous responses in cautions.\n7. The teacher must review and approve before anything is saved to Gradebook or progress monitoring.\n\nReturn JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: SCHEMA,
      model: 'automatic'
    });
    const analysis = typeof result === 'object' ? result : JSON.parse(result);
    if (analysis.score_possible > 0) analysis.percentage = Math.round((Number(analysis.score_earned || 0) / Number(analysis.score_possible)) * 1000) / 10;
    else analysis.percentage = 0;
    return Response.json({ analysis });
  } catch (error) {
    console.error('analyzeStudentWork failed:', error);
    return Response.json({ error: error.message || 'Unable to analyze student work.' }, { status: 500 });
  }
}

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
    question_breakdown: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, student_response: { type: 'string' }, correct_answer: { type: 'string' }, earned: { type: 'number' }, possible: { type: 'number' }, status: { type: 'string' }, note: { type: 'string' } } } },
    qualitative_notes: { type: 'string' },
    error_patterns: { type: 'array', items: { type: 'string' } },
    strengths_observed: { type: 'array', items: { type: 'string' } },
    teacher_observation_draft: { type: 'string' },
    goal_alignment: { type: 'string' },
    cautions: { type: 'array', items: { type: 'string' } }
  },
  required: ['detected_title','evidence_type','skills','score_earned','score_possible','percentage','scoring_confidence','scoring_basis','question_breakdown','qualitative_notes','error_patterns','strengths_observed','teacher_observation_draft','goal_alignment','cautions']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const studentId = String(body.student_id || '');
    const fileUri = String(body.file_uri || '');
    let fileUrl = String(body.file_url || '');
    if (!studentId || (!fileUri && !/^https?:\/\//i.test(fileUrl))) return Response.json({ error: 'Student and uploaded work are required.' }, { status: 400 });
    if (fileUri) {
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });
      fileUrl = signed.signed_url;
    }

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

    const prompt = `${CASECUE_SYSTEM_PROMPT}\n\nYou are analyzing ONE student's uploaded work sample for a special education teacher. Read every visible page carefully.\n\nSTUDENT: ${student.first_name} ${student.last_name}, grade ${student.grade || 'not entered'}\nGOAL (if selected): ${goal ? `${goal.goal_area || 'Goal'} — ${goal.goal_text || ''}` : 'No goal selected'}\nTEACHER-PROVIDED POSSIBLE POINTS: ${possiblePoints || 'not provided'}\nANSWER KEY (optional): ${answerKey || 'not provided'}\nRUBRIC (optional): ${rubric || 'not provided'}\nTEACHER DIRECTIONS (optional): ${teacherDirections || 'not provided'}\n\nRULES:\n1. Never invent an answer key, rubric, score, or student response.\n2. Read the worksheet item by item. For every clearly visible question/problem/task that can be identified, add a question_breakdown row with the visible item label/number, student response, correct answer, earned/possible points, status, and a short note. If an item cannot be read, include it with status "needs_review" rather than silently dropping it.\n3. OBJECTIVE MATH RULE: for deterministic arithmetic or other objectively solvable math (addition, subtraction, multiplication, division, fractions with a determinate answer, integer operations, simple equations, numeric conversions, etc.), YOU MUST solve each visible problem independently and grade the student's visible response even when the teacher did not provide an answer key. A teacher answer key is helpful but is NOT required for basic deterministic math. Unless the worksheet visibly specifies another point value, use 1 point per clearly visible scorable problem. A clearly presented problem with no student response may be scored 0/1; an illegible/cropped problem must be marked needs_review and excluded from the verified total rather than guessed.\n4. For subjective work (writing, open-ended interpretation, projects) without an adequate rubric, do not invent a numeric score. Set scoring_confidence to low or not_scored and explain what the teacher must confirm. The teacher can correct or manually score the work in CaseCue. Explain what the teacher must confirm in scoring_basis/cautions.\n5. teacher_observation_draft must be a short evidence-based observation from what is actually visible in the work, not a diagnosis or conclusion.\n6. goal_alignment should say how the observed task aligns to the selected goal, or "No goal selected".\n7. Flag illegible/cropped/missing pages, skipped visible items, ambiguous responses, or conflicting marks in cautions. Do not assume a checkmark, circle, handwriting mark, or crossed-out response means correct unless the evidence is clear.\n8. The teacher must review and can override student, goal, title, item scores, total score, and notes before anything is saved to Gradebook or progress monitoring.\n\nReturn JSON matching the schema.`;

    const firstResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: SCHEMA,
      model: 'automatic'
    });
    const first = typeof firstResult === 'object' ? firstResult : JSON.parse(firstResult);

    const verifyPrompt = `${CASECUE_SYSTEM_PROMPT}\n\nYou are the SECOND-PASS verification grader. Independently inspect the SAME uploaded worksheet. Do not trust the first pass just because it exists.\n\nSTUDENT: ${student.first_name} ${student.last_name}, grade ${student.grade || 'not entered'}\nSELECTED GOAL: ${goal ? `${goal.goal_area || 'Goal'} — ${goal.goal_text || ''}` : 'No goal selected'}\nTEACHER POSSIBLE POINTS: ${possiblePoints || 'not provided'}\nANSWER KEY: ${answerKey || 'not provided'}\nRUBRIC: ${rubric || 'not provided'}\nTEACHER DIRECTIONS: ${teacherDirections || 'not provided'}\n\nFIRST PASS FOR COMPARISON ONLY:\n${JSON.stringify(first)}\n\nVERIFY EVERY VISIBLE ITEM YOURSELF. Re-read the original file and rebuild question_breakdown independently. Correct any first-pass error you can prove from the worksheet. Never preserve a first-pass answer merely to agree. Flag unclear/cropped/illegible items as needs_review. For deterministic objective math, independently solve every clearly visible problem yourself; no teacher answer key is required. Use 1 point per visible problem unless another point value is clearly shown, recompute totals from verified item rows, and compare the student's response to your independently solved answer. For subjective work without an adequate rubric, do not invent points. Return JSON matching the same schema.`;

    const verifyResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: verifyPrompt,
      file_urls: [fileUrl],
      response_json_schema: SCHEMA,
      model: 'automatic'
    });
    const verified = typeof verifyResult === 'object' ? verifyResult : JSON.parse(verifyResult);

    const firstEarned = Number(first.score_earned || 0), firstPossible = Number(first.score_possible || 0);
    const verifiedEarned = Number(verified.score_earned || 0), verifiedPossible = Number(verified.score_possible || 0);
    const firstRows = Array.isArray(first.question_breakdown) ? first.question_breakdown : [];
    const verifiedRows = Array.isArray(verified.question_breakdown) ? verified.question_breakdown : [];
    const sameTotal = firstEarned === verifiedEarned && firstPossible === verifiedPossible;
    const sameCount = firstRows.length === verifiedRows.length;
    const analysis = { ...verified };
    analysis.verification = {
      status: sameTotal && sameCount ? 'verified' : 'needs_teacher_review',
      first_pass: { earned: firstEarned, possible: firstPossible, items: firstRows.length },
      second_pass: { earned: verifiedEarned, possible: verifiedPossible, items: verifiedRows.length }
    };
    if (!sameTotal || !sameCount) {
      analysis.scoring_confidence = 'low';
      analysis.cautions = [
        ...(analysis.cautions || []),
        `Two-pass grading disagreed. First pass: ${firstEarned}/${firstPossible} across ${firstRows.length} item(s). Verification pass: ${verifiedEarned}/${verifiedPossible} across ${verifiedRows.length} item(s). Teacher review is required before saving.`
      ];
    }
    if (analysis.score_possible > 0) analysis.percentage = Math.round((Number(analysis.score_earned || 0) / Number(analysis.score_possible)) * 1000) / 10;
    else analysis.percentage = 0;
    return Response.json({ analysis });
  } catch (error) {
    console.error('analyzeStudentWork failed:', error);
    return Response.json({ error: error.message || 'Unable to analyze student work.' }, { status: 500 });
  }
}

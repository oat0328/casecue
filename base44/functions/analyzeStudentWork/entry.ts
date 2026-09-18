import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from '../../shared/casecueContext.ts';
import { gradeDeterministicRows, comparePassRows } from '../../shared/deterministicMath.js';

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
    question_breakdown: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, problem_text: { type: 'string' }, student_response: { type: 'string' }, correct_answer: { type: 'string' }, earned: { type: 'number' }, possible: { type: 'number' }, status: { type: 'string' }, note: { type: 'string' } } } },
    rubric_breakdown: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, earned: { type: 'number' }, possible: { type: 'number' }, evidence: { type: 'string' }, note: { type: 'string' } } } },
    qualitative_notes: { type: 'string' },
    error_patterns: { type: 'array', items: { type: 'string' } },
    strengths_observed: { type: 'array', items: { type: 'string' } },
    teacher_observation_draft: { type: 'string' },
    goal_alignment: { type: 'string' },
    cautions: { type: 'array', items: { type: 'string' } }
  },
  required: ['detected_title','evidence_type','skills','score_earned','score_possible','percentage','scoring_confidence','scoring_basis','question_breakdown','rubric_breakdown','qualitative_notes','error_patterns','strengths_observed','teacher_observation_draft','goal_alignment','cautions']
};

const resultStatus = (value) => ['correct','incorrect','partial','blank','unreadable','needs_review'].includes(String(value||'')) ? String(value) : 'needs_review';
const rubricTotals=(rows=[])=>{const usable=(Array.isArray(rows)?rows:[]).filter(r=>Number(r.possible)>0&&Number.isFinite(Number(r.earned)));if(!usable.length)return null;const earned=usable.reduce((n,r)=>n+Number(r.earned||0),0),possible=usable.reduce((n,r)=>n+Number(r.possible||0),0);return possible>0?{earned,possible,percentage:Math.round(earned/possible*1000)/10}:null;};
async function persistProblemRows(base44,organizationId,gradingRunId,gradingPassId,rows=[]){
  let order=0;
  for(const row of Array.isArray(rows)?rows:[]){
    order++;
    await base44.asServiceRole.entities.ProblemResult.create({
      organization_id:organizationId,grading_run_id:gradingRunId,grading_pass_id:gradingPassId,
      problem_order:order,problem_number:String(row.item||order),problem_text:String(row.problem_text||''),
      student_answer_raw:String(row.student_response||''),expected_answer:String(row.correct_answer||''),
      earned_points:Number(row.earned||0),possible_points:Number(row.possible||0),result:resultStatus(row.status),
      deterministic:!!row.deterministic,requires_teacher_review:['needs_review','unreadable'].includes(resultStatus(row.status)),
      note:String(row.note||''),created_at:new Date().toISOString()
    });
  }
}

export default async function(req) {
  let base44=null;
  let gradingRunId='';
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const organizationId=String(user.organization_id||user.data?.organization_id||'');
    if(!organizationId)return Response.json({error:'Your CaseCue organization could not be verified.'},{status:403});
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
    if (!student || (student.organization_id && String(student.organization_id)!==organizationId)) return Response.json({ error: 'Student not found.' }, { status: 404 });
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
    const trigger=['initial','teacher_regrade','system_retry'].includes(String(body.trigger||''))?String(body.trigger):'initial';
    const parentRunId=String(body.parent_run_id||'');
    let runNumber=1;
    if(parentRunId){try{const parent=await base44.asServiceRole.entities.GradingRun.get(parentRunId);runNumber=Number(parent?.run_number||0)+1;}catch{}}
    const gradingRun=await base44.asServiceRole.entities.GradingRun.create({organization_id:organizationId,student_id:studentId,goal_id:goalId,source_file_uri:fileUri||fileUrl,parent_run_id:parentRunId,run_number:runNumber,trigger,status:'processing',grader_version:'smart-grader-phase1',model_version:'automatic',started_at:new Date().toISOString()});
    gradingRunId=gradingRun.id;

    const prompt = `${CASECUE_SYSTEM_PROMPT}\n\nYou are analyzing ONE student's uploaded work sample for a special education teacher. Read every visible page carefully.\n\nSTUDENT: ${student.first_name} ${student.last_name}, grade ${student.grade || 'not entered'}\nGOAL (if selected): ${goal ? `${goal.goal_area || 'Goal'} — ${goal.goal_text || ''}` : 'No goal selected'}\nTEACHER-PROVIDED POSSIBLE POINTS: ${possiblePoints || 'not provided'}\nANSWER KEY (optional): ${answerKey || 'not provided'}\nRUBRIC (optional): ${rubric || 'not provided'}\nTEACHER DIRECTIONS (optional): ${teacherDirections || 'not provided'}\n\nRULES:\n1. Never invent an answer key, rubric, score, or student response.\n2. Read the worksheet item by item. For every clearly visible question/problem/task that can be identified, add a question_breakdown row with the visible item label/number, exact visible problem_text/expression, student response, correct answer if known, earned/possible points, status, and a short note. Preserve problem_text even when you are uncertain about the score because CaseCue will independently solve deterministic math in code. If an item cannot be read, include it with status "needs_review" rather than silently dropping it.\n3. OBJECTIVE MATH RULE: for deterministic arithmetic or other objectively solvable math (addition, subtraction, multiplication, division, fractions with a determinate answer, integer operations, simple equations, numeric conversions, etc.), YOU MUST solve each visible problem independently and grade the student's visible response even when the teacher did not provide an answer key. A teacher answer key is helpful but is NOT required for basic deterministic math. Unless the worksheet visibly specifies another point value, use 1 point per clearly visible scorable problem. A clearly presented problem with no student response may be scored 0/1; an illegible/cropped problem must be marked needs_review and excluded from the verified total rather than guessed.\n4. For subjective work (writing, open-ended interpretation, projects): if a teacher rubric IS provided, apply that rubric criterion by criterion and return rubric_breakdown with the exact rubric criterion, earned, possible, brief visible evidence, and note. Calculate the numeric score from those rubric rows, set scoring_confidence to medium, and require teacher review because rubric interpretation is subjective. If an adequate rubric is NOT provided, do not invent a numeric score; return rubric_breakdown as an empty array, set scoring_confidence to low or not_scored, and explain what the teacher must confirm.\n5. teacher_observation_draft must be a short evidence-based observation from what is actually visible in the work, not a diagnosis or conclusion.\n6. goal_alignment should say how the observed task aligns to the selected goal, or "No goal selected".\n7. Flag illegible/cropped/missing pages, skipped visible items, ambiguous responses, or conflicting marks in cautions. Do not assume a checkmark, circle, handwriting mark, or crossed-out response means correct unless the evidence is clear.\n8. The teacher must review and can override student, goal, title, item scores, total score, and notes before anything is saved to Gradebook or progress monitoring.\n\nReturn JSON matching the schema.`;

    const firstResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: SCHEMA,
      model: 'automatic'
    });
    const first = typeof firstResult === 'object' ? firstResult : JSON.parse(firstResult);
    const firstDeterministic = gradeDeterministicRows(first.question_breakdown || []);
    if (firstDeterministic.deterministicCount > 0) {
      first.question_breakdown = firstDeterministic.rows;
      first.score_earned = firstDeterministic.earned;
      first.score_possible = firstDeterministic.possible;
      first.percentage = firstDeterministic.percentage;
      first.scoring_basis = `${first.scoring_basis || ''} Deterministic math rows were recalculated by CaseCue code.`.trim();
    } else if (rubric) {
      const rt=rubricTotals(first.rubric_breakdown||[]);if(rt){first.score_earned=rt.earned;first.score_possible=rt.possible;first.percentage=rt.percentage;first.scoring_confidence='medium';first.scoring_basis=`${first.scoring_basis||''} Score recomputed from the teacher-provided rubric criteria.`.trim();}
    }
    const firstPass=await base44.asServiceRole.entities.GradingPass.create({organization_id:organizationId,grading_run_id:gradingRunId,pass_type:'initial',earned_points:Number(first.score_earned||0),possible_points:Number(first.score_possible||0),percentage:Number(first.percentage||0),questions_detected:(first.question_breakdown||[]).length,deterministic_items:firstDeterministic.deterministicCount,status:'completed',result:first,created_at:new Date().toISOString()});
    await persistProblemRows(base44,organizationId,gradingRunId,firstPass.id,first.question_breakdown||[]);

    const verifyPrompt = `${CASECUE_SYSTEM_PROMPT}\n\nYou are the SECOND-PASS verification grader. Independently inspect the SAME uploaded worksheet from scratch. You are NOT given the first-pass output.\n\nSTUDENT: ${student.first_name} ${student.last_name}, grade ${student.grade || 'not entered'}\nSELECTED GOAL: ${goal ? `${goal.goal_area || 'Goal'} — ${goal.goal_text || ''}` : 'No goal selected'}\nTEACHER POSSIBLE POINTS: ${possiblePoints || 'not provided'}\nANSWER KEY: ${answerKey || 'not provided'}\nRUBRIC: ${rubric || 'not provided'}\nTEACHER DIRECTIONS: ${teacherDirections || 'not provided'}\n\nRe-read the original file independently. Rebuild question_breakdown from the source document, including exact problem_text and student_response for every visible item. Flag unclear/cropped/illegible items as needs_review. For deterministic math, extract the visible expression and response carefully; CaseCue code will independently solve and score those rows after your extraction. For subjective work with the supplied rubric, independently apply the same rubric and return rubric_breakdown criterion by criterion. Without an adequate rubric, do not invent points. Return JSON matching the same schema.`;

    const verifyResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: verifyPrompt,
      file_urls: [fileUrl],
      response_json_schema: SCHEMA,
      model: 'automatic'
    });
    const verified = typeof verifyResult === 'object' ? verifyResult : JSON.parse(verifyResult);
    const verifiedDeterministic = gradeDeterministicRows(verified.question_breakdown || []);
    if (verifiedDeterministic.deterministicCount > 0) {
      verified.question_breakdown = verifiedDeterministic.rows;
      verified.score_earned = verifiedDeterministic.earned;
      verified.score_possible = verifiedDeterministic.possible;
      verified.percentage = verifiedDeterministic.percentage;
      verified.scoring_basis = `${verified.scoring_basis || ''} Deterministic math rows were recalculated by CaseCue code.`.trim();
    } else if (rubric) {
      const rt=rubricTotals(verified.rubric_breakdown||[]);if(rt){verified.score_earned=rt.earned;verified.score_possible=rt.possible;verified.percentage=rt.percentage;verified.scoring_confidence='medium';verified.scoring_basis=`${verified.scoring_basis||''} Score recomputed from the teacher-provided rubric criteria.`.trim();}
    }
    const verificationPass=await base44.asServiceRole.entities.GradingPass.create({organization_id:organizationId,grading_run_id:gradingRunId,pass_type:'verification',earned_points:Number(verified.score_earned||0),possible_points:Number(verified.score_possible||0),percentage:Number(verified.percentage||0),questions_detected:(verified.question_breakdown||[]).length,deterministic_items:verifiedDeterministic.deterministicCount,status:'completed',result:verified,created_at:new Date().toISOString()});
    await persistProblemRows(base44,organizationId,gradingRunId,verificationPass.id,verified.question_breakdown||[]);

    const firstEarned = Number(first.score_earned || 0), firstPossible = Number(first.score_possible || 0);
    const verifiedEarned = Number(verified.score_earned || 0), verifiedPossible = Number(verified.score_possible || 0);
    const firstRows = Array.isArray(first.question_breakdown) ? first.question_breakdown : [];
    const verifiedRows = Array.isArray(verified.question_breakdown) ? verified.question_breakdown : [];
    const discrepancies = comparePassRows(firstRows, verifiedRows);
    const sameTotal = firstEarned === verifiedEarned && firstPossible === verifiedPossible;
    const sameCount = firstRows.length === verifiedRows.length;
    const hasReviewRows=[...firstRows,...verifiedRows].some((row:any)=>['needs_review','unreadable'].includes(String(row.status||'')));
    const noScorableProblems=verifiedPossible<=0;
    const subjectiveRubric=(verified.rubric_breakdown||[]).length>0;
    const verifiedStatus = sameTotal && sameCount && discrepancies.length === 0 && !hasReviewRows && !noScorableProblems && !subjectiveRubric ? 'verified' : 'needs_teacher_review';
    const analysis = { ...verified };
    analysis.verification = {
      status: verifiedStatus,
      first_pass: { earned: firstEarned, possible: firstPossible, items: firstRows.length },
      second_pass: { earned: verifiedEarned, possible: verifiedPossible, items: verifiedRows.length },
      discrepancies
    };
    if (verifiedStatus !== 'verified') {
      analysis.scoring_confidence = 'low';
      analysis.cautions = [
        ...(analysis.cautions || []),
        `Two-pass review found ${discrepancies.length || 1} discrepancy item(s). First pass: ${firstEarned}/${firstPossible}; verification pass: ${verifiedEarned}/${verifiedPossible}. Teacher review is required before saving.`
      ];
    }
    if (analysis.score_possible > 0) analysis.percentage = Math.round((Number(analysis.score_earned || 0) / Number(analysis.score_possible)) * 1000) / 10;
    else {analysis.percentage = null;analysis.scoring_confidence='not_scored';analysis.cautions=[...(analysis.cautions||[]),'NO_FINALIZED_SCORABLE_PROBLEMS: Grade not available; this is not a 0% student score.'];}
    analysis.authoritative_score={earned:Number(analysis.score_earned||0),possible:Number(analysis.score_possible||0),percentage:analysis.score_possible>0?analysis.percentage:null,source:'finalized_problem_records',reconciled:analysis.score_possible>0};
    for(const d of discrepancies){
      const allowed=['problem_text','student_answer','expected_answer','score','question_count','total_points'];
      await base44.asServiceRole.entities.VerificationDiscrepancy.create({organization_id:organizationId,grading_run_id:gradingRunId,problem_number:String(d.item||''),discrepancy_type:allowed.includes(d.type)?d.type:'score',pass_1_value:String(d.pass_1_value??''),pass_2_value:String(d.pass_2_value??''),resolution_status:'unresolved',created_at:new Date().toISOString()});
    }
    await base44.asServiceRole.entities.GradingRun.update(gradingRunId,{assignment_title:String(analysis.detected_title||''),first_earned:firstEarned,first_possible:firstPossible,verified_earned:verifiedEarned,verified_possible:verifiedPossible,verification_status:verifiedStatus,discrepancy_count:discrepancies.length,status:verifiedStatus==='verified'?'completed':'review_required',completed_at:new Date().toISOString()});
    analysis.grading_run_id=gradingRunId;
    return Response.json({ analysis, grading_run_id:gradingRunId });
  } catch (error) {
    if(base44&&gradingRunId){await base44.asServiceRole.entities.GradingRun.update(gradingRunId,{status:'failed',completed_at:new Date().toISOString()}).catch(()=>{});}
    console.error('analyzeStudentWork failed:', error);
    return Response.json({ error: error.message || 'Unable to analyze student work.' }, { status: 500 });
  }
}

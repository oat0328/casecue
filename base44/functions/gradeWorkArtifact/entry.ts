import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from '../../shared/casecueContext.ts';
import { gradeDeterministicRows, comparePassRows } from '../../shared/deterministicMath.js';

const SCHEMA={
 type:'object',
 properties:{
  detected_title:{type:'string'},
  evidence_type:{type:'string'},
  subject:{type:'string'},
  skills:{type:'array',items:{type:'string'}},
  score_earned:{type:'number'},
  score_possible:{type:'number'},
  percentage:{type:'number'},
  scoring_confidence:{type:'string',enum:['high','medium','low','not_scored']},
  scoring_basis:{type:'string'},
  question_breakdown:{type:'array',items:{type:'object',properties:{
   item:{type:'string'},problem_text:{type:'string'},student_response:{type:'string'},correct_answer:{type:'string'},
   earned:{type:'number'},possible:{type:'number'},status:{type:'string'},note:{type:'string'}
  }}},
  rubric_breakdown:{type:'array',items:{type:'object',properties:{
   criterion:{type:'string'},earned:{type:'number'},possible:{type:'number'},evidence:{type:'string'},note:{type:'string'}
  }}},
  qualitative_notes:{type:'string'},
  error_patterns:{type:'array',items:{type:'string'}},
  strengths_observed:{type:'array',items:{type:'string'}},
  teacher_observation_draft:{type:'string'},
  instructional_next_step:{type:'string'},
  cautions:{type:'array',items:{type:'string'}}
 },
 required:['detected_title','evidence_type','subject','skills','score_earned','score_possible','percentage','scoring_confidence','scoring_basis','question_breakdown','rubric_breakdown','qualitative_notes','error_patterns','strengths_observed','teacher_observation_draft','instructional_next_step','cautions']
};

const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\bsvg\b/gi,' ').replace(/\s+/g,' ').trim();
const rubricTotals=(rows=[])=>{const usable=(Array.isArray(rows)?rows:[]).filter(r=>Number(r.possible)>0&&Number.isFinite(Number(r.earned)));if(!usable.length)return null;const earned=usable.reduce((n,r)=>n+Number(r.earned||0),0),possible=usable.reduce((n,r)=>n+Number(r.possible||0),0);return possible>0?{earned,possible,percentage:Math.round(earned/possible*1000)/10}:null;};
const hasReviewRows=rows=>(Array.isArray(rows)?rows:[]).some(r=>['needs_review','unreadable'].includes(String(r.status||'').toLowerCase()));

function normalizeResult(raw,rubric){
 const x={...raw};
 x.detected_title=clean(x.detected_title||'Student work');
 x.subject=clean(x.subject||'');
 x.skills=(x.skills||[]).map(clean).filter(Boolean);
 const deterministic=gradeDeterministicRows(x.question_breakdown||[]);
 if(deterministic.deterministicCount>0){
  x.question_breakdown=deterministic.rows;
  x.score_earned=deterministic.earned;
  x.score_possible=deterministic.possible;
  x.percentage=deterministic.percentage;
  x.scoring_confidence=deterministic.reviewCount>0?'medium':'high';
  x.scoring_basis=(clean(x.scoring_basis)+' Deterministic math rows were recalculated by CaseCue code.').trim();
 }else if(rubric){
  const rt=rubricTotals(x.rubric_breakdown||[]);
  if(rt){
   x.score_earned=rt.earned;x.score_possible=rt.possible;x.percentage=rt.percentage;x.scoring_confidence='medium';
   x.scoring_basis=(clean(x.scoring_basis)+' Score recomputed from teacher-provided rubric criteria.').trim();
  }
 }else if(Number(x.score_possible)>0){
  x.percentage=Math.round(Number(x.score_earned||0)/Number(x.score_possible)*1000)/10;
 }else{
  x.score_earned=0;x.score_possible=0;x.percentage=0;x.scoring_confidence='not_scored';
 }
 return{x,deterministic};
}

export default async function(req){
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const organizationId=String(user.organization_id||user.data?.organization_id||'');
  if(!organizationId)return Response.json({error:'Your CaseCue organization could not be verified.'},{status:403});
  const body=await req.json().catch(()=>({}));
  const fileUri=String(body.file_uri||'');
  if(!fileUri)return Response.json({error:'An extracted work sample is required.'},{status:400});
  const answerKey=String(body.answer_key||'').slice(0,12000);
  const rubric=String(body.rubric||'').slice(0,12000);
  const expectedTitle=clean(body.expected_assignment_title||'');
  const expectedSubject=clean(body.expected_subject||'');
  const signed=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:900});

  const basePrompt=[
   CASECUE_SYSTEM_PROMPT,
   '',
   'You are CaseCue Artifact Grader. Grade ONE extracted work sample. Student identity is intentionally not part of this task.',
   'Do NOT infer or use a student identity. Do NOT inspect IEP goals. Do NOT create progress-monitoring conclusions.',
   '',
   'EXPECTED TITLE: '+(expectedTitle||'not provided'),
   'EXPECTED SUBJECT: '+(expectedSubject||'not provided'),
   'ANSWER KEY: '+(answerKey||'not provided'),
   'RUBRIC: '+(rubric||'not provided'),
   '',
   'GRADING RULES:',
   '1. Read every visible item. Preserve exact problem text and visible student response in question_breakdown.',
   '2. Deterministic objective math must be graded even without an answer key. Solve arithmetic, fractions, integer operations, simple equations, and numeric conversions independently. Default to 1 point per clearly visible problem unless another value is shown.',
   '3. Multiple-choice, true/false, matching, and other objectively keyed items may be graded only when the correct answer is visible, supplied in the answer key, or objectively determinable.',
   '4. Illegible, cropped, ambiguous, or incomplete items must be marked needs_review and excluded from a verified total instead of guessed.',
   '5. For writing or other subjective work WITH a teacher rubric, apply the rubric criterion by criterion in rubric_breakdown. Give brief visible evidence for each criterion. The result is an AI-suggested grade and must remain medium confidence.',
   '6. For subjective work WITHOUT an adequate rubric, do not invent a numeric score. Use not_scored or low confidence and explain what the teacher must decide.',
   '7. qualitative_notes, strengths_observed, error_patterns, and instructional_next_step must be grounded in the visible work.',
   '8. Do not make IEP, disability, mastery, service, behavior, or accommodation claims.',
   '',
   'Return JSON matching the schema.'
  ].join('\n');

  const firstRaw=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt:basePrompt,file_urls:[signed.signed_url],response_json_schema:SCHEMA,model:'automatic'});
  const firstNorm=normalizeResult(typeof firstRaw==='object'?firstRaw:JSON.parse(firstRaw),rubric);

  const verifyPrompt=[
   CASECUE_SYSTEM_PROMPT,
   '',
   'You are the independent SECOND-PASS CaseCue Artifact Grader. Re-read the same work sample from scratch.',
   'You are not given the first-pass result. Student identity and IEP goals are intentionally unavailable.',
   'EXPECTED TITLE: '+(expectedTitle||'not provided'),
   'EXPECTED SUBJECT: '+(expectedSubject||'not provided'),
   'ANSWER KEY: '+(answerKey||'not provided'),
   'RUBRIC: '+(rubric||'not provided'),
   '',
   'Rebuild the item-level grading independently. For deterministic math, extract exact expressions and responses so CaseCue code can solve them. For subjective work, apply only the supplied rubric. Flag anything uncertain instead of guessing.',
   'Return JSON matching the schema.'
  ].join('\n');
  const secondRaw=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt:verifyPrompt,file_urls:[signed.signed_url],response_json_schema:SCHEMA,model:'automatic'});
  const secondNorm=normalizeResult(typeof secondRaw==='object'?secondRaw:JSON.parse(secondRaw),rubric);

  const first=firstNorm.x,second=secondNorm.x;
  const discrepancies=comparePassRows(first.question_breakdown||[],second.question_breakdown||[]);
  const sameTotal=Number(first.score_earned||0)===Number(second.score_earned||0)&&Number(first.score_possible||0)===Number(second.score_possible||0);
  const rubricSubjective=(second.rubric_breakdown||[]).length>0;
  const scoreExists=Number(second.score_possible||0)>0;
  const verified=sameTotal&&discrepancies.length===0&&!hasReviewRows(first.question_breakdown||[])&&!hasReviewRows(second.question_breakdown||[])&&scoreExists&&!rubricSubjective;

  const analysis={...second};
  analysis.verification={
   status:verified?'verified':'needs_teacher_review',
   first_pass:{earned:Number(first.score_earned||0),possible:Number(first.score_possible||0),percentage:Number(first.percentage||0)},
   second_pass:{earned:Number(second.score_earned||0),possible:Number(second.score_possible||0),percentage:Number(second.percentage||0)},
   discrepancies
  };
  analysis.scoring_confidence=verified?'high':rubricSubjective&&scoreExists?'medium':analysis.scoring_confidence||'low';
  analysis.score_confidence_reasons=[];
  if(verified)analysis.score_confidence_reasons.push('Two independent grading passes agreed.');
  if(firstNorm.deterministic.deterministicCount>0)analysis.score_confidence_reasons.push(firstNorm.deterministic.deterministicCount+' objective math item'+(firstNorm.deterministic.deterministicCount===1?'':'s')+' independently checked.');
  if(answerKey)analysis.score_confidence_reasons.push('Teacher answer key supplied.');
  if(rubricSubjective)analysis.score_confidence_reasons.push('Teacher rubric applied criterion by criterion; teacher approval is still required.');
  if(discrepancies.length)analysis.score_confidence_reasons.push(discrepancies.length+' second-pass discrepancy'+(discrepancies.length===1?'':'ies')+' require review.');
  if(!scoreExists)analysis.score_confidence_reasons.push('No defensible numeric score is available yet.');

  return Response.json({analysis});
 }catch(error){
  console.error('gradeWorkArtifact failed:',error);
  return Response.json({error:error.message||'Unable to grade this work sample.'},{status:500});
 }
}

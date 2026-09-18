import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from '../../shared/casecueContext.ts';
import { gradeDeterministicRows } from '../../shared/deterministicMath.js';

const SCHEMA={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{student_id:{type:'string'},student_name:{type:'string'},student_match_confidence:{type:'string',enum:['high','medium','low','unmatched']},identity_basis:{type:'string'},pages:{type:'string'},source_pages:{type:'array',items:{type:'number'}},detected_title:{type:'string'},evidence_type:{type:'string'},subject:{type:'string'},skills:{type:'array',items:{type:'string'}},suggested_goal_id:{type:'string'},goal_match_confidence:{type:'string',enum:['high','medium','low','none']},goal_alignment:{type:'string'},goal_skill_overlap:{type:'array',items:{type:'string'}},goal_aligned_items:{type:'array',items:{type:'object',properties:{item:{type:'string'},goal_id:{type:'string'},earned:{type:'number'},possible:{type:'number'},reason:{type:'string'}}}},evidence_strength:{type:'string',enum:['strong','supporting','classroom_only','needs_review']},evidence_strength_reason:{type:'string'},mastery_context:{type:'string'},accommodation_check:{type:'string'},duplicate_fingerprint:{type:'string'},score_earned:{type:'number'},score_possible:{type:'number'},percentage:{type:'number'},scoring_confidence:{type:'string',enum:['high','medium','low','not_scored']},scoring_basis:{type:'string'},scoring_breakdown:{type:'array',items:{type:'object',properties:{label:{type:'string'},problem_text:{type:'string'},student_response:{type:'string'},correct_answer:{type:'string'},earned:{type:'number'},possible:{type:'number'},status:{type:'string'},note:{type:'string'}}}},qualitative_notes:{type:'string'},teacher_observation_draft:{type:'string'},session_activity_draft:{type:'string'},session_quantitative_draft:{type:'string'},session_qualitative_draft:{type:'string'},instructional_next_step:{type:'string'},error_patterns:{type:'array',items:{type:'string'}},strengths_observed:{type:'array',items:{type:'string'}},cautions:{type:'array',items:{type:'string'}}},required:['student_id','student_name','student_match_confidence','identity_basis','detected_title','skills','suggested_goal_id','goal_match_confidence','goal_alignment','goal_skill_overlap','score_earned','score_possible','percentage','scoring_confidence','scoring_basis','scoring_breakdown','qualitative_notes','teacher_observation_draft','session_activity_draft','session_quantitative_draft','session_qualitative_draft','instructional_next_step','error_patterns','strengths_observed','cautions']}}},required:['items']};

const normName=(v='')=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const levenshtein=(a='',b='')=>{const x=normName(a),y=normName(b);const dp=Array.from({length:x.length+1},(_,i)=>[i]);for(let j=1;j<=y.length;j++)dp[0][j]=j;for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++)dp[i][j]=x[i-1]===y[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);return dp[x.length][y.length];};
const nameScore=(visible='',roster='')=>{const a=normName(visible),b=normName(roster);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .95;const at=a.split(' '),bt=b.split(' ');const first=at[0]||'',last=at[at.length-1]||'',rFirst=bt[0]||'',rLast=bt[bt.length-1]||'';const firstOk=first&&rFirst&&(first===rFirst||levenshtein(first,rFirst)<=1),lastOk=last&&rLast&&(last===rLast||levenshtein(last,rLast)<=Math.max(1,Math.floor(rLast.length/5)));if(firstOk&&lastOk)return .9;const dist=levenshtein(a,b),max=Math.max(a.length,b.length);return max?Math.max(0,1-dist/max):0;};
const recomputeFromRows=(rows=[])=>{const usable=(Array.isArray(rows)?rows:[]).filter(r=>Number(r.possible)>0&&Number.isFinite(Number(r.earned))&&!['needs_review','unreadable'].includes(String(r.status||'').toLowerCase()));if(!usable.length)return null;const earned=usable.reduce((n,r)=>n+Number(r.earned||0),0),possible=usable.reduce((n,r)=>n+Number(r.possible||0),0);return possible>0?{earned,possible,percentage:Math.round(earned/possible*1000)/10,count:usable.length}:null;};
const cleanText=(v='')=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\bsvg\b/gi,' ').replace(/\s+/g,' ').trim();
const rosterMentionScore=(x,s)=>{const full=normName(`${s.first_name||''} ${s.last_name||''}`),first=normName(s.first_name||''),last=normName(s.last_name||'');const visible=normName(x.student_name||'');const basis=normName(x.identity_basis||'');const narrative=normName([x.qualitative_notes,x.teacher_observation_draft,x.session_qualitative_draft].join(' '));let score=nameScore(visible,full),reason='';if(score>=.86)reason=`Visible name '${x.student_name}' matches ${full}.`;if(score<.86&&basis){if(full&&basis.includes(full)){score=.94;reason='Identity evidence contains the full roster name.';}else if(first&&last&&basis.includes(first)&&basis.includes(last)){score=.92;reason='Identity evidence contains both roster names.';}else if(first&&basis.includes(first)){score=Math.max(score,.87);reason='Identity evidence contains the roster first name.';}}
if(score<.86&&narrative&&first&&narrative.includes(first)){score=.84;reason='The extracted work summary names the roster student; teacher confirmation is still required.';}return{score,reason};};

export default async function(req){
 try{
  const base44=createClientFromRequest(req); const user=await base44.auth.me(); if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const org=String(user.organization_id||user.data?.organization_id||''); if(!org)return Response.json({error:'Your CaseCue organization could not be verified.'},{status:403});
  const body=await req.json().catch(()=>({})); const fileUri=String(body.file_uri||''); if(!fileUri)return Response.json({error:'A PDF or scanned assignment packet is required.'},{status:400});
  const signed=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:900});
  const [students,goals,sessions]=await Promise.all([
   base44.asServiceRole.entities.Student.filter({organization_id:org},'-updated_date',500),
   base44.asServiceRole.entities.Goal.filter({organization_id:org},'-updated_date',1500),
   base44.asServiceRole.entities.SessionRecord.filter({organization_id:org},'-date',1000)
  ]);
  const roster=students.map(s=>({id:s.id,name:`${s.first_name||''} ${s.last_name||''}`.trim(),grade:s.grade||'',goals:goals.filter(g=>g.student_id===s.id&&g.status!=='archived').map(g=>({id:g.id,area:g.goal_area||'',text:g.goal_text||'',baseline:g.baseline||'',criterion:g.criterion||'',measurement_method:g.measurement_method||''})),recent_sessions:sessions.filter(r=>r.student_id===s.id).slice(0,5).map(r=>({date:r.date,goal_id:r.goal_id||'',activity:r.activity||'',quantitative:r.quantitative||{},qualitative:r.qualitative||''}))}));
  const answerKey=String(body.answer_key||'').slice(0,12000),rubric=String(body.rubric||'').slice(0,12000),directions=String(body.teacher_directions||'').slice(0,6000);
  const scrubUnmatched=(x:any)=>{
    if(x.student_id)return;
    x.suggested_goal_id='';
    x.goal_match_confidence='none';
    x.goal_alignment='Student identity must be confirmed before IEP goal matching.';
    x.goal_skill_overlap=[];
    x.goal_aligned_items=[];
    x.evidence_strength='needs_review';
    x.evidence_strength_reason='Student identity must be confirmed before student-specific evidence can be created.';
    x.mastery_context='Not available until student identity is confirmed.';
    x.teacher_observation_draft='';
    x.session_activity_draft='';
    x.session_quantitative_draft='';
    x.session_qualitative_draft='';
    x.instructional_next_step='';
  };
  const rejectCrossDomainGoal=(x:any)=>{
    if(!x.student_id||!x.suggested_goal_id)return;
    const g=goals.find(v=>v.id===x.suggested_goal_id&&v.student_id===x.student_id); if(!g)return;
    const assignment=String([x.subject,...(x.skills||[]),x.detected_title].join(' ')).toLowerCase();
    const goal=String([g.goal_area,g.goal_text].join(' ')).toLowerCase();
    const math=/math|multiplication|division|fraction|decimal|algebra|geometry|calculation|number/.test(assignment);
    const reading=/reading|fluency|comprehension|phonics|vocabulary/.test(goal);
    const writing=/writing|written expression|paragraph|sentence|composition/.test(goal);
    if(math&&(reading||writing)){x.suggested_goal_id='';x.goal_match_confidence='none';x.goal_alignment='No goal match: the assignment is math work and the suggested goal measures a different academic domain.';x.goal_skill_overlap=[];x.goal_aligned_items=[];x.evidence_strength='classroom_only';}
  };
  const prompt=`${CASECUE_SYSTEM_PROMPT}\n\nYou are CaseCue SmartGrade, a conservative teacher-review scoring engine for scanned special-education student work. Pages may be random and may contain multiple students.\n\nAUTHORIZED CASELOAD, CURRENT IEP GOALS, AND RECENT SESSION CONTEXT:\n${JSON.stringify(roster)}\n\nANSWER KEY: ${answerKey||'not provided'}\nRUBRIC: ${rubric||'not provided'}\nTEACHER DIRECTIONS: ${directions||'not provided'}\n\nWORKFLOW:\n1. IDENTITY: Read the visible student name/identifier on the work. Match ONLY to the authorized roster. student_name MUST contain the exact visible name transcription from the page when a name is readable. identity_basis MUST include the visible name text, for example: 'Visible handwritten name: Brayden Wells'. Never infer identity from handwriting style, disability, skill level, or prior performance. If the visible name uniquely matches a roster student, return that roster student_id even if handwriting quality is imperfect. If genuinely uncertain between roster students, leave student_id empty.\n2. ASSIGNMENT: Identify title, subject, task and observable skills from the actual work. IMPORTANT: return ONE item for EACH distinct physical worksheet/work sample, even when the same student has several sheets in the packet. Only combine pages when they are clearly consecutive pages of the SAME assignment. NEVER combine non-contiguous pages merely because they show the same student, subject, or worksheet title. Put the 1-based page numbers within THIS submitted PDF chunk in source_pages. This is required so CaseCue can file every student's individual sheet into that student's Work Folder.\n3. SCORE: If an answer key/rubric is provided, use it. OBJECTIVE MATH MUST STILL BE GRADED WITHOUT AN ANSWER KEY: for visible deterministic arithmetic or objectively solvable math (addition, subtraction, multiplication, division, fractions, integer operations, simple equations, numeric conversions, etc.), independently solve every clearly visible problem yourself, compare the student's visible answer, and grade it. A teacher key is helpful but is NOT required for deterministic math. Unless another point value is visible, use 1 point per clearly visible problem. A clearly presented unanswered problem may be 0/1. Illegible/cropped/ambiguous problems must be excluded from the verified total and flagged for teacher review instead of guessed. For subjective work without a rubric, do not invent a numeric score. Explain scoring_basis and provide a scoring_breakdown for each visible scorable item where supportable. Every objective-math scoring_breakdown row must include the exact visible problem_text/expression and the student's visible response so CaseCue code can independently recalculate the math.\n4. IEP MATCH: After identifying assignment skills, compare them ONLY against that student's current supplied IEP goals. Match by actual skill/measurement overlap, not merely subject label. Return the strongest genuine goal or none. goal_alignment must explain WHY the assignment is or is not usable evidence for that exact goal. goal_skill_overlap lists the concrete overlapping skills. Never rewrite or invent a goal. NEVER match a math worksheet or math speed drill to a reading-fluency, reading-comprehension, or writing goal merely because both involve speed, accuracy, or fluency. When individual questions/items visibly measure the goal, return goal_aligned_items with item label, earned/possible, goal_id and reason so CaseCue can distinguish the whole assignment score from IEP-aligned evidence. Classify evidence_strength as strong, supporting, classroom_only, or needs_review and explain why; never use a fake quality score. mastery_context must describe what this single sample can and cannot establish relative to the supplied goal criterion/baseline; never declare mastery from one worksheet unless the goal itself supports that conclusion. accommodation_check may identify a relevant supplied accommodation only when it is available in authorized context; otherwise say teacher confirmation is required. Create duplicate_fingerprint from visible student + assignment title + page/content cues for duplicate protection.\n5. SESSION-READY DATA: Prepare drafts that a teacher can use in Session Tracker from this assignment: activity, quantitative result, objective qualitative observation, and next instructional step. Do not claim prompting, service minutes, setting, behavior, independence, or assistance unless visible/provided. Recent sessions are context for continuity only and must never override what today's work shows.\n6. EVIDENCE: strengths_observed and error_patterns must be visible in the work. A general grade is context, not IEP mastery.\n7. SAFETY: Flag illegible pages, uncertain identity, weak goal alignment, missing scoring basis, mixed students, or anything requiring educator judgment. Nothing is final until teacher approval.\n\nReturn one item per detected student assignment using the schema.`;
  const result=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,file_urls:[signed.signed_url],response_json_schema:SCHEMA,model:'automatic'}); const data=typeof result==='object'?result:JSON.parse(result);
  for(const x of data.items||[]){
    x.detected_title=cleanText(x.detected_title||'Student work');
    x.subject=cleanText(x.subject||'');
    x.skills=(x.skills||[]).map(cleanText).filter(Boolean);
    const deterministic=gradeDeterministicRows(x.scoring_breakdown||[]);
    if(deterministic.deterministicCount>0){x.scoring_breakdown=deterministic.rows;x.scoring_basis=`${x.scoring_basis||''} Deterministic math rows were recalculated by CaseCue code.`.trim();}
    const rowTotals=recomputeFromRows(x.scoring_breakdown||[]);
    if(rowTotals){x.score_earned=rowTotals.earned;x.score_possible=rowTotals.possible;x.percentage=rowTotals.percentage;if(deterministic.deterministicCount>0)x.scoring_confidence=deterministic.reviewCount>0?'medium':'high';}
    else if(x.score_possible>0)x.percentage=Math.round((Number(x.score_earned||0)/Number(x.score_possible))*1000)/10;else x.percentage=0;

    const visibleName=String(x.student_name||'').trim();
    const returned=students.find(v=>v.id===x.student_id);
    const ranked=students.map(s=>{const r=rosterMentionScore(x,s);return{s,score:r.score,reason:r.reason}}).sort((a,b)=>b.score-a.score);
    const best=ranked[0],second=ranked[1];
    const uniqueBest=best&&best.score>=.80&&(!second||best.score-second.score>=.06);
    const returnedEval=returned?rosterMentionScore(x,returned):null;
    x.detected_name=visibleName;
    x.probable_student_id=uniqueBest?best.s.id:'';
    x.probable_student_name=uniqueBest?`${best.s.first_name||''} ${best.s.last_name||''}`.trim():'';
    x.identity_match_score=uniqueBest?Math.round(best.score*100):0;
    x.identity_reasons=uniqueBest?[best.reason||`Detected name is closest to ${x.probable_student_name}.`]:[];
    x.identity_status='unmatched';
    const strongDirect=(returned&&returnedEval?.score>=.90)||(uniqueBest&&best.score>=.92);
    const resolved=returned&&returnedEval?.score>=.86?returned:(uniqueBest&&best.score>=.92?best.s:null);
    if(resolved&&strongDirect){
      const rosterName=`${resolved.first_name||''} ${resolved.last_name||''}`.trim();
      x.student_id=resolved.id;x.student_name=visibleName||rosterName;x.student_match_confidence='high';x.identity_status='provisional';x.probable_student_id=resolved.id;x.probable_student_name=rosterName;x.identity_match_score=Math.max(x.identity_match_score,Math.round((returnedEval?.score||best?.score||.92)*100));
    }else if(uniqueBest){
      x.student_id='';x.student_match_confidence=best.score>=.86?'medium':'low';x.identity_status='probable';x.suggested_goal_id='';x.goal_match_confidence='none';
      x.cautions=[...(x.cautions||[]),`Probable roster match: ${x.probable_student_name} (${x.identity_match_score}% name match). Confirm before filing.`];
    }else{
      x.student_id='';x.student_match_confidence='unmatched';x.identity_status='unmatched';x.suggested_goal_id='';x.goal_match_confidence='none';
    }
    const finalizedRows=(x.scoring_breakdown||[]).filter((r:any)=>Number(r.possible)>0&&!['needs_review','unreadable'].includes(String(r.status||'').toLowerCase()));
    const reviewRows=(x.scoring_breakdown||[]).filter((r:any)=>['needs_review','unreadable'].includes(String(r.status||'').toLowerCase()));
    x.score_confidence_reasons=[];
    if(finalizedRows.length)x.score_confidence_reasons.push(`${finalizedRows.length} scorable item${finalizedRows.length===1?'':'s'} mapped.`);
    if(deterministic.deterministicCount>0)x.score_confidence_reasons.push(`${deterministic.deterministicCount} objective math item${deterministic.deterministicCount===1?'':'s'} independently checked.`);
    if(answerKey)x.score_confidence_reasons.push('Teacher answer key supplied.');
    if(rubric)x.score_confidence_reasons.push('Teacher rubric supplied.');
    if(reviewRows.length)x.score_confidence_reasons.push(`${reviewRows.length} item${reviewRows.length===1?'':'s'} still require teacher review.`);
    if(!rowTotals&&Number(x.score_possible)<=0)x.score_confidence_reasons.push('No defensible numeric score is available yet.');
    x.score_attempted=Number(x.score_possible||0);
    const g=goals.find(v=>v.id===x.suggested_goal_id);if(!g||g.student_id!==x.student_id){x.suggested_goal_id='';x.goal_match_confidence='none';}rejectCrossDomainGoal(x);scrubUnmatched(x);}
  return Response.json({items:data.items||[]});
 }catch(error){console.error('analyzeBatchStudentWork failed:',error);return Response.json({error:error.message||'Unable to analyze batch work.'},{status:500});}
}
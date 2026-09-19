import{createClientFromRequest}from'npm:@base44/sdk@0.8.44';
import{CASECUE_SYSTEM_PROMPT}from'../../shared/casecueContext.ts';

const GOAL={type:'object',properties:{
 goal_area:{type:'string'},goal_text:{type:'string'},baseline:{type:'string'},target:{type:'string'},
 condition:{type:'string'},criterion:{type:'string'},measurement_method:{type:'string'},progress_monitoring_method:{type:'string'},
 objectives:{type:'array',items:{type:'string'}},rationale:{type:'string'},confidence:{type:'string',enum:['high','medium','low']}
},required:['goal_area','goal_text','baseline','target','condition','criterion','measurement_method','progress_monitoring_method','objectives','rationale','confidence']};

const SCHEMA={type:'object',properties:{
 overall_summary:{type:'string'},score_summary:{type:'string'},
 strengths:{type:'array',items:{type:'string'}},needs:{type:'array',items:{type:'string'}},
 present_levels_draft:{type:'string'},goal_drafts:{type:'array',items:GOAL},
 progress_monitoring_recommendations:{type:'array',items:{type:'string'}},
 accommodation_observations:{type:'array',items:{type:'string'}},
 teacher_handoff:{type:'string'},cautions:{type:'array',items:{type:'string'}}
},required:['overall_summary','score_summary','strengths','needs','present_levels_draft','goal_drafts','progress_monitoring_recommendations','accommodation_observations','teacher_handoff','cautions']};

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const body=await req.json().catch(()=>({}));
  const studentId=String(body.student_id||''),analysis=body.analysis||{},assessment=body.assessment||null;
  if(!studentId)return Response.json({error:'A student is required.'},{status:400});
  const access=(await base44.entities.ParaStudentAccess.filter({student_id:studentId,active:true},'-updated_at',1))?.[0];
  if(!access)return Response.json({error:'This student is not assigned to your Para account.'},{status:403});
  const earned=Number(analysis.score_earned||0),possible=Number(analysis.score_possible||0);
  if(!Number.isFinite(possible)||possible<=0)return Response.json({error:'A completed scored assessment is required before CaseCue can build a teacher packet.'},{status:400});
  const percentage=Math.round((earned/possible)*1000)/10;
  const evidence={
   student:{first_name:access.first_name||'',last_name:access.last_name||'',grade:access.grade||''},
   approved_support_context:{support_summary:access.support_summary||'',approved_supports:access.approved_supports||[]},
   assessment_template:assessment?{title:assessment.title||'',grade:assessment.grade||'',domains:assessment.domains||[]}:null,
   scored_result:{
    title:analysis.detected_title||assessment?.title||'Baseline assessment',
    earned,possible,percentage,subject:analysis.subject||'',skills:analysis.skills||[],
    question_breakdown:analysis.question_breakdown||[],rubric_breakdown:analysis.rubric_breakdown||[],
    strengths_observed:analysis.strengths_observed||[],error_patterns:analysis.error_patterns||[],
    qualitative_notes:analysis.qualitative_notes||'',cautions:analysis.cautions||[]
   }
  };

  const prompt=`${CASECUE_SYSTEM_PROMPT}

You are CaseCue's Para-to-Teacher Baseline Handoff Engine. A paraprofessional administered or collected a completed instructional baseline and CaseCue has already scored it. Build a concise teacher-ready DRAFT packet from the supplied evidence only.

STRICT RULES:
- Treat the scored assessment facts as evidence, not as an IEP decision.
- Preserve the score exactly: ${earned}/${possible} (${percentage}%).
- Do not diagnose, determine eligibility, recommend placement, prescribe service minutes, or claim a disability caused a weakness.
- Present levels must name the assessment and measurable performance, describe observed strengths/needs, and stay within what this one assessment supports.
- Goal drafts are suggestions for educator/IEP-team review only. Create them only where the scored baseline supports a measurable starting point and a clear instructional need.
- Every goal must include 2-4 measurable short-term objectives/benchmarks that logically move from the baseline toward the suggested annual target.
- Do not invent baseline numbers. Baseline language must come from the supplied score/item evidence.
- Progress-monitoring recommendations should state practical probes/data methods, not legal service requirements.
- Approved supports are context for whether supports were available; do not claim an accommodation was actually used unless the supplied assessment analysis says so.
- If the evidence is too narrow to support a goal, say what additional data the teacher should collect instead of forcing a goal.
- teacher_handoff should read like a Para handing a completed assessment package to the case manager: what was administered, score, key strengths/needs, and what drafts are included.
- Everything is DRAFT FOR EDUCATOR REVIEW.

EVIDENCE:
${JSON.stringify(evidence).slice(0,140000)}

Return JSON matching the schema.`;

  const result=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,model:'automatic',response_json_schema:SCHEMA});
  const packet=typeof result==='object'?result:JSON.parse(result);
  packet.score_summary=`${earned}/${possible} (${percentage}%)`;
  packet.review_status='draft_for_educator_review';
  return Response.json({packet});
 }catch(error){console.error('draftParaBaselinePacket failed',error);return Response.json({error:error?.message||'Unable to build the teacher baseline packet.'},{status:500})}
}

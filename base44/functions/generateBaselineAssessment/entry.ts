import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from '../../shared/casecueContext.ts';

const ITEM={type:'object',properties:{id:{type:'string'},skill:{type:'string'},type:{type:'string',enum:['multiple_choice','short_answer','constructed_response','performance_task']},prompt:{type:'string'},choices:{type:'array',items:{type:'string'}},answer_key:{type:'string'},max_points:{type:'number'},scoring_guidance:{type:'string'}},required:['id','skill','type','prompt','choices','answer_key','max_points','scoring_guidance']};
const DOMAIN={type:'object',properties:{domain:{type:'string'},purpose:{type:'string'},items:{type:'array',items:ITEM}},required:['domain','purpose','items']};
const SCHEMA={type:'object',properties:{title:{type:'string'},grade:{type:'string'},directions:{type:'string'},administration_notes:{type:'array',items:{type:'string'}},domains:{type:'array',items:DOMAIN},disclaimer:{type:'string'}},required:['title','grade','directions','administration_notes','domains','disclaimer']};

export default async function(req){
  try{
    const base44=createClientFromRequest(req); const user=await base44.auth.me(); if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json().catch(()=>({})); const studentId=String(body.student_id||'');
    const requested=Array.isArray(body.domains)?body.domains.filter(Boolean):[]; const itemsPerDomain=Math.max(3,Math.min(12,Number(body.items_per_domain||6)));
    if(!studentId)return Response.json({error:'A student is required.'},{status:400});
    const student=await base44.entities.Student.get(studentId);
    const [docs,goals]=await Promise.all([
      base44.entities.Document.filter({student_id:studentId},'-date_uploaded',40),
      base44.entities.Goal.filter({student_id:studentId},'-updated_date',50)
    ]);
    const processed=(docs||[]).filter(d=>d.extraction_status==='processed'&&d.processing_results).slice(0,8);
    const context={student:{name:`${student.first_name||''} ${student.last_name||''}`.trim(),grade:student.grade||'',strengths:student.strengths||'',areas_of_need:student.areas_of_need||'',present_levels:student.present_levels||''},existing_goals:(goals||[]).filter(g=>g.status!=='met').map(g=>({area:g.goal_area||'',text:g.goal_text||'',baseline:g.baseline||''})),source_summaries:processed.map(d=>({type:d.document_type,filename:d.filename,results:JSON.stringify(d.processing_results).slice(0,9000)}))};
    const domains=requested.length?requested:['Reading','Writing','Math'];
    const prompt=`${CASECUE_SYSTEM_PROMPT}\n\nYou are CaseCue's Baseline Assessment Builder. Create an ORIGINAL educator-administered baseline skill probe for the selected student. This is not a standardized test, diagnosis, eligibility determination, or replacement for formal evaluation.\n\nSELECTED DOMAINS: ${domains.join(', ')}\nITEMS PER DOMAIN: ${itemsPerDomain}\n\nRULES:\n- Build grade-appropriate, classroom-usable items that measure observable academic/functional skills.\n- Use the student's verified record only to choose appropriate skill focus and difficulty. Never reveal disability labels in student-facing prompts.\n- Do not copy copyrighted passages, published test items, commercial benchmark items, or proprietary assessment language. Write all passages/questions originally.\n- Reading may include decoding/word analysis, fluency-ready text, vocabulary, and comprehension. Writing may include conventions, sentence construction, organization, and a short constructed response. Math may include computation, number sense, fractions/decimals, and problem solving appropriate to grade. Executive Function may use teacher-rated/performance tasks rather than pretending internal states can be objectively tested. Social-Emotional/Behavior items must be observational/performance prompts, not mental-health diagnosis. Communication/Functional/Adaptive should only be generated when selected and should remain school-function focused.\n- Each domain must contain exactly ${itemsPerDomain} scorable items unless a performance task logically requires fewer discrete prompts; if so still provide ${itemsPerDomain} rubric-scored prompts.\n- Every item needs a unique stable id, target skill, max_points, answer key or expected response, and explicit scoring guidance.\n- Multiple choice should have 4 plausible choices and one unambiguous correct answer.\n- Constructed response/performance tasks need a simple point rubric with observable criteria.\n- Keep directions concise and teacher-friendly.\n- The assessment should establish a baseline that can later support present-level and annual-goal drafting after the educator scores the student's actual performance.\n\nSTUDENT CONTEXT:\n${JSON.stringify(context).slice(0,120000)}\n\nReturn JSON matching the schema.`;
    const result=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,model:'automatic',response_json_schema:SCHEMA});
    const assessment=typeof result==='object'?result:JSON.parse(result);
    assessment.grade=student.grade||assessment.grade||'';
    assessment.disclaimer='CaseCue baseline probes are educator-created instructional measures, not standardized diagnostic or eligibility instruments. Review all items and scoring before use.';
    return Response.json({assessment});
  }catch(error){console.error('generateBaselineAssessment failed',error);return Response.json({error:error.message||'Unable to generate baseline assessment.'},{status:500});}
}
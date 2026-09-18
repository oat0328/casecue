import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from '../../shared/casecueContext.ts';

const SCHEMA={
 type:'object',
 properties:{
  candidates:{type:'array',items:{type:'object',properties:{
   goal_id:{type:'string'},
   confidence:{type:'string',enum:['high','medium','low']},
   rationale:{type:'string'},
   evidence_strength:{type:'string',enum:['strong','supporting','classroom_only','needs_review']},
   skill_overlap:{type:'array',items:{type:'string'}},
   caution:{type:'string'}
  },required:['goal_id','confidence','rationale','evidence_strength','skill_overlap','caution']}}
 },
 required:['candidates']
};

const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

export default async function(req){
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const organizationId=String(user.organization_id||user.data?.organization_id||'');
  if(!organizationId)return Response.json({error:'Your CaseCue organization could not be verified.'},{status:403});
  const body=await req.json().catch(()=>({}));
  const studentId=String(body.student_id||'');
  if(!studentId)return Response.json({error:'Student confirmation is required before checking IEP evidence.'},{status:400});
  const studentRows=await base44.asServiceRole.entities.Student.filter({id:studentId,organization_id:organizationId},'-updated_date',1);
  const student=studentRows?.[0];
  if(!student)return Response.json({error:'Student not found in your organization.'},{status:404});
  const goals=await base44.asServiceRole.entities.Goal.filter({student_id:studentId,organization_id:organizationId},'-updated_date',100);
  const active=goals.filter(g=>!['archived','met'].includes(String(g.status||'').toLowerCase()));
  if(!active.length)return Response.json({candidates:[]});
  const assignment={
   title:clean(body.title||'Student work'),
   subject:clean(body.subject||''),
   skills:Array.isArray(body.skills)?body.skills.map(clean).filter(Boolean):[],
   score_earned:Number(body.score_earned||0),
   score_possible:Number(body.score_possible||0),
   percentage:Number(body.percentage||0),
   qualitative_notes:clean(body.qualitative_notes||''),
   error_patterns:Array.isArray(body.error_patterns)?body.error_patterns.map(clean).filter(Boolean):[],
   strengths_observed:Array.isArray(body.strengths_observed)?body.strengths_observed.map(clean).filter(Boolean):[],
   teacher_supports:Array.isArray(body.teacher_supports)?body.teacher_supports.map(clean).filter(Boolean):[]
  };
  const goalPayload=active.map(g=>({id:g.id,area:g.goal_area||'',text:g.goal_text||'',baseline:g.baseline||'',target:g.target||'',condition:g.condition||'',criterion:g.criterion||'',measurement_method:g.measurement_method||'',progress_monitoring_method:g.progress_monitoring_method||''}));
  const prompt=[
   CASECUE_SYSTEM_PROMPT,
   '',
   'You are the CaseCue post-approval IEP Evidence Matcher.',
   'The teacher has already confirmed the student and approved the assignment grade. Your only task is to compare this approved classroom work against the student\'s actual active IEP goals.',
   'Never invent, rewrite, broaden, or substitute an IEP goal.',
   '',
   'STUDENT: '+clean((student.first_name||'')+' '+(student.last_name||'')),
   'APPROVED WORK:',
   JSON.stringify(assignment),
   '',
   'ACTIVE IEP GOALS:',
   JSON.stringify(goalPayload),
   '',
   'RULES:',
   '1. Return only genuine skill/measurement matches. Subject alone is not enough.',
   '2. A math assignment must not match a reading or writing goal just because both mention accuracy, fluency, rate, or percentages.',
   '3. Consider whether the assignment task, condition, response type, and measurable skill actually overlap the goal.',
   '4. A classroom worksheet can be supporting evidence without proving mastery. Do not declare goal mastery from one sample.',
   '5. If the work is useful only as classroom context, label evidence_strength classroom_only or needs_review.',
   '6. Rank the strongest candidate first. Return at most 3 candidates. If there is no defensible match, return an empty candidates array.',
   '7. This is a suggestion only. The teacher must explicitly choose whether to add the work as progress evidence.',
   '',
   'Return JSON matching the schema.'
  ].join('\n');
  const result=await base44.asServiceRole.integrations.Core.InvokeLLM({prompt,response_json_schema:SCHEMA,model:'automatic'});
  const data=typeof result==='object'?result:JSON.parse(result);
  const valid=(data.candidates||[]).filter(c=>active.some(g=>g.id===c.goal_id)).slice(0,3);
  return Response.json({candidates:valid});
 }catch(error){
  console.error('suggestGoalEvidence failed:',error);
  return Response.json({error:error.message||'Unable to check IEP evidence.'},{status:500});
 }
}

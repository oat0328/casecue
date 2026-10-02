import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SCHEMA={
 type:'object',
 properties:{
  answer_key:{type:'string'},
  detected_title:{type:'string'},
  subject:{type:'string'},
  score_possible:{type:'number'},
  notes:{type:'string'}
 },
 required:['answer_key','detected_title','subject','score_possible','notes']
};

export default async function(req){
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const organizationId=String(user.organization_id||user.data?.organization_id||'');
  if(!organizationId)return Response.json({error:'Your CaseCue organization could not be verified.'},{status:403});
  const body=await req.json().catch(()=>({}));
  const fileUri=String(body.file_uri||'');
  if(!fileUri)return Response.json({error:'Upload an answer key first.'},{status:400});
  const {signed_url}=await base44.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:900});
  const prompt=[
   'Read this teacher-provided answer key or scoring guide.',
   'Transcribe only answers, scoring directions, point values, assignment title, and subject that are actually visible.',
   'Preserve question/item numbering and answer choices so the result can be used to grade student work.',
   'Do not solve unanswered questions, invent missing answers, or add a rubric that is not on the uploaded key.',
   'If something is unclear, say so in notes instead of guessing.',
   'Return answer_key as concise plain text, one numbered/keyed answer per line when possible.'
  ].join('\n');
  const raw=await base44.integrations.Core.InvokeLLM({prompt,file_urls:[signed_url],response_json_schema:SCHEMA,model:'automatic'});
  const data=typeof raw==='object'?raw:JSON.parse(raw);
  if(!String(data?.answer_key||'').trim())return Response.json({error:'CaseCue could not find readable answers in that file.'},{status:422});
  return Response.json({answer_key:String(data.answer_key).slice(0,12000),detected_title:String(data.detected_title||''),subject:String(data.subject||''),score_possible:Number(data.score_possible||0),notes:String(data.notes||'')});
 }catch(error){
  console.error('extractAnswerKey failed:',error);
  return Response.json({error:error.message||'Unable to read this answer key.'},{status:500});
 }
}
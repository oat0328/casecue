import{createClientFromRequest}from'npm:@base44/sdk@0.8.44';

const SCHEMA={type:'object',properties:{
 document_type:{type:'string'},
 eligibility_categories:{type:'array',items:{type:'string'}},
 documented_disability_or_condition:{type:'array',items:{type:'string'}},
 educational_impact:{type:'array',items:{type:'string'}},
 documented_strengths:{type:'array',items:{type:'string'}},
 documented_needs:{type:'array',items:{type:'string'}},
 present_levels:{type:'array',items:{type:'string'}},
 goals_and_objectives:{type:'array',items:{type:'string'}},
 accommodations:{type:'array',items:{type:'string'}},
 behavior_supports:{type:'array',items:{type:'string'}},
 communication_supports:{type:'array',items:{type:'string'}},
 health_safety_alerts:{type:'array',items:{type:'string'}},
 emergency_actions:{type:'array',items:{type:'string'}},
 services_and_supports:{type:'array',items:{type:'string'}},
 service_delivery_details:{type:'array',items:{type:'string'}},
 classroom_strategies:{type:'array',items:{type:'string'}},
 testing_supports:{type:'array',items:{type:'string'}},
 what_to_do:{type:'array',items:{type:'string'}},
 what_to_avoid:{type:'array',items:{type:'string'}},
 plain_language_summary:{type:'string'},
 source_notes:{type:'array',items:{type:'string'}}
},required:['document_type','eligibility_categories','documented_disability_or_condition','educational_impact','documented_strengths','documented_needs','present_levels','goals_and_objectives','accommodations','behavior_supports','communication_supports','health_safety_alerts','emergency_actions','services_and_supports','service_delivery_details','classroom_strategies','testing_supports','what_to_do','what_to_avoid','plain_language_summary','source_notes']};

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const body=await req.json().catch(()=>({}));
  const studentId=String(body.student_id||''),fileUri=String(body.file_uri||''),filename=String(body.filename||'support-document.pdf'),requestedType=String(body.document_type||'Other');
  if(!studentId||!fileUri)return Response.json({error:'student_id and file_uri are required.'},{status:400});
  const organizationId=String(user?.organization_id||user?.data?.organization_id||'');
  if(!organizationId)return Response.json({error:'Your account is missing an organization.'},{status:400});
  const access=(await base44.entities.ParaStudentAccess.filter({student_id:studentId,active:true},'-updated_at',1))?.[0];
  if(!access)return Response.json({error:'This student is not assigned to your Para account.'},{status:403});

  const now=new Date().toISOString();
  const rec=await base44.entities.ParaSupportDocument.create({
   organization_id:organizationId,para_user_id:user.id,student_id:studentId,document_type:requestedType,filename,file_uri:fileUri,status:'processing',created_at:now,updated_at:now
  });

  try{
   const signed=await base44.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:600});
   const prompt=`You are CaseCue's Para Student Support reader. Read the entire uploaded student support document and create a day-to-day support brief for an authorized paraprofessional assigned to this student.

The source may be an IEP, BIP, 504 plan, health plan, medical report, FBA, evaluation, or related school record.

STRICT EVIDENCE RULES:
- Use ONLY information explicitly stated in the uploaded document.
- Never infer a diagnosis, disability, health condition, medication, behavior function, eligibility, accommodation, emergency action, or service that the record does not explicitly document.
- Keep IDEA eligibility/disability categories separate from medical diagnoses/conditions.
- If a medical or health condition is documented, state it exactly enough for safe school support, but do not invent medical advice.
- Health/safety alerts and emergency actions must be copied or closely paraphrased from explicit school/medical-plan directions. If no emergency direction is present, do not make one up.
- Extract documented strengths, needs, present levels/current performance, and current goals/objectives when explicitly present. Keep goal wording close enough to the source to preserve meaning, but summarize long legal text for day-to-day Para use.
- Accommodations should include classroom, testing, timing, setting, presentation, response, organization, communication, sensory, and other explicitly documented supports.
- Behavior supports should capture antecedent/prevention strategies, reinforcement, prompting/redirection, replacement behavior supports, crisis/safety directions, and staff response steps only when explicitly documented.
- what_to_do should translate explicit school directions into concise Para action steps without changing their meaning.
- what_to_avoid should only contain explicit restrictions, prohibited responses, known triggers, contraindications, or clearly stated practices to avoid.
- services_and_supports may summarize related services/supports only when they are stated. service_delivery_details should capture explicit frequency, minutes, setting, group/individual delivery, and provider role when stated. Do not invent service minutes or change placement.
- classroom_strategies should surface explicit instructional strategies, prompting hierarchy, visual supports, chunking, repetition, reinforcement, organizational supports, or other implementation directions the Para can actually use.
- plain_language_summary should help a Para understand the student across the school day without pretending this replaces the original document or case-manager directions.
- source_notes should identify uncertainties, unreadable sections, conflicting directions, expired/unclear dates, or items that require case-manager clarification.
- Do not expose unrelated family history, financial information, or sensitive details that are not necessary to implement school support.

Requested document type from uploader: ${requestedType}.
Return JSON only.`;
   const result=await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls:[signed.signed_url],
    response_json_schema:SCHEMA,
    model:'automatic'
   });
   const parsed=typeof result==='object'?result:JSON.parse(result);
   await base44.entities.ParaSupportDocument.update(rec.id,{...parsed,document_type:requestedType==='Other'?(parsed.document_type||'Other'):requestedType,status:'ready',updated_at:new Date().toISOString()});
   return Response.json({ok:true,document_id:rec.id,brief:{...parsed,document_type:requestedType==='Other'?(parsed.document_type||'Other'):requestedType}});
  }catch(error){
   await base44.entities.ParaSupportDocument.update(rec.id,{status:'failed',source_notes:[String(error?.message||'Unable to read document')],updated_at:new Date().toISOString()});
   throw error;
  }
 }catch(error){console.error('processParaSupportDocument failed',error);return Response.json({error:error?.message||'Could not process support document.'},{status:500})}
}

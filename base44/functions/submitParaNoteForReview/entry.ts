import{createClientFromRequest}from'npm:@base44/sdk@0.8.44';
export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const body=await req.json(),noteId=String(body.note_id||'');
  if(!noteId)return Response.json({error:'note_id is required.'},{status:400});
  const note=await base44.asServiceRole.entities.ParaNote.get(noteId);
  if(!note||String(note.para_user_id||'')!==String(user.id))return Response.json({error:'You can only submit your own Para observation.'},{status:403});
  const assignment=(await base44.asServiceRole.entities.ParaAssignment.filter({para_user_id:user.id,student_id:note.student_id,active:true},'-assigned_at',1))?.[0];
  if(!assignment?.case_manager_user_id)return Response.json({error:'No case manager is assigned to this student/Para relationship yet. Ask the school administrator or case manager to assign the student first.'},{status:422});
  await base44.asServiceRole.entities.ParaNote.update(noteId,{reviewer_user_id:assignment.case_manager_user_id,review_status:'submitted',submitted_at:new Date().toISOString()});
  return Response.json({ok:true,reviewer_user_id:assignment.case_manager_user_id});
 }catch(error){return Response.json({error:error?.message||'Could not submit the Para observation.'},{status:500})}
}

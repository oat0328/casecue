import{createClientFromRequest}from'npm:@base44/sdk@0.8.44';

const dataOf=u=>u?.data||u||{};
const workspaces=u=>{const d=dataOf(u),v=u?.workspaces||d?.workspaces;return Array.isArray(v)?v:[]};
const roleText=u=>String(u?.onboarding?.role||u?.data?.onboarding?.role||'').toLowerCase();
const isSpedReviewer=u=>u?.role==='admin'||workspaces(u).includes('sped')||String(u?.active_workspace||u?.data?.active_workspace||'')==='sped'||/special education|case manager/.test(roleText(u));
const isParaAccount=u=>workspaces(u).includes('para')||String(u?.active_workspace||u?.data?.active_workspace||'')==='para'||/para|paraprofessional/.test(roleText(u));
const orgOf=u=>String(u?.organization_id||u?.data?.organization_id||'');

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  if(!isSpedReviewer(user))return Response.json({error:'Only an authorized SPED case manager or administrator can assign Para student access.'},{status:403});
  const body=await req.json(),paraUserId=String(body.para_user_id||''),studentId=String(body.student_id||''),active=body.active!==false;
  if(!paraUserId||!studentId)return Response.json({error:'para_user_id and student_id are required.'},{status:400});
  const org=orgOf(user);if(!org)return Response.json({error:'Your account is missing an organization.'},{status:400});
  const [paraUser,student]=await Promise.all([
   base44.asServiceRole.entities.User.get(paraUserId),
   base44.asServiceRole.entities.Student.get(studentId)
  ]);
  if(!paraUser||!isParaAccount(paraUser)||orgOf(paraUser)!==org)return Response.json({error:'That account is not an authorized Para account in your organization.'},{status:403});
  if(!student||String(student.organization_id||'')!==org)return Response.json({error:'That student is not in your organization.'},{status:403});

  const existing=(await base44.asServiceRole.entities.ParaAssignment.filter({para_user_id:paraUserId,student_id:studentId},'-assigned_at',1))?.[0];
  const supportSummary=String(body.support_summary??existing?.support_summary??'');
  const approvedSupports=Array.isArray(body.approved_supports)?body.approved_supports.map(String).map(x=>x.trim()).filter(Boolean):Array.isArray(existing?.approved_supports)?existing.approved_supports:[];
  const assignmentPayload={organization_id:org,para_user_id:paraUserId,student_id:studentId,active,support_summary:supportSummary,approved_supports:approvedSupports,assigned_by:user.id,case_manager_user_id:user.id,assigned_at:existing?.assigned_at||new Date().toISOString()};
  const assignment=existing
   ?await base44.asServiceRole.entities.ParaAssignment.update(existing.id,assignmentPayload)
   :await base44.asServiceRole.entities.ParaAssignment.create(assignmentPayload);

  const currentAccess=(await base44.asServiceRole.entities.ParaStudentAccess.filter({para_user_id:paraUserId,student_id:studentId},'-updated_at',1))?.[0];
  const accessPayload={organization_id:org,para_user_id:paraUserId,student_id:studentId,first_name:student.first_name||'',last_name:student.last_name||'',grade:String(student.grade||''),support_summary:supportSummary,approved_supports:approvedSupports,active,source_assignment_id:assignment.id,case_manager_user_id:user.id,source_kind:'school_assignment',updated_at:new Date().toISOString()};
  if(currentAccess)await base44.asServiceRole.entities.ParaStudentAccess.update(currentAccess.id,accessPayload);
  else await base44.asServiceRole.entities.ParaStudentAccess.create(accessPayload);

  return Response.json({ok:true,assignment_id:assignment.id,active,support_summary:supportSummary,approved_supports:approvedSupports});
 }catch(error){return Response.json({error:error?.message||'Could not update Para student access.'},{status:500})}
}

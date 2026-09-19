import{createClientFromRequest}from'npm:@base44/sdk@0.8.44';

const orgOf=u=>String(u?.organization_id||u?.data?.organization_id||'');
const workspaces=u=>{const v=u?.workspaces||u?.data?.workspaces;return Array.isArray(v)?v:[]};

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  const allowed=workspaces(user).includes('para')||String(user?.active_workspace||user?.data?.active_workspace||'')==='para'||user?.role==='admin';
  if(!allowed)return Response.json({error:'Para workspace access is required.'},{status:403});
  const org=orgOf(user);if(!org)return Response.json({error:'Your account is missing an organization.'},{status:400});

  const access=await base44.asServiceRole.entities.ParaStudentAccess.filter({para_user_id:user.id},'-updated_at',500);
  const demoAccess=(access||[]).filter(x=>String(x.support_summary||'').startsWith('DEMO'));
  const ids=[...new Set(demoAccess.map(x=>x.student_id).filter(Boolean))];
  const counts={students:0,access:0,schedule:0,baselines:0,notes:0,work:0,grades:0,assignments:0};

  const schedule=await base44.asServiceRole.entities.ParaScheduleBlock.filter({para_user_id:user.id},'-updated_at',500);
  for(const row of schedule||[])if(/^\s*DEMO\b/i.test(String(row.notes||''))){await base44.asServiceRole.entities.ParaScheduleBlock.delete(row.id);counts.schedule++}

  for(const row of demoAccess){await base44.asServiceRole.entities.ParaStudentAccess.delete(row.id);counts.access++}

  for(const studentId of ids){
   const [baselines,notes,work,grades,assignments,studentRows]=await Promise.all([
    base44.asServiceRole.entities.BaselineAssessment.filter({student_id:studentId},'-created_date',500),
    base44.asServiceRole.entities.ParaNote.filter({student_id:studentId,para_user_id:user.id},'-date',500),
    base44.asServiceRole.entities.WorkEvidence.filter({student_id:studentId},'-date',500),
    base44.asServiceRole.entities.GradebookAssignment.filter({student_id:studentId},'-date',500),
    base44.asServiceRole.entities.ParaAssignment.filter({student_id:studentId,para_user_id:user.id},'-assigned_at',500),
    base44.asServiceRole.entities.Student.filter({id:studentId},'-created_date',1)
   ]);
   for(const r of baselines||[]){if(String(r.title||'').startsWith('DEMO')||String(r.assessment?.disclaimer||'').includes('DEMO')){await base44.asServiceRole.entities.BaselineAssessment.delete(r.id);counts.baselines++}}
   for(const r of notes||[]){if(/DEMO|Baseline assessment package/i.test(String(r.activity||'')+' '+String(r.objective_observation||''))){await base44.asServiceRole.entities.ParaNote.delete(r.id);counts.notes++}}
   for(const r of work||[]){if(/DEMO|Para Assessment Package/i.test(String(r.title||'')+' '+String(r.source||''))){await base44.asServiceRole.entities.WorkEvidence.delete(r.id);counts.work++}}
   for(const r of grades||[]){if(/DEMO/i.test(String(r.title||'')+' '+String(r.notes||''))){await base44.asServiceRole.entities.GradebookAssignment.delete(r.id);counts.grades++}}
   for(const r of assignments||[]){await base44.asServiceRole.entities.ParaAssignment.delete(r.id);counts.assignments++}
   const st=studentRows?.[0];
   if(st&&String(st.organization_id||'')===org&&/PARA DEMO/i.test(String(st.notes||''))){await base44.asServiceRole.entities.Student.delete(st.id);counts.students++}
  }

  return Response.json({ok:true,counts});
 }catch(error){console.error('clearParaDemoData failed',error);return Response.json({error:error?.message||'Could not clear Para demo data.'},{status:500})}
}

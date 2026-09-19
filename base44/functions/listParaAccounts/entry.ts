import{createClientFromRequest}from'npm:@base44/sdk@0.8.44';
const d=u=>u?.data||u||{};
const ws=u=>{const x=u?.workspaces||d(u)?.workspaces;return Array.isArray(x)?x:[]};
const org=u=>String(u?.organization_id||u?.data?.organization_id||'');
const role=u=>String(u?.onboarding?.role||u?.data?.onboarding?.role||'').toLowerCase();
const isSped=u=>u?.role==='admin'||ws(u).includes('sped')||String(u?.active_workspace||u?.data?.active_workspace||'')==='sped'||/special education|case manager/.test(role(u));
const isPara=u=>ws(u).includes('para')||String(u?.active_workspace||u?.data?.active_workspace||'')==='para'||/para|paraprofessional/.test(role(u));
export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Unauthorized'},{status:401});
  if(!isSped(user))return Response.json({error:'Only authorized SPED staff can view Para accounts for assignment.'},{status:403});
  const organizationId=org(user);if(!organizationId)return Response.json({accounts:[]});
  const users=await base44.asServiceRole.entities.User.list('-created_date',500);
  const accounts=(users||[]).filter(u=>org(u)===organizationId&&isPara(u)&&u.disabled!==true).map(u=>({id:u.id,email:u.email||'',full_name:u.full_name||u.name||u.email||'Para account'}));
  return Response.json({accounts});
 }catch(error){return Response.json({error:error?.message||'Could not load Para accounts.'},{status:500})}
}

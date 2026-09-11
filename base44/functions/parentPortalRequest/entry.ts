import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const enc = new TextEncoder();
function bytesToHex(bytes){return Array.from(bytes).map((b)=>b.toString(16).padStart(2,'0')).join('');}
async function sha256(value){return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))));}

export default async function(req){
  try{
    const base44=createClientFromRequest(req);
    const body=await req.json().catch(()=>({}));
    const token=String(body.token||'').trim();
    const requestType=['acknowledgment','question','meeting_request','resource_request','update_request'].includes(body.request_type)?body.request_type:'question';
    const message=String(body.message||'').trim().slice(0,2000);
    if(!token||token.length<40)return Response.json({error:'Invalid or expired link.'},{status:404});
    const hash=await sha256(token); const svc=base44.asServiceRole;
    const shares=await svc.entities.ParentShare.filter({token_hash:hash},'-created_date',1); const share=(shares||[])[0];
    if(!share||share.status!=='active'||!share.expires_at||new Date(share.expires_at)<=new Date())return Response.json({error:'This family link is invalid, expired, or revoked.'},{status:404});
    if(requestType!=='acknowledgment'&&!message)return Response.json({error:'Enter a message before sending.'},{status:400});
    const rec=await svc.entities.FamilyRequest.create({student_id:share.student_id,organization_id:share.organization_id,parent_share_id:share.id,request_type:requestType,message:requestType==='acknowledgment'?(message||'Family acknowledged reviewing the shared CaseCue Family View.'):message,status:'new',submitted_at:new Date().toISOString()});
    await svc.entities.AuditLog.create({action:'family_request_submitted',entity_type:'FamilyRequest',entity_id:rec.id,details:`Family View ${requestType} submitted through active share.`});
    return Response.json({ok:true,request_id:rec.id});
  }catch(error){console.error('parentPortalRequest failed:',error);return Response.json({error:'Unable to submit this family request.'},{status:500});}
}

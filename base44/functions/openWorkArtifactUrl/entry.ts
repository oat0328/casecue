import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const normalizePages=(artifact:any,total:number)=>{
  const pages=(artifact.source_pages||[]).map((n:any)=>Number(n)).filter((n:number)=>Number.isInteger(n)&&n>0);
  const key=String(artifact.artifact_key||'');
  const start=Number(key.split('-')[0]||1);
  const end=Math.min(total,start+24);
  if(!pages.length)return [];
  const corrected=pages.map((p:number)=>{
    if(p>=start&&p<=end)return p;
    const candidate=p-(start-1);
    if(candidate>=start&&candidate<=end)return candidate;
    if(p>=1&&p<=total)return p;
    if(candidate>=1&&candidate<=total)return candidate;
    return NaN;
  }).filter((n:number)=>Number.isInteger(n)&&n>=1&&n<=total);
  return [...new Set(corrected)];
};

export default async function(req:any){
  try{
    const base44=createClientFromRequest(req);
    const user=await base44.auth.me();
    if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const organizationId=String(user.organization_id||user.data?.organization_id||'');
    if(!organizationId)return Response.json({error:'Your account is not linked to an organization.'},{status:403});
    const body=await req.json().catch(()=>({}));
    const artifactId=String(body.artifact_id||'');
    if(!artifactId)return Response.json({error:'Work artifact is required.'},{status:400});
    const artifact=await base44.entities.WorkArtifact.get(artifactId);
    if(!artifact||String(artifact.organization_id||'')!==organizationId)return Response.json({error:'Work artifact not found.'},{status:404});

    let fileUri=String(artifact.artifact_file_uri||'');
    let correctedPages=(artifact.source_pages||[]).map((n:any)=>Number(n)).filter((n:number)=>Number.isInteger(n)&&n>0);
    let repaired=false;

    if(!fileUri){
      const sourceUri=String(artifact.source_file_uri||'');
      if(!sourceUri)throw new Error('The original packet is no longer attached to this work sample.');
      const signed=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:sourceUri,expires_in:900});
      const res=await fetch(signed.signed_url);
      if(!res.ok)throw new Error('The original packet could not be opened.');
      const src=await PDFDocument.load(await res.arrayBuffer(),{ignoreEncryption:true});
      correctedPages=normalizePages(artifact,src.getPageCount());
      if(!correctedPages.length)throw new Error('CaseCue could not safely recover the source page numbers for this work sample.');
      const out=await PDFDocument.create();
      const copied=await out.copyPages(src,correctedPages.map((n:number)=>n-1));
      copied.forEach((p:any)=>out.addPage(p));
      const bytes=await out.save({useObjectStreams:true});
      const safe=String(artifact.assignment_title||'student-work').replace(/[^a-z0-9-_]+/gi,'-').slice(0,70);
      const file=new File([bytes],`artifact-${artifact.id}-${safe}.pdf`,{type:'application/pdf'});
      const uploaded=await base44.asServiceRole.integrations.Core.UploadPrivateFile({file});
      fileUri=String(uploaded.file_uri||'');
      if(!fileUri)throw new Error('The recovered worksheet could not be stored.');
      repaired=true;
      await base44.asServiceRole.entities.WorkArtifact.update(artifact.id,{artifact_file_uri:fileUri,source_pages:correctedPages,updated_at:new Date().toISOString()});

      if(artifact.batch_run_id){
        const run=await base44.asServiceRole.entities.SmartStackRun.get(artifact.batch_run_id).catch(()=>null);
        if(run&&String(run.organization_id||'')===organizationId){
          const results=(run.results||[]).map((x:any)=>{
            if(String(x._key||'')!==String(artifact.artifact_key||''))return x;
            return {...x,source_pages:correctedPages,pages:`Source page${correctedPages.length===1?'':'s'} ${correctedPages.join(', ')}`,evidence_file_uri:fileUri};
          });
          await base44.asServiceRole.entities.SmartStackRun.update(run.id,{results}).catch(()=>{});
        }
      }
    }

    if(String(fileUri).startsWith('http'))return Response.json({signed_url:fileUri,repaired,corrected_source_pages:correctedPages,artifact_file_uri:fileUri});
    const {signed_url}=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:3600});
    return Response.json({signed_url,repaired,corrected_source_pages:correctedPages,artifact_file_uri:fileUri});
  }catch(error:any){
    console.error('openWorkArtifactUrl failed:',error);
    return Response.json({error:error.message||'Could not open work artifact.'},{status:500});
  }
}

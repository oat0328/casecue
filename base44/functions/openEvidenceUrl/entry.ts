import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const parseAbsolutePages=(label='')=>{
  const s=String(label||'');
  const ranged=s.match(/Source pages\s+(\d+)\s*-\s*(\d+)\s*;\s*([\d,\s]+)/i);
  if(ranged){
    const start=Number(ranged[1]);
    return ranged[3].split(',').map(v=>Number(v.trim())).filter(Number.isFinite).map(local=>start+local-1);
  }
  const list=s.match(/Source pages?\s+([\d,\s]+)/i);
  if(list)return list[1].split(',').map(v=>Number(v.trim())).filter(Number.isFinite);
  return [];
};

async function repairMissingFile(base44:any,evidence:any,organizationId:string){
  if(!organizationId||String(evidence?.organization_id||'')!==organizationId)throw new Error('Evidence is outside your organization.');
  const runs=await base44.asServiceRole.entities.SmartStackRun.filter({organization_id:organizationId},'-created_date',100);
  const fp=evidence?.analysis?.duplicate_fingerprint||evidence?.duplicate_fingerprint||'';
  let matchRun:any=null,matchResult:any=null;
  for(const run of runs||[]){
    for(const result of run.results||[]){
      const sameFp=fp&&result.duplicate_fingerprint===fp;
      const sameStudent=result.student_id&&result.student_id===evidence.student_id;
      const sameTitle=String(result.detected_title||'').trim()===String(evidence.title||'').trim();
      if(sameFp||(sameStudent&&sameTitle)) {matchRun=run;matchResult=result;break;}
    }
    if(matchRun)break;
  }
  if(!matchRun?.file_uri||!matchResult)throw new Error('The original scan source could not be matched safely.');
  const pages=(matchResult.source_pages?.length?matchResult.source_pages:parseAbsolutePages(matchResult.pages)).map((n:number)=>Number(n)).filter((n:number)=>Number.isInteger(n)&&n>0);
  if(!pages.length)throw new Error('The original worksheet page numbers could not be verified.');
  const signed=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:matchRun.file_uri,expires_in:900});
  const res=await fetch(signed.signed_url);
  if(!res.ok)throw new Error('The original scan could not be read.');
  const src=await PDFDocument.load(await res.arrayBuffer(),{ignoreEncryption:true});
  const indexes=[...new Set(pages.map((n:number)=>n-1).filter((n:number)=>n>=0&&n<src.getPageCount()))];
  if(!indexes.length)throw new Error('The verified source pages were outside the original scan.');
  const out=await PDFDocument.create();
  const copied=await out.copyPages(src,indexes);copied.forEach(p=>out.addPage(p));
  const bytes=await out.save({useObjectStreams:true});
  const safeTitle=String(evidence.title||'work').replace(/[^a-z0-9-_]+/gi,'-').slice(0,70);
  const file=new File([bytes],`recovered-${evidence.student_id}-${safeTitle}.pdf`,{type:'application/pdf'});
  const uploaded=await base44.asServiceRole.integrations.Core.UploadPrivateFile({file});
  const fileUri=uploaded.file_uri||'';
  if(!fileUri)throw new Error('Recovered worksheet could not be stored.');
  await base44.asServiceRole.entities.WorkEvidence.update(evidence.id,{file_url:fileUri,source_pages:pages,scan_run_id:matchRun.id});
  const repairRows=await base44.asServiceRole.entities.EvidenceRepairQueue.filter({work_evidence_id:evidence.id},'-created_date',10).catch(()=>[]);
  for(const row of repairRows||[])await base44.asServiceRole.entities.EvidenceRepairQueue.update(row.id,{status:'resolved'}).catch(()=>{});
  return fileUri;
}

export default async function(req:any) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.evidence_id) return Response.json({ error: 'Evidence is required.' }, { status: 400 });
    const organizationId=String(user.organization_id||user.data?.organization_id||'');
    if(!organizationId)return Response.json({error:'Your account is not linked to an organization.'},{status:403});
    let evidence = await base44.entities.WorkEvidence.get(body.evidence_id);
    if (!evidence) return Response.json({ error: 'Evidence not found.' }, { status: 404 });
    if(String(evidence.organization_id||'')!==organizationId)return Response.json({error:'Evidence not found.'},{status:404});
    let fileUri=evidence.file_url||'';
    if(!fileUri)fileUri=await repairMissingFile(base44,evidence,organizationId);
    if (String(fileUri).startsWith('http')) return Response.json({ signed_url: fileUri, repaired:!evidence.file_url });
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:3600});
    return Response.json({ signed_url, repaired:!evidence.file_url });
  } catch (error:any) {
    console.error('openEvidenceUrl failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

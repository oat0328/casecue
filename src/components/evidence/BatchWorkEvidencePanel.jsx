import React,{useRef,useState}from'react';
import{UploadCloud,Loader2,History,FileStack,Trash2,CheckCircle2,Save}from'lucide-react';
import{PDFDocument}from'pdf-lib';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';
import{Textarea}from'@/components/ui/textarea';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{todayISO}from'@/lib/dateUtils';
import BatchStagingBoard from'@/components/evidence/BatchStagingBoard';
import BatchDecisionQueue from'@/components/evidence/BatchDecisionQueue';
import BatchIepEvidenceReview from'@/components/evidence/BatchIepEvidenceReview';

const CHUNK_PAGES=25;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cleanText=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\bsvg\b/gi,' ').replace(/\s+/g,' ').trim();
const isDuplicate=x=>!!x.duplicate_of_evidence_id||x.duplicate_status==='duplicate';
const hasSupportedScore=x=>Number(x.score_possible)>0&&Number.isFinite(Number(x.score_earned));
const canApprove=x=>!!x.student_id&&!isDuplicate(x)&&hasSupportedScore(x)&&!['not_scored','low'].includes(String(x.scoring_confidence||'').toLowerCase());
const pageGroups=pages=>{const nums=[...new Set((pages||[]).map(Number).filter(Number.isFinite))].sort((a,b)=>a-b),groups=[];for(const n of nums){const g=groups[groups.length-1];if(!g||n!==g[g.length-1]+1)groups.push([n]);else g.push(n);}return groups;};
const looksMixed=x=>{const s=String([x.detected_title,x.subject,...(x.skills||[])].join(' ')).toLowerCase(),math=/math|multiplication|division|fraction|decimal|number|algebra|geometry/.test(s),write=/writing|narrative|opinion|argument|story|paragraph/.test(s),read=/reading|fluency|comprehension|phonics|vocabulary/.test(s);return(math&&write)||(math&&read)||(write&&read);};
const fingerprintFor=x=>[x.student_id||'',cleanText(x.detected_title).toLowerCase(),(x.source_pages||[]).join('-'),Number(x.score_possible||0)].join('|');

export default function BatchWorkEvidencePanel({students=[],goals=[],onSaved,v2=false,batchMode='guided',workspaceKey='sped'}){
 const isPara=workspaceKey==='para';
 const {toast}=useToast();
 const inputRef=useRef(null);
 const [file,setFile]=useState(null);
 const [fileUri,setFileUri]=useState('');
 const [items,setItems]=useState([]);
 const [busy,setBusy]=useState(false);
 const [saving,setSaving]=useState(false);
 const [drag,setDrag]=useState(false);
 const [answerKey,setAnswerKey]=useState('');
 const [rubric,setRubric]=useState('');
 const [assignmentTitle,setAssignmentTitle]=useState('');
 const [assignmentSubject,setAssignmentSubject]=useState('');
 const [progress,setProgress]=useState(null);
 const [runId,setRunId]=useState('');
 const [flowStep,setFlowStep]=useState('setup');
 const {data:runs,refetch:refetchRuns}=useAsync(async()=>{if(isPara){const u=await base44.auth.me();return base44.entities.SmartStackRun.filter({user_id:u.id},'-created_date',30)}return base44.entities.SmartStackRun.list('-created_date',30)},[isPara]);
 const {data:answerKeys,refetch:refetchAnswerKeys}=useAsync(()=>base44.entities.AnswerKeyTemplate.list('-updated_date',100),[]);
 const saveAnswerKey=async()=>{if(!cleanText(assignmentTitle)||!cleanText(answerKey))return toast({title:'Add the assignment name and answer key first',variant:'destructive'});try{const user=await base44.auth.me(),organization_id=user?.organization_id||user?.data?.organization_id||'';await base44.entities.AnswerKeyTemplate.create({organization_id,user_id:user.id,title:cleanText(assignmentTitle),subject:cleanText(assignmentSubject),assignment_type:'assignment',score_possible:0,answer_key:answerKey.trim(),rubric:rubric||'',teacher_directions:'',last_used_at:new Date().toISOString()});await refetchAnswerKeys();toast({title:'Answer key saved'})}catch(e){toast({title:'Could not save answer key',description:e.message,variant:'destructive'})}};
 const loadAnswerKey=id=>{const k=(answerKeys||[]).find(x=>x.id===id);if(!k)return;setAssignmentTitle(k.title||'');setAssignmentSubject(k.subject||'');setAnswerKey(k.answer_key||'');setRubric(k.rubric||'');toast({title:'Answer key preloaded'})};

 const studentName=id=>{const s=students.find(x=>x.id===id);return s?(String(s.first_name||'')+' '+String(s.last_name||'')).trim():'Unmatched student'};
 const update=(i,p)=>setItems(v=>v.map((x,n)=>{if(n!==i)return x;const next={...x,...p};if(Object.prototype.hasOwnProperty.call(p,'score_earned')||Object.prototype.hasOwnProperty.call(p,'score_possible')){const earned=Number(next.score_earned||0),possible=Number(next.score_possible||0);next.percentage=possible>0?Math.round(earned/possible*1000)/10:0;}return next;}));
 const choose=f=>{if(!f)return;if(!/pdf|image/i.test(f.type)&&!/[.](pdf|png|jpe?g|webp)$/i.test(f.name)){toast({title:'Use a PDF or scanned image',variant:'destructive'});return;}setFile(f);setFileUri('');setItems([]);setRunId('');setProgress(null);setFlowStep('setup');};
 const removeUpload=()=>{setFile(null);setFileUri('');setItems([]);setRunId('');setProgress(null);setFlowStep('setup');if(inputRef.current)inputRef.current.value='';toast({title:'Upload removed'})};

 const prepareStack=async f=>{if(!/\.pdf$/i.test(f.name))return{src:null,total:1,chunks:[{start:1,end:1,total:1}]};const src=await PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true}),total=src.getPageCount(),chunks=[];for(let start=0;start<total;start+=CHUNK_PAGES){const end=Math.min(total,start+CHUNK_PAGES);chunks.push({start:start+1,end,total});}return{src,total,chunks};};
 const makeChunkFile=async(src,originalName,start,end)=>{const out=await PDFDocument.create(),indexes=Array.from({length:end-start+1},(_,i)=>start-1+i),pages=await out.copyPages(src,indexes);pages.forEach(p=>out.addPage(p));const bytes=await out.save({useObjectStreams:true});return new File([bytes],originalName.replace(/\.pdf$/i,'')+'-pages-'+start+'-'+end+'.pdf',{type:'application/pdf'});};
 const extractArtifact=async(src,x,name)=>{if(!src||!(x.source_pages||[]).length)return'';const indexes=[...new Set(x.source_pages.map(n=>Number(n)-1).filter(n=>Number.isInteger(n)&&n>=0&&n<src.getPageCount()))];if(!indexes.length)return'';const out=await PDFDocument.create(),pages=await out.copyPages(src,indexes);pages.forEach(p=>out.addPage(p));const bytes=await out.save({useObjectStreams:true}),sheet=new File([bytes],name,{type:'application/pdf'}),uploaded=await base44.integrations.Core.UploadPrivateFile({file:sheet});return uploaded.file_uri||'';};
 const openEvidence=async x=>{try{if(x.work_evidence_id){const r=await base44.functions.invoke('openEvidenceUrl',{evidence_id:x.work_evidence_id});const u=r?.data?.signed_url||r?.signed_url;if(u){window.open(u,'_blank','noopener,noreferrer');return;}}if(x.artifact_id){const r=await base44.functions.invoke('openWorkArtifactUrl',{artifact_id:x.artifact_id});const s=r?.data||r;if(s?.signed_url){if(s.repaired||s.corrected_source_pages?.length){setItems(v=>v.map(row=>row._key===x._key?{...row,evidence_file_uri:s.artifact_file_uri||row.evidence_file_uri,source_pages:s.corrected_source_pages||row.source_pages,pages:s.corrected_source_pages?.length?('Source page'+(s.corrected_source_pages.length===1?' ':'s ')+s.corrected_source_pages.join(', ')):row.pages}:row));}window.open(s.signed_url,'_blank','noopener,noreferrer');return;}}if(x.evidence_file_uri){const r=await base44.functions.invoke('openPrivateFileUrl',{file_uri:x.evidence_file_uri});const s=r?.data||r;if(s?.signed_url){window.open(s.signed_url,'_blank','noopener,noreferrer');return;}}if(file){const u=URL.createObjectURL(file);window.open(u,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(u),60000);return;}throw new Error('No viewable work file is attached.');}catch(e){toast({title:'Could not open work',description:e?.response?.data?.error||e.message,variant:'destructive'});}};

 const confirmStudent=async(i,x,studentId=x.probable_student_id)=>{if(!studentId)return;const patch={student_id:studentId,student_match_confidence:'teacher_confirmed',identity_status:'teacher_confirmed',probable_student_id:studentId,probable_student_name:studentName(studentId),identity_match_score:100,approved:false};update(i,patch);if(x.artifact_id)await base44.entities.WorkArtifact.update(x.artifact_id,{student_id:studentId,probable_student_id:studentId,probable_student_name:studentName(studentId),identity_match_score:100,identity_status:'teacher_confirmed',updated_at:new Date().toISOString()});};

 const stagePacket=async()=>{
  if(!file)return;
  if(batchMode==='guided'&&!cleanText(assignmentTitle))return toast({title:'Add the assignment name first',description:'Guided Batch works best when CaseCue knows exactly what every paper is.',variant:'destructive'});
  setBusy(true);setItems([]);setProgress({stage:'Preparing packet…',pages:0,totalPages:0});
  let job=null;
  try{
   const user=await base44.auth.me(),organizationId=user?.organization_id||user?.data?.organization_id||'';
   if(!organizationId)throw new Error('Your account is missing an organization.');
   const original=await base44.integrations.Core.UploadPrivateFile({file});setFileUri(original.file_uri);
   const prepared=await prepareStack(file),chunks=prepared.chunks,totalPages=prepared.total;
   job=await base44.entities.SmartStackRun.create({organization_id:organizationId,user_id:user.id,filename:file.name,file_uri:original.file_uri,status:'processing',page_count:totalPages,processed_pages:0,chunk_count:chunks.length,completed_chunks:0,detected_items:0,approved_items:0,answer_key:answerKey,rubric,results:[],started_at:new Date().toISOString()});
   setRunId(job.id);refetchRuns();
   const all=[];let completed=0,failed=0;
   for(const chunk of chunks){
    setProgress({stage:'Separating pages '+chunk.start+'–'+chunk.end+' of '+totalPages,pages:chunk.start-1,totalPages});
    try{
     const chunkFile=prepared.src?await makeChunkFile(prepared.src,file.name,chunk.start,chunk.end):file;
     const up=chunks.length===1&&!prepared.src?original:await base44.integrations.Core.UploadPrivateFile({file:chunkFile});
     const r=await base44.functions.invoke('stageBatchStudentWork',{file_uri:up.file_uri,mode:batchMode,workspace:workspaceKey,allowed_student_ids:students.map(s=>s.id),expected_assignment_title:batchMode==='guided'?assignmentTitle:'',expected_subject:batchMode==='guided'?assignmentSubject:''});
     const raw=(r.data?.items||r.items||[]).map((x,i)=>{const chunkLen=chunk.end-chunk.start+1;const abs=(x.source_pages||[]).map(n=>Number(n)).map(n=>{if(!Number.isFinite(n))return NaN;if(n>=1&&n<=chunkLen)return chunk.start-1+n;if(n>=chunk.start&&n<=chunk.end)return n;const corrected=n-(chunk.start-1);if(corrected>=chunk.start&&corrected<=chunk.end)return corrected;return n;}).filter(n=>Number.isFinite(n)&&n>=1&&n<=totalPages);return{...x,detected_title:cleanText(batchMode==='guided'?assignmentTitle:x.detected_title),subject:cleanText(batchMode==='guided'?assignmentSubject:x.subject),skills:(x.skills||[]).map(cleanText).filter(Boolean),source_pages:[...new Set(abs)],pages:abs.length?('Source page'+(abs.length===1?' ':'s ')+[...new Set(abs)].join(', ')):('Source pages '+chunk.start+'-'+chunk.end),_key:String(chunk.start)+'-'+String(i)+'-'+String(Date.now()),approved:false};});
     const found=raw.flatMap(x=>{const groups=pageGroups(x.source_pages),suspicious=groups.length>1||(x.source_pages?.length>1&&looksMixed(x));if(!suspicious)return[x];const split=groups.length>1?groups:(x.source_pages||[]).map(p=>[p]);return split.map((pages,gi)=>({...x,source_pages:pages,pages:'Source page'+(pages.length===1?' ':'s ')+pages.join(', '),_key:x._key+'-split-'+gi,grouping_confidence:'low',grouping_reason:'CaseCue separated this grouped result so each physical work sample can be checked independently.',cautions:[...(x.cautions||[]),'Page grouping needs teacher confirmation.']}));});
     for(const x of found){
      try{
       if(prepared.src&&x.source_pages?.length)x.evidence_file_uri=await extractArtifact(prepared.src,x,'casecue-artifact-'+job.id+'-'+x.source_pages.join('-')+'.pdf');else if(!prepared.src)x.evidence_file_uri=up.file_uri||original.file_uri||'';
       const artifact=await base44.entities.WorkArtifact.create({organization_id:organizationId,batch_run_id:job.id,artifact_key:x._key,source_file_uri:original.file_uri,artifact_file_uri:x.evidence_file_uri||'',source_pages:x.source_pages||[],detected_name:x.detected_name||x.visible_name||'',probable_student_id:x.probable_student_id||'',probable_student_name:x.probable_student_name||'',identity_match_score:Number(x.identity_match_score||0),student_id:x.student_id||'',identity_status:x.identity_status||'unmatched',assignment_title:x.detected_title||'Student work',subject:x.subject||'',skills:x.skills||[],status:'detected',scoring_confidence:'not_scored',score_earned:0,score_possible:0,percentage:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
       x.artifact_id=artifact.id;
      }catch(artifactErr){x.cautions=[...(x.cautions||[]),'Artifact storage needs review: '+String(artifactErr.message||'Could not preserve extracted artifact.')];}
     }
     all.push(...found);
    }catch(err){failed++;all.push({_key:'error-'+chunk.start,student_id:'',visible_name:'',detected_title:'Pages '+chunk.start+'–'+chunk.end+' need review',source_pages:[],pages:'Source pages '+chunk.start+'-'+chunk.end,score_possible:0,score_earned:0,percentage:0,scoring_confidence:'not_scored',cautions:[err?.response?.data?.error||err.message||'Packet staging failed'],approved:false});}
    completed++;
    await base44.entities.SmartStackRun.update(job.id,{processed_pages:chunk.end,completed_chunks:completed,detected_items:all.filter(x=>!String(x._key).startsWith('error-')).length,results:all});
    setItems([...all]);setProgress({stage:'Separated '+chunk.end+' of '+totalPages+' pages',pages:chunk.end,totalPages});
    if(chunks.length>1)await sleep(250);
   }
   await base44.entities.SmartStackRun.update(job.id,{status:'review',processed_pages:totalPages,completed_chunks:chunks.length,detected_items:all.filter(x=>!String(x._key).startsWith('error-')).length,new_items:all.filter(x=>!String(x._key).startsWith('error-')).length,results:all,completed_at:new Date().toISOString(),error_message:failed?(String(failed)+' page group(s) need review.') : ''});
   refetchRuns();
   if(!all.length)toast({title:'No work samples detected',variant:'destructive'});else{setFlowStep('staging');toast({title:'Packet separated',description:String(totalPages)+' pages became '+String(all.length)+' work samples. Check the packet map before grading.'});}
  }catch(e){if(job?.id)await base44.entities.SmartStackRun.update(job.id,{status:'failed',error_message:e?.response?.data?.error||e.message||'Packet staging failed',completed_at:new Date().toISOString()}).catch(()=>{});refetchRuns();toast({title:'Could not separate packet',description:e?.response?.data?.error||e.message,variant:'destructive'});}finally{setBusy(false);}
 };

 const gradeArtifacts=async()=>{
  if(!items.length)return;
  setBusy(true);setFlowStep('grading');
  try{
   const next=[...items];
   for(let i=0;i<next.length;i++){
    const x=next[i];
    if(String(x._key).startsWith('error-')||!x.evidence_file_uri)continue;
    setProgress({stage:'Grading work sample '+String(i+1)+' of '+String(next.length),pages:i,totalPages:next.length});
    try{
     if(x.artifact_id)await base44.entities.WorkArtifact.update(x.artifact_id,{status:'grading',updated_at:new Date().toISOString()});
     const r=await base44.functions.invoke('gradeWorkArtifact',{file_uri:x.evidence_file_uri,answer_key:answerKey,rubric,expected_assignment_title:x.detected_title||assignmentTitle,expected_subject:x.subject||assignmentSubject});
     const a=r?.data?.analysis||r?.analysis;
     if(a){
      Object.assign(next[i],{detected_title:cleanText(a.detected_title||x.detected_title),evidence_type:a.evidence_type||x.evidence_type,subject:cleanText(a.subject||x.subject),skills:(a.skills||x.skills||[]).map(cleanText).filter(Boolean),score_earned:Number(a.score_earned||0),score_possible:Number(a.score_possible||0),percentage:Number(a.percentage||0),scoring_confidence:a.scoring_confidence||'low',scoring_basis:a.scoring_basis||'',score_confidence_reasons:a.score_confidence_reasons||[],question_breakdown:a.question_breakdown||[],rubric_breakdown:a.rubric_breakdown||[],qualitative_notes:a.qualitative_notes||'',error_patterns:a.error_patterns||[],strengths_observed:a.strengths_observed||[],teacher_observation_draft:a.teacher_observation_draft||'',instructional_next_step:a.instructional_next_step||'',cautions:[...(x.cautions||[]),...(a.cautions||[])],verification:a.verification||null,duplicate_fingerprint:fingerprintFor({...x,...a}),approved:false});
     }
     if(next[i].artifact_id)await base44.entities.WorkArtifact.update(next[i].artifact_id,{assignment_title:next[i].detected_title||'Student work',subject:next[i].subject||'',skills:next[i].skills||[],status:'review',scoring_confidence:next[i].scoring_confidence||'',score_earned:Number(next[i].score_earned||0),score_possible:Number(next[i].score_possible||0),percentage:Number(next[i].percentage||0),updated_at:new Date().toISOString()});
    }catch(err){next[i]={...next[i],scoring_confidence:'low',cautions:[...(next[i].cautions||[]),'Grading needs review: '+String(err?.response?.data?.error||err.message||'grading failed')]};}
    setItems([...next]);
   }
   if(runId)await base44.entities.SmartStackRun.update(runId,{status:'review',results:next});
   setProgress(null);setFlowStep('decisions');
   toast({title:'Grading pass complete',description:'CaseCue graded what it could. The remaining teacher decisions are next.'});
  }finally{setBusy(false);}
 };

 const approveGradesAndCheckIep=async()=>{
  const ready=items.map(x=>canApprove(x)?{...x,approved:true,identity_status:'teacher_confirmed'}:x);
  if(ready.some(x=>!String(x._key).startsWith('error-')&&!x.student_id))return toast({title:'Student confirmation still required',variant:'destructive'});
  setItems(ready);setBusy(true);
  try{
   const next=[...ready];
   if(!goals.length){setItems(next);setProgress(null);setFlowStep('iep');return;}
   for(let i=0;i<next.length;i++){
    const x=next[i];if(!x.approved||!x.student_id)continue;
    setProgress({stage:'Checking IEP evidence '+String(i+1)+' of '+String(next.length),pages:i,totalPages:next.length});
    try{
     const r=await base44.functions.invoke('suggestGoalEvidence',{student_id:x.student_id,title:x.detected_title,subject:x.subject,skills:x.skills||[],score_earned:x.score_earned,score_possible:x.score_possible,percentage:x.percentage,qualitative_notes:x.qualitative_notes,error_patterns:x.error_patterns||[],strengths_observed:x.strengths_observed||[],teacher_supports:x.teacher_supports||[]});
     const allCandidates=r?.data?.candidates||r?.candidates||[];
     const candidates=allCandidates.filter(c=>['high','medium'].includes(c.confidence)&&['strong','supporting'].includes(c.evidence_strength));
     next[i]={...x,iep_candidates:candidates,iep_selected_goal_id:''};
    }catch{next[i]={...x,iep_candidates:[],iep_selected_goal_id:''};}
    setItems([...next]);
   }
   setProgress(null);setFlowStep('iep');
  }finally{setBusy(false);}
 };

 const save=async(includeGoalEvidence=false)=>{
  const selected=items.filter(x=>x.approved&&canApprove(x));
  if(!selected.length)return toast({title:'Nothing is ready to file',variant:'destructive'});
  setSaving(true);let saved=0;
  try{
   const user=await base44.auth.me(),organizationId=user?.organization_id||user?.data?.organization_id||'';
   if(!organizationId)throw new Error('Your account is missing an organization.');
   for(const x of selected){
    const possible=Number(x.score_possible||0),earned=Number(x.score_earned||0),pct=possible>0?Math.round(earned/possible*1000)/10:0;
    const goalId=isPara?'':includeGoalEvidence?String(x.iep_selected_goal_id||''):'';
    const chosen=isPara?null:(x.iep_candidates||[]).find(c=>c.goal_id===goalId);
    const evidenceFileUri=x.evidence_file_uri||'';
    const verificationStatus=isPara?'needs_teacher_review':x.verification?.status==='verified'&&x.scoring_confidence==='high'?'verified':'teacher_confirmed';
    const fingerprint=fingerprintFor(x);
    const existing=x.student_id?await base44.entities.WorkEvidence.filter({student_id:x.student_id,duplicate_fingerprint:fingerprint},'-created_date',1):[];
    if(existing?.length){if(x.artifact_id)await base44.entities.WorkArtifact.update(x.artifact_id,{status:'duplicate',work_evidence_id:existing[0].id,updated_at:new Date().toISOString()});continue;}
    const grade=await base44.entities.GradebookAssignment.create({student_id:x.student_id,goal_id:goalId,title:cleanText(x.detected_title)||'Student work',course:x.subject||'',assignment_type:x.evidence_type||'assignment',score_earned:earned,score_possible:possible,notes:x.qualitative_notes||'',quantitative_note:earned+'/'+possible+' · '+(pct/100).toFixed(2)+' ('+pct+'%)',qualitative_note:x.qualitative_notes||x.teacher_observation_draft||'',file_url:evidenceFileUri,source_type:isPara?'para_smart_grader_submission':v2?'smart_grader_v2_teacher_assisted':'resource_assignment',date:todayISO(),organization_id:organizationId,verification_status:verificationStatus,approved_by:isPara?'':user.id,approved_at:isPara?'':new Date().toISOString()});
    const ev=await base44.entities.WorkEvidence.create({student_id:x.student_id,organization_id:organizationId,goal_id:goalId,title:cleanText(x.detected_title)||'Student work',evidence_type:['assignment','worksheet','writing_sample','quiz','assessment','classwork','homework','probe','observation','other'].includes(x.evidence_type)?x.evidence_type:'worksheet',file_url:evidenceFileUri,date:todayISO(),source:isPara?'CaseCue Para Batch Submission':'GradeCue · Teacher-Assisted Batch',score_earned:earned,score_possible:possible,percentage:pct,verification_status:verificationStatus,qualitative_notes:x.qualitative_notes||'',error_patterns:x.error_patterns||[],skills:x.skills||[],analysis:{...x,post_approval_goal_match:chosen||null,submitted_from_workspace:workspaceKey},teacher_confirmed:!isPara,gradebook_assignment_id:grade.id,scan_run_id:runId||'',source_pages:x.source_pages||[],review_status:isPara?'needs_review':'approved',duplicate_fingerprint:fingerprint,evidence_strength:isPara?'needs_review':chosen?.evidence_strength||'classroom_only',teacher_supports:x.teacher_supports||[]});
    await base44.entities.GradebookAssignment.update(grade.id,{work_evidence_id:ev.id});
    if(!isPara&&goalId&&chosen&&['strong','supporting'].includes(chosen.evidence_strength)){
     const pd=await base44.entities.ProgressData.create({student_id:x.student_id,goal_id:goalId,date:todayISO(),correct:earned,total:possible,percentage:pct,decimal:pct/100,data_basis:'overall_assignment_score',qualitative_notes:x.qualitative_notes||'',observation_notes:x.teacher_observation_draft||'',organization_id:organizationId,work_evidence_id:ev.id,record_status:'active'});
     await base44.entities.WorkEvidence.update(ev.id,{progress_data_id:pd.id});
    }
    if(x.artifact_id)await base44.entities.WorkArtifact.update(x.artifact_id,{student_id:x.student_id,identity_status:isPara?'provisional':'teacher_confirmed',status:isPara?'review':'approved',work_evidence_id:ev.id,score_earned:earned,score_possible:possible,percentage:pct,updated_at:new Date().toISOString()});
    saved++;
   }
   if(runId)await base44.entities.SmartStackRun.update(runId,{status:'completed',approved_items:saved,results:items,completed_at:new Date().toISOString()});
   refetchRuns();setFlowStep('complete');toast(isPara?{title:String(saved)+' work sample'+(saved===1?'':'s')+' submitted',description:'The original work and proposed scores are pending authorized educator review. No IEP progress was created.'}:{title:String(saved)+' assignment'+(saved===1?'':'s')+' filed',description:includeGoalEvidence?'Selected IEP evidence was added after teacher approval.':'Grades filed without creating IEP progress evidence.'});onSaved?.();
  }catch(e){toast({title:'Could not file batch',description:e.message,variant:'destructive'});}finally{setSaving(false);}
 };

 const openRun=r=>{const restored=(r.results||[]).map((x,i)=>({...x,_key:x._key||String(r.id)+'-'+String(i)}));setRunId(r.id);setFileUri(r.file_uri||'');setFile(null);setItems(restored);setProgress(r.page_count?{stage:r.status==='completed'?'Completed':'Saved batch',pages:r.processed_pages||0,totalPages:r.page_count||0}:null);if(r.status==='completed')setFlowStep('complete');else if(restored.some(x=>Number(x.score_possible)>0||x.scoring_confidence&&x.scoring_confidence!=='not_scored'))setFlowStep('decisions');else setFlowStep('staging');};

 const modeTitle=batchMode==='guided'?'Guided Batch':'Mixed Packet';
 const modeDescription=batchMode==='guided'?'One assignment, many students. Best accuracy because you tell CaseCue what the papers are before upload.':'Multiple students and multiple assignments in one messy packet. More automation, more teacher review.';

 return<div className='space-y-5'>
  {flowStep==='setup'&&<Card className='p-6'>
   <div className='flex flex-wrap items-start justify-between gap-3'><div><div className='text-[10px] font-black uppercase tracking-[.18em] text-blue-700'>{modeTitle}</div><h3 className='mt-1 text-xl font-black'>{batchMode==='guided'?'Tell CaseCue what you are grading.':'Drop the messy packet.'}</h3><p className='mt-1 max-w-2xl text-sm text-slate-600'>{modeDescription}</p></div><div className='rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800'>{batchMode==='guided'?'Best accuracy':'More automation'}</div></div>
   {batchMode==='guided'&&<div className='mt-5 grid gap-4 md:grid-cols-2'><div><Label>Assignment</Label><Input value={assignmentTitle} onChange={e=>setAssignmentTitle(e.target.value)} placeholder='2-Digit × 1-Digit Multiplication'/></div><div><Label>Subject</Label><Input value={assignmentSubject} onChange={e=>setAssignmentSubject(e.target.value)} placeholder='Math'/></div></div>}
   <div className='mt-5 rounded-2xl border bg-slate-50 p-4'><div className='grid gap-3 md:grid-cols-[1fr_auto]'><div><Label>Preload saved answer key</Label><select className='mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm' defaultValue='' onChange={e=>loadAnswerKey(e.target.value)}><option value=''>Choose a saved key…</option>{(answerKeys||[]).map(k=><option key={k.id} value={k.id}>{k.title}</option>)}</select></div><div className='self-end'><Button variant='outline' onClick={saveAnswerKey}><Save className='mr-1 h-4 w-4'/>Save Answer Key</Button></div></div><div className='mt-4 grid gap-4 md:grid-cols-2'><div><Label>Answer key {batchMode==='guided'?'(recommended)':'(optional)'}</Label><Textarea rows={3} value={answerKey} onChange={e=>setAnswerKey(e.target.value)} placeholder='Paste the teacher key once, then reuse it.'/></div><div><Label>Rubric {batchMode==='guided'?'(for writing/subjective work)':'(optional)'}</Label><Textarea rows={3} value={rubric} onChange={e=>setRubric(e.target.value)} placeholder='Paste rubric if needed'/></div></div></div>
   <div className={'mt-5 rounded-2xl border-2 border-dashed p-8 text-center '+(drag?'border-blue-600 bg-blue-50':'border-slate-200')} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(e.dataTransfer.files?.[0])}}>
    <UploadCloud className='mx-auto h-10 w-10 text-blue-700'/><div className='mt-2 font-bold'>{file?file.name:(batchMode==='guided'?'Drop all student papers for this assignment':'Drop the mixed classroom packet')}</div><div className='mt-1 text-xs text-slate-500'>PDF, photo, or scan</div><input ref={inputRef} className='hidden' type='file' accept='.pdf,.png,.jpg,.jpeg,.webp' onChange={e=>choose(e.target.files?.[0])}/><div className='mt-4 flex flex-wrap justify-center gap-2'><Button variant='outline' onClick={()=>inputRef.current?.click()}>{file?'Replace file':'Choose file'}</Button>{file&&<Button variant='outline' className='border-rose-200 text-rose-700' onClick={removeUpload}><Trash2 className='mr-1 h-4 w-4'/>Remove upload</Button>}</div>
   </div>
   <Button className='mt-4 bg-blue-700 text-white' disabled={!file||busy} onClick={stagePacket}>{busy?<Loader2 className='mr-2 h-4 w-4 animate-spin'/>:<UploadCloud className='mr-2 h-4 w-4'/>}{busy?'Separating packet…':'Separate Packet'}</Button>
   {progress&&<div className='mt-4 rounded-xl border bg-slate-50 p-4'><div className='flex justify-between text-sm font-bold'><span>{progress.stage}</span><span>{progress.totalPages?String(progress.pages)+'/'+String(progress.totalPages):''}</span></div><div className='mt-2 h-2 overflow-hidden rounded-full bg-slate-200'><div className='h-full bg-blue-600' style={{width:progress.totalPages?Math.min(100,(progress.pages/progress.totalPages)*100)+'%':'0%'}}/></div></div>}
  </Card>}

  {flowStep==='staging'&&<BatchStagingBoard items={items} students={students} pages={progress?.totalPages||0} update={update} confirmStudent={confirmStudent} openEvidence={openEvidence} onContinue={gradeArtifacts} busy={busy}/>}
  {flowStep==='grading'&&<Card className='p-8 text-center'><Loader2 className='mx-auto h-10 w-10 animate-spin text-blue-700'/><h3 className='mt-3 text-xl font-black'>Grading extracted work samples</h3><p className='mt-1 text-sm text-slate-500'>{progress?.stage||'CaseCue is grading each artifact independently.'}</p></Card>}
  {flowStep==='decisions'&&<BatchDecisionQueue items={items} students={students} goals={goals} update={update} confirmStudent={confirmStudent} openEvidence={openEvidence} onApproveGrades={approveGradesAndCheckIep} approving={busy} submissionMode={isPara}/>}
  {flowStep==='iep'&&<BatchIepEvidenceReview items={items} goals={goals} update={update} onFileScores={()=>save(false)} onFileGoals={()=>save(true)} saving={saving} submissionMode={isPara}/>} 
  {flowStep==='complete'&&<Card className='overflow-hidden'><div className='bg-emerald-950 p-7 text-white'><CheckCircle2 className='h-8 w-8 text-emerald-300'/><h3 className='mt-3 text-2xl font-black'>{isPara?'Batch submitted.':'Batch complete.'}</h3><p className='mt-2 text-sm text-emerald-100'>{isPara?'The work and proposed scores are waiting for authorized educator review. No IEP progress was created from the Para workspace.':'Approved grades and original work were filed to the student records. Only teacher-selected goal evidence became progress data.'}</p></div><div className='p-5'><Button variant='outline' onClick={()=>{setFile(null);setItems([]);setProgress(null);setRunId('');setFlowStep('setup');}}>Grade another batch</Button></div></Card>}

  <Card className='p-6'><div className='flex items-center gap-2'><History className='h-5 w-5 text-blue-700'/><h3 className='font-black text-lg'>Batch History</h3></div><p className='mt-1 text-sm text-slate-500'>{isPara?'Saved packet runs stay here so you can reopen your own submitted work.':'Saved packet runs stay here so a teacher can reopen work after leaving the screen.'}</p><div className='mt-4 space-y-2'>{(runs||[]).map(r=><button key={r.id} onClick={()=>openRun(r)} className='flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-slate-50'><div className='grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700'><FileStack className='h-4 w-4'/></div><div className='min-w-0 flex-1'><div className='truncate text-sm font-bold'>{r.filename}</div><div className='text-xs text-slate-500'>{r.page_count||0} pages · {r.detected_items||0} work samples · {r.approved_items||0} filed</div>{r.error_message&&<div className='mt-1 truncate text-xs text-amber-700'>{r.error_message}</div>}</div><span className={'rounded-full px-2 py-1 text-[10px] font-black uppercase '+(r.status==='completed'?'bg-emerald-50 text-emerald-700':r.status==='failed'?'bg-red-50 text-red-700':'bg-blue-50 text-blue-700')}>{r.status}</span></button>)}{!(runs||[]).length&&<div className='rounded-xl border border-dashed p-6 text-center text-sm text-slate-500'>No batch scans saved yet.</div>}</div></Card>
 </div>;
}

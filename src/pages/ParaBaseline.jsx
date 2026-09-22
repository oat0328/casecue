import React,{useMemo,useRef,useState}from'react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Tabs,TabsContent,TabsList,TabsTrigger}from'@/components/ui/tabs';
import{useToast}from'@/components/ui/use-toast';
import{ClipboardCheck,FileUp,Loader2,Printer,Send,Sparkles,Target,ShieldCheck,CheckCircle2,AlertTriangle}from'lucide-react';
import{printDoc}from'@/lib/docExport';
import{printParaBaselinePacket}from'@/lib/paraBaselinePrint';

const DOMAINS=['Reading','Writing','Math','Executive Function','Social-Emotional / Behavior','Communication','Functional / Adaptive'];
const STYLES=[['mixed','Mixed skill probe'],['passage_evidence','Passage + text evidence'],['computation_grid','Computation grid'],['fluency_probe','Reading fluency / WCPM'],['word_problems','Math word problems'],['sentence_conventions','Sentence conventions / conjunctions'],['fractions','Fractions'],['math_fluency','Math fluency facts']];
const today=()=>new Date().toLocaleDateString('en-CA');
const full=s=>s?((s.first_name||'')+' '+(s.last_name||'')).trim():'Student';

export default function ParaBaseline(){
 const{toast}=useToast(),fileRef=useRef(null);
 const{data:students}=useAsync(()=>base44.entities.ParaStudentAccess.list('-last_name',500),[]);
 const assigned=(students||[]).filter(s=>s.active!==false&&!String(s.student_id||'').startsWith('para_'));
 const[studentId,setStudentId]=useState('');
 const[domains,setDomains]=useState(['Reading','Math']);
 const[itemsPerDomain,setItemsPerDomain]=useState(5);
 const[templateStyle,setTemplateStyle]=useState('mixed');
 const[records,setRecords]=useState([]);
 const[current,setCurrent]=useState(null);
 const[file,setFile]=useState(null);
 const[busy,setBusy]=useState(false);
 const[result,setResult]=useState(null);
 const[packet,setPacket]=useState(null);
 const meStudent=assigned.find(s=>s.student_id===studentId)||null;
 const chooseFile=f=>{setFile(f||null);setResult(null);setPacket(null)};

 const selectRecord=rec=>{setCurrent(rec||null);const saved=rec?.analysis||{};setResult(saved.grading||null);setPacket(saved.teacher_packet||null)};
 const loadRecords=async(id=studentId,select='')=>{
  if(!id){setRecords([]);selectRecord(null);return;}
  const rows=await base44.entities.BaselineAssessment.filter({student_id:id},'-created_date',50);
  setRecords(rows||[]);
  const pick=(rows||[]).find(x=>x.id===select)||(rows||[])[0]||null;
  selectRecord(pick);
 };
 const chooseStudent=async id=>{setStudentId(id);setFile(null);setResult(null);setPacket(null);await loadRecords(id)};

 const toggle=d=>setDomains(v=>v.includes(d)?v.filter(x=>x!==d):[...v,d]);
 const generate=async()=>{
  if(!studentId||!domains.length)return toast({title:'Choose a student and at least one assessment area'});
  setBusy(true);
  try{
   const me=await base44.auth.me();
   const r=await base44.functions.invoke('generateBaselineAssessment',{workspace:'para',student_id:studentId,domains,items_per_domain:Number(itemsPerDomain)||5,template_style:templateStyle});
   const a=r?.data?.assessment||r?.assessment;
   if(!a?.domains?.length)throw new Error('CaseCue did not return assessment items.');
   const rec=await base44.entities.BaselineAssessment.create({
    student_id:studentId,organization_id:me?.organization_id||me?.data?.organization_id||'',
    title:a.title||'Baseline Assessment',grade:meStudent?.grade||'',domains,status:'ready',
    assessment:a,results:{items:[]},administered_date:today()
   });
   await loadRecords(studentId,rec.id);
   toast({title:'Baseline created',description:'Review it, print it, administer it, then return here and scan the completed assessment.'});
  }catch(e){toast({title:'Could not create baseline',description:e?.response?.data?.error||e.message,variant:'destructive'})}
  finally{setBusy(false)}
 };

 const answerKeyText=useMemo(()=>{
  const a=current?.assessment;if(!a)return'';
  const lines=[];
  for(const d of a.domains||[])for(const i of d.items||[])lines.push(`${i.id} | ${d.domain} | ${i.skill} | answer: ${i.answer_key} | max points: ${i.max_points} | scoring: ${i.scoring_guidance}`);
  return lines.join('\n');
 },[current]);

 const scan=async()=>{
  if(!studentId||!file)return toast({title:'Choose the student and completed assessment first'});
  setBusy(true);setResult(null);setPacket(null);
  try{
   const up=await base44.integrations.Core.UploadPrivateFile({file});
   const r=await base44.functions.invoke('analyzeStudentWork',{
    workspace:'para',student_id:studentId,file_uri:up.file_uri,
    answer_key:answerKeyText,
    teacher_directions:current?.assessment
      ?'This is a completed CaseCue-generated instructional baseline. Score only visible student responses using the supplied answer key/scoring guidance. Do not infer missing responses.'
      :'This is a completed instructional baseline. Score only what is visible and defensible. Do not diagnose or determine eligibility.'
   });
   const a=r?.data?.analysis||r?.analysis;if(!a)throw new Error('No scoring result returned.');
   const p=await base44.functions.invoke('draftParaBaselinePacket',{student_id:studentId,analysis:a,assessment:current?.assessment||null});
   const teacherPacket=p?.data?.packet||p?.packet;if(!teacherPacket)throw new Error('The assessment was scored, but the teacher packet could not be created.');
   setResult({...a,file_uri:up.file_uri});setPacket(teacherPacket);
   if(current)await base44.entities.BaselineAssessment.update(current.id,{analysis:{grading:a,teacher_packet:teacherPacket},status:'analyzed'});
   toast({title:'Assessment package ready',description:'CaseCue scored the work and built the teacher-ready draft package.'});
  }catch(e){toast({title:'Could not complete assessment',description:e?.response?.data?.error||e?.data?.error||e.message,variant:'destructive'})}
  finally{setBusy(false)}
 };

 const printBaseline=()=>{if(!current?.assessment)return;const sections=(current.assessment.domains||[]).map(d=>({heading:d.domain,body:(d.items||[]).map((i,n)=>{const choices=(i.choices||[]).length?'\n'+i.choices.map((c,k)=>`   ${String.fromCharCode(65+k)}. ${c}`).join('\n'):'';return `${n+1}. ${i.skill}\n${i.prompt}${choices}\n\nResponse: ________________________________________________`;}).join('\n\n')}));printDoc({title:current.title||'Baseline Assessment',subtitle:`${full(meStudent)} · Grade ${meStudent?.grade||'—'} · CaseCue Para`,sections,filename:'casecue-para-baseline',banner:'CaseCue Para · Instructional baseline · Review scoring and student responses before educational use.'})};
 const printPacket=()=>{if(!packet)return;const ok=printParaBaselinePacket({student:meStudent,assessmentTitle:current?.title||result?.detected_title||'Instructional baseline assessment',packet,result,date:current?.administered_date||today()});if(!ok)toast({title:'Allow pop-ups to print',description:'CaseCue opens the premium teacher packet in a clean print window.',variant:'destructive'})};
 const rebuildPacket=async()=>{if(!result||!studentId)return toast({title:'Score an assessment first'});setBusy(true);try{const p=await base44.functions.invoke('draftParaBaselinePacket',{student_id:studentId,analysis:result,assessment:current?.assessment||null}),next=p?.data?.packet||p?.packet;if(!next)throw new Error('No teacher packet returned.');setPacket(next);if(current)await base44.entities.BaselineAssessment.update(current.id,{analysis:{grading:result,teacher_packet:next},status:'analyzed'});toast({title:'Teacher packet rebuilt',description:'Supports, accommodation considerations, goals, present levels, and monitoring recommendations were refreshed from the scored assessment.'})}catch(e){toast({title:'Could not rebuild packet',description:e?.response?.data?.error||e.message,variant:'destructive'})}finally{setBusy(false)}};

 const send=async()=>{
  if(!packet||!result||!studentId)return;
  setBusy(true);
  try{
   const me=await base44.auth.me(),org=me?.organization_id||me?.data?.organization_id||'';
   const ev=await base44.entities.WorkEvidence.create({
    student_id:studentId,organization_id:org,title:result.detected_title||current?.title||'Para baseline assessment',
    evidence_type:'assessment',file_url:result.file_uri,date:today(),source:'CaseCue Para Assessment Package',
    score_earned:Number(result.score_earned||0),score_possible:Number(result.score_possible||0),
    percentage:Number(result.percentage||0),qualitative_notes:packet.overall_summary||result.qualitative_notes||'',
    error_patterns:result.error_patterns||[],skills:result.skills||[],
    analysis:{grading:result,teacher_packet:packet,baseline_assessment_id:current?.id||''},
    teacher_confirmed:false,review_status:'needs_review',verification_status:'needs_teacher_review',evidence_strength:'needs_review'
   });
   const note=await base44.entities.ParaNote.create({
    student_id:studentId,para_user_id:me.id,date:today(),context:'assessment',
    activity:'Baseline assessment package',objective_observation:packet.teacher_handoff||packet.overall_summary||'Baseline assessment package submitted.',
    follow_up:'Draft present levels, goal options, short-term objectives, and progress-monitoring recommendations are attached in the CaseCue assessment package.',
    status:'complete',review_status:'not_sent',baseline_assessment_id:current?.id||''
   });
   try{
    const routed=await base44.functions.invoke('submitParaNoteForReview',{note_id:note.id});
    if(routed?.data?.error)throw new Error(routed.data.error);
    toast({title:'Sent to teacher',description:'The completed work, score, and draft assessment package are waiting for educator review.'});
   }catch(routeError){
    toast({title:'Package saved',description:'The teacher packet is safely saved. Direct routing is not configured for this student yet; a case manager can assign the student to this Para account to enable the handoff route.'});
   }
   if(current)await base44.entities.BaselineAssessment.update(current.id,{results:{work_evidence_id:ev.id,submitted_at:new Date().toISOString()},status:'analyzed'});
  }catch(e){toast({title:'Could not save assessment package',description:e.message,variant:'destructive'})}
  finally{setBusy(false)}
 };

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white">
   <div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Para · Assessments</div>
   <h1 className="mt-3 text-3xl font-black">Give the assessment. Scan it. Hand the teacher the facts.</h1>
   <p className="mt-3 max-w-3xl text-slate-300">Create an instructional baseline or upload one the teacher gave you. CaseCue scores the completed work and prepares the measurable facts, draft present levels, goal options, short-term objectives, and progress-monitoring ideas for teacher review.</p>
  </section>

  <Card className="p-5">
   <div className="text-sm font-black">Assigned student</div>
   <select className="mt-2 w-full max-w-xl rounded-lg border bg-white p-2 text-sm" value={studentId} onChange={e=>chooseStudent(e.target.value)}>
    <option value="">Choose student…</option>{assigned.map(s=><option key={s.id} value={s.student_id}>{s.last_name}, {s.first_name} · Grade {s.grade||'—'}</option>)}
   </select>
   {!assigned.length&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No students are assigned to this Para account yet.</div>}
  </Card>

  <Tabs defaultValue="create">
   <TabsList><TabsTrigger value="create">Create Baseline</TabsTrigger><TabsTrigger value="complete">Complete Baseline</TabsTrigger></TabsList>

   <TabsContent value="create" className="space-y-4">
    <Card className="p-6">
     <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-700"/><h2 className="font-black">Build an instructional baseline</h2></div>
     <p className="mt-1 text-sm text-slate-500">Pick the areas the teacher needs data for. CaseCue creates original, grade-appropriate items and an answer/scoring guide.</p>
     <div className="mt-4 flex flex-wrap gap-2">{DOMAINS.map(d=><button key={d} onClick={()=>toggle(d)} className={"rounded-full border px-3 py-2 text-xs font-bold "+(domains.includes(d)?'border-blue-600 bg-blue-50 text-blue-800':'bg-white text-slate-600')}>{domains.includes(d)?'✓ ':''}{d}</button>)}</div>
     <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]"><div><div className="text-xs font-black">Assessment example style</div><select className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" value={templateStyle} onChange={e=>setTemplateStyle(e.target.value)}>{STYLES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><div className="mt-1 text-[11px] text-slate-500">Uses the same kinds of formats as your sample packet—original CaseCue content, not copied worksheets.</div></div><div><div className="text-xs font-black">Items per area</div><Input className="mt-1 w-28" type="number" min="3" max="10" value={itemsPerDomain} onChange={e=>setItemsPerDomain(e.target.value)}/></div><div className="self-end"><Button onClick={generate} disabled={busy||!studentId}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ClipboardCheck className="mr-2 h-4 w-4"/>}Create Baseline</Button></div></div>
    </Card>
    {records.length>0&&<Card className="p-4"><div className="text-sm font-black">Saved baselines</div><select className="mt-2 w-full rounded-lg border p-2 text-sm" value={current?.id||''} onChange={e=>selectRecord(records.find(r=>r.id===e.target.value)||null)}>{records.map(r=><option key={r.id} value={r.id}>{r.title} · {r.administered_date||'No date'} · {r.status}</option>)}</select></Card>}
    {current?.assessment&&<Card className="p-6 baseline-print-area">
     <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Ready to administer</div><h2 className="text-2xl font-black">{current.title}</h2><div className="text-xs text-slate-500">{full(meStudent)} · Grade {meStudent?.grade||'—'}</div></div><Button variant="outline" onClick={printBaseline}><Printer className="mr-2 h-4 w-4"/>Print Student Baseline</Button></div>
     <p className="mt-4 text-sm">{current.assessment.directions}</p>
     <div className="mt-5 space-y-5">{(current.assessment.domains||[]).map(d=><div key={d.domain}><h3 className="font-black">{d.domain}</h3><div className="mt-2 space-y-2">{(d.items||[]).map((i,n)=><div key={i.id} className="rounded-xl border p-4"><div className="text-xs font-black text-blue-700">{n+1}. {i.skill}</div><div className="mt-1 whitespace-pre-wrap text-sm">{i.prompt}</div>{i.choices?.length>0&&<div className="mt-2 grid gap-1 sm:grid-cols-2">{i.choices.map((c,k)=><div key={k} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">{String.fromCharCode(65+k)}. {c}</div>)}</div>}<details className="mt-2 print:hidden"><summary className="cursor-pointer text-xs font-bold text-slate-500">Scoring guide</summary><div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs"><b>Answer:</b> {i.answer_key}<br/><b>Scoring:</b> {i.scoring_guidance}</div></details></div>)}</div></div>)}</div>
    </Card>}
   </TabsContent>

   <TabsContent value="complete" className="space-y-4">
    <Card className="p-6">
     <div className="flex items-center gap-2"><FileUp className="h-5 w-5 text-blue-700"/><h2 className="font-black">Scan the completed assessment</h2></div>
     <p className="mt-1 text-sm text-slate-500">{current?.assessment?'The saved CaseCue baseline is selected, so its answer key and scoring guide will be used automatically.':'You can scan another instructional baseline too; CaseCue will score only what it can defend from the page.'}</p>
     {current&&<div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><b>Selected baseline:</b> {current.title}</div>}
     <input ref={fileRef} type="file" accept=".pdf,image/*" capture="environment" className="hidden" onChange={e=>chooseFile(e.target.files?.[0])}/>
     <button onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseFile(e.dataTransfer.files?.[0])}} className="mt-4 w-full rounded-2xl border-2 border-dashed p-8 text-center hover:bg-slate-50"><FileUp className="mx-auto h-9 w-9 text-blue-700"/><div className="mt-2 font-black">{file?file.name:'Drag & drop the completed assessment here'}</div><div className="mt-1 text-xs text-slate-500">or click to take a photo / choose a PDF or image</div></button>
     <Button className="mt-4" onClick={scan} disabled={busy||!file||!studentId}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<CheckCircle2 className="mr-2 h-4 w-4"/>}{busy?'Scoring & building teacher packet…':'Score Assessment & Build Teacher Packet'}</Button>
    </Card>

    {result&&<Card className="p-6"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Assessment result</div><div className="mt-2 text-4xl font-black">{result.score_earned??'—'}/{result.score_possible??'—'} <span className="text-xl text-blue-700">{result.percentage??0}%</span></div><div className="mt-3 text-sm text-slate-700">{result.qualitative_notes}</div>{result.error_patterns?.length>0&&<div className="mt-3 text-sm"><b>Error patterns:</b> {result.error_patterns.join(' · ')}</div>}</Card>}

    {packet&&<div className="space-y-4">
     <Card className="border-emerald-200 bg-emerald-50/30 p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700"/><div><div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Teacher packet · Draft for educator review</div><h2 className="mt-1 text-xl font-black">{packet.score_summary}</h2><p className="mt-2 text-sm">{packet.teacher_handoff}</p></div></div></Card>
     <div className="grid gap-4 lg:grid-cols-2"><Card className="p-5"><b>Strengths</b><ul className="mt-2 space-y-1 text-sm">{(packet.strengths||[]).map(x=><li key={x}>• {x}</li>)}</ul></Card><Card className="p-5"><b>Needs</b><ul className="mt-2 space-y-1 text-sm">{(packet.needs||[]).map(x=><li key={x}>• {x}</li>)}</ul></Card></div>
     <Card className="p-6"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Present Levels Draft</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6">{packet.present_levels_draft}</div></Card>
     <Card className="p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700"/><div><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Classroom access · Draft for educator / IEP-team review</div><h3 className="mt-1 font-black">Supports & Accommodation Considerations</h3><p className="mt-1 text-xs leading-5 text-slate-500">CaseCue only surfaces a support when the completed assessment gives a defensible reason to consider it. These are not automatically added to an IEP.</p></div></div><div className="mt-4 space-y-3">{(packet.support_recommendations||[]).map((s,i)=><div key={`${s.support}-${i}`} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">{String(s.category||'support').replaceAll('_',' ')}</div><div className="mt-1 font-black">{s.support}</div></div><span className="rounded-full border bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">{s.confidence||'review'} confidence</span></div><div className="mt-3 grid gap-2 md:grid-cols-2"><div className="rounded-xl bg-white p-3 text-xs"><b>Assessment evidence</b><div className="mt-1 leading-5 text-slate-600">{s.evidence}</div></div><div className="rounded-xl bg-white p-3 text-xs"><b>When it may help</b><div className="mt-1 leading-5 text-slate-600">{s.when_helpful}</div></div></div>{s.rationale&&<div className="mt-3 text-xs leading-5 text-slate-600"><b>Why it was surfaced:</b> {s.rationale}</div>}</div>)}{!(packet.support_recommendations||[]).length&&(packet.accommodation_observations||[]).length>0&&<div className="rounded-xl border border-dashed p-4"><div className="text-xs font-black text-slate-700">Saved packet uses the earlier support format</div><ul className="mt-2 space-y-1 text-sm text-slate-600">{packet.accommodation_observations.map((x,i)=><li key={i}>• {x}</li>)}</ul><div className="mt-2 text-xs text-slate-500">Re-scan or rebuild the packet to get evidence-linked structured support recommendations.</div></div>}{!(packet.support_recommendations||[]).length&&!(packet.accommodation_observations||[]).length&&<div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">This assessment did not support a defensible accommodation consideration. Collect additional classroom data before recommending one.</div>}</div></Card>
     <Card className="p-6"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-blue-700"/><h3 className="font-black">Goal & objective drafts</h3></div><div className="mt-4 space-y-4">{(packet.goal_drafts||[]).map((g,i)=><div key={i} className="rounded-2xl border p-4"><div className="font-black">{g.goal_area}</div><p className="mt-2 text-sm font-semibold">{g.goal_text}</p><div className="mt-3 grid gap-2 md:grid-cols-2 text-xs"><div className="rounded-xl bg-slate-50 p-3"><b>Baseline</b><div className="mt-1">{g.baseline}</div></div><div className="rounded-xl bg-slate-50 p-3"><b>Suggested target</b><div className="mt-1">{g.target||g.criterion}</div></div></div>{g.objectives?.length>0&&<div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm"><b>Short-term objectives</b>{g.objectives.map((o,n)=><div key={o} className="mt-1">{n+1}. {o}</div>)}</div>}<div className="mt-3 text-xs text-slate-500">Measure: {g.measurement_method} · Progress monitoring: {g.progress_monitoring_method}</div></div>)}{!(packet.goal_drafts||[]).length&&<div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">This baseline did not support a defensible goal draft. CaseCue kept the recommendation at “collect more data” instead of making one up.</div>}</div></Card>
     <Card className="p-5"><b>Progress monitoring / next data</b><ul className="mt-2 space-y-1 text-sm">{(packet.progress_monitoring_recommendations||[]).map(x=><li key={x}>• {x}</li>)}</ul></Card>
     {packet.cautions?.length>0&&<Card className="border-amber-200 bg-amber-50 p-5"><div className="flex gap-2"><AlertTriangle className="h-5 w-5 text-amber-700"/><div><b>Teacher review notes</b><div className="mt-2 text-sm">{packet.cautions.join(' · ')}</div></div></div></Card>}
     <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={rebuildPacket} disabled={busy}><Sparkles className="mr-2 h-4 w-4"/>{busy?'Working…':'Rebuild Packet'}</Button><Button variant="outline" onClick={printPacket}><Printer className="mr-2 h-4 w-4"/>Print / Save Premium Packet</Button><Button onClick={send} disabled={busy}><Send className="mr-2 h-4 w-4"/>Send to Teacher</Button></div>
    </div>}
   </TabsContent>
  </Tabs>
 </div>;
}

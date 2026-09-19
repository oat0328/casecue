import React,{useMemo,useRef,useState}from'react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{ShieldCheck,BookOpenCheck,FileUp,Loader2,Trash2,HeartPulse,Brain,ClipboardCheck,AlertTriangle,TestTube2}from'lucide-react';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';
import{useToast}from'@/components/ui/use-toast';
import ExportBar from'@/components/shared/ExportBar';

const TYPES=['IEP','BIP','504','Health Plan','Medical Report','FBA','Evaluation','Other'];
const arr=x=>Array.isArray(x)?x.filter(Boolean):[];
const ItemList=({items,empty='Nothing documented in this uploaded record.'})=>arr(items).length?<ul className="mt-3 space-y-2 text-sm">{arr(items).map((v,i)=><li key={i} className="rounded-xl border border-slate-200 bg-white px-3 py-2 leading-5">• {v}</li>)}</ul>:<p className="mt-3 text-sm text-slate-500">{empty}</p>;

export default function ParaIEPGuide(){
 const{toast}=useToast(),fileRef=useRef(null);
 const{data:rows}=useAsync(()=>base44.entities.ParaStudentAccess.list('-last_name',500),[]);
 const students=useMemo(()=>(rows||[]).filter(x=>x.active!==false),[rows]);
 const[selected,setSelected]=useState('');
 const student=students.find(x=>x.student_id===selected)||null;
 const{data:docs,refetch}=useAsync(()=>selected?base44.entities.ParaSupportDocument.filter({student_id:selected},'-updated_at',100):Promise.resolve([]),[selected]);
 const[type,setType]=useState('IEP'),[busy,setBusy]=useState(false);
 const latest=(docs||[]).find(x=>x.status==='ready')||null;

 const upload=async file=>{
  if(!selected)return toast({title:'Choose the assigned student first',variant:'destructive'});
  if(!file)return;
  setBusy(true);
  try{
   const up=await base44.integrations.Core.UploadPrivateFile({file}),uri=up.file_uri||up.file_url;
   if(!uri)throw new Error('Private upload did not return a file reference.');
   const r=await base44.functions.invoke('processParaSupportDocument',{student_id:selected,file_uri:uri,filename:file.name||'support-document',document_type:type});
   const d=r?.data||r;if(d?.error)throw new Error(d.error);
   await refetch();
   toast({title:'Student Support Brief ready',description:'CaseCue read the uploaded record and organized the documented supports for day-to-day use.'});
  }catch(e){toast({title:'Could not read support document',description:e?.response?.data?.error||e?.data?.error||e.message,variant:'destructive'})}
  finally{setBusy(false)}
 };
 const remove=async d=>{if(!window.confirm(`Remove ${d.filename} from this Para workspace?`))return;await base44.entities.ParaSupportDocument.delete(d.id);await refetch();toast({title:'Support document removed'})};

 const sections=latest?[{
  heading:'Plain-Language Support Summary',body:latest.plain_language_summary||''
 },{
  heading:'Documented Eligibility / Disability / Condition',body:[...arr(latest.eligibility_categories),...arr(latest.documented_disability_or_condition)].map(x=>`• ${x}`).join('\n')||'None explicitly documented.'
 },{
  heading:'Accommodations & Testing Supports',body:[...arr(latest.accommodations),...arr(latest.testing_supports)].map(x=>`• ${x}`).join('\n')||'None explicitly documented.'
 },{
  heading:'Behavior & Communication Supports',body:[...arr(latest.behavior_supports),...arr(latest.communication_supports)].map(x=>`• ${x}`).join('\n')||'None explicitly documented.'
 },{
  heading:'Health / Safety',body:[...arr(latest.health_safety_alerts),...arr(latest.emergency_actions)].map(x=>`• ${x}`).join('\n')||'No health/safety direction was explicitly documented in this uploaded record.'
 },{
  heading:'What To Do',body:arr(latest.what_to_do).map(x=>`• ${x}`).join('\n')||'No additional day-to-day action steps were explicitly documented.'
 },{
  heading:'What To Avoid / Clarify',body:[...arr(latest.what_to_avoid),...arr(latest.source_notes)].map(x=>`• ${x}`).join('\n')||'No additional restrictions or clarification notes.'
 }]:[];

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white">
   <div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Para · Student Supports</div>
   <h1 className="mt-3 text-3xl font-black">Know what the student needs before the next block starts.</h1>
   <p className="mt-2 max-w-3xl text-slate-300">Use the school-shared support card and, when you are authorized to use the student's records, privately upload an IEP, BIP, 504, health/safety plan, evaluation, or related document. CaseCue turns it into a day-to-day support brief without changing the original record.</p>
  </section>

  <Card className="p-6">
   <label className="text-sm font-black">Assigned student</label>
   <select className="mt-2 w-full rounded-lg border bg-white p-2 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose student…</option>{students.map(s=><option key={s.id} value={s.student_id}>{s.last_name}, {s.first_name} · Grade {s.grade||'—'}</option>)}</select>
  </Card>

  {student&&<>
   <div className="grid gap-4 lg:grid-cols-2">
    <Card className="p-6"><div className="flex items-center gap-2 text-sm font-black text-blue-900"><BookOpenCheck className="h-4 w-4"/>School-Shared Support Card</div><p className="mt-3 text-sm leading-6 text-slate-700">{student.support_summary||'No approved support summary has been shared for this student yet.'}</p></Card>
    <Card className="p-6"><div className="flex items-center gap-2 text-sm font-black text-blue-900"><ShieldCheck className="h-4 w-4"/>Approved Supports</div><ItemList items={student.approved_supports} empty="No approved supports have been shared yet."/></Card>
   </div>

   <Card className="overflow-hidden">
    <div className="border-b bg-slate-50 p-6"><div className="flex items-center gap-2"><FileUp className="h-5 w-5 text-blue-700"/><h2 className="font-black">Add an authorized student support document</h2></div><p className="mt-1 text-sm text-slate-500">Choose what you are uploading, then drag and drop the document. Files are stored privately.</p></div>
    <div className="p-6">
     <div className="flex flex-wrap gap-2">{TYPES.map(t=><button key={t} onClick={()=>setType(t)} className={`rounded-full border px-3 py-2 text-xs font-black ${type===t?'border-blue-600 bg-blue-50 text-blue-800':'bg-white text-slate-600'}`}>{t}</button>)}</div>
     <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={e=>{upload(e.target.files?.[0]);e.target.value=''}}/>
     <button onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();upload(e.dataTransfer.files?.[0])}} disabled={busy} className="mt-4 w-full rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-8 text-center hover:bg-blue-50 disabled:opacity-60">
      {busy?<Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-700"/>:<FileUp className="mx-auto h-9 w-9 text-blue-700"/>}
      <div className="mt-2 font-black">{busy?'Reading the student record…':`Drag & drop ${type} here`}</div>
      <div className="mt-1 text-xs text-slate-500">or click to choose a PDF, Word file, screenshot, JPG, PNG, or WEBP</div>
     </button>
    </div>
   </Card>

   {(docs||[]).length>0&&<Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">Uploaded Support Records</h2><p className="text-xs text-slate-500">Only records uploaded in this Para workspace for this assigned student.</p></div>{latest&&<ExportBar title={`CaseCue Para · ${student.first_name} ${student.last_name} Support Brief`} subtitle={`${latest.document_type} · ${latest.filename}`} filename={`casecue-para-${student.first_name}-${student.last_name}-support-brief`} sections={sections} banner="CaseCue Para · Document-derived support brief · Follow the original IEP/BIP/504/health plan and school directions when anything conflicts."/>}</div><div className="mt-4 grid gap-2 md:grid-cols-2">{(docs||[]).map(d=><div key={d.id} className="rounded-xl border p-3 text-sm"><div className="flex items-start justify-between gap-2"><div><div className="font-black">{d.document_type}</div><div className="mt-1 text-xs text-slate-500">{d.filename} · {d.status}</div></div><Button size="icon" variant="ghost" onClick={()=>remove(d)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></div></div>)}</div></Card>}

   {latest&&<div className="space-y-4">
    <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/40 p-6"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">Document Support Brief · {latest.document_type}</div><h2 className="mt-2 text-2xl font-black">What this record says about supporting {student.first_name}</h2><p className="mt-3 text-sm leading-6 text-slate-700">{latest.plain_language_summary||'No plain-language summary was returned.'}</p></Card>

    <div className="grid gap-4 lg:grid-cols-3">
     <Card className="p-5"><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-violet-700"/><h3 className="font-black">Eligibility / Disability / Condition</h3></div><ItemList items={[...arr(latest.eligibility_categories),...arr(latest.documented_disability_or_condition)]}/></Card>
     <Card className="p-5"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-blue-700"/><h3 className="font-black">Educational Impact</h3></div><ItemList items={latest.educational_impact}/></Card>
     <Card className="p-5"><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-rose-700"/><h3 className="font-black">Health / Safety Alerts</h3></div><ItemList items={latest.health_safety_alerts} empty="No health/safety alert was explicitly documented in this uploaded record."/></Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
     <Card className="p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-700"/><h3 className="font-black">Accommodations</h3></div><ItemList items={latest.accommodations}/><div className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Testing supports</div><ItemList items={latest.testing_supports}/></Card>
     <Card className="p-6"><div className="flex items-center gap-2"><Brain className="h-4 w-4 text-violet-700"/><h3 className="font-black">Behavior & Communication</h3></div><div className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">Behavior supports</div><ItemList items={latest.behavior_supports}/><div className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Communication supports</div><ItemList items={latest.communication_supports}/></Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
     <Card className="border-emerald-200 bg-emerald-50/40 p-6"><div className="flex items-center gap-2 text-emerald-900"><ClipboardCheck className="h-4 w-4"/><h3 className="font-black">What I Should Do</h3></div><ItemList items={latest.what_to_do}/></Card>
     <Card className="border-amber-200 bg-amber-50/50 p-6"><div className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4"/><h3 className="font-black">What To Avoid / Clarify</h3></div><ItemList items={[...arr(latest.what_to_avoid),...arr(latest.source_notes)]}/></Card>
    </div>

    {arr(latest.emergency_actions).length>0&&<Card className="border-rose-200 bg-rose-50 p-6"><div className="flex items-center gap-2 text-rose-900"><HeartPulse className="h-5 w-5"/><h3 className="font-black">Documented Emergency / Safety Actions</h3></div><ItemList items={latest.emergency_actions}/><p className="mt-3 text-xs text-rose-800">Follow the original school/health plan and emergency procedures. CaseCue only summarizes what the uploaded record explicitly states.</p></Card>}

    {arr(latest.services_and_supports).length>0&&<Card className="p-6"><div className="flex items-center gap-2"><TestTube2 className="h-4 w-4 text-slate-700"/><h3 className="font-black">Services / Supports Documented</h3></div><ItemList items={latest.services_and_supports}/></Card>}
   </div>}
  </>}

  <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><b>The original school record controls.</b><p className="mt-1">CaseCue helps an assigned Para understand what an uploaded IEP, BIP, 504, health/safety plan, or related record says. It does not change eligibility, placement, accommodations, behavior-plan decisions, medical directions, or services. When the brief and the original record conflict, follow the original record and school/case-manager directions.</p></Card>
 </div>;
}
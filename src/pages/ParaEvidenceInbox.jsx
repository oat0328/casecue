import React,{useMemo,useState}from'react';
import{Inbox,CheckCircle2,RotateCcw,UserRound,Clock3,Users,ShieldCheck,Settings2,ClipboardCheck,Target}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Textarea}from'@/components/ui/textarea';
import{useToast}from'@/components/ui/use-toast';
import{sortStudentsByName}from'@/lib/studentSort';

export default function ParaEvidenceInbox(){
 const{toast}=useToast();
 const[reviewNotes,setReviewNotes]=useState({});
 const[selectedPara,setSelectedPara]=useState('');
 const[editingStudent,setEditingStudent]=useState('');
 const[supportSummary,setSupportSummary]=useState('');
 const[supportsText,setSupportsText]=useState('');
 const[savingAccess,setSavingAccess]=useState(false);

 const{data:notes,refetch}=useAsync(()=>base44.entities.ParaNote.list('-submitted_at',500),[]);
 const{data:students}=useAsync(()=>base44.entities.Student.list('-last_name',500),[]);
 const{data:accountResponse}=useAsync(()=>base44.functions.invoke('listParaAccounts',{}),[]);
 const{data:assignments,refetch:refetchAssignments}=useAsync(()=>base44.entities.ParaAssignment.list('-assigned_at',500),[]);
 const paraAccounts=accountResponse?.data?.accounts||accountResponse?.accounts||[];
 const baselineIds=useMemo(()=>[...new Set((notes||[]).map(n=>n.baseline_assessment_id).filter(Boolean))],[notes]);
 const baselineKey=baselineIds.join('|');
 const{data:baselineRows}=useAsync(()=>baselineIds.length?Promise.all(baselineIds.map(id=>base44.entities.BaselineAssessment.filter({id},'-created_date',1))).then(rows=>rows.flat()):Promise.resolve([]),[baselineKey]);
 const baselineById=useMemo(()=>Object.fromEntries((baselineRows||[]).map(r=>[r.id,r])),[baselineRows]);
 const sortedStudents=useMemo(()=>sortStudentsByName(students||[]),[students]);
 const name=id=>{const s=(students||[]).find(x=>x.id===id);return s?((s.first_name||'')+' '+(s.last_name||'')).trim():'Student'};

 const submitted=useMemo(()=>(notes||[]).filter(n=>['submitted','reviewed','returned'].includes(n.review_status)),[notes]);
 const pending=submitted.filter(n=>n.review_status==='submitted'),history=submitted.filter(n=>n.review_status!=='submitted');

 const assignmentFor=studentId=>(assignments||[]).find(x=>x.para_user_id===selectedPara&&x.student_id===studentId);

 const updateAssignment=async(studentId,active,details={})=>{
  if(!selectedPara)return toast({title:'Choose a Para account first'});
  setSavingAccess(true);
  try{
   const current=assignmentFor(studentId);
   const r=await base44.functions.invoke('manageParaAssignment',{
    para_user_id:selectedPara,
    student_id:studentId,
    active,
    support_summary:details.support_summary??current?.support_summary??'',
    approved_supports:details.approved_supports??current?.approved_supports??[],
   });
   if(r?.data?.error)throw new Error(r.data.error);
   await refetchAssignments();
   toast({title:active?'Student access updated':'Student removed from Para assignment'});
   if(editingStudent===studentId&&!active)setEditingStudent('');
  }catch(e){toast({title:'Could not update Para assignment',description:e?.response?.data?.error||e?.data?.error||e.message,variant:'destructive'})}
  finally{setSavingAccess(false)}
 };

 const openSupportEditor=studentId=>{
  const a=assignmentFor(studentId);
  setEditingStudent(studentId);
  setSupportSummary(a?.support_summary||'');
  setSupportsText((a?.approved_supports||[]).join('\n'));
 };

 const saveSupports=async()=>{
  const supports=supportsText.split(/\n|,/).map(x=>x.trim()).filter(Boolean);
  await updateAssignment(editingStudent,true,{support_summary:supportSummary,approved_supports:supports});
  setEditingStudent('');
 };

 const review=async(n,status)=>{
  try{
   await base44.entities.ParaNote.update(n.id,{review_status:status,review_note:reviewNotes[n.id]||'',reviewed_at:new Date().toISOString()});
   await refetch();
   toast({title:status==='reviewed'?'Para observation accepted as reviewed evidence':'Observation returned for follow-up'});
  }catch(e){toast({title:'Could not review observation',description:e.message,variant:'destructive'})}
 };

 const EvidenceCard=({n})=>{const baseline=n.baseline_assessment_id?baselineById[n.baseline_assessment_id]:null,packet=baseline?.analysis?.teacher_packet||null,grading=baseline?.analysis?.grading||null;return <div className="rounded-2xl border bg-white p-5 shadow-sm">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-black"><UserRound className="h-4 w-4 text-blue-600"/>{name(n.student_id)}</div><div className="mt-1 text-xs text-slate-500">{n.date} {n.time||''} · {(n.context||'').replaceAll('_',' ')} · {(n.support_level||'').replaceAll('_',' ')}</div></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">{n.review_status==='submitted'?'Needs review':n.review_status==='reviewed'?'Reviewed':'Returned'}</span></div>
  <div className="mt-4 rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Objective observation</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{n.objective_observation}</p></div>
  {n.activity&&<div className="mt-3 text-sm"><b>Activity:</b> {n.activity}</div>}
  {(n.frequency!=null||n.duration_minutes!=null)&&<div className="mt-2 text-sm"><b>Data:</b>{n.frequency!=null?' Count '+n.frequency:''}{n.duration_minutes!=null?' · '+n.duration_minutes+' min':''}</div>}
  {n.student_response&&<div className="mt-2 text-sm"><b>Student response:</b> {n.student_response}</div>}
  {n.follow_up&&<div className="mt-2 text-sm"><b>Para follow-up:</b> {n.follow_up}</div>}
  {packet&&<div className="mt-4 overflow-hidden rounded-2xl border border-blue-200"><div className="bg-slate-950 p-4 text-white"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-300"><ClipboardCheck className="h-4 w-4"/>Baseline Assessment Package</div><div className="mt-2 text-2xl font-black">{packet.score_summary||((grading?.score_earned??'—')+'/'+(grading?.score_possible??'—'))}</div><p className="mt-2 text-sm text-slate-300">{packet.teacher_handoff||packet.overall_summary}</p></div><div className="space-y-4 p-4"><div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-3"><div className="text-xs font-black text-emerald-800">Strengths</div><div className="mt-1 text-sm">{(packet.strengths||[]).join(' · ')||'None listed'}</div></div><div className="rounded-xl bg-amber-50 p-3"><div className="text-xs font-black text-amber-800">Needs</div><div className="mt-1 text-sm">{(packet.needs||[]).join(' · ')||'None listed'}</div></div></div><div className="rounded-xl border p-4"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Present Levels Draft</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6">{packet.present_levels_draft||'No present-level draft returned.'}</div></div>{(packet.goal_drafts||[]).length>0&&<div className="rounded-xl border p-4"><div className="flex items-center gap-2 font-black"><Target className="h-4 w-4 text-blue-700"/>Goal & Objective Drafts</div><div className="mt-3 space-y-3">{packet.goal_drafts.map((g,i)=><div key={i} className="rounded-xl bg-slate-50 p-3"><div className="font-black text-sm">{g.goal_area||'Goal draft'}</div><p className="mt-1 text-sm">{g.goal_text}</p>{(g.objectives||[]).length>0&&<div className="mt-2 text-xs"><b>Objectives:</b>{g.objectives.map((o,j)=><div key={j} className="mt-1">{j+1}. {o}</div>)}</div>}<div className="mt-2 text-xs text-slate-500"><b>Baseline:</b> {g.baseline||'—'} · <b>Target:</b> {g.target||g.criterion||'—'}</div></div>)}</div></div>}{(packet.progress_monitoring_recommendations||[]).length>0&&<div className="rounded-xl bg-blue-50 p-3 text-sm"><b>Next data / progress monitoring:</b><div className="mt-1">{packet.progress_monitoring_recommendations.join(' · ')}</div></div>}<div className="text-[11px] font-semibold text-slate-500">Draft for educator/IEP-team review. Reviewing this Para submission does not automatically place the draft language into an IEP.</div></div></div>}
  {n.review_status==='submitted'?<div className="mt-4"><Input placeholder="Optional review note to Para…" value={reviewNotes[n.id]||''} onChange={e=>setReviewNotes({...reviewNotes,[n.id]:e.target.value})}/><div className="mt-3 flex flex-wrap gap-2"><Button onClick={()=>review(n,'reviewed')} className="bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 className="mr-2 h-4 w-4"/>Accept as Reviewed Evidence</Button><Button variant="outline" onClick={()=>review(n,'returned')}><RotateCcw className="mr-2 h-4 w-4"/>Return for Follow-up</Button></div></div>:n.review_note&&<div className="mt-4 rounded-xl border p-3 text-sm"><b>Review note:</b> {n.review_note}</div>}
 </div>};

 return <div className="space-y-6">
  <section className="rounded-2xl border bg-white p-6 shadow-sm">
   <div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600"/><h3 className="font-black">Para Student Access</h3></div>
   <p className="mt-1 text-xs text-slate-500">Assign only students this Para is authorized to support. This assignment also establishes who receives that Para's submitted observations for review.</p>
   <select className="mt-4 w-full max-w-md rounded-lg border p-2 text-sm" value={selectedPara} onChange={e=>{setSelectedPara(e.target.value);setEditingStudent('')}}><option value="">Choose Para account…</option>{paraAccounts.map(u=><option key={u.id} value={u.id}>{u.full_name||u.email}</option>)}</select>
   {selectedPara&&<div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{sortedStudents.map(st=>{const x=assignmentFor(st.id),on=x&&x.active!==false;return <div key={st.id} className={'rounded-xl border p-3 text-sm '+(on?'border-emerald-300 bg-emerald-50':'bg-white')}><button disabled={savingAccess} onClick={()=>updateAssignment(st.id,!on)} className="w-full text-left"><div className="font-bold">{name(st.id)}</div><div className="mt-1 text-xs">{on?'Assigned — click to remove':'Not assigned — click to assign'}</div></button>{on&&<Button size="sm" variant="ghost" className="mt-2 px-0 text-blue-700" onClick={()=>openSupportEditor(st.id)}><Settings2 className="mr-1 h-3.5 w-3.5"/>Support card</Button>}</div>})}</div>}
   {editingStudent&&<div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/40 p-5"><div className="flex items-center gap-2 font-black text-blue-950"><ShieldCheck className="h-4 w-4"/>Support Card · {name(editingStudent)}</div><p className="mt-1 text-xs text-blue-800">Share only the minimum supports the Para needs to implement the student's program.</p><label className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-500">What the Para needs to know</label><Textarea className="mt-1" rows={4} value={supportSummary} onChange={e=>setSupportSummary(e.target.value)} placeholder="Example: Check for understanding after multi-step directions; allow graphic organizer for written responses."/ ><label className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-500">Approved supports · one per line</label><Textarea className="mt-1" rows={5} value={supportsText} onChange={e=>setSupportsText(e.target.value)} placeholder={"Preferential seating\nGraphic organizer\nCheck for understanding"}/><div className="mt-3 flex gap-2"><Button onClick={saveSupports} disabled={savingAccess}>Save Support Card</Button><Button variant="outline" onClick={()=>setEditingStudent('')}>Cancel</Button></div></div>}
   {!paraAccounts.length&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No Para-only accounts were found in this organization.</div>}
  </section>

  <div className="rounded-[28px] bg-slate-950 p-7 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">SPED Evidence Inbox</div><div className="mt-3 flex items-end justify-between gap-4"><div><h2 className="text-3xl font-black">Para observations routed to you.</h2><p className="mt-2 max-w-2xl text-slate-300">Only observations submitted through a student assignment tied to your account appear here.</p></div><div className="rounded-2xl bg-white/10 px-5 py-4 text-center"><div className="text-3xl font-black">{pending.length}</div><div className="text-xs text-slate-300">need review</div></div></div></div>

  <section><div className="mb-3 flex items-center gap-2"><Inbox className="h-5 w-5"/><h3 className="font-black">Needs Review</h3></div><div className="space-y-3">{pending.map(n=><EvidenceCard key={n.id} n={n}/>)}{!pending.length&&<div className="rounded-2xl border border-dashed bg-white p-9 text-center text-sm text-slate-500">You're caught up. No Para observations assigned to you are waiting for review.</div>}</div></section>
  {history.length>0&&<section><div className="mb-3 flex items-center gap-2"><Clock3 className="h-5 w-5"/><h3 className="font-black">Review History</h3></div><div className="space-y-3">{history.slice(0,30).map(n=><EvidenceCard key={n.id} n={n}/>)}</div></section>}
 </div>;
}

import React,{useMemo,useState}from'react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{userDisplayName}from'@/lib/userIdentity';
import{Button}from'@/components/ui/button';
import{Label}from'@/components/ui/label';
import{Card}from'@/components/ui/cards';
import{useToast}from'@/components/ui/use-toast';
import{ShieldCheck,Trash2,FileText}from'lucide-react';
import ExportBar from'@/components/shared/ExportBar';

export default function SpeechIEP(){
 const{user}=useAuth(),{toast}=useToast();const staffName=userDisplayName(user,'Speech provider');
 const{data:students}=useAsync(()=>base44.entities.Student.list('-last_name',500),[]);
 const{data:rows,refetch}=useAsync(()=>base44.entities.SpeechIEPContribution.list('-updated_date',300),[]);
 const[form,setForm]=useState({student_id:'',present_levels:'',strengths:'',needs:'',observations:'',goal_drafts:'',service_recommendation:''});
 const{data:docs}=useAsync(()=>form.student_id?base44.entities.Document.filter({student_id:form.student_id},'-updated_date',100):Promise.resolve([]),[form.student_id]);
 const selected=(students||[]).find(s=>s.id===form.student_id)||null;
 const ieps=useMemo(()=>(docs||[]).filter(d=>d.document_type==='IEP'),[docs]);
 const openIEP=async d=>{try{const r=await base44.functions.invoke('openDocumentUrl',{document_id:d.id}),x=r?.data||r;if(!x?.signed_url)throw Error('Private viewing link unavailable');window.open(x.signed_url,'_blank','noopener,noreferrer')}catch(e){toast({title:'Could not open IEP',description:e.message,variant:'destructive'})}};
 const save=async status=>{
  if(!form.student_id)return toast({title:'Choose a student'});
  const goals=String(form.goal_drafts).split('\n').map(x=>x.trim()).filter(Boolean);
  try{
   await base44.entities.SpeechIEPContribution.create({...form,organization_id:user?.organization_id||user?.data?.organization_id||'',provider_user_id:user.id,goal_drafts:goals,status,submitted_at:status==='submitted'?new Date().toISOString():''});
   await refetch();toast({title:status==='submitted'?'Speech IEP input submitted':'Draft saved'});
  }catch(e){toast({title:'Could not save speech contribution',description:e.message,variant:'destructive'})}
 };
 const remove=async x=>{if(!window.confirm('Delete this speech contribution draft/record?'))return;await base44.entities.SpeechIEPContribution.delete(x.id);await refetch();toast({title:'Speech contribution deleted'})};
 const myRows=(rows||[]).filter(x=>!form.student_id||x.student_id===form.student_id);
 const name=id=>{const s=(students||[]).find(x=>x.id===id);return s?`${s.first_name||''} ${s.last_name||''}`.trim():'Student'};
 const sections=myRows.map(x=>({heading:`${name(x.student_id)} · ${x.status||'draft'}`,body:[
  x.present_levels?`Speech-language present levels:\n${x.present_levels}`:'',
  x.strengths?`Strengths:\n${x.strengths}`:'',
  x.needs?`Needs:\n${x.needs}`:'',
  x.observations?`Observations:\n${x.observations}`:'',
  (x.goal_drafts||[]).length?`Goal drafts:\n${x.goal_drafts.map((g,i)=>`${i+1}. ${g}`).join('\n')}`:'',
  x.service_recommendation?`Service / minutes input:\n${x.service_recommendation}`:''
 ].filter(Boolean).join('\n\n')}));

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Speech</div><h1 className="mt-3 text-3xl font-black">Speech IEP Contribution</h1><p className="mt-2 max-w-3xl text-slate-300">Choose the student first, review that student’s IEP information, then build only the speech-language content you are responsible for.</p></section>
  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><ShieldCheck className="mr-2 inline h-4 w-4"/><b>Team workflow:</b> Speech can draft and submit speech-language input. CaseCue does not silently finalize the full IEP, eligibility, placement, or service decision.</div>

  <Card className="p-6"><Label>Student</Label><select className="mt-2 w-full max-w-xl rounded-lg border p-2" value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}><option value="">Select student first…</option>{(students||[]).map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select></Card>

  {selected&&<div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
   <div className="space-y-4">
    <Card className="p-6"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-700"/><h2 className="font-black">Current Student IEPs</h2></div><p className="mt-1 text-xs text-slate-500">Only documents linked to {selected.first_name} are shown in this view.</p><div className="mt-3 space-y-2">{ieps.map(d=><button key={d.id} onClick={()=>openIEP(d)} className="block w-full rounded-xl border p-3 text-left text-sm hover:bg-slate-50"><b>{d.filename||'IEP document'}</b><div className="text-xs text-slate-500">{d.iep_role||'IEP'} · private view</div></button>)}{!ieps.length&&<div className="rounded-xl border border-dashed p-5 text-sm text-slate-500">No IEP document is linked to this student.</div>}</div></Card>
    <Card className="p-5"><h3 className="font-black">My Contribution History</h3><div className="mt-3 space-y-2">{myRows.map(x=><div key={x.id} className="rounded-xl border p-3 text-sm"><div className="flex items-start justify-between gap-2"><div><b>{name(x.student_id)}</b><div className="text-xs text-slate-500">{x.status||'draft'}{x.submitted_at?` · ${new Date(x.submitted_at).toLocaleDateString()}`:''}</div></div><Button size="icon" variant="ghost" onClick={()=>remove(x)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></div></div>)}{!myRows.length&&<div className="text-sm text-slate-500">No speech contributions saved for this student yet.</div>}</div></Card>
   </div>

   <Card className="p-6"><h2 className="font-black">Build Speech-Language IEP Input</h2><p className="mt-1 text-sm text-slate-500">Draft from your own speech data and professional contribution. The IEP team reviews final language and service decisions.</p><div className="mt-5 space-y-4">{[['present_levels','Speech-language present levels'],['strengths','Strengths'],['needs','Needs'],['observations','Observations / assessment facts'],['goal_drafts','Goal drafts — one per line'],['service_recommendation','Service / minutes input for team review']].map(([k,l])=><div key={k}><Label>{l}</Label><textarea className="min-h-24 w-full rounded-xl border p-3 text-sm" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>)}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>save('draft')}>Save Draft</Button><Button onClick={()=>save('submitted')}>Submit to IEP Team</Button></div></div></Card>
  </div>}
  {selected&&myRows.length>0&&<Card className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-black">Export Speech Contribution</h3><p className="text-xs text-slate-500">Print, PDF, Word, email, or share your contribution record.</p></div><ExportBar title="CaseCue Speech · IEP Contribution" subtitle={`${name(selected.id)} · ${staffName}`} filename="casecue-speech-iep-contribution" sections={sections} banner="CaseCue Speech · DRAFT FOR IEP-TEAM REVIEW · Provider contribution only"/></div></Card>}
 </div>;
}

import React,{useMemo,useState}from'react';
import{Eye,Ear,HeartPulse,Plus,Trash2,Clock3,ClipboardCheck}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{userDisplayName}from'@/lib/userIdentity';
import{useToast}from'@/components/ui/use-toast';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Card}from'@/components/ui/cards';
import ExportBar from'@/components/shared/ExportBar';

const today=()=>new Date().toLocaleDateString('en-CA');
const nowTime=()=>new Date().toTimeString().slice(0,5);
const TYPES=[
 ['health_office_visit','Health Office Visit'],['vision','Vision'],['hearing','Hearing'],['screening','Screening'],
 ['follow_up','Follow-Up'],['evaluation_support','SPED Evaluation Support'],['other','Other']
];
const typeLabel=v=>TYPES.find(x=>x[0]===v)?.[1]||v||'Record';

export default function NurseHome(){
 const{user}=useAuth(),{toast}=useToast();const staffName=userDisplayName(user,'School nurse');
 const{data:students}=useAsync(()=>base44.entities.Student.list('-last_name',600),[]);
 const{data:rows,refetch}=useAsync(()=>base44.entities.NurseRecord.list('-date',500),[]);
 const[mode,setMode]=useState('school');
 const[f,setF]=useState({student_id:'',date:today(),time:nowTime(),record_type:'health_office_visit',observed_result:'',follow_up:'',objective_note:'',status:'complete'});
 const[saving,setSaving]=useState(false);
 const name=id=>{const s=(students||[]).find(x=>x.id===id);return s?`${s.first_name||''} ${s.last_name||''}`.trim():'Student'};
 const filtered=useMemo(()=>mode==='sped'?(rows||[]).filter(r=>['vision','hearing','screening','evaluation_support'].includes(r.record_type)):(rows||[]),[rows,mode]);
 const save=async()=>{
  if(!f.observed_result.trim()&&!f.objective_note.trim())return toast({title:'Add an observed result or objective note'});
  setSaving(true);
  try{
   await base44.entities.NurseRecord.create({...f,organization_id:user?.organization_id||user?.data?.organization_id||'',provider_user_id:user.id,student_name_snapshot:f.student_id?name(f.student_id):'',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
   setF({student_id:'',date:today(),time:nowTime(),record_type:mode==='sped'?'evaluation_support':'health_office_visit',observed_result:'',follow_up:'',objective_note:'',status:'complete'});
   await refetch();toast({title:'Nurse record saved'});
  }catch(e){toast({title:'Could not save record',description:e.message,variant:'destructive'})}
  finally{setSaving(false)}
 };
 const remove=async r=>{if(!window.confirm('Delete this nurse record?'))return;await base44.entities.NurseRecord.delete(r.id);await refetch();toast({title:'Record deleted'})};
 const sections=filtered.map(r=>({heading:`${r.date} · ${r.student_name_snapshot||name(r.student_id)||'Student'} · ${typeLabel(r.record_type)}`,body:[r.time?`Time: ${r.time}`:'',r.observed_result?`Observed result: ${r.observed_result}`:'',r.objective_note?`Objective note: ${r.objective_note}`:'',r.follow_up?`Follow-up: ${r.follow_up}`:''].filter(Boolean).join('\n')}));
 const todayRows=(rows||[]).filter(r=>r.date===today());
 const openCount=(rows||[]).filter(r=>r.status==='open').length;

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Nurse</div><h1 className="mt-3 text-3xl font-black">Health office today. Evaluation support when needed.</h1><p className="mt-2 max-w-3xl text-slate-300">School health documentation and objective screening records saved securely to your CaseCue account — not just this browser.</p></section>
  <div className="grid gap-3 sm:grid-cols-3"><Card className="p-5"><HeartPulse className="h-5 w-5 text-rose-600"/><div className="mt-3 text-3xl font-black">{todayRows.length}</div><div className="text-xs text-slate-500">Records today</div></Card><Card className="p-5"><ClipboardCheck className="h-5 w-5 text-blue-700"/><div className="mt-3 text-3xl font-black">{(rows||[]).length}</div><div className="text-xs text-slate-500">Records saved</div></Card><Card className="p-5"><Clock3 className="h-5 w-5 text-amber-700"/><div className="mt-3 text-3xl font-black">{openCount}</div><div className="text-xs text-slate-500">Follow-up open</div></Card></div>
  <div className="grid gap-3 sm:grid-cols-2"><button onClick={()=>{setMode('school');setF(x=>({...x,record_type:'health_office_visit'}))}} className={"rounded-2xl border p-5 text-left "+(mode==='school'?'border-blue-500 bg-blue-50':'bg-white')}><HeartPulse className="h-5 w-5"/><b className="mt-2 block">School Nurse</b><p className="text-sm text-slate-500">Visits, screenings and follow-up.</p></button><button onClick={()=>{setMode('sped');setF(x=>({...x,record_type:'evaluation_support'}))}} className={"rounded-2xl border p-5 text-left "+(mode==='sped'?'border-blue-500 bg-blue-50':'bg-white')}><Eye className="h-5 w-5"/><b className="mt-2 block">SPED Evaluation Support</b><p className="text-sm text-slate-500">Vision/hearing and objective evaluation-team information.</p></button></div>
  <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
   <Card className="p-6"><h2 className="font-black">{mode==='sped'?'Evaluation Screening / Contribution':'Health Office Record'}</h2><div className="mt-4 space-y-3"><select className="w-full rounded-lg border p-2 text-sm" value={f.student_id} onChange={e=>setF({...f,student_id:e.target.value})}><option value="">Choose student (optional for general office record)…</option>{(students||[]).map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select><div className="grid grid-cols-2 gap-2"><Input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><Input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></div><select className="w-full rounded-lg border p-2" value={f.record_type} onChange={e=>setF({...f,record_type:e.target.value})}>{TYPES.filter(([v])=>mode==='sped'?['vision','hearing','screening','evaluation_support'].includes(v):true).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><Input placeholder="Observed result" value={f.observed_result} onChange={e=>setF({...f,observed_result:e.target.value})}/><textarea className="min-h-28 w-full rounded-xl border p-3 text-sm" placeholder="Objective note — observed facts only" value={f.objective_note} onChange={e=>setF({...f,objective_note:e.target.value})}/><Input placeholder="Follow-up / action" value={f.follow_up} onChange={e=>setF({...f,follow_up:e.target.value})}/><select className="w-full rounded-lg border p-2" value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option value="complete">Complete</option><option value="open">Follow-up open</option></select><Button className="w-full" onClick={save} disabled={saving}><Plus className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save Record'}</Button></div></Card>
   <div className="space-y-4"><Card className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex gap-2"><Eye className="h-5 w-5 text-blue-600"/><Ear className="h-5 w-5 text-violet-600"/></div><h2 className="mt-2 font-black">{mode==='sped'?'Screening / Evaluation Support Record':'Health Office Record'}</h2></div><ExportBar title={mode==='sped'?'CaseCue Nurse · Evaluation Support Record':'CaseCue Nurse · Health Office Record'} subtitle={staffName} filename={mode==='sped'?'casecue-nurse-evaluation-support':'casecue-nurse-health-record'} sections={sections} banner="CaseCue Nurse · Authorized school use · Verify all entries before official use"/></div></Card><div className="space-y-3">{filtered.slice(0,60).map(r=><Card key={r.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{r.student_name_snapshot||name(r.student_id)||'General record'} · {typeLabel(r.record_type)}</div><div className="mt-1 text-xs text-slate-500">{r.date}{r.time?` · ${r.time}`:''}{r.status==='open'?' · Follow-up open':''}</div></div><Button size="icon" variant="ghost" onClick={()=>remove(r)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></div>{r.observed_result&&<div className="mt-3 text-sm"><b>Observed result:</b> {r.observed_result}</div>}{r.objective_note&&<p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.objective_note}</p>}{r.follow_up&&<div className="mt-2 text-sm"><b>Follow-up:</b> {r.follow_up}</div>}</Card>)}{!filtered.length&&<Card className="p-10 text-center text-sm text-slate-500">No records in this view yet.</Card>}</div></div>
  </div>
  {mode==='sped'&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm"><b>Evaluation-team contribution:</b> record observed screening results only. CaseCue does not infer diagnosis or eligibility from a screening.</div>}
 </div>;
}

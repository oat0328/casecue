import React,{useMemo,useState}from'react';
import{Activity,Plus,Trash2,Clock3,Target}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Card}from'@/components/ui/cards';
import ExportBar from'@/components/shared/ExportBar';
import WorkspaceTimer from'@/components/shared/WorkspaceTimer';
import{PremiumLineChart,PremiumDonutChart}from'@/components/shared/PremiumAnalytics';

const today=()=>new Date().toLocaleDateString('en-CA');
const SUPPORTS=['Independent','Visual prompt','Verbal prompt','Gestural prompt','Modeling','Partial physical assistance','Physical assistance'];
const SKILLS=['Fine motor','Handwriting','Visual motor','Sensory regulation','Self-care / ADL','Executive function','Functional school task','Other'];

export default function OTHome(){
 const{user}=useAuth(),{toast}=useToast();
 const{data:students}=useAsync(()=>base44.entities.Student.list('-last_name',500),[]);
 const{data:allSessions,refetch}=useAsync(()=>base44.entities.SessionRecord.filter({service_type:'occupational_therapy'},'-date',500),[]);
 const sessions=useMemo(()=>allSessions||[],[allSessions]);
 const[f,setF]=useState({student_id:'',date:today(),activity:'Fine motor',scheduled_minutes:'30',delivered_minutes:'30',independence:'50',support:'Independent',qualitative:''});
 const[saving,setSaving]=useState(false);
 const name=id=>{const s=(students||[]).find(x=>x.id===id);return s?`${s.first_name} ${s.last_name}`:'Student'};
 const save=async()=>{
  if(!f.student_id)return toast({title:'Choose a student'});
  setSaving(true);
  try{
   await base44.entities.SessionRecord.create({
    student_id:f.student_id,date:f.date,provider:user?.full_name||user?.email||'OT provider',
    service_type:'occupational_therapy',delivery:'individual',setting:'pull_out',location:'',activity:f.activity,
    scheduled_minutes:Number(f.scheduled_minutes||0),delivered_minutes:Number(f.delivered_minutes||0),duration_minutes:Number(f.delivered_minutes||0),
    status:'completed',quantitative:{independence_percent:Number(f.independence||0),support_level:f.support},qualitative:f.qualitative,
    organization_id:user?.organization_id||user?.data?.organization_id||''
   });
   setF(x=>({...x,student_id:'',activity:'Fine motor',scheduled_minutes:'30',delivered_minutes:'30',independence:'50',support:'Independent',qualitative:''}));
   await refetch();toast({title:'OT session saved'});
  }catch(e){toast({title:'Could not save OT session',description:e.message,variant:'destructive'})}
  finally{setSaving(false)}
 };
 const remove=async r=>{if(!window.confirm('Delete this OT session record?'))return;await base44.entities.SessionRecord.delete(r.id);await refetch();toast({title:'OT session deleted'})};
 const sections=sessions.map(r=>({heading:`${r.date} · ${name(r.student_id)} · ${r.activity||'OT Session'}`,body:[`Minutes: ${r.delivered_minutes||r.duration_minutes||0}`,`Independent: ${r.quantitative?.independence_percent??'—'}%`,r.quantitative?.support_level?`Support: ${r.quantitative.support_level}`:'',r.qualitative||''].filter(Boolean).join('\n')}));
 const totalMinutes=sessions.reduce((n,r)=>n+Number(r.delivered_minutes||r.duration_minutes||0),0);
 const trend=[...sessions].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-12).map(r=>({name:String(r.date||'').slice(5),independence:Number(r.quantitative?.independence_percent||0),minutes:Number(r.delivered_minutes||r.duration_minutes||0)}));
 const supportMap={};for(const r of sessions){const k=r.quantitative?.support_level||'Not recorded';supportMap[k]=(supportMap[k]||0)+1}const supportData=Object.entries(supportMap).map(([name,value])=>({name,value}));
 const avg=sessions.length?Math.round(sessions.reduce((n,r)=>n+Number(r.quantitative?.independence_percent||0),0)/sessions.length):0;

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue OT</div><h1 className="mt-3 text-3xl font-black">Run the session. Capture the function. Keep the data usable.</h1><p className="mt-2 max-w-3xl text-slate-300">School-based OT sessions, minutes, assistance levels, independence data, notes, exports, and schedule tools — saved to the account, not the browser.</p></section>
  <div className="grid gap-3 sm:grid-cols-3"><Card className="p-5"><Activity className="h-5 w-5 text-blue-700"/><div className="mt-3 text-3xl font-black">{sessions.length}</div><div className="text-xs text-slate-500">Sessions</div></Card><Card className="p-5"><Clock3 className="h-5 w-5 text-emerald-700"/><div className="mt-3 text-3xl font-black">{totalMinutes}</div><div className="text-xs text-slate-500">Minutes delivered</div></Card><Card className="p-5"><Target className="h-5 w-5 text-violet-700"/><div className="mt-3 text-3xl font-black">{avg}%</div><div className="text-xs text-slate-500">Average independence</div></Card></div>
  <div className="grid gap-4 lg:grid-cols-2"><PremiumLineChart title="Independence & Service Trend" subtitle="Saved OT session independence and delivered minutes over time." data={trend} keys={[{key:'independence',label:'Independence %',color:'#2563eb'},{key:'minutes',label:'Minutes',color:'#059669'}]} area/><PremiumDonutChart title="Support Level Mix" subtitle="How much support was documented across OT sessions." data={supportData} centerLabel={sessions.length}/></div>
  <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
   <div className="space-y-4"><WorkspaceTimer workspaceKey="ot"/><Card className="p-6"><h2 className="font-black">Quick OT Session</h2><div className="mt-4 space-y-3"><select className="w-full rounded-lg border p-2" value={f.student_id} onChange={e=>setF({...f,student_id:e.target.value})}><option value="">Choose student…</option>{(students||[]).map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select><select className="w-full rounded-lg border p-2" value={f.activity} onChange={e=>setF({...f,activity:e.target.value})}>{SKILLS.map(x=><option key={x}>{x}</option>)}</select><div className="grid grid-cols-2 gap-2"><Input type="number" min="0" placeholder="Scheduled minutes" value={f.scheduled_minutes} onChange={e=>setF({...f,scheduled_minutes:e.target.value})}/><Input type="number" min="0" placeholder="Delivered minutes" value={f.delivered_minutes} onChange={e=>setF({...f,delivered_minutes:e.target.value})}/></div><div className="grid grid-cols-2 gap-2"><Input type="number" min="0" max="100" placeholder="% independent" value={f.independence} onChange={e=>setF({...f,independence:e.target.value})}/><select className="rounded-lg border p-2" value={f.support} onChange={e=>setF({...f,support:e.target.value})}>{SUPPORTS.map(x=><option key={x}>{x}</option>)}</select></div><Input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/><textarea className="min-h-28 w-full rounded-xl border p-3 text-sm" placeholder="Objective session note: task, assistance, performance, response…" value={f.qualitative} onChange={e=>setF({...f,qualitative:e.target.value})}/><Button className="w-full" onClick={save} disabled={saving}><Plus className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save Session'}</Button></div></Card></div>
   <div className="space-y-4"><Card className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-black">OT Session Record</h2><p className="text-xs text-slate-500">Print, PDF, Word, email, share, or keep using the live record.</p></div><ExportBar title="CaseCue OT Session Record" subtitle={user?.full_name||user?.email||'OT provider'} filename="casecue-ot-session-record" sections={sections} banner="CaseCue OT · School-based service record · Review before official use"/></div></Card><div className="space-y-3">{sessions.slice(0,40).map(r=><Card key={r.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{name(r.student_id)} · {r.activity||'OT Session'}</div><div className="mt-1 text-xs text-slate-500">{r.date} · {r.delivered_minutes||r.duration_minutes||0} min · {r.quantitative?.independence_percent??'—'}% independent</div></div><Button size="icon" variant="ghost" onClick={()=>remove(r)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></div>{r.quantitative?.support_level&&<div className="mt-3 text-xs font-bold text-blue-700">Support: {r.quantitative.support_level}</div>}{r.qualitative&&<p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.qualitative}</p>}</Card>)}{!sessions.length&&<Card className="p-10 text-center text-sm text-slate-500">No OT sessions recorded yet.</Card>}</div></div>
  </div>
 </div>;
}

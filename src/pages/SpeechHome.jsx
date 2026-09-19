import React,{useState}from'react';
import{Link}from'react-router-dom';
import{Mic2,Clock3,FileText,Target,Plus,Trash2}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{userDisplayName}from'@/lib/userIdentity';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card}from'@/components/ui/cards';
import{useToast}from'@/components/ui/use-toast';
import ExportBar from'@/components/shared/ExportBar';
import WorkspaceTimer from'@/components/shared/WorkspaceTimer';
import{PremiumLineChart,PremiumDonutChart}from'@/components/shared/PremiumAnalytics';
import AnalyticsPdfButton from'@/components/shared/AnalyticsPdfButton';

const day=()=>new Date().toLocaleDateString('en-CA');
const pct=(c,t)=>Number(t)>0?Math.round((Number(c||0)/Number(t))*1000)/10:null;

export default function SpeechHome(){
 const{user}=useAuth(),{toast}=useToast();const staffName=userDisplayName(user,'Speech provider');
 const{data:students}=useAsync(()=>base44.entities.Student.list('-last_name',500),[]);
 const{data:sessions,refetch}=useAsync(()=>base44.entities.SpeechSession.list('-date',500),[]);
 const[form,setForm]=useState({student_id:'',date:day(),minutes:'',delivery:'individual',skill:'',trials_correct:'',trials_total:'',cueing:'',observation:''});
 const[saving,setSaving]=useState(false);
 const name=id=>{const s=(students||[]).find(x=>x.id===id);return s?`${s.first_name||''} ${s.last_name||''}`.trim():'Student'};
 const save=async()=>{
  if(!form.student_id)return toast({title:'Choose a student'});
  const correct=Number(form.trials_correct||0),total=Number(form.trials_total||0);
  if(total<0||correct<0||correct>total)return toast({title:'Check the trial counts',description:'Correct trials cannot be greater than total trials.',variant:'destructive'});
  setSaving(true);
  try{
   await base44.entities.SpeechSession.create({...form,organization_id:user?.organization_id||user?.data?.organization_id||'',provider_user_id:user.id,minutes:Number(form.minutes||0),trials_correct:correct,trials_total:total,status:'complete'});
   setForm(x=>({...x,minutes:'',skill:'',trials_correct:'',trials_total:'',cueing:'',observation:''}));
   await refetch();toast({title:'Speech session saved'});
  }catch(e){toast({title:'Could not save speech session',description:e.message,variant:'destructive'})}
  finally{setSaving(false)}
 };
 const remove=async r=>{if(!window.confirm('Delete this speech session record?'))return;await base44.entities.SpeechSession.delete(r.id);await refetch();toast({title:'Speech session deleted'})};
 const totalMinutes=(sessions||[]).reduce((n,x)=>n+Number(x.minutes||0),0);
 const valid=(sessions||[]).filter(x=>Number(x.trials_total)>0);
 const overallTrials=valid.reduce((a,x)=>({c:a.c+Number(x.trials_correct||0),t:a.t+Number(x.trials_total||0)}),{c:0,t:0});
 const overallPct=pct(overallTrials.c,overallTrials.t);
 const trend=[...(sessions||[])].filter(x=>Number(x.trials_total)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-12).map(x=>({name:String(x.date||'').slice(5),accuracy:pct(x.trials_correct,x.trials_total),minutes:Number(x.minutes||0)}));
 const deliveryData=['individual','group'].map(k=>({name:k==='individual'?'Individual':'Group',value:(sessions||[]).filter(x=>(x.delivery||'individual')===k).length}));
 const sections=(sessions||[]).map(x=>({heading:`${x.date} · ${name(x.student_id)} · ${x.skill||'Speech session'}`,body:[`Minutes: ${x.minutes||0}`,`Delivery: ${x.delivery||'individual'}`,Number(x.trials_total)>0?`Trials: ${x.trials_correct||0}/${x.trials_total} (${pct(x.trials_correct,x.trials_total)}%)`:'',x.cueing?`Cueing / support: ${x.cueing}`:'',x.observation?`Observation: ${x.observation}`:''].filter(Boolean).join('\n')}));

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Speech</div><h1 className="mt-3 text-3xl font-black">Treat. Measure. Hand the team clean speech data.</h1><p className="mt-2 max-w-3xl text-slate-300">Sessions, trials, minutes, cueing, observations, exports, notes, and speech-language IEP input in one focused workspace.</p><Link to="/w/speech/iep"><Button className="mt-5 bg-white text-slate-950"><FileText className="mr-2 h-4 w-4"/>IEP & Speech Input</Button></Link></section>
  <div className="grid gap-3 sm:grid-cols-4"><Card className="p-5"><Mic2 className="h-5 w-5 text-blue-600"/><div className="mt-3 text-3xl font-black">{(sessions||[]).length}</div><div className="text-xs text-slate-500">Sessions</div></Card><Card className="p-5"><Clock3 className="h-5 w-5 text-emerald-600"/><div className="mt-3 text-3xl font-black">{totalMinutes}</div><div className="text-xs text-slate-500">Minutes</div></Card><Card className="p-5"><Target className="h-5 w-5 text-violet-600"/><div className="mt-3 text-3xl font-black">{new Set((sessions||[]).map(x=>x.student_id)).size}</div><div className="text-xs text-slate-500">Students served</div></Card><Card className="p-5"><Target className="h-5 w-5 text-amber-600"/><div className="mt-3 text-3xl font-black">{overallPct==null?'—':`${overallPct}%`}</div><div className="text-xs text-slate-500">Trial accuracy</div></Card></div>
  <div className="flex justify-end"><AnalyticsPdfButton title="CaseCue Speech Analytics" subtitle={staffName} filename="casecue-speech-analytics" metrics={[{label:'Sessions',value:(sessions||[]).length},{label:'Minutes',value:totalMinutes},{label:'Students served',value:new Set((sessions||[]).map(x=>x.student_id)).size},{label:'Trial accuracy',value:overallPct==null?'—':`${overallPct}%`}]} charts={[{type:'line',title:'Speech Progress Trend',subtitle:'Trial accuracy and delivered minutes from saved speech sessions.',data:trend,series:[{key:'accuracy',label:'Accuracy %'},{key:'minutes',label:'Minutes'}]},{type:'donut',title:'Session Delivery Mix',subtitle:'Real saved individual and group speech sessions.',data:deliveryData}]} notes={['Provider session data only. Review trends before using them in an IEP or progress report.']}/></div>
  <div className="grid gap-4 lg:grid-cols-2"><PremiumLineChart title="Speech Progress Trend" subtitle="Trial accuracy and delivered minutes from saved speech sessions." data={trend} keys={[{key:'accuracy',label:'Accuracy %',color:'#2563eb'},{key:'minutes',label:'Minutes',color:'#7c3aed'}]} area/><PremiumDonutChart title="Session Delivery Mix" subtitle="Real saved individual and group speech sessions." data={deliveryData} centerLabel={(sessions||[]).length}/></div>
  <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
   <div className="space-y-4"><WorkspaceTimer workspaceKey="speech"/><Card className="p-6"><h2 className="font-black">Quick Speech Session</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><div><Label>Student</Label><select className="w-full rounded-lg border p-2 text-sm" value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}><option value="">Select student…</option>{(students||[]).map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select></div><div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div><div><Label>Minutes</Label><Input type="number" min="0" value={form.minutes} onChange={e=>setForm({...form,minutes:e.target.value})}/></div><div><Label>Delivery</Label><select className="w-full rounded-lg border p-2 text-sm" value={form.delivery} onChange={e=>setForm({...form,delivery:e.target.value})}><option value="individual">Individual</option><option value="group">Group</option></select></div><div className="md:col-span-2"><Label>Skill / target</Label><Input value={form.skill} onChange={e=>setForm({...form,skill:e.target.value})} placeholder="Articulation, fluency, language, AAC, pragmatic language…"/></div><div><Label>Correct trials</Label><Input type="number" min="0" value={form.trials_correct} onChange={e=>setForm({...form,trials_correct:e.target.value})}/></div><div><Label>Total trials</Label><Input type="number" min="0" value={form.trials_total} onChange={e=>setForm({...form,trials_total:e.target.value})}/></div><div><Label>Cueing / support</Label><Input value={form.cueing} onChange={e=>setForm({...form,cueing:e.target.value})}/></div><div><Label>Observed response</Label><Input value={form.observation} onChange={e=>setForm({...form,observation:e.target.value})}/></div></div><Button className="mt-5 w-full" onClick={save} disabled={saving}><Plus className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save Session'}</Button></Card></div>
   <div className="space-y-4"><Card className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-black">Speech Session Record</h2><p className="text-xs text-slate-500">Print, export, email, or share your own session record.</p></div><ExportBar title="CaseCue Speech Session Record" subtitle={staffName} filename="casecue-speech-session-record" sections={sections} banner="CaseCue Speech · Provider session record · Review before official use"/></div></Card><div className="space-y-3">{(sessions||[]).slice(0,60).map(x=><Card key={x.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{name(x.student_id)} · {x.skill||'Speech session'}</div><div className="mt-1 text-xs text-slate-500">{x.date} · {x.minutes||0} min · {x.delivery||'individual'}{Number(x.trials_total)>0?` · ${x.trials_correct||0}/${x.trials_total} (${pct(x.trials_correct,x.trials_total)}%)`:''}</div></div><Button size="icon" variant="ghost" onClick={()=>remove(x)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></div>{x.cueing&&<div className="mt-3 text-xs font-bold text-blue-700">Cueing / support: {x.cueing}</div>}{x.observation&&<p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{x.observation}</p>}</Card>)}{!(sessions||[]).length&&<Card className="p-10 text-center text-sm text-slate-500">No speech sessions recorded yet.</Card>}</div></div>
  </div>
 </div>;
}

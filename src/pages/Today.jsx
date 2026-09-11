import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, CheckCircle2, FileText, Users, Clock3, ClipboardList, Sparkles, Upload, Camera, ArrowRight, Target, ListTodo } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

function toDate(value){ if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return null; const d=new Date(`${value}T00:00:00`); if(Number.isNaN(d.getTime())||d.getFullYear()<2020||d.getFullYear()>2100) return null; return d; }
function isToday(value){ const d=toDate(value); if(!d) return false; const n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); }
function daysUntil(value){ const d=toDate(value); if(!d) return null; const n=new Date(); n.setHours(0,0,0,0); d.setHours(0,0,0,0); return Math.round((d-n)/86400000); }

export default function Today(){
  const navigate=useNavigate();
  const { user }=useAuth();
  const {data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',200),[]);
  const {data:goals}=useAsync(()=>base44.entities.Goal.list('-updated_date',300),[]);
  const {data:progress}=useAsync(()=>base44.entities.ProgressData.list('-date',400),[]);
  const {data:sessions}=useAsync(()=>base44.entities.SessionRecord.list('-date',300),[]);
  const {data:meetings}=useAsync(()=>base44.entities.Meeting.filter({status:'scheduled'},'date',100),[]);
  const {data:tasks}=useAsync(()=>base44.entities.Task.list('-updated_date',200),[]);

  const studentMap=useMemo(()=>new Map((students||[]).map(s=>[s.id,s])),[students]);
  const todaySessions=useMemo(()=>(sessions||[]).filter(s=>isToday(s.date)),[sessions]);
  const completed=todaySessions.filter(s=>['completed','partially_completed','makeup_session'].includes(s.status));
  const noteNeeded=todaySessions.filter(s=>['completed','partially_completed','makeup_session'].includes(s.status)&&!(s.notes||s.qualitative||s.session_notes));
  const upcoming=useMemo(()=>(meetings||[]).filter(m=>{const d=daysUntil(m.date);return d!==null&&d>=0&&d<=45;}).slice(0,4),[meetings]);

  const actionItems=useMemo(()=>{
    const out=[];
    noteNeeded.slice(0,2).forEach(s=>{const st=studentMap.get(s.student_id);out.push({title:'Complete session notes',detail:`${st?`${st.first_name} ${st.last_name}`:'Student'}${s.date?` · ${s.date}`:''}`,path:'/session-tracker'});});
    (students||[]).forEach(st=>{if(out.length>=5)return;const d=daysUntil(st.annual_review_due);if(d!==null&&d>=0&&d<=30)out.push({title:'Prepare for IEP meeting',detail:`${st.first_name} ${st.last_name} · due in ${d} day${d===1?'':'s'}`,path:'/meeting-navigator'});});
    (goals||[]).forEach(g=>{if(out.length>=5)return;const pts=(progress||[]).filter(p=>p.goal_id===g.id);if(!pts.length){const st=studentMap.get(g.student_id);out.push({title:'Collect progress data',detail:`${st?`${st.first_name} ${st.last_name}`:'Student'} · ${g.goal_area||'Goal'}`,path:'/data-center'});}});
    (tasks||[]).filter(t=>t.status==='open').slice(0,5-out.length).forEach(t=>out.push({title:t.title,detail:t.due_date?`Due ${t.due_date}`:'Open task',path:'/app'}));
    return out.slice(0,5);
  },[noteNeeded,students,goals,progress,tasks,studentMap]);

  const studentGlance=useMemo(()=>(students||[]).slice(0,5).map(st=>{
    const pts=(progress||[]).filter(p=>p.student_id===st.id&&typeof p.percentage==='number').slice(0,5);
    const pct=pts.length?Math.round(pts.reduce((a,p)=>a+Number(p.percentage||0),0)/pts.length):null;
    return {...st,pct};
  }),[students,progress]);

  const primaryGoal=useMemo(()=>{const goal=(goals||[])[0];if(!goal)return null;const pts=(progress||[]).filter(p=>p.goal_id===goal.id&&typeof p.percentage==='number').slice(-8);const st=studentMap.get(goal.student_id);const current=pts.length?Math.round(Number(pts[pts.length-1].percentage)):null;return{goal,pts,st,current};},[goals,progress,studentMap]);

  const name=user?.full_name?.split(' ')[0]||'Teacher';
  const iepsDue=(students||[]).filter(st=>{const d=daysUntil(st.annual_review_due);return d!==null&&d>=0&&d<=45;}).length;

  return <div className="space-y-5">
    <section className="rounded-[28px] bg-gradient-to-br from-[#0a1220] via-[#111b31] to-[#18264b] px-6 py-7 sm:px-8 sm:py-8 text-white shadow-xl shadow-slate-950/10 overflow-hidden relative">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"/>
      <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
        <div><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Today / Autopilot</div><h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Good morning, {name}.</h1><p className="mt-2 max-w-2xl text-slate-300">Your prioritized caseload command center — deadlines, sessions, progress monitoring, evidence, and meeting prep in one place.</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{[[todaySessions.length,'Sessions today'],[completed.length,'Completed'],[noteNeeded.length,'Need notes'],[(students||[]).length,'Students']].map(([v,l])=><div key={l} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><div className="text-2xl font-black">{v}</div><div className="text-[11px] text-slate-400">{l}</div></div>)}</div>
      </div>
    </section>

    <section className="grid xl:grid-cols-[1.15fr_.85fr_.8fr] gap-4">
      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm"><div className="flex items-center justify-between px-5 py-4 border-b"><div><h2 className="font-black text-lg">Today’s schedule</h2><p className="text-xs text-slate-500 mt-0.5">Sessions from your live CaseCue records</p></div><button className="text-sm font-semibold text-blue-600" onClick={()=>navigate('/schedule')}>View calendar</button></div><div className="divide-y">{todaySessions.length?todaySessions.slice(0,6).map((s,i)=>{const st=studentMap.get(s.student_id);const done=['completed','partially_completed','makeup_session'].includes(s.status);return <div key={s.id||i} className="px-5 py-3 flex items-center gap-3"><div className="w-16 text-xs font-semibold text-slate-500">{s.start_time||'Today'}</div><div className={`h-8 w-8 rounded-full flex items-center justify-center ${done?'bg-emerald-100 text-emerald-700':'bg-blue-50 text-blue-600'}`}>{done?<CheckCircle2 className="h-4 w-4"/>:<Clock3 className="h-4 w-4"/>}</div><div className="min-w-0 flex-1"><div className="font-semibold text-sm truncate">{s.activity||s.service_type||'Student session'}</div><div className="text-xs text-slate-500 truncate">{st?`${st.first_name} ${st.last_name}`:'Student'}</div></div><Button size="sm" variant="outline" onClick={()=>navigate('/session-tracker')}>{done?'View':'Start'}</Button></div>}):<div className="p-8 text-center text-sm text-slate-500">No sessions logged for today yet.</div>}</div></Card>

      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm"><div className="flex items-center justify-between px-5 py-4 border-b"><div><h2 className="font-black text-lg">Students at a glance</h2><p className="text-xs text-slate-500 mt-0.5">Recent progress by student</p></div><button className="text-sm font-semibold text-blue-600" onClick={()=>navigate('/students')}>View all</button></div><div className="divide-y">{studentGlance.length?studentGlance.map(st=><button key={st.id} onClick={()=>navigate(`/students/${st.id}`)} className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-slate-50"><div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600">{(st.first_name?.[0]||'')+(st.last_name?.[0]||'')}</div><div className="min-w-0 flex-1"><div className="font-semibold text-sm truncate">{st.first_name} {st.last_name}</div><div className="text-xs text-slate-500">Grade {st.grade||'—'} · {st.eligibility_category||'Eligibility not entered'}</div></div><div className="w-20"><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width:`${Math.max(0,Math.min(100,st.pct??0))}%`}}/></div><div className="text-[11px] text-slate-500 mt-1 text-right">{st.pct==null?'No data':`${st.pct}%`}</div></div></button>):<div className="p-8 text-center text-sm text-slate-500">Add a student to begin.</div>}</div></Card>

      <div className="space-y-4"><Card className="p-0 overflow-hidden border-slate-200 shadow-sm"><div className="px-5 py-4 border-b"><h2 className="font-black text-lg flex items-center gap-2">Action items <span className="inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full bg-rose-500 text-white text-xs">{actionItems.length}</span></h2></div><div className="divide-y">{actionItems.length?actionItems.map((a,i)=><button key={`${a.title}-${i}`} onClick={()=>navigate(a.path)} className="w-full px-5 py-3 flex gap-3 text-left hover:bg-slate-50"><div className="h-5 w-5 rounded border border-slate-300 mt-0.5"/><div><div className="font-semibold text-sm">{a.title}</div><div className="text-xs text-slate-500 mt-0.5">{a.detail}</div></div></button>):<div className="p-6 text-sm text-slate-500 text-center">No urgent action items.</div>}</div></Card>
      <Card className="p-5 border-slate-200 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black text-lg">Upcoming meetings</h2><button className="text-sm font-semibold text-blue-600" onClick={()=>navigate('/meetings')}>View all</button></div><div className="mt-4 space-y-3">{upcoming.length?upcoming.map(m=>{const st=studentMap.get(m.student_id);return <div key={m.id} className="flex gap-3 items-center"><div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center"><CalendarClock className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{m.title||m.meeting_type||'IEP Meeting'}</div><div className="text-xs text-slate-500">{st?`${st.first_name} ${st.last_name} · `:''}{m.date}</div></div></div>}):<div className="text-sm text-slate-500">No meetings scheduled in the next 45 days.</div>}</div></Card></div>
    </section>

    <section className="grid xl:grid-cols-[1fr_1fr_.75fr] gap-4">
      <Card className="p-5 border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-4"><div><h2 className="font-black text-lg">Goal progress</h2><p className="text-xs text-slate-500">Connected to approved progress data</p></div><button className="text-sm font-semibold text-blue-600" onClick={()=>navigate('/data-center')}>View all goals</button></div>{primaryGoal?<div className="grid grid-cols-[1fr_130px] gap-4 items-end"><div className="h-44 rounded-2xl bg-slate-50 border p-4 flex items-end gap-2">{primaryGoal.pts.length?primaryGoal.pts.map((p,i)=><div key={i} className="flex-1 flex flex-col justify-end"><div className="rounded-t bg-gradient-to-t from-blue-600 to-sky-400 min-h-1" style={{height:`${Math.max(4,Math.min(100,Number(p.percentage||0)))}%`}}/><div className="text-[9px] text-slate-400 mt-1 truncate">{p.date?.slice(5)}</div></div>):<div className="m-auto text-sm text-slate-500">No progress data yet.</div>}</div><div className="space-y-2"><div className="rounded-xl bg-blue-50 p-3"><div className="text-xs text-slate-500">Current</div><div className="text-2xl font-black text-blue-700">{primaryGoal.current==null?'—':`${primaryGoal.current}%`}</div></div><div className="rounded-xl bg-emerald-50 p-3"><div className="text-xs font-bold text-emerald-800">Evidence connected</div><div className="mt-1 text-xl font-black text-emerald-700">{primaryGoal.pts.length}</div></div></div></div>:<div className="py-10 text-center text-sm text-slate-500">Add an IEP goal to begin tracking progress.</div>}</Card>

      <Card className="p-5 border-slate-200 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-black text-lg">Caseload readiness</h2><p className="text-xs text-slate-500">What needs attention next</p></div></div><div className="mt-5 grid grid-cols-2 gap-3">{[[iepsDue,'IEPs due soon',CalendarClock],[noteNeeded.length,'Notes needed',FileText],[(tasks||[]).filter(t=>t.status==='open').length,'Open tasks',ListTodo],[(goals||[]).filter(g=>!g.baseline).length,'Missing baselines',Target]].map(([v,l,Icon])=><div key={l} className="rounded-2xl bg-slate-50 border p-4"><Icon className="h-4 w-4 text-blue-600"/><div className="mt-3 text-2xl font-black">{v}</div><div className="text-xs text-slate-500">{l}</div></div>)}</div></Card>

      <Card className="p-5 border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 shadow-sm"><div className="flex items-center gap-2 text-blue-800"><Sparkles className="h-5 w-5"/><h2 className="font-black text-lg">Quick start</h2></div><p className="text-sm text-slate-600 mt-1 mb-4">Jump into a common workflow.</p><div className="grid grid-cols-2 gap-2">{[['Upload an IEP',Upload,'/iep-studio'],['Scan a data sheet',Camera,'/data-center'],['Monitor goals',Target,'/progress-monitoring-day'],['Upload student work',FileText,'/evidence-vault']].map(([label,Icon,path])=><button key={label} onClick={()=>navigate(path)} className="rounded-xl bg-white border border-blue-100 p-3 text-left text-xs font-bold text-slate-800 hover:border-blue-300"><Icon className="h-4 w-4 mb-2 text-blue-600"/>{label}</button>)}</div></Card>
    </section>

    <section className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-blue-50 px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-slate-950 text-white flex items-center justify-center"><Sparkles className="h-5 w-5"/></div><div><div className="font-black text-slate-950">CaseCue Proof™</div><div className="text-xs text-slate-600">Trace generated progress statements back to the evidence that supports them.</div></div></div><div className="flex flex-wrap gap-2 text-xs">{['Data','Work samples','Sessions','Observations','Parent input'].map(x=><span key={x} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>{x}</span>)}</div><button onClick={()=>navigate('/reports')} className="text-sm font-semibold text-blue-700 flex items-center gap-1">View evidence <ArrowRight className="h-4 w-4"/></button></section>
  </div>;
}

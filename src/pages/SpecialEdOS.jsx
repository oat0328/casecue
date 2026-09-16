import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, ClipboardList, Users, ArrowRight, Sparkles, Clock3, ShieldCheck, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/cards';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/lib/useAsync';

const workflows=[
  {title:'Build / Update an IEP',desc:'Upload the student records. Review what was found. Build an evidence-linked draft.',icon:FileEdit,path:'/iep-studio',cta:'Build an IEP'},
  {title:'Run an IEP Meeting',desc:'Select the student and get a simple page-by-page facilitator flow from greeting through closing.',icon:ClipboardList,path:'/meeting-navigator',cta:'Run meeting'},
  {title:'Track My Students',desc:'See goals, progress, service minutes, deadlines and what needs your attention next.',icon:Users,path:'/app',cta:'Open caseload'},
];

export default function SpecialEdOS(){
 const nav=useNavigate();
 const {data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',500),[]);
 const {data:meetings}=useAsync(()=>base44.entities.Meeting.list('-date',100),[]);
 const {data:tasks}=useAsync(()=>base44.entities.Task.list('-created_date',100),[]);
 const today=new Date().toISOString().slice(0,10);
 const openTasks=(tasks||[]).filter(t=>!['done','complete','completed'].includes(String(t.status||'').toLowerCase())).length;
 const nextMeeting=(meetings||[]).filter(m=>m.date&&m.date>=today).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
 const nextAction=nextMeeting?`Prepare ${nextMeeting.title||'your next student meeting'}${nextMeeting.date?` for ${nextMeeting.date}`:''}.`:openTasks?`Review ${openTasks} open caseload task${openTasks===1?'':'s'}.`:'Choose a student and review what needs attention next.';
 return <div className="max-w-6xl mx-auto space-y-7 pb-10">
   <section className="pt-3 md:pt-7">
     <div className="text-xs font-black uppercase tracking-[.2em] text-blue-700">IEP Suite Studio AI™</div>
     <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 mt-2">What do you need to do today?</h1>
     <p className="text-slate-600 mt-3 max-w-2xl text-base md:text-lg">Three simple workflows on the surface. Your IEP, compliance, progress, service and document tools stay connected underneath.</p>
   </section>

   <Card className="p-5 md:p-6 border-blue-200 shadow-sm">
     <div className="flex flex-col md:flex-row md:items-center gap-4">
       <div className="h-11 w-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5"/></div>
       <div className="flex-1"><div className="text-xs font-black uppercase tracking-wider text-blue-700">Next best action</div><div className="font-black text-lg mt-1">{nextAction}</div><div className="text-sm text-slate-500 mt-1">{(students||[]).length} students · {openTasks} open tasks{nextMeeting?.date?` · next meeting ${nextMeeting.date}`:''}</div></div>
       <Button onClick={()=>nav(nextMeeting?'/meeting-navigator':'/app')} className="bg-slate-950 text-white h-11">Take action <ArrowRight className="h-4 w-4 ml-2"/></Button>
     </div>
   </Card>

   <div className="grid lg:grid-cols-3 gap-4">
     {workflows.map((w,i)=>{const Icon=w.icon;return <button key={w.title} onClick={()=>nav(w.path)} className="group text-left rounded-[22px] border bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 transition-all min-h-[245px] flex flex-col">
       <div className="flex items-start justify-between"><div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center"><Icon className="h-6 w-6"/></div><span className="text-xs font-black text-slate-300">0{i+1}</span></div>
       <h2 className="text-xl font-black mt-5 text-slate-950">{w.title}</h2><p className="text-sm text-slate-600 leading-relaxed mt-2 flex-1">{w.desc}</p>
       <div className="font-bold text-sm text-blue-700 flex items-center mt-5">{w.cta}<ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition"/></div>
     </button>})}
   </div>

   <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 border px-5 py-4">
     <div><div className="font-bold text-sm">More tools when you need them</div><div className="text-xs text-slate-500 mt-0.5">504 · FBA/BIP · evaluations · compliance · reports · parent tools · administration</div></div>
     <Button variant="outline" onClick={()=>nav('/studio-workspace?module=audit')}>More tools <ArrowRight className="h-4 w-4 ml-2"/></Button>
   </div>

   <div className="grid sm:grid-cols-3 gap-3 text-sm text-slate-600">
     <div className="flex gap-2"><Clock3 className="h-4 w-4 mt-0.5 text-blue-700"/><span><strong className="text-slate-900">Less clicking.</strong> Start from the job you need to finish.</span></div>
     <div className="flex gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-blue-700"/><span><strong className="text-slate-900">Evidence first.</strong> Missing information is flagged instead of invented.</span></div>
     <div className="flex gap-2"><Users className="h-4 w-4 mt-0.5 text-blue-700"/><span><strong className="text-slate-900">Team controlled.</strong> Drafts never replace IEP-team decisions.</span></div>
   </div>
 </div>
}

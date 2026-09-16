import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileEdit, ShieldCheck, Users, ClipboardList, Timer, Brain, HeartHandshake, GraduationCap, FileSearch, BookOpen, Stethoscope, Activity, Building2, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/cards';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/lib/useAsync';

const modules = [
  ['AI IEP Studio','Build, review, compare and facilitate IEPs from source records.','/iep-studio',FileEdit,'Live'],
  ['AI 504 Studio','Organize accommodations, access needs and 504 review workflows.','/studio-workspace?module=504',ShieldCheck,'Live'],
  ['AI BIP Studio','Turn verified behavior data into educator-review behavior plan drafts.','/studio-workspace?module=bip',Activity,'Live'],
  ['AI FBA Studio','Organize antecedent, behavior and consequence evidence for FBA review.','/studio-workspace?module=fba',Brain,'Live'],
  ['AI MDT Studio','Read evaluations and MDT reports, surface evidence and draft present levels.','/studio-workspace?module=mdt',FileSearch,'Live'],
  ['AI Evaluation Center','Collect evaluation evidence, dates, assessments and team questions.','/studio-workspace?module=evaluation',Stethoscope,'Live'],
  ['AI Compliance Center','Review deadlines, missing evidence and documentation risks.','/iep-review',ShieldCheck,'Live'],
  ['AI Parent Portal','Give families plain-language access to student information and progress.','/studio-workspace?module=parent',HeartHandshake,'Live'],
  ['AI Teacher Portal','Daily caseload actions, documentation and instructional workflow.','/studio-workspace?module=teacher',Users,'Live'],
  ['AI Student Success','Progress, goals, evidence, attendance and service trends in one view.','/studio-workspace?module=success',GraduationCap,'Live'],
  ['AI Meeting Center','Prepare, facilitate and follow up on IEP meetings page by page.','/studio-workspace?module=meeting',ClipboardList,'Live'],
  ['AI Service Tracking','Track delivered and missed minutes with import-safe session records.','/studio-workspace?module=service',Timer,'Live'],
  ['AI Audit Center','Audit student records and produce review-ready evidence packets.','/studio-workspace?module=audit',FileSearch,'Live'],
  ['AI Forms Generator','Create parent, teacher, meeting and documentation forms from records.','/studio-workspace?module=forms',FileEdit,'Live'],
  ['AI Training Academy','Role-based special education workflow training and practice.','/studio-workspace?module=training',BookOpen,'Live'],
];

const agents = [
  ['Case Manager','Caseload · deadlines · next actions'],['Compliance Officer','Timelines · gaps · corrective tasks'],
  ['School Psychologist Assistant','Evaluation summaries · evidence organization'],['Behavior Specialist','FBA/BIP evidence · interventions'],
  ['Speech Services Assistant','Goal support · service tracking'],['Parent Guide','Plain-language explanations · questions'],
  ['Director Assistant','School/district trends · audit readiness'],
];

export default function SpecialEdOS(){
  const navigate=useNavigate();
  const {data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',500),[]);
  const {data:meetings}=useAsync(()=>base44.entities.Meeting.list('-date',100),[]);
  const {data:tasks}=useAsync(()=>base44.entities.Task.list('-created_date',100),[]);
  const openTasks=(tasks||[]).filter(t=>!['done','complete','completed'].includes(String(t.status||'').toLowerCase())).length;
  const nextMeeting=(meetings||[]).filter(m=>m.date && m.date>=new Date().toISOString().slice(0,10)).sort((a,b)=>String(a.date).localeCompare(String(b.date)))[0];
  const nextAction=nextMeeting ? `Prepare ${nextMeeting.title||'the next IEP meeting'} on ${nextMeeting.date}.` : openTasks ? `Review ${openTasks} open caseload task${openTasks===1?'':'s'}.` : 'Review your caseload and choose the student who needs attention next.';
  return <div className="space-y-7">
    <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-sky-700 text-white p-7 md:p-9 shadow-xl overflow-hidden relative">
      <div className="relative z-10 max-w-4xl"><div className="text-xs font-black uppercase tracking-[.22em] text-sky-300">Special Education Operating System</div><h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">IEP Suite Studio AI™</h1><p className="mt-3 text-slate-200 text-base md:text-lg max-w-3xl">One workspace from referral to graduation. Organize records, draft from evidence, prepare meetings, track services, monitor progress and keep the next best action visible.</p><div className="flex flex-wrap gap-3 mt-6"><Button onClick={()=>navigate('/iep-studio')} className="bg-white text-slate-950 hover:bg-sky-50 h-11 px-5"><Zap className="h-4 w-4 mr-2"/>Build My IEP</Button><Button onClick={()=>navigate('/meeting-navigator')} variant="outline" className="h-11 px-5 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><ClipboardList className="h-4 w-4 mr-2"/>Run Meeting Mode</Button></div></div>
    </section>

    <Card className="p-5 border-blue-200 bg-blue-50/70"><div className="flex flex-col md:flex-row md:items-center gap-4"><div className="h-11 w-11 rounded-2xl bg-blue-700 text-white flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5"/></div><div className="flex-1"><div className="text-xs font-black uppercase tracking-wider text-blue-700">Next best action</div><div className="font-bold text-slate-950 mt-1">{nextAction}</div><div className="text-sm text-slate-600 mt-1">{(students||[]).length} students in this workspace · {openTasks} open tasks</div></div><Button onClick={()=>navigate(nextMeeting?'/meeting-navigator':'/app')} className="bg-slate-950 text-white">Take action <ArrowRight className="h-4 w-4 ml-2"/></Button></div></Card>

    <section><div className="flex items-end justify-between gap-3 mb-4"><div><div className="text-xs font-black uppercase tracking-wider text-blue-700">Super modules</div><h2 className="text-2xl font-black mt-1">One ecosystem. Every SPED workflow.</h2></div></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{modules.map(([title,desc,path,Icon,status])=><button key={title} onClick={()=>navigate(path)} className="text-left rounded-2xl border bg-white p-5 hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-200 transition-all"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-xl bg-slate-950 text-white flex items-center justify-center"><Icon className="h-5 w-5"/></div><div className="flex-1"><div className="flex items-center gap-2"><h3 className="font-black">{title}</h3><span className="text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">{status}</span></div><p className="text-sm text-slate-600 mt-1 leading-relaxed">{desc}</p></div><ArrowRight className="h-4 w-4 text-slate-400"/></div></button>)}</div></section>

    <section className="grid xl:grid-cols-[1.25fr_.75fr] gap-5"><Card className="p-6"><div className="text-xs font-black uppercase tracking-wider text-blue-700">Educator support agents</div><h2 className="text-xl font-black mt-1">A role-aware support team</h2><p className="text-sm text-slate-600 mt-1">Each assistant works from available records, separates verified facts from drafts and leaves educational decisions to the team.</p><div className="grid sm:grid-cols-2 gap-3 mt-5">{agents.map(([name,work])=><div key={name} className="rounded-xl border p-3"><div className="font-bold text-sm">{name}</div><div className="text-xs text-slate-500 mt-1">{work}</div></div>)}</div></Card><Card className="p-6 bg-slate-950 text-white"><Building2 className="h-6 w-6 text-sky-300"/><h2 className="text-xl font-black mt-3">District Command Center</h2><p className="text-sm text-slate-300 mt-2">Caseload, compliance, service delivery, audit readiness, staffing and funding views can roll up without changing the teacher workflow.</p><div className="space-y-2 mt-5 text-sm">{['Student-level evidence','School-level risk visibility','District audit readiness','Service delivery trends','Role-based access'].map(x=><div key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5"/>{x}</div>)}</div><Button onClick={()=>navigate('/studio-workspace?module=district')} className="mt-5 bg-white text-slate-950 hover:bg-slate-100">Open District Command Center</Button></Card></section>
  </div>
}

import React,{useState}from'react';
import{Link}from'react-router-dom';
import{ClipboardCheck,Printer,ScanLine,BarChart3,Target,TrendingUp,ArrowRight,ShieldCheck}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import PageHeader from'@/components/PageHeader';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';
import StudentSelector from'@/components/forms/StudentSelector';
import BaselineAssessmentStudio from'@/components/iepStudio/BaselineAssessmentStudio';

const STEPS=[
 ['1','Create Baseline','Choose skill areas and generate an original classroom-ready probe.',ClipboardCheck],
 ['2','Print / Give Test','Print the clean student copy and administer it.',Printer],
 ['3','Enter Scores','Enter item scores and objective teacher notes.',ScanLine],
 ['4','Review Results','See verified domain scores, strengths, needs, and limitations.',BarChart3],
 ['5','PLAAFP / Goal Draft','Turn verified performance into educator-review drafts.',Target],
 ['6','Progress Monitor','Carry the approved goal into ongoing data collection.',TrendingUp],
];
export default function BaselineCenter(){
 const{data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',200),[]);
 const[studentId,setStudentId]=useState(()=>new URLSearchParams(window.location.search).get('student')||'');
 const student=(students||[]).find(s=>s.id===studentId);
 return <div>
  <PageHeader title="Baseline Center" subtitle="Create → administer → score → review → draft → progress monitor. One simple evidence-first baseline workflow." icon={ClipboardCheck}/>
  <Card className="mb-6 overflow-hidden border-blue-100"><div className="bg-slate-950 p-6 text-white"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-6 w-6 text-sky-300"/><div><div className="text-xs font-black uppercase tracking-[.18em] text-sky-300">CaseCue Baseline Center</div><h2 className="mt-1 text-2xl font-black">Know where the student is starting.</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">CaseCue keeps the assessment, scoring, present-level draft, goal draft, and next progress-monitoring step connected to the same student record. Baselines are instructional measures and remain subject to educator and IEP-team review.</p></div></div></div>
   <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-6">{STEPS.map(([n,t,d,Icon])=><div key={n} className="rounded-xl border bg-white p-3"><div className="flex items-center justify-between"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-800">{n}</span><Icon className="h-4 w-4 text-slate-400"/></div><div className="mt-3 text-sm font-black">{t}</div><div className="mt-1 text-[11px] leading-4 text-slate-500">{d}</div></div>)}</div>
  </Card>
  <Card className="mb-6 p-5"><div className="text-sm font-black">Choose a student</div><p className="mb-3 mt-1 text-xs text-slate-500">Everything below stays attached to the selected student's authorized CaseCue record.</p><StudentSelector students={students||[]} value={studentId} onChange={setStudentId} noBottomSpace/></Card>
  {!student?<Card className="p-8 text-center"><ClipboardCheck className="mx-auto h-10 w-10 text-blue-600"/><h2 className="mt-3 text-xl font-black">Select a student to start</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Then CaseCue will show saved baselines or let you create a new one without leaving this workflow.</p></Card>:<BaselineAssessmentStudio key={student.id} student={student}/>} 
  {student&&<Card className="mt-5 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black">Ready for ongoing monitoring?</div><div className="text-sm text-slate-500">After educator/team review, continue collecting goal data in Progress Monitoring.</div></div><Button asChild><Link to="/progress/monitoring">Open Progress Monitoring<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div></Card>}
 </div>;
}

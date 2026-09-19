import React from'react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{Users,ShieldCheck,GraduationCap}from'lucide-react';
import{Card}from'@/components/ui/cards';

export default function ParaStudents(){
 const{data:rows}=useAsync(()=>base44.entities.ParaStudentAccess.list('-last_name',500),[]);
 const active=(rows||[]).filter(x=>x.active!==false);
 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white">
   <div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Para</div>
   <h1 className="mt-3 text-3xl font-black">My Assigned Students</h1>
   <p className="mt-2 max-w-2xl text-slate-300">Your Para workspace only shows students assigned to you by the school/case manager. Para accounts cannot add themselves to a student record.</p>
  </section>
  <Card className="border-blue-100 bg-blue-50/50 p-5">
   <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700"/><div><div className="font-black text-blue-950">Minimum-necessary student access</div><p className="mt-1 text-sm text-blue-900">If a student is missing, ask the authorized case manager or administrator to assign that student to your Para account. This prevents a Para account from browsing or creating student records outside its assignment.</p></div></div>
  </Card>
  <section>
   <div className="flex items-center gap-2"><Users className="h-5 w-5"/><h2 className="font-black">Student List</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black">{active.length}</span></div>
   <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{active.map(x=><div key={x.id} className="rounded-2xl border bg-white p-5">
    <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><GraduationCap className="h-5 w-5"/></div><div><b>{x.last_name}, {x.first_name}</b><div className="text-xs text-slate-500">Grade {x.grade||'—'} · School assigned</div></div></div>
    {x.support_summary&&<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{x.support_summary}</div>}
    {(x.approved_supports||[]).length>0&&<div className="mt-3 flex flex-wrap gap-1.5">{x.approved_supports.map(v=><span key={v} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">{v}</span>)}</div>}
    {x.current_grade_percent!=null&&<div className="mt-4"><div className="flex justify-between text-xs font-bold"><span>{x.grade_subject||'Current grade'}</span><span>{x.current_grade_percent}% {x.current_grade_letter||''}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{width:Math.max(0,Math.min(100,Number(x.current_grade_percent)))+'%'}}/></div></div>}
   </div>)}</div>
   {!active.length&&<div className="mt-3 rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No students are assigned to this Para account yet. The case manager or administrator must assign students before student-specific tools can be used.</div>}
  </section>
 </div>;
}

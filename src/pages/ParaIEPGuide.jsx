import React,{useMemo,useState}from'react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{ShieldCheck,BookOpenCheck}from'lucide-react';
import{Card}from'@/components/ui/cards';

export default function ParaIEPGuide(){
 const{data:rows}=useAsync(()=>base44.entities.ParaStudentAccess.list('-last_name',500),[]);
 const students=useMemo(()=>(rows||[]).filter(x=>x.active!==false),[rows]);
 const[selected,setSelected]=useState('');
 const student=students.find(x=>x.student_id===selected)||null;
 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white">
   <div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Para</div>
   <h1 className="mt-3 text-3xl font-black">Student Support Guide</h1>
   <p className="mt-2 max-w-2xl text-slate-300">See the approved supports your school has shared for students assigned to you. This is a minimum-necessary support view, not an IEP authoring or document-upload workspace.</p>
  </section>
  <Card className="p-6">
   <label className="text-sm font-black">Assigned student</label>
   <select className="mt-2 w-full rounded-lg border bg-white p-2 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose student…</option>{students.map(s=><option key={s.id} value={s.student_id}>{s.last_name}, {s.first_name} · Grade {s.grade||'—'}</option>)}</select>
  </Card>
  {student&&<div className="grid gap-4 lg:grid-cols-2">
   <Card className="p-6"><div className="flex items-center gap-2 text-sm font-black text-blue-900"><BookOpenCheck className="h-4 w-4"/>What I need to know</div><p className="mt-3 text-sm leading-6 text-slate-700">{student.support_summary||'No approved support summary has been shared for this student yet.'}</p></Card>
   <Card className="p-6"><div className="flex items-center gap-2 text-sm font-black text-blue-900"><ShieldCheck className="h-4 w-4"/>Approved supports</div>{(student.approved_supports||[]).length?<ul className="mt-3 space-y-2 text-sm">{student.approved_supports.map(v=><li key={v} className="rounded-xl bg-blue-50 px-3 py-2">• {v}</li>)}</ul>:<p className="mt-3 text-sm text-slate-500">No approved supports have been shared yet.</p>}</Card>
  </div>}
  <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><b>Use the school’s actual directions when anything is unclear.</b><p className="mt-1">CaseCue Para intentionally does not expose IEP writing, eligibility, placement, or unrestricted IEP uploads. Ask the case manager for clarification when a support is missing or unclear.</p></Card>
 </div>;
}

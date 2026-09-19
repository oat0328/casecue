import React,{useMemo,useState}from'react';
import{BookOpen,ShieldCheck,CalendarClock,ScanLine,Users,ClipboardCheck}from'lucide-react';
import{Link}from'react-router-dom';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{userDisplayName}from'@/lib/userIdentity';
import{PremiumBarChart,PremiumDonutChart}from'@/components/shared/PremiumAnalytics';
import AnalyticsPdfButton from'@/components/shared/AnalyticsPdfButton';

export default function SubstituteHome(){
 const{user}=useAuth();const staffName=userDisplayName(user,'Substitute');
 const[type,setType]=useState('general');
 const{data:attendance}=useAsync(()=>user?.id?base44.entities.AttendanceRecord.filter({user_id:user.id,workspace:'substitute'},'-date',1000):Promise.resolve([]),[user?.id]);
 const{data:notes}=useAsync(()=>base44.entities.WorkspaceNote.filter({workspace:'substitute'},'-date',500),[]);
 const{data:schedule}=useAsync(()=>base44.entities.ScheduleEntry.filter({workspace:'substitute'},'start_time',500),[]);
 const attendanceByDay=useMemo(()=>{const m={};for(const r of attendance||[]){const k=String(r.date||'').slice(5)||'No date';m[k]??={name:k,present:0,absent:0};if(r.status==='present')m[k].present++;else if(r.status==='absent')m[k].absent++}return Object.values(m).slice(-10)},[attendance]);
 const statusData=useMemo(()=>['present','absent','tardy','excused','left_early'].map(k=>({name:k.replace('_',' '),value:(attendance||[]).filter(x=>x.status===k).length})),[attendance]);
 return <div className='space-y-6'>
  <section className='rounded-[30px] bg-slate-950 p-8 text-white'><div className='text-xs font-black uppercase tracking-[.2em] text-sky-300'>CaseCue Substitute</div><h1 className='mt-3 text-3xl font-black'>Run the day. Leave the teacher a clean handoff.</h1><p className='mt-2 text-slate-300'>Built for daily and permanent subs: shared schedule, attendance, backup lesson planning, grading, notes, and a clear end-of-day record.</p></section>
  <div className='grid gap-3 sm:grid-cols-2'><button onClick={()=>setType('general')} className={'rounded-2xl border p-5 text-left '+(type==='general'?'border-blue-500 bg-blue-50':'bg-white')}><b>General / Permanent Sub</b><p className='text-sm text-slate-500'>Schedule + lessons + grading + handoff.</p></button><button onClick={()=>setType('sped')} className={'rounded-2xl border p-5 text-left '+(type==='sped'?'border-blue-500 bg-blue-50':'bg-white')}><b>SPED Substitute</b><p className='text-sm text-slate-500'>Same flow with minimum-necessary approved supports.</p></button></div>
  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><Users className="h-5 w-5 text-blue-600"/><div className="mt-3 text-3xl font-black">{new Set((attendance||[]).map(x=>x.student_id)).size}</div><div className="text-xs text-slate-500">Students marked</div></div><div className="rounded-2xl border bg-white p-5"><ClipboardCheck className="h-5 w-5 text-emerald-600"/><div className="mt-3 text-3xl font-black">{(notes||[]).length}</div><div className="text-xs text-slate-500">Handoff notes</div></div><div className="rounded-2xl border bg-white p-5"><CalendarClock className="h-5 w-5 text-violet-600"/><div className="mt-3 text-3xl font-black">{(schedule||[]).filter(x=>!x.archived).length}</div><div className="text-xs text-slate-500">Schedule blocks</div></div></div>
  <div className="flex justify-end"><AnalyticsPdfButton title="CaseCue Substitute Day Analytics" subtitle={staffName} filename="casecue-substitute-analytics" metrics={[{label:'Students marked',value:new Set((attendance||[]).map(x=>x.student_id)).size},{label:'Attendance records',value:(attendance||[]).length},{label:'Handoff notes',value:(notes||[]).length},{label:'Schedule blocks',value:(schedule||[]).filter(x=>!x.archived).length}]} charts={[{type:'bar',title:'Sub Attendance by Day',subtitle:'Present marks captured by this substitute account.',data:attendanceByDay,series:[{key:'present',label:'Present'}]},{type:'donut',title:'Attendance Status Mix',subtitle:'Saved substitute attendance statuses.',data:statusData}]} notes={['Use this report as a teacher handoff summary, not as the district SIS attendance record.']}/></div>
  <div className="grid gap-4 lg:grid-cols-2"><PremiumBarChart title="Sub Attendance by Day" subtitle="Saved present marks from days covered in CaseCue." data={attendanceByDay} dataKey="present" badge="Present"/><PremiumDonutChart title="Attendance Status Mix" subtitle="Real attendance marks captured by this substitute account." data={statusData} centerLabel={(attendance||[]).length}/></div>
  <div className='grid gap-3 md:grid-cols-3'>
   <Link to='/w/substitute/schedule' className='rounded-2xl border bg-white p-5 font-black'><CalendarClock className='mr-2 inline h-5 w-5 text-blue-600'/>Open Shared Schedule →<p className='mt-1 text-sm font-normal text-slate-500'>Classes, periods, rooms, and student blocks in the common CaseCue schedule engine.</p></Link>
   <Link to='/w/substitute/lesson' className='rounded-2xl border bg-white p-5 font-black'><BookOpen className='mr-2 inline h-5 w-5'/>Emergency Lesson Planner →</Link>
   <Link to='/w/substitute/grade' className='rounded-2xl border bg-white p-5 font-black'><ScanLine className='mr-2 inline h-5 w-5'/>Open Shared Gradebook →</Link>
  </div>
  {type==='sped'&&<div className='rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm'><ShieldCheck className='mr-2 inline h-4 w-4'/><b>SPED substitute mode:</b> use only supports authorized for the assignment. This is not an IEP authoring workspace.</div>}
 </div>;
}
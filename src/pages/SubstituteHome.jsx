import React,{useState}from'react';
import{Button}from'@/components/ui/button';
import{BookOpen,ShieldCheck,CalendarClock,ScanLine}from'lucide-react';
import{Link}from'react-router-dom';

export default function SubstituteHome(){
 const[type,setType]=useState('general');
 return <div className='space-y-6'>
  <section className='rounded-[30px] bg-slate-950 p-8 text-white'><div className='text-xs font-black uppercase tracking-[.2em] text-sky-300'>CaseCue Substitute</div><h1 className='mt-3 text-3xl font-black'>No plans left? You still have a day to run.</h1><p className='mt-2 text-slate-300'>Built for daily and permanent subs: shared schedule, backup lesson planning, grading, and a clean handoff.</p></section>
  <div className='grid gap-3 sm:grid-cols-2'><button onClick={()=>setType('general')} className={'rounded-2xl border p-5 text-left '+(type==='general'?'border-blue-500 bg-blue-50':'bg-white')}><b>General / Permanent Sub</b><p className='text-sm text-slate-500'>Schedule + lessons + grading + handoff.</p></button><button onClick={()=>setType('sped')} className={'rounded-2xl border p-5 text-left '+(type==='sped'?'border-blue-500 bg-blue-50':'bg-white')}><b>SPED Substitute</b><p className='text-sm text-slate-500'>Same flow with minimum-necessary approved supports.</p></button></div>
  <div className='grid gap-3 md:grid-cols-3'>
   <Link to='/w/substitute/schedule' className='rounded-2xl border bg-white p-5 font-black'><CalendarClock className='mr-2 inline h-5 w-5 text-blue-600'/>Open Shared Schedule →<p className='mt-1 text-sm font-normal text-slate-500'>Classes, periods, rooms, and student blocks in the common CaseCue schedule engine.</p></Link>
   <Link to='/w/substitute/lesson' className='rounded-2xl border bg-white p-5 font-black'><BookOpen className='mr-2 inline h-5 w-5'/>Emergency Lesson Planner →</Link>
   <Link to='/w/substitute/grade' className='rounded-2xl border bg-white p-5 font-black'><ScanLine className='mr-2 inline h-5 w-5'/>Open Shared Gradebook →</Link>
  </div>
  {type==='sped'&&<div className='rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm'><ShieldCheck className='mr-2 inline h-4 w-4'/><b>SPED substitute mode:</b> use only supports authorized for the assignment. This is not an IEP authoring workspace.</div>}
 </div>;
}

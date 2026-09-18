import React,{useMemo,useState}from'react';
import{useLocation}from'react-router-dom';
import{Layers3,UserRound,ArrowRight,UploadCloud,ScanSearch,CheckCircle2,FolderCheck,ShieldCheck,ListChecks}from'lucide-react';
import{Card}from'@/components/ui/cards';
import BatchWorkEvidencePanel from'@/components/evidence/BatchWorkEvidencePanel';
import WorkEvidencePanel from'@/components/evidence/WorkEvidencePanel';

export default function SmartGraderV2({students=[],goals=[],onSaved}){
 const location=useLocation();
 const[mode,setMode]=useState('guided');
 const context=useMemo(()=>{
   if(location.pathname.includes('/w/substitute/'))return{label:'CaseCue Substitute',title:'Grade today’s work without the extra steps.',desc:'Load the class stack, review anything CaseCue could not verify, then save the finished work for the teacher.',goals:[]};
   if(location.pathname.includes('/w/gen_ed/'))return{label:'CaseCue Gen Ed',title:'Grade the class. Review the exceptions. Move on.',desc:'Upload one paper or a whole class stack. CaseCue reads, solves objective work, verifies the grade, and keeps you in control.',goals};
   return{label:'Smart Grader V2',title:'Drop the papers. CaseCue handles the first pass.',desc:'Batch or single-student grading with deterministic math, independent verification, teacher approval, and automatic student filing.',goals};
 },[location.pathname,goals]);

 return <div className="space-y-5">
   <section className="overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
     <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
       <div className="max-w-3xl">
         <div className="text-[11px] font-black uppercase tracking-[.2em] text-sky-300">{context.label}</div>
         <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{context.title}</h2>
         <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{context.desc}</p>
       </div>
       <div className="grid min-w-0 grid-cols-4 gap-2 text-center text-[11px] font-bold xl:min-w-[500px]">
         <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><UploadCloud className="mx-auto h-4 w-4 text-sky-300"/><div className="mt-2">1. Separate</div></div>
         <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><ScanSearch className="mx-auto h-4 w-4 text-sky-300"/><div className="mt-2">2. Resolve</div></div>
         <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><ListChecks className="mx-auto h-4 w-4 text-sky-300"/><div className="mt-2">3. Approve</div></div>
         <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><FolderCheck className="mx-auto h-4 w-4 text-sky-300"/><div className="mt-2">4. File</div></div>
       </div>
     </div>
   </section>

   <div className="grid gap-3 lg:grid-cols-3">
     <button onClick={()=>setMode('guided')} className={"rounded-2xl border-2 p-5 text-left transition "+(mode==='guided'?'border-blue-600 bg-blue-50 shadow-sm':'border-slate-200 bg-white hover:border-slate-300')}>
       <div className="flex items-start gap-3"><div className={"grid h-11 w-11 place-items-center rounded-xl "+(mode==='guided'?'bg-blue-700 text-white':'bg-slate-100 text-slate-700')}><ListChecks className="h-5 w-5"/></div><div><div className="flex items-center gap-2"><span className="font-black">Guided Batch</span><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">Best accuracy</span></div><p className="mt-1 text-sm text-slate-500">One assignment, multiple students. Tell CaseCue the assignment first, then upload the class stack.</p></div></div>
     </button>
     <button onClick={()=>setMode('mixed')} className={"rounded-2xl border-2 p-5 text-left transition "+(mode==='mixed'?'border-blue-600 bg-blue-50 shadow-sm':'border-slate-200 bg-white hover:border-slate-300')}>
       <div className="flex items-start gap-3"><div className={"grid h-11 w-11 place-items-center rounded-xl "+(mode==='mixed'?'bg-blue-700 text-white':'bg-slate-100 text-slate-700')}><Layers3 className="h-5 w-5"/></div><div><div className="flex items-center gap-2"><span className="font-black">Mixed Packet</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">More automation</span></div><p className="mt-1 text-sm text-slate-500">Multiple students and assignments in one packet. CaseCue stages the packet before grading.</p></div></div>
     </button>
     <button onClick={()=>setMode('single')} className={"rounded-2xl border-2 p-5 text-left transition "+(mode==='single'?'border-blue-600 bg-blue-50 shadow-sm':'border-slate-200 bg-white hover:border-slate-300')}>
       <div className="flex items-start gap-3"><div className={"grid h-11 w-11 place-items-center rounded-xl "+(mode==='single'?'bg-blue-700 text-white':'bg-slate-100 text-slate-700')}><UserRound className="h-5 w-5"/></div><div><div className="font-black">One Student</div><p className="mt-1 text-sm text-slate-500">Choose a student, load one worksheet, verify the score, and file it.</p></div></div>
     </button>
   </div>

   <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
     <div className="flex items-start gap-3 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"/><div><b>Nothing becomes official until you approve it.</b><span className="text-slate-600"> CaseCue can read and verify the work, but the teacher-approved result is what gets filed in Gradebook and the student’s Work & Grades folder.</span></div></div>
   </Card>

   {mode==='single'
     ?<WorkEvidencePanel students={students} goals={context.goals} compact v2/>
     :<BatchWorkEvidencePanel key={mode} students={students} goals={context.goals} onSaved={onSaved} v2 batchMode={mode}/>} 

   <div className="flex items-center justify-center gap-2 pb-2 text-xs text-slate-400">
     <CheckCircle2 className="h-3.5 w-3.5"/><span>Smart Grader V2 · Separate → Resolve → Grade → Approve → IEP Match → File</span><ArrowRight className="h-3.5 w-3.5"/>
   </div>
 </div>;
}

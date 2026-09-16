import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, CalendarClock, Plus, Users, MoreHorizontal, Timer, BookOpen, Camera, X } from "lucide-react";

export default function MobileQuickCapture() {
  const navigate = useNavigate();
  const [quick, setQuick] = useState(false);
  const [more, setMore] = useState(false);
  const go = (path) => { setQuick(false); setMore(false); navigate(path); };
  return <>
    {(quick || more) && <div className="lg:hidden fixed inset-0 z-40 bg-slate-950/30" onClick={()=>{setQuick(false);setMore(false)}}/>}
    {quick && <div className="lg:hidden fixed bottom-20 left-3 right-3 z-50 rounded-2xl border bg-white shadow-2xl p-3"><div className="flex items-center justify-between mb-2"><p className="font-black">Quick add</p><button onClick={()=>setQuick(false)}><X className="h-4 w-4"/></button></div><div className="grid grid-cols-3 gap-2">{[["Take Session Data",Timer,"/session-tracker"],["Create Lesson",BookOpen,"/lesson-studio"],["Upload Work",Camera,"/evidence-vault"]].map(([l,I,p])=><button key={l} onClick={()=>go(p)} className="rounded-xl border p-3 text-xs font-bold text-center"><I className="h-5 w-5 mx-auto mb-1 text-blue-600"/>{l}</button>)}</div></div>}
    {more && <div className="lg:hidden fixed bottom-20 left-3 right-3 z-50 rounded-2xl border bg-white shadow-2xl p-3"><div className="flex items-center justify-between mb-2"><p className="font-black">More CaseCue</p><button onClick={()=>setMore(false)}><X className="h-4 w-4"/></button></div><div className="grid grid-cols-2 gap-2">{[["IEP Studio","/iep-studio"],["Progress Monitoring","/progress-monitoring-day"],["Meetings","/meetings"],["Gradebook","/gradebook"],["Reports","/reports"],["Command Center","/command-center"]].map(([l,p])=><button key={l} onClick={()=>go(p)} className="rounded-xl border px-3 py-3 text-sm font-semibold text-left">{l}</button>)}</div></div>}
    <div className="lg:hidden fixed bottom-2 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-16px)] max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl px-1.5 py-1.5 grid grid-cols-5 gap-1">
      <button onClick={()=>go('/app')} className="rounded-xl py-2 text-[10px] font-bold flex flex-col items-center gap-1"><Home className="h-4 w-4 text-blue-600"/>Today</button>
      <button onClick={()=>go('/schedule')} className="rounded-xl py-2 text-[10px] font-bold flex flex-col items-center gap-1"><CalendarClock className="h-4 w-4 text-blue-600"/>Instruction</button>
      <button onClick={()=>setQuick(v=>!v)} className="rounded-xl py-1 text-[10px] font-bold flex flex-col items-center gap-0.5"><span className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus className="h-5 w-5"/></span>Add</button>
      <button onClick={()=>go('/students')} className="rounded-xl py-2 text-[10px] font-bold flex flex-col items-center gap-1"><Users className="h-4 w-4 text-blue-600"/>Students</button>
      <button onClick={()=>setMore(v=>!v)} className="rounded-xl py-2 text-[10px] font-bold flex flex-col items-center gap-1"><MoreHorizontal className="h-4 w-4 text-blue-600"/>More</button>
    </div>
  </>;
}

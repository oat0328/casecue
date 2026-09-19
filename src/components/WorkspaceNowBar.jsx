import React,{useEffect,useMemo,useState}from'react';
import{CalendarDays,Clock3,TimerReset}from'lucide-react';
import{base44}from'@/api/base44Client';
import WorkspaceTimer from'@/components/shared/WorkspaceTimer';
import{useAsync}from'@/lib/useAsync';

const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const mins=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):-1};
const fmt=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return v||'';const h=Number(m[1]);return`${h%12||12}:${m[2]} ${h>=12?'PM':'AM'}`};
const remaining=(time,now)=>{const target=mins(time)*60,cur=now.getHours()*3600+now.getMinutes()*60+now.getSeconds(),diff=Math.max(0,target-cur);const h=Math.floor(diff/3600),m=Math.floor((diff%3600)/60),s=diff%60;return h>0?`${h}h ${m}m`:`${m}m ${String(s).padStart(2,'0')}s`};

export default function WorkspaceNowBar({workspaceKey}){
 const[now,setNow]=useState(()=>new Date());
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);
 const dayName=DAYS[now.getDay()],nowM=now.getHours()*60+now.getMinutes();

 const{data:paraSchedule}=useAsync(()=>workspaceKey==='para'?base44.entities.ParaScheduleBlock.list('start_time',250):Promise.resolve([]),[workspaceKey]);
 const{data:sharedSchedule}=useAsync(()=>workspaceKey!=='para'?base44.entities.ScheduleEntry.list('start_time',800):Promise.resolve([]),[workspaceKey]);

 const rows=useMemo(()=>{
   if(workspaceKey==='para')return (paraSchedule||[]).filter(x=>x.active!==false);
   return (sharedSchedule||[]).filter(x=>(x.workspace||'sped')===workspaceKey);
 },[workspaceKey,paraSchedule,sharedSchedule]);

 const today=rows.filter(x=>!x.archived&&String(x.day||dayName).toLowerCase()===dayName.toLowerCase()).sort((a,b)=>String(a.start_time||'').localeCompare(String(b.start_time||'')));
 const current=today.find(x=>mins(x.start_time)<=nowM&&mins(x.end_time)>nowM)||null;
 const next=today.find(x=>mins(x.start_time)>nowM)||null;
 const focus=current||next;
 const clock=now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 const date=now.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});

 return <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
     <div className="flex items-center gap-3">
       <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><Clock3 className="h-4 w-4"/></div>
       <div><div className="text-xl font-black leading-none">{clock}</div><div className="mt-1 text-xs text-slate-500">{date}</div></div>
     </div>
     <div className="hidden h-10 w-px bg-slate-200 sm:block"/>
     {focus?<div className="min-w-0 flex-1">
       <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-blue-700">{current?<><TimerReset className="h-3.5 w-3.5"/>Now</>:<><CalendarDays className="h-3.5 w-3.5"/>Next</>}</div>
       <div className="mt-1 truncate text-sm font-black text-slate-950">{focus.group_name||focus.className||'Scheduled block'}</div>
       <div className="text-xs text-slate-500">{fmt(focus.start_time)}{focus.end_time?`–${fmt(focus.end_time)}`:''}{!current&&focus.start_time?` · starts in ${remaining(focus.start_time,now)}`:''}</div>
     </div>:<div className="min-w-0 flex-1 text-sm text-slate-500"><b className="text-slate-800">Today:</b> No schedule is loaded for this workspace yet.</div>}
     <WorkspaceTimer workspaceKey={workspaceKey} compact/>
   </div>
 </div>;
}

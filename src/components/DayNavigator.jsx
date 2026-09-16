import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STORAGE_KEY="casecue-selected-day";
function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x;}
function addDays(d,n){const x=startOfDay(d);x.setDate(x.getDate()+n);return x;}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function toISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
export function dayNameForDate(date){return DAY_NAMES[new Date(date).getDay()];}
export default function DayNavigator({value,onChange,sticky=true,className}){
  const selected=startOfDay(value||new Date()),today=startOfDay(new Date());
  useEffect(()=>{
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      if(!saved) return;
      const d=new Date(`${saved}T00:00:00`);
      if(Number.isNaN(d.getTime())||Math.abs(d-today)>1000*60*60*24*45) return;
      if(!sameDay(d,selected)) onChange?.(d);
    }catch{}
    // Only restore once when this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const select=d=>{const x=startOfDay(d);try{localStorage.setItem(STORAGE_KEY,toISO(x));}catch{}onChange?.(x);};
  const weekdayIndex=(selected.getDay()+6)%7;
  const monday=addDays(selected,-weekdayIndex);
  const days=Array.from({length:5},(_,i)=>addDays(monday,i));
  const move=n=>select(addDays(selected,n));
  return <div className={cn(sticky&&"sticky top-[72px] z-20", "rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-sm p-2 sm:p-3",className)}>
    <div className="flex items-center justify-between gap-2 mb-2">
      <button onClick={()=>move(-1)} className="h-9 w-9 rounded-xl border flex items-center justify-center hover:bg-slate-50" aria-label="Previous day"><ChevronLeft className="h-4 w-4"/></button>
      <button onClick={()=>select(today)} className="text-sm font-black tracking-tight">{sameDay(selected,today)?"TODAY":`${SHORT[selected.getDay()].toUpperCase()} ${String(selected.getMonth()+1).padStart(2,"0")}/${String(selected.getDate()).padStart(2,"0")}`}</button>
      <button onClick={()=>move(1)} className="h-9 w-9 rounded-xl border flex items-center justify-center hover:bg-slate-50" aria-label="Next day"><ChevronRight className="h-4 w-4"/></button>
    </div>
    <div className="grid grid-cols-5 gap-1.5">
      {days.map(d=>{const active=sameDay(d,selected),isToday=sameDay(d,today);return <button key={d.toISOString()} onClick={()=>select(d)} className={cn("rounded-xl px-1 py-2 text-center border transition-colors",active?"bg-slate-950 text-white border-slate-950":"bg-white border-slate-200 hover:border-blue-300")}><div className="text-[10px] font-bold uppercase tracking-wide">{SHORT[d.getDay()]}</div><div className="text-sm font-black mt-0.5">{d.getDate()}</div>{isToday&&!active&&<div className="mx-auto mt-1 h-1 w-1 rounded-full bg-blue-500"/>}</button>})}
    </div>
  </div>;
}
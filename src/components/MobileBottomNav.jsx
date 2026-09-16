import React from "react";
import { NavLink } from "react-router-dom";
import { Home, BookOpen, Users, Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const items=[
  {to:"/app",label:"Today",icon:Home},
  {to:"/lesson-studio",label:"Instruction",icon:BookOpen},
  {to:"/students",label:"Students",icon:Users},
  {to:"/session-tracker",label:"Quick",icon:Plus,primary:true},
  {to:"/settings",label:"More",icon:MoreHorizontal},
];
export default function MobileBottomNav(){
  return <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-[0_-8px_30px_rgba(15,23,42,.08)]">
    <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">{items.map(({to,label,icon:Icon,primary})=><NavLink key={to} to={to} className={({isActive})=>cn("flex flex-col items-center justify-center gap-1 rounded-xl min-h-[52px] text-[10px] font-bold",primary?"text-white bg-slate-950 shadow-sm":isActive?"text-blue-700 bg-blue-50":"text-slate-500")}><Icon className={cn(primary?"h-5 w-5":"h-4 w-4")}/><span>{label}</span></NavLink>)}</div>
  </nav>;
}
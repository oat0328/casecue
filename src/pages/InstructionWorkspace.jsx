import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, CalendarClock, ClipboardList, Library, Archive } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { cn } from '@/lib/utils';
const tabs=[['Schedule & Groups','/instruction/schedule',CalendarClock],['Lesson Studio','/instruction/lessons',BookOpen],['Sub Plans','/instruction/sub-plans',ClipboardList],['Resources','/instruction/resources',Library],['Library','/instruction/library',Archive]];
export default function InstructionWorkspace(){return <div><PageHeader title="Instruction" subtitle="Plan, teach, grade, cover an absence, and find saved lessons without leaving your teaching workspace." icon={BookOpen}/><div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2">{tabs.map(([label,path,Icon])=><NavLink key={path} to={path} className={({isActive})=>cn('flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition',isActive?'bg-slate-950 text-white shadow-sm':'text-slate-600 hover:bg-slate-100')}><Icon className="h-4 w-4"/>{label}</NavLink>)}</div><Outlet/></div>}
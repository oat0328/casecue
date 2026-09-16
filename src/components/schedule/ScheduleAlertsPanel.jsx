import React,{useMemo}from'react';
import{AlertTriangle,CheckCircle2,Users,Clock3}from'lucide-react';
import{Card}from'@/components/ui/cards';
import{findConflicts}from'@/lib/scheduleUtils';

export default function ScheduleAlertsPanel({students=[],entries=[],goals=[]}){
 const activeStudents=students.filter(s=>s.roster_status!=='archived'&&s.status!=='exited');
 const activeEntries=entries.filter(e=>!e.archived&&!String(e.notes||'').includes('NON-INSTRUCTIONAL / UNAVAILABLE'));
 const alerts=useMemo(()=>{
  const out=[];const scheduledBy={};for(const e of activeEntries){for(const id of e.student_ids||[]){scheduledBy[id]=(scheduledBy[id]||0)+(Number(e.service_minutes)||0)}}
  for(const s of activeStudents){const mins=scheduledBy[s.id]||0;if(!mins)out.push({level:'warning',text:`${s.first_name} ${s.last_name} is not assigned to any active instructional group.`});else if(Number(s.service_minutes)>0&&mins<Number(s.service_minutes))out.push({level:'warning',text:`${s.first_name} ${s.last_name}: ${mins} scheduled minutes vs ${s.service_minutes} recorded weekly minutes.`});}
  for(const e of activeEntries){if((e.student_ids||[]).length>4)out.push({level:'info',text:`${e.group_name} has ${(e.student_ids||[]).length} students. Review group size.`});}
  const conflicts=findConflicts(activeEntries.map(e=>({group_name:e.group_name,day:e.day,start_time:e.start_time,end_time:e.end_time,student_ids:e.student_ids||[]})));for(const c of conflicts.slice(0,6)){out.push({level:'warning',text:`${c.a.group_name} overlaps ${c.b.group_name} on ${c.a.day}.`})}
  const goalIds=new Set(goals.map(g=>g.student_id));for(const s of activeStudents){if(!goalIds.has(s.id))out.push({level:'info',text:`${s.first_name} ${s.last_name} has no goal data available for goal-based grouping.`})}
  return out;
 },[students,entries,goals]);
 return <Card className='p-5'><div className='flex items-center justify-between gap-3'><div><div className='text-xs font-black uppercase tracking-[.16em] text-sky-600'>Schedule Health</div><h3 className='mt-1 text-lg font-bold'>Alerts & planning checks</h3></div><div className={`rounded-full px-3 py-1 text-xs font-bold ${alerts.length?'bg-amber-100 text-amber-800':'bg-emerald-100 text-emerald-800'}`}>{alerts.length?`${alerts.length} needs review`:'Looking good'}</div></div>{alerts.length?<div className='mt-4 grid md:grid-cols-2 gap-2'>{alerts.slice(0,12).map((a,i)=><div key={i} className={`rounded-xl border p-3 text-sm flex gap-2 ${a.level==='warning'?'border-amber-200 bg-amber-50 text-amber-900':'border-sky-200 bg-sky-50 text-sky-900'}`}><AlertTriangle className='h-4 w-4 shrink-0 mt-0.5'/><span>{a.text}</span></div>)}</div>:<div className='mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2'><CheckCircle2 className='h-4 w-4'/>No obvious scheduling gaps or overlaps were found in the current plan.</div>}<div className='mt-4 flex flex-wrap gap-4 text-xs text-slate-500'><span className='flex items-center gap-1'><Users className='h-3.5 w-3.5'/>{activeStudents.length} active students</span><span className='flex items-center gap-1'><Clock3 className='h-3.5 w-3.5'/>{activeEntries.length} instructional blocks</span></div></Card>;
}

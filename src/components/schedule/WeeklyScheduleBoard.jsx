import React from 'react';
import { Pencil, Trash2, Coffee } from 'lucide-react';
import { Card } from '@/components/ui/cards';
import PullSourceList from '@/components/schedule/PullSourceList';
import { DAYS, DELIVERY_LABEL, studentName, sortStudentIdsAlpha } from '@/lib/scheduleUtils';

const displayTime=(v,f='12h')=>{
  if(!v)return'?';
  const m=String(v).match(/^(\d{1,2}):(\d{2})$/);
  if(!m)return v;
  const h=Number(m[1]);
  if(f==='24h')return`${String(h).padStart(2,'0')}:${m[2]}`;
  return`${h%12||12}:${m[2]} ${h>=12?'PM':'AM'}`;
};

export default function WeeklyScheduleBoard({
  entries=[],
  students=[],
  timeFormat='12h',
  onEdit,
  onDelete,
  showPullSource=false,
  emptyLabel='No sessions',
}){
  const active=(entries||[]).filter(e=>!e.archived&&e.active!==false);
  const isBlocked=e=>String(e.notes||'').includes('NON-INSTRUCTIONAL / UNAVAILABLE');

  return <div className='grid lg:grid-cols-5 gap-4'>
    {DAYS.map(day=><Card key={day} className='p-4'>
      <h3 className='font-semibold text-sm mb-3 text-primary'>{day}</h3>
      <div className='space-y-2'>
        {active.filter(e=>e.day===day).sort((a,b)=>String(a.start_time||'').localeCompare(String(b.start_time||''))).map(e=>
          <div key={e.id} className={`rounded-lg border p-3 group relative ${isBlocked(e)?'border-sky-200 bg-sky-50/70':'border-border'}`}>
            {(onEdit||onDelete)&&<div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100'>
              {onEdit&&<button onClick={()=>onEdit(e)} className='rounded p-1 text-muted-foreground hover:bg-accent'><Pencil className='h-3.5 w-3.5'/></button>}
              {onDelete&&<button onClick={()=>onDelete(e)} className='rounded p-1 text-muted-foreground hover:text-rose-500'><Trash2 className='h-3.5 w-3.5'/></button>}
            </div>}
            <div className='font-medium text-sm pr-10 flex items-center gap-1.5'>
              {isBlocked(e)&&<Coffee className='h-3.5 w-3.5 text-sky-700'/>}
              {e.group_name||'Schedule block'}
            </div>
            <div className='text-xs text-muted-foreground'>
              {displayTime(e.start_time,timeFormat)}–{displayTime(e.end_time,timeFormat)}
              {e.delivery?` · ${DELIVERY_LABEL[e.delivery]||e.delivery}`:''}
              {e.period?` · ${e.period}`:''}
            </div>
            {(e.service_minutes||e.teacher_classroom)&&<div className='text-xs text-muted-foreground'>
              {e.service_minutes?`${e.service_minutes} min`:''}
              {e.service_minutes&&e.teacher_classroom?' · ':''}
              {e.teacher_classroom||''}
            </div>}
            {e.student_ids?.length>0&&<div className='text-xs text-muted-foreground mt-1'>
              {sortStudentIdsAlpha(e.student_ids,students).map(id=>studentName(students,id)).join(', ')}
            </div>}
            {showPullSource&&!isBlocked(e)&&<PullSourceList entry={e} students={students||[]}/>}
            {e.notes&&!isBlocked(e)&&!/^Imported from Mr\. D Resource Schedule PDF; recurrence expanded by weekday\.?$/i.test(String(e.notes).trim())&&
              <div className='mt-2 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600'>{e.notes}</div>}
          </div>
        )}
        {active.filter(e=>e.day===day).length===0&&<p className='text-xs text-muted-foreground'>{emptyLabel}</p>}
      </div>
    </Card>)}
  </div>;
}

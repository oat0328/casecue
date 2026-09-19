import React,{useMemo,useState}from'react';
import{Check,AlertTriangle,Users,Clock,Coffee,BookOpen}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Card}from'@/components/ui/cards';
import{findConflicts,normalizeDay,DELIVERY_LABEL,sortStudentsAlpha}from'@/lib/scheduleUtils';
import AiDisclaimer from'@/components/shared/AiDisclaimer';

const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
const CONF={high:'bg-emerald-100 text-emerald-700',medium:'bg-amber-100 text-amber-700',low:'bg-orange-100 text-orange-700',none:'bg-rose-100 text-rose-700'};
const canon=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
const toMin=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null};
const duration=(start,end,fallback=0)=>{const a=toMin(start),b=toMin(end);return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:Number(fallback)||0};
const subjectOf=g=>String(g.group_name||'Unnamed group').split('·')[0].trim();
const periodOf=g=>String(g.period||String(g.group_name||'').split('·').slice(1).join('·')||'').trim()||`${g.start_time||'?'}–${g.end_time||'?'}`;
const rosterName=s=>`${s?.first_name||''} ${s?.last_name||''}`.replace(/\s+/g,' ').trim();

export default function ScheduleReview({analysis,students,saving,onSave,onCancel,workspaceKey='sped'}){
 const isPara=workspaceKey==='para';
 const[groups,setGroups]=useState(()=>(analysis.groups||[]).map(g=>({...g,included:true,assignments:{}})));
 const blocked=analysis.non_instructional_blocks||[],roster=students||[];
 const sortedRoster=useMemo(()=>sortStudentsAlpha(roster),[roster]);
 const rosterById=useMemo(()=>Object.fromEntries(roster.map(s=>[s.id,s])),[roster]);

 const resolvedId=(g,st)=>{
  if(st.match_type==='exact'&&st.student_id)return st.student_id;
  return g.assignments[canon(st.name)]||'';
 };
 const resolveIds=g=>[...new Set((g.students||[]).map(st=>resolvedId(g,st)).filter(Boolean))];

 const assignName=(name,id)=>{
  const key=canon(name);
  setGroups(prev=>prev.map(g=>({...g,assignments:{...g.assignments,[key]:id}})));
 };
 const confirmAllSuggested=()=>{
  const pairs=unresolved.flatMap(item=>item.probableIds.length===1?[[item.key,item.probableIds[0]]]:[]);
  if(!pairs.length)return;
  setGroups(prev=>prev.map(g=>({
   ...g,
   assignments:{...g.assignments,...Object.fromEntries(pairs)}
  })));
 };
 const toggle=gi=>setGroups(prev=>prev.map((g,i)=>i===gi?{...g,included:!g.included}:g));

 const unresolved=useMemo(()=>{
  const map=new Map();
  groups.filter(g=>g.included).forEach(g=>(g.students||[]).forEach(st=>{
   if(st.match_type==='exact'&&st.student_id)return;
   const key=canon(st.name);
   if(!key||g.assignments[key])return;
   if(!map.has(key))map.set(key,{key,name:st.name,variants:new Set(),probableIds:new Set(),probableNames:new Set()});
   const item=map.get(key);
   item.variants.add(st.name);
   if(st.probable_student_id)item.probableIds.add(st.probable_student_id);
   if(st.probable_student_name)item.probableNames.add(st.probable_student_name);
  }));
  return [...map.values()].map(item=>({
   ...item,
   variants:[...item.variants],
   probableIds:[...item.probableIds],
   probableNames:[...item.probableNames]
  }));
 },[groups]);

 const preview=useMemo(()=>groups.filter(g=>g.included).map(g=>({
  group_name:g.group_name||'Unnamed group',
  day:normalizeDay(g.day),
  start_time:g.start_time,
  end_time:g.end_time,
  student_ids:resolveIds(g)
 })),[groups]);
 const overlapChecks=useMemo(()=>findConflicts(preview),[preview]);
 const conflicts=useMemo(()=>overlapChecks.filter(c=>!c.same_slot),[overlapChecks]);
 const multiServiceReviews=useMemo(()=>overlapChecks.filter(c=>c.same_slot),[overlapChecks]);
 const matchedIds=useMemo(()=>new Set(groups.filter(g=>g.included).flatMap(resolveIds)),[groups]);
 const activeRoster=useMemo(()=>sortStudentsAlpha(roster.filter(s=>s.roster_status!=='archived'&&s.status!=='exited')),[roster]);
 const missingRoster=useMemo(()=>unresolved.length?[]:activeRoster.filter(s=>!matchedIds.has(s.id)),[activeRoster,matchedIds,unresolved.length]);

 const slotStats=useMemo(()=>{
  const slots=new Map();
  groups.filter(g=>g.included).forEach(g=>{
   const day=normalizeDay(g.day),key=`${day}|${g.start_time||''}|${g.end_time||''}`;
   const mins=duration(g.start_time,g.end_time,g.service_minutes);
   if(!slots.has(key)||slots.get(key)<mins)slots.set(key,mins);
  });
  return{count:slots.size,minutes:[...slots.values()].reduce((a,b)=>a+b,0)};
 },[groups]);

 const hasSourceDetails=useMemo(()=>groups.some(g=>(g.students||[]).some(st=>
  st.source_subject||st.source_teacher||st.source_period||st.source_room||st.class_start_time||st.class_end_time
 )),[groups]);

 const periods=useMemo(()=>{
  const map=new Map();
  groups.forEach(g=>{
   const label=periodOf(g),start=g.start_time||'',end=g.end_time||'';
   if(!map.has(label))map.set(label,{label,start,end});
  });
  blocked.forEach(b=>{
   const existing=[...map.values()].find(p=>p.start===b.start_time&&p.end===b.end_time);
   if(!existing){
    const label=`${b.start_time||'?'}–${b.end_time||'?'}`;
    map.set(label,{label,start:b.start_time||'',end:b.end_time||''});
   }
  });
  return[...map.values()].sort((a,b)=>(toMin(a.start)??9999)-(toMin(b.start)??9999));
 },[groups,blocked]);

 const stats=[
  ['Subject blocks',groups.filter(g=>g.included).length],
  ['Confirmed students',matchedIds.size],
  ['Names to confirm',unresolved.length],
  ['Instructional slots',slotStats.count],
  ['Unique weekly min',slotStats.minutes],
  ['Conflicts',conflicts.length]
 ];

 const save=()=>{
  if(unresolved.length)return;
  const entries=groups.filter(g=>g.included).map(g=>({
   group_name:g.group_name||'Unnamed group',
   delivery:(isPara?['pull-out','push-in','consultation','class','session','support','other']:['pull-out','push-in','consultation']).includes(g.delivery)?g.delivery:(isPara?'class':'pull-out'),
   day:normalizeDay(g.day),
   start_time:g.start_time||'',
   end_time:g.end_time||'',
   service_minutes:Number(g.service_minutes)||0,
   teacher_classroom:g.teacher_classroom||'',
   notes:g.notes||'',
   week_pattern:['every_week','A_week','B_week','alternating'].includes(g.week_pattern)?g.week_pattern:'every_week',
   cycle_day:g.cycle_day||'',
   period:g.period||'',
   recurrence_note:g.recurrence_note||'',
   student_ids:resolveIds(g),
   student_pull_details:(g.students||[]).map(st=>{
    const id=resolvedId(g,st),rs=rosterById[id];
    return{
     student_id:id,
     student_name:rs?rosterName(rs):(st.name||''),
     source_subject:st.source_subject||'',
     source_teacher:st.source_teacher||'',
     source_room:st.source_room||'',
     source_period:st.source_period||'',
     class_start_time:st.class_start_time||'',
     class_end_time:st.class_end_time||'',
     pull_start_time:st.pull_start_time||g.start_time||'',
     pull_end_time:st.pull_end_time||g.end_time||'',
     pull_rule:st.pull_rule||'',
     source_confidence:st.source_confidence||''
    };
   }).filter(x=>x.student_id)
  }));
  const blocks=blocked.map(b=>({
   group_name:b.label||'Unavailable',
   delivery:isPara?'other':'consultation',
   day:normalizeDay(b.day),
   start_time:b.start_time||'',
   end_time:b.end_time||'',
   service_minutes:0,
   teacher_classroom:'',
   notes:['NON-INSTRUCTIONAL / UNAVAILABLE',b.notes||''].filter(Boolean).join(' — '),
   week_pattern:'every_week',
   cycle_day:'',
   period:'',
   recurrence_note:'',
   student_ids:[],
   student_pull_details:[]
  }));
  const payload=[...entries,...blocks];
  if(payload.length)onSave(payload);
 };

 return <div className='space-y-5'>
  <AiDisclaimer extra={isPara?'Review the imported Para/student schedule and confirm assigned-student matches before saving. CaseCue preserves unknown information instead of guessing.':'Review the imported schedule and confirm roster matches before saving. CaseCue preserves unknown information instead of guessing.'}/>

  <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6'>
   {stats.map(([label,value])=><div key={label} className='rounded-xl border bg-card px-3 py-3 text-center'><div className='text-xl font-black'>{value}</div><div className='text-[11px] text-muted-foreground'>{label}</div></div>)}
  </div>

  {!isPara&&!hasSourceDetails&&<div className='rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900'>
   <b>Gen Ed source schedules were not included.</b>
   <div className='mt-1 text-xs leading-5 text-sky-800'>That is okay for importing this SPED schedule. Pull-from class, teacher, and class-window details are intentionally hidden until a source-class schedule is added.</div>
  </div>}

  {unresolved.length===0&&missingRoster.length>0&&<div className='rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900'>
   <b>{missingRoster.length} {isPara?'assigned':'active roster'} student{missingRoster.length===1?' is':'s are'} not represented in this uploaded schedule.</b>
   <div className='mt-1 text-xs leading-5 text-amber-800'>This does not automatically mean the schedule is wrong. Verify whether the source file intentionally omits the student or whether another schedule file should be uploaded before saving.</div>
   <div className='mt-2 flex flex-wrap gap-1.5'>{missingRoster.map(s=><span key={s.id} className='rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold'>{rosterName(s)}</span>)}</div>
  </div>}

  {unresolved.length>0&&<Card className='p-5 border-amber-300 bg-amber-50/40'>
   <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
    <div><div className='text-xs font-black uppercase tracking-[.15em] text-amber-700'>{isPara?'Confirm assigned students first':'Resolve roster names first'}</div><h3 className='mt-1 text-lg font-black'>{unresolved.length} name{unresolved.length===1?'':'s'} need confirmation</h3><p className='mt-1 text-sm text-slate-600'>{isPara?'CaseCue found a student name in the schedule, but it will not attach that schedule to someone who is not assigned to this Para account. Have the student assigned first, then confirm the match.':'Confirm each source name once. The choice applies everywhere that same name appears, including capitalization variants such as “Adonis Rose” and “Adonis rose.”'}</p></div>
    {unresolved.length>0&&unresolved.every(item=>item.probableIds.length===1)&&<Button type='button' variant='outline' onClick={confirmAllSuggested} className='shrink-0 border-amber-300 bg-white text-amber-900'>Confirm all {unresolved.length} suggested matches</Button>}
   </div>
   <div className='mt-4 grid gap-3 md:grid-cols-2'>
    {unresolved.map(item=>{
     const probableId=item.probableIds.length===1?item.probableIds[0]:'';
     const probableName=item.probableNames.length===1?item.probableNames[0]:'';
     return <div key={item.key} className='rounded-xl border bg-white p-3'>
      <div className='font-bold text-sm'>{item.variants.join(' / ')}</div>
      {probableId&&<button type='button' onClick={()=>assignName(item.name,probableId)} className='mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs font-bold text-amber-900'>Confirm suggested student: {probableName||rosterName(rosterById[probableId])}</button>}
      <select className='mt-2 w-full rounded-lg border bg-white px-2 py-2 text-xs' value='' onChange={e=>e.target.value&&assignName(item.name,e.target.value)}>
       <option value=''>Choose another student…</option>
       {sortedRoster.map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
      </select>
     </div>
    })}
   </div>
  </Card>}

  {(analysis.conflicts||[]).length>0&&<div className='rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'><b className='flex gap-1'><AlertTriangle className='h-4 w-4'/>Issues found in the import</b>{analysis.conflicts.map((c,i)=><div key={i} className='mt-1'>• {c.description}</div>)}</div>}

  {(analysis.extraction_notes||[]).length>0&&<div className='rounded-xl border bg-muted/40 p-3 text-sm'><b>Import notes:</b> {analysis.extraction_notes.join(' · ')}</div>}

  {blocked.length>0&&<div className='rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm'><b className='flex gap-1'><Coffee className='h-4 w-4'/>Blocked time found</b>{blocked.map((b,i)=><div key={i}>{b.label} · {normalizeDay(b.day)} · {b.start_time}–{b.end_time}</div>)}</div>}

  <Card className='overflow-hidden'>
   <div className='border-b bg-slate-950 px-5 py-4 text-white'>
    <div className='text-xs font-black uppercase tracking-[.15em] text-sky-300'>{isPara?'Para / student schedule preview':'Weekly schedule preview'}</div>
    <div className='mt-1 text-sm text-slate-300'>{isPara?'Class-context and support blocks are shown at their source times. Nothing becomes an IEP/service decision here.':'This mirrors the source grid. Multiple subjects can share one period without being treated as one combined group.'}</div>
   </div>
   <div className='overflow-x-auto'>
    <table className='min-w-[1000px] w-full border-collapse text-xs'>
     <thead><tr className='bg-slate-50'><th className='border-b border-r p-3 text-left w-36'>Period</th>{DAYS.map(day=><th key={day} className='border-b border-r p-3 text-left'>{day}</th>)}</tr></thead>
     <tbody>{periods.map(p=><tr key={p.label}>
      <td className='border-r border-b bg-slate-50 p-3 align-top'><div className='font-black'>{p.label}</div><div className='mt-1 text-[10px] text-slate-500'>{p.start||'?'}–{p.end||'?'}</div></td>
      {DAYS.map(day=>{
       const cellGroups=groups.map((g,index)=>({g,index})).filter(({g})=>normalizeDay(g.day)===day&&g.start_time===p.start&&g.end_time===p.end);
       const cellBlocks=blocked.filter(b=>normalizeDay(b.day)===day&&b.start_time===p.start&&b.end_time===p.end);
       return <td key={day} className='border-r border-b p-2 align-top'>
        <div className='space-y-1.5'>
         {cellBlocks.map((b,i)=><div key={'b'+i} className='rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 font-black text-sky-800'>{b.label||'Blocked'}</div>)}
         {cellGroups.map(({g,index})=>{
          const unresolvedHere=(g.students||[]).filter(st=>st.match_type!=='exact'&&!g.assignments[canon(st.name)]).length;
          return <button type='button' key={index} onClick={()=>toggle(index)} className={`w-full rounded-lg border px-2 py-2 text-left transition ${g.included?'bg-white hover:bg-slate-50':'bg-slate-100 opacity-50'}`}>
           <div className='font-black'>{subjectOf(g)}</div>
           <div className='mt-0.5 text-[10px] text-slate-500'>{(g.students||[]).length} source student{(g.students||[]).length===1?'':'s'}{unresolvedHere? ` · ${unresolvedHere} to confirm`:''}</div>
          </button>
         })}
         {!cellGroups.length&&!cellBlocks.length&&<div className='px-1 py-2 text-[10px] text-slate-300'>—</div>}
        </div>
       </td>;
      })}
     </tr>)}</tbody>
    </table>
   </div>
  </Card>

  <div>
   <div className='mb-2 text-sm font-black'>{isPara?'Detailed block review':'Detailed group review'}</div>
   <div className='space-y-2'>
    {groups.map((g,gi)=><details key={gi} className={`rounded-xl border bg-card ${!g.included?'opacity-50':''}`}>
     <summary className='cursor-pointer list-none p-4'>
      <div className='flex items-center justify-between gap-3'>
       <div className='flex items-center gap-2.5'>
        <button type='button' onClick={e=>{e.preventDefault();toggle(gi)}} className={`h-5 w-5 rounded-md border flex items-center justify-center ${g.included?'brand-gradient border-transparent':'bg-card'}`}>{g.included&&<Check className='h-3.5 w-3.5 text-white'/>}</button>
        <div><div className='font-bold'>{g.group_name||'Unnamed group'}</div><div className='text-xs text-muted-foreground'>{normalizeDay(g.day)} · {g.start_time||'?'}–{g.end_time||'?'} · {DELIVERY_LABEL[g.delivery]||g.delivery}</div></div>
       </div>
       <span className='text-xs text-muted-foreground flex gap-1'><Users className='h-3.5 w-3.5'/>{(g.students||[]).length}</span>
      </div>
     </summary>
     <div className='border-t p-4'>
      <div className='grid gap-2 md:grid-cols-2'>
       {[...(g.students||[])].sort((a,b)=>{const ar=rosterById[resolvedId(g,a)],br=rosterById[resolvedId(g,b)];const ak=ar?`${ar.last_name} ${ar.first_name}`:String(a.name||'');const bk=br?`${br.last_name} ${br.first_name}`:String(b.name||'');return ak.localeCompare(bk,undefined,{sensitivity:'base'})}).map((st,si)=>{
        const id=resolvedId(g,st),rs=rosterById[id],resolved=Boolean(id);
        return <div key={si} className='rounded-xl border bg-slate-50/70 p-3'>
         <div className='flex flex-wrap items-center justify-between gap-2'><div className='font-semibold text-sm'>{rs?rosterName(rs):st.name}</div><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${resolved?CONF.high:(CONF[st.confidence]||CONF.none)}`}>{resolved?'Confirmed':'Needs match'}</span></div>
         {st.name&&rs&&canon(st.name)!==canon(rosterName(rs))&&<div className='mt-1 text-[10px] text-slate-500'>Source name: {st.name}</div>}
         {hasSourceDetails&&(st.source_subject||st.source_teacher||st.source_period||st.class_start_time||st.class_end_time)&&<div className='mt-2 grid gap-2 text-xs'>
          <div className='rounded-lg bg-white border px-3 py-2'><div className='font-bold text-slate-700 flex gap-1'><BookOpen className='h-3.5 w-3.5'/>{isPara?'Source class':'Pull from'}</div><div className='mt-1'>{st.source_subject||'Subject not identified'}{st.source_period?` · ${st.source_period}`:''}</div><div className='text-muted-foreground'>{st.source_teacher||'Teacher not identified'}{st.source_room?` · Room ${st.source_room}`:''}</div></div>
          <div className='rounded-lg bg-white border px-3 py-2'><div className='font-bold text-slate-700 flex gap-1'><Clock className='h-3.5 w-3.5'/>{isPara?'Time window':'Class / pull window'}</div><div className='mt-1'>{isPara?'Block':'Class'}: {st.class_start_time||g.start_time||'?'}–{st.class_end_time||g.end_time||'?'}</div>{!isPara&&<div className='text-blue-700 font-semibold'>Pull: {st.pull_start_time||g.start_time||'?'}–{st.pull_end_time||g.end_time||'?'}</div>}</div>
         </div>}
        </div>;
       })}
       {!(g.students||[]).length&&<div className='text-xs text-muted-foreground'>No students were named for this source block.</div>}
      </div>
     </div>
    </details>)}
   </div>
  </div>

  {multiServiceReviews.length>0&&<div className='rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900'><b>{multiServiceReviews.length} same-slot multi-service assignment{multiServiceReviews.length===1?'':'s'} to review.</b><div className='mt-1 text-xs text-amber-800'>These are not counted as scheduling conflicts because the start and end times are identical. They may represent one session addressing more than one instructional area.</div><div className='mt-3 space-y-2'>{multiServiceReviews.map((c,i)=><div key={i} className='rounded-lg border border-amber-200 bg-white px-3 py-2'><div className='font-bold'>{(c.student_ids||[]).map(id=>rosterName(rosterById[id])||'Student').join(', ')}</div><div className='mt-1 text-xs'>{c.a.day} · {c.a.group_name} + {c.b.group_name} · {c.a.start_time}–{c.a.end_time}</div><div className='mt-1 text-[11px] text-amber-700'>Confirm that this is intentionally one shared service period or multi-area instructional session.</div></div>)}</div></div>}
  {conflicts.length>0&&<div className='rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900'><b>{conflicts.length} true overlapping service conflict{conflicts.length===1?'':'s'} detected in the current review.</b><div className='mt-3 space-y-2'>{conflicts.map((c,i)=><div key={i} className='rounded-lg border border-rose-200 bg-white px-3 py-2'><div className='font-bold'>{(c.student_ids||[]).map(id=>rosterName(rosterById[id])||'Student').join(', ')}</div><div className='mt-1 text-xs'>{c.a.day} · {c.a.group_name} {c.a.start_time}–{c.a.end_time} overlaps {c.b.group_name} {c.b.start_time}–{c.b.end_time}</div><div className='mt-1 text-[11px] text-rose-700'>Review the source schedule before changing either block. CaseCue is identifying the overlap, not deciding which service should move.</div></div>)}</div>{unresolved.length>0&&<div className='mt-2 text-xs text-rose-700'>Conflict count may increase after remaining roster names are confirmed.</div>}</div>}

  <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
   <Button variant='outline' onClick={onCancel}>Cancel</Button>
   <Button onClick={save} disabled={saving||unresolved.length>0||(groups.filter(g=>g.included).length+blocked.length===0)} className='brand-gradient text-white'>
    {saving?'Saving…':unresolved.length?`Confirm ${unresolved.length} name${unresolved.length===1?'':'s'} before saving`:groups.filter(g=>g.included).length+blocked.length?`Save ${groups.filter(g=>g.included).length+blocked.length} schedule entries`:'Nothing to save'}
   </Button>
  </div>
 </div>;
}

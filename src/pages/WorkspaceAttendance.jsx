import React,{useMemo,useState}from'react';
import{Navigate,useParams}from'react-router-dom';
import{CalendarDays,CheckCircle2,Clock3,Download,Search,ShieldCheck,UserCheck,UserMinus,UserX,Users,X}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{useToast}from'@/components/ui/use-toast';
import{WORKSPACES,getActiveWorkspace,getUserWorkspaces,workspaceHome}from'@/lib/workspaces';
import{sortStudentsByName}from'@/lib/studentSort';
import{formatDate,todayISO}from'@/lib/dateUtils';
import PageHeader from'@/components/PageHeader';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Card,StatCard}from'@/components/ui/cards';

const STATUS={
 present:{label:'Present',icon:UserCheck,className:'border-emerald-300 bg-emerald-50 text-emerald-800'},
 absent:{label:'Absent',icon:UserX,className:'border-rose-300 bg-rose-50 text-rose-800'},
 tardy:{label:'Tardy',icon:Clock3,className:'border-amber-300 bg-amber-50 text-amber-800'},
 excused:{label:'Excused',icon:ShieldCheck,className:'border-blue-300 bg-blue-50 text-blue-800'},
 left_early:{label:'Left Early',icon:UserMinus,className:'border-violet-300 bg-violet-50 text-violet-800'},
};

const TITLES={
 sped:['SPED Attendance','Track daily or service-block attendance without mixing it with another workspace.'],
 gen_ed:['Class Attendance','Take classroom attendance quickly, keep notes, and export a clean daily record.'],
 para:['Student Attendance','Track attendance only for students assigned to this Para workspace.'],
 speech:['Speech Attendance','Track who attended each speech block or use a daily attendance view.'],
 ot:['OT Attendance','Track attendance for OT sessions and scheduled service blocks.'],
 nurse:['Nurse Attendance','Track student attendance/check-ins for the Nurse workspace without changing district SIS records.'],
 psych:['Psych Attendance','Track student attendance for testing, observation, evaluation, or other scheduled blocks.'],
 substitute:['Substitute Attendance','Take attendance fast, preserve exceptions, and leave a clean record for the teacher.'],
 pe:['PE Attendance','Take PE attendance by day or scheduled class block and export the roster when needed.'],
};

const csvCell=v=>`"${String(v??'').replaceAll('"','""')}"`;
const displayTime=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return v||'';const h=Number(m[1]);return`${h%12||12}:${m[2]} ${h>=12?'PM':'AM'}`;};
const weekday=date=>new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{weekday:'long'});

export default function WorkspaceAttendance({workspaceKey:workspaceProp}){
 const params=useParams(),workspaceKey=workspaceProp||params.workspace||'sped';
 const{user}=useAuth(),{toast}=useToast();
 const allowed=getUserWorkspaces(user),activeWorkspace=getActiveWorkspace(user);
 const[date,setDate]=useState(todayISO());
 const[blockId,setBlockId]=useState('all');
 const[search,setSearch]=useState('');
 const[noteDrafts,setNoteDrafts]=useState({});
 const[lateDrafts,setLateDrafts]=useState({});
 const[bulkSaving,setBulkSaving]=useState(false);

 const para=workspaceKey==='para';
 const{data:studentRows}=useAsync(()=>para?Promise.resolve([]):base44.entities.Student.list('-last_name',800),[workspaceKey]);
 const{data:paraRows}=useAsync(()=>para?base44.entities.ParaStudentAccess.list('-last_name',800):Promise.resolve([]),[workspaceKey]);
 const students=useMemo(()=>{
   if(para)return sortStudentsByName((paraRows||[]).filter(s=>s.active!==false).map(s=>({...s,id:s.student_id})));
   return sortStudentsByName((studentRows||[]).filter(s=>s.roster_status!=='archived'&&s.status!=='exited'));
 },[para,paraRows,studentRows]);

 const{data:rawSchedule}=useAsync(()=>para?base44.entities.ParaScheduleBlock.list('start_time',800):base44.entities.ScheduleEntry.list('start_time',1200),[workspaceKey]);
 const schedule=useMemo(()=>{
   if(para)return(rawSchedule||[]).filter(e=>e.active!==false&&!e.archived);
   return(rawSchedule||[]).filter(e=>!e.archived&&(e.workspace||'sped')===workspaceKey);
 },[para,rawSchedule,workspaceKey]);

 const{data:records,refetch}=useAsync(()=>user?.id?base44.entities.AttendanceRecord.filter({user_id:user.id,workspace:workspaceKey},'-date',1500):Promise.resolve([]),[user?.id,workspaceKey]);

 const dayName=weekday(date);
 const dayBlocks=useMemo(()=>schedule.filter(e=>String(e.day||'').toLowerCase()===dayName.toLowerCase()).sort((a,b)=>String(a.start_time||'').localeCompare(String(b.start_time||''))),[schedule,dayName]);
 const selectedBlock=blockId==='all'?null:dayBlocks.find(x=>x.id===blockId)||null;
 const scope=selectedBlock?'schedule_block':'daily';
 const currentRecords=useMemo(()=>(records||[]).filter(r=>r.date===date&&r.scope===scope&&(scope==='daily'||r.schedule_entry_id===selectedBlock?.id)),[records,date,scope,selectedBlock?.id]);
 const recordByStudent=useMemo(()=>Object.fromEntries(currentRecords.map(r=>[r.student_id,r])),[currentRecords]);

 const roster=useMemo(()=>{
   let rows=students;
   const ids=selectedBlock?.student_ids||[];
   if(selectedBlock&&ids.length){const set=new Set(ids);rows=rows.filter(s=>set.has(s.id));}
   const q=search.trim().toLowerCase();
   if(q)rows=rows.filter(s=>`${s.first_name||''} ${s.last_name||''} ${s.grade||''}`.toLowerCase().includes(q));
   return rows;
 },[students,selectedBlock,search]);

 const counts=useMemo(()=>{
   const out={present:0,absent:0,tardy:0,excused:0,left_early:0,unmarked:0};
   for(const s of roster){const status=recordByStudent[s.id]?.status;if(status&&out[status]!=null)out[status]++;else out.unmarked++;}
   return out;
 },[roster,recordByStudent]);

 const meta=WORKSPACES[workspaceKey]||{short:'Workspace'};
 const[title,subtitle]=TITLES[workspaceKey]||['Attendance',`Track attendance in the ${meta.short} workspace.`];

 const payloadFor=(student,status,extra={})=>({
   organization_id:user?.organization_id||user?.data?.organization_id||'',
   user_id:user?.id||'',
   workspace:workspaceKey,
   student_id:student.id,
   student_name_snapshot:`${student.first_name||''} ${student.last_name||''}`.trim(),
   grade_snapshot:String(student.grade||''),
   date,
   status,
   minutes_late:status==='tardy'?Number(extra.minutes_late??recordByStudent[student.id]?.minutes_late??0):0,
   note:extra.note??recordByStudent[student.id]?.note??'',
   scope,
   schedule_entry_id:selectedBlock?.id||'',
   schedule_label:selectedBlock?.group_name||'',
   schedule_start_time:selectedBlock?.start_time||'',
   schedule_end_time:selectedBlock?.end_time||'',
   updated_at:new Date().toISOString(),
 });

 const setAttendance=async(student,status,extra={})=>{
   try{
     const existing=recordByStudent[student.id];
     if(existing)await base44.entities.AttendanceRecord.update(existing.id,payloadFor(student,status,extra));
     else await base44.entities.AttendanceRecord.create({...payloadFor(student,status,extra),recorded_at:new Date().toISOString()});
     await refetch();
   }catch(e){toast({title:'Attendance could not be saved',description:e.message,variant:'destructive'});}
 };

 const clearAttendance=async student=>{
   const existing=recordByStudent[student.id];if(!existing)return;
   try{await base44.entities.AttendanceRecord.delete(existing.id);await refetch();toast({title:'Attendance mark cleared'});}
   catch(e){toast({title:'Could not clear attendance',description:e.message,variant:'destructive'});}
 };

 const saveNote=async student=>{
   const existing=recordByStudent[student.id];
   if(!existing)return toast({title:'Choose an attendance status first'});
   await setAttendance(student,existing.status,{note:noteDrafts[student.id]??existing.note??'',minutes_late:lateDrafts[student.id]??existing.minutes_late??0});
   setNoteDrafts(p=>{const n={...p};delete n[student.id];return n;});
 };

 const markUnmarkedPresent=async()=>{
   const unmarked=roster.filter(s=>!recordByStudent[s.id]);if(!unmarked.length)return toast({title:'Everyone visible is already marked'});
   setBulkSaving(true);
   try{
     await base44.entities.AttendanceRecord.bulkCreate(unmarked.map(s=>({...payloadFor(s,'present'),recorded_at:new Date().toISOString()})));
     await refetch();toast({title:`${unmarked.length} student${unmarked.length===1?'':'s'} marked present`,description:'Existing absences, tardies, excused marks, and early departures were preserved.'});
   }catch(e){toast({title:'Could not mark attendance',description:e.message,variant:'destructive'});}
   finally{setBulkSaving(false);}
 };

 const exportCsv=()=>{
   const rows=[['Student','Grade','Date','Workspace','Scope','Schedule Block','Time','Status','Minutes Late','Note']];
   roster.forEach(s=>{const r=recordByStudent[s.id];rows.push([
     `${s.first_name||''} ${s.last_name||''}`.trim(),s.grade||'',date,meta.short,scope,selectedBlock?.group_name||'Daily',
     selectedBlock?`${displayTime(selectedBlock.start_time)}-${displayTime(selectedBlock.end_time)}`:'',
     r?STATUS[r.status]?.label||r.status:'Unmarked',r?.minutes_late||0,r?.note||''
   ])});
   const blob=new Blob([rows.map(r=>r.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`casecue-${workspaceKey}-attendance-${date}.csv`;a.click();URL.revokeObjectURL(url);
 };

 const recent=useMemo(()=>[...(records||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.updated_at||'').localeCompare(String(a.updated_at||''))).slice(0,60),[records]);

 if(workspaceKey==='sped'&&!allowed.includes('sped'))return <Navigate to={workspaceHome(activeWorkspace)} replace/>;
 if(workspaceKey!=='sped'&&(!WORKSPACES[workspaceKey]||!allowed.includes(workspaceKey)))return <Navigate to={workspaceHome(activeWorkspace)} replace/>;

 return <div className='space-y-6'>
  <PageHeader title={title} subtitle={subtitle} icon={UserCheck} actions={<>
   <Button variant='outline' className='border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white' onClick={exportCsv}><Download className='h-4 w-4'/>Export CSV</Button>
   <Button onClick={markUnmarkedPresent} disabled={bulkSaving||!roster.length}><CheckCircle2 className='h-4 w-4'/>{bulkSaving?'Saving…':'Mark Unmarked Present'}</Button>
  </>}/>

  <Card className='p-4 sm:p-5'>
   <div className='grid gap-4 lg:grid-cols-[220px_1fr_260px] lg:items-end'>
    <div><label className='text-xs font-black uppercase tracking-wider text-slate-500'>Attendance date</label><Input className='mt-1' type='date' value={date} onChange={e=>{setDate(e.target.value);setBlockId('all')}}/></div>
    <div><label className='text-xs font-black uppercase tracking-wider text-slate-500'>Schedule view</label><select className='mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm' value={blockId} onChange={e=>setBlockId(e.target.value)}><option value='all'>Daily attendance · all accessible students</option>{dayBlocks.map(b=><option key={b.id} value={b.id}>{displayTime(b.start_time)}{b.end_time?`–${displayTime(b.end_time)}`:''} · {b.group_name||'Schedule block'}</option>)}</select></div>
    <div><label className='text-xs font-black uppercase tracking-wider text-slate-500'>Find student</label><div className='relative mt-1'><Search className='absolute left-3 top-3 h-4 w-4 text-slate-400'/><Input className='pl-9' value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search name or grade…'/></div></div>
   </div>
   {selectedBlock&&!(selectedBlock.student_ids||[]).length&&<div className='mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'><b>This schedule block has no student roster attached.</b> CaseCue is showing all students accessible to this workspace so you can still take attendance.</div>}
  </Card>

  <div className='grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'>
   <StatCard label='Students' value={roster.length} icon={Users}/>
   <StatCard label='Present' value={counts.present} icon={UserCheck} tone='green'/>
   <StatCard label='Absent' value={counts.absent} icon={UserX} tone='red'/>
   <StatCard label='Tardy' value={counts.tardy} icon={Clock3} tone='amber'/>
   <StatCard label='Excused / Early' value={counts.excused+counts.left_early} icon={ShieldCheck} tone='blue'/>
   <StatCard label='Unmarked' value={counts.unmarked} icon={CalendarDays}/>
  </div>

  <Card className='overflow-hidden'>
   <div className='border-b bg-slate-50 px-5 py-4'>
    <div className='flex flex-wrap items-center justify-between gap-2'><div><h2 className='font-black'>{selectedBlock?.group_name||'Daily roster'}</h2><p className='text-xs text-slate-500'>{formatDate(date)} · {dayName}{selectedBlock?.start_time?` · ${displayTime(selectedBlock.start_time)}${selectedBlock.end_time?`–${displayTime(selectedBlock.end_time)}`:''}`:''}</p></div><div className='text-xs font-bold text-slate-500'>{roster.length-counts.unmarked}/{roster.length} marked</div></div>
   </div>
   <div className='divide-y'>
    {roster.map(student=>{
      const r=recordByStudent[student.id],noteValue=noteDrafts[student.id]??r?.note??'',lateValue=lateDrafts[student.id]??r?.minutes_late??0;
      return <div key={student.id} className='p-4 sm:p-5'>
       <div className='flex flex-col gap-4 xl:flex-row xl:items-start'>
        <div className='min-w-[190px] xl:w-[220px]'><div className='font-black'>{student.last_name}, {student.first_name}</div><div className='text-xs text-slate-500'>Grade {student.grade||'—'}</div></div>
        <div className='flex flex-1 flex-wrap gap-2'>{Object.entries(STATUS).map(([key,m])=>{const I=m.icon,active=r?.status===key;return <button key={key} onClick={()=>setAttendance(student,key,{minutes_late:key==='tardy'?lateValue:0})} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition ${active?m.className:'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}><I className='h-3.5 w-3.5'/>{m.label}</button>})}{r&&<button onClick={()=>clearAttendance(student)} className='inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-700'><X className='h-3.5 w-3.5'/>Unmark</button>}</div>
        {r?.status==='tardy'&&<div className='w-28'><label className='text-[10px] font-black uppercase text-slate-400'>Min late</label><Input type='number' min='0' value={lateValue} onChange={e=>setLateDrafts(p=>({...p,[student.id]:e.target.value}))} onBlur={()=>setAttendance(student,'tardy',{minutes_late:Number(lateDrafts[student.id]??r.minutes_late??0)})}/></div>}
       </div>
       <div className='mt-3 flex flex-col gap-2 sm:flex-row'><Input disabled={!r} value={noteValue} onChange={e=>setNoteDrafts(p=>({...p,[student.id]:e.target.value}))} placeholder={r?'Optional attendance note…':'Choose a status to add a note'}/><Button variant='outline' disabled={!r||noteValue===String(r.note||'')} onClick={()=>saveNote(student)}>Save Note</Button></div>
      </div>
    })}
    {!roster.length&&<div className='p-10 text-center text-sm text-slate-500'>No students are available in this attendance view.</div>}
   </div>
  </Card>

  <Card className='p-5'>
   <div className='flex items-start gap-3'><div className='grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700'><ShieldCheck className='h-4 w-4'/></div><div><h3 className='font-black'>Attendance record boundary</h3><p className='mt-1 text-sm text-slate-600'>This is a CaseCue classroom/service attendance log for the current workspace. It does not replace the school or district attendance system of record unless your institution has explicitly authorized that workflow.</p></div></div>
  </Card>

  <Card className='overflow-hidden'>
   <div className='border-b bg-slate-50 px-5 py-4'><h2 className='font-black'>Recent attendance history</h2><p className='text-xs text-slate-500'>Your latest records in the {meta.short} workspace.</p></div>
   <div className='divide-y'>
    {recent.map(r=><div key={r.id} className='grid gap-2 px-5 py-3 text-sm sm:grid-cols-[110px_1.2fr_.7fr_1fr_1.5fr] sm:items-center'><div className='font-semibold'>{formatDate(r.date)}</div><div><b>{r.student_name_snapshot||'Student'}</b>{r.grade_snapshot?<span className='text-xs text-slate-500'> · Grade {r.grade_snapshot}</span>:null}</div><div><span className={`rounded-full border px-2 py-1 text-[11px] font-black ${STATUS[r.status]?.className||''}`}>{STATUS[r.status]?.label||r.status}</span></div><div className='text-xs text-slate-500'>{r.schedule_label||'Daily'}{r.status==='tardy'&&r.minutes_late?` · ${r.minutes_late} min late`:''}</div><div className='truncate text-xs text-slate-500'>{r.note||'—'}</div></div>)}
    {!recent.length&&<div className='p-8 text-center text-sm text-slate-500'>No attendance has been recorded in this workspace yet.</div>}
   </div>
  </Card>
 </div>;
}

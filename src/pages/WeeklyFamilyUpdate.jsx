
import React,{useMemo,useState}from'react';
import{useLocation}from'react-router-dom';
import{CalendarDays,Copy,Mail,RefreshCcw,Save,Sparkles,Trash2,CheckCircle2,AlertTriangle,History,GraduationCap,TrendingUp,ClipboardCheck,Clock3}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{workspaceFromPath}from'@/lib/workspaceCapabilities';
import{useToast}from'@/components/ui/use-toast';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Card}from'@/components/ui/cards';
import{PremiumLineChart,PremiumBarChart,PremiumDonutChart}from'@/components/shared/PremiumAnalytics';
import AnalyticsPdfButton from'@/components/shared/AnalyticsPdfButton';

const iso=d=>{const x=new Date(d),o=x.getTimezoneOffset();return new Date(x.getTime()-o*60000).toISOString().slice(0,10)};
const schoolWeek=(offset=0)=>{const d=new Date();const weekday=(d.getDay()+6)%7;d.setDate(d.getDate()-weekday+(offset*7));const start=iso(d),f=new Date(d);f.setDate(f.getDate()+4);return{start,end:iso(f)}};
const full=s=>s?((s.first_name||'')+' '+(s.last_name||'')).trim():'Student';
const roleName=w=>w==='para'?'Para':w==='gen_ed'?'Gen Ed':'SPED';
const fmtDate=d=>{if(!d)return'';const x=new Date(d+'T12:00:00');return Number.isNaN(x.getTime())?d:x.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})};
const hasEvidence=u=>{if(!u)return false;if(typeof u.metrics?.has_meaningful_data==='boolean')return u.metrics.has_meaningful_data;const c=Array.isArray(u.metrics?.latest_course_grades)?u.metrics.latest_course_grades.length:0,s=u.source_counts||{};return c>0||['grade_records','progress_records','attendance_records','para_notes','session_records'].some(k=>Number(s[k]||0)>0)};
const noDataMessage=u=>{const first=String(u?.student_name||'the student').split(/\s+/)[0]||'the student';return `Hello,\n\nFor ${fmtDate(u?.week_start)} through ${fmtDate(u?.week_end)}, CaseCue does not yet have enough recorded information to create a meaningful weekly progress update for ${first}. No current course-grade percentage, graded assignment result, learning-goal data point, attendance record, support observation, or service/session record was available in this workspace for the reporting period.\n\nRather than guess or fill in missing information, this draft is intentionally limited. Please add or verify the week’s records, or choose a week with documented data, before sending a progress summary to the family.`};

export default function WeeklyFamilyUpdate(){
 const{user}=useAuth(),{toast}=useToast(),routeLocation=useLocation();
 const workspace=workspaceFromPath(routeLocation.pathname,'sped');
 const initial=schoolWeek(0);
 const[studentId,setStudentId]=useState(''),[weekStart,setWeekStart]=useState(initial.start),[weekEnd,setWeekEnd]=useState(initial.end),[busy,setBusy]=useState(false),[current,setCurrent]=useState(null),[message,setMessage]=useState(''),[subject,setSubject]=useState('');

 const{data:studentRows}=useAsync(()=>workspace==='para'?Promise.resolve([]):base44.entities.Student.list('-last_name',800),[workspace]);
 const{data:paraRows}=useAsync(()=>workspace==='para'?base44.entities.ParaStudentAccess.list('-last_name',800):Promise.resolve([]),[workspace]);
 const students=useMemo(()=>workspace==='para'?(paraRows||[]).filter(x=>x.active!==false).map(x=>({...x,id:x.student_id})):(studentRows||[]).filter(x=>x.roster_status!=='archived'&&x.status!=='exited'),[workspace,paraRows,studentRows]);
 const{data:history,refetch:refetchHistory}=useAsync(()=>base44.entities.WeeklyFamilyUpdate.filter({workspace},'-generated_at',250),[workspace]);
 const selected=students.find(s=>s.id===studentId)||null;

 const generate=async()=>{
  if(!studentId)return toast({title:'Choose a student first',variant:'destructive'});
  setBusy(true);
  try{
   const r=await base44.functions.invoke('generateWeeklyFamilyUpdate',{student_id:studentId,workspace,week_start:weekStart,week_end:weekEnd});
   const data=r?.data||r;if(data?.error)throw new Error(data.error);
   setCurrent(data.update);setMessage(data.update.family_message||'');setSubject(data.update.subject_line||'');await refetchHistory();
   toast({title:'Weekly family update ready',description:'CaseCue calculated the data first, then drafted the family message from those verified numbers.'});
  }catch(e){toast({title:'Could not generate weekly update',description:e?.response?.data?.error||e?.data?.error||e.message,variant:'destructive'})}
  finally{setBusy(false)}
 };

 const openSaved=u=>{const covered=hasEvidence(u),safe=covered?u:{...u,strengths:[],focus_areas:[],next_steps:[],metrics:{...(u.metrics||{}),has_meaningful_data:false},data_notes:[...new Set([...(u.data_notes||[]),'No reportable CaseCue data was available for this student/week.','Older no-data narrative is suppressed to prevent unsupported family-facing statements.'])]};setCurrent(safe);setStudentId(u.student_id||'');setWeekStart(u.week_start||weekStart);setWeekEnd(u.week_end||weekEnd);setMessage(covered?(u.family_message||''):noDataMessage(u));setSubject(covered?(u.subject_line||''):`Weekly data check-in for ${String(u.student_name||'Student').split(/\s+/)[0]}`);window.scrollTo({top:0,behavior:'smooth'})};
 const save=async(status)=>{
  if(!current)return;
  try{
   const next={subject_line:subject,family_message:message,status:status||current.status||'draft',updated_at:new Date().toISOString()};
   await base44.entities.WeeklyFamilyUpdate.update(current.id,next);setCurrent({...current,...next});await refetchHistory();toast({title:status==='ready'?'Weekly update marked ready':'Weekly update saved'});
  }catch(e){toast({title:'Could not save update',description:e.message,variant:'destructive'})}
 };
 const remove=async u=>{if(!window.confirm('Delete this saved weekly family update?'))return;await base44.entities.WeeklyFamilyUpdate.delete(u.id);if(current?.id===u.id){setCurrent(null);setMessage('');setSubject('')}await refetchHistory();toast({title:'Weekly update deleted'})};
 const copy=async()=>{await navigator.clipboard.writeText((subject?subject+'\n\n':'')+message);toast({title:'Weekly family update copied'})};
 const email=()=>{window.location.href='mailto:?subject='+encodeURIComponent(subject||'Weekly student update')+'&body='+encodeURIComponent(message)};
 const setWeek=offset=>{const w=schoolWeek(offset);setWeekStart(w.start);setWeekEnd(w.end)};

 const m=current?.metrics||{},charts=current?.chart_data||{},covered=hasEvidence(current),counts=current?.source_counts||{};
 const courseGrades=Array.isArray(m.latest_course_grades)?m.latest_course_grades:[];
 const gradeTrend=Array.isArray(charts.grade_trend)?charts.grade_trend:[];
 const courseChart=Array.isArray(charts.current_course_grades)?charts.current_course_grades:[];
 const progressTrend=Array.isArray(charts.progress_trend)?charts.progress_trend:[];
 const attendance=m.attendance||{};
 const attendanceChart=[['Present',attendance.present],['Absent',attendance.absent],['Tardy',attendance.tardy],['Excused',attendance.excused],['Left early',attendance.left_early]].map(([name,value])=>({name,value:Number(value||0)}));
 const metricRows=current?[
  {label:'Weekly work average',value:m.weekly_assignment_average==null?'N/A':m.weekly_assignment_average+'%',detail:Number(m.graded_assignments)>0?m.graded_assignments+' graded assignment'+(m.graded_assignments===1?'':'s'):'No graded work recorded'},
  {label:'Learning-goal average',value:m.progress_average==null?'N/A':m.progress_average+'%',detail:Number(m.progress_points)>0?m.progress_points+' recorded data point'+(m.progress_points===1?'':'s'):'No learning-goal data recorded'},
  {label:'Missing work',value:Number(counts.grade_records)>0?String(m.missing_assignments||0):'N/A',detail:Number(counts.grade_records)>0?'recorded this week':'No weekly grade records'},
  {label:workspace==='para'?'Para support minutes':'Session minutes',value:workspace==='para'?(Number(counts.para_notes)>0?String(m.support_minutes||0):'N/A'):(Number(counts.session_records)>0?String(m.session_minutes||0):'N/A'),detail:workspace==='para'?(Number(counts.para_notes)>0?(m.support_notes||0)+' support note(s)':'No Para observations recorded'):(Number(counts.session_records)>0?(m.sessions||0)+' session(s)':'No sessions recorded')}
 ]:[];

 const pdfCharts=[];
 if(courseChart.length)pdfCharts.push({type:'bar',title:'Latest Recorded Course Grades',subtitle:'Current grade percentages stored in CaseCue.',data:courseChart,series:[{key:'percentage',label:'Grade %'}]});
 if(gradeTrend.length)pdfCharts.push({type:'line',title:'This Week’s Assignment Scores',subtitle:'Verified assignment percentages for the selected week.',data:gradeTrend,series:[{key:'percentage',label:'Assignment %'}]});
 if(progressTrend.length)pdfCharts.push({type:'line',title:'This Week’s Learning-Goal Checks',subtitle:'Recorded progress-monitoring percentages for the selected week.',data:progressTrend,series:[{key:'percentage',label:'Progress %'}]});
 const pdfSections=current?[{heading:covered?'Family Message':'Data Coverage Notice',body:message},...(covered?[{heading:'Strengths',body:(current.strengths||[]).map(x=>'• '+x).join('\n')},{heading:'Current Focus',body:(current.focus_areas||[]).map(x=>'• '+x).join('\n')},{heading:'Next Steps',body:(current.next_steps||[]).map(x=>'• '+x).join('\n')}]:[])]:[];
 const pdfNotes=current?[...(current.data_notes||[]),!covered?'AI strengths/focus/next-step narrative was intentionally skipped because the record did not contain enough reportable data.':workspace==='para'?'Para-generated draft: educator/case-manager review is required before family distribution.':'Educator review is required before family distribution.']:[];
 const filename=current?'casecue-'+workspace+'-'+String(current.student_name||'student').replace(/[^a-z0-9]+/gi,'-')+'-'+current.week_start+'-weekly-update':'casecue-weekly-family-update';

 return <div className="space-y-6">
  <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white">
   <div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue {roleName(workspace)} · Weekly Family Update</div>
   <h1 className="mt-3 text-3xl font-black sm:text-4xl">Grades, percentages, graphs, and the weekly story — together.</h1>
   <p className="mt-3 max-w-3xl text-slate-300">CaseCue calculates the student data first, then uses AI to turn those verified records into a warm family update you can review, edit, save, print, download, copy, or email.</p>
  </section>

  {workspace==='para'&&<Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><AlertTriangle className="mr-2 inline h-4 w-4"/><b>Para workflow:</b> CaseCue can draft the update from the assigned student's records and your documented support data, but the family-facing message should be reviewed by the teacher/case manager before it is distributed.</Card>}

  <Card className="p-6">
   <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
    <div><label className="text-sm font-black">Student</label><select className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Choose student…</option>{students.map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name} · Grade {s.grade||'—'}</option>)}</select></div>
    <div><label className="text-sm font-black">Week starts</label><Input type="date" value={weekStart} onChange={e=>setWeekStart(e.target.value)}/></div>
    <div><label className="text-sm font-black">Week ends</label><Input type="date" value={weekEnd} onChange={e=>setWeekEnd(e.target.value)}/></div>
    <div className="flex items-end"><Button className="w-full bg-slate-950" onClick={generate} disabled={busy||!studentId}><Sparkles className="mr-2 h-4 w-4"/>{busy?'Building update…':'Generate Weekly Update'}</Button></div>
   </div>
   <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>setWeek(0)}><CalendarDays className="mr-1 h-3.5 w-3.5"/>This school week</Button><Button size="sm" variant="outline" onClick={()=>setWeek(-1)}>Last school week</Button>{selected&&<span className="self-center text-xs font-bold text-slate-500">Building for {full(selected)}</span>}</div>
  </Card>

  {current&&<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {metricRows.map((x,i)=><Card key={x.label} className={i===0?'overflow-hidden bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white':'p-5'}><div className={i===0?'text-[10px] font-black uppercase tracking-[.15em] text-sky-300':'text-[10px] font-black uppercase tracking-[.15em] text-slate-500'}>{x.label}</div><div className="mt-2 text-3xl font-black">{x.value}</div><div className={i===0?'mt-1 text-xs text-slate-300':'mt-1 text-xs text-slate-500'}>{x.detail}</div></Card>)}
   </div>

   {courseGrades.length>0&&<Card className="p-5"><div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-700"/><h2 className="font-black">Latest Recorded Course Grades</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{courseGrades.map(g=><div key={g.course} className="rounded-xl border bg-slate-50 p-4"><div className="text-sm font-black">{g.course}</div><div className="mt-2 text-3xl font-black">{g.percentage}% <span className="text-base text-slate-500">{g.letter||''}</span></div><div className="mt-1 text-xs text-slate-500">Latest recorded {g.date||'date not recorded'}{g.teacher?' · '+g.teacher:''}</div></div>)}</div></Card>}

   <div className="grid gap-4 lg:grid-cols-2">
    {courseChart.length>0&&<PremiumBarChart title="Current Course Grade Snapshot" subtitle="Latest recorded percentage for each course in CaseCue." data={courseChart} dataKey="percentage" badge="Percent"/>}
    {gradeTrend.length>0&&<PremiumLineChart title="This Week’s Assignment Scores" subtitle="Verified graded-work percentages across the selected week." data={gradeTrend} keys={[{key:'percentage',label:'Assignment %'}]} area/>}
    {progressTrend.length>0&&<PremiumLineChart title="Learning-Goal Check Trend" subtitle="Recorded percentage-based progress checks during the selected week." data={progressTrend} keys={[{key:'percentage',label:'Progress %'}]} area/>}
    {attendanceChart.some(x=>x.value>0)&&<PremiumDonutChart title="Attendance Recorded This Week" subtitle="Attendance marks saved by this user in the current workspace." data={attendanceChart}/>}
   </div>

   <Card className="overflow-hidden">
    <div className="border-b bg-slate-50 p-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-xs font-black uppercase tracking-[.16em] text-blue-700">AI-generated draft · grounded in saved CaseCue data</div><h2 className="mt-1 text-2xl font-black">{current.student_name} · {current.week_start} to {current.week_end}</h2></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>save()}><Save className="mr-2 h-4 w-4"/>Save Edits</Button><Button variant="outline" onClick={()=>save('ready')}><CheckCircle2 className="mr-2 h-4 w-4"/>{workspace==='para'?'Ready for Educator Review':'Mark Ready'}</Button><AnalyticsPdfButton label="Weekly PDF + Graphs" title="CaseCue Weekly Family Update" subtitle={current.student_name+' · '+fmtDate(current.week_start)+' - '+fmtDate(current.week_end)+' · '+roleName(workspace)} filename={filename} metrics={metricRows} charts={pdfCharts} sections={pdfSections} notes={pdfNotes}/></div></div></div>
    <div className="space-y-4 p-6">
     <div><label className="text-sm font-black">Subject line</label><Input value={subject} onChange={e=>setSubject(e.target.value)}/></div>
     <div><label className="text-sm font-black">Family message</label><textarea className="mt-1 min-h-[320px] w-full rounded-2xl border p-4 text-sm leading-7" value={message} onChange={e=>setMessage(e.target.value)}/><div className="mt-2 text-xs text-slate-500">Edit anything before sharing. The numbers above remain the saved data snapshot for this weekly record.</div></div>
     <div className="flex flex-wrap gap-2"><Button onClick={copy}><Copy className="mr-2 h-4 w-4"/>Copy Message</Button><Button variant="outline" onClick={email}><Mail className="mr-2 h-4 w-4"/>Open Email</Button><Button variant="outline" onClick={generate} disabled={busy}><RefreshCcw className="mr-2 h-4 w-4"/>Regenerate from Current Data</Button></div>
    </div>
   </Card>

   <div className="grid gap-4 lg:grid-cols-3">
    <Card className="p-5"><div className="flex items-center gap-2 font-black text-emerald-800"><TrendingUp className="h-4 w-4"/>What Went Well</div><div className="mt-3 space-y-2">{(current.strengths||[]).map((x,i)=><div key={i} className="rounded-xl bg-emerald-50 p-3 text-sm">{x}</div>)}{!(current.strengths||[]).length&&<div className="text-sm text-slate-500">No supported positive was generated from this week's records.</div>}</div></Card>
    <Card className="p-5"><div className="flex items-center gap-2 font-black text-amber-800"><ClipboardCheck className="h-4 w-4"/>Current Focus</div><div className="mt-3 space-y-2">{(current.focus_areas||[]).map((x,i)=><div key={i} className="rounded-xl bg-amber-50 p-3 text-sm">{x}</div>)}{!(current.focus_areas||[]).length&&<div className="text-sm text-slate-500">No current focus area was supported by the week's records.</div>}</div></Card>
    <Card className="p-5"><div className="flex items-center gap-2 font-black text-blue-800"><Clock3 className="h-4 w-4"/>Next Steps</div><div className="mt-3 space-y-2">{(current.next_steps||[]).map((x,i)=><div key={i} className="rounded-xl bg-blue-50 p-3 text-sm">{x}</div>)}{!(current.next_steps||[]).length&&<div className="text-sm text-slate-500">No next step was generated.</div>}</div></Card>
   </div>

   {(current.data_notes||[]).length>0&&<Card className="border-blue-200 bg-blue-50/50 p-5"><div className="font-black text-blue-950">Educator review notes</div><div className="mt-2 space-y-1 text-sm text-blue-900">{current.data_notes.map((x,i)=><div key={i}>• {x}</div>)}</div></Card>}
  </>}

  <Card className="p-5">
   <div className="flex items-center gap-2"><History className="h-5 w-5 text-slate-700"/><h2 className="font-black">Weekly Update History</h2></div><p className="mt-1 text-xs text-slate-500">Each saved record keeps the percentages and chart data used when that week's contact was generated.</p>
   <div className="mt-4 space-y-2">{(history||[]).map(u=><div key={u.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><button className="min-w-0 flex-1 text-left" onClick={()=>openSaved(u)}><div className="font-black">{u.student_name||'Student'} · {u.week_start} to {u.week_end}</div><div className="mt-1 text-xs text-slate-500">{roleName(u.workspace)} · {u.status||'draft'} · Weekly average {u.metrics?.weekly_assignment_average==null?'—':u.metrics.weekly_assignment_average+'%'}</div></button><Button size="icon" variant="ghost" onClick={()=>remove(u)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></div>)}{!(history||[]).length&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No weekly family updates saved yet.</div>}</div>
  </Card>
 </div>;
}

import React,{useMemo,useState}from'react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{Card}from'@/components/ui/cards';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{
  FileText,Eye,Target,Search,FolderOpen,CheckCircle2,Clock3,Paperclip,TrendingUp,
  BarChart3,ShieldCheck,AlertTriangle,BookOpenCheck,Filter,RotateCcw,Sparkles,Layers3
}from'lucide-react';
import{useToast}from'@/components/ui/use-toast';
import{
  ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,
  BarChart,Bar,PieChart,Pie,Cell
}from'recharts';

const CHART_COLORS=['#2563eb','#7c3aed','#059669','#d97706','#db2777','#0891b2'];
const accuracyColors={Correct:'#16a34a',Incorrect:'#dc2626',Partial:'#f59e0b',Blank:'#94a3b8',Review:'#7c3aed'};
const pct=a=>a?.current_grade_percent!=null?Number(a.current_grade_percent):Number(a?.score_possible)>0?Math.round(Number(a.score_earned||0)/Number(a.score_possible)*1000)/10:null;
const safePct=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(100,Math.round(Number(v)*10)/10)):0;
const prettyDate=v=>{if(!v)return'No date';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})};
const scoreTone=v=>v>=85?'emerald':v>=70?'amber':'rose';
const toneClasses={
 emerald:'border-emerald-200 bg-emerald-50 text-emerald-800',
 amber:'border-amber-200 bg-amber-50 text-amber-800',
 rose:'border-rose-200 bg-rose-50 text-rose-800',
 blue:'border-blue-200 bg-blue-50 text-blue-800',
 violet:'border-violet-200 bg-violet-50 text-violet-800',
 slate:'border-slate-200 bg-slate-50 text-slate-700'
};

export default function StudentWorkFolder({student,goals=[]}){
 const{toast}=useToast();
 const{data:grades}=useAsync(()=>base44.entities.GradebookAssignment.filter({student_id:student.id},'-date',500),[student.id]);
 const{data:evidence}=useAsync(()=>base44.entities.WorkEvidence.filter({student_id:student.id},'-date',500),[student.id]);
 const{data:progress}=useAsync(()=>base44.entities.ProgressData.filter({student_id:student.id},'-date',500),[student.id]);
 const{data:reviews}=useAsync(()=>base44.entities.TeacherReview.filter({student_id:student.id},'-reviewed_at',500),[student.id]);
 const[search,setSearch]=useState('');
 const[subjectFilter,setSubjectFilter]=useState('all');
 const[typeFilter,setTypeFilter]=useState('all');
 const[goalFilter,setGoalFilter]=useState('all');
 const[verificationFilter,setVerificationFilter]=useState('all');
 const[workOnly,setWorkOnly]=useState(false);
 const[dateFrom,setDateFrom]=useState('');
 const[dateTo,setDateTo]=useState('');
 const[selectedId,setSelectedId]=useState('');

 const goalName=id=>{const g=(goals||[]).find(x=>x.id===id);return g?g.goal_area||'IEP Goal':''};
 const evidenceById=useMemo(()=>new Map((evidence||[]).map(x=>[x.id,x])),[evidence]);
 const rows=useMemo(()=>[...(grades||[])].map(g=>{
   const ev=g.work_evidence_id?evidenceById.get(g.work_evidence_id):null;
   const displayPct=pct(g);
   const subject=(g.course||ev?.analysis?.subject||g.assignment_type||ev?.evidence_type||'Other').trim()||'Other';
   const skills=[...(ev?.skills||[]),...(ev?.analysis?.skills||[])].map(String).filter(Boolean);
   return{...g,evidence:ev,file:g.file_url||ev?.file_url||'',goal_id:g.goal_id||ev?.goal_id||'',displayPct,subject,skills,
     verification_status:g.verification_status||ev?.verification_status||'not_run',
     workStatus:ev?.review_status||'',teacherConfirmed:!!ev?.teacher_confirmed};
 }).filter(x=>x.displayPct!=null||Number(x.score_possible)>0),[grades,evidenceById]);

 const visibleRows=useMemo(()=>rows.filter(x=>{
   const q=search.trim().toLowerCase();
   if(q&&![x.title,x.subject,x.assignment_type,x.notes,x.qualitative_note,goalName(x.goal_id),...(x.skills||[])].some(v=>String(v||'').toLowerCase().includes(q)))return false;
   if(subjectFilter!=='all'&&x.subject!==subjectFilter)return false;
   if(typeFilter!=='all'&&String(x.assignment_type||x.evidence?.evidence_type||'')!==typeFilter)return false;
   if(goalFilter==='linked'&&!x.goal_id)return false;
   if(goalFilter==='unlinked'&&x.goal_id)return false;
   if(goalFilter!=='all'&&goalFilter!=='linked'&&goalFilter!=='unlinked'&&x.goal_id!==goalFilter)return false;
   if(verificationFilter!=='all'&&x.verification_status!==verificationFilter)return false;
   if(workOnly&&!x.file)return false;
   if(dateFrom&&String(x.date||'')<dateFrom)return false;
   if(dateTo&&String(x.date||'')>dateTo)return false;
   return true;
 }),[rows,search,subjectFilter,typeFilter,goalFilter,verificationFilter,workOnly,dateFrom,dateTo,goals]);

 const subjects=useMemo(()=>[...new Set(rows.map(x=>x.subject).filter(Boolean))].sort(),[rows]);
 const types=useMemo(()=>[...new Set(rows.map(x=>String(x.assignment_type||x.evidence?.evidence_type||'')).filter(Boolean))].sort(),[rows]);
 const avg=rows.length?Math.round(rows.reduce((n,x)=>n+Number(x.displayPct||0),0)/rows.length):null;
 const attached=rows.filter(x=>x.file).length;
 const goalLinked=rows.filter(x=>x.goal_id).length;
 const verified=rows.filter(x=>['verified','teacher_confirmed'].includes(x.verification_status)).length;
 const exceptions=rows.filter(x=>x.verification_status==='needs_teacher_review'||x.workStatus==='needs_review').length;

 const gradeTrend=useMemo(()=>[...rows].filter(x=>x.date&&x.displayPct!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(x=>({id:x.id,date:prettyDate(x.date),rawDate:x.date,grade:safePct(x.displayPct),title:x.title||'Assignment'})),[rows]);

 const subjectData=useMemo(()=>subjects.map(subject=>{
   const set=rows.filter(x=>x.subject===subject&&x.displayPct!=null);
   return{subject,average:set.length?Math.round(set.reduce((n,x)=>n+Number(x.displayPct||0),0)/set.length):0,count:set.length};
 }).filter(x=>x.count).sort((a,b)=>b.average-a.average),[subjects,rows]);

 const skillData=useMemo(()=>{
   const map=new Map();
   for(const row of rows){
     for(const skill of [...new Set(row.skills||[])]){
       if(!map.has(skill))map.set(skill,[]);
       if(row.displayPct!=null)map.get(skill).push(Number(row.displayPct));
     }
   }
   return[...map.entries()].map(([skill,vals])=>({skill,average:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0,count:vals.length}))
     .filter(x=>x.count).sort((a,b)=>b.count-a.count||b.average-a.average).slice(0,10);
 },[rows]);

 const approvedProblems=useMemo(()=>{
   const reviewRows=(reviews||[]).flatMap(r=>Array.isArray(r.final_problem_results)?r.final_problem_results:[]);
   if(reviewRows.length)return reviewRows;
   return(evidence||[]).flatMap(ev=>{
     const a=ev.analysis||{};
     return Array.isArray(a.question_breakdown)?a.question_breakdown:Array.isArray(a.scoring_breakdown)?a.scoring_breakdown:[];
   });
 },[reviews,evidence]);

 const accuracyData=useMemo(()=>{
   const counts={Correct:0,Incorrect:0,Partial:0,Blank:0,Review:0};
   for(const p of approvedProblems){
     const status=String(p.status||p.result||'').toLowerCase();
     const possible=Number(p.possible??p.possible_points??0),earned=Number(p.earned??p.earned_points??0);
     if(status==='correct'||(possible>0&&earned>=possible))counts.Correct++;
     else if(status==='partial'||(possible>0&&earned>0&&earned<possible))counts.Partial++;
     else if(status==='blank')counts.Blank++;
     else if(['needs_review','unreadable'].includes(status))counts.Review++;
     else counts.Incorrect++;
   }
   return Object.entries(counts).map(([name,value])=>({name,value})).filter(x=>x.value>0);
 },[approvedProblems]);

 const goalData=useMemo(()=>(goals||[]).filter(g=>g.status!=='met').map(g=>{
   const pts=(progress||[]).filter(p=>p.goal_id===g.id&&p.record_status!=='duplicate'&&p.record_status!=='superseded'&&Number.isFinite(Number(p.percentage)));
   const linked=rows.filter(x=>x.goal_id===g.id);
   const recent=pts.slice(0,5);
   const average=recent.length?Math.round(recent.reduce((n,p)=>n+Number(p.percentage||0),0)/recent.length):linked.length?Math.round(linked.reduce((n,x)=>n+Number(x.displayPct||0),0)/linked.length):null;
   return{id:g.id,area:g.goal_area||'IEP Goal',text:g.goal_text||'',average,count:pts.length,assignments:linked.length,latest:pts[0]?.date||linked[0]?.date||''};
 }).filter(x=>x.count||x.assignments),[goals,progress,rows]);

 const resetFilters=()=>{setSearch('');setSubjectFilter('all');setTypeFilter('all');setGoalFilter('all');setVerificationFilter('all');setWorkOnly(false);setDateFrom('');setDateTo('')};
 const focusRow=id=>{if(!id)return;setSelectedId(id);requestAnimationFrame(()=>document.getElementById('work-'+id)?.scrollIntoView({behavior:'smooth',block:'center'}))};
 const openWork=async row=>{try{if(row.evidence?.id){const r=await base44.functions.invoke('openEvidenceUrl',{evidence_id:row.evidence.id});const u=r?.data?.signed_url||r?.signed_url;if(u){window.open(u,'_blank','noopener,noreferrer');return}}if(row.file){const r=await base44.functions.invoke('openPrivateFileUrl',{file_uri:row.file});const d=r?.data||r;if(d?.signed_url){window.open(d.signed_url,'_blank','noopener,noreferrer');return}}throw new Error('No saved worksheet is attached to this grade.')}catch(e){toast({title:'Could not open student work',description:e.message,variant:'destructive'})}};

 const empty=!rows.length;

 return <div className="space-y-6">
  <section className="overflow-hidden rounded-[30px] border bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-6 text-white shadow-xl sm:p-8">
   <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
    <div><div className="text-[10px] font-black uppercase tracking-[.22em] text-sky-300">Student performance dashboard</div><h2 className="mt-2 text-3xl font-black sm:text-4xl">{student.first_name}&apos;s work, grades, and proof.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Approved grades, original student work, skill patterns, and goal-linked evidence in one place. Every chart is built from saved CaseCue records.</p></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:min-w-[560px]">
      {[
       ['Average',avg==null?'—':`${avg}%`,'from-blue-500/20 to-cyan-400/10'],
       ['Assignments',rows.length,'from-violet-500/20 to-fuchsia-400/10'],
       ['Work attached',attached,'from-fuchsia-500/20 to-pink-400/10'],
       ['Goal linked',goalLinked,'from-emerald-500/20 to-teal-400/10'],
       ['Verified',verified,'from-teal-500/20 to-cyan-400/10'],
       ['Needs review',exceptions,'from-amber-500/20 to-orange-400/10']
      ].map(([label,value,grad])=><div key={label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${grad} p-4`}><div className="text-[10px] font-black uppercase tracking-wider text-slate-300">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>)}
    </div>
   </div>
  </section>

  {empty?<Card className="p-12 text-center"><Sparkles className="mx-auto h-10 w-10 text-blue-400"/><h3 className="mt-3 text-xl font-black">No graded work yet</h3><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Grade and approve a worksheet in Smart Grader. The student dashboard will populate automatically with the grade, original work, trends, and evidence.</p></Card>:<>
   <div className="grid gap-4 xl:grid-cols-2">
    <Card className="p-5">
     <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-black"><TrendingUp className="h-5 w-5 text-blue-600"/>Grade Trend</div><p className="mt-1 text-xs text-slate-500">Click a point to jump to the assignment that created it.</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">{gradeTrend.length} scores</span></div>
     <div className="mt-4 h-64">{gradeTrend.length?<ResponsiveContainer width="100%" height="100%"><LineChart data={gradeTrend} onClick={s=>focusRow(s?.activePayload?.[0]?.payload?.id)}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" fontSize={10}/><YAxis domain={[0,100]} fontSize={10}/><Tooltip formatter={v=>[`${v}%`,'Grade']} labelFormatter={(_,p)=>p?.[0]?.payload?.title||''}/><Line type="monotone" dataKey="grade" stroke="#2563eb" strokeWidth={3} dot={{r:4,fill:'#2563eb'}} activeDot={{r:7}}/></LineChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-sm text-slate-400">Add more graded work to see a trend.</div>}</div>
    </Card>

    <Card className="p-5">
     <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-black"><BarChart3 className="h-5 w-5 text-violet-600"/>Subject Performance</div><p className="mt-1 text-xs text-slate-500">Click a bar to filter the work gallery.</p></div></div>
     <div className="mt-4 h-64">{subjectData.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={subjectData} layout="vertical" margin={{left:12}} onClick={s=>{const v=s?.activePayload?.[0]?.payload?.subject;if(v)setSubjectFilter(v)}}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis type="number" domain={[0,100]} fontSize={10}/><YAxis dataKey="subject" type="category" width={90} fontSize={10}/><Tooltip formatter={v=>[`${v}%`,'Average']}/><Bar dataKey="average" radius={[0,6,6,0]}>{subjectData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-sm text-slate-400">Subject data will appear after grading.</div>}</div>
    </Card>
   </div>

   <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
    <Card className="p-5">
     <div className="flex items-center gap-2 font-black"><Layers3 className="h-5 w-5 text-emerald-600"/>Skill Breakdown</div>
     <p className="mt-1 text-xs text-slate-500">Average performance on saved assignments tagged with each skill. Tap a skill to filter the work gallery.</p>
     <div className="mt-4 space-y-3">{skillData.length?skillData.map((s,i)=><button key={s.skill} onClick={()=>setSearch(s.skill)} className="block w-full rounded-xl border bg-white p-3 text-left transition hover:border-blue-300 hover:shadow-sm"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black">{s.skill}</div><div className="text-[11px] text-slate-500">{s.count} assignment{s.count===1?'':'s'}</div></div><div className="text-lg font-black">{s.average}%</div></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${s.average>=85?'bg-emerald-500':s.average>=70?'bg-amber-400':'bg-rose-500'}`} style={{width:`${safePct(s.average)}%`}}/></div></button>):<div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-400">Skill bars will appear as Smart Grader saves skill tags with student work.</div>}</div>
    </Card>

    <Card className="p-5">
     <div className="flex items-center gap-2 font-black"><BookOpenCheck className="h-5 w-5 text-fuchsia-600"/>Problem Accuracy</div>
     <p className="mt-1 text-xs text-slate-500">Teacher-reviewed item-level results when available.</p>
     <div className="mt-3 h-56">{accuracyData.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={accuracyData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3} label={({name,value})=>`${name} ${value}`}>{accuracyData.map((x,i)=><Cell key={i} fill={accuracyColors[x.name]||CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>:<div className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">Item-level accuracy will appear after V2 assignments include teacher-reviewed problem results.</div>}</div>
    </Card>
   </div>

   <Card className="p-5">
    <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-black"><Target className="h-5 w-5 text-emerald-600"/>Goal-Linked Progress</div><p className="mt-1 text-xs text-slate-500">Instructional evidence only. These bars summarize linked progress points and assignments; they do not independently determine IEP mastery.</p></div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{goalData.length?goalData.map(g=>{const tone=g.average==null?'slate':scoreTone(g.average);return <button key={g.id} onClick={()=>setGoalFilter(g.id)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]}`}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-wider opacity-70">{g.area}</div><div className="mt-1 line-clamp-2 text-sm font-semibold">{g.text}</div></div><div className="text-2xl font-black">{g.average==null?'—':`${g.average}%`}</div></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/70"><div className={`h-full rounded-full ${tone==='emerald'?'bg-emerald-600':tone==='amber'?'bg-amber-500':tone==='rose'?'bg-rose-600':'bg-slate-400'}`} style={{width:`${safePct(g.average||0)}%`}}/></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold"><span>{g.assignments} linked assignment{g.assignments===1?'':'s'}</span><span>·</span><span>{g.count} progress point{g.count===1?'':'s'}</span>{g.latest&&<><span>·</span><span>Latest {prettyDate(g.latest)}</span></>}</div></button>}):<div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-slate-400">No goal-linked assignments or progress points yet.</div>}</div>
   </Card>

   <Card className="p-5">
    <div className="flex flex-col gap-4">
     <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-lg font-black"><Filter className="h-5 w-5 text-blue-700"/>Work Gallery Filters</div><p className="mt-1 text-sm text-slate-500">Filter the student portfolio without changing any records.</p></div><Button variant="outline" size="sm" onClick={resetFilters}><RotateCcw className="mr-1 h-4 w-4"/>Reset</Button></div>
     <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, skill, note, or goal…"/></div>
      <select className="h-10 rounded-lg border bg-white px-3 text-sm" value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}><option value="all">All subjects</option>{subjects.map(x=><option key={x} value={x}>{x}</option>)}</select>
      <select className="h-10 rounded-lg border bg-white px-3 text-sm" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">All assignment types</option>{types.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select>
      <select className="h-10 rounded-lg border bg-white px-3 text-sm" value={goalFilter} onChange={e=>setGoalFilter(e.target.value)}><option value="all">All goal connections</option><option value="linked">Goal-linked only</option><option value="unlinked">Not goal-linked</option>{(goals||[]).map(g=><option key={g.id} value={g.id}>{g.goal_area||'IEP Goal'}</option>)}</select>
      <select className="h-10 rounded-lg border bg-white px-3 text-sm" value={verificationFilter} onChange={e=>setVerificationFilter(e.target.value)}><option value="all">All verification states</option><option value="verified">Verified</option><option value="teacher_confirmed">Teacher confirmed</option><option value="needs_teacher_review">Needs review</option><option value="not_run">Legacy / not run</option></select>
      <Input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} aria-label="Start date"/>
      <Input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} aria-label="End date"/>
      <label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold"><input type="checkbox" checked={workOnly} onChange={e=>setWorkOnly(e.target.checked)}/>Work attached only</label>
     </div>
    </div>
   </Card>

   <div>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-xl font-black">Recent Work</h3><p className="text-sm text-slate-500">{visibleRows.length} assignment{visibleRows.length===1?'':'s'} shown · click the original work anytime to verify the score.</p></div></div>
    <div className="grid gap-4 xl:grid-cols-2">{visibleRows.map(row=>{const tone=scoreTone(Number(row.displayPct||0));const isSelected=selectedId===row.id;return <Card id={'work-'+row.id} key={row.id} className={`overflow-hidden border-2 transition ${isSelected?'border-blue-500 shadow-lg':'border-slate-200'}`}><div className="border-b bg-gradient-to-r from-slate-50 to-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">{row.subject}</span>{row.goal_id&&<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700"><Target className="mr-1 inline h-3 w-3"/>{goalName(row.goal_id)||'IEP goal'}</span>}{row.file&&<span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700"><Paperclip className="mr-1 inline h-3 w-3"/>Work attached</span>}<span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${row.verification_status==='verified'?'bg-teal-50 text-teal-700':row.verification_status==='teacher_confirmed'?'bg-blue-50 text-blue-700':row.verification_status==='needs_teacher_review'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}>{String(row.verification_status||'not_run').replaceAll('_',' ')}</span></div><h4 className="mt-2 truncate text-lg font-black text-slate-950">{row.title||'Student assignment'}</h4><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{prettyDate(row.date)}</span>{row.source_type&&<span>{String(row.source_type).replaceAll('_',' ')}</span>}</div></div><div className={`shrink-0 rounded-2xl border px-4 py-3 text-right ${toneClasses[tone]}`}><div className="text-[10px] font-black uppercase tracking-wider opacity-70">Final grade</div><div className="mt-1 text-2xl font-black">{row.score_possible>0?`${row.score_earned}/${row.score_possible}`:row.displayPct!=null?`${row.displayPct}%`:'—'}</div>{row.displayPct!=null&&<div className="text-xs font-bold">{row.displayPct}%</div>}</div></div></div><div className="p-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">What the data says</div><div className="mt-1 text-sm font-semibold">{row.quantitative_note||((row.score_possible>0)?`${row.score_earned}/${row.score_possible} · ${row.displayPct}%`:'No quantitative score saved')}</div></div><div className="rounded-xl border p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Teacher note</div><div className="mt-1 line-clamp-3 text-sm text-slate-700">{row.qualitative_note||row.notes||row.evidence?.qualitative_notes||'No note added.'}</div></div></div>{row.skills?.length>0&&<div className="mt-3 flex flex-wrap gap-1.5">{row.skills.slice(0,8).map(skill=><button key={skill} onClick={()=>setSearch(skill)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">{skill}</button>)}</div>}<div className="mt-4 flex flex-wrap gap-2">{row.file?<Button onClick={()=>openWork(row)} className="bg-slate-950 text-white"><Eye className="mr-2 h-4 w-4"/>View Original Work</Button>:<Button variant="outline" disabled><FileText className="mr-2 h-4 w-4"/>No work attached</Button>}{row.goal_id&&<span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Linked to {goalName(row.goal_id)||'IEP goal'}</span>}{row.verification_status==='needs_teacher_review'&&<span className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><AlertTriangle className="h-4 w-4"/>Needs review</span>}{['verified','teacher_confirmed'].includes(row.verification_status)&&<span className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800"><ShieldCheck className="h-4 w-4"/>Approved record</span>}</div></div></Card>})}{!visibleRows.length&&<Card className="col-span-full p-10 text-center"><FolderOpen className="mx-auto h-10 w-10 text-slate-300"/><div className="mt-3 font-black">No work matches these filters</div><p className="mt-1 text-sm text-slate-500">Reset the filters or choose a different subject, goal, or date range.</p><Button variant="outline" className="mt-4" onClick={resetFilters}>Reset filters</Button></Card>}</div>
   </div>
  </>}
 </div>;
}

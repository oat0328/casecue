import React,{useMemo,useState}from'react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Sparkles,BookOpen,CalendarClock,ScanLine,Users,ClipboardCheck}from'lucide-react';
import{Link}from'react-router-dom';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{userDisplayName}from'@/lib/userIdentity';
import{PremiumBarChart,PremiumDonutChart}from'@/components/shared/PremiumAnalytics';
import AnalyticsPdfButton from'@/components/shared/AnalyticsPdfButton';

const bank={K:['Animal Adventure','Color Cone Chase','Freeze & Balance'],1:['Locomotor Quest','Beanbag Balance Relay','Mirror Moves'],2:['Shuttle Challenge','Throw & Catch Islands','Fitness Bingo'],3:['Cone Capture','Agility Quest','Target Toss'],4:['End-Zone Dash','Fitness Stations','Cooperative Challenge'],5:['Modified Handball','Circuit Challenge','Strategy Relay'],6:['Basketball Skill Quest','Interval Challenge','Ultimate Passing'],7:['Small-Sided Soccer','Agility Tournament','Strength Circuit'],8:['Volleyball Stations','Team Tournament','Conditioning Challenge']};

export default function PEHome(){
 const{user}=useAuth();const staffName=userDisplayName(user,'PE staff');
 const[grade,setGrade]=useState('6'),[minutes,setMinutes]=useState('45'),[focus,setFocus]=useState('Fitness'),[equipment,setEquipment]=useState('cones, balls'),[plan,setPlan]=useState(null);
 const{data:attendance}=useAsync(()=>user?.id?base44.entities.AttendanceRecord.filter({user_id:user.id,workspace:'pe'},'-date',1000):Promise.resolve([]),[user?.id]);
 const{data:notes}=useAsync(()=>base44.entities.WorkspaceNote.filter({workspace:'pe'},'-date',500),[]);
 const{data:schedule}=useAsync(()=>base44.entities.ScheduleEntry.filter({workspace:'pe'},'start_time',500),[]);
 const make=()=>{const games=bank[grade]||bank[6],main=Math.max(10,Number(minutes)-15);setPlan({warm:`5 min ${focus} movement warm-up`,games:games.map((g,i)=>({name:g,minutes:Math.max(5,Math.floor(main/games.length)),how:i===0?'Set boundaries, demonstrate once, then play short rounds.':i===1?'Rotate teams/stations and adjust space or equipment for success.':'Finish with a cooperative or competitive round and quick skill check.'})),close:'5 min cool-down + reflection'})};
 const attendanceByDay=useMemo(()=>{const m={};for(const r of attendance||[]){const k=String(r.date||'').slice(5)||'No date';m[k]??={name:k,present:0,absent:0,tardy:0};if(r.status==='present')m[k].present++;else if(r.status==='absent')m[k].absent++;else if(r.status==='tardy')m[k].tardy++}return Object.values(m).slice(-10)},[attendance]);
 const statusData=useMemo(()=>['present','absent','tardy','excused','left_early'].map(k=>({name:k.replace('_',' '),value:(attendance||[]).filter(x=>x.status===k).length})),[attendance]);
 return <div className='space-y-6'>
  <section className='rounded-[30px] bg-slate-950 p-8 text-white'><div className='text-xs font-black uppercase tracking-[.2em] text-sky-300'>CaseCue PE</div><h1 className='mt-3 text-3xl font-black'>Run the class. See the participation pattern.</h1><p className='mt-2 text-slate-300'>Grade + time + focus + equipment → a ready-to-run class, with shared attendance, notes, schedule, grading, and real data views.</p></section>

  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><Users className="h-5 w-5 text-blue-600"/><div className="mt-3 text-3xl font-black">{new Set((attendance||[]).map(x=>x.student_id)).size}</div><div className="text-xs text-slate-500">Students with attendance data</div></div><div className="rounded-2xl border bg-white p-5"><ClipboardCheck className="h-5 w-5 text-emerald-600"/><div className="mt-3 text-3xl font-black">{(notes||[]).length}</div><div className="text-xs text-slate-500">Class notes</div></div><div className="rounded-2xl border bg-white p-5"><CalendarClock className="h-5 w-5 text-violet-600"/><div className="mt-3 text-3xl font-black">{(schedule||[]).filter(x=>!x.archived).length}</div><div className="text-xs text-slate-500">Schedule blocks</div></div></div>
  <div className="flex justify-end"><AnalyticsPdfButton title="CaseCue PE Analytics" subtitle={staffName} filename="casecue-pe-analytics" metrics={[{label:'Students marked',value:new Set((attendance||[]).map(x=>x.student_id)).size},{label:'Attendance records',value:(attendance||[]).length},{label:'Class notes',value:(notes||[]).length},{label:'Schedule blocks',value:(schedule||[]).filter(x=>!x.archived).length}]} charts={[{type:'bar',title:'PE Attendance by Day',subtitle:'Present marks captured in the PE workspace.',data:attendanceByDay,series:[{key:'present',label:'Present'}]},{type:'donut',title:'Attendance Status Mix',subtitle:'Saved PE attendance statuses.',data:statusData}]} notes={['PE analytics are generated from saved CaseCue records only.']}/></div>
  <div className="grid gap-4 lg:grid-cols-2"><PremiumBarChart title="PE Attendance by Day" subtitle="Real saved attendance marks from the PE workspace." data={attendanceByDay} dataKey="present" badge="Present"/><PremiumDonutChart title="Attendance Status Mix" subtitle="Present, absent, tardy, excused, and left-early records." data={statusData} centerLabel={(attendance||[]).length}/></div>

  <div className='grid gap-5 lg:grid-cols-[1.2fr_.8fr]'>
   <section className='rounded-2xl border bg-white p-6'><h2 className='font-black'>Game & Exercise Generator</h2><div className='mt-4 grid gap-3 sm:grid-cols-2'><select className='rounded-lg border p-2' value={grade} onChange={e=>setGrade(e.target.value)}>{Object.keys(bank).map(x=><option key={x}>{x}</option>)}</select><Input type='number' value={minutes} onChange={e=>setMinutes(e.target.value)}/><Input value={focus} onChange={e=>setFocus(e.target.value)} placeholder='Focus'/><Input value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder='Equipment'/></div><Button className='mt-4' onClick={make}><Sparkles className='mr-2 h-4 w-4'/>Generate PE Class</Button>{plan&&<div className='mt-5 space-y-3'><div className='rounded-xl bg-blue-50 p-4'><b>Warm-up</b><p>{plan.warm}</p></div>{plan.games.map(g=><div key={g.name} className='rounded-xl border p-4'><b>{g.name} · {g.minutes} min</b><p className='mt-1 text-sm text-slate-600'>{g.how}</p></div>)}<div className='rounded-xl bg-slate-50 p-4'><b>Equipment:</b> {equipment}<br/><b>Close:</b> {plan.close}</div></div>}</section>
   <section className='space-y-3'>
    <Link to='/w/pe/schedule' className='block rounded-2xl border bg-white p-5 font-black'><CalendarClock className='mr-2 inline h-5 w-5 text-blue-600'/>Open Shared PE Schedule →<p className='mt-1 text-sm font-normal text-slate-500'>Uses the same weekly schedule engine as the rest of CaseCue.</p></Link>
    <Link to='/w/pe/lesson' className='block rounded-2xl border bg-white p-5 font-black'><BookOpen className='mr-2 inline h-5 w-5'/>Open Lesson Planner →</Link>
    <Link to='/w/pe/grade' className='block rounded-2xl border bg-white p-5 font-black'><ScanLine className='mr-2 inline h-5 w-5'/>Open Shared Gradebook →</Link>
   </section>
  </div>
 </div>;
}
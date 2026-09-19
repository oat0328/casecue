
import React,{useState}from'react';
import{Sparkles,Save,CheckCircle2}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAuth}from'@/lib/AuthContext';
import{getActiveWorkspace}from'@/lib/workspaces';
import{useToast}from'@/components/ui/use-toast';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Card}from'@/components/ui/cards';
import ExportBar from'@/components/shared/ExportBar';

const today=()=>new Date().toLocaleDateString('en-CA');

export default function SimpleLessonPlanner(){
 const{user}=useAuth(),{toast}=useToast(),w=getActiveWorkspace(user);
 const[f,setF]=useState({grade:'6',subject:w==='pe'?'PE':'ELA',topic:'',minutes:'50',materials:''}),[p,setP]=useState(null),[savedId,setSavedId]=useState(''),[saving,setSaving]=useState(false);
 const make=()=>{
  const n=Math.max(20,Number(f.minutes)||50),topic=f.topic||f.subject;
  setP({
   objective:'Students will practice '+topic+' and demonstrate understanding by the end of class.',
   steps:['5 min · Welcome, objective and quick warm-up for '+topic,'10 min · Model or demonstrate the skill',Math.max(10,n-25)+' min · Guided and independent practice','10 min · Check understanding, review and close'],
   materials:f.materials||'Use available classroom materials',
   check:'Use a quick exit check, performance check, or collected student work.'
  });
  setSavedId('');
 };
 const save=async()=>{
  if(!p)return;
  setSaving(true);
  try{
   const title=(f.grade||'Class')+' · '+f.subject+' · '+(f.topic||'Lesson');
   const payload={title,date:today(),objective:p.objective,warm_up:p.steps[0],i_do:p.steps[1],we_do:p.steps[2],you_do:p.steps[3],data_collection:p.check,subject:f.subject,grade:f.grade,duration_minutes:Number(f.minutes)||50,source:'topic',group_label:'CaseCue '+w+' simple planner',plan:{...p,materials:p.materials},analysis:{workspace:w,origin:'simple_lesson_planner'},status:'draft'};
   const rec=savedId?await base44.entities.Lesson.update(savedId,payload):await base44.entities.Lesson.create(payload);
   setSavedId(rec?.id||savedId);toast({title:savedId?'Lesson updated':'Lesson saved',description:'The plan is stored in CaseCue instead of disappearing when this page closes.'});
  }catch(e){toast({title:'Could not save lesson',description:e.message,variant:'destructive'})}
  finally{setSaving(false)}
 };
 const workspaceName=w==='gen_ed'?'Gen Ed':w==='substitute'?'Substitute':w==='pe'?'PE':'Lesson';
 const sections=p?[{heading:'Objective',body:p.objective},{heading:'Lesson Flow',body:p.steps.map((x,i)=>(i+1)+'. '+x).join('\n')},{heading:'Materials',body:p.materials},{heading:'Check Learning',body:p.check}]:[];
 const opts={title:'CaseCue '+workspaceName+' · '+(f.topic||f.subject)+' Lesson',subtitle:'Grade '+f.grade+' · '+f.subject+' · '+(f.minutes||50)+' minutes',filename:'casecue-'+w+'-'+(f.topic||f.subject).replace(/[^a-z0-9]+/gi,'-')+'-lesson',sections,banner:'CaseCue '+workspaceName+' · Working lesson plan · Educator reviews and adapts before instruction'};

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue {workspaceName}</div><h1 className="mt-3 text-3xl font-black">Need a lesson? Build the usable version.</h1><p className="mt-2 max-w-2xl text-slate-300">Grade, subject, topic, time and materials in. A clean working lesson out — then save it, print it, or download the CaseCue PDF.</p></section>

  <Card className="p-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Input placeholder="Grade" value={f.grade} onChange={e=>setF({...f,grade:e.target.value})}/><Input placeholder="Subject" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/><Input placeholder="Topic / skill" value={f.topic} onChange={e=>setF({...f,topic:e.target.value})}/><Input type="number" min="20" placeholder="Minutes" value={f.minutes} onChange={e=>setF({...f,minutes:e.target.value})}/><Input placeholder="Materials" value={f.materials} onChange={e=>setF({...f,materials:e.target.value})}/></div><Button className="mt-4" onClick={make}><Sparkles className="mr-2 h-4 w-4"/>Create Lesson</Button></Card>

  {p&&<Card className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-black uppercase tracking-wider text-blue-700">Ready to review</div><h2 className="text-2xl font-black">{f.grade} · {f.subject} · {f.topic||'Lesson'}</h2>{savedId&&<div className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>Saved to CaseCue</div>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving?'Saving…':savedId?'Update Lesson':'Save Lesson'}</Button><ExportBar {...opts}/></div></div><div className="mt-5 rounded-xl bg-blue-50 p-4"><b>Objective</b><p className="mt-1">{p.objective}</p></div><div className="mt-4 space-y-2">{p.steps.map(x=><div key={x} className="rounded-xl border p-4 font-semibold">{x}</div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><b>Materials</b><p className="mt-1">{p.materials}</p></div><div className="rounded-xl bg-slate-50 p-4"><b>Check learning</b><p className="mt-1">{p.check}</p></div></div></Card>}
 </div>;
}
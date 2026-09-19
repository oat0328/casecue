
import React,{useState}from'react';
import{Copy,Mail,MessageSquare,Trash2,Save,Users,Pencil,X}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Card}from'@/components/ui/cards';
import ExportBar from'@/components/shared/ExportBar';

const today=()=>new Date().toLocaleDateString('en-CA');
const full=s=>s?((s.first_name||'')+' '+(s.last_name||'')).trim():'Student';

export default function GenEdContact(){
 const{user}=useAuth(),{toast}=useToast();
 const{data:students}=useAsync(()=>base44.entities.Student.list('-last_name',500),[]);
 const{data:notes,refetch}=useAsync(()=>base44.entities.WorkspaceNote.filter({workspace:'gen_ed'},'-date',300),[]);
 const empty=()=>({student_id:'',reason:'progress update',strength:'',concern:'',next:'',teacher:user?.full_name||'',date:today()});
 const[f,setF]=useState(empty),[editingId,setEditingId]=useState('');
 const savingName=f.teacher||user?.full_name||user?.email||'Teacher';
 const student=(students||[]).find(s=>s.id===f.student_id);
 const studentName=student?full(student):'your student';
 let message='Hello,\n\nI wanted to share a quick '+f.reason+' for '+studentName+'. ';
 if(f.strength)message+='One positive I want to highlight is '+f.strength+'. ';
 if(f.concern)message+='I also wanted to make you aware that '+f.concern+'. ';
 if(f.next)message+='Our next step will be '+f.next+'. ';
 message+='\n\nPlease feel free to reach out if you have any questions. I appreciate your partnership.\n\n'+savingName;

 const copy=async()=>{await navigator.clipboard.writeText(message);toast({title:'Parent message copied'})};
 const reset=()=>{setF(empty());setEditingId('')};
 const edit=n=>{setEditingId(n.id);setF({student_id:n.student_id||'',reason:String(n.title||'Family contact').replace(/^Family contact · /,''),strength:'',concern:n.body||'',next:'',teacher:user?.full_name||'',date:n.date||today()});window.scrollTo({top:0,behavior:'smooth'})};
 const save=async()=>{
  if(!f.student_id)return toast({title:'Choose the student first',variant:'destructive'});
  try{
   const payload={organization_id:user?.organization_id||user?.data?.organization_id||'',user_id:user.id,workspace:'gen_ed',student_id:f.student_id,date:f.date,title:'Family contact · '+f.reason,body:message,category:'communication',setting:'Family communication',support_level:'Not applicable',ai_cleaned:false,updated_at:new Date().toISOString()};
   if(editingId)await base44.entities.WorkspaceNote.update(editingId,payload);else await base44.entities.WorkspaceNote.create(payload);
   await refetch();toast({title:editingId?'Parent contact updated':'Parent contact saved',description:'The communication record is in your CaseCue Gen Ed history.'});reset();
  }catch(e){toast({title:'Could not save contact',description:e.message,variant:'destructive'})}
 };
 const remove=async n=>{if(!window.confirm('Delete this saved parent-contact record?'))return;await base44.entities.WorkspaceNote.delete(n.id);if(editingId===n.id)reset();await refetch();toast({title:'Contact record deleted'})};
 const name=id=>full((students||[]).find(s=>s.id===id));
 const sections=(notes||[]).map(n=>({heading:(n.date||'')+' · '+(name(n.student_id)||'Student')+' · '+(n.title||'Family Contact'),body:n.body||''}));
 const exportOpts={title:'CaseCue Gen Ed · Family Communication Record',subtitle:user?.full_name||user?.email||'Teacher',filename:'casecue-gen-ed-family-contact',sections,banner:'CaseCue Gen Ed · Teacher communication record · Review before distribution'};

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Gen Ed · Family Communication</div><h1 className="mt-3 text-3xl font-black">Write the update. Save the contact. Keep the record.</h1><p className="mt-2 max-w-2xl text-slate-300">Build a warm classroom update, send it through your normal email app, and keep a dated teacher record in CaseCue.</p></section>
  <div className="grid gap-5 lg:grid-cols-2">
   <Card className="space-y-4 p-6">
    <div className="flex items-center justify-between"><h2 className="font-black">{editingId?'Edit Contact Record':'New Parent Contact'}</h2>{editingId&&<Button size="sm" variant="ghost" onClick={reset}><X className="mr-1 h-4 w-4"/>Cancel Edit</Button>}</div>
    <div><label className="text-sm font-black">Student</label><select className="mt-1 w-full rounded-lg border p-2 text-sm" value={f.student_id} onChange={e=>setF({...f,student_id:e.target.value})}><option value="">Choose student…</option>{(students||[]).map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><label className="text-sm font-black">Date</label><Input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div><div><label className="text-sm font-black">Reason</label><Input value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></div></div>
    <div><label className="text-sm font-black">Strength / positive</label><Input value={f.strength} onChange={e=>setF({...f,strength:e.target.value})}/></div>
    <div><label className="text-sm font-black">Concern or update</label><textarea className="min-h-24 w-full rounded-xl border p-3 text-sm" value={f.concern} onChange={e=>setF({...f,concern:e.target.value})}/></div>
    <div><label className="text-sm font-black">Next step</label><Input value={f.next} onChange={e=>setF({...f,next:e.target.value})}/></div>
    <div><label className="text-sm font-black">Your name</label><Input value={f.teacher} onChange={e=>setF({...f,teacher:e.target.value})}/></div>
   </Card>
   <Card className="p-6"><div className="mb-3 flex items-center gap-2 font-black"><MessageSquare className="h-4 w-4"/>Preview</div><div className="min-h-72 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7">{message}</div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={copy}><Copy className="mr-2 h-4 w-4"/>Copy</Button><Button variant="outline" onClick={()=>location.href='mailto:?subject='+encodeURIComponent('Classroom update for '+studentName)+'&body='+encodeURIComponent(message)}><Mail className="mr-2 h-4 w-4"/>Email</Button><Button variant="outline" onClick={save}><Save className="mr-2 h-4 w-4"/>{editingId?'Update Contact':'Save Contact Record'}</Button></div></Card>
  </div>

  <Card className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-700"/><h2 className="font-black">Saved Family Contacts</h2></div><p className="mt-1 text-xs text-slate-500">Teacher-owned CaseCue communication history.</p></div>{(notes||[]).length>0&&<ExportBar {...exportOpts}/>}</div><div className="mt-4 space-y-2">{(notes||[]).map(n=><div key={n.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{name(n.student_id)||'Student'} · {n.title||'Family contact'}</div><div className="mt-1 text-xs text-slate-500">{n.date||'No date'}</div></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>edit(n)}><Pencil className="h-4 w-4 text-blue-700"/></Button><Button size="icon" variant="ghost" onClick={()=>remove(n)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></div></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p></div>)}{!(notes||[]).length&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No family-contact records saved yet.</div>}</div></Card>
 </div>;
}
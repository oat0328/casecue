import React,{useMemo,useRef,useState}from'react';
import{FileUp,NotebookPen,Paperclip,Sparkles,Trash2,Search,Pencil,X}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Textarea}from'@/components/ui/textarea';
import{Card}from'@/components/ui/cards';
import ExportBar from'@/components/shared/ExportBar';
import{workspaceFromPath}from'@/lib/workspaceCapabilities';
import{WORKSPACES}from'@/lib/workspaces';
import{userDisplayName}from'@/lib/userIdentity';

const CATEGORIES=[
 ['general','General'],['behavior','Behavior'],['assessment','Assessment / Baseline'],['academic_support','Academic Support'],
 ['push_in','Push-In'],['pull_out','Pull-Out'],['session','Session / Service'],['communication','Communication'],
 ['handoff','Teacher Handoff'],['incident','Incident / Concern'],['other','Other']
];
const SETTINGS=['Classroom','Resource room','Therapy room','Hallway / transition','Testing / assessment','PE / gym','Community / field setting','Other'];
const SUPPORTS=['Independent','Visual prompt','Verbal prompt','Gestural prompt','Modeling','Partial physical assistance','Physical assistance','Not applicable'];
const today=()=>new Date().toLocaleDateString('en-CA');
const fmt=d=>{if(!d)return'';const x=new Date(`${d}T12:00:00`);return Number.isNaN(x.getTime())?d:x.toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})};
const label=v=>CATEGORIES.find(x=>x[0]===v)?.[1]||'Note';
const full=s=>s?(`${s.first_name||''} ${s.last_name||''}`.trim()):'';

export default function WorkspaceNotes({workspaceKey:prop}){
 const inferred=workspaceFromPath(location.pathname,'para'),workspaceKey=prop||inferred;
 const meta=WORKSPACES[workspaceKey]||{name:'CaseCue',short:'Workspace'};
 const{user}=useAuth(),{toast}=useToast(),fileRef=useRef(null);const staffName=userDisplayName(user,'CaseCue Staff');
 const para=workspaceKey==='para';
 const{data:rawStudents}=useAsync(()=>para?base44.entities.ParaStudentAccess.list('-last_name',500):base44.entities.Student.list('-last_name',700),[workspaceKey]);
 const students=useMemo(()=>para?(rawStudents||[]).filter(x=>x.active!==false).map(x=>({...x,id:x.student_id})):(rawStudents||[]).filter(x=>x.roster_status!=='archived'&&x.status!=='exited'),[para,rawStudents]);
 const{data:notes,refetch}=useAsync(()=>base44.entities.WorkspaceNote.filter({workspace:workspaceKey},'-date',500),[workspaceKey]);
 const[f,setF]=useState({student_id:'',title:'',body:'',category:'general',setting:'',support_level:'Not applicable',date:today()});
 const[busy,setBusy]=useState(false),[aiBusy,setAiBusy]=useState(false),[aiCleaned,setAiCleaned]=useState(false),[attachment,setAttachment]=useState(''),[filename,setFilename]=useState(''),[search,setSearch]=useState(''),[editingId,setEditingId]=useState('');
 const set=(k,v)=>setF(x=>({...x,[k]:v}));
 const name=id=>full(students.find(s=>s.id===id));
 const clean=async()=>{
  if(!f.body.trim())return;
  setAiBusy(true);
  try{
   const q=`Clean up this ${meta.short} educator/staff note. Preserve every fact, number, date, direct quote, uncertainty, and action. Do not diagnose, add facts, infer motives, or turn observations into conclusions. Make it concise, objective, professional, and easy for another school staff member to understand. Return only the cleaned note. SOURCE NOTE: ${f.body}`;
   const r=await base44.functions.invoke('askCaseCue',{question:q,history:[],mode:'general'});
   const text=r?.data?.answer||r?.answer;if(!text)throw new Error('No cleaned note returned.');
   setF(x=>({...x,body:text}));setAiCleaned(true);toast({title:'Note cleaned up',description:'Review it before saving.'});
  }catch(e){toast({title:'CaseCue cleanup unavailable',description:e?.response?.data?.error||e.message,variant:'destructive'})}
  finally{setAiBusy(false)}
 };
 const ingest=async file=>{
  if(!file)return;setBusy(true);
  try{
   const up=await base44.integrations.Core.UploadPrivateFile({file}),uri=up.file_uri||up.file_url;
   if(!uri)throw new Error('Private upload did not return a file reference.');
   setAttachment(uri);setFilename(file.name||'attachment');
   try{
    const x=await base44.integrations.Core.ExtractDataFromUploadedFile({file_url:uri,json_schema:{type:'object',properties:{text:{type:'string'}},required:['text']}});
    const text=x?.output?.text||x?.data?.text||x?.text;
    if(text&&!f.body.trim())setF(v=>({...v,body:text}));
   }catch{}
   toast({title:'Attachment added',description:'The original file is kept privately with this note.'});
  }catch(e){toast({title:'Could not attach file',description:e.message,variant:'destructive'})}
  finally{setBusy(false)}
 };
 const resetForm=()=>{setF({student_id:'',title:'',body:'',category:'general',setting:'',support_level:'Not applicable',date:today()});setAiCleaned(false);setAttachment('');setFilename('');setEditingId('')};
 const editNote=n=>{setEditingId(n.id);setF({student_id:n.student_id||'',title:n.title||'',body:n.body||'',category:n.category||'general',setting:n.setting||'',support_level:n.support_level||'Not applicable',date:n.date||today()});setAttachment(n.attachment_url||'');setFilename(n.original_filename||'');setAiCleaned(Boolean(n.ai_cleaned));window.scrollTo({top:0,behavior:'smooth'})};
 const save=async()=>{
  if(!f.body.trim())return toast({title:'Add a note first'});
  setBusy(true);
  try{
   const payload={...f,organization_id:user?.organization_id||user?.data?.organization_id||'',user_id:user.id,workspace:workspaceKey,attachment_url:attachment,original_filename:filename,ai_cleaned:aiCleaned,updated_at:new Date().toISOString()};
   if(editingId){await base44.entities.WorkspaceNote.update(editingId,payload);try{await base44.entities.AuditLog.create({action:'workspace_note_updated',entity_type:'WorkspaceNote',entity_id:editingId,details:`${meta.short} note updated by ${staffName}`})}catch{}}else await base44.entities.WorkspaceNote.create(payload);
   await refetch();toast({title:editingId?'Note updated':'Note saved',description:editingId?'Your changes are reflected in exports and printouts immediately.':undefined});resetForm();
  }catch(e){toast({title:editingId?'Could not update note':'Could not save note',description:e.message,variant:'destructive'})}
  finally{setBusy(false)}
 };
 const remove=async n=>{if(!window.confirm('Delete this note?'))return;await base44.entities.WorkspaceNote.delete(n.id);if(editingId===n.id)resetForm();await refetch();toast({title:'Note deleted'})};
 const filtered=(notes||[]).filter(n=>{const q=search.toLowerCase();return !q||[n.title,n.body,label(n.category),name(n.student_id)].join(' ').toLowerCase().includes(q)});
 const sections=filtered.map(n=>({heading:`${fmt(n.date)} · ${label(n.category)}${n.student_id?` · ${name(n.student_id)}`:''}`,body:[n.title?`Title: ${n.title}`:'',n.setting?`Setting: ${n.setting}`:'',n.support_level&&n.support_level!=='Not applicable'?`Support: ${n.support_level}`:'',n.body].filter(Boolean).join('\n')}));
 const exportOpts={title:`${meta.name} Notes`,subtitle:`${staffName} · ${filtered.length} note${filtered.length===1?'':'s'}`,filename:`casecue-${workspaceKey}-notes`,sections,banner:`CaseCue · ${meta.short} Workspace · Staff record for authorized educational use`};

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">{meta.name} · Notes</div><h1 className="mt-3 text-3xl font-black">Capture it once. Clean it up. Keep the record usable.</h1><p className="mt-2 max-w-3xl text-slate-300">Behavior, assessments, push-in/pull-out support, sessions, handoffs, and quick working notes in one place.</p></section>

  <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
   <Card className="p-6">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><NotebookPen className="h-5 w-5 text-blue-700"/><h2 className="font-black">{editingId?'Edit Note':'New Note'}</h2></div>{editingId&&<Button size="sm" variant="ghost" onClick={resetForm}><X className="mr-1 h-4 w-4"/>Cancel Edit</Button>}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     <div><div className="text-xs font-black text-slate-500">Type</div><select className="mt-1 w-full rounded-lg border p-2 text-sm" value={f.category} onChange={e=>set('category',e.target.value)}>{CATEGORIES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
     <div><div className="text-xs font-black text-slate-500">Date</div><Input className="mt-1" type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></div>
     <div><div className="text-xs font-black text-slate-500">Student</div><select className="mt-1 w-full rounded-lg border p-2 text-sm" value={f.student_id} onChange={e=>set('student_id',e.target.value)}><option value="">General / no student</option>{students.map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}</select></div>
     <div><div className="text-xs font-black text-slate-500">Setting</div><select className="mt-1 w-full rounded-lg border p-2 text-sm" value={f.setting} onChange={e=>set('setting',e.target.value)}><option value="">Not specified</option>{SETTINGS.map(x=><option key={x}>{x}</option>)}</select></div>
     <div className="sm:col-span-2"><div className="text-xs font-black text-slate-500">Support / prompting</div><select className="mt-1 w-full rounded-lg border p-2 text-sm" value={f.support_level} onChange={e=>set('support_level',e.target.value)}>{SUPPORTS.map(x=><option key={x}>{x}</option>)}</select></div>
     <div className="sm:col-span-2"><Input placeholder="Title (optional)" value={f.title} onChange={e=>set('title',e.target.value)}/></div>
     <div className="sm:col-span-2"><Textarea rows={8} placeholder="Type what happened. Stick to observable facts, data, support provided, and student response." value={f.body} onChange={e=>{set('body',e.target.value);setAiCleaned(false)}}/></div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={clean} disabled={aiBusy||!f.body.trim()}><Sparkles className="mr-2 h-4 w-4"/>{aiBusy?'Cleaning…':'Clean Up with CaseCue'}</Button><Button type="button" variant="outline" onClick={()=>fileRef.current?.click()} disabled={busy}><Paperclip className="mr-2 h-4 w-4"/>Attach File</Button><input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.rtf,image/*" onChange={e=>{ingest(e.target.files?.[0]);e.target.value=''}}/></div>
    <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();ingest(e.dataTransfer.files?.[0])}} className="mt-3 rounded-xl border-2 border-dashed p-4 text-center text-sm text-slate-500"><FileUp className="mx-auto h-5 w-5 text-blue-700"/><div className="mt-1 font-semibold">{filename||'Drop a worksheet, behavior sheet, assessment note, photo, or PDF here'}</div></div>
    <Button className="mt-4 w-full bg-slate-950 text-white" onClick={save} disabled={busy}>{busy?(editingId?'Updating…':'Saving…'):(editingId?'Update Note':'Save Note')}</Button>
   </Card>

   <div className="space-y-4">
    <Card className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-black">My Notes</h2><p className="text-xs text-slate-500">Search, print, export, email, or share the record.</p></div><ExportBar {...exportOpts}/></div><div className="relative mt-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input className="pl-9" placeholder="Search notes, student, or type…" value={search} onChange={e=>setSearch(e.target.value)}/></div></Card>
    <div className="space-y-3">{filtered.map(n=><Card key={n.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-800">{label(n.category)}</span>{n.student_id&&<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{name(n.student_id)}</span>}</div><div className="mt-2 font-black">{n.title||label(n.category)}</div><div className="mt-1 text-xs text-slate-500">{fmt(n.date)}{n.setting?` · ${n.setting}`:''}{n.support_level&&n.support_level!=='Not applicable'?` · ${n.support_level}`:''}</div></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>editNote(n)} title="Edit note"><Pencil className="h-4 w-4 text-blue-700"/></Button><Button size="icon" variant="ghost" onClick={()=>remove(n)} title="Delete note"><Trash2 className="h-4 w-4 text-rose-500"/></Button></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{n.body}</p>{n.original_filename&&<div className="mt-3 text-xs font-semibold text-blue-700"><Paperclip className="mr-1 inline h-3.5 w-3.5"/>{n.original_filename}</div>}</Card>)}{!filtered.length&&<Card className="p-10 text-center text-sm text-slate-500">No notes match this view yet.</Card>}</div>
   </div>
  </div>
 </div>;
}

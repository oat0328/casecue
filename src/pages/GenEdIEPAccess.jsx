
import React,{useRef,useState}from'react';
import{Eye,FileText,ShieldCheck,UploadCloud,Trash2}from'lucide-react';
import{base44}from'@/api/base44Client';
import{useAsync}from'@/lib/useAsync';
import{useAuth}from'@/lib/AuthContext';
import{Button}from'@/components/ui/button';
import{Card}from'@/components/ui/cards';
import{useToast}from'@/components/ui/use-toast';

export default function GenEdIEPAccess(){
 const{user}=useAuth(),{toast}=useToast(),ref=useRef(null);
 const[selected,setSelected]=useState(''),[uploading,setUploading]=useState(false);
 const{data:students}=useAsync(()=>base44.entities.Student.list('-last_name',500),[]);
 const student=(students||[]).find(s=>s.id===selected)||null;
 const{data:docs,refetch}=useAsync(()=>selected?base44.entities.Document.filter({student_id:selected},'-updated_date',200):Promise.resolve([]),[selected]);
 const ieps=(docs||[]).filter(d=>/iep/i.test(String(d.document_type||d.type||d.title||'')));

 const open=async d=>{try{const r=await base44.functions.invoke('openDocumentUrl',{document_id:d.id}),x=r?.data||r;if(!x?.signed_url)throw Error('Could not create a private viewing link.');window.open(x.signed_url,'_blank','noopener,noreferrer')}catch(e){toast({title:'Could not open IEP',description:e.message,variant:'destructive'})}};
 const upload=async file=>{
  if(!selected)return toast({title:'Choose the student first',variant:'destructive'});
  if(!file)return;
  setUploading(true);
  try{
   const up=await base44.integrations.Core.UploadPrivateFile({file});
   if(!up?.file_uri)throw Error('Private upload did not return a file reference.');
   await base44.entities.Document.create({student_id:selected,title:file.name,filename:file.name,document_type:'IEP',file_url:up.file_uri,is_private:true,iep_role:'supporting',date_uploaded:new Date().toLocaleDateString('en-CA'),uploaded_by:user?.id||'',extraction_status:'pending',source_type:'gen_ed_read_only_upload'});
   await refetch();toast({title:'IEP uploaded for classroom reference',description:'This does not draft, amend, or finalize an IEP.'});
  }catch(e){toast({title:'Upload failed',description:e.message,variant:'destructive'})}
  finally{setUploading(false);if(ref.current)ref.current.value=''}
 };
 const remove=async d=>{if(!window.confirm('Remove this classroom-reference IEP from CaseCue?'))return;try{await base44.entities.Document.delete(d.id);await refetch();toast({title:'Reference document removed'})}catch(e){toast({title:'Could not remove document',description:e.message,variant:'destructive'})}};

 return <div className="space-y-6">
  <section className="rounded-[30px] bg-slate-950 p-8 text-white"><div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Gen Ed</div><h1 className="mt-3 text-3xl font-black">IEP & Accommodation Access</h1><p className="mt-2 max-w-2xl text-slate-300">Choose the student first, view the plan information you need for classroom support, or privately add an existing IEP for reference. IEP authoring stays in CaseCue SPED.</p></section>
  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><ShieldCheck className="mr-2 inline h-4 w-4"/><b>Read/support workflow:</b> Gen Ed uses the student's existing plan to implement classroom accommodations and supports. This workspace does not create, amend, or finalize an IEP.</div>

  <Card className="p-6"><label className="text-sm font-black">Student</label><select className="mt-2 w-full max-w-xl rounded-lg border bg-white p-2 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose student…</option>{(students||[]).map(s=><option key={s.id} value={s.id}>{s.last_name}, {s.first_name} · Grade {s.grade||'—'}</option>)}</select></Card>

  {student&&<>
   <div className="grid gap-4 lg:grid-cols-2">
    <Card className="p-6"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Classroom accommodations</div><h2 className="mt-1 text-xl font-black">{student.first_name} {student.last_name}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{Array.isArray(student.accommodations)?student.accommodations.join('\n• '):(student.accommodations||'No accommodations are recorded on this CaseCue student profile yet.')}</p></Card>
    <Card className="p-6"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Recorded services / minutes</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><b>Services</b><div className="mt-1 text-sm">{(student.services||[]).join(', ')||'—'}</div></div><div className="rounded-xl bg-slate-50 p-4"><b>Service minutes</b><div className="mt-1 text-sm">{student.service_minutes!=null?student.service_minutes+' min':'—'}</div></div></div></Card>
   </div>

   <Card className="overflow-hidden">
    <div className="flex flex-col gap-3 border-b bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black">Existing IEPs for {student.first_name}</h2><p className="mt-1 text-xs text-slate-500">Only documents linked to the selected student are loaded here.</p></div><input ref={ref} type="file" accept=".pdf,application/pdf,image/*" className="hidden" onChange={e=>upload(e.target.files?.[0])}/></div>
    <div className="p-6">
     <button disabled={uploading} onClick={()=>ref.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();upload(e.dataTransfer.files?.[0])}} className="w-full rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-7 text-center hover:bg-blue-50 disabled:opacity-60"><UploadCloud className="mx-auto h-8 w-8 text-blue-700"/><div className="mt-2 font-black">{uploading?'Uploading privately…':'Drag & drop an existing IEP here'}</div><div className="mt-1 text-xs text-slate-500">or click to choose a PDF/image. The file is linked only after you choose the student.</div></button>
     <div className="mt-5 space-y-2">{ieps.map(d=><div key={d.id} className="flex items-center gap-3 rounded-xl border p-4"><FileText className="h-5 w-5 text-blue-600"/><div className="min-w-0 flex-1"><div className="font-bold">{student.first_name} {student.last_name}</div><div className="truncate text-xs text-slate-500">{d.title||d.filename||'IEP document'}</div></div><Button size="sm" variant="outline" onClick={()=>open(d)}><Eye className="mr-1 h-4 w-4"/>View</Button>{String(d.source_type||'')==='gen_ed_read_only_upload'&&<Button size="icon" variant="ghost" onClick={()=>remove(d)}><Trash2 className="h-4 w-4 text-rose-500"/></Button>}</div>)}{!ieps.length&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No IEP document is linked to this student yet.</div>}</div>
    </div>
   </Card>
  </>}
 </div>;
}
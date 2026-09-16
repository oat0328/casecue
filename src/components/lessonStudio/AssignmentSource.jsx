import React, { useEffect, useRef, useState } from "react";
import { Upload, Link2, Loader2, FileText, Users, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-sm font-medium mb-2";
const ACCEPT = ".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt,.csv";

export default function AssignmentSource({ students, onComplete, analyzing, onAnalyzing, autoGenerate = false, initialTarget = null }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [targetMode, setTargetMode] = useState(initialTarget?.mode || "students");
  const [studentIds, setStudentIds] = useState(initialTarget?.student_ids || []);
  const [groupLabel, setGroupLabel] = useState(initialTarget?.group_label || "");
  const [grade, setGrade] = useState(initialTarget?.grade || "");
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(()=>{
    if(!initialTarget) return;
    setTargetMode(initialTarget.mode || "students");
    setStudentIds(initialTarget.student_ids || []);
    setGroupLabel(initialTarget.group_label || "");
    setGrade(initialTarget.grade || "");
  },[initialTarget]);

  const toggleStudent = (id) => setStudentIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(res.file_url); setFileName(file.name); toast({ title: "Assignment ready", description: file.name }); return res.file_url;
    } catch (err) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); return null; }
    finally { setUploading(false); }
  };
  const onUpload = async (e) => { await uploadFile(e.target.files?.[0]); e.target.value = ""; };
  const onDrop = async (e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) await uploadFile(file); };
  const analyze = async () => {
    if (!fileUrl && !pastedText.trim() && !pageUrl.trim()) { toast({ title: "Add today's work", description: "Drop a worksheet, choose a file, paste the work, or add a link.", variant: "destructive" }); return; }
    onAnalyzing(true);
    try {
      const res = await base44.functions.invoke("analyzeAssignment", { file_url: fileUrl || undefined, pasted_text: pastedText.trim() || undefined, page_url: pageUrl.trim() || undefined, grade_hint: grade });
      await onComplete({ analysis: res.data.analysis, target: { mode: targetMode, student_ids: studentIds, group_label: groupLabel, grade }, autoGenerate });
    } catch (e) { toast({ title: "Could not read assignment", description: e?.response?.data?.error || e.message, variant: "destructive" }); }
    finally { onAnalyzing(false); }
  };

  const selectedNames=(students||[]).filter(s=>studentIds.includes(s.id)).map(s=>`${s.first_name} ${s.last_name}`);
  return <div className="space-y-5">
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary"/>Who are you teaching?</h3><p className="text-xs text-muted-foreground mt-1">Optional. If you opened this from Schedule, your group is already loaded.</p></div></div>
      {initialTarget?.group_label&&<div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="text-xs font-black uppercase tracking-wide text-blue-700">Loaded from schedule</div><div className="font-semibold mt-1">{initialTarget.group_label}</div>{selectedNames.length>0&&<div className="text-xs text-slate-600 mt-1">{selectedNames.join(", ")}</div>}</div>}
      <div className="flex flex-wrap gap-2 mb-4">{["students","group"].map((m)=><button key={m} type="button" onClick={()=>setTargetMode(m)} className={cn("rounded-full px-4 py-2 text-sm border",targetMode===m?"bg-primary text-white border-primary":"border-border")}>{m==="students"?"Student(s)":"Group"}</button>)}</div>
      {targetMode==="students" ? <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">{(students||[]).map((s)=><button key={s.id} type="button" onClick={()=>toggleStudent(s.id)} className={cn("text-sm rounded-full border px-4 py-2",studentIds.includes(s.id)?"bg-primary text-white border-primary":"border-border")}>{s.first_name} {s.last_name}</button>)}</div> : <div className="grid sm:grid-cols-2 gap-4"><div><label className={labelCls}>Group name</label><input className={inputCls} value={groupLabel} onChange={e=>setGroupLabel(e.target.value)} placeholder="Reading Group"/></div><div><label className={labelCls}>Grade</label><input className={inputCls} value={grade} onChange={e=>setGrade(e.target.value)} placeholder="6th grade"/></div></div>}
    </Card>
    <Card className="p-5 sm:p-6"><div className="mb-4"><h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary"/>What are you teaching?</h3><p className="text-sm text-muted-foreground mt-1">Drop the work and CaseCue builds the full plan.</p></div>
      <div onDragEnter={(e)=>{e.preventDefault();setDragging(true)}} onDragOver={(e)=>{e.preventDefault();setDragging(true)}} onDragLeave={(e)=>{e.preventDefault();setDragging(false)}} onDrop={onDrop} onClick={()=>!uploading&&inputRef.current?.click()} className={cn("rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition",dragging?"border-primary bg-primary/5":"border-border hover:border-primary/50 hover:bg-muted/30")}>
        <input ref={inputRef} type="file" className="hidden" accept={ACCEPT} onChange={onUpload}/>{uploading ? <Loader2 className="h-9 w-9 mx-auto animate-spin text-primary"/> : fileName ? <CheckCircle2 className="h-9 w-9 mx-auto text-emerald-600"/> : <Upload className="h-9 w-9 mx-auto text-primary"/>}
        <p className="font-semibold mt-3">{uploading?"Uploading…":fileName?fileName:"Drag & drop today's assignment here"}</p><p className="text-xs text-muted-foreground mt-1">or tap to choose PDF, Word, photo, scan or text file</p>
      </div>
      <details className="mt-4"><summary className="text-sm font-medium cursor-pointer text-muted-foreground">No worksheet? Type the skill instead</summary><div className="space-y-4 mt-4"><textarea className="w-full rounded-lg border border-input p-3 min-h-[90px]" value={pastedText} onChange={e=>setPastedText(e.target.value)} placeholder="Example: Main idea and supporting details"/><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-muted-foreground"/><input className={inputCls} value={pageUrl} onChange={e=>setPageUrl(e.target.value)} placeholder="Optional webpage or YouTube link"/></div></div></details>
      <Button onClick={analyze} disabled={analyzing||uploading} className="brand-gradient text-white h-12 px-7 mt-5 w-full sm:w-auto">{analyzing?<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Creating your lesson…</>:<>Create Full Lesson <Upload className="h-4 w-4 ml-2"/></>}</Button>
    </Card>
  </div>;
}
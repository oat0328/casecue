import React, { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Plus, Trash2, UploadCloud, Download, FileSpreadsheet, Eye, FileText, TrendingUp, Users, ClipboardCheck, FolderOpen, Pencil, X, CheckCircle2, AlertTriangle, ScanLine } from "lucide-react";
import readXlsxFile from "read-excel-file";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import StudentSelector from "@/components/forms/StudentSelector";
import GradebookCharts from "@/components/gradebook/GradebookCharts";
import ReportBuilderPanel from "@/components/shared/ReportBuilderPanel";
import { GRADEBOOK_REPORT_DEFINITIONS } from "@/lib/gradebookReporting";
import SmartGraderV2 from "@/components/gradebook/SmartGraderV2";
import { sortStudentsByName } from "@/lib/studentSort";
import { workspaceFromPath, workspaceUsesIepGradeLinking } from "@/lib/workspaceCapabilities";

const emptyForm = () => ({ student_id: "", goal_id: "", title: "", course: "", gen_ed_teacher: "", assignment_type: "", term: "", score_earned: "", score_possible: "", current_grade_percent: "", current_grade_letter: "", missing_assignment: false, accommodations_provided: "unknown", notes: "", date: new Date().toISOString().slice(0,10) });
const clean = (v) => String(v ?? "").trim();
const normalize = (v) => clean(v).toLowerCase().replace(/[^a-z0-9]/g, "");
const csvCell = (v) => `"${String(v ?? "").replaceAll('"','""')}"`;

export default function Gradebook() {
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceKey = workspaceFromPath(location.pathname, 'sped');
  const canLinkIep = workspaceUsesIepGradeLinking(workspaceKey);
  const { toast } = useToast();
  const fileRef = useRef(null);
  const { data: rawStudents } = useAsync(() => workspaceKey==='para' ? Promise.resolve([]) : base44.entities.Student.list('-last_name', 500), [workspaceKey]);
  const { data: paraAccess } = useAsync(() => workspaceKey==='para' ? base44.entities.ParaStudentAccess.list('-last_name',500) : Promise.resolve([]), [workspaceKey]);
  const students = useMemo(() => {
    if(workspaceKey!=='para')return sortStudentsByName(rawStudents||[]);
    return sortStudentsByName((paraAccess||[]).filter(x=>x.active!==false&&!String(x.student_id||'').startsWith('para_')).map(x=>({...x,id:x.student_id})));
  }, [rawStudents,paraAccess,workspaceKey]);
  const studentIdList = useMemo(() => students.map(s=>s.id).filter(Boolean), [students]);
  const studentIds = useMemo(() => new Set(studentIdList), [studentIdList]);
  const studentIdsKey = studentIdList.join('|');
  const { data: rawGoals } = useAsync(() => canLinkIep ? base44.entities.Goal.list('-updated_date', 300) : Promise.resolve([]), [canLinkIep]);
  const goals = useMemo(() => (rawGoals||[]).filter(g=>studentIds.has(g.student_id)), [rawGoals,studentIds]);
  const { data: rawAssignments, refetch } = useAsync(() => workspaceKey==='para' ? (studentIdList.length?Promise.all(studentIdList.map(id=>base44.entities.GradebookAssignment.filter({student_id:id},'-date',200))).then(rows=>rows.flat()):Promise.resolve([])) : base44.entities.GradebookAssignment.list('-date', 500), [workspaceKey,studentIdsKey]);
  const assignments = rawAssignments||[];
  const { data: rawSessions } = useAsync(() => workspaceKey==='para' ? (studentIdList.length?Promise.all(studentIdList.map(id=>base44.entities.SessionRecord.filter({student_id:id},'-date',300))).then(rows=>rows.flat()):Promise.resolve([])) : base44.entities.SessionRecord.list('-date', 1000), [workspaceKey,studentIdsKey]);
  const sessions = rawSessions||[];
  const { data: rawDocuments } = useAsync(() => canLinkIep ? base44.entities.Document.list('-updated_date', 1000) : Promise.resolve([]), [canLinkIep]);
  const documents = useMemo(() => (rawDocuments||[]).filter(d=>studentIds.has(d.student_id)), [rawDocuments,studentIds]);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(null);

  const goalsForStudent = canLinkIep ? (goals || []).filter((g) => g.student_id === form.student_id) : [];
  const selectedStudent = (students || []).find((s) => s.id === form.student_id) || null;
  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : "—"; };
  const pct = (a) => a.score_possible > 0 ? Math.round((a.score_earned / a.score_possible) * 1000) / 10 : 0;
  const scorePercent = (earned, possible) => Number(possible) > 0 ? Math.round((Number(earned || 0) / Number(possible)) * 1000) / 10 : null;
  const updateManualScore = (field, value) => {
    const next = { ...form, [field]: value };
    const earned = field === 'score_earned' ? value : next.score_earned;
    const possible = field === 'score_possible' ? value : next.score_possible;
    const calculated = scorePercent(earned, possible);
    if (calculated != null) next.current_grade_percent = String(calculated);
    setForm(next);
  };

  const add = async () => {
    if (!form.student_id || !form.title) return toast({ title: "Student and assignment title required", variant: "destructive" });
    setSaving(true);
    try {
      const me=await base44.auth.me(),organization_id=me?.organization_id||me?.data?.organization_id||'';
      const paraSubmission=workspaceKey==='para';
      await base44.entities.GradebookAssignment.create({ ...form, organization_id, score_earned: Number(form.score_earned) || 0, score_possible: Number(form.score_possible) || 0, current_grade_percent: form.current_grade_percent === "" ? null : Number(form.current_grade_percent), source_type:paraSubmission?'para_manual_submission':`${workspaceKey}_manual_grade`, verification_status:paraSubmission?'needs_teacher_review':'teacher_confirmed', approved_by:paraSubmission?'':me.id, approved_at:paraSubmission?'':new Date().toISOString() });
      setForm(emptyForm()); refetch(); toast({ title: paraSubmission?"Grade draft submitted for teacher review":"Grade added" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const findStudent = (value) => {
    const key = normalize(value);
    return (students || []).find((s) => normalize(s.id) === key || normalize(`${s.first_name} ${s.last_name}`) === key || normalize(`${s.last_name}, ${s.first_name}`) === key);
  };

  const rowsFromFile = async (file) => {
    if (/\.pdf$/i.test(file.name)) {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      const signedResult = await base44.functions.invoke('openPrivateFileUrl',{file_uri:up.file_uri});
      const signed = signedResult?.data || signedResult;
      if(!signed?.signed_url) throw new Error('CaseCue could not securely open the uploaded grade report.');
      const schema = {type:'object',properties:{rows:{type:'array',items:{type:'object',properties:{student:{type:'string'},course:{type:'string'},teacher:{type:'string'},assignment:{type:'string'},assignment_type:{type:'string'},points_earned:{type:'number'},points_possible:{type:'number'},current_grade_percent:{type:'number'},letter_grade:{type:'string'},missing:{type:'boolean'},accommodations:{type:'string'},term:{type:'string'},date:{type:'string'},notes:{type:'string'}},required:['student','course','current_grade_percent','letter_grade']}}},required:['rows']};
      const result = await base44.integrations.Core.InvokeLLM({prompt:'Extract the Gen Ed grade report into one row per visible course for each student. Preserve the visible student name, course/subject, teacher, current grade percent, letter grade, term/quarter and report date. Do not invent missing values. A course grade is Gen Ed context only, not IEP progress.',file_urls:[signed.signed_url],response_json_schema:schema,model:'gpt_5_6_luna'});
      const data = typeof result === 'object' ? result : JSON.parse(result);
      return [["Student","Course","Teacher","Assignment","Assignment Type","Points Earned","Points Possible","Current Grade Percent","Letter Grade","Missing","Accommodations","Quarter/Term","Date","Notes"],...(data.rows||[]).map(r=>[r.student,r.course,r.teacher,r.assignment||'Gen Ed grade report',r.assignment_type||'Grade report',r.points_earned??'',r.points_possible??'',r.current_grade_percent??'',r.letter_grade,r.missing?'Yes':'No',r.accommodations||'Unknown',r.term,r.date,r.notes])];
    }
    if (/\.xlsx?$/i.test(file.name)) return await readXlsxFile(file);
    const text = await file.text();
    return text.split(/\r?\n/).filter(Boolean).map((line) => {
      const out=[]; let cur="", quoted=false;
      for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"' && line[i+1]==='"' && quoted){cur+='"';i++;} else if(ch==='"'){quoted=!quoted;} else if(ch===','&&!quoted){out.push(cur);cur="";} else cur+=ch; }
      out.push(cur); return out;
    });
  };

  const importFile = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const rows = await rowsFromFile(file);
      if (rows.length < 2) throw new Error("The file has no grade rows.");
      const headers = rows[0].map(normalize);
      const col = (...names) => headers.findIndex((h) => names.map(normalize).includes(h));
      const idx = {
        student: col("student", "student name", "name", "student id"), course: col("course", "subject", "class"), teacher: col("teacher", "gen ed teacher", "general education teacher"), title: col("assignment", "assignment title", "title"), type: col("assignment type", "type"), earned: col("points earned", "score earned", "earned"), possible: col("points possible", "score possible", "possible"), percent: col("current grade", "current grade percent", "grade percent", "percent"), letter: col("letter grade", "current grade letter"), missing: col("missing", "missing assignment"), accommodations: col("accommodations", "accommodations provided"), term: col("term", "quarter"), date: col("date"), notes: col("notes")
      };
      if (idx.student < 0) throw new Error("Add a Student or Student Name column so CaseCue can match each row.");
      let added=0, skipped=0, duplicates=0;
      const seen=new Set((assignments||[]).map(a=>[a.student_id,normalize(a.course),normalize(a.title),normalize(a.term),String(a.date||''),Number(a.current_grade_percent??-1),normalize(a.current_grade_letter)].join('|')));
      for (const row of rows.slice(1)) {
        const student = findStudent(row[idx.student]);
        if (!student) { skipped++; continue; }
        const title = idx.title >= 0 ? clean(row[idx.title]) : "Gen Ed grade update";
        const rawDate = idx.date >= 0 ? row[idx.date] : "";
        let date = new Date().toISOString().slice(0,10);
        if (rawDate instanceof Date) date = rawDate.toISOString().slice(0,10);
        else if (clean(rawDate)) { const d = new Date(rawDate); if (!Number.isNaN(d.getTime())) date = d.toISOString().slice(0,10); }
        const payload={student_id: student.id, title: title || "Gen Ed grade update", course: idx.course>=0?clean(row[idx.course]):"", gen_ed_teacher: idx.teacher>=0?clean(row[idx.teacher]):"", assignment_type: idx.type>=0?clean(row[idx.type]):"", term: idx.term>=0?clean(row[idx.term]):"", score_earned: idx.earned>=0?Number(row[idx.earned])||0:0, score_possible: idx.possible>=0?Number(row[idx.possible])||0:0, current_grade_percent: idx.percent>=0?Number(String(row[idx.percent]).replace('%',''))||0:null, current_grade_letter: idx.letter>=0?clean(row[idx.letter]):"", missing_assignment: idx.missing>=0?["yes","true","1","missing"].includes(clean(row[idx.missing]).toLowerCase()):false, accommodations_provided: idx.accommodations>=0?(["yes","no"].includes(clean(row[idx.accommodations]).toLowerCase())?clean(row[idx.accommodations]).toLowerCase():"unknown"):"unknown", notes: idx.notes>=0?clean(row[idx.notes]):"", date};
        const fingerprint=[payload.student_id,normalize(payload.course),normalize(payload.title),normalize(payload.term),String(payload.date||''),Number(payload.current_grade_percent??-1),normalize(payload.current_grade_letter)].join('|');
        if(seen.has(fingerprint)){duplicates++;continue;}
        const me=await base44.auth.me();const paraSubmission=workspaceKey==='para';await base44.entities.GradebookAssignment.create({...payload,organization_id:me?.organization_id||me?.data?.organization_id||'',source_type:paraSubmission?'para_grade_import':`${workspaceKey}_grade_import`,verification_status:paraSubmission?'needs_teacher_review':'not_run',approved_by:paraSubmission?'':me.id,approved_at:paraSubmission?'':new Date().toISOString()});seen.add(fingerprint);added++;
      }
      refetch(); toast({ title: `${added} new grade row${added===1?'':'s'} imported`, description: `${duplicates} duplicate${duplicates===1?'':'s'} skipped${skipped?` · ${skipped} unmatched row(s) need review`:''}.` });
    } catch (e) { toast({ title: "Import failed", description: e.message, variant: "destructive" }); }
    finally { setImporting(false); if(fileRef.current) fileRef.current.value=""; }
  };

  const exportCsv = () => {
    const headers = ["Student","Course","Gen Ed Teacher","Assignment","Assignment Type","Points Earned","Points Possible","Current Grade Percent","Letter Grade","Missing Assignment","Accommodations Provided","Quarter/Term","Date","Notes"];
    const body = (assignments || []).map((a) => [studentName(a.student_id),a.course,a.gen_ed_teacher,a.title,a.assignment_type,a.score_earned,a.score_possible,a.current_grade_percent,a.current_grade_letter,a.missing_assignment?"Yes":"No",a.accommodations_provided,a.term,a.date,a.notes].map(csvCell).join(","));
    const blob = new Blob([[headers.map(csvCell).join(","), ...body].join("\n")], {type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=`casecue-gen-ed-grades-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const remove = async (a) => { if(workspaceKey==='para'&&!String(a?.source_type||'').startsWith('para_'))return toast({title:'Teacher-owned grade',description:'Para accounts cannot delete grades that were not submitted from the Para workspace.'}); await base44.entities.GradebookAssignment.delete(a.id); refetch(); };
  const startEdit = (a) => { setEditingId(a.id); setEditForm({ score_earned: String(a.score_earned ?? ''), score_possible: String(a.score_possible ?? ''), current_grade_percent: a.current_grade_percent == null ? '' : String(a.current_grade_percent), current_grade_letter: a.current_grade_letter || '', notes: a.notes || '' }); };
  const updateEditScore = (field, value) => { setEditForm(prev => { const next={...prev,[field]:value}; const earned=field==='score_earned'?value:next.score_earned; const possible=field==='score_possible'?value:next.score_possible; const calculated=scorePercent(earned,possible); if(calculated!=null) next.current_grade_percent=String(calculated); return next; }); };
  const saveEdit = async (a) => { if(!editForm)return; setSaving(true); try { await base44.entities.GradebookAssignment.update(a.id,{ score_earned:Number(editForm.score_earned)||0, score_possible:Number(editForm.score_possible)||0, current_grade_percent:editForm.current_grade_percent===''?null:Number(editForm.current_grade_percent), current_grade_letter:editForm.current_grade_letter, notes:editForm.notes, verification_status:workspaceKey==='para'?'needs_teacher_review':'teacher_confirmed' }); setEditingId(''); setEditForm(null); await refetch(); toast({title:'Grade updated'}); } catch(e){toast({title:'Could not update grade',description:e.message,variant:'destructive'})} finally {setSaving(false);} };
  const openAssignment = async (a) => { try { let uri=a.file_url; if(!uri&&a.work_evidence_id){const ev=await base44.entities.WorkEvidence.filter({id:a.work_evidence_id},'-created_date',1);uri=ev?.[0]?.file_url;} if(!uri)throw new Error('No assignment image/PDF is linked to this grade yet.'); const r=await base44.functions.invoke('openPrivateFileUrl',{file_uri:uri});const s=r?.data||r;if(!s?.signed_url)throw new Error('Could not create a private viewing link.'); window.open(s.signed_url,'_blank','noopener,noreferrer'); } catch(e){toast({title:'Could not open assignment',description:e.message,variant:'destructive'})} };
  const iepForStudent=(studentId)=>canLinkIep?(documents||[]).find(d=>d.student_id===studentId&&/iep/i.test(String(d.document_type||d.type||d.title||''))):null;
  const openIep=async(studentId)=>{try{const d=iepForStudent(studentId);if(!d)throw new Error('No IEP document is currently linked to this student.');const r=await base44.functions.invoke('openDocumentUrl',{document_id:d.id});const s=r?.data||r;if(!s?.signed_url)throw new Error('Could not create an IEP viewing link.');window.open(s.signed_url,'_blank','noopener,noreferrer')}catch(e){toast({title:'Could not open IEP',description:e.message,variant:'destructive'})}};
  const gradeRows=(assignments||[]).filter(a=>a.current_grade_percent!=null||Number(a.score_possible)>0);
  const avgGrade=gradeRows.length?Math.round(gradeRows.reduce((sum,a)=>sum+Number(a.current_grade_percent!=null?a.current_grade_percent:pct(a)),0)/gradeRows.length):0;
  const studentsWithGrades=new Set((assignments||[]).map(a=>a.student_id).filter(Boolean)).size;
  const workLinked=(assignments||[]).filter(a=>a.file_url||a.work_evidence_id).length;
  const needsReview=(assignments||[]).filter(a=>a.verification_status==='needs_teacher_review').length;
  const approvedCount=(assignments||[]).filter(a=>['verified','teacher_confirmed'].includes(a.verification_status)).length;
  const sourceLabel=a=>{const s=String(a.source_type||'');if(s==='para_smart_grader_submission'||s==='para_manual_submission'||s==='para_grade_import')return'Para submission';if(s.includes('manual'))return'Manual grade';if(s.includes('single')||s==='student_work_scan')return'Single uploaded work';if(s.includes('batch')||s==='smart_grader_v2_teacher_assisted')return'Batch uploaded work';if(s.includes('import'))return'Grade import';return s?String(s).replaceAll('_',' '):'Grade record'};
  const canImportGrades=['sped','gen_ed'].includes(workspaceKey);

  return <div>
    <PageHeader title={workspaceKey==='para'?"Student Work":"GradeCue"} subtitle={workspaceKey==='para'?"Score work for students assigned to you, check CaseCue's results, and send the finished package to the teacher.":"GradeCue: load one assignment or a whole class stack, review only what needs attention, then file the final work to each student."} icon={GraduationCap} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6"><Card className="p-5 bg-gradient-to-br from-slate-950 to-slate-800 text-white"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-300">Average grade</div><div className="text-3xl font-black mt-1">{avgGrade}%</div></div><TrendingUp className="h-7 w-7 text-sky-300"/></div></Card><Card className="p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Students with grades</div><div className="text-3xl font-black mt-1">{studentsWithGrades}</div></div><Users className="h-7 w-7 text-blue-600"/></div></Card><Card className="p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assignments</div><div className="text-3xl font-black mt-1">{(assignments||[]).length}</div></div><ClipboardCheck className="h-7 w-7 text-emerald-600"/></div></Card><Card className="p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work attached</div><div className="text-3xl font-black mt-1">{workLinked}</div></div><FileText className="h-7 w-7 text-violet-600"/></div></Card></div>
    <Card className="mb-6 overflow-hidden"><div className="bg-slate-950 p-5 text-white"><div className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300">Easy Gradebook Flow</div><h2 className="mt-1 text-xl font-black">Grade → Review → Find it later.</h2><p className="mt-1 text-sm text-slate-300">Every saved score lands in Saved Work. Uploaded papers stay attached, manual grades stay editable, and answer keys can be saved and reused.</p></div><div className="grid gap-3 p-4 sm:grid-cols-3"><div className="rounded-xl border p-4"><ScanLine className="h-5 w-5 text-blue-700"/><div className="mt-2 font-black">1. Grade Work</div><div className="text-xs text-slate-500">Preload an answer key, upload work, or enter a grade manually.</div></div><div className="rounded-xl border p-4"><CheckCircle2 className="h-5 w-5 text-emerald-700"/><div className="mt-2 font-black">2. Review</div><div className="text-xs text-slate-500">{approvedCount} approved · {needsReview} need teacher review.</div></div><div className="rounded-xl border p-4"><FolderOpen className="h-5 w-5 text-violet-700"/><div className="mt-2 font-black">3. Saved Work</div><div className="text-xs text-slate-500">Open the original assignment, edit the grade, or jump to the student folder.</div></div></div></Card>
    <Tabs defaultValue="smart">
      <TabsList className="mb-4 flex flex-wrap h-auto"><TabsTrigger value="smart">Grade Work</TabsTrigger><TabsTrigger value="assignments">Saved Work</TabsTrigger><TabsTrigger value="manual">Manual Grade</TabsTrigger>{canImportGrades&&<TabsTrigger value="import">Import Grades</TabsTrigger>}<TabsTrigger value="charts">Trends</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger></TabsList>
      <TabsContent value="smart"><SmartGraderV2 students={students||[]} goals={goals||[]} onSaved={refetch}/></TabsContent>
      <TabsContent value="manual">
        <Card className="p-6 mb-6">
          <h3 className="font-black text-lg mb-1 flex items-center gap-2"><Plus className="h-4 w-4 text-primary"/> Manual Grade Entry</h3>
          <p className="text-sm text-muted-foreground mb-5">Enter the score yourself. Example: 2 correct out of 3 automatically becomes 66.7%.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StudentSelector students={students||[]} value={form.student_id} onChange={(id)=>setForm({...form,student_id:id,goal_id:""})} placeholder="Select student…" noBottomSpace />
            <div><Label>Course / Subject</Label><Input value={form.course} onChange={e=>setForm({...form,course:e.target.value})}/></div>
            <div><Label>Assignment</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Context Clues Quiz"/></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            <div><Label>Points Earned</Label><Input type="number" min="0" step="0.01" placeholder="2" value={form.score_earned} onChange={e=>updateManualScore('score_earned',e.target.value)}/></div>
            <div><Label>Points Possible</Label><Input type="number" min="0" step="0.01" placeholder="3" value={form.score_possible} onChange={e=>updateManualScore('score_possible',e.target.value)}/></div>
            <div><Label>Calculated Grade %</Label><Input type="number" value={form.current_grade_percent} onChange={e=>setForm({...form,current_grade_percent:e.target.value})}/><div className="text-[11px] text-muted-foreground mt-1">Auto-calculated from earned ÷ possible. You can edit it if needed.</div></div>
            <div><Label>Letter Grade</Label><Input value={form.current_grade_letter} onChange={e=>setForm({...form,current_grade_letter:e.target.value})}/></div>
            {canLinkIep&&<div className="lg:col-span-2"><Label>Link to IEP goal</Label><select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.goal_id} onChange={e=>setForm({...form,goal_id:e.target.value})}><option value="">No IEP goal link</option>{goalsForStudent.map(g=><option key={g.id} value={g.id}>{g.goal_area||"Goal"} — {g.goal_text||''}</option>)}</select></div>}
            <div><Label>Accommodations provided?</Label><select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.accommodations_provided} onChange={e=>setForm({...form,accommodations_provided:e.target.value})}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          {selectedStudent&&canLinkIep&&<div className="mt-5 grid gap-3 lg:grid-cols-2"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-xs font-black uppercase tracking-wider text-blue-700">IEP accommodations</div><div className="mt-2 text-sm text-blue-950">{selectedStudent.accommodations||'No accommodations are currently stored for this student.'}</div></div><div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><div className="text-xs font-black uppercase tracking-wider text-violet-700">Active IEP goals</div>{goalsForStudent.length?<div className="mt-2 space-y-2">{goalsForStudent.map(g=><div key={g.id} className="text-sm text-violet-950"><b>{g.goal_area||'Goal'}:</b> {g.goal_text||''}</div>)}</div>:<div className="mt-2 text-sm text-violet-950">No active goals are currently stored for this student.</div>}</div></div>}
          <Button onClick={add} disabled={saving} className="brand-gradient text-white mt-5"><Plus className="h-4 w-4 mr-1"/>{saving?"Saving…":workspaceKey==='para'?"Submit for Teacher Review":"Save Manual Grade"}</Button>
        </Card>
      </TabsContent>
      <TabsContent value="assignments">
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary"/> {workspaceKey==='para'?'Submit grade draft':'Add Gen Ed grade'}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StudentSelector students={students||[]} value={form.student_id} onChange={(id)=>setForm({...form,student_id:id,goal_id:""})} placeholder="Select student…" noBottomSpace />
            <div><Label>Course / Subject</Label><Input value={form.course} onChange={e=>setForm({...form,course:e.target.value})}/></div>
            <div><Label>Gen Ed Teacher</Label><Input value={form.gen_ed_teacher} onChange={e=>setForm({...form,gen_ed_teacher:e.target.value})}/></div>
            <div><Label>Quarter / Term</Label><Input value={form.term} onChange={e=>setForm({...form,term:e.target.value})}/></div>
            <div><Label>Assignment</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><Label>Assignment Type</Label><Input value={form.assignment_type} onChange={e=>setForm({...form,assignment_type:e.target.value})}/></div>
            <div><Label>Points Earned</Label><Input type="number" min="0" step="0.01" placeholder="e.g. 2" value={form.score_earned} onChange={e=>updateManualScore('score_earned',e.target.value)}/></div>
            <div><Label>Points Possible</Label><Input type="number" min="0" step="0.01" placeholder="e.g. 3" value={form.score_possible} onChange={e=>updateManualScore('score_possible',e.target.value)}/></div>
            <div><Label>Calculated Grade %</Label><Input type="number" value={form.current_grade_percent} onChange={e=>setForm({...form,current_grade_percent:e.target.value})}/><div className="text-[11px] text-muted-foreground mt-1">Automatically calculates from points. Example: 2 out of 3 = 66.7%. You can override it if needed.</div></div>
            <div><Label>Letter Grade</Label><Input value={form.current_grade_letter} onChange={e=>setForm({...form,current_grade_letter:e.target.value})}/></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            <div><Label>Accommodations?</Label><select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.accommodations_provided} onChange={e=>setForm({...form,accommodations_provided:e.target.value})}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></div>
            {canLinkIep&&<div><Label>Link to IEP goal</Label><select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.goal_id} onChange={e=>setForm({...form,goal_id:e.target.value})}><option value="">—</option>{goalsForStudent.map(g=><option key={g.id} value={g.id}>{g.goal_area||"Goal"}</option>)}</select></div>}
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={form.missing_assignment} onChange={e=>setForm({...form,missing_assignment:e.target.checked})}/> Missing assignment</label>
            <div className="sm:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <Button onClick={add} disabled={saving} className="brand-gradient text-white mt-5"><Plus className="h-4 w-4 mr-1"/>{saving?"Saving…":workspaceKey==='para'?"Submit for Teacher Review":"Add Grade"}</Button>
        </Card>
        <div className="flex justify-end mb-3"><Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2"/>Export CSV</Button></div>
        <div className="space-y-2">{[...(assignments||[])].sort((a,b)=>studentName(a.student_id).localeCompare(studentName(b.student_id),undefined,{sensitivity:'base'})||String(b.date||'').localeCompare(String(a.date||''))).map(a=><Card key={a.id} className="p-4">{editingId===a.id&&editForm?<div className="mb-4 rounded-2xl border bg-slate-50 p-4"><div className="flex items-center justify-between mb-3"><div className="font-black">Edit grade · {studentName(a.student_id)}</div><Button variant="ghost" size="icon" onClick={()=>{setEditingId('');setEditForm(null)}}><X className="h-4 w-4"/></Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><Label>Points Earned</Label><Input type="number" min="0" step="0.01" value={editForm.score_earned} onChange={e=>updateEditScore('score_earned',e.target.value)}/></div><div><Label>Points Possible</Label><Input type="number" min="0" step="0.01" value={editForm.score_possible} onChange={e=>updateEditScore('score_possible',e.target.value)}/></div><div><Label>Grade %</Label><Input type="number" value={editForm.current_grade_percent} onChange={e=>setEditForm({...editForm,current_grade_percent:e.target.value})}/></div><div><Label>Letter Grade</Label><Input value={editForm.current_grade_letter} onChange={e=>setEditForm({...editForm,current_grade_letter:e.target.value})}/></div><div><Label>Notes</Label><Input value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/></div></div><div className="mt-3 flex items-center gap-2"><Button onClick={()=>saveEdit(a)} disabled={saving}>{saving?'Saving…':'Save Changes'}</Button><span className="text-xs text-muted-foreground">Changing points recalculates the percentage automatically.</span></div></div>:null}<div className="flex flex-wrap items-start gap-4"><div className="flex-1 min-w-[240px]"><div className="font-black">{studentName(a.student_id)} · {a.course||"Resource"}</div><div className="text-sm font-semibold mt-0.5">{a.title}</div><div className="text-xs text-muted-foreground mt-1">{sourceLabel(a)} · {a.date}{a.term?` · ${a.term}`:""}{a.accommodations_provided?` · Accommodations: ${a.accommodations_provided}`:""}</div><div className="mt-2 flex flex-wrap gap-1">{(a.file_url||a.work_evidence_id)?<span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">Original work saved</span>:<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">No uploaded paper</span>}{['verified','teacher_confirmed'].includes(a.verification_status)&&<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Graded & saved</span>}{a.verification_status==='needs_teacher_review'&&<span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700"><AlertTriangle className="mr-1 inline h-3 w-3"/>Needs review</span>}</div>{a.quantitative_note&&<div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900"><b>Quantitative:</b> {a.quantitative_note}</div>}{(a.qualitative_note||a.notes)&&<div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"><b>Qualitative:</b> {a.qualitative_note||a.notes}</div>}</div><div className="text-right"><div className="font-black text-lg">{a.score_possible>0?`${a.score_earned}/${a.score_possible} · ${a.current_grade_percent!=null?a.current_grade_percent:pct(a)}%`:a.current_grade_percent!=null?`${a.current_grade_percent}%`:"—"}</div><div className="text-sm">{a.current_grade_letter||""}</div>{a.missing_assignment&&<div className="text-xs text-rose-600 font-medium">Missing</div>}{a.verification_status==='needs_teacher_review'&&<div className="mt-1 text-xs font-black text-amber-700">Needs teacher review</div>}</div><div className="flex flex-wrap gap-1">{(a.file_url||a.work_evidence_id)&&<Button variant="outline" size="sm" onClick={()=>openAssignment(a)}><Eye className="h-3.5 w-3.5 mr-1"/>View work</Button>}{iepForStudent(a.student_id)&&<Button variant="outline" size="sm" onClick={()=>openIep(a.student_id)}><FileText className="h-3.5 w-3.5 mr-1"/>View IEP</Button>}{workspaceKey!=='para'&&<Button variant="outline" size="sm" onClick={()=>navigate(`/students/${a.student_id}?tab=work-grades`)}><FolderOpen className="h-3.5 w-3.5 mr-1"/>Student Folder</Button>}{(workspaceKey!=='para'||String(a.source_type||'').startsWith('para_'))&&<Button variant="outline" size="sm" onClick={()=>startEdit(a)}><Pencil className="h-3.5 w-3.5 mr-1"/>Edit Grade</Button>}{(workspaceKey!=='para'||String(a.source_type||'').startsWith('para_'))&&<Button variant="ghost" size="icon" onClick={()=>remove(a)}><Trash2 className="h-4 w-4 text-rose-500"/></Button>}</div></div></Card>)}</div>
      </TabsContent>
      {canImportGrades&&<TabsContent value="import">
        <Card className={`p-8 border-2 border-dashed text-center transition ${dragging?'border-primary bg-primary/5':'border-border'}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);importFile(e.dataTransfer.files?.[0])}}>
          <UploadCloud className="h-12 w-12 mx-auto text-primary mb-3"/><h3 className="text-lg font-semibold">Drop Gen Ed grade reports here</h3><p className="text-sm text-muted-foreground mt-2">PDF, CSV, XLSX, or XLS. CaseCue matches students, identifies grade rows already on file, skips duplicates, and imports only new grade information.</p>
          <input ref={fileRef} type="file" accept=".pdf,.csv,.xlsx,.xls,application/pdf" className="hidden" onChange={e=>importFile(e.target.files?.[0])}/><Button className="mt-5" onClick={()=>fileRef.current?.click()} disabled={importing}><FileSpreadsheet className="h-4 w-4 mr-2"/>{importing?"Importing…":"Choose File"}</Button>
          <p className="text-xs text-muted-foreground mt-5">Recognized columns include Student, Subject/Course, Teacher, Assignment, Points Earned, Points Possible, Current Grade, Letter Grade, Missing, Accommodations, Quarter/Term, Date, and Notes.</p>
        </Card>
      </TabsContent>}
      <TabsContent value="charts"><GradebookCharts assignments={assignments||[]} sessions={sessions||[]} students={students||[]} goals={goals||[]}/></TabsContent>
      <TabsContent value="reports"><ReportBuilderPanel definitions={GRADEBOOK_REPORT_DEFINITIONS} data={{students:students||[],goals:goals||[],assignments:assignments||[],sessions:sessions||[]}} heading="Gradebook Reports"/></TabsContent>
    </Tabs>
  </div>;
}

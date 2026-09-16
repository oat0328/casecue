import React, { useRef, useState } from "react";
import { GraduationCap, Plus, Trash2, UploadCloud, Download, FileSpreadsheet } from "lucide-react";
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
import WorkEvidencePanel from "@/components/evidence/WorkEvidencePanel";
import BatchWorkEvidencePanel from "@/components/evidence/BatchWorkEvidencePanel";

const emptyForm = () => ({ student_id: "", goal_id: "", title: "", course: "", gen_ed_teacher: "", assignment_type: "", term: "", score_earned: "", score_possible: "", current_grade_percent: "", current_grade_letter: "", missing_assignment: false, accommodations_provided: "unknown", notes: "", date: new Date().toISOString().slice(0,10) });
const clean = (v) => String(v ?? "").trim();
const normalize = (v) => clean(v).toLowerCase().replace(/[^a-z0-9]/g, "");
const csvCell = (v) => `"${String(v ?? "").replaceAll('"','""')}"`;

export default function Gradebook() {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 300), []);
  const { data: assignments, refetch } = useAsync(() => base44.entities.GradebookAssignment.list('-date', 500), []);
  const { data: sessions } = useAsync(() => base44.entities.SessionRecord.list('-date', 300), []);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  const goalsForStudent = (goals || []).filter((g) => g.student_id === form.student_id);
  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : "—"; };
  const pct = (a) => a.score_possible > 0 ? Math.round((a.score_earned / a.score_possible) * 1000) / 10 : 0;

  const add = async () => {
    if (!form.student_id || !form.title) return toast({ title: "Student and assignment title required", variant: "destructive" });
    setSaving(true);
    try {
      await base44.entities.GradebookAssignment.create({ ...form, score_earned: Number(form.score_earned) || 0, score_possible: Number(form.score_possible) || 0, current_grade_percent: form.current_grade_percent === "" ? null : Number(form.current_grade_percent) });
      setForm(emptyForm()); refetch(); toast({ title: "Gen Ed grade added" });
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
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: up.file_uri, expires_in: 900 });
      const schema = {type:'object',properties:{rows:{type:'array',items:{type:'object',properties:{student:{type:'string'},course:{type:'string'},teacher:{type:'string'},assignment:{type:'string'},assignment_type:{type:'string'},points_earned:{type:'number'},points_possible:{type:'number'},current_grade_percent:{type:'number'},letter_grade:{type:'string'},missing:{type:'boolean'},accommodations:{type:'string'},term:{type:'string'},date:{type:'string'},notes:{type:'string'}},required:['student','course','current_grade_percent','letter_grade']}}},required:['rows']};
      const result = await base44.integrations.Core.InvokeLLM({prompt:'Extract the Gen Ed grade report into one row per visible course for each student. Preserve the visible student name, course/subject, teacher, current grade percent, letter grade, term/quarter and report date. Do not invent missing values. A course grade is Gen Ed context only, not IEP progress.',file_urls:[signed.signed_url],response_json_schema:schema,model:'automatic'});
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
      let added=0, skipped=0;
      for (const row of rows.slice(1)) {
        const student = findStudent(row[idx.student]);
        if (!student) { skipped++; continue; }
        const title = idx.title >= 0 ? clean(row[idx.title]) : "Gen Ed grade update";
        const rawDate = idx.date >= 0 ? row[idx.date] : "";
        let date = new Date().toISOString().slice(0,10);
        if (rawDate instanceof Date) date = rawDate.toISOString().slice(0,10);
        else if (clean(rawDate)) { const d = new Date(rawDate); if (!Number.isNaN(d.getTime())) date = d.toISOString().slice(0,10); }
        await base44.entities.GradebookAssignment.create({
          student_id: student.id, title: title || "Gen Ed grade update", course: idx.course>=0?clean(row[idx.course]):"", gen_ed_teacher: idx.teacher>=0?clean(row[idx.teacher]):"", assignment_type: idx.type>=0?clean(row[idx.type]):"", term: idx.term>=0?clean(row[idx.term]):"", score_earned: idx.earned>=0?Number(row[idx.earned])||0:0, score_possible: idx.possible>=0?Number(row[idx.possible])||0:0, current_grade_percent: idx.percent>=0?Number(String(row[idx.percent]).replace('%',''))||0:null, current_grade_letter: idx.letter>=0?clean(row[idx.letter]):"", missing_assignment: idx.missing>=0?["yes","true","1","missing"].includes(clean(row[idx.missing]).toLowerCase()):false, accommodations_provided: idx.accommodations>=0?(["yes","no"].includes(clean(row[idx.accommodations]).toLowerCase())?clean(row[idx.accommodations]).toLowerCase():"unknown"):"unknown", notes: idx.notes>=0?clean(row[idx.notes]):"", date
        });
        added++;
      }
      refetch(); toast({ title: `${added} grade row${added===1?'':'s'} imported`, description: skipped ? `${skipped} row(s) skipped because the student could not be matched.` : "Students were matched automatically." });
    } catch (e) { toast({ title: "Import failed", description: e.message, variant: "destructive" }); }
    finally { setImporting(false); if(fileRef.current) fileRef.current.value=""; }
  };

  const exportCsv = () => {
    const headers = ["Student","Course","Gen Ed Teacher","Assignment","Assignment Type","Points Earned","Points Possible","Current Grade Percent","Letter Grade","Missing Assignment","Accommodations Provided","Quarter/Term","Date","Notes"];
    const body = (assignments || []).map((a) => [studentName(a.student_id),a.course,a.gen_ed_teacher,a.title,a.assignment_type,a.score_earned,a.score_possible,a.current_grade_percent,a.current_grade_letter,a.missing_assignment?"Yes":"No",a.accommodations_provided,a.term,a.date,a.notes].map(csvCell).join(","));
    const blob = new Blob([[headers.map(csvCell).join(","), ...body].join("\n")], {type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=`casecue-gen-ed-grades-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const remove = async (id) => { await base44.entities.GradebookAssignment.delete(id); refetch(); };

  return <div>
    <PageHeader title="Gradebook" subtitle="Drop mixed student work, let CaseCue identify and grade it, capture quantitative data, connect it to goals, and file the work to each student." icon={GraduationCap} />
    <Tabs defaultValue="stack">
      <TabsList className="mb-4 flex flex-wrap h-auto"><TabsTrigger value="stack">Paper Scanner</TabsTrigger><TabsTrigger value="upload">Single Student Scan</TabsTrigger><TabsTrigger value="assignments">Gradebook</TabsTrigger><TabsTrigger value="import">School Grade Import</TabsTrigger><TabsTrigger value="charts">Data & Trends</TabsTrigger><TabsTrigger value="reports">Reports & Exports</TabsTrigger></TabsList>
      <TabsContent value="assignments">
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary"/> Add Gen Ed grade</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StudentSelector students={students||[]} value={form.student_id} onChange={(id)=>setForm({...form,student_id:id,goal_id:""})} placeholder="Select student…" noBottomSpace />
            <div><Label>Course / Subject</Label><Input value={form.course} onChange={e=>setForm({...form,course:e.target.value})}/></div>
            <div><Label>Gen Ed Teacher</Label><Input value={form.gen_ed_teacher} onChange={e=>setForm({...form,gen_ed_teacher:e.target.value})}/></div>
            <div><Label>Quarter / Term</Label><Input value={form.term} onChange={e=>setForm({...form,term:e.target.value})}/></div>
            <div><Label>Assignment</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
            <div><Label>Assignment Type</Label><Input value={form.assignment_type} onChange={e=>setForm({...form,assignment_type:e.target.value})}/></div>
            <div><Label>Points Earned</Label><Input type="number" value={form.score_earned} onChange={e=>setForm({...form,score_earned:e.target.value})}/></div>
            <div><Label>Points Possible</Label><Input type="number" value={form.score_possible} onChange={e=>setForm({...form,score_possible:e.target.value})}/></div>
            <div><Label>Current Grade %</Label><Input type="number" value={form.current_grade_percent} onChange={e=>setForm({...form,current_grade_percent:e.target.value})}/></div>
            <div><Label>Letter Grade</Label><Input value={form.current_grade_letter} onChange={e=>setForm({...form,current_grade_letter:e.target.value})}/></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            <div><Label>Accommodations?</Label><select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.accommodations_provided} onChange={e=>setForm({...form,accommodations_provided:e.target.value})}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></div>
            <div><Label>Link to IEP goal</Label><select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.goal_id} onChange={e=>setForm({...form,goal_id:e.target.value})}><option value="">—</option>{goalsForStudent.map(g=><option key={g.id} value={g.id}>{g.goal_area||"Goal"}</option>)}</select></div>
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={form.missing_assignment} onChange={e=>setForm({...form,missing_assignment:e.target.checked})}/> Missing assignment</label>
            <div className="sm:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          </div>
          <Button onClick={add} disabled={saving} className="brand-gradient text-white mt-5"><Plus className="h-4 w-4 mr-1"/>{saving?"Saving…":"Add Grade"}</Button>
        </Card>
        <div className="flex justify-end mb-3"><Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2"/>Export CSV</Button></div>
        <div className="space-y-2">{(assignments||[]).map(a=><Card key={a.id} className="p-4 flex items-center gap-4"><div className="flex-1"><div className="font-medium">{studentName(a.student_id)} · {a.course||"Gen Ed"}</div><div className="text-sm">{a.title}</div><div className="text-xs text-muted-foreground">{a.gen_ed_teacher||"Teacher not entered"} · {a.date}{a.term?` · ${a.term}`:""}{a.accommodations_provided?` · Accommodations: ${a.accommodations_provided}`:""}</div></div><div className="text-right"><div className="font-semibold">{a.current_grade_percent!=null?`${a.current_grade_percent}%`:a.score_possible>0?`${pct(a)}%`:"—"}</div><div className="text-sm">{a.current_grade_letter||""}</div>{a.missing_assignment&&<div className="text-xs text-rose-600 font-medium">Missing</div>}</div><Button variant="ghost" size="icon" onClick={()=>remove(a.id)}><Trash2 className="h-4 w-4 text-rose-500"/></Button></Card>)}</div>
      </TabsContent>
      <TabsContent value="import">
        <Card className={`p-8 border-2 border-dashed text-center transition ${dragging?'border-primary bg-primary/5':'border-border'}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);importFile(e.dataTransfer.files?.[0])}}>
          <UploadCloud className="h-12 w-12 mx-auto text-primary mb-3"/><h3 className="text-lg font-semibold">Drop Gen Ed grade reports here</h3><p className="text-sm text-muted-foreground mt-2">PDF, CSV, XLSX, or XLS. CaseCue reads school grade-report PDFs like the one you uploaded, matches the student, and imports one row per visible course.</p>
          <input ref={fileRef} type="file" accept=".pdf,.csv,.xlsx,.xls,application/pdf" className="hidden" onChange={e=>importFile(e.target.files?.[0])}/><Button className="mt-5" onClick={()=>fileRef.current?.click()} disabled={importing}><FileSpreadsheet className="h-4 w-4 mr-2"/>{importing?"Importing…":"Choose File"}</Button>
          <p className="text-xs text-muted-foreground mt-5">Recognized columns include Student, Subject/Course, Teacher, Assignment, Points Earned, Points Possible, Current Grade, Letter Grade, Missing, Accommodations, Quarter/Term, Date, and Notes.</p>
        </Card>
      </TabsContent>
      <TabsContent value="stack"><BatchWorkEvidencePanel students={students||[]} goals={goals||[]} onSaved={refetch}/></TabsContent>
      <TabsContent value="upload"><WorkEvidencePanel students={students||[]} goals={goals||[]}/></TabsContent>
      <TabsContent value="charts"><GradebookCharts assignments={assignments||[]} sessions={sessions||[]} students={students||[]} goals={goals||[]}/></TabsContent>
      <TabsContent value="reports"><ReportBuilderPanel definitions={GRADEBOOK_REPORT_DEFINITIONS} data={{students:students||[],goals:goals||[],assignments:assignments||[],sessions:sessions||[]}} heading="Gradebook Reports"/></TabsContent>
    </Tabs>
  </div>;
}

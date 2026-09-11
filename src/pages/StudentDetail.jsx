import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, Trash2, Target, BarChart3, FolderOpen, UsersRound, StickyNote, Save, Sparkles, Loader2, Download, ShieldCheck, Clock3, Wrench, Accessibility, Compass, FileSearch, Archive, History } from "lucide-react";
import { exportIepPdf } from "@/lib/pdfExport";
import ExportGate from "@/components/shared/ExportGate";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import GoalBankPicker from "@/components/goalBank/GoalBankPicker";
import GoalBoard from "@/components/students/GoalBoard";
import ParentSharePanel from "@/components/students/ParentSharePanel";
import ModificationsPanel from "@/components/students/ModificationsPanel";
import AccommodationLogPanel from "@/components/students/AccommodationLogPanel";
import TransitionPanel from "@/components/students/TransitionPanel";
import EvaluationPanel from "@/components/students/EvaluationPanel";
import WorkEvidencePanel from "@/components/evidence/WorkEvidencePanel";
import InputRecordsPanel from "@/components/students/InputRecordsPanel";
import { Library } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

const colorMap = {
  violet: "bg-sky-100 text-sky-700", blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700", cyan: "bg-cyan-100 text-cyan-700",
};
const ELIGIBILITY_OPTIONS = [
  "Autism Spectrum Disorder","Deaf/Blind","Developmental Delay","Emotional Disturbance",
  "Health Impairment","Hearing Impairment/Deaf","Intellectual Disability","Multiple Impairments",
  "Orthopedic Impairment","Specific Learning Disability","Speech/Language Impairment",
  "Traumatic Brain Injury","Visual Impairment/Blind","Other/State-Specific"
];

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: student, setData: setStudent, refetch } = useAsync(() => base44.entities.Student.get(id), [id]);
  const { data: goals, refetch: refetchGoals } = useAsync(() => base44.entities.Goal.filter({ student_id: id }, '-updated_date', 100), [id]);
  const { data: progress, refetch: refetchProgress } = useAsync(() => base44.entities.ProgressData.filter({ student_id: id }, 'date', 100), [id]);
  const { data: documents, refetch: refetchDocs } = useAsync(() => base44.entities.Document.filter({ student_id: id }, '-date_uploaded', 100), [id]);
  const { data: meetings, refetch: refetchMeetings } = useAsync(() => base44.entities.Meeting.filter({ student_id: id }, 'date', 100), [id]);
  const { data: sessions } = useAsync(() => base44.entities.SessionRecord.filter({ student_id: id }, '-date', 300), [id]);
  const { data: workEvidence } = useAsync(() => base44.entities.WorkEvidence.filter({ student_id: id }, '-date', 200), [id]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newGoal, setNewGoal] = useState({ goal_area: "", goal_text: "", baseline: "", target: "", criterion: "", measurement_method: "" });
  const [savingGoal, setSavingGoal] = useState(false);

  const [newProg, setNewProg] = useState({ date: new Date().toISOString().slice(0,10), goal_id: "", correct: "", total: "", observation_notes: "", prompting_level: "independent" });
  const [savingProg, setSavingProg] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  if (!student) return <div className="text-center py-20 text-muted-foreground">Loading student…</div>;

  const startEdit = () => { setDraft({ ...student }); setEditing(true); };
  const deleteStudent = async () => {
    setDeletingStudent(true);
    try {
      await base44.entities.Student.delete(id);
      toast({ title: "Student deleted" });
      navigate("/students");
    } catch (e) {
      toast({ title: "Could not delete student", description: e.message, variant: "destructive" });
    } finally { setDeletingStudent(false); }
  };
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await base44.entities.Student.update(id, draft);
      setStudent(updated); setEditing(false);
      toast({ title: "Profile saved" });
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSavingProfile(false); }
  };

  const addGoal = async () => {
    if (!newGoal.goal_text) { toast({ title: "Goal text is required", variant: "destructive" }); return; }
    setSavingGoal(true);
    try {
      await base44.entities.Goal.create({ ...newGoal, student_id: id });
      setNewGoal({ goal_area: "", goal_text: "", baseline: "", target: "", criterion: "", measurement_method: "" });
      refetchGoals(); toast({ title: "Goal added" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSavingGoal(false); }
  };

  const deleteGoal = async (gid) => { await base44.entities.Goal.delete(gid); refetchGoals(); };

  const addProgress = async () => {
    if (!newProg.date) { toast({ title: "Date required", variant: "destructive" }); return; }
    const correct = parseFloat(newProg.correct) || 0;
    const total = parseFloat(newProg.total) || 0;
    const percentage = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    const decimal = total > 0 ? Math.round((correct / total) * 100) / 100 : 0;
    setSavingProg(true);
    try {
      await base44.entities.ProgressData.create({ ...newProg, correct, total, percentage, decimal, student_id: id });
      setNewProg({ date: new Date().toISOString().slice(0,10), goal_id: "", correct: "", total: "", observation_notes: "", prompting_level: "independent" });
      refetchProgress(); toast({ title: "Progress data logged" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSavingProg(false); }
  };

  const generatePresentLevels = async () => {
    setGenLoading(true);
    try {
      const res = await base44.functions.invoke("generateIepSection", { student_id: id, section_type: "present_levels" });
      const text = res.data.draft;
      setStudent({ ...student, present_levels: (student.present_levels ? student.present_levels + "\n\n" : "") + text });
      toast({ title: "Present levels drafted — review required" });
    } catch (e) { toast({ title: "Generation failed", description: e.message, variant: "destructive" }); }
    finally { setGenLoading(false); }
  };

  const saveNote = async () => {
    if (!newNote.trim()) return;
    const updated = await base44.entities.Student.update(id, { notes: (student.notes ? student.notes + "\n\n" : "") + `[${new Date().toLocaleDateString()}] ${newNote}` });
    setStudent(updated); setNewNote(""); toast({ title: "Note added" });
  };

  const chartData = (progress || []).map((p) => ({ date: p.date, percentage: p.percentage || 0 }));
  const forecastFor = (goalId) => {
    const pts = (progress || []).filter((p) => p.goal_id === goalId && Number.isFinite(Number(p.percentage))).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    if (pts.length < 2) return { label: "Need more data", detail: "At least two percentage data points are required for a trend estimate.", tone: "slate" };
    const recent = pts.slice(-5); const first = Number(recent[0].percentage); const last = Number(recent[recent.length-1].percentage); const delta = Math.round((last-first)*10)/10;
    if (Math.abs(delta) < 3) return { label: "Stable trend", detail: `${last}% current · ${delta >= 0 ? '+' : ''}${delta} points across the recent window`, tone: "amber" };
    return delta > 0
      ? { label: "Trending upward", detail: `${last}% current · +${delta} points across the recent window`, tone: "emerald" }
      : { label: "Trending downward", detail: `${last}% current · ${delta} points across the recent window`, tone: "rose" };
  };
  const dataQualityIssues = [
    !/^\d{4}-\d{2}-\d{2}$/.test(student.annual_review_due || "") ? "Annual review date needs review or is missing." : null,
    ...(goals || []).filter((g) => !g.baseline).map((g) => `${g.goal_area || "Goal"}: baseline is missing.`),
    ...(goals || []).filter((g) => !g.measurement_method).map((g) => `${g.goal_area || "Goal"}: measurement method is missing.`),
    ...(progress || []).filter((p) => !p.goal_id).slice(0,5).map((p) => `Progress data on ${p.date || "unknown date"} is not linked to a goal.`),
  ].filter(Boolean);

  const Field = ({ label, value, name }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        name === "eligibility_category" ? (
          <Select value={draft[name] || ""} onValueChange={(v) => setDraft({ ...draft, [name]: v })}>
            <SelectTrigger><SelectValue placeholder="Select eligibility" /></SelectTrigger>
            <SelectContent>{ELIGIBILITY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        ) : <Input value={draft[name] ?? ""} onChange={(e) => setDraft({ ...draft, [name]: e.target.value })} />
      ) : <div className="mt-0.5 text-sm font-medium">{value || "—"}</div>}
    </div>
  );

  return (
    <div>
      <button onClick={() => navigate("/students")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </button>

      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07111f] via-[#0b1730] to-[#12345d] px-6 py-7 text-white shadow-xl mb-7">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${colorMap[student.avatar_color] || colorMap.violet}`}>
              {student.first_name?.[0]}{student.last_name?.[0]}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-sky-300">Student 360</div>
              <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight">{student.first_name} {student.last_name}</h1>
              <p className="mt-1 text-slate-300">Grade {student.grade || "—"} · {student.eligibility_category || "Eligibility not entered"}</p>
            </div>
          </div>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={saveProfile} disabled={savingProfile} className="bg-white text-slate-950 hover:bg-slate-100"><Save className="h-4 w-4 mr-1" /> {savingProfile ? "Saving…" : "Save changes"}</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={() => navigate(`/iep-studio?student=${id}`)}>Open IEP Studio</Button>
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => navigate(`/session-tracker?student_id=${id}`)}>Log session</Button>
              <ExportGate documentName="IEP draft" onExport={() => exportIepPdf(student, goals || [])}>
                <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10"><Download className="h-4 w-4 mr-1" /> Export</Button>
              </ExportGate>
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={startEdit}>Edit profile</Button>
              <Button variant="outline" className="border-rose-300/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
            </div>
          )}
        </div>
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto mb-6 flex-wrap h-auto">
          <TabsTrigger value="overview"><Users className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="goals"><Target className="h-4 w-4 mr-1.5" /> Goals</TabsTrigger>
          <TabsTrigger value="progress"><BarChart3 className="h-4 w-4 mr-1.5" /> Progress</TabsTrigger>
          <TabsTrigger value="documents"><FolderOpen className="h-4 w-4 mr-1.5" /> Documents</TabsTrigger>
          <TabsTrigger value="meetings"><UsersRound className="h-4 w-4 mr-1.5" /> Meetings</TabsTrigger>
          <TabsTrigger value="modifications"><Wrench className="h-4 w-4 mr-1.5" /> Modifications</TabsTrigger>
          <TabsTrigger value="accommodations-log"><Accessibility className="h-4 w-4 mr-1.5" /> Accommodation Log</TabsTrigger>
          <TabsTrigger value="transition"><Compass className="h-4 w-4 mr-1.5" /> Transition</TabsTrigger>
          <TabsTrigger value="evaluations"><FileSearch className="h-4 w-4 mr-1.5" /> Evaluations</TabsTrigger>
          <TabsTrigger value="evidence"><Archive className="h-4 w-4 mr-1.5" /> Evidence Vault</TabsTrigger>
          <TabsTrigger value="timeline"><History className="h-4 w-4 mr-1.5" /> Timeline</TabsTrigger>
          <TabsTrigger value="input"><UsersRound className="h-4 w-4 mr-1.5" /> Team Input</TabsTrigger>
          <TabsTrigger value="proof"><ShieldCheck className="h-4 w-4 mr-1.5" /> CaseCue Proof</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger>
          <TabsTrigger value="family"><UsersRound className="h-4 w-4 mr-1.5" /> Family View</TabsTrigger>
        </TabsList>

        <TabsContent value="family">
          <ParentSharePanel student={student} />
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview">
          <Card className="p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="First name" value={student.first_name} name="first_name" />
              <Field label="Last name" value={student.last_name} name="last_name" />
              <Field label="Grade" value={student.grade} name="grade" />
              <Field label="Eligibility category" value={student.eligibility_category} name="eligibility_category" />
              <Field label="IEP date" value={student.iep_date} name="iep_date" />
              <Field label="Annual review due" value={student.annual_review_due} name="annual_review_due" />
              <Field label="Reevaluation due" value={student.reevaluation_due} name="reevaluation_due" />
              <Field label="Service minutes" value={student.service_minutes} name="service_minutes" />
              <Field label="Status" value={student.status} name="status" />
            </div>
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Strengths</Label>
                  <Button variant="ghost" size="sm" onClick={generatePresentLevels} disabled={genLoading} className="text-primary">
                    {genLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} Draft with CaseCue
                  </Button>
                </div>
                {editing ? <Textarea rows={3} value={draft.strengths} onChange={(e) => setDraft({ ...draft, strengths: e.target.value })} /> : <p className="text-sm whitespace-pre-wrap mt-1">{student.strengths || "—"}</p>}
              </div>
              <div><Label>Areas of need</Label>{editing ? <Textarea rows={3} value={draft.areas_of_need} onChange={(e) => setDraft({ ...draft, areas_of_need: e.target.value })} /> : <p className="text-sm whitespace-pre-wrap mt-1">{student.areas_of_need || "—"}</p>}</div>
              <div><Label>Present levels</Label>{editing ? <Textarea rows={5} value={draft.present_levels} onChange={(e) => setDraft({ ...draft, present_levels: e.target.value })} /> : <p className="text-sm whitespace-pre-wrap mt-1">{student.present_levels || "—"}</p>}</div>
              <div><Label>Accommodations</Label>{editing ? <Textarea rows={3} value={draft.accommodations} onChange={(e) => setDraft({ ...draft, accommodations: e.target.value })} /> : <p className="text-sm whitespace-pre-wrap mt-1">{student.accommodations || "—"}</p>}</div>
              <div><Label>Services</Label>{editing ? <Textarea rows={2} value={draft.services?.join(", ")} onChange={(e) => setDraft({ ...draft, services: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /> : <p className="text-sm whitespace-pre-wrap mt-1">{student.services?.join(", ") || "—"}</p>}</div>
            </div>
          </Card>
          <GoalBoard student={student} goals={goals || []} progress={progress || []} />
        </TabsContent>

        {/* Goals */}
        <TabsContent value="goals">
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add goal</h3>
              <Button variant="outline" size="sm" onClick={() => setBankOpen(true)}>
                <Library className="h-3.5 w-3.5 mr-1" /> Goal bank
              </Button>
            </div>
            <GoalBankPicker
              open={bankOpen}
              onOpenChange={setBankOpen}
              onSelect={(g) => {
                setNewGoal({ ...newGoal, goal_area: g.area, goal_text: g.goal_text, criterion: g.criterion, measurement_method: g.measurement_method });
                setBankOpen(false);
                toast({ title: "Template added — edit for this student", description: "Replace placeholders like [Student] and [grade] before saving." });
              }}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Goal area</Label><Input value={newGoal.goal_area} onChange={(e) => setNewGoal({ ...newGoal, goal_area: e.target.value })} placeholder="Reading, Math…" /></div>
              <div><Label>Criterion</Label><Input value={newGoal.criterion} onChange={(e) => setNewGoal({ ...newGoal, criterion: e.target.value })} placeholder="4/5 trials" /></div>
              <div className="sm:col-span-2"><Label>Goal text *</Label><Textarea rows={2} value={newGoal.goal_text} onChange={(e) => setNewGoal({ ...newGoal, goal_text: e.target.value })} /></div>
              <div><Label>Baseline</Label><Input value={newGoal.baseline} onChange={(e) => setNewGoal({ ...newGoal, baseline: e.target.value })} /></div>
              <div><Label>Target</Label><Input value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Measurement method</Label><Input value={newGoal.measurement_method} onChange={(e) => setNewGoal({ ...newGoal, measurement_method: e.target.value })} /></div>
            </div>
            <Button onClick={addGoal} disabled={savingGoal} className="brand-gradient text-white mt-4"><Plus className="h-4 w-4 mr-1" /> {savingGoal ? "Saving…" : "Add goal"}</Button>
          </Card>
          <div className="space-y-3">
            {(goals || []).map((g) => (
              <Card key={g.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-primary uppercase tracking-wide">{g.goal_area || "General"} · {g.status}</div>
                    <p className="mt-1 font-medium">{g.goal_text}</p>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span>Baseline: {g.baseline || "—"}</span><span>Target: {g.target || "—"}</span><span>Criterion: {g.criterion || "—"}</span><span>Measure: {g.measurement_method || "—"}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              </Card>
            ))}
            {(goals || []).length === 0 && <p className="text-center text-muted-foreground py-8">No goals yet.</p>}
          </div>
        </TabsContent>

        {/* Progress */}
        <TabsContent value="progress">
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Log progress data</h3>
            <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div><Label>Date</Label><Input type="date" value={newProg.date} onChange={(e) => setNewProg({ ...newProg, date: e.target.value })} /></div>
              <div><Label>Goal</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={newProg.goal_id} onChange={(e) => setNewProg({ ...newProg, goal_id: e.target.value })}>
                  <option value="">—</option>
                  {(goals || []).map((g) => <option key={g.id} value={g.id}>{g.goal_area || "Goal"}</option>)}
                </select>
              </div>
              <div><Label>Correct</Label><Input type="number" value={newProg.correct} onChange={(e) => setNewProg({ ...newProg, correct: e.target.value })} /></div>
              <div><Label>Total</Label><Input type="number" value={newProg.total} onChange={(e) => setNewProg({ ...newProg, total: e.target.value })} /></div>
              <div><Label>Prompting level</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={newProg.prompting_level} onChange={(e) => setNewProg({ ...newProg, prompting_level: e.target.value })}>
                  {["independent","verbal","visual","physical","full"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3"><Label>Observation notes</Label><Input value={newProg.observation_notes} onChange={(e) => setNewProg({ ...newProg, observation_notes: e.target.value })} /></div>
            </div>
            <Button onClick={addProgress} disabled={savingProg} className="brand-gradient text-white mt-4"><Plus className="h-4 w-4 mr-1" /> {savingProg ? "Saving…" : "Log data"}</Button>
          </Card>
          {chartData.length > 0 && (
            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">Progress trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={12} /><YAxis domain={[0,100]} fontSize={12} /><Tooltip /><Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
          <div className="space-y-2">
            {(progress || []).slice().reverse().map((p) => (
              <Card key={p.id} className="p-4 flex items-center justify-between">
                <div><div className="text-sm font-medium">{p.date} · {p.correct}/{p.total} ({p.percentage}%)</div><div className="text-xs text-muted-foreground">{p.prompting_level} · {p.observation_notes || "No notes"}</div></div>
                <span className="text-lg font-bold text-primary">{p.decimal}</span>
              </Card>
            ))}
            {(progress || []).length === 0 && <p className="text-center text-muted-foreground py-8">No progress data yet.</p>}
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <div className="flex justify-end mb-4"><Button className="brand-gradient text-white" onClick={() => navigate(`/iep-studio?student=${id}`)}><Plus className="h-4 w-4 mr-1" /> Open Upload Center</Button></div>
          <div className="space-y-2">
            {(documents || []).map((d) => (
              <Card key={d.id} className="p-4 flex items-center justify-between">
                <div><div className="text-sm font-medium">{d.filename}</div><div className="text-xs text-muted-foreground">{d.document_type} · {d.date_uploaded}</div></div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted">{d.extraction_status}</span>
              </Card>
            ))}
            {(documents || []).length === 0 && <p className="text-center text-muted-foreground py-8">No documents on file.</p>}
          </div>
        </TabsContent>

        {/* Meetings */}
        <TabsContent value="meetings">
          <div className="flex justify-end mb-4"><Button className="brand-gradient text-white" onClick={() => navigate(`/meetings?student=${id}`)}><Plus className="h-4 w-4 mr-1" /> Schedule meeting</Button></div>
          <div className="space-y-2">
            {(meetings || []).map((m) => (
              <Card key={m.id} className="p-4"><div className="flex justify-between"><div className="text-sm font-medium">{m.title}</div><span className="text-xs text-muted-foreground">{m.date}</span></div><div className="text-xs text-muted-foreground mt-0.5">{m.meeting_type} · {m.status}</div></Card>
            ))}
            {(meetings || []).length === 0 && <p className="text-center text-muted-foreground py-8">No meetings scheduled.</p>}
          </div>
        </TabsContent>

        <TabsContent value="modifications"><ModificationsPanel student={student} /></TabsContent>
        <TabsContent value="accommodations-log"><AccommodationLogPanel student={student} /></TabsContent>
        <TabsContent value="transition"><TransitionPanel student={student} /></TabsContent>
        <TabsContent value="evaluations"><EvaluationPanel student={student} /></TabsContent>
        <TabsContent value="evidence"><WorkEvidencePanel fixedStudentId={student.id} students={[student]} goals={goals||[]} /></TabsContent>
        <TabsContent value="timeline">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-lg">Student Timeline</h3><p className="text-sm text-slate-500 mt-1">A chronological view of documented sessions, progress data, work evidence, meetings, and uploaded records.</p></div></div>
            <div className="mt-5 space-y-3">{[
              ...(sessions||[]).map(x=>({date:x.date||'',type:'Session',title:x.activity||x.service_type||'Service session',detail:`${x.delivered_minutes??x.duration_minutes??'—'} min · ${x.status||'recorded'}`})),
              ...(progress||[]).map(x=>({date:x.date||'',type:'Progress',title:'Progress data',detail:x.percentage!=null?`${x.percentage}%${x.qualitative_notes?` · ${x.qualitative_notes}`:''}`:(x.qualitative_notes||'Data point recorded')})),
              ...(workEvidence||[]).map(x=>({date:x.date||'',type:'Evidence',title:x.title||'Work evidence',detail:x.score_possible>0?`${x.score_earned}/${x.score_possible} (${x.percentage}%)`:(x.qualitative_notes||'Evidence saved')})),
              ...(meetings||[]).map(x=>({date:x.date||'',type:'Meeting',title:x.title||x.meeting_type||'Meeting',detail:x.status||'scheduled'})),
              ...(documents||[]).map(x=>({date:x.date_uploaded||'',type:'Document',title:x.filename||x.document_type||'Document',detail:x.document_type||'Uploaded record'})),
            ].filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,100).map((x,i)=><div key={`${x.type}-${x.date}-${i}`} className="flex gap-3 rounded-2xl border bg-white p-4"><div className="w-24 shrink-0 text-xs font-bold text-slate-500">{x.date}</div><div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black">{x.type[0]}</div><div className="min-w-0"><div className="text-xs font-black uppercase tracking-wider text-blue-700">{x.type}</div><div className="font-semibold">{x.title}</div><div className="text-sm text-slate-500 mt-0.5">{x.detail}</div></div></div>)}{![...(sessions||[]),...(progress||[]),...(workEvidence||[]),...(meetings||[]),...(documents||[])].length&&<div className="text-sm text-slate-500 py-8 text-center">No timeline records yet.</div>}</div>
          </Card>
        </TabsContent>
        <TabsContent value="input"><InputRecordsPanel student={student}/></TabsContent>

        {/* CaseCue Proof */}
        <TabsContent value="proof">
          <div className="space-y-4">
            <Card className="p-6 border-sky-100 bg-gradient-to-br from-white to-sky-50/40">
              <div className="flex items-start gap-3"><div className="h-11 w-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center"><ShieldCheck className="h-5 w-5"/></div><div><h3 className="font-black text-lg">CaseCue Proof™</h3><p className="text-sm text-slate-600 mt-1">Trace this student’s goals and progress back to dated evidence already stored in CaseCue. Planned work is not counted as delivered evidence.</p></div></div>
              <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border bg-white p-4"><div className="text-2xl font-black">{(goals||[]).length}</div><div className="text-xs text-slate-500 mt-1">IEP goals</div></div>
                <div className="rounded-2xl border bg-white p-4"><div className="text-2xl font-black">{(progress||[]).length}</div><div className="text-xs text-slate-500 mt-1">Progress data points</div></div>
                <div className="rounded-2xl border bg-white p-4"><div className="text-2xl font-black">{(sessions||[]).filter(s=>['completed','partially_completed','makeup_session'].includes(s.status)).length}</div><div className="text-xs text-slate-500 mt-1">Delivered sessions</div></div>
                <div className="rounded-2xl border bg-white p-4"><div className="text-2xl font-black">{(documents||[]).length}</div><div className="text-xs text-slate-500 mt-1">Source documents</div></div>
              </div>
            </Card>
            <Card className={`p-5 ${dataQualityIssues.length ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/40'}`}>
              <div className="font-black">Evidence Conflict & Data Quality Check</div>
              <p className="text-sm text-slate-600 mt-1">CaseCue flags records that may need educator review; it never changes them automatically.</p>
              {dataQualityIssues.length ? <div className="mt-3 space-y-2">{dataQualityIssues.slice(0,10).map((x,i)=><div key={i} className="text-sm rounded-xl bg-white border border-amber-200 px-3 py-2">{x}</div>)}</div> : <div className="mt-3 text-sm font-semibold text-emerald-800">No obvious data-quality conflicts detected in the fields checked here.</div>}
            </Card>
            {(goals||[]).map(g=>{
              const pts=(progress||[]).filter(p=>p.goal_id===g.id);
              const ss=(sessions||[]).filter(s=>s.goal_id===g.id);
              const last=pts.length?pts[pts.length-1]:null;
              const forecast=forecastFor(g.id);
              return <Card key={g.id} className="p-5"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-wider text-blue-700">{g.goal_area||'IEP Goal'}</div><div className="font-semibold mt-1">{g.goal_text}</div></div><div className="flex gap-2 text-xs"><span className="rounded-full bg-blue-50 text-blue-800 px-3 py-1.5 font-semibold">{pts.length} data points</span><span className="rounded-full bg-emerald-50 text-emerald-800 px-3 py-1.5 font-semibold">{ss.length} sessions</span></div></div><div className="mt-4 grid md:grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">Latest measured evidence</div>{last?<div className="mt-1"><div className="text-xl font-black">{last.percentage!=null?`${last.percentage}%`:`${last.correct||0}/${last.total||0}`}</div><div className="text-xs text-slate-500 mt-1">{last.date} · {last.observation_notes||last.qualitative_notes||'No narrative note recorded'}</div></div>:<div className="text-sm text-slate-500 mt-2">No progress measurement linked yet.</div>}</div><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">Recent service evidence</div>{ss.length?<div className="mt-2 space-y-1">{ss.slice(0,3).map(s=><div key={s.id} className="text-sm flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-blue-600"/><span>{s.date} · {s.delivered_minutes??s.duration_minutes??'—'} min · {s.activity||s.service_type}</span></div>)}</div>:<div className="text-sm text-slate-500 mt-2">No session records linked to this goal.</div>}</div><div className={`rounded-xl p-4 ${forecast.tone==='emerald'?'bg-emerald-50':forecast.tone==='rose'?'bg-rose-50':forecast.tone==='amber'?'bg-amber-50':'bg-slate-50'}`}><div className="text-xs font-bold text-slate-500">Goal Forecast™</div><div className="font-black mt-1">{forecast.label}</div><div className="text-xs text-slate-600 mt-1">{forecast.detail}</div><div className="text-[10px] text-slate-400 mt-2">Trend estimate only; educator review required.</div></div></div></Card>
            })}
            {(goals||[]).length===0&&<Card className="p-8 text-center text-sm text-slate-500">Add or extract goals before CaseCue Proof can build a goal-level evidence trail.</Card>}
          </div>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card className="p-6">
            <Textarea rows={4} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a quick note…" />
            <Button onClick={saveNote} className="brand-gradient text-white mt-3">Add note</Button>
            <div className="mt-6 whitespace-pre-wrap text-sm">{student.notes || "No notes yet."}</div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete {student.first_name} {student.last_name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the student record from your caseload. Review connected documentation first if you need to preserve historical records.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deletingStudent} onClick={deleteStudent}>{deletingStudent ? "Deleting…" : "Delete student"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
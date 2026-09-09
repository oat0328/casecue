import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users, Plus, Trash2, Target, BarChart3, FolderOpen, UsersRound, StickyNote, Save, Sparkles, Loader2, Download } from "lucide-react";
import { exportIepPdf } from "@/lib/pdfExport";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import GoalBankPicker from "@/components/goalBank/GoalBankPicker";
import GoalBoard from "@/components/students/GoalBoard";
import { Library } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

const colorMap = {
  violet: "bg-violet-100 text-violet-700", blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700", cyan: "bg-cyan-100 text-cyan-700",
};

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: student, setData: setStudent, refetch } = useAsync(() => base44.entities.Student.get(id), [id]);
  const { data: goals, refetch: refetchGoals } = useAsync(() => base44.entities.Goal.filter({ student_id: id }, '-updated_date', 100), [id]);
  const { data: progress, refetch: refetchProgress } = useAsync(() => base44.entities.ProgressData.filter({ student_id: id }, 'date', 100), [id]);
  const { data: documents, refetch: refetchDocs } = useAsync(() => base44.entities.Document.filter({ student_id: id }, '-date_uploaded', 100), [id]);
  const { data: meetings, refetch: refetchMeetings } = useAsync(() => base44.entities.Meeting.filter({ student_id: id }, 'date', 100), [id]);

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

  if (!student) return <div className="text-center py-20 text-muted-foreground">Loading student…</div>;

  const startEdit = () => { setDraft({ ...student }); setEditing(true); };
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

  const Field = ({ label, value, name }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? <Input value={draft[name]} onChange={(e) => setDraft({ ...draft, [name]: e.target.value })} /> : <div className="mt-0.5 text-sm font-medium">{value || "—"}</div>}
    </div>
  );

  return (
    <div>
      <button onClick={() => navigate("/students")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${colorMap[student.avatar_color] || colorMap.violet}`}>
          {student.first_name?.[0]}{student.last_name?.[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{student.first_name} {student.last_name}</h1>
          <p className="text-muted-foreground">Grade {student.grade || "—"} · {student.eligibility_category || "No eligibility on file"}</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={savingProfile} className="brand-gradient text-white"><Save className="h-4 w-4 mr-1" /> {savingProfile ? "Saving…" : "Save"}</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportIepPdf(student, goals || [])}><Download className="h-4 w-4 mr-1" /> Export IEP (PDF)</Button>
            <Button variant="outline" onClick={startEdit}>Edit profile</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto mb-6 flex-wrap h-auto">
          <TabsTrigger value="overview"><Users className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="goals"><Target className="h-4 w-4 mr-1.5" /> Goals</TabsTrigger>
          <TabsTrigger value="progress"><BarChart3 className="h-4 w-4 mr-1.5" /> Progress</TabsTrigger>
          <TabsTrigger value="documents"><FolderOpen className="h-4 w-4 mr-1.5" /> Documents</TabsTrigger>
          <TabsTrigger value="meetings"><UsersRound className="h-4 w-4 mr-1.5" /> Meetings</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger>
        </TabsList>

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
          <div className="flex justify-end mb-4"><Button className="brand-gradient text-white" onClick={() => navigate("/documents")}><Plus className="h-4 w-4 mr-1" /> Upload document</Button></div>
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
          <div className="flex justify-end mb-4"><Button className="brand-gradient text-white" onClick={() => navigate("/meetings")}><Plus className="h-4 w-4 mr-1" /> Schedule meeting</Button></div>
          <div className="space-y-2">
            {(meetings || []).map((m) => (
              <Card key={m.id} className="p-4"><div className="flex justify-between"><div className="text-sm font-medium">{m.title}</div><span className="text-xs text-muted-foreground">{m.date}</span></div><div className="text-xs text-muted-foreground mt-0.5">{m.meeting_type} · {m.status}</div></Card>
            ))}
            {(meetings || []).length === 0 && <p className="text-center text-muted-foreground py-8">No meetings scheduled.</p>}
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
    </div>
  );
}
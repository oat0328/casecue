import React, { useMemo, useState } from "react";
import { BarChart3, Plus, AlertCircle, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import StudentSelector from "@/components/forms/StudentSelector";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

export default function DataCenter() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 300), []);
  const { data: progress, refetch } = useAsync(() => base44.entities.ProgressData.list('-date', 500), []);

  const [form, setForm] = useState({ student_id: "", goal_id: "", date: new Date().toISOString().slice(0,10), correct: "", total: "", prompting_level: "independent", observation_notes: "" });
  const [saving, setSaving] = useState(false);

  const goalsForStudent = (goals || []).filter((g) => g.student_id === form.student_id);
  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : "—"; };

  const needingData = useMemo(() => {
    const s = students || [];
    const recent = new Set((progress || []).filter((p) => { const d = new Date(p.date); const days = (Date.now() - d) / 86400000; return days <= 14; }).map((p) => p.student_id));
    return s.filter((st) => !recent.has(st.id));
  }, [students, progress]);

  const submit = async () => {
    if (!form.student_id || !form.date) { toast({ title: "Student and date required", variant: "destructive" }); return; }
    const correct = parseFloat(form.correct) || 0, total = parseFloat(form.total) || 0;
    const percentage = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    const decimal = total > 0 ? Math.round((correct / total) * 100) / 100 : 0;
    setSaving(true);
    try {
      await base44.entities.ProgressData.create({ ...form, correct, total, percentage, decimal });
      setForm({ student_id: "", goal_id: "", date: new Date().toISOString().slice(0,10), correct: "", total: "", prompting_level: "independent", observation_notes: "" });
      refetch(); toast({ title: "Progress data logged" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const chartFor = (sid) => (progress || []).filter((p) => p.student_id === sid).map((p) => ({ date: p.date, percentage: p.percentage || 0 }));

  return (
    <div>
      <PageHeader title="Data Center" subtitle="Track progress monitoring across your caseload. Correct/total, percentages, decimals, prompting levels, and observation notes." icon={BarChart3} />

      {/* Needing data */}
      <Card className="p-6 mb-6 border-amber-200 bg-amber-50/40">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertCircle className="h-4 w-4 text-amber-600" /> Students still needing progress data this week</h3>
        {needingData.length === 0 ? <p className="text-sm text-muted-foreground">All students have recent progress data. Great work.</p> : (
          <div className="flex flex-wrap gap-2">
            {needingData.map((s) => <span key={s.id} className="text-sm rounded-full bg-white border border-amber-200 px-3 py-1.5">{s.first_name} {s.last_name}</span>)}
          </div>
        )}
      </Card>

      {/* Log form */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Log progress data</h3>
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-5">
          <div>
            <StudentSelector
              students={students || []}
              value={form.student_id}
              onChange={(id) => setForm({ ...form, student_id: id, goal_id: "" })}
              placeholder="Select…"
              noBottomSpace
            />
          </div>
          <div><Label>Goal</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}>
              <option value="">—</option>
              {goalsForStudent.map((g) => <option key={g.id} value={g.id}>{g.goal_area || "Goal"}</option>)}
            </select>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" /></div>
          <div><Label>Prompting</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.prompting_level} onChange={(e) => setForm({ ...form, prompting_level: e.target.value })}>
              {["independent","verbal","visual","physical","full"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><Label>Correct</Label><Input type="number" value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} className="mt-1" /></div>
          <div><Label>Total</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2 lg:col-span-4"><Label>Observation notes</Label><Input value={form.observation_notes} onChange={(e) => setForm({ ...form, observation_notes: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          Preview: {form.total > 0 ? `${form.correct || 0}/${form.total} = ${Math.round((parseFloat(form.correct||0)/parseFloat(form.total))*1000)/10}% = ${(Math.round((parseFloat(form.correct||0)/parseFloat(form.total))*100)/100)}` : "Enter correct and total"}
        </div>
        <Button onClick={submit} disabled={saving} className="brand-gradient text-white mt-6"><Plus className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Log data"}</Button>
      </Card>

      {/* Trends per student */}
      <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Progress trends</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {(students || []).map((s) => {
          const data = chartFor(s.id);
          if (data.length < 2) return null;
          return (
            <Card key={s.id} className="p-5">
              <div className="font-medium mb-3">{s.first_name} {s.last_name}</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={10} /><YAxis domain={[0,100]} fontSize={10} /><Tooltip /><Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} /></LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })}
        {(students || []).every((s) => chartFor(s.id).length < 2) && <p className="text-muted-foreground text-sm">Log at least two data points per student to see trends.</p>}
      </div>
    </div>
  );
}
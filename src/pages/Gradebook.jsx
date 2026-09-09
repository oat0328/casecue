import React, { useState } from "react";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function Gradebook() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 300), []);
  const { data: assignments, refetch } = useAsync(() => base44.entities.GradebookAssignment.list('-date', 200), []);
  const [form, setForm] = useState({ student_id: "", goal_id: "", title: "", score_earned: "", score_possible: "", notes: "", date: new Date().toISOString().slice(0,10) });
  const [saving, setSaving] = useState(false);

  const goalsForStudent = (goals || []).filter((g) => g.student_id === form.student_id);
  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : "—"; };

  const add = async () => {
    if (!form.student_id || !form.title) { toast({ title: "Student and title required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.GradebookAssignment.create({ ...form, score_earned: parseFloat(form.score_earned) || 0, score_possible: parseFloat(form.score_possible) || 0 });
      setForm({ student_id: "", goal_id: "", title: "", score_earned: "", score_possible: "", notes: "", date: new Date().toISOString().slice(0,10) });
      refetch(); toast({ title: "Assignment added" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => { await base44.entities.GradebookAssignment.delete(id); refetch(); };
  const pct = (a) => a.score_possible > 0 ? Math.round((a.score_earned / a.score_possible) * 1000) / 10 : 0;

  return (
    <div>
      <PageHeader title="Gradebook" subtitle="Add assignments, enter scores, and link them to student goals. Percentages calculate automatically." icon={GraduationCap} />

      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add assignment</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><Label>Student</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value, goal_id: "" })}>
              <option value="">Select…</option>
              {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div><Label>Link to goal</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}>
              <option value="">—</option>
              {goalsForStudent.map((g) => <option key={g.id} value={g.id}>{g.goal_area || "Goal"}</option>)}
            </select>
          </div>
          <div><Label>Assignment title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
          <div><Label>Score earned</Label><Input type="number" value={form.score_earned} onChange={(e) => setForm({ ...form, score_earned: e.target.value })} className="mt-1" /></div>
          <div><Label>Score possible</Label><Input type="number" value={form.score_possible} onChange={(e) => setForm({ ...form, score_possible: e.target.value })} className="mt-1" /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">Preview: {form.score_possible > 0 ? `${form.score_earned || 0}/${form.score_possible} = ${pct(form)}%` : "Enter scores"}</div>
        <Button onClick={add} disabled={saving} className="brand-gradient text-white mt-3"><Plus className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Add assignment"}</Button>
      </Card>

      <div className="space-y-2">
        {(assignments || []).map((a) => (
          <Card key={a.id} className="p-4 flex items-center gap-4 group">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{a.title}</div>
              <div className="text-xs text-muted-foreground">{studentName(a.student_id)} · {a.date}{a.notes ? ` · ${a.notes}` : ""}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{a.score_earned}/{a.score_possible}</div>
              <div className="text-sm text-primary font-medium">{pct(a)}%</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
          </Card>
        ))}
        {(assignments || []).length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No assignments yet.</p>}
      </div>
    </div>
  );
}
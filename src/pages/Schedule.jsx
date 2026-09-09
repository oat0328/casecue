import React, { useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Schedule() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: entries, refetch } = useAsync(() => base44.entities.ScheduleEntry.list('-day', 100), []);
  const [form, setForm] = useState({ group_name: "", delivery: "pull-out", day: "Monday", start_time: "", end_time: "", teacher_classroom: "", service_minutes: "", student_ids: [], notes: "" });
  const [saving, setSaving] = useState(false);

  const toggleStudent = (id) => setForm((prev) => ({ ...prev, student_ids: prev.student_ids.includes(id) ? prev.student_ids.filter((x) => x !== id) : [...prev.student_ids, id] }));

  const add = async () => {
    if (!form.group_name) { toast({ title: "Group name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.ScheduleEntry.create({ ...form, service_minutes: parseFloat(form.service_minutes) || 0 });
      setForm({ group_name: "", delivery: "pull-out", day: "Monday", start_time: "", end_time: "", teacher_classroom: "", service_minutes: "", student_ids: [], notes: "" });
      refetch(); toast({ title: "Schedule entry added" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => { await base44.entities.ScheduleEntry.delete(id); refetch(); };
  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : ""; };

  return (
    <div>
      <PageHeader title="Instruction & Schedule" subtitle="Plan student groups, pull-out and push-in times, service minutes, and your weekly schedule." icon={CalendarClock} />

      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add schedule entry</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><Label>Group name</Label><Input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} className="mt-1" /></div>
          <div><Label>Delivery</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })}>
              {["pull-out", "push-in", "consultation"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><Label>Day</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="mt-1" /></div>
          <div><Label>End time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="mt-1" /></div>
          <div><Label>Service minutes</Label><Input type="number" value={form.service_minutes} onChange={(e) => setForm({ ...form, service_minutes: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Label>Teacher / classroom</Label><Input value={form.teacher_classroom} onChange={(e) => setForm({ ...form, teacher_classroom: e.target.value })} className="mt-1" /></div>
        </div>
        <Label className="font-semibold mt-4 block">Students in group</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(students || []).map((s) => (
            <button key={s.id} onClick={() => toggleStudent(s.id)} className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${form.student_ids.includes(s.id) ? "brand-gradient text-white border-transparent" : "bg-card border-border hover:border-primary/30"}`}>
              {s.first_name} {s.last_name}
            </button>
          ))}
        </div>
        <Button onClick={add} disabled={saving} className="brand-gradient text-white mt-4"><Plus className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Add entry"}</Button>
      </Card>

      <div className="grid lg:grid-cols-5 gap-4">
        {DAYS.map((day) => (
          <Card key={day} className="p-4">
            <h3 className="font-semibold text-sm mb-3 text-primary">{day}</h3>
            <div className="space-y-2">
              {(entries || []).filter((e) => e.day === day).map((e) => (
                <div key={e.id} className="rounded-lg border border-border p-3 group relative">
                  <button onClick={() => remove(e.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-rose-500" /></button>
                  <div className="font-medium text-sm pr-5">{e.group_name}</div>
                  <div className="text-xs text-muted-foreground">{e.start_time}–{e.end_time} · {e.delivery}</div>
                  <div className="text-xs text-muted-foreground">{e.service_minutes} min · {e.teacher_classroom || "—"}</div>
                  {e.student_ids?.length > 0 && <div className="text-xs text-muted-foreground mt-1">{e.student_ids.map(studentName).join(", ")}</div>}
                </div>
              ))}
              {(entries || []).filter((e) => e.day === day).length === 0 && <p className="text-xs text-muted-foreground">No sessions</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
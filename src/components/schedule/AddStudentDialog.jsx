import React, { useState } from "react";
import { Plus, Sparkles, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { DAYS, DELIVERY_LABEL, byGroup, durationMinutes } from "@/lib/scheduleUtils";

const CONF_STYLE = { high: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", low: "bg-orange-100 text-orange-700" };

// New Student Workflow: add a student to the schedule — pick an existing group
// or create one, or ask AI for a placement recommendation. Teacher stays in control.
export default function AddStudentDialog({ open, onOpenChange, students, entries, onSaved, workspaceKey='sped' }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ student_id: "", group_mode: "existing", group_name: "", new_group_name: "", delivery: "pull-out", days: ["Monday"], start_time: "", end_time: "", service_minutes: "", teacher_classroom: "" });
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleDay = (d) => setForm((p) => ({ ...p, days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d] }));
  const groupNames = byGroup(entries).map((g) => g.name);

  const recommend = async () => {
    if (!form.student_id) { toast({ title: "Select a student first", variant: "destructive" }); return; }
    setLoadingRecs(true);
    setRecs(null);
    try {
      const res = await base44.functions.invoke("scheduleAi", { mode: "recommend", student_id: form.student_id });
      setRecs(res.data.recommendations || []);
    } catch (e) {
      toast({ title: "Could not get recommendations", description: e.message, variant: "destructive" });
    } finally {
      setLoadingRecs(false);
    }
  };

  const applyRec = (r) => {
    const existing = groupNames.includes(r.group_name);
    setForm((p) => ({
      ...p,
      group_mode: existing ? "existing" : "new",
      group_name: existing ? r.group_name : p.group_name,
      new_group_name: existing ? p.new_group_name : r.group_name,
      delivery: ["pull-out", "push-in", "consultation"].includes(r.delivery) ? r.delivery : p.delivery,
      days: DAYS.includes(r.day) ? [r.day] : p.days,
      start_time: r.start_time || p.start_time,
      end_time: r.end_time || p.end_time,
      service_minutes: r.service_minutes ? String(r.service_minutes) : p.service_minutes,
    }));
  };

  const save = async () => {
    if (!form.student_id) { toast({ title: "Select a student", variant: "destructive" }); return; }
    const groupName = form.group_mode === "existing" ? form.group_name : form.new_group_name;
    if (!groupName) { toast({ title: "Choose a group", variant: "destructive" }); return; }
    if (!form.days.length) { toast({ title: "Pick at least one day", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const minutes = parseFloat(form.service_minutes) || durationMinutes(form.start_time, form.end_time) || 0;
      await base44.entities.ScheduleEntry.bulkCreate(
        form.days.map((day) => ({
          group_name: groupName,
          delivery: form.delivery,
          day,
          start_time: form.start_time,
          end_time: form.end_time,
          service_minutes: minutes,
          teacher_classroom: form.teacher_classroom,
          student_ids: [form.student_id],
          workspace: workspaceKey,
        }))
      );
      toast({ title: "Student added to schedule" });
      setRecs(null);
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Student to Schedule</DialogTitle>
          <DialogDescription>Place a student into a group — or let CaseCue recommend one.</DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label>Student</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.student_id} onChange={(e) => set("student_id", e.target.value)}>
              <option value="">Select student…</option>
              {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Button variant="outline" size="sm" onClick={recommend} disabled={loadingRecs}>
              {loadingRecs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />} Recommend Group
            </Button>
            {recs && (
              <div className="mt-2 space-y-2">
                {recs.length === 0 && <p className="text-sm text-muted-foreground">No recommendations — not enough schedule data yet.</p>}
                {recs.map((r, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {r.group_name} {r.is_new_group && <span className="text-[10px] font-semibold rounded-full bg-primary/10 text-primary px-2 py-0.5">NEW GROUP</span>}
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${CONF_STYLE[r.confidence] || CONF_STYLE.low}`}>{r.confidence} confidence</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.day} · {r.start_time || "?"}–{r.end_time || "?"} · {DELIVERY_LABEL[r.delivery] || r.delivery} · {r.service_minutes || 0} min</div>
                        <p className="text-xs text-muted-foreground mt-1">{r.reasoning}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => applyRec(r)}><Check className="h-3.5 w-3.5" /> Use</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div><Label>Group</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.group_mode} onChange={(e) => set("group_mode", e.target.value)}>
              <option value="existing">Existing group</option>
              <option value="new">New group</option>
            </select>
          </div>
          <div>
            {form.group_mode === "existing" ? (
              <><Label>Pick group</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.group_name} onChange={(e) => set("group_name", e.target.value)}>
                  <option value="">Select group…</option>
                  {groupNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select></>
            ) : (
              <><Label>New group name</Label>
                <Input className="mt-1" value={form.new_group_name || ""} onChange={(e) => set("new_group_name", e.target.value)} placeholder="e.g. Math Group B" /></>
            )}
          </div>
          <div><Label>Delivery</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.delivery} onChange={(e) => set("delivery", e.target.value)}>
              {Object.entries(DELIVERY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><Label>Service minutes (per session)</Label><Input type="number" value={form.service_minutes} onChange={(e) => set("service_minutes", e.target.value)} className="mt-1" /></div>
          <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="mt-1" /></div>
          <div><Label>End time</Label><Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label>Teacher / location</Label><Input value={form.teacher_classroom} onChange={(e) => set("teacher_classroom", e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label className="font-semibold">Days</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS.map((d) => (
                <button key={d} onClick={() => toggleDay(d)} className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${form.days.includes(d) ? "brand-gradient text-white border-transparent" : "bg-card border-border hover:border-primary/30"}`}>{d}</button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="brand-gradient text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add to schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
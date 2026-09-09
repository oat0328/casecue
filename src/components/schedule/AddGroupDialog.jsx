import React, { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { DAYS, DELIVERY_LABEL, durationMinutes } from "@/lib/scheduleUtils";

const EMPTY = { group_name: "", delivery: "pull-out", days: ["Monday"], start_time: "", end_time: "", service_minutes: "", teacher_classroom: "", notes: "", student_ids: [] };

// Add Group Manually: one form, multiple days — creates one entry per day.
export default function AddGroupDialog({ open, onOpenChange, students, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleStudent = (id) =>
    setForm((p) => ({ ...p, student_ids: p.student_ids.includes(id) ? p.student_ids.filter((x) => x !== id) : [...p.student_ids, id] }));
  const toggleDay = (d) =>
    setForm((p) => ({ ...p, days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d] }));

  const save = async () => {
    if (!form.group_name) { toast({ title: "Group name required", variant: "destructive" }); return; }
    if (!form.days.length) { toast({ title: "Pick at least one day", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const minutes = parseFloat(form.service_minutes) || durationMinutes(form.start_time, form.end_time) || 0;
      await base44.entities.ScheduleEntry.bulkCreate(
        form.days.map((day) => ({
          group_name: form.group_name,
          delivery: form.delivery,
          day,
          start_time: form.start_time,
          end_time: form.end_time,
          service_minutes: minutes,
          teacher_classroom: form.teacher_classroom,
          notes: form.notes,
          student_ids: form.student_ids,
        }))
      );
      toast({ title: "Group added", description: `${form.group_name} scheduled for ${form.days.length} day(s).` });
      setForm(EMPTY);
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
          <DialogTitle>Add Group Manually</DialogTitle>
          <DialogDescription>Create a group and schedule it for one or more days.</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Group name</Label><Input value={form.group_name} onChange={(e) => set("group_name", e.target.value)} className="mt-1" placeholder="e.g. Reading Group A" /></div>
          <div><Label>Delivery</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.delivery} onChange={(e) => set("delivery", e.target.value)}>
              {Object.entries(DELIVERY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="mt-1" /></div>
          <div><Label>End time</Label><Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="mt-1" /></div>
          <div><Label>Service minutes (per session)</Label><Input type="number" value={form.service_minutes} onChange={(e) => set("service_minutes", e.target.value)} className="mt-1" placeholder="Auto from times if blank" /></div>
          <div><Label>Teacher / location</Label><Input value={form.teacher_classroom} onChange={(e) => set("teacher_classroom", e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label className="font-semibold">Days</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS.map((d) => (
                <button key={d} onClick={() => toggleDay(d)} className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${form.days.includes(d) ? "brand-gradient text-white border-transparent" : "bg-card border-border hover:border-primary/30"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2"><Label className="font-semibold">Students in group</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(students || []).map((s) => (
                <button key={s.id} onClick={() => toggleStudent(s.id)} className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${form.student_ids.includes(s.id) ? "brand-gradient text-white border-transparent" : "bg-card border-border hover:border-primary/30"}`}>
                  {s.first_name} {s.last_name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="brand-gradient text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
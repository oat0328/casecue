import React, { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { DAYS, DELIVERY_LABEL } from "@/lib/scheduleUtils";

// Edit a single schedule entry (group block): name, time, minutes, students.
export default function EditEntryDialog({ entry, students, onClose, onSaved, entityName='ScheduleEntry' }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => ({
    group_name: entry?.group_name || "",
    delivery: entry?.delivery || "pull-out",
    day: entry?.day || "Monday",
    start_time: entry?.start_time || "",
    end_time: entry?.end_time || "",
    service_minutes: entry?.service_minutes != null ? String(entry.service_minutes) : "",
    teacher_classroom: entry?.teacher_classroom || "",
    notes: entry?.notes || "",
    student_ids: entry?.student_ids || [],
  }));
  const [saving, setSaving] = useState(false);

  if (!entry) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleStudent = (id) =>
    setForm((p) => ({ ...p, student_ids: p.student_ids.includes(id) ? p.student_ids.filter((x) => x !== id) : [...p.student_ids, id] }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities[entityName].update(entry.id, { ...form, service_minutes: parseFloat(form.service_minutes) || 0 });
      toast({ title: "Schedule entry updated" });
      onSaved?.();
      onClose();
    } catch (e) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Schedule Entry</DialogTitle>
          <DialogDescription>{entry.day} · {entry.start_time || "?"}–{entry.end_time || "?"}</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Group name</Label><Input value={form.group_name} onChange={(e) => set("group_name", e.target.value)} className="mt-1" /></div>
          <div><Label>Delivery</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.delivery} onChange={(e) => set("delivery", e.target.value)}>
              {Object.entries(DELIVERY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><Label>Day</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.day} onChange={(e) => set("day", e.target.value)}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><Label>Service minutes</Label><Input type="number" value={form.service_minutes} onChange={(e) => set("service_minutes", e.target.value)} className="mt-1" /></div>
          <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="mt-1" /></div>
          <div><Label>End time</Label><Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label>Teacher / classroom</Label><Input value={form.teacher_classroom} onChange={(e) => set("teacher_classroom", e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label className="font-semibold">Students</Label>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="brand-gradient text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
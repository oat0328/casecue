import React, { useMemo, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// Manage a group's roster: add or remove students across every schedule block
// of the group. Minutes and rosters recalculate automatically after saving.
export default function GroupStudentsDialog({ group, entries, students, onClose, onDone }) {
  const { toast } = useToast();
  const groupEntries = useMemo(() => (entries || []).filter((e) => e.group_name === group), [entries, group]);
  const [selected, setSelected] = useState(() => [...new Set(groupEntries.flatMap((e) => e.student_ids || []))]);
  const [saving, setSaving] = useState(false);

  if (!group) return null;

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.ScheduleEntry.bulkUpdate(groupEntries.map((e) => ({ id: e.id, student_ids: selected })));
      toast({ title: "Group roster updated", description: `${group}: ${selected.length} student(s).` });
      onDone?.();
      onClose();
    } catch (e) {
      toast({ title: "Failed to update roster", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Students — {group}</DialogTitle>
          <DialogDescription>Applies to all {groupEntries.length} schedule block(s) of this group.</DialogDescription>
        </DialogHeader>
        <Label className="font-semibold flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" /> Students in group ({selected.length})
        </Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {(students || []).map((s) => (
            <button key={s.id} onClick={() => toggle(s.id)} className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${selected.includes(s.id) ? "brand-gradient text-white border-transparent" : "bg-card border-border hover:border-primary/30"}`}>
              {s.first_name} {s.last_name}
            </button>
          ))}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="brand-gradient text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Save roster
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
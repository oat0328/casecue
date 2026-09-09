import React, { useMemo, useState } from "react";
import { Users, GitMerge, Scissors, Copy, Pencil, Archive, ArchiveRestore, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { studentName } from "@/lib/scheduleUtils";

// Group management actions: Rename, Duplicate, Merge, Split, Archive/Restore.
// Every action keeps the teacher in control and only touches the named group.
export default function GroupActionDialog({ action, entries, groupNames, students, onClose, onDone }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState(action?.mode === "duplicate" ? `${action.group} (Copy)` : "");
  const [mergeTarget, setMergeTarget] = useState("");
  const [splitStudents, setSplitStudents] = useState([]);

  const group = action?.group;
  const mode = action?.mode;
  const groupEntries = useMemo(() => (entries || []).filter((e) => e.group_name === group), [entries, group]);
  const groupStudentIds = useMemo(() => [...new Set(groupEntries.flatMap((e) => e.student_ids || []))], [groupEntries]);
  const isArchived = groupEntries.some((e) => e.archived);
  if (!group) return null;

  const otherNames = (groupNames || []).filter((n) => n !== group);

  const refresh = () => { onDone?.(); onClose(); };

  const run = async (fn, successTitle) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: successTitle });
      refresh();
    } catch (e) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const rename = () => {
    if (!newName.trim()) { toast({ title: "Enter a new name", variant: "destructive" }); return; }
    run(async () => {
      await base44.entities.ScheduleEntry.updateMany({ group_name: group }, { $set: { group_name: newName.trim() } });
    }, `Renamed to ${newName.trim()}`);
  };

  const duplicate = () => {
    if (!newName.trim()) { toast({ title: "Enter a name for the copy", variant: "destructive" }); return; }
    run(async () => {
      await base44.entities.ScheduleEntry.bulkCreate(
        groupEntries.map((e) => ({
          group_name: newName.trim(),
          delivery: e.delivery,
          day: e.day,
          start_time: e.start_time,
          end_time: e.end_time,
          service_minutes: e.service_minutes,
          teacher_classroom: e.teacher_classroom,
          notes: e.notes,
          student_ids: e.student_ids || [],
        }))
      );
    }, `Duplicated as ${newName.trim()}`);
  };

  const merge = () => {
    if (!mergeTarget) { toast({ title: "Pick a group to merge into", variant: "destructive" }); return; }
    run(async () => {
      const sourceStudents = [...new Set(groupEntries.flatMap((e) => e.student_ids || []))];
      const targetEntries = (entries || []).filter((e) => e.group_name === mergeTarget);
      await base44.entities.ScheduleEntry.bulkUpdate(
        targetEntries.map((e) => ({
          id: e.id,
          student_ids: [...new Set([...(e.student_ids || []), ...sourceStudents])],
        }))
      );
      await base44.entities.ScheduleEntry.updateMany({ group_name: group }, { $set: { archived: true } });
    }, `Merged ${group} into ${mergeTarget}`);
  };

  const split = () => {
    if (!newName.trim()) { toast({ title: "Enter a name for the new group", variant: "destructive" }); return; }
    if (!splitStudents.length) { toast({ title: "Select at least one student to split out", variant: "destructive" }); return; }
    run(async () => {
      await base44.entities.ScheduleEntry.bulkCreate(
        groupEntries.map((e) => ({
          group_name: newName.trim(),
          delivery: e.delivery,
          day: e.day,
          start_time: e.start_time,
          end_time: e.end_time,
          service_minutes: e.service_minutes,
          teacher_classroom: e.teacher_classroom,
          notes: e.notes,
          student_ids: splitStudents,
        }))
      );
      await base44.entities.ScheduleEntry.bulkUpdate(
        groupEntries.map((e) => ({ id: e.id, student_ids: (e.student_ids || []).filter((id) => !splitStudents.includes(id)) }))
      );
    }, `Split ${splitStudents.length} student(s) into ${newName.trim()}`);
  };

  const archive = () =>
    run(async () => {
      await base44.entities.ScheduleEntry.updateMany({ group_name: group }, { $set: { archived: !isArchived } });
    }, isArchived ? `${group} restored` : `${group} archived`);

  const toggleSplit = (id) =>
    setSplitStudents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const titles = { rename: "Rename Group", duplicate: "Duplicate Group", merge: "Merge Groups", split: "Split Group", archive: isArchived ? "Restore Group" : "Archive Group" };
  const descs = {
    rename: "Renames every schedule entry for this group.",
    duplicate: "Creates a copy of this group with the same days, times, and students.",
    merge: `All students and rosters from "${group}" move into the group you pick. "${group}" is then archived.`,
    split: "Move selected students into a brand-new group that copies this group's schedule.",
    archive: isArchived ? "Bring this group back into your active schedule." : "Hide this group from the schedule, minutes, and substitute packets.",
  };

  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>{descs[mode]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(mode === "rename" || mode === "duplicate" || mode === "split") && (
            <div><Label>{mode === "split" ? "New group name" : "Name"}</Label>
              <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Math Group B" />
            </div>
          )}

          {mode === "merge" && (
            <div><Label>Merge "{group}" into…</Label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                <option value="">Pick a group…</option>
                {otherNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}

          {mode === "split" && (
            <div>
              <Label className="font-semibold">Students to move ({groupStudentIds.length} in group)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {groupStudentIds.map((id) => (
                  <button key={id} onClick={() => toggleSplit(id)} className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${splitStudents.includes(id) ? "brand-gradient text-white border-transparent" : "bg-card border-border hover:border-primary/30"}`}>
                    {splitStudents.includes(id) && <Check className="h-3 w-3 inline mr-1" />}
                    {studentName(students, id)}
                  </button>
                ))}
                {groupStudentIds.length === 0 && <p className="text-sm text-muted-foreground">This group has no students.</p>}
              </div>
            </div>
          )}

          {mode === "archive" && (
            <p className="text-sm text-muted-foreground">
              {groupStudentIds.length} student(s) · {groupEntries.length} schedule block(s). You can restore it anytime from this same menu.
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={{ rename, duplicate, merge, split, archive }[mode]} disabled={busy} className="brand-gradient text-white">
            {mode === "archive" ? (isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />) :
             mode === "merge" ? <GitMerge className="h-4 w-4" /> :
             mode === "split" ? <Scissors className="h-4 w-4" /> :
             mode === "duplicate" ? <Copy className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {busy ? "Working…" : titles[mode]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
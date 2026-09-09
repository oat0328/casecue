import React, { useMemo, useState } from "react";
import { Users, Pencil, GitMerge, Scissors, Copy, Archive, ArchiveRestore, X, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { byGroup, studentName, DELIVERY_LABEL } from "@/lib/scheduleUtils";
import GroupActionDialog from "./GroupActionDialog";
import GroupStudentsDialog from "./GroupStudentsDialog";

// Groups tab: full manual group management. Drag a student chip onto another
// group to move them; every group has rename/duplicate/merge/split/archive.
export default function GroupsTab({ entries, students, onRefresh }) {
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [manageGroup, setManageGroup] = useState(null);
  const [action, setAction] = useState(null);
  const [dragging, setDragging] = useState(null);

  const groups = useMemo(() => byGroup(entries, { includeArchived: showArchived }), [entries, showArchived]);
  const groupNames = useMemo(() => byGroup(entries).map((g) => g.name), [entries]);

  const moveStudent = async (studentId, from, to) => {
    if (from === to) return;
    try {
      const fromEntries = (entries || []).filter((e) => e.group_name === from && (e.student_ids || []).includes(studentId));
      const toEntries = (entries || []).filter((e) => e.group_name === to);
      if (fromEntries.length) {
        await base44.entities.ScheduleEntry.bulkUpdate(
          fromEntries.map((e) => ({ id: e.id, student_ids: (e.student_ids || []).filter((x) => x !== studentId) }))
        );
      }
      if (toEntries.length) {
        await base44.entities.ScheduleEntry.bulkUpdate(
          toEntries.map((e) => ({ id: e.id, student_ids: [...new Set([...(e.student_ids || []), studentId])] }))
        );
      }
      toast({ title: "Student moved", description: `${studentName(students, studentId)} → ${to}` });
      onRefresh();
    } catch (e) {
      toast({ title: "Move failed", description: e.message, variant: "destructive" });
    }
  };

  const removeStudent = async (studentId, from) => {
    try {
      const fromEntries = (entries || []).filter((e) => e.group_name === from && (e.student_ids || []).includes(studentId));
      if (!fromEntries.length) return;
      await base44.entities.ScheduleEntry.bulkUpdate(
        fromEntries.map((e) => ({ id: e.id, student_ids: (e.student_ids || []).filter((x) => x !== studentId) }))
      );
      toast({ title: "Removed from group", description: `${studentName(students, studentId)} removed from ${from}.` });
      onRefresh();
    } catch (e) {
      toast({ title: "Remove failed", description: e.message, variant: "destructive" });
    }
  };

  const iconBtn = (Icon, label, onClick, restore) => (
    <button onClick={onClick} title={label} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          Groups automatically drive <Link to="/lesson-studio" className="text-primary underline-offset-2 hover:underline">Lesson Studio</Link>, the{" "}
          <Link to="/session-tracker" className="text-primary underline-offset-2 hover:underline">Session Tracker</Link>, and the{" "}
          <Link to="/sub-plans" className="text-primary underline-offset-2 hover:underline">Substitute Teacher Center</Link>.
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((g) => {
          const isArchived = g.entries.some((e) => e.archived);
          return (
            <Card
              key={g.name}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragging && dragging.from !== g.name) moveStudent(dragging.studentId, dragging.from, g.name); setDragging(null); }}
              className={`p-4 ${isArchived ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {g.name}
                    {isArchived && <span className="text-[10px] font-semibold rounded-full bg-muted px-2 py-0.5 text-muted-foreground">ARCHIVED</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {DELIVERY_LABEL[g.entries[0]?.delivery] || ""} · {g.entries.length} block(s) · {g.studentIds.size} student(s)
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {iconBtn(Users, "Manage students", () => setManageGroup(g.name))}
                  {iconBtn(Pencil, "Rename", () => setAction({ mode: "rename", group: g.name }))}
                  {iconBtn(Copy, "Duplicate", () => setAction({ mode: "duplicate", group: g.name }))}
                  {iconBtn(GitMerge, "Merge into another group", () => setAction({ mode: "merge", group: g.name }))}
                  {iconBtn(Scissors, "Split off a new group", () => setAction({ mode: "split", group: g.name }))}
                  {iconBtn(isArchived ? ArchiveRestore : Archive, isArchived ? "Restore" : "Archive", () => setAction({ mode: "archive", group: g.name }))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground mt-2">
                {g.entries.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 && " · "}{e.day} {e.start_time || "?"}–{e.end_time || "?"}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...g.studentIds].map((id) => (
                  <span
                    key={id}
                    draggable
                    onDragStart={() => setDragging({ studentId: id, from: g.name })}
                    onDragEnd={() => setDragging(null)}
                    className={`inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium cursor-grab active:cursor-grabbing ${dragging?.studentId === id ? "opacity-40" : ""}`}
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    {studentName(students, id)}
                    <button onClick={() => removeStudent(id, g.name)} title="Remove from group" className="text-muted-foreground hover:text-rose-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {g.studentIds.size === 0 && <p className="text-xs text-muted-foreground">No students — drag students here or use Manage.</p>}
              </div>
            </Card>
          );
        })}
        {groups.length === 0 && (
          <Card className="p-8 text-center md:col-span-2 xl:col-span-3">
            <p className="font-medium">No groups yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload your schedule to build groups automatically, or add one manually.</p>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5" /> Drag a student chip onto another group card to move them. Minutes and rosters update everywhere automatically.
      </p>

      <GroupStudentsDialog group={manageGroup} entries={entries || []} students={students || []} onClose={() => setManageGroup(null)} onDone={onRefresh} />
      {action && (
        <GroupActionDialog action={action} entries={entries || []} groupNames={groupNames} students={students || []} onClose={() => setAction(null)} onDone={onRefresh} />
      )}
    </div>
  );
}
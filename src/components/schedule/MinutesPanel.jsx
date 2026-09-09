import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { studentName, scheduledMinutes, deliveredThisWeek, findConflicts, DELIVERY_LABEL } from "@/lib/scheduleUtils";

// Service Minutes Check: required vs scheduled vs delivered, missing minutes,
// and scheduling conflicts — recalculated live as groups change.
export default function MinutesPanel({ students, entries, sessionLogs }) {
  const scheduled = useMemo(() => scheduledMinutes(entries), [entries]);
  const delivered = useMemo(() => deliveredThisWeek(sessionLogs), [sessionLogs]);
  const conflicts = useMemo(() => findConflicts(entries), [entries]);

  const conflictCount = useMemo(() => {
    const out = {};
    for (const c of conflicts) for (const id of c.student_ids) out[id] = (out[id] || 0) + 1;
    return out;
  }, [conflicts]);

  const roster = (students || []).filter((s) => s.status !== "exited");
  const rows = roster.map((s) => {
    const required = s.service_minutes != null ? s.service_minutes : null;
    const sched = scheduled[s.id] || 0;
    const deliv = delivered[s.id] || 0;
    const missing = required != null ? Math.max(0, required - sched) : null;
    const status = required == null ? "Unknown" : sched >= required ? "On Track" : sched > 0 ? "Under Scheduled" : "Not Scheduled";
    return { s, required, sched, deliv, missing, status, conflicts: conflictCount[s.id] || 0 };
  });

  const statusStyle = {
    "On Track": "bg-emerald-100 text-emerald-700",
    "Under Scheduled": "bg-amber-100 text-amber-700",
    "Not Scheduled": "bg-rose-100 text-rose-700",
    Unknown: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Required / wk</th>
                <th className="px-4 py-3 font-semibold">Scheduled / wk</th>
                <th className="px-4 py-3 font-semibold">Delivered this wk</th>
                <th className="px-4 py-3 font-semibold">Missing</th>
                <th className="px-4 py-3 font-semibold">Conflicts</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, required, sched, deliv, missing, status, conflicts: c }) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{s.first_name} {s.last_name}{s.grade ? ` (${s.grade})` : ""}</td>
                  <td className="px-4 py-3">{required != null ? `${required} min` : "—"}</td>
                  <td className="px-4 py-3">{sched} min</td>
                  <td className="px-4 py-3">{deliv} min</td>
                  <td className={`px-4 py-3 ${missing > 0 ? "text-amber-600 font-semibold" : ""}`}>{missing != null ? `${missing} min` : "—"}</td>
                  <td className={`px-4 py-3 ${c > 0 ? "text-rose-600 font-semibold" : ""}`}>{c || "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[status]}`}>{status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No students on your caseload yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {conflicts.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm flex items-center gap-1.5 text-rose-600">
            <AlertTriangle className="h-4 w-4" /> Scheduling Conflicts ({conflicts.length})
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {conflicts.map((c, i) => (
              <li key={i}>
                <span className="font-medium">{c.a.day}</span>: {c.a.group_name} ({c.a.start_time}–{c.a.end_time}, {DELIVERY_LABEL[c.a.delivery] || c.a.delivery}) overlaps{" "}
                {c.b.group_name} ({c.b.start_time}–{c.b.end_time}) for {c.student_ids.map((id) => studentName(students, id)).join(", ")}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
import React, { useMemo, useState } from "react";
import { Check, AlertTriangle, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/cards";
import { findConflicts, normalizeDay, DELIVERY_LABEL } from "@/lib/scheduleUtils";
import AiDisclaimer from "@/components/shared/AiDisclaimer";

const CONF_STYLE = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-orange-100 text-orange-700",
  none: "bg-rose-100 text-rose-700",
};

// AI Schedule Review: everything found in the uploaded schedule, shown before
// saving. The teacher can exclude groups, fix student matches, and see
// conflicts — nothing is invented, and nothing saves without approval.
export default function ScheduleReview({ analysis, students, saving, onSave, onCancel }) {
  const [groups, setGroups] = useState(() =>
    (analysis.groups || []).map((g) => ({ ...g, included: true, assignments: {} }))
  );

  const roster = students || [];
  const resolveIds = (g) =>
    (g.students || []).flatMap((st) => {
      if (st.match_type !== "unmatched" && st.student_id) return [st.student_id];
      const chosen = g.assignments[st.name];
      return chosen ? [chosen] : [];
    });

  const preview = useMemo(
    () =>
      groups
        .filter((g) => g.included)
        .map((g) => ({
          group_name: g.group_name || "Unnamed group",
          day: normalizeDay(g.day),
          start_time: g.start_time,
          end_time: g.end_time,
          student_ids: resolveIds(g),
        })),
    [groups]
  );

  const conflicts = useMemo(() => findConflicts(preview), [preview]);
  const matchedIds = useMemo(() => new Set(groups.filter((g) => g.included).flatMap(resolveIds)), [groups]);
  const unmatched = groups.flatMap((g) => (g.students || []).filter((st) => st.match_type === "unmatched"));
  const totalMinutes = groups.filter((g) => g.included).reduce((n, g) => n + (Number(g.service_minutes) || 0), 0);
  const studentLabel = (id) => {
    const s = roster.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "";
  };

  const assign = (gi, name, studentId) =>
    setGroups((prev) => {
      const next = [...prev];
      next[gi] = { ...next[gi], assignments: { ...next[gi].assignments, [name]: studentId } };
      return next;
    });

  const toggleInclude = (gi) =>
    setGroups((prev) => {
      const next = [...prev];
      next[gi] = { ...next[gi], included: !next[gi].included };
      return next;
    });

  const save = () => {
    const entries = groups
      .filter((g) => g.included)
      .map((g) => ({
        group_name: g.group_name || "Unnamed group",
        delivery: ["pull-out", "push-in", "consultation"].includes(g.delivery) ? g.delivery : "pull-out",
        day: normalizeDay(g.day),
        start_time: g.start_time || "",
        end_time: g.end_time || "",
        service_minutes: Number(g.service_minutes) || 0,
        teacher_classroom: g.teacher_classroom || "",
        notes: g.notes || "",
        student_ids: resolveIds(g),
      }));
    onSave(entries);
  };

  const stats = [
    { label: "Groups Found", value: groups.filter((g) => g.included).length },
    { label: "Students Found", value: matchedIds.size },
    { label: "Unmatched Names", value: unmatched.length },
    { label: "Service Minutes", value: totalMinutes },
    { label: "Conflicts Found", value: conflicts.length },
  ];

  return (
    <div className="space-y-4">
      <AiDisclaimer extra="Review every group and student match below. Unmatched names need your confirmation before they join a group." />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {(analysis.conflicts || []).length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <div className="font-semibold text-amber-800 text-sm flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Issues found in the uploaded schedule
          </div>
          <ul className="mt-1.5 space-y-1 text-sm text-amber-800">
            {analysis.conflicts.map((c, i) => (
              <li key={i}>• {c.description}</li>
            ))}
          </ul>
        </div>
      )}

      {(analysis.extraction_notes || []).length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Missing / unclear information:</span>{" "}
          {analysis.extraction_notes.join(" · ")}
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g, gi) => (
          <Card key={gi} className={`p-4 ${!g.included ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <button
                  onClick={() => toggleInclude(gi)}
                  className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${g.included ? "brand-gradient border-transparent" : "border-border bg-card"}`}
                >
                  {g.included && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
                <div>
                  <div className="font-semibold">{g.group_name || "Unnamed group"}</div>
                  <div className="text-xs text-muted-foreground">
                    {normalizeDay(g.day)} · {g.start_time || "?"}–{g.end_time || "?"} · {DELIVERY_LABEL[g.delivery] || g.delivery} ·{" "}
                    {Number(g.service_minutes) || 0} min {g.teacher_classroom ? `· ${g.teacher_classroom}` : ""}
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {(g.students || []).length}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(g.students || []).map((st, si) =>
                st.match_type === "unmatched" ? (
                  <div key={si} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs">
                    <span className="font-medium">{st.name}</span>
                    <select
                      className="ml-2 rounded border border-border bg-card px-1.5 py-0.5 text-xs"
                      value={g.assignments[st.name] || ""}
                      onChange={(e) => assign(gi, st.name, e.target.value)}
                    >
                      <option value="">Not matched — pick student…</option>
                      {roster.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span key={si} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
                    {st.name}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CONF_STYLE[st.confidence] || CONF_STYLE.none}`}>
                      {st.match_type === "exact" ? "Exact" : "Fuzzy"}
                    </span>
                  </span>
                )
              )}
              {(g.students || []).length === 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> No students named for this block
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> {conflicts.length} overlapping service conflict{conflicts.length === 1 ? "" : "s"} detected
          </div>
          <ul className="mt-1.5 space-y-1">
            {conflicts.slice(0, 8).map((c, i) => (
              <li key={i}>
                • {c.a.group_name} ({c.a.start_time}) overlaps {c.b.group_name} ({c.b.start_time}) on {c.a.day} for{" "}
                {c.student_ids.map(studentLabel).filter(Boolean).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="brand-gradient text-white">
          {saving ? "Saving…" : `Save ${groups.filter((g) => g.included).length} schedule entries`}
        </Button>
      </div>
    </div>
  );
}
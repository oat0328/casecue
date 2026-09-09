import React from "react";
import { Card } from "@/components/ui/cards";

const FIELDS = [
  ["instructional_minutes_per_day", "Instructional minutes per day"],
  ["instructional_days_per_week", "Instructional days per week"],
  ["minutes_inside_ge", "Minutes inside general education (per week)"],
  ["minutes_outside_ge", "Minutes outside general education (per week)"],
];

const CHECKS = [
  "Instructional minutes verified with office records",
  "Rotating schedules reviewed",
  "Overlapping services reviewed",
  "Local calculation rules verified",
];

// Placement-percentage worksheet. CaseCue computes — the teacher verifies; it never selects a placement.
export default function PlacementWorksheet({ placement, onChange }) {
  const p = placement || {};
  const perDay = Number(p.instructional_minutes_per_day) || 0;
  const days = Number(p.instructional_days_per_week) || 0;
  const inside = Number(p.minutes_inside_ge) || 0;
  const outside = Number(p.minutes_outside_ge) || 0;
  const total = perDay * days;
  const insidePct = total ? Math.round((inside / total) * 100) : 0;
  const outsidePct = total ? Math.round((outside / total) * 100) : 0;

  const set = (key, value) => onChange({ ...p, [key]: value });
  const checks = Array.isArray(p.verification) ? p.verification : [];
  const toggleCheck = (label) =>
    set("verification", checks.includes(label) ? checks.filter((c) => c !== label) : [...checks, label]);

  return (
    <Card className="p-5">
      <h4 className="font-semibold text-sm">Placement percentage — calculation for team verification</h4>
      <p className="text-xs text-muted-foreground mt-1">
        Percentage inside general education = minutes inside general education ÷ total instructional minutes × 100.
        CaseCue calculates from your inputs; the team verifies and decides. CaseCue never selects a placement.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="text-xs">
            {label}
            <input
              type="number" min="0"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
              value={p[key] ?? ""}
              onChange={(e) => set(key, e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="rounded-xl bg-secondary p-4 mt-4 text-sm space-y-1">
        <div><strong>Formula:</strong> (minutes ÷ total instructional minutes) × 100</div>
        <div className="text-xs text-muted-foreground">
          Daily breakdown: {perDay} instructional min/day · Weekly breakdown: {total} instructional min/week ({perDay} × {days})
        </div>
        <div>Inside general education: {inside} min = <strong>{insidePct}%</strong></div>
        <div>Outside general education: {outside} min = <strong>{outsidePct}%</strong></div>
      </div>

      <div className="mt-4 space-y-2">
        {CHECKS.map((label) => (
          <label key={label} className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={checks.includes(label)} onChange={() => toggleCheck(label)} />
            {label}
          </label>
        ))}
      </div>
      <p className="text-xs text-amber-700 mt-3">Calculation for team verification — teacher verification required.</p>
    </Card>
  );
}
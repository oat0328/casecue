import React, { useState } from "react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Pencil, ThumbsUp, ThumbsDown } from "lucide-react";

const STATUS_CHIP = {
  draft: "bg-muted text-muted-foreground border-border",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function GoalCard({ goal, index, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(goal);
  const status = goal.status || "draft";

  const fields = [
    ["conditions", "Conditions"], ["action", "Observable action"], ["baseline", "Baseline"],
    ["target", "Measurable target"], ["criterion", "Criterion"], ["measurement_method", "Measurement method"],
    ["data_schedule", "Data-collection schedule"],
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-semibold text-sm">Goal {index + 1} — {goal.goal_area || "General"}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CHIP[status]}`}>{status}</span>
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
        {fields.map(([key, label]) =>
          editing ? (
            <label key={key} className="text-xs">
              {label}
              <input
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm mt-0.5"
                value={form[key] || ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ) : (
            <div key={key}><span className="text-muted-foreground">{label}:</span> {goal[key] || "—"}</div>
          )
        )}
        {!editing && (
          <div className="sm:col-span-2 text-xs text-muted-foreground">
            Connects to present level: {goal.present_level_link || "—"} · Evaluation finding: {goal.evaluation_link || "—"}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        {editing ? (
          <>
            <Button size="sm" onClick={() => { onChange({ ...form, status: "draft" }); setEditing(false); }}>Save goal</Button>
            <Button size="sm" variant="outline" onClick={() => { setForm(goal); setEditing(false); }}>Cancel</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => { setForm(goal); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        )}
        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" disabled={status === "accepted"} onClick={() => onChange({ status: "accepted" })}>
          <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Accept
        </Button>
        <Button size="sm" variant="ghost" className="text-rose-600" disabled={status === "rejected"} onClick={() => onChange({ status: "rejected" })}>
          <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject
        </Button>
      </div>
    </Card>
  );
}
import React from "react";
import { Card } from "@/components/ui/cards";
import { STATUS_LABEL } from "@/lib/sessionCalc";
import { formatDate } from '@/lib/dateUtils';

const STATUS_CHIP = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partially_completed: "bg-blue-50 text-blue-700 border-blue-200",
  makeup_session: "bg-amber-50 text-amber-700 border-amber-200",
};
const MISSED = ["student_absent", "provider_absent", "refused", "school_activity", "canceled"];

export default function SessionList({ sessions, goals }) {
  if (!(sessions || []).length) {
    return <Card className="p-5"><p className="text-sm text-muted-foreground">No sessions logged yet.</p></Card>;
  }
  return (
    <div className="space-y-2">
      {(sessions || []).map((s) => {
        const missed = MISSED.includes(s.status);
        const goal = (goals || []).find((g) => g.id === s.goal_id);
        const q = s.quantitative || {};
        const pct = q.percentage != null ? `${q.percentage}%` : (q.correct != null && q.total ? `${q.correct}/${q.total}` : null);
        return (
          <Card key={s.id} className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium">{formatDate(s.date)} {s.start_time ? `· ${s.start_time}` : ""}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.service_type?.replace(/_/g, " ")} · {s.delivery === "group" ? "Group" : "Individual"} · {s.setting === "push_in" ? "Push-in" : "Pull-out"}
                  {goal ? ` · Goal: ${goal.goal_area || "—"}` : ""}{s.activity ? ` · ${s.activity}` : ""}
                </div>
                {s.qualitative && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.qualitative}</p>}
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CHIP[s.status] || (missed ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-muted text-muted-foreground border-border")}`}>
                  {STATUS_LABEL(s.status)}
                </span>
                <div className="text-xs text-muted-foreground mt-1">{s.delivered_minutes ?? s.duration_minutes ?? 0} min{pct ? ` · ${pct}` : ""}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

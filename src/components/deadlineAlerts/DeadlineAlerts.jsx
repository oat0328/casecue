import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, FileWarning, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/cards";

function daysUntil(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2100) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

const URGENCY = {
  overdue: { label: "Overdue", icon: AlertTriangle, tone: "red" },
  critical: { label: "Due within 14 days", icon: AlertTriangle, tone: "red" },
  warning: { label: "Due within 30 days", icon: CalendarClock, tone: "amber" },
  upcoming: { label: "Due within 60 days", icon: FileWarning, tone: "blue" },
};

const TONE_CLASSES = {
  red: { card: "border-red-200 bg-red-50", icon: "text-red-600", badge: "bg-red-600 text-white", date: "text-red-700" },
  amber: { card: "border-amber-200 bg-amber-50", icon: "text-amber-600", badge: "bg-amber-600 text-white", date: "text-amber-700" },
  blue: { card: "border-blue-200 bg-blue-50", icon: "text-blue-600", badge: "bg-blue-600 text-white", date: "text-blue-700" },
};

export default function DeadlineAlerts({ students }) {
  const alerts = React.useMemo(() => {
    const items = [];
    (students || []).forEach((s) => {
      [["annual_review_due", "Annual IEP review"], ["reevaluation_due", "Reevaluation"]].forEach(([field, type]) => {
        const d = daysUntil(s[field]);
        if (d === null || d > 60) return;
        const urgency = d < 0 ? "overdue" : d <= 14 ? "critical" : d <= 30 ? "warning" : "upcoming";
        items.push({ id: `${s.id}-${field}`, student: s, type, date: s[field], days: d, urgency });
      });
    });
    return items.sort((a, b) => a.days - b.days);
  }, [students]);

  if (alerts.length === 0) return null;

  return (
    <Card className="mb-8 p-6 border-amber-200 bg-amber-50/50">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold">Deadline alerts</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {alerts.length} compliance deadline{alerts.length > 1 ? "s" : ""} approaching on your caseload — overdue and critical items first.
      </p>
      <div className="space-y-2">
        {alerts.slice(0, 8).map((a) => {
          const tone = TONE_CLASSES[URGENCY[a.urgency].tone];
          return (
            <Link
              key={a.id}
              to={`/students/${a.student.id}`}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 hover:shadow-sm transition-all ${tone.card}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${tone.badge}`}>
                  {a.days < 0 ? `${Math.abs(a.days)}d overdue` : a.days === 0 ? "Today" : `${a.days}d left`}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-medium">
                    {a.student.first_name} {a.student.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground"> — {a.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium hidden sm:inline ${tone.date}`}>
                  {a.date}{a.days >= 0 ? "" : ""}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>
      {alerts.length > 8 && (
        <p className="text-xs text-muted-foreground mt-3">
          + {alerts.length - 8} more — see <Link to="/students" className="text-primary font-medium hover:underline">Students</Link> for the full list.
        </p>
      )}
    </Card>
  );
}
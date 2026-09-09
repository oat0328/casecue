import React from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { minutesSummary, detectSessionFlags, downloadCsv, STATUS_LABEL } from "@/lib/sessionCalc";
import { exportSessionLogPdf, exportServiceMinutesPdf } from "@/lib/pdfExport";

function MiniStat({ label, value, tone }) {
  const tones = { good: "text-emerald-600", warn: "text-amber-600", bad: "text-rose-600", plain: "" };
  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${tones[tone] || ""}`}>{value}</div>
    </div>
  );
}

// Required vs delivered service minutes for the current week, plus data-quality flags and exports.
export default function MinutesDashboard({ student, sessions, goals }) {
  const summary = minutesSummary(sessions, student?.service_minutes);
  const flags = detectSessionFlags(sessions, goals);
  const thisWeek = (sessions || []).filter((s) => {
    const d = new Date(`${s.date}T00:00:00`);
    const r = new Date(); r.setHours(0, 0, 0, 0);
    const dow = (r.getDay() + 6) % 7;
    const start = new Date(r); start.setDate(r.getDate() - dow);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  });

  const exportCsv = () => {
    downloadCsv(`Sessions-${student?.first_name || "Student"}-${student?.last_name || ""}.csv`,
      ["Date", "Start", "End", "Duration (min)", "Service type", "Status", "Goal", "Activity", "Scheduled min", "Delivered min", "Correct", "Total"],
      (sessions || []).map((s) => [
        s.date, s.start_time, s.end_time, s.duration_minutes, s.service_type, STATUS_LABEL(s.status),
        (goals || []).find((g) => g.id === s.goal_id)?.goal_area || "", s.activity || "",
        s.scheduled_minutes ?? "", s.delivered_minutes ?? "",
        s.quantitative?.correct ?? "", s.quantitative?.total ?? "",
      ])
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h3 className="font-semibold mb-1">Service minutes — current week</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Required weekly minutes come from the student record ({student?.service_minutes || "not recorded"}). Only completed, partially-completed, and makeup sessions count toward delivered minutes — duplicates never increase the total.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <MiniStat label="Required /wk" value={summary.required || "—"} />
          <MiniStat label="Scheduled" value={summary.scheduled || 0} />
          <MiniStat label="Delivered" value={summary.delivered || 0} tone="good" />
          <MiniStat label={`Missed (${summary.missedCount})`} value={summary.missedMinutes || 0} tone="bad" />
          <MiniStat label={`Makeup (${summary.makeupCount})`} value={summary.makeupMinutes || 0} tone="warn" />
          <MiniStat label="Remaining" value={summary.remaining || 0} tone={summary.remaining > 0 ? "warn" : "plain"} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span>Completion: <strong>{summary.completion != null ? `${summary.completion}%` : "—"}</strong></span>
          {summary.noDataThisWeek && <span className="text-amber-600 text-xs">⚠ No session data recorded this week</span>}
          {summary.missedCount > 0 && <span className="text-xs text-muted-foreground">Missed-service reasons: {thisWeek.filter((s) => ["student_absent","provider_absent","refused","school_activity","canceled"].includes(s.status)).map((s) => `${s.date}: ${STATUS_LABEL(s.status)}`).join(" · ")}</span>}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1" /> Sessions (CSV)</Button>
          <Button size="sm" variant="outline" onClick={() => exportServiceMinutesPdf(student, summary, flags, thisWeek)}><Download className="h-3.5 w-3.5 mr-1" /> Service-minute report (PDF)</Button>
          <Button size="sm" variant="outline" onClick={() => exportSessionLogPdf(student, sessions)}><Download className="h-3.5 w-3.5 mr-1" /> Session log (PDF)</Button>
        </div>
      </Card>

      {flags.length > 0 && (
        <Card className="p-4 sm:p-5 border-amber-200 bg-amber-50/40">
          <h4 className="font-semibold text-sm text-amber-800 mb-2">Data-quality flags</h4>
          <ul className="space-y-1 text-sm list-disc pl-5">
            {flags.slice(0, 8).map((f, i) => <li key={i}>{f.message}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
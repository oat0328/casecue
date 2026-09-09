import React, { useMemo, useState } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportBar from "@/components/shared/ExportBar";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/lib/sessionCalc";
import { exportXlsx } from "@/lib/xlsxExport";
import { monthRange, monthCompliance, fmtLocal } from "@/lib/sessionReporting";
import { STATUS_LABEL, MISSED_STATUSES } from "@/lib/sessionCalc";

const BANNER = "Service delivery figures are calculated from recorded sessions and required minutes on each student record. Educator review required before any compliance decision.";

function Chip({ value }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const cls =
    value >= 95 ? "text-emerald-700" : value >= 75 ? "text-amber-600" : "text-rose-600";
  return <span className={cls}>{value}%</span>;
}

// Monthly service-delivery compliance: required vs delivered minutes, missed
// sessions, and makeup sessions for every student on the caseload.
export default function ComplianceReport({ sessions, students }) {
  const { toast } = useToast();
  const [ym, setYm] = useState(fmtLocal(new Date()).slice(0, 7));
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => monthRange(ym), [ym]);
  const compliance = useMemo(() => monthCompliance(sessions, students, range), [sessions, students, range]);

  const missedDetail = useMemo(() => {
    const inRange = (sessions || []).filter((s) => s.date >= range.start && s.date <= range.end);
    return inRange.filter((s) => MISSED_STATUSES.includes(s.status));
  }, [sessions, range]);

  const totals = compliance.totals;

  const sections = [
    {
      heading: `Compliance Summary — ${range.label}`,
      body: [
        `Students on caseload: ${(students || []).length}`,
        `Required minutes (month to date, ${compliance.weeks} week(s) elapsed): ${totals.required}`,
        `Delivered minutes: ${totals.delivered}`,
        `Overall service delivery: ${totals.compliance != null ? `${totals.compliance}%` : "required minutes not recorded"}`,
        `Missed sessions: ${totals.missed} (${totals.missedMinutes} scheduled minutes)`,
        `Makeup sessions: ${totals.makeup} (${totals.makeupMinutes} minutes)`,
      ].join("\n"),
    },
    {
      heading: "Per-student service delivery",
      body:
        compliance.rows
          .map(
            (r) =>
              `${r.student.first_name} ${r.student.last_name} — required ${r.requiredWeekly}/wk (${r.required} month to date) · delivered ${r.delivered} · missed ${r.missedCount} · makeup ${r.makeupCount} · delivery ${r.compliance != null ? `${r.compliance}%` : "n/a"}`
          )
          .join("\n") || "No students on caseload.",
    },
    {
      heading: "Missed sessions this month",
      body:
        missedDetail
          .map((s) => {
            const st = (students || []).find((x) => x.id === s.student_id);
            return `${s.date}: ${st ? `${st.first_name} ${st.last_name}` : "Unknown"} — ${STATUS_LABEL(s.status)} (${Number(s.scheduled_minutes) || 0} scheduled minutes)`;
          })
          .join("\n") || "None recorded.",
    },
  ];

  const excelHeaders = ["Student", "Grade", "Required Weekly Min", "Required (Month to Date)", "Delivered Min", "Sessions", "Missed Sessions", "Makeup Sessions", "Delivery %"];
  const excelRows = compliance.rows.map((r) => [
    `${r.student.first_name} ${r.student.last_name}`,
    r.student.grade || "",
    r.requiredWeekly,
    r.required,
    r.delivered,
    r.sessionCount,
    r.missedCount,
    r.makeupCount,
    r.compliance != null ? r.compliance : "n/a",
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.SavedReport.create({
        student_id: "",
        student_name: "Caseload",
        report_type: "service_compliance_report",
        content: { title: `Service Delivery Compliance — ${range.label}`, subtitle: range.label, sections },
      });
      toast({ title: "Saved to report history" });
    } catch (err) {
      toast({ title: "Could not save", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "rounded-lg border border-input bg-background px-3 py-2 text-sm";

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="font-semibold">Compliance Reporting — Service Delivery</h3>
          <p className="text-xs text-muted-foreground">
            Required minutes come from each student record · month-to-date uses {compliance.weeks} elapsed week(s).
          </p>
        </div>
        <input type="month" className={selectClass} value={ym} onChange={(e) => setYm(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
          <div className="text-xs text-muted-foreground">Required (MTD)</div>
          <div className="text-lg font-bold">{totals.required}</div>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
          <div className="text-xs text-muted-foreground">Delivered</div>
          <div className="text-lg font-bold text-emerald-600">{totals.delivered}</div>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
          <div className="text-xs text-muted-foreground">Overall Delivery</div>
          <div className="text-lg font-bold"><Chip value={totals.compliance} /></div>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
          <div className="text-xs text-muted-foreground">Missed Sessions</div>
          <div className="text-lg font-bold text-rose-600">{totals.missed}</div>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
          <div className="text-xs text-muted-foreground">Makeup Sessions</div>
          <div className="text-lg font-bold text-amber-600">{totals.makeup}</div>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2.5 text-center">
          <div className="text-xs text-muted-foreground">Missed Minutes</div>
          <div className="text-lg font-bold text-rose-600">{totals.missedMinutes}</div>
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Required/wk</th>
              <th className="py-2 pr-3 font-medium">Required (MTD)</th>
              <th className="py-2 pr-3 font-medium">Delivered</th>
              <th className="py-2 pr-3 font-medium">Missed</th>
              <th className="py-2 pr-3 font-medium">Makeup</th>
              <th className="py-2 font-medium">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {compliance.rows.map((r) => (
              <tr key={r.student.id} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{r.student.first_name} {r.student.last_name}</td>
                <td className="py-2 pr-3">{r.requiredWeekly || "—"}</td>
                <td className="py-2 pr-3">{r.required || "—"}</td>
                <td className="py-2 pr-3">{r.delivered}</td>
                <td className="py-2 pr-3">{r.missedCount}</td>
                <td className="py-2 pr-3">{r.makeupCount}</td>
                <td className="py-2"><Chip value={r.compliance} /></td>
              </tr>
            ))}
            {!compliance.rows.length && (
              <tr><td colSpan={7} className="py-3 text-muted-foreground">No students on caseload.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ExportBar
          title={`Service Delivery Compliance Report — ${range.label}`}
          subtitle={`${range.start} to ${range.end} · ${(students || []).length} students`}
          sections={sections}
          filename={`CaseCue-Compliance-${range.start}`}
          banner={BANNER}
          exclude={["save"]}
        />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          <Download className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { exportXlsx(`CaseCue-Compliance-${range.start}`, [{ name: "Compliance", headers: excelHeaders, rows: excelRows }]); toast({ title: "Excel file downloaded" }); }}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel (.xlsx)
        </Button>
        <Button size="sm" variant="outline" onClick={() => { downloadCsv(`CaseCue-Compliance-${range.start}.csv`, excelHeaders, excelRows); toast({ title: "CSV file downloaded" }); }}>
          <Download className="h-3.5 w-3.5 mr-1" />CSV
        </Button>
      </div>
    </Card>
  );
}
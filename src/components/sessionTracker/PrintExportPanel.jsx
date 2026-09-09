import React, { useMemo, useState } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportBar from "@/components/shared/ExportBar";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/lib/sessionCalc";
import { exportXlsx } from "@/lib/xlsxExport";
import {
  dayRange, weekRange, monthRange, studentName, sessionDocSections,
  excelRows, EXCEL_HEADERS, fmtLocal,
} from "@/lib/sessionReporting";

const MODES = [
  { key: "single", label: "Single Session" },
  { key: "daily", label: "Daily Sessions" },
  { key: "weekly", label: "Weekly Sessions" },
  { key: "monthly", label: "Monthly Sessions" },
  { key: "student", label: "Student Session History" },
  { key: "caseload", label: "Caseload Session History" },
];

const BANNER = "Session data as recorded by the provider. Educator review required before distribution.";

// Print & export options: pick a range (single session → whole caseload),
// then Save / Print / PDF / DOCX / Excel / CSV / Email / Share it.
export default function PrintExportPanel({ sessions, students, goals }) {
  const { toast } = useToast();
  const today = fmtLocal(new Date());
  const [mode, setMode] = useState("weekly");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [studentId, setStudentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedSessions = useMemo(
    () => [...(sessions || [])].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [sessions]
  );

  const report = useMemo(() => {
    let title = "Session Report";
    let subtitle = "";
    let list = [];

    if (mode === "single") {
      const s = sortedSessions.find((x) => x.id === sessionId) || sortedSessions[0];
      if (s) {
        list = [s];
        title = "Session Summary";
        subtitle = `${s.date}${s.start_time ? ` ${s.start_time}` : ""} — ${studentName(students, s.student_id)}`;
      }
    } else if (mode === "daily") {
      const r = dayRange(date);
      list = (sessions || []).filter((s) => s.date >= r.start && s.date <= r.end);
      title = "Daily Session Report";
      subtitle = r.label;
    } else if (mode === "weekly") {
      const r = weekRange(date);
      list = (sessions || []).filter((s) => s.date >= r.start && s.date <= r.end);
      title = "Weekly Session Report";
      subtitle = `${r.label} (${r.start} to ${r.end})`;
    } else if (mode === "monthly") {
      const r = monthRange(month);
      list = (sessions || []).filter((s) => s.date >= r.start && s.date <= r.end);
      title = "Monthly Session Report";
      subtitle = `${r.label} (${r.start} to ${r.end})`;
    } else if (mode === "student") {
      const st = (students || []).find((x) => x.id === studentId);
      if (st) {
        list = (sessions || []).filter((s) => s.student_id === st.id);
        title = "Student Session History";
        subtitle = `${st.first_name} ${st.last_name}${st.grade ? ` · Grade ${st.grade}` : ""} — ${list.length} sessions`;
      }
    } else {
      list = sessions || [];
      title = "Caseload Session History";
      subtitle = `${(students || []).length} students · ${list.length} sessions · exported ${today}`;
    }

    return {
      title,
      subtitle,
      list,
      sections: sessionDocSections(list, students, goals),
      filename: `CaseCue-${title}-${mode === "single" || mode === "daily" ? date : month}`,
    };
  }, [mode, date, month, studentId, sessionId, sessions, students, goals, sortedSessions, today]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.SavedReport.create({
        student_id: mode === "student" ? studentId : "",
        student_name: mode === "student" ? studentName(students, studentId) : "Caseload",
        report_type: "session_report",
        content: { title: report.title, subtitle: report.subtitle, sections: report.sections },
      });
      toast({ title: "Saved to report history", description: "Find it under Progress Reports → Report History." });
    } catch (err) {
      toast({ title: "Could not save", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    if (!report.list.length) return toast({ title: "Nothing to export", description: "No sessions in this range." });
    exportXlsx(report.filename, [{ name: "Sessions", headers: EXCEL_HEADERS, rows: excelRows(report.list, students, goals) }]);
    toast({ title: "Excel file downloaded" });
  };

  const exportCsv = () => {
    if (!report.list.length) return toast({ title: "Nothing to export", description: "No sessions in this range." });
    downloadCsv(`${report.filename}.csv`, EXCEL_HEADERS, excelRows(report.list, students, goals));
    toast({ title: "CSV file downloaded" });
  };

  const selectClass = "rounded-lg border border-input bg-background px-3 py-2 text-sm";

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-semibold mb-1">Print & Export Options</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Choose what to print or export, then use the full export bar. Excel and CSV use the standard session columns
        (student, date, service type, goal area, minutes, notes, attendance, provider, location, outcome).
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium border ${mode === m.key ? "bg-primary text-white border-primary" : "bg-card border-border"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {mode === "single" && (
          <select className={selectClass} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            <option value="">{sortedSessions[0] ? `Most recent: ${sortedSessions[0].date} — ${studentName(students, sortedSessions[0].student_id)}` : "No sessions recorded"}</option>
            {sortedSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date} {s.start_time || ""} — {studentName(students, s.student_id)} — {String(s.status || "").replace(/_/g, " ")}
              </option>
            ))}
          </select>
        )}
        {(mode === "daily" || mode === "weekly") && (
          <label className="flex items-center gap-2 text-sm">
            Date
            <input type="date" className={selectClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        )}
        {mode === "monthly" && (
          <label className="flex items-center gap-2 text-sm">
            Month
            <input type="month" className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        )}
        {mode === "student" && (
          <select className={selectClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select a student…</option>
            {(students || []).map((s) => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-xl bg-secondary/60 px-4 py-3 mb-4">
        <div className="text-sm font-medium">{report.title}</div>
        <div className="text-xs text-muted-foreground">{report.subtitle || "Select options above"}</div>
        <div className="text-xs text-muted-foreground mt-1">{report.list.length} session(s) included</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ExportBar
          title={report.title}
          subtitle={report.subtitle}
          sections={report.sections}
          filename={report.filename}
          banner={BANNER}
          onSave={handleSave}
          exclude={["save"]}
        />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
          <Download className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={exportExcel}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel (.xlsx)
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1" />CSV
        </Button>
      </div>
    </Card>
  );
}
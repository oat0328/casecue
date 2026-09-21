import React, { useMemo, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportBar from "@/components/shared/ExportBar";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import { base44 } from "@/api/base44Client";
import {
  buildStudentProgressSections,
  buildIepProgressSections,
  buildParentFriendlySections,
  buildServiceDeliverySections,
} from "@/lib/sessionReporting";

const REPORT_TYPES = [
  { key: "student_progress", label: "Student Progress Report" },
  { key: "iep_progress", label: "IEP Progress Report" },
  { key: "parent_friendly", label: "Parent-Friendly Report" },
  { key: "service_delivery", label: "Service Delivery Report" },
];

const BANNER = "This report is generated directly from your recorded session data — no information has been invented. Educator review required before distribution.";

// Generates progress reports straight from Session Tracker data (data-derived, no
// invention): student progress, IEP progress, parent-friendly, and service
// delivery. Every output has the full export bar.
export default function SessionReportGenerator({ sessions, students, goals, onSaved }) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("student_progress");
  const [studentId, setStudentId] = useState("");
  const [report, setReport] = useState(null);
  const [saving, setSaving] = useState(false);

  const studentSessions = useMemo(
    () => (sessions || []).filter((s) => s.student_id === studentId),
    [sessions, studentId]
  );
  const studentGoals = useMemo(
    () => (goals || []).filter((g) => g.student_id === studentId),
    [goals, studentId]
  );
  const student = useMemo(
    () => (students || []).find((s) => s.id === studentId) || null,
    [students, studentId]
  );

  const generate = () => {
    if (!student) {
      toast({ title: "Select a student first" });
      return;
    }
    const typeLabel = REPORT_TYPES.find((t) => t.key === reportType)?.label || "Report";
    let sections = [];
    if (reportType === "student_progress") sections = buildStudentProgressSections(student, studentSessions, studentGoals);
    else if (reportType === "iep_progress") sections = buildIepProgressSections(student, studentSessions, studentGoals);
    else if (reportType === "parent_friendly") sections = buildParentFriendlySections(student, studentSessions, studentGoals);
    else sections = buildServiceDeliverySections(student, studentSessions);

    setReport({
      title: `${typeLabel} — ${student.first_name} ${student.last_name}`,
      subtitle: `Generated ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})} · ${studentSessions.length} recorded session(s)`,
      sections,
      filename: `CaseCue-${typeLabel.replace(/\s+/g, "-")}-${student.first_name}-${student.last_name}`,
    });
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await base44.entities.SavedReport.create({
        student_id: studentId,
        student_name: student ? `${student.first_name} ${student.last_name}` : "",
        report_type: `session_${reportType}`,
        content: { title: report.title, subtitle: report.subtitle, sections: report.sections },
      });
      toast({ title: "Saved to report history", description: "Find it under Progress Reports → Report History." });
      onSaved && onSaved();
    } catch (err) {
      toast({ title: "Could not save", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "rounded-lg border border-input bg-background px-3 py-2 text-sm w-full sm:w-auto";

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h3 className="font-semibold mb-1">Generate Progress Reports from Session Data</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Reports are built from recorded sessions only — goal stats, attendance, minutes, and notes. If data is
          missing, the report says so instead of guessing.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select className={selectClass} value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select className={selectClass} value={studentId} onChange={(e) => { setStudentId(e.target.value); setReport(null); }}>
            <option value="">Select a student…</option>
            {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
          <Button onClick={generate} disabled={!studentId}>
            <Sparkles className="h-4 w-4 mr-1" />Generate Report
          </Button>
        </div>
      </Card>

      {report && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h4 className="font-semibold">{report.title}</h4>
              <p className="text-xs text-muted-foreground">{report.subtitle}</p>
            </div>
            <ExportBar
              title={report.title}
              subtitle={report.subtitle}
              sections={report.sections}
              filename={report.filename}
              banner={BANNER}
              exclude={["save"]}
            />
          </div>

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {report.sections.map((s, i) => (
              <div key={i}>
                <h5 className="text-sm font-semibold text-primary">{s.heading}</h5>
                <p className="text-sm whitespace-pre-wrap mt-1">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <AiDisclaimer extra="This report is data-derived, not system-written — but educator review is still required before sharing." />
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              <Loader2 className={`h-3.5 w-3.5 mr-1 ${saving ? "animate-spin" : "hidden"}`} />
              Save to Report History
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
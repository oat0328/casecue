import React, { useMemo, useState } from "react";
import { Sparkles, History, X } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import DataExportBar from "@/components/shared/DataExportBar";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import ReportHistory from "@/components/shared/ReportHistory";
import { saveReportToHistory, applyFilters } from "@/lib/reportExport";

export const DATA_BANNER =
  "This report is generated directly from your recorded CaseCue data — no information has been invented. Educator review required before distribution.";

// Shared report generator: report-type selector, filters (student, grade,
// service, goal area, date range), preview, the full 8-action export bar, and
// report history with regenerate. Used by Gradebook, Data Center, and Reports.
export default function ReportBuilderPanel({
  definitions,
  data,
  banner = DATA_BANNER,
  historyMode = "own", // "own" = only this area's report types; "all" = every saved report
  heading = "Generate Reports",
}) {
  const { toast } = useToast();
  const [reportKey, setReportKey] = useState(definitions[0]?.key);
  const [studentId, setStudentId] = useState("");
  const [filters, setFilters] = useState({ grade: "", service: "", goal_area: "", provider: "", from: "", to: "" });
  const [report, setReport] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: saved, refetch: refetchSaved } = useAsync(
    () => base44.entities.SavedReport.list("-created_date", 50),
    []
  );

  const def = definitions.find((d) => d.key === reportKey) || definitions[0];
  const students = data.students || [];
  const needsStudent = def?.scope === "student";

  const grades = useMemo(() => [...new Set(students.map((s) => s.grade).filter(Boolean))].sort(), [students]);
  const services = useMemo(
    () => [...new Set(students.flatMap((s) => s.services || []).filter(Boolean))].sort(),
    [students]
  );
  const goalAreas = useMemo(
    () => [...new Set((data.goals || []).map((g) => g.goal_area).filter(Boolean))].sort(),
    [data.goals]
  );
  const providers = useMemo(
    () =>
      [
        ...new Set([
          ...(data.sessions || []).map((s) => s.provider).filter(Boolean),
          ...(data.schedule || []).map((e) => e.teacher_classroom).filter(Boolean),
        ]),
      ].sort(),
    [data.sessions, data.schedule]
  );

  const generate = (override) => {
    const p = {
      report_key: def.key,
      student_id: studentId,
      filters,
      ...(override || {}),
    };
    const useDef = definitions.find((d) => d.key === p.report_key) || def;
    if (useDef.scope === "student" && !p.student_id) {
      toast({ title: "Select a student first" });
      return;
    }
    try {
      const bundle = applyFilters(data, p.filters, useDef.scope === "student" ? p.student_id : null);
      const built = useDef.build({ ...bundle, student: bundle.student });
      setReport({ ...built, report_type: useDef.key, params: p });
    } catch (e) {
      toast({ title: "Could not build report", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const student = students.find((s) => s.id === report.student_id);
      await saveReportToHistory({
        student_id: report.student_id || "caseload",
        student_name: report.student_id === "caseload" || !report.student_id ? "Caseload report" : studentNameOf(student),
        report_type: report.report_type,
        title: report.title,
        subtitle: report.subtitle,
        sections: report.sections,
        params: report.params,
        banner,
      });
      toast({ title: "Saved to report history" });
      refetchSaved();
    } catch (e) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const regenerate = (savedReport) => {
    const p = savedReport?.content?.params;
    if (!p || !definitions.some((d) => d.key === p.report_key)) {
      toast({
        title: "Can't regenerate here",
        description: "This report was created in another area — open it there to regenerate.",
      });
      return;
    }
    setReportKey(p.report_key);
    setStudentId(p.student_id || "");
    if (p.filters) setFilters({ grade: "", service: "", goal_area: "", provider: "", from: "", to: "", ...p.filters });
    generate(p);
  };

  const historyTypes = useMemo(() => new Set(definitions.map((d) => d.key)), [definitions]);
  const visibleSaved = (saved || []).filter((r) => {
    if (historyMode === "all") return true;
    const key = r.content?.params?.report_key;
    return key ? historyTypes.has(key) : false;
  });

  const selectClass = "rounded-lg border border-input bg-background px-3 py-2 text-sm";
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h3 className="font-semibold mb-1">{heading}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Reports are built from your recorded data only — goals, progress points, sessions, assignments, and
          deadlines. Missing data is stated as missing, never invented.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select className={selectClass} value={reportKey} onChange={(e) => { setReportKey(e.target.value); setReport(null); }}>
            {definitions.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          {needsStudent && (
            <select className={selectClass} value={studentId} onChange={(e) => { setStudentId(e.target.value); setReport(null); }}>
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          )}
          <select className={selectClass} value={filters.grade} onChange={setF("grade")}>
            <option value="">All grades</option>
            {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select className={selectClass} value={filters.service} onChange={setF("service")}>
            <option value="">All services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={selectClass} value={filters.provider} onChange={setF("provider")}>
            <option value="">All providers</option>
            {providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={selectClass} value={filters.goal_area} onChange={setF("goal_area")}>
            <option value="">All goal areas</option>
            {goalAreas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <Input type="date" value={filters.from} onChange={setF("from")} className="text-sm" />
          <Input type="date" value={filters.to} onChange={setF("to")} className="text-sm" />
          <Button onClick={() => generate()} className="brand-gradient text-white">
            <Sparkles className="h-4 w-4 mr-1" /> Generate Report
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
            <DataExportBar
              title={report.title}
              subtitle={report.subtitle}
              sections={report.sections}
              sheets={report.sheets}
              filename={report.filename}
              banner={banner}
              onSave={saving ? undefined : handleSave}
            />
          </div>
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {report.sections.map((s, i) => (
              <div key={i}>
                <h5 className="text-sm font-semibold text-primary">{s.heading}</h5>
                {s.body && <p className="text-sm whitespace-pre-wrap mt-1">{s.body}</p>}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <AiDisclaimer extra="This report is data-derived, not system-written — but educator review is still required before sharing." />
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Report History
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{visibleSaved.length} saved</span>
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? <X className="h-3.5 w-3.5 mr-1" /> : <History className="h-3.5 w-3.5 mr-1" />}
              {showHistory ? "Hide" : "Show"}
            </Button>
          </div>
        </div>
        {showHistory && (
          <div className="mt-2">
            <ReportHistory reports={visibleSaved} onDelete={refetchSaved} onRegenerate={regenerate} />
          </div>
        )}
      </Card>
    </div>
  );
}

function studentNameOf(s) {
  return s ? `${s.first_name} ${s.last_name}` : "Student report";
}
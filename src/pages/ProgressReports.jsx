import React, { useState } from "react";
import { FileText, Sparkles, Download, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { exportProgressReportPdf } from "@/lib/pdfExport";
import EmptyState from "@/components/EmptyState";
import ReportHistory from "@/components/progressReports/ReportHistory";

function TrendIcon({ trend }) {
  if (trend === null || trend === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
  if (trend > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend < 0) return <TrendingDown className="h-4 w-4 text-rose-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function ProgressReports() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: savedReports, refetch: refetchReports } = useAsync(() => base44.entities.SavedReport.list('-created_date', 50), []);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const s = students || [];
  const selectedStudent = s.find((st) => st.id === studentId);

  const generate = async () => {
    if (!studentId) { toast({ title: "Select a student first", variant: "destructive" }); return; }
    setLoading(true); setReport(null);
    try {
      const res = await base44.functions.invoke("generateProgressReport", { student_id: studentId });
      setReport(res.data);
      try {
        await base44.entities.SavedReport.create({
          student_id: studentId,
          student_name: `${res.data.student.first_name} ${res.data.student.last_name}`,
          report_type: "progress_report",
          content: res.data,
        });
        refetchReports();
      } catch (saveErr) {
        console.error("Failed to save report history:", saveErr);
      }
      toast({ title: "Progress report drafted", description: "Saved to history. Review required before sharing." });
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const download = () => exportProgressReportPdf(selectedStudent, report);

  return (
    <div>
      <PageHeader title="Progress Reports" subtitle="Generate parent-ready progress reports from your recorded goal data — every draft requires educator review."
        icon={FileText} />

      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <Label>Student</Label>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1.5"
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setReport(null); }}
            >
              <option value="">Select a student…</option>
              {s.map((st) => <option key={st.id} value={st.id}>{st.first_name} {st.last_name}</option>)}
            </select>
          </div>
          <Button onClick={generate} disabled={loading || !studentId} className="brand-gradient text-white">
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Drafting…" : "Generate report"}
          </Button>
        </div>
        {s.length === 0 && <p className="text-sm text-muted-foreground mt-3">Add students first to generate reports.</p>}
      </Card>

      {loading && (
        <Card className="p-10 text-center">
          <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
          <p className="mt-3 text-sm text-muted-foreground">Drafting progress statements from your recorded data…</p>
        </Card>
      )}

      {report && (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Draft for <span className="font-semibold text-foreground">{report.student.first_name} {report.student.last_name}</span> · generated {report.generated_at}
            </p>
            <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
          </div>

          <div className="space-y-4 mb-6">
            {(report.goal_reports || []).map((gr, i) => {
              const stats = (report.stats || []).find((st) => st.goal_area === gr.goal_area) || {};
              return (
                <Card key={i} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wide">{gr.goal_area}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendIcon trend={stats.trend} />
                      {stats.trend !== null && stats.trend !== undefined ? `${stats.trend > 0 ? "+" : ""}${stats.trend} pts since first` : "No trend data"}
                    </div>
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{gr.statement}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    {stats.baseline && <span>Baseline: {stats.baseline}</span>}
                    {stats.target && <span>Target: {stats.target}</span>}
                    {stats.latest_percentage != null && <span>Latest: {stats.latest_percentage}% ({stats.latest_date})</span>}
                    {stats.average_percentage != null && <span>Average: {stats.average_percentage}%</span>}
                    <span>{stats.data_points ?? 0} data point{(stats.data_points || 0) === 1 ? "" : "s"}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-5 border-primary/30">
            <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Overall summary</div>
            <p className="text-sm whitespace-pre-wrap">{report.overall_summary}</p>
          </Card>

          <p className="text-xs text-muted-foreground italic mt-4">
            Draft — Educator/IEP Team Review Required. Statements are generated only from your recorded data; verify before sharing with parents.
          </p>
        </>
      )}

      {!loading && !report && s.length > 0 && (
        <EmptyState
          icon={FileText}
          title="No report drafted yet"
          description="Select a student and generate a report — CaseCue turns your progress data into parent-ready statements."
        />
      )}

      <h2 className="text-lg font-semibold mb-4 mt-8">Report history</h2>
      <ReportHistory
        reports={savedReports}
        onLoad={(r) => { setStudentId(r.student_id); setReport(r.content); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onDelete={async (rid) => { await base44.entities.SavedReport.delete(rid); refetchReports(); }}
      />
    </div>
  );
}
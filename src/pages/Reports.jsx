import React, { useMemo } from "react";
import { FileBarChart, Download, CalendarClock, AlertCircle, Target, Users, FileWarning, TrendingUp } from "lucide-react";
import ExportGate from "@/components/shared/ExportGate";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

export default function Reports() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 300), []);
  const { data: progress } = useAsync(() => base44.entities.ProgressData.list('-date', 500), []);
  const { data: meetings } = useAsync(() => base44.entities.Meeting.list('date', 100), []);

  const s = students || [];
  const reports = useMemo(() => {
    const iepsDue = s.filter((st) => { const d = daysUntil(st.annual_review_due); return d !== null && d >= 0 && d <= 60; });
    const reevalsDue = s.filter((st) => { const d = daysUntil(st.reevaluation_due); return d !== null && d >= 0 && d <= 90; });
    const withRecent = new Set((progress || []).filter((p) => { const d = new Date(p.date); return (Date.now() - d) / 86400000 <= 14; }).map((p) => p.student_id));
    const missingData = s.filter((st) => !withRecent.has(st.id));
    const goalsNoBaseline = (goals || []).filter((g) => !g.baseline);
    const upcomingMeetings = (meetings || []).filter((m) => { const d = daysUntil(m.date); return d !== null && d >= 0; });
    return { iepsDue, reevalsDue, missingData, goalsNoBaseline, upcomingMeetings, total: s.length, goalCount: (goals || []).length };
  }, [students, goals, progress, meetings]);

  const exportReport = () => {
    const blob = new Blob([JSON.stringify({ generated: new Date().toISOString(), caseload: s, reports }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `casecue-report-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
  };

  const cards = [
    { label: "Caseload status", value: reports.total, sub: "active students", icon: Users, items: s.slice(0, 5).map((st) => `${st.first_name} ${st.last_name} — Grade ${st.grade || "?"}`) },
    { label: "Upcoming IEPs (60 days)", value: reports.iepsDue.length, icon: CalendarClock, items: reports.iepsDue.map((st) => `${st.first_name} ${st.last_name} — ${st.annual_review_due}`) },
    { label: "Reevaluations (90 days)", value: reports.reevalsDue.length, icon: FileWarning, items: reports.reevalsDue.map((st) => `${st.first_name} ${st.last_name} — ${st.reevaluation_due}`) },
    { label: "Missing data (14 days)", value: reports.missingData.length, icon: AlertCircle, items: reports.missingData.map((st) => `${st.first_name} ${st.last_name}`) },
    { label: "Goals missing baseline", value: reports.goalsNoBaseline.length, icon: Target, items: reports.goalsNoBaseline.slice(0, 5).map((g) => g.goal_text?.slice(0, 60)) },
    { label: "Upcoming meetings", value: reports.upcomingMeetings.length, icon: TrendingUp, items: reports.upcomingMeetings.slice(0, 5).map((m) => `${m.title} — ${m.date}`) },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Caseload status, deadlines, missing data, and workflow insights at a glance." icon={FileBarChart}
        actions={
          <ExportGate documentName="Caseload report" onExport={exportReport}>
            <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export report</Button>
          </ExportGate>
        } />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{c.label}</span>
              <c.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold mt-2">{c.value}</div>
            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
              {c.items.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : c.items.map((it, i) => <div key={i} className="text-xs text-muted-foreground truncate">{it}</div>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
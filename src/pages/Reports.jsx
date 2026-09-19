import React, { useMemo } from "react";
import { FileBarChart, CalendarClock, AlertCircle, Target, Users, FileWarning, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import DataExportBar from "@/components/shared/DataExportBar";
import ReportBuilderPanel from "@/components/shared/ReportBuilderPanel";
import { REPORT_DEFINITIONS } from "@/lib/caseReports";
import { textSection, sheetFromTable, safeFilename } from "@/lib/reportExport";
import { DATA_BANNER } from "@/components/shared/ReportBuilderPanel";
import CaseloadProgressPacket from "@/components/reports/CaseloadProgressPacket";
import { formatDate } from '@/lib/dateUtils';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

export default function Reports() {
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 300), []);
  const { data: progress } = useAsync(() => base44.entities.ProgressData.list('-date', 500), []);
  const { data: meetings } = useAsync(() => base44.entities.Meeting.list('date', 100), []);
  const { data: sessions } = useAsync(() => base44.entities.SessionRecord.list('-date', 500), []);
  const { data: assignments } = useAsync(() => base44.entities.GradebookAssignment.list('-date', 200), []);
  const { data: rawSchedule } = useAsync(() => base44.entities.ScheduleEntry.list('-updated_date', 300), []);
  const schedule = useMemo(() => (rawSchedule || []).filter((e) => (e.workspace || 'sped') === 'sped'), [rawSchedule]);

  const s = students || [];
  const reports = useMemo(() => {
    const iepsDue = s.filter((st) => { const d = daysUntil(st.annual_review_due); return d !== null && d >= 0 && d <= 60; });
    const reevalsDue = s.filter((st) => { const d = daysUntil(st.reevaluation_due); return d !== null && d >= 0 && d <= 90; });
    const withRecent = new Set((progress || []).filter((p) => { const d = new Date(p.date); return (Date.now() - d) / 86400000 <= 14; }).map((p) => p.student_id));
    const missingData = s.filter((st) => !withRecent.has(st.id));
    const goalsNoBaseline = (goals || []).filter((g) => !g.baseline);
    const upcomingMeetings = (meetings || []).filter((m) => { const d = daysUntil(m.date); return d !== null && d >= 0; });
    return { iepsDue, reevalsDue, missingData, goalsNoBaseline, upcomingMeetings, total: s.length, goalCount: (goals || []).length };
  }, [s, goals, progress, meetings]);

  const cards = [
    { label: "Caseload status", value: reports.total, sub: "active students", icon: Users, items: s.slice(0, 5).map((st) => `${st.first_name} ${st.last_name} — Grade ${st.grade || "?"}`) },
    { label: "Upcoming IEPs (60 days)", value: reports.iepsDue.length, icon: CalendarClock, items: reports.iepsDue.map((st) => `${st.first_name} ${st.last_name} — ${formatDate(st.annual_review_due)}`) },
    { label: "Reevaluations (90 days)", value: reports.reevalsDue.length, icon: FileWarning, items: reports.reevalsDue.map((st) => `${st.first_name} ${st.last_name} — ${formatDate(st.reevaluation_due)}`) },
    { label: "Missing data (14 days)", value: reports.missingData.length, icon: AlertCircle, items: reports.missingData.map((st) => `${st.first_name} ${st.last_name}`) },
    { label: "Goals missing baseline", value: reports.goalsNoBaseline.length, icon: Target, items: reports.goalsNoBaseline.slice(0, 5).map((g) => g.goal_text?.slice(0, 60)) },
    { label: "Upcoming meetings", value: reports.upcomingMeetings.length, icon: TrendingUp, items: reports.upcomingMeetings.slice(0, 5).map((m) => `${m.title} — ${formatDate(m.date)}`) },
  ];

  const snapshotSections = useMemo(
    () => cards.map((c) => textSection(c.label, [`${c.value} total`, ...c.items.map(String)])),
     
    [reports]
  );
  const caseloadRows = s.map((st) => [
    `${st.first_name} ${st.last_name}`,
    st.grade || "—",
    st.eligibility_category || "—",
    st.iep_date || "—",
    st.annual_review_due || "—",
    st.reevaluation_due || "—",
    st.status || "active",
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Caseload status, deadlines, missing data, and workflow insights — every report printable and exportable."
        icon={FileBarChart}
        actions={
          <DataExportBar
            title="Caseload Status Snapshot"
            subtitle={`Generated ${new Date().toLocaleDateString()} · ${s.length} student(s)`}
            sections={snapshotSections}
            sheets={[sheetFromTable("Caseload", ["Student", "Grade", "Eligibility", "IEP Date", "Review Due", "Reeval Due", "Status"], caseloadRows)]}
            json={{
              generated: new Date().toISOString(),
              caseload: s,
              goals: goals || [],
              progress: progress || [],
              meetings: meetings || [],
              summary: { total: reports.total, goalCount: reports.goalCount, iepsDue: reports.iepsDue.length, reevalsDue: reports.reevalsDue.length, missingData: reports.missingData.length },
            }}
            filename={safeFilename("Caseload-Snapshot")}
            banner={DATA_BANNER}
            exclude={["save"]}
          />
        }
      />

      <CaseloadProgressPacket students={s} goals={goals || []} progress={progress || []} sessions={sessions || []} />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

      <ReportBuilderPanel
        definitions={REPORT_DEFINITIONS}
        data={{
          students: s,
          goals: goals || [],
          progress: progress || [],
          meetings: meetings || [],
          sessions: sessions || [],
          assignments: assignments || [],
          schedule: schedule || [],
        }}
        heading="Report Generator — Student, Parent, Service, Compliance, Caseload & Meeting Reports"
        historyMode="all"
      />
    </div>
  );
}

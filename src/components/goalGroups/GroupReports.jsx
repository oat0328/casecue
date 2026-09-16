import React, { useMemo } from "react";
import { X, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import DataExportBar from "@/components/shared/DataExportBar";
import ChartCard from "@/components/shared/ChartCard";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import { saveReportToHistory } from "@/lib/reportExport";
import { buildGroupSummaryReport, buildGroupReport, weeklyGroupMinutes } from "@/lib/goalGroupReporting";
import { DATA_BANNER } from "@/components/shared/ReportBuilderPanel";

// Goal Groups exports: a caseload-wide Goal Group Summary (full export bar)
// plus a per-group report panel with roster, goals, attendance, growth, and a
// minutes-by-week chart.
export default function GroupReports({
  groups = [],
  students = [],
  goals = [],
  progress = [],
  sessions = [],
  selectedGroup,
  onClear,
  onSelectGroup,
}) {
  const { toast } = useToast();

  const summary = useMemo(
    () => buildGroupSummaryReport({ groups, students, goals, sessions }),
    [groups, students, goals, sessions]
  );

  const groupReport = useMemo(
    () => (selectedGroup ? buildGroupReport({ group: selectedGroup, students, goals, progress, sessions }) : null),
    [selectedGroup, students, goals, progress, sessions]
  );

  const chartData = useMemo(
    () => (selectedGroup ? weeklyGroupMinutes(sessions, selectedGroup.goal_area) : []),
    [sessions, selectedGroup]
  );

  const save = async (report, report_type) => {
    try {
      await saveReportToHistory({
        student_id: "caseload",
        student_name: "Caseload report",
        report_type,
        title: report.title,
        subtitle: report.subtitle,
        sections: report.sections,
        params: { report_key: report_type },
        banner: DATA_BANNER,
      });
      toast({ title: "Saved to report history" });
    } catch (e) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Goal Group Summary
            </h3>
            <p className="text-xs text-muted-foreground">
              Every group with student counts, goals, sessions, and minutes — export the full caseload summary or open
              a single group's report below.
            </p>
          </div>
          <DataExportBar
            title={summary.title}
            subtitle={summary.subtitle}
            sections={summary.sections}
            sheets={summary.sheets}
            filename={summary.filename}
            banner={DATA_BANNER}
            onSave={() => save(summary, "goal_group_summary")}
          />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {groups.slice(0, 6).map((g) => (
            <button
              key={g.goal_area}
              onClick={() => onSelectGroup && onSelectGroup(g)}
              className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                selectedGroup?.goal_area === g.goal_area
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30 hover:text-primary"
              }`}
            >
              {g.goal_area}
              <span className="text-xs text-muted-foreground ml-1">· {g.students.length} student(s)</span>
            </button>
          ))}
        </div>
      </Card>

      {selectedGroup && groupReport && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h4 className="font-semibold">{groupReport.title}</h4>
              <p className="text-xs text-muted-foreground">{groupReport.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <DataExportBar
                title={groupReport.title}
                subtitle={groupReport.subtitle}
                sections={groupReport.sections}
                sheets={groupReport.sheets}
                filename={groupReport.filename}
                banner={DATA_BANNER}
                onSave={() => save(groupReport, "goal_group_report")}
              />
              {onClear && (
                <Button variant="ghost" size="icon" onClick={onClear}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <ChartCard
              title={`${selectedGroup.goal_area} — Minutes by Week`}
              subtitle="Logged session minutes per week for this group"
              data={chartData}
              filename={`CaseCue-${selectedGroup.goal_area.replace(/[^a-z0-9]+/gi, "-")}-Minutes`}
              height={180}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="Week" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="Minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {groupReport.sections.map((s, i) => (
                <div key={i}>
                  <h5 className="text-sm font-semibold text-primary">{s.heading}</h5>
                  {s.body && <p className="text-xs whitespace-pre-wrap mt-0.5">{s.body}</p>}
                </div>
              ))}
            </div>
          </div>
          <AiDisclaimer extra="This report is data-derived, not system-written — but educator review is still required before sharing." />
        </Card>
      )}
    </div>
  );
}
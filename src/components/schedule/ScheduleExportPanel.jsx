import React from "react";
import { Printer, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportBar from "@/components/shared/ExportBar";
import { exportXlsx } from "@/lib/xlsxExport";
import { scheduleSections, caseloadSections, rosterSections, scheduleRows, SCHEDULE_HEADERS, byGroup, studentName, DELIVERY_LABEL, formatScheduleTime } from "@/lib/scheduleUtils";

const BANNER = "Instruction & Schedule — generated from your saved CaseCue data.";

// Print & Export: weekly schedule, caseload schedule, and group rosters in
// Print / PDF / DOCX / Email / Share, plus a full Excel workbook.
export default function ScheduleExportPanel({ entries, students, timeFormat = "12h" }) {
  const { toast } = useToast();

  const weekly = scheduleSections(entries, students, timeFormat);
  const caseload = caseloadSections(entries, students, timeFormat);
  const roster = rosterSections(entries, students, timeFormat);

  const caseloadRows = (students || [])
    .filter((s) => s.status !== "exited")
    .flatMap((s) => {
      const list = (entries || []).filter((e) => !e.archived && (e.student_ids || []).includes(s.id));
      return list.length
        ? list.map((e) => [`${s.first_name} ${s.last_name}`, e.day, `${formatScheduleTime(e.start_time, timeFormat)}-${formatScheduleTime(e.end_time, timeFormat)}`, e.group_name, DELIVERY_LABEL[e.delivery] || e.delivery, e.service_minutes || 0, e.teacher_classroom || ""])
        : [[`${s.first_name} ${s.last_name}`, "", "", "Not scheduled", "", 0, ""]];
    });

  const rosterRows = byGroup(entries).flatMap((g) =>
    g.entries.map((e) => [g.name, e.day, `${formatScheduleTime(e.start_time, timeFormat)}-${formatScheduleTime(e.end_time, timeFormat)}`, e.teacher_classroom || "", [...g.studentIds].map((id) => studentName(students, id)).join(", ")])
  );

  const exportExcel = () => {
    exportXlsx("casecue-schedule", [
      { name: "Weekly Schedule", headers: SCHEDULE_HEADERS, rows: scheduleRows(entries, students, timeFormat) },
      { name: "Caseload Schedule", headers: ["Student", "Day", "Time", "Group", "Delivery", "Minutes", "Teacher / Location"], rows: caseloadRows },
      { name: "Group Roster", headers: ["Group", "Day", "Time", "Teacher / Location", "Students"], rows: rosterRows },
    ]);
    toast({ title: "Excel workbook downloaded" });
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Printer className="h-4 w-4 text-primary" /> Print & Export</h3>
        <p className="text-sm text-muted-foreground mt-1">Weekly schedule, caseload schedule, and group rosters — print-ready or as files.</p>
      </div>
      {[
        { label: "Weekly Schedule", title: "Weekly Instruction & Schedule", filename: "casecue-weekly-schedule", sections: weekly },
        { label: "Caseload Schedule", title: "Caseload Schedule", filename: "casecue-caseload-schedule", sections: caseload },
        { label: "Group Roster", title: "Group Rosters", filename: "casecue-group-rosters", sections: roster },
      ].map((item) => (
        <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border pt-3 first:border-0 first:pt-0">
          <span className="text-sm font-medium">{item.label}</span>
          <ExportBar
            title={item.title}
            subtitle="Generated from your saved schedule"
            sections={item.sections}
            filename={item.filename}
            banner={BANNER}
          />
        </div>
      ))}
      <div className="border-t border-border pt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Full Excel Workbook (all 3 sheets)</span>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Download Excel
        </Button>
      </div>
    </Card>
  );
}
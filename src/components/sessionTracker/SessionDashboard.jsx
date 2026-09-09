import React from "react";
import { ClipboardList, Clock, Percent, Target, Users, CalendarClock } from "lucide-react";
import { StatCard } from "@/components/ui/cards";
import { rangeSummary } from "@/lib/sessionReporting";

// Summary cards across the whole caseload's recorded sessions, plus this
// week's scheduled service blocks from the Schedule.
export default function SessionDashboard({ sessions, students, goals, upcomingServices }) {
  const sum = rangeSummary(sessions);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <StatCard label="Total Sessions" value={sum.total} sublabel="all recorded sessions" icon={ClipboardList} tone="blue" />
      <StatCard
        label="Minutes Delivered"
        value={sum.minutes}
        sublabel={`${sum.deliveredCount} delivered sessions`}
        icon={Clock}
        tone="green"
      />
      <StatCard
        label="Attendance Rate"
        value={sum.attendanceRate != null ? `${sum.attendanceRate}%` : "—"}
        sublabel={`${sum.deliveredCount} attended · ${sum.missedCount} missed`}
        icon={Percent}
        tone={sum.attendanceRate != null && sum.attendanceRate < 80 ? "amber" : "default"}
      />
      <StatCard label="Goals Worked On" value={sum.goalsWorkedOn} sublabel={`of ${(goals || []).length} goals on file`} icon={Target} />
      <StatCard label="Students Seen" value={sum.studentsSeen} sublabel={`of ${(students || []).length} students on caseload`} icon={Users} />
      <StatCard
        label="Upcoming Services"
        value={upcomingServices ?? 0}
        sublabel="scheduled blocks this week"
        icon={CalendarClock}
        tone="blue"
      />
    </div>
  );
}
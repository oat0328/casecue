import React from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import ChartCard from "@/components/shared/ChartCard";
import {
  weeklyAssignmentData, weeklyGradeTrendData, studentTrendData, weeklyAttendanceData
} from "@/lib/gradebookReporting";

// Gradebook analytics: assignment completion, grade trends, per-student
// progress trends, and attendance (from logged sessions). Every chart has
// its own Print / PDF / Excel / CSV / Image export buttons.
export default function GradebookCharts({ assignments = [], sessions = [], students = [] }) {
  const completion = weeklyAssignmentData(assignments);
  const gradeTrend = weeklyGradeTrendData(assignments);
  const trend = studentTrendData(assignments, students);
  const attendance = weeklyAttendanceData(sessions);
  const hasAssignments = assignments.length > 0;

  if (!hasAssignments && !sessions.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Add assignments (and log sessions in Session Tracker) to see gradebook charts.
      </p>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ChartCard
        title="Assignment Completion"
        subtitle="Assignments logged per week"
        data={completion}
        filename="CaseCue-Assignment-Completion"
        height={200}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={completion}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="Week" fontSize={10} />
            <YAxis allowDecimals={false} fontSize={10} />
            <Tooltip />
            <Bar dataKey="Assignments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Grade Trends"
        subtitle="Caseload average % per week"
        data={gradeTrend}
        filename="CaseCue-Grade-Trends"
        height={200}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={gradeTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="Week" fontSize={10} />
            <YAxis domain={[0, 100]} fontSize={10} />
            <Tooltip />
            <Line type="monotone" dataKey="Average %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Progress Trends"
        subtitle="Assignment % over time — top students"
        data={trend.rows}
        filename="CaseCue-Progress-Trends"
        height={200}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="Date" fontSize={10} />
            <YAxis domain={[0, 100]} fontSize={10} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {trend.names.map((n, i) => (
              <Line key={n} type="monotone" dataKey={n} strokeWidth={2} dot={{ r: 2 }} connectNulls
                stroke={["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#64748b"][i % 6]} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Attendance Trends"
        subtitle="Sessions and student attendances per week"
        data={attendance}
        filename="CaseCue-Attendance-Trends"
        height={200}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={attendance}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="Week" fontSize={10} />
            <YAxis allowDecimals={false} fontSize={10} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Sessions" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Student Attendances" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
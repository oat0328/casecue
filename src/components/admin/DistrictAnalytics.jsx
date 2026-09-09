import React, { useMemo } from "react";
import { Users, Target, CalendarClock, Timer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card, StatCard } from "@/components/ui/cards";
import { computeGoalStatus, GOAL_STATUS_ORDER } from "@/lib/goalStatus";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const STATUS_COLORS = {
  met: "#10b981", on_track: "#22c55e", progressing: "#eab308",
  intervention: "#f59e0b", at_risk: "#ef4444", no_data: "#9ca3af",
};
const STATUS_LABELS = {
  met: "Goal Met", on_track: "On Track", progressing: "Making progress",
  intervention: "Needs intervention", at_risk: "At risk", no_data: "No data",
};

// District-level analytics for admins: caseload, compliance deadlines,
// goal achievement, and service delivery across the organization.
export default function DistrictAnalytics() {
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 500), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 500), []);
  const { data: progress } = useAsync(() => base44.entities.ProgressData.list('date', 1000), []);
  const { data: sessions } = useAsync(() => base44.entities.SessionLog.list('-date', 500), []);

  const stats = useMemo(() => {
    const s = students || [];
    const gs = goals || [];
    const now = new Date();
    const inDays = (d, n) => d && new Date(d) >= now && new Date(d) <= new Date(now.getTime() + n * 86400000);
    const isOverdue = (d) => d && new Date(d) < now;

    // Compliance attention list — overdue and due-within-30-days items, deduped per student
    const compliance = [];
    const seen = new Set();
    s.forEach((x) => {
      const items = [];
      if (isOverdue(x.annual_review_due)) items.push({ label: "Annual review overdue", date: x.annual_review_due, urgent: true });
      else if (inDays(x.annual_review_due, 30)) items.push({ label: "Annual review due", date: x.annual_review_due, urgent: false });
      if (isOverdue(x.reevaluation_due)) items.push({ label: "Reevaluation overdue", date: x.reevaluation_due, urgent: true });
      else if (inDays(x.reevaluation_due, 30)) items.push({ label: "Reevaluation due", date: x.reevaluation_due, urgent: false });
      if (items.length) { seen.add(x.id); compliance.push({ student: x, items }); }
    });

    // Goal achievement from logged progress data
    const studentById = Object.fromEntries(s.map((x) => [x.id, x]));
    const progressByGoal = {};
    (progress || []).forEach((p) => {
      if (p.goal_id) (progressByGoal[p.goal_id] = progressByGoal[p.goal_id] || []).push({ date: p.date, percentage: p.percentage });
    });
    const statusCounts = {};
    let withData = 0;
    let metCount = 0;
    gs.forEach((g) => {
      const st = computeGoalStatus(g, progressByGoal[g.id] || [], studentById[g.student_id]?.annual_review_due);
      statusCounts[st.key] = (statusCounts[st.key] || 0) + 1;
      if (st.key !== "no_data") withData += 1;
      if (st.key === "met") metCount += 1;
    });

    // Service delivery this calendar month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthSessions = (sessions || []).filter((x) => x.date >= monthStart);
    const monthMinutes = monthSessions.reduce((sum, x) => sum + (x.minutes || 0), 0);

    return {
      totalStudents: s.length,
      activeStudents: s.filter((x) => x.status === "active").length,
      compliance,
      statusCounts,
      achievementRate: withData ? Math.round((metCount / withData) * 100) : null,
      monthSessions: monthSessions.length,
      monthMinutes,
    };
  }, [students, goals, progress, sessions]);

  if (!students || !goals || !progress) {
    return <div className="py-10 text-center text-muted-foreground">Loading district analytics…</div>;
  }

  const chartData = GOAL_STATUS_ORDER.filter((k) => stats.statusCounts[k]).map((k) => ({
    status: STATUS_LABELS[k], count: stats.statusCounts[k], key: k,
  }));

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-lg font-semibold mb-1">District analytics</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Caseload, compliance, goal achievement, and service delivery across your organization.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Active caseload" value={`${stats.activeStudents}/${stats.totalStudents}`} icon={Users} />
        <StatCard label="Goals at target" value={stats.achievementRate != null ? `${stats.achievementRate}%` : "—"} icon={Target} tone="green" sublabel="Of goals with progress data" />
        <StatCard label="Compliance due ≤30 days" value={stats.compliance.filter((c) => c.items.some((i) => !i.urgent)).length} icon={CalendarClock} tone="amber" sublabel={`${stats.compliance.filter((c) => c.items.some((i) => i.urgent)).length} overdue`} />
        <StatCard label="Service minutes this month" value={stats.monthMinutes} icon={Timer} tone="blue" sublabel={`${stats.monthSessions} sessions logged`} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Goal status distribution</h3>
          {chartData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" fontSize={11} interval={0} angle={-15} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8">No goals on file yet.</p>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-3">Compliance attention list</h3>
          {stats.compliance.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">No overdue or upcoming deadlines in the next 30 days.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {stats.compliance.map(({ student, items }) => (
                <div key={student.id} className="rounded-lg border border-border p-3">
                  <div className="text-sm font-medium">{student.first_name} {student.last_name} <span className="text-muted-foreground font-normal">· Grade {student.grade || "—"}</span></div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {items.map((it, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${it.urgent ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        {it.label} — {it.date}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
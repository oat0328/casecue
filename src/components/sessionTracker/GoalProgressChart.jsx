import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/cards";
import { computeQuantitative } from "@/lib/sessionCalc";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Goal-progress view built from verified session data: percentage over time,
// data-point count, date range, average, and a missing-data alert.
export default function GoalProgressChart({ sessions, goals }) {
  const [goalId, setGoalId] = useState("");

  const goalSessions = useMemo(() => {
    const forGoal = (sessions || []).filter((s) => s.goal_id === (goalId || ((goals || [])[0]?.id || "")));
    return forGoal
      .filter((s) => {
        const q = s.quantitative || {};
        return q.percentage != null || (q.correct != null && q.total);
      })
      .map((s) => {
        const q = s.quantitative || {};
        const pct = q.percentage != null ? q.percentage : computeQuantitative(q.correct, q.total).percentage;
        return { date: s.date, percentage: pct, prompt_level: q.prompt_level };
      })
      .filter((p) => p.percentage != null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, goals, goalId]);

  const goalsWithIds = (goals || []).filter((g) => (sessions || []).some((s) => s.goal_id === g.id));
  const activeGoal = (goals || []).find((g) => g.id === (goalId || goalsWithIds[0]?.id));
  const avg = goalSessions.length ? Math.round((goalSessions.reduce((sum, p) => sum + p.percentage, 0) / goalSessions.length) * 10) / 10 : null;

  if (!goalsWithIds.length) {
    return <Card className="p-5"><p className="text-sm text-muted-foreground">No goal-linked session data yet — link sessions to a goal to see progress here.</p></Card>;
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <h3 className="font-semibold">Goal progress from session data</h3>
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={goalId || goalsWithIds[0]?.id} onChange={(e) => setGoalId(e.target.value)}>
          {goalsWithIds.map((g) => <option key={g.id} value={g.id}>{g.goal_area || "Goal"}</option>)}
        </select>
      </div>
      {activeGoal && (
        <p className="text-xs text-muted-foreground mb-2">Baseline: {activeGoal.baseline || "not recorded"} · Target: {activeGoal.target || "not recorded"}</p>
      )}
      {goalSessions.length < 3 && (
        <p className="text-amber-700 text-xs mb-2">⚠ Only {goalSessions.length} data point{goalSessions.length === 1 ? "" : "s"} recorded — insufficient data to describe a trend. This is not evidence of progress or lack of progress.</p>
      )}
      {goalSessions.length > 0 ? (
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={goalSessions} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, "Performance"]} />
              <Line type="monotone" dataKey="percentage" stroke="hsl(255 82% 58%)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No percentage data recorded for this goal yet.</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
        <span>Data points: <strong>{goalSessions.length}</strong></span>
        {goalSessions.length > 0 && <span>Date range: <strong>{goalSessions[0].date} → {goalSessions[goalSessions.length - 1].date}</strong></span>}
        {avg != null && <span>Average: <strong>{avg}%</strong></span>}
      </div>
    </Card>
  );
}
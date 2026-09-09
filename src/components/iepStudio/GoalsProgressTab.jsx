import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PlusCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { computeGoalStatus } from "@/lib/goalStatus";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

const STATUS_META = {
  met: { label: "Goal Met", color: "#10b981" },
  on_track: { label: "On Track", color: "#22c55e" },
  progressing: { label: "Making Progress", color: "#eab308" },
  intervention: { label: "Needs Monitoring", color: "#f59e0b" },
  at_risk: { label: "At Risk", color: "#ef4444" },
  no_data: { label: "No Data Yet", color: "#9ca3af" },
};

const parseNum = (v) => {
  const m = String(v ?? "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

const pctOf = (p) =>
  p.percentage ?? (p.correct != null && p.total ? Math.round((p.correct / p.total) * 100) : null);

// Tab 5 — Goals & Progress: baseline, current, target, growth needed, and
// auto-updating line + bar charts for every goal. Live-updates on new data.
export default function GoalsProgressTab({ student }) {
  const [goals, setGoals] = useState(null);
  const [progress, setProgress] = useState([]);

  const load = useCallback(async () => {
    try {
      const gs = await base44.entities.Goal.filter({ student_id: student.id });
      const ps = await base44.entities.ProgressData.filter({ student_id: student.id }, 'date', 500);
      setGoals(gs || []);
      setProgress(ps || []);
    } catch {
      setGoals([]);
    }
  }, [student?.id]);

  useEffect(() => {
    load();
    const unsubGoals = base44.entities.Goal.subscribe(() => load());
    const unsubProgress = base44.entities.ProgressData.subscribe(() => load());
    return () => { unsubGoals(); unsubProgress(); };
  }, [load]);

  if (!goals) return <p className="text-muted-foreground text-sm">Loading goals…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Charts update automatically whenever progress data is entered.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/data-center"><PlusCircle className="h-4 w-4 mr-1.5" /> Log progress data</Link>
        </Button>
      </div>

      {goals.length === 0 && (
        <p className="text-muted-foreground text-sm">No goals on file yet — add goals from the student's 360 page or the IEP Builder draft.</p>
      )}

      <div className="space-y-4">
        {goals.map((g) => {
          const entries = progress
            .filter((p) => p.goal_id === g.id)
            .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
          const latest = entries[entries.length - 1];
          const current = latest ? pctOf(latest) : null;
          const st = computeGoalStatus(g, entries, student.annual_review_due) || { key: "no_data" };
          const meta = STATUS_META[st.key] || STATUS_META.no_data;
          const targetNum = parseNum(g.target);
          const growthNeeded = current != null && targetNum != null
            ? `${Math.max(0, Math.round(targetNum - current))} points to target`
            : "—";

          const lineData = entries
            .map((p) => ({ date: (p.date || "").slice(5), pct: pctOf(p) }))
            .filter((d) => d.pct != null);
          const barData = entries
            .filter((p) => p.correct != null && p.total)
            .map((p) => ({ date: (p.date || "").slice(5), correct: p.correct, missed: Math.max(0, p.total - p.correct) }));

          return (
            <Card key={g.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{g.goal_area || "Goal"}</span>
                  <p className="text-sm font-medium mt-0.5">{g.goal_text}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}11` }}>
                  {meta.label}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  ["Baseline", g.baseline || "—"],
                  ["Current Performance", current != null ? `${current}%` : "—"],
                  ["Target", g.target || "—"],
                  ["Growth Needed", growthNeeded],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted/60 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-sm font-semibold mt-0.5">{value}</div>
                  </div>
                ))}
              </div>

              {lineData.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Progress trend</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis domain={[0, 100]} fontSize={11} />
                          <Tooltip />
                          <Line type="monotone" dataKey="pct" name="%" stroke={meta.color} strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {barData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Correct / missed per session</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" fontSize={11} />
                            <YAxis allowDecimals={false} fontSize={11} />
                            <Tooltip />
                            <Bar dataKey="correct" name="Correct" stackId="a" fill="#22c55e" radius={[4, 0, 0, 4]} />
                            <Bar dataKey="missed" name="Missed" stackId="a" fill="#fca5a5" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No progress data logged for this goal yet.</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
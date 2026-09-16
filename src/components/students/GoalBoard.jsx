import React, { useMemo, useState } from "react";
import { Sparkles, Loader2, Target } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { computeGoalStatus, GOAL_STATUS_ORDER } from "@/lib/goalStatus";
import GoalAiResults from "@/components/students/GoalAiResults";

const TONE_CLASSES = {
  green: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-500" },
  yellow: { badge: "bg-yellow-100 text-yellow-700", border: "border-yellow-300", bar: "bg-yellow-400" },
  amber: { badge: "bg-amber-100 text-amber-700", border: "border-amber-200", bar: "bg-amber-500" },
  red: { badge: "bg-red-100 text-red-700", border: "border-red-200", bar: "bg-red-500" },
  gray: { badge: "bg-muted text-muted-foreground", border: "border-border", bar: "bg-gray-300" },
};

function Sparkline({ points }) {
  if (!points || points.length < 2) return null;
  return (
    <div className="h-12 w-24 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <YAxis domain={[0, 100]} hide />
          <Line type="monotone" dataKey="percentage" stroke="hsl(217 91% 52%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Visual goal board for a student: per-goal status (Goal Met / On Track /
// Making Progress / Needs Intervention / At Risk) computed from progress data,
// plus a one-click progress analysis.
export default function GoalBoard({ student, goals, progress }) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState(null);
  const [running, setRunning] = useState(false);

  const boards = useMemo(() => {
    const byGoal = {};
    (progress || []).forEach((p) => {
      if (p.goal_id) (byGoal[p.goal_id] = byGoal[p.goal_id] || []).push({ date: p.date, percentage: p.percentage });
    });
    return (goals || []).map((g) => ({
      goal: g,
      status: computeGoalStatus(g, byGoal[g.id] || [], student?.annual_review_due),
    }));
  }, [goals, progress, student]);

  const counts = useMemo(() => {
    const c = {};
    boards.forEach((b) => { c[b.status.key] = (c[b.status.key] || 0) + 1; });
    return c;
  }, [boards]);

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("analyzeGoalProgress", { student_id: student.id });
      setAnalysis(res.data.analysis);
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e.response?.data?.error || e.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  if ((goals || []).length === 0) {
    return (
      <Card className="p-6 mb-6">
        <p className="text-sm text-muted-foreground">No goals on file yet — add goals to see the visual goal board here.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Goal board
        </h3>
        <div className="flex flex-wrap gap-2">
          {GOAL_STATUS_ORDER.filter((k) => counts[k]).map((k) => (
            <span key={k} className={`text-xs px-2.5 py-1 rounded-full font-medium ${TONE_CLASSES[boards.find((b) => b.status.key === k).status.tone].badge}`}>
              {counts[k]} {boards.find((b) => b.status.key === k).status.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {boards.map(({ goal: g, status: b }) => {
          const t = TONE_CLASSES[b.tone];
          return (
            <div key={g.id} className={`rounded-xl border p-4 ${t.border}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">{g.goal_area || "General"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.badge}`}>{b.label}</span>
              </div>
              <p className="mt-1 text-sm font-medium line-clamp-2">{g.goal_text}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {b.key !== "no_data" && <span>Current: <b>{b.latest}%</b></span>}
                <span>Target: <b>{b.targetPct}%</b></span>
                {b.key !== "no_data" && <span>Trend: <b>{b.trend > 0 ? "+" : ""}{b.trend} pts</b></span>}
                {b.key !== "no_data" && <span>Projected: <b>{b.projected}%</b></span>}
                <span>Data: <b>{b.dataPoints}</b></span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, b.latest || 0)}%` }} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {b.key === "no_data" ? "Log progress data to track this goal." : `${b.growthNeeded > 0 ? `${b.growthNeeded} pts to target` : "At target"}`}
                </span>
                <Sparkline points={b.points} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <Button onClick={runAnalysis} disabled={running} variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? "Analyzing…" : "Run progress analysis"}
        </Button>
      </div>

      {analysis && <GoalAiResults analysis={analysis} />}
    </Card>
  );
}
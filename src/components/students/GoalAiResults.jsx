import React from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Lightbulb, CheckCircle2, Target } from "lucide-react";
import { Card } from "@/components/ui/cards";

// Renders the AI goal analysis returned by the analyzeGoalProgress function.
export default function GoalAiResults({ analysis }) {
  const list = (items, className = "") =>
    (items || []).length > 0 ? (
      <ul className={`space-y-1.5 ${className}`}>
        {items.map((v, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="text-primary">•</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <b>Draft — Educator Review Required.</b> These are data summaries to support
          instructional decisions, not official determinations.
        </span>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">AI progress summary</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
      </Card>

      {(analysis.goals_at_risk || []).length > 0 && (
        <Card className="p-5 border-red-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" /> Goals needing attention
          </h3>
          <div className="space-y-3">
            {analysis.goals_at_risk.map((g, i) => (
              <div key={i} className="rounded-lg border border-red-100 bg-red-50/50 p-3 space-y-1">
                <p className="text-sm font-medium">{g.goal}</p>
                <p className="text-sm text-muted-foreground">{g.finding}</p>
                <p className="text-sm"><span className="font-medium">Suggested intervention:</span> {g.recommended_intervention}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(analysis.goals_likely_met || []).length > 0 && (
        <Card className="p-5 border-emerald-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Goals at or near target
          </h3>
          {list(analysis.goals_likely_met)}
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {(analysis.growth_areas || []).length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Growth areas
            </h3>
            {list(analysis.growth_areas)}
          </Card>
        )}
        {(analysis.regression_areas || []).length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" /> Regression areas
            </h3>
            {list(analysis.regression_areas)}
          </Card>
        )}
      </div>

      {(analysis.teacher_recommendations || []).length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> Recommended next steps
          </h3>
          {list(analysis.teacher_recommendations)}
        </Card>
      )}
    </div>
  );
}
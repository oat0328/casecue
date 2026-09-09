import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";

// Getting-started checklist on the Today page — shows until every step is done or it's dismissed.
export default function GettingStartedCard({ students, goals, progress }) {
  const [dismissed, setDismissed] = useState(false);
  const [checkedFlag, setCheckedFlag] = useState(false);
  const [profileFlag, setProfileFlag] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    base44.auth.me()
      .then((me) => { if (!cancelled) { setProfileFlag(!!me.getting_started_dismissed); setCheckedFlag(true); } })
      .catch(() => setCheckedFlag(true));
    return () => { cancelled = true; };
  }, []);

  const steps = [
    { label: "Add your students", hint: "Students", to: "/students", done: (students || []).length > 0 },
    { label: "Add an IEP goal", hint: "Goal bank available on each student", to: "/students", done: (goals || []).length > 0 },
    { label: "Log a progress data point", hint: "Data Center", to: "/data-center", done: (progress || []).length > 0 },
    { label: "Generate your first progress report", hint: "Progress Reports", to: "/progress-reports", done: false, optional: true },
  ];
  const allDone = steps.slice(0, 3).every((s) => s.done);

  const dismiss = async () => {
    setDismissed(true);
    try { await base44.auth.updateMe({ getting_started_dismissed: true }); } catch (e) { /* cosmetic flag */ }
  };

  if (!checkedFlag || dismissed || profileFlag || allDone) return null;

  return (
    <Card className="mb-8 p-6 border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl brand-gradient-soft flex items-center justify-center">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Get set up in minutes</h3>
            <p className="text-xs text-muted-foreground">Complete these steps to unlock CaseCue's full workflow.</p>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss checklist">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-2">
        {steps.map((s) => (
          <Link key={s.label} to={s.to} className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 hover:border-primary/40 transition-colors">
            {s.done
              ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />}
            <div>
              <div className={`text-sm font-medium ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.hint}{s.optional ? " · optional" : ""}</div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
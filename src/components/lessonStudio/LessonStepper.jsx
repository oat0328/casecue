import React from "react";
import { cn } from "@/lib/utils";

// Three-step guided workflow header for Lesson Studio.
export default function LessonStepper({ step, onStep, reachedStep }) {
  const STEPS = [
    { n: 1, label: "Upload & Analyze", hint: "Assignment in, verified analysis out" },
    { n: 2, label: "Build & Customize", hint: "AI draft, goals, videos, resources" },
    { n: 3, label: "Review & Export", hint: "Approve, export, connect" },
  ];
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {STEPS.map((s, i) => {
        const active = step === s.n;
        const done = step > s.n;
        const clickable = reachedStep >= s.n;
        return (
          <React.Fragment key={s.n}>
            {i > 0 && <div className={cn("hidden sm:block self-center h-px flex-1", done || active ? "bg-primary/40" : "bg-border")} />}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStep(s.n)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all min-w-0 sm:flex-1",
                active && "border-primary bg-primary/5 card-shadow",
                done && !active && "border-emerald-200 bg-emerald-50/60",
                !active && !done && "border-border bg-card",
                clickable ? "cursor-pointer hover:-translate-y-0.5" : "opacity-60 cursor-default"
              )}
            >
              <span className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                active ? "brand-gradient text-white" : done && !active ? "bg-emerald-500 text-white" : "bg-secondary text-secondary-foreground"
              )}>
                {done && !active ? "✓" : s.n}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold truncate", active && "text-primary")}>{s.label}</span>
                <span className="hidden sm:block text-xs text-muted-foreground truncate">{s.hint}</span>
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
import React from "react";
import { cn } from "@/lib/utils";

export default function LessonStepper({ step, onStep, reachedStep }) {
  const STEPS = [
    { n: 1, label: "Who & What", hint: "Choose students/group and give CaseCue the assignment" },
    { n: 2, label: "Create Lesson", hint: "IEP goals + full admin-ready plan, automatically" },
    { n: 3, label: "Teach & Save", hint: "Review, teach, record data, save only if useful" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {STEPS.map((s) => {
        const active=step===s.n, done=step>s.n, clickable=reachedStep>=s.n;
        return <button key={s.n} type="button" disabled={!clickable} onClick={()=>clickable&&onStep(s.n)} className={cn(
          "relative flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all min-w-0",
          active&&"border-primary bg-primary/5 shadow-sm ring-1 ring-primary/10", done&&!active&&"border-emerald-200 bg-emerald-50/60", !active&&!done&&"border-border bg-card", clickable?"cursor-pointer hover:-translate-y-0.5 hover:shadow-sm":"opacity-55 cursor-default") }>
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold",active?"brand-gradient text-white":done?"bg-emerald-500 text-white":"bg-secondary text-secondary-foreground")}>{done&&!active?"✓":s.n}</span>
          <span className="min-w-0"><span className={cn("block font-semibold",active&&"text-primary")}>{s.label}</span><span className="block text-xs text-muted-foreground mt-1 leading-4">{s.hint}</span></span>
        </button>;
      })}
    </div>
  );
}

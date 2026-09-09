import React, { useState } from "react";
import { FlaskConical, CheckCircle2, XCircle, AlertTriangle, Wand2, RotateCcw, Award } from "lucide-react";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

// Completely fictional student data for practice.
const SCENARIO = {
  student: { name: "Maya Rivera", grade: "4", eligibility: "Specific Learning Disability (SLD)" },
  sections: [
    { label: "Present Levels", text: "Maya struggles with reading. She has difficulty with comprehension. She receives support in the resource room." },
    { label: "Annual Goal", text: "Maya will improve reading comprehension by the end of the IEP year." },
    { label: "Accommodations", text: "Extended time on assignments; extra time on tests; small-group setting." },
    { label: "Services", text: "Resource room: 30 minutes per week. Service minutes on file: 60/week." },
  ],
};

// Answer key: which candidate issues are REAL issues in this scenario.
const CANDIDATES = [
  { id: "c1", text: "Present Levels: vague statement with no measurable detail", real: true, fix: "Rewrite: 'On the 4/15/26 district reading probe, Maya read 48 wpm (grade-level benchmark: 90 wpm) and answered 3/8 comprehension questions correctly.'" },
  { id: "c2", text: "Present Levels: no measurable baseline", real: true, fix: "Add baseline: 'Maya's current baseline is 48 wpm with 38% comprehension accuracy on grade-level probes.'" },
  { id: "c3", text: "Present Levels: strengths section missing", real: true, fix: "Add strengths: 'Maya has strong listening comprehension and verbal reasoning; she engages well in small-group discussion.'" },
  { id: "c4", text: "Goal: missing baseline", real: true, fix: "Add: 'Given a 4th-grade probe, Maya currently reads 48 wpm with 38% comprehension (baseline).'" },
  { id: "c5", text: "Goal: missing condition", real: true, fix: "Add condition: 'Given a 4th-grade reading passage and a graphic organizer…'" },
  { id: "c6", text: "Goal: missing observable/measurable skill", real: true, fix: "Specify skill: '…Maya will identify the main idea and answer literal comprehension questions…'" },
  { id: "c7", text: "Goal: missing measurable criterion", real: true, fix: "Add criterion: '…with 80% accuracy across 4 of 5 consecutive trials.'" },
  { id: "c8", text: "Goal: missing progress-monitoring / measurement method", real: true, fix: "Add: 'Progress monitored weekly via curriculum-based reading probes; data recorded as correct/total.'" },
  { id: "c9", text: "Accommodations: duplicate accommodations (extended time / extra time)", real: true, fix: "Consolidate to a single accommodation: 'Extended time (1.5x) on assignments and assessments.'" },
  { id: "d1", text: "Services: frequency inconsistent with weekly schedule", real: false, fix: "" },
  { id: "d2", text: "Accommodations: not connected to documented needs", real: false, fix: "" },
  { id: "d3", text: "Goal: poorly aligned with present levels", real: false, fix: "" },
];

export default function PracticeLab() {
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id) => { if (submitted) return; setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); };

  const realIssues = CANDIDATES.filter((c) => c.real);
  const correct = realIssues.filter((c) => selected.includes(c.id));
  const missed = realIssues.filter((c) => !selected.includes(c.id));
  const falsePositives = CANDIDATES.filter((c) => !c.real && selected.includes(c.id));
  const score = Math.max(0, Math.min(100, Math.round((correct.length - falsePositives.length) / realIssues.length * 100)));

  const reset = () => { setSelected([]); setSubmitted(false); };

  return (
    <div>
      <PageHeader title="Practice Lab" subtitle="Sharpen your IEP skills on completely fictional student data. First simulator: Fix This IEP." icon={FlaskConical} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="text-xs font-semibold text-primary uppercase tracking-wide">Fictional Student</div>
            <h3 className="text-xl font-bold mt-1">{SCENARIO.student.name}</h3>
            <p className="text-sm text-muted-foreground">Grade {SCENARIO.student.grade} · {SCENARIO.student.eligibility}</p>
            <div className="mt-5 space-y-4">
              {SCENARIO.sections.map((sec) => (
                <div key={sec.label}>
                  <div className="text-sm font-semibold">{sec.label}</div>
                  <div className="mt-1 rounded-xl bg-muted p-3 text-sm italic">"{sec.text}"</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-1">Identify the potential issues</h3>
            <p className="text-sm text-muted-foreground mb-4">Check every issue you spot in this IEP. Then run the CaseCue review to see how you did.</p>
            <div className="space-y-2">
              {CANDIDATES.map((c) => {
                const isSel = selected.includes(c.id);
                const wasCorrect = submitted && c.real && isSel;
                const wasMissed = submitted && c.real && !isSel;
                const wasFalse = submitted && !c.real && isSel;
                return (
                  <label key={c.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${wasCorrect ? "border-emerald-300 bg-emerald-50" : wasMissed ? "border-amber-300 bg-amber-50" : wasFalse ? "border-rose-300 bg-rose-50" : isSel ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <input type="checkbox" checked={isSel} onChange={() => toggle(c.id)} disabled={submitted} className="mt-0.5" />
                    <span className="text-sm flex-1">{c.text}</span>
                    {wasCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                    {wasMissed && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                    {wasFalse && <XCircle className="h-4 w-4 text-rose-600 shrink-0" />}
                  </label>
                );
              })}
            </div>
            {!submitted ? (
              <Button onClick={() => setSubmitted(true)} className="brand-gradient text-white mt-5">Run CaseCue IEP Review</Button>
            ) : (
              <Button variant="outline" onClick={reset} className="mt-5"><RotateCcw className="h-4 w-4 mr-1" /> Try again</Button>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {!submitted ? (
            <Card className="p-6 text-center">
              <FlaskConical className="h-10 w-10 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Review the fictional IEP and check the issues you find. Your practice score appears after you run the review.</p>
            </Card>
          ) : (
            <>
              <Card className="p-6 text-center">
                <Award className="h-10 w-10 text-primary mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">Simulation Complete</div>
                <div className="text-4xl font-bold text-gradient mt-1">{score} / 100</div>
                <p className="text-sm text-muted-foreground mt-2">You found {correct.length} of {realIssues.length} potential issues{falsePositives.length > 0 ? ` · ${falsePositives.length} false positive${falsePositives.length > 1 ? "s" : ""}` : ""}.</p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold text-sm mb-3">What you missed</h3>
                {missed.length === 0 ? <p className="text-sm text-emerald-600">You found every issue. Strong work!</p> : (
                  <div className="space-y-3">
                    {missed.map((c) => (
                      <div key={c.id} className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                        <div className="text-sm font-medium">{c.text}</div>
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-white p-2 text-xs">
                          <Wand2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span><strong>Fix With CaseCue:</strong> {c.fix}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold text-sm mb-2">Strongest area</h3>
                <p className="text-sm text-muted-foreground">{correct.length >= 6 ? "Goal writing" : "Present Levels"}</p>
                <h3 className="font-semibold text-sm mt-4 mb-2">Practice area</h3>
                <p className="text-sm text-muted-foreground">{missed.some((c) => c.id.startsWith("c1") || c.id.startsWith("c2")) ? "Present Levels → Goal Alignment" : "Goal measurement"}</p>
              </Card>
            </>
          )}
          <Card className="p-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Future simulators</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {["Build an Annual IEP", "Write Measurable Goals", "Present Levels Challenge", "Progress Monitoring Challenge", "IEP Meeting Prep", "Transfer Student Scenario", "Expired IEP Scenario", "BIP + IEP Alignment"].map((t) => <div key={t}>· {t}</div>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
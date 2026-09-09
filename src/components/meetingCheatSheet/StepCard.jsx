import React, { useState } from "react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Flag, FileText, Plus } from "lucide-react";
import { stepMeta } from "@/lib/cheatSheetSteps";

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

// One meeting step. Extracted information, suggested talking points, teacher notes,
// parent statements, and team decisions are visually separated.
export default function StepCard({ step, index, onPatch, onOpenOriginal }) {
  const [concern, setConcern] = useState("");
  const [decision, setDecision] = useState("");
  const meta = stepMeta(index);

  const patch = (p) => onPatch(p);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <span className="text-xs text-muted-foreground">Step {index + 1} of 32</span>
          <h3 className="text-lg font-bold">{step.title}</h3>
        </div>
        <div className="flex gap-1.5">
          {step.discussed && <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Discussed ✓</span>}
          {step.flagged && <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Follow-up</span>}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-2"><strong className="text-foreground">What to discuss:</strong> {meta.whatToDiscuss}</p>

      <div className="mt-4 rounded-xl bg-blue-50/60 border border-blue-100 p-3">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Extracted from the records</p>
        <p className="text-sm mt-1">{step.key_info}</p>
        <p className="text-xs text-blue-700/70 mt-1">Source: {step.source}</p>
      </div>

      {Array.isArray(step.talking_points) && step.talking_points.length > 0 && (
        <div className="mt-3 rounded-xl bg-primary/5 border border-primary/15 p-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Suggested talking points (suggestions — you present, the team decides)</p>
          <ul className="mt-1 space-y-1">
            {step.talking_points.map((t, i) => <li key={i} className="text-sm">• {t}</li>)}
          </ul>
        </div>
      )}

      {Array.isArray(step.questions) && step.questions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Questions to ask</p>
          <ul className="mt-1 space-y-0.5">
            {step.questions.map((q, i) => <li key={i} className="text-sm">? {q}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-secondary p-2.5"><span className="text-xs text-muted-foreground">Decisions already documented:</span><br />{step.documented_decisions || "None documented"}</div>
        <div className="rounded-lg bg-secondary p-2.5"><span className="text-xs text-muted-foreground">Decisions still required:</span><br />{step.required_decisions || "None"}</div>
      </div>

      {Array.isArray(step.parent_notes) && step.parent_notes.length > 0 && (
        <div className="mt-3 rounded-xl bg-purple-50 border border-purple-100 p-3">
          <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Parent statements</p>
          <ul className="mt-1 space-y-0.5">{step.parent_notes.map((c, i) => <li key={i} className="text-sm">“{c}”</li>)}</ul>
        </div>
      )}

      {Array.isArray(step.decisions) && step.decisions.length > 0 && (
        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Team decisions</p>
          <ul className="mt-1 space-y-0.5">{step.decisions.map((d, i) => <li key={i} className="text-sm">✓ {d}</li>)}</ul>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Add parent concern</p>
          <div className="flex gap-2">
            <input className={inputCls} value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="What the parent says…" />
            <Button size="sm" variant="outline" onClick={() => { if (concern.trim()) { patch({ parent_notes: [...(step.parent_notes || []), concern.trim()] }); setConcern(""); } }}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Record a decision</p>
          <div className="flex gap-2">
            <input className={inputCls} value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="What the team agreed…" />
            <Button size="sm" variant="outline" onClick={() => { if (decision.trim()) { patch({ decisions: [...(step.decisions || []), decision.trim()] }); setDecision(""); } }}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Private presenter notes (not shared)</p>
          <textarea className={inputCls} rows={2} value={step.presenter_notes || ""} onChange={(e) => patch({ presenter_notes: e.target.value })} />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Team notes</p>
          <textarea className={inputCls} rows={2} value={step.team_notes || ""} onChange={(e) => patch({ team_notes: e.target.value })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="sm" variant={step.discussed ? "ghost" : "outline"} className={step.discussed ? "text-emerald-600" : ""} onClick={() => patch({ discussed: !step.discussed })}>
          <ThumbsUp className="h-3.5 w-3.5 mr-1" /> {step.discussed ? "Unmark discussed" : "Mark discussed"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => patch({ flagged: !step.flagged })}>
          <Flag className="h-3.5 w-3.5 mr-1" /> {step.flagged ? "Unflag" : "Flag for follow-up"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenOriginal}>
          <FileText className="h-3.5 w-3.5 mr-1" /> Open original page
        </Button>
      </div>
    </Card>
  );
}
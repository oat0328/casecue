import React from "react";
import { AlertTriangle, Quote } from "lucide-react";
import { Card } from "@/components/ui/cards";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const textCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-base";
const labelCls = "block text-sm font-medium mb-2";

const toLines = (arr) => (Array.isArray(arr) ? arr : []).join("\n");
const fromLines = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);

const ARRAY_FIELDS = [
  ["skills", "Skills being measured"],
  ["standards_alignment", "Standards alignment (one per line)"],
  ["questions", "Questions or tasks found (one per line)"],
  ["prerequisite_skills", "Prerequisite skills (one per line)"],
  ["accessibility_barriers", "Potential accessibility barriers (one per line)"],
  ["suggested_accommodations", "Suggested accommodations (ideas to review against the IEP — one per line)"],
  ["citations", "Source citations (one per line)"],
];

// Step 1b — the teacher reviews and CORRECTS the assignment analysis before any
// lesson is generated. Every edit flows straight into generation.
export default function AnalysisReview({ analysis, onChange, onContinue }) {
  if (!analysis) return null;

  const set = (key, value) => onChange({ ...analysis, [key]: value });

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h3 className="font-semibold">Assignment analysis — correct anything, then continue</h3>
        <span className="text-xs rounded-full border border-primary/30 bg-primary/5 text-primary px-3 py-1">AI analysis · teacher-correctable</span>
      </div>
      <p className="text-xs text-muted-foreground mb-5">Anything you fix here is what the lesson plan is built from. Missing information stays “Not detected”.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="an-title">Detected title</label>
          <input id="an-title" className={inputCls} value={analysis.detected_title || ""} onChange={(e) => set("detected_title", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="an-subject">Subject</label>
          <input id="an-subject" className={inputCls} value={analysis.subject || ""} onChange={(e) => set("subject", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="an-grade">Grade level</label>
          <input id="an-grade" className={inputCls} value={analysis.grade_level || ""} onChange={(e) => set("grade_level", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="an-difficulty">Estimated difficulty</label>
          <input id="an-difficulty" className={inputCls} value={analysis.difficulty || ""} onChange={(e) => set("difficulty", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="an-time">Estimated completion time</label>
          <input id="an-time" className={inputCls} value={analysis.estimated_completion_time || ""} onChange={(e) => set("estimated_completion_time", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="an-confidence">Overall confidence</label>
          <input id="an-confidence" className={inputCls} value={analysis.confidence || ""} onChange={(e) => set("confidence", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="an-directions">Directions</label>
          <textarea id="an-directions" className={textCls} rows={2} value={analysis.directions || ""} onChange={(e) => set("directions", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
        {ARRAY_FIELDS.map(([key, label]) => (
          <div key={key} className={key === "questions" || key === "citations" ? "sm:col-span-2" : ""}>
            <label className={labelCls} htmlFor={`an-${key}`}>{label}</label>
            <textarea id={`an-${key}`} className={textCls} rows={key === "questions" ? 4 : 3} value={toLines(analysis[key])}
              onChange={(e) => set(key, fromLines(e.target.value))} />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="an-answer">Detected answer key (if one exists)</label>
          <textarea id="an-answer" className={textCls} rows={3} value={analysis.answer_key || ""} onChange={(e) => set("answer_key", e.target.value)} />
        </div>
      </div>

      {(analysis.page_summary || []).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Quote className="h-4 w-4 text-primary" /> Page-by-page summary</h4>
          <div className="space-y-4">
            {analysis.page_summary.map((p, i) => (
              <div key={i}>
                <label className={labelCls} htmlFor={`an-page-${i}`}>Page {p.page || i + 1}</label>
                <textarea id={`an-page-${i}`} className={textCls} rows={2} value={p.summary || ""}
                  onChange={(e) => {
                    const next = [...analysis.page_summary];
                    next[i] = { ...p, summary: e.target.value };
                    set("page_summary", next);
                  }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Analysis is AI-generated from the uploaded source only. Verify the detected skills and standards before building the lesson.</span>
      </div>
    </Card>
  );
}
import React from "react";
import { MEASUREMENT_TYPES, PROMPT_LEVELS, computeQuantitative, interpretDecimal } from "@/lib/sessionCalc";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

// Quantitative data entry: correct/total → fraction, decimal, percentage (4/15 → 0.267 → 26.7%).
// Entering 0.80 displays 80%. The original measurement is preserved and linked to the goal.
export default function QuantitativeInput({ value = {}, onChange }) {
  const q = value || {};
  const type = q.measurement_type || "accuracy";
  const calc = computeQuantitative(q.correct, q.total);
  const set = (patch) => onChange({ ...q, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Measurement type</label>
          <select className={inputCls} value={type} onChange={(e) => set({ measurement_type: e.target.value })}>
            {MEASUREMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Prompt level</label>
          <select className={inputCls} value={q.prompt_level || "independent"} onChange={(e) => set({ prompt_level: e.target.value })}>
            {PROMPT_LEVELS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {type === "accuracy" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Correct responses</label>
              <input type="number" inputMode="numeric" className={inputCls} value={q.correct ?? ""} onChange={(e) => set({ correct: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Total opportunities</label>
              <input type="number" inputMode="numeric" className={inputCls} value={q.total ?? ""} onChange={(e) => set({ total: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
          </div>
          {calc.fraction && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-secondary px-3 py-1">Fraction: <strong>{calc.fraction}</strong></span>
              <span className="rounded-full bg-secondary px-3 py-1">Decimal: <strong>{calc.decimal}</strong></span>
              <span className="rounded-full bg-secondary px-3 py-1">Percentage: <strong>{calc.percentage}%</strong></span>
            </div>
          )}
          <div>
            <label className={labelCls}>Or enter % directly (0.80 → 80%)</label>
            <input className={inputCls} inputMode="decimal" placeholder="80 or 0.80" value={q.percentage ?? ""} onChange={(e) => set({ percentage: e.target.value === "" ? "" : interpretDecimal(e.target.value) })} />
            {q.percentage !== "" && q.percentage != null && <p className="text-xs text-muted-foreground mt-1">= {q.percentage}%</p>}
          </div>
        </>
      )}

      {type === "rubric" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Rubric score</label>
            <input type="number" inputMode="decimal" className={inputCls} value={q.rubric_score ?? ""} onChange={(e) => set({ rubric_score: e.target.value === "" ? "" : Number(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>Scale (e.g. 4-point)</label>
            <input type="number" inputMode="numeric" className={inputCls} value={q.rubric_scale ?? ""} onChange={(e) => set({ rubric_scale: e.target.value === "" ? "" : Number(e.target.value) })} />
          </div>
        </div>
      )}

      {["frequency", "duration", "rate"].includes(type) && (
        <div>
          <label className={labelCls}>{type === "frequency" ? "Count observed" : type === "duration" ? "Duration (minutes or seconds)" : "Rate (per minute)"}</label>
          <input type="number" inputMode="decimal" className={inputCls} value={q.value ?? ""} onChange={(e) => set({ value: e.target.value === "" ? "" : Number(e.target.value) })} />
        </div>
      )}

      {type === "custom" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Custom measurement label</label>
            <input className={inputCls} value={q.custom_label || ""} onChange={(e) => set({ custom_label: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Value</label>
            <input className={inputCls} value={q.custom_value ?? ""} onChange={(e) => set({ custom_value: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
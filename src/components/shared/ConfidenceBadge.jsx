import React from "react";

// Standardized AI confidence indicators shown on extracted data.
const LEVELS = {
  high: { label: "High confidence", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  medium: { label: "Medium confidence", cls: "bg-amber-50 border-amber-200 text-amber-700" },
  low: { label: "Low confidence", cls: "bg-rose-50 border-rose-200 text-rose-700" },
  missing: { label: "Missing information", cls: "bg-muted border-border text-muted-foreground" },
};

export function ConfidenceBadge({ level }) {
  const l = LEVELS[level] || LEVELS.missing;
  return <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${l.cls}`}>{l.label}</span>;
}

const FLAGS = {
  conflicting: { label: "Conflicting information", cls: "bg-rose-50 border-rose-200 text-rose-700" },
  incomplete: { label: "Incomplete information", cls: "bg-amber-50 border-amber-200 text-amber-700" },
  unverified: { label: "Unverified information", cls: "bg-slate-100 border-slate-300 text-slate-600" },
  missing: { label: "Missing information", cls: "bg-muted border-border text-muted-foreground" },
};

export function ConfidenceFlag({ flag }) {
  const f = FLAGS[flag];
  if (!f) return null;
  return <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${f.cls}`}>{f.label}</span>;
}

export default ConfidenceBadge;
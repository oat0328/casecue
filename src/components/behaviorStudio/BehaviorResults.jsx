import React from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/cards";

function StringList({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((v, i) => (
        <li key={i} className="text-sm text-muted-foreground flex gap-2">
          <span className="text-primary">•</span>
          <span>{v}</span>
        </li>
      ))}
    </ul>
  );
}

function ObjectList({ items, fields, fieldLabels }) {
  return (
    <div className="space-y-3">
      {items.map((v, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-1">
          {fields.map((f, fi) => (
            <p key={f} className="text-sm">
              <span className="font-medium">{fieldLabels[fi]}:</span>{" "}
              <span className="text-muted-foreground">{v[f] || "—"}</span>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

// Renders the structured BIP/FBA analysis returned by the analyzeBehaviorDoc
// backend function, driven by the section config passed in.
export default function BehaviorResults({ analysis, sections }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <b>Draft — Educator/IEP Team Review Required.</b> Share any missing-information items
          with the team before using these findings.
        </span>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">Summary</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
      </Card>

      {sections.map((section) => {
        const val = analysis[section.key];
        if (!val || (Array.isArray(val) && val.length === 0)) return null;
        return (
          <Card key={section.key} className="p-5">
            <h3 className="font-semibold mb-3">{section.title}</h3>
            {section.kind === "strings"
              ? <StringList items={val} />
              : <ObjectList items={val} fields={section.fields} fieldLabels={section.fieldLabels} />}
          </Card>
        );
      })}
    </div>
  );
}
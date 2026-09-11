import React, { useEffect, useState } from "react";
import { Sparkles, Loader2, GitMerge, Users, Clock, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import AiDisclaimer from "@/components/shared/AiDisclaimer";

const TYPE_META = {
  combination: { label: "Group Combination", icon: GitMerge, style: "bg-sky-100 text-sky-700" },
  pairing: { label: "Student Pairing", icon: Users, style: "bg-blue-100 text-blue-700" },
  block: { label: "Service Block", icon: Clock, style: "bg-emerald-100 text-emerald-700" },
  improvement: { label: "Improvement", icon: Lightbulb, style: "bg-amber-100 text-amber-700" },
};

// Optimize Groups: AI recommendations for combinations, pairings, blocks, and
// improvements. Advisory only — the teacher decides what to apply.
export default function OptimizeDialog({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) { setResult(null); return; }
    let cancelled = false;
    setLoading(true);
    base44.functions
      .invoke("scheduleAi", { mode: "optimize" })
      .then((res) => { if (!cancelled) setResult(res.data); })
      .catch(() => { if (!cancelled) setResult({ recommendations: [], summary: "Could not analyze the schedule right now. Try again in a moment." }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Optimize Groups
          </DialogTitle>
          <DialogDescription>AI suggestions for group combinations, student pairings, and schedule improvements. You stay in control.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Reviewing your groups and schedule…</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.summary && <p className="text-sm text-muted-foreground">{result.summary}</p>}
            <AiDisclaimer extra="These are suggestions only. Apply changes yourself from the Groups tab." />
            {(result.recommendations || []).map((r, i) => {
              const meta = TYPE_META[r.type] || TYPE_META.improvement;
              const Icon = meta.icon;
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.style}`}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                    <span className="font-semibold text-sm">{r.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{r.description}</p>
                  {r.reasoning && <p className="text-xs text-muted-foreground mt-1.5 border-l-2 border-primary/40 pl-2">{r.reasoning}</p>}
                  {r.groups?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.groups.map((g) => <span key={g} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{g}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
            {(result.recommendations || []).length === 0 && !loading && (
              <p className="text-sm text-muted-foreground py-4 text-center">Not enough schedule data to make recommendations yet.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
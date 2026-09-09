import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GOAL_BANK, GOAL_AREAS } from "@/lib/goalBank";
import { Check } from "lucide-react";

export default function GoalBankPicker({ open, onOpenChange, onSelect }) {
  const [area, setArea] = useState("All");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    let list = GOAL_BANK;
    if (area !== "All") list = list.filter((g) => g.area === area);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((g) => g.goal_text.toLowerCase().includes(q) || g.area.toLowerCase().includes(q));
    }
    return list;
  }, [area, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Goal Bank</DialogTitle>
          <DialogDescription>
            Curated annual goal templates. Pick one, then edit the wording, baseline, and target for the individual student — IEP team review required.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Search goals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap gap-1.5">
          {["All", ...GOAL_AREAS].map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${area === a ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {results.map((g, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">{g.area}</span>
                <Button size="sm" variant="outline" onClick={() => onSelect(g)}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Use template
                </Button>
              </div>
              <p className="text-sm">{g.goal_text}</p>
              <div className="mt-2 flex flex-wrap gap-x-5 text-xs text-muted-foreground">
                <span>Criterion: {g.criterion}</span>
                <span>Measure: {g.measurement_method}</span>
              </div>
            </div>
          ))}
          {results.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No templates match your search.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
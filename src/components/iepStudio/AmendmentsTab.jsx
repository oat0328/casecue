import React, { useState } from "react";
import { Sparkles, Loader2, Copy, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import ExportBar from "@/components/shared/ExportBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import AiDisclaimer from "@/components/shared/AiDisclaimer";

const TYPES = [
  { key: "goal", label: "Goal Amendment" },
  { key: "accommodation", label: "Accommodation Amendment" },
  { key: "service", label: "Service Amendment" },
  { key: "placement", label: "Placement Amendment" },
  { key: "behavior", label: "Behavior Amendment" },
];

// Tab 8 — Amendments: compare the current IEP against new information and
// generate formal amendment language for team review.
export default function AmendmentsTab({ student }) {
  const { toast } = useToast();
  const [type, setType] = useState("goal");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!description.trim()) { toast({ title: "Describe the change first", variant: "destructive" }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("draftAmendment", {
        student_id: student.id,
        amendment_type: type,
        change_description: description,
      });
      setResult(res.data.amendment);
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const saveAmendment = async () => {
    try {
      await base44.entities.SavedReport.create({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        report_type: "amendment",
        content: { amendment: result, amendment_type: type },
      });
      toast({ title: "Saved to Reports history" });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Draft an amendment</h3>
        <p className="text-sm text-muted-foreground mb-4">CaseCue compares {student.first_name}'s current IEP on file against the new information and drafts formal amendment language — you and the team review and adopt it.</p>

        <div className="space-y-5">
          <div>
            <Label className="text-sm">Amendment type</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-sm">New information / requested change</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Based on new evaluation results, increase speech services from 30 to 60 minutes per week" className="mt-1.5" />
          </div>
          <Button onClick={generate} disabled={loading} className="brand-gradient text-white">
            {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Comparing IEP…</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate amendment language</>}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-5">
          <AiDisclaimer className="mb-4" extra="Amendment language must be finalized by the IEP team following your district's consent and meeting requirements." />

          <ExportBar
            title={`Amendment — ${student.first_name} ${student.last_name}`}
            subtitle={TYPES.find((t) => t.key === type)?.label}
            filename={`Amendment-${student.first_name}-${student.last_name}`}
            banner="DRAFT — Educator/IEP Team Review Required. Amendment language must be finalized by the team."
            gated
            onSave={saveAmendment}
            sections={[
              { heading: "Current IEP", body: result.current_state },
              { heading: "Proposed Change", body: result.proposed_state },
              { heading: "Amendment Language", body: result.amendment_language },
              { heading: "Rationale", body: result.rationale },
              { heading: "Before Finalizing", body: result.review_notes },
            ].filter((s) => s.body)}
          />

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div className="rounded-lg border border-border p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Current IEP</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.current_state}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">Proposed change</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.proposed_state}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm">Amendment language</h4>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(result.amendment_language); toast({ title: "Copied" }); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{result.amendment_language}</div>

          {result.rationale && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-1">Rationale</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.rationale}</p>
            </div>
          )}
          {result.review_notes && (
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span><strong className="text-foreground">Before finalizing:</strong> {result.review_notes}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
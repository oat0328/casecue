import React, { useState, useEffect } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import SectionEditor from "@/components/iepWorkspace/SectionEditor";
import GoalCard from "@/components/iepWorkspace/GoalCard";
import ServicesTable from "@/components/iepWorkspace/ServicesTable";
import PlacementWorksheet from "@/components/iepWorkspace/PlacementWorksheet";

const CHANGE_CHIP = {
  existing: "bg-muted text-muted-foreground border-border",
  revised: "bg-blue-50 text-blue-700 border-blue-200",
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  proposed_for_removal: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function DraftStep({ workspace, save, onReviewed }) {
  const draft = workspace.draft;
  const { toast } = useToast();
  const [sections, setSections] = useState(draft?.sections || []);
  const [goals, setGoals] = useState(draft?.goals || []);
  const [accommodations, setAccommodations] = useState(draft?.accommodations || []);
  const [services, setServices] = useState(draft?.services || []);
  const [placement, setPlacement] = useState(workspace.placement || {});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (draft) {
      setSections(draft.sections || []);
      setGoals(draft.goals || []);
      setAccommodations(draft.accommodations || []);
      setServices(draft.services || []);
    }
  }, [draft]);

  const persist = async () => {
    setBusy("save");
    try {
      await save({ draft: { ...draft, sections, goals, accommodations, services }, placement });
      toast({ title: "Draft saved" });
    } finally { setBusy(null); }
  };

  const runReview = async () => {
    setBusy("review");
    try {
      await save({ draft: { ...draft, sections, goals, accommodations, services }, placement });
      const res = await base44.functions.invoke("iepWorkspaceReview", { workspace_id: workspace.id });
      await save({ review: res.data.review });
      onReviewed();
    } catch (e) {
      toast({ title: "Review failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (!draft) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No draft yet — go back to Extraction Review and generate the IEP draft.</p>
      </Card>
    );
  }

  const updateSection = (i, patch) => setSections((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const updateGoal = (i, patch) => setGoals((prev) => prev.map((g, idx) => idx === i ? { ...g, ...patch } : g));

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-semibold">Editable IEP draft</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Generated {draft.generated_at ? String(draft.generated_at).slice(0, 10) : ""} from your verified information. Edit any section, then approve or reject each one — nothing is final until the IEP team decides.
        </p>
      </Card>

      <div className="space-y-3">
        {sections.map((s, i) => <SectionEditor key={s.key || i} section={s} onChange={(patch) => updateSection(i, patch)} />)}
      </div>

      <h3 className="font-semibold text-lg pt-2">Measurable annual goals</h3>
      <p className="text-xs text-muted-foreground -mt-2 mb-3">Each goal links to a present level and an evaluation finding. Accept, edit, or reject every goal.</p>
      <div className="grid lg:grid-cols-2 gap-3">
        {goals.map((g, i) => <GoalCard key={i} goal={g} index={i} onChange={(patch) => updateGoal(i, patch)} />)}
        {goals.length === 0 && <p className="text-sm text-muted-foreground">No goals suggested — verify present levels and evaluation findings first.</p>}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3">Accommodations</h3>
        <div className="space-y-2">
          {accommodations.map((a, i) => (
            <div key={i} className="border border-border rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{a.accommodation}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${CHANGE_CHIP[a.change_type] || CHANGE_CHIP.existing}`}>{a.change_type || "existing"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Need: {a.need_addressed || "—"} · Source: {a.source || "Needs verification"}{a.setting ? ` · Setting: ${a.setting}` : ""}{a.frequency ? ` · Frequency: ${a.frequency}` : ""}{a.responsible_staff ? ` · Staff: ${a.responsible_staff}` : ""}
              </p>
            </div>
          ))}
          {accommodations.length === 0 && <p className="text-sm text-muted-foreground">No accommodations in this draft.</p>}
        </div>
      </Card>

      <ServicesTable services={services} onChange={setServices} />

      <PlacementWorksheet placement={placement} onChange={setPlacement} />

      {(draft.unresolved_decisions || []).length > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50/40">
          <h4 className="font-semibold text-sm text-amber-800">Unresolved team decisions</h4>
          <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
            {draft.unresolved_decisions.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </Card>
      )}

      <div className="flex justify-between items-center gap-3 flex-wrap">
        <Button variant="outline" onClick={persist} disabled={!!busy}>
          {busy === "save" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save draft
        </Button>
        <Button className="brand-gradient text-white" onClick={runReview} disabled={!!busy}>
          {busy === "review" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          {busy === "review" ? "Running CaseCue Review…" : "Run CaseCue Review →"}
        </Button>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import BuilderDocumentsSummary from "@/components/iepStudio/BuilderDocumentsSummary";
import ExtractionStep from "@/components/iepWorkspace/ExtractionStep";
import DraftStep from "@/components/iepWorkspace/DraftStep";
import ReviewStep from "@/components/iepWorkspace/ReviewStep";
import PageSummaryView from "@/components/iepWorkspace/PageSummaryView";

const STATUS_INDEX = { documents: 0, analysis: 1, draft: 2, review: 3, exported: 3 };
const STEPS = ["Student & Documents", "Extraction Review", "IEP Draft", "Review & Export"];

// The 4-step evidence-backed IEP pipeline: documents → extraction → draft →
// review/export, plus the page-by-page IEP summary. Lives inside IEP Studio.
export default function WorkspacePipeline({ student }) {
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoStage, setAutoStage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      setWorkspace(null);
      setStep(0);
      setLoading(true);
      try {
        const existing = await base44.entities.IepWorkspace.filter({ student_id: student.id }, '-created_date', 1);
        const ws = existing && existing.length ? existing[0] : await base44.entities.IepWorkspace.create({ student_id: student.id, status: "documents" });
        if (cancelled) return;
        setWorkspace(ws);
        setStep(STATUS_INDEX[ws.status] ?? 0);
      } catch (e) {
        if (!cancelled) toast({ title: "Could not open workspace", description: e.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    open();
    return () => { cancelled = true; };
  }, [student?.id]);

  const save = async (patch) => {
    const updated = await base44.entities.IepWorkspace.update(workspace.id, patch);
    setWorkspace((w) => ({ ...(updated || w), ...patch }));
    return updated;
  };

  const buildMyIep = async () => {
    if (!workspace || autoBusy) return;
    setAutoBusy(true);
    try {
      setAutoStage("Reading and classifying every uploaded record…");
      const analyzed = await base44.functions.invoke("iepWorkspaceAnalyze", { workspace_id: workspace.id });
      const analysis = analyzed.data.analysis;
      await save({ analysis, status: "analysis" });

      setAutoStage("Building evidence-linked present levels and goal drafts…");
      const drafted = await base44.functions.invoke("iepWorkspaceDraft", { workspace_id: workspace.id });
      const draft = drafted.data.draft;
      await save({ analysis, draft, status: "draft" });
      setWorkspace((w) => ({ ...w, analysis, draft, status: "draft" }));
      setStep(2);
      setAutoStage("Draft ready for educator and IEP-team review.");
    } catch (e) {
      toast({ title: "Build My IEP stopped", description: e?.response?.data?.error || e.message, variant: "destructive" });
      setAutoStage("");
    } finally { setAutoBusy(false); }
  };

  if (loading) return <p className="text-muted-foreground text-sm">Opening workspace…</p>;

  if (!workspace) return <p className="text-muted-foreground text-sm">Workspace could not be opened.</p>;

  return (
    <div>
      <Card className="p-5 mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="text-xs font-black uppercase tracking-wider text-blue-700">Ultimate workflow</div>
            <h3 className="text-xl font-black mt-1">Build My IEP</h3>
            <p className="text-sm text-slate-600 mt-1">One click re-analyzes all processed source records and builds an evidence-linked IEP draft. Nothing becomes an official goal, service, placement, eligibility, or team decision until reviewed.</p>
            {autoStage && <div className="mt-2 text-sm flex items-center gap-2 text-blue-800">{autoBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4 text-emerald-600"/>}{autoStage}</div>}
          </div>
          <Button onClick={buildMyIep} disabled={autoBusy} className="brand-gradient text-white h-11 px-5">
            {autoBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Sparkles className="h-4 w-4 mr-2"/>}
            {autoBusy ? "Building…" : "Build My IEP"}
          </Button>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2 mb-6">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i <= step && setStep(i)}
            disabled={i > step}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              i === step
                ? "bg-primary text-white border-primary"
                : i < step
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && <BuilderDocumentsSummary student={student} onContinue={() => setStep(1)} />}
      {step === 1 && <ExtractionStep workspace={workspace} save={save} onDrafted={() => setStep(2)} />}
      {step === 2 && <DraftStep workspace={workspace} save={save} student={student} onReviewed={() => setStep(3)} />}
      {step === 3 && <ReviewStep workspace={workspace} save={save} student={student} />}

      <PageSummaryView workspace={workspace} student={student} save={save} />
    </div>
  );
}
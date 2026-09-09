import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import DocumentStep from "@/components/iepWorkspace/DocumentStep";
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
  };

  if (loading) return <p className="text-muted-foreground text-sm">Opening workspace…</p>;

  if (!workspace) return <p className="text-muted-foreground text-sm">Workspace could not be opened.</p>;

  return (
    <div>
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

      {step === 0 && <DocumentStep student={student} onContinue={() => setStep(1)} />}
      {step === 1 && <ExtractionStep workspace={workspace} save={save} onDrafted={() => setStep(2)} />}
      {step === 2 && <DraftStep workspace={workspace} save={save} student={student} onReviewed={() => setStep(3)} />}
      {step === 3 && <ReviewStep workspace={workspace} save={save} student={student} />}

      <PageSummaryView workspace={workspace} student={student} save={save} />
    </div>
  );
}
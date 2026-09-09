import React, { useState } from "react";
import { Files } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import DocumentStep from "@/components/iepWorkspace/DocumentStep";
import ExtractionStep from "@/components/iepWorkspace/ExtractionStep";
import DraftStep from "@/components/iepWorkspace/DraftStep";
import ReviewStep from "@/components/iepWorkspace/ReviewStep";
import PageSummaryView from "@/components/iepWorkspace/PageSummaryView";

const STATUS_INDEX = { documents: 0, analysis: 1, draft: 2, review: 3, exported: 3 };
const STEPS = ["Student & Documents", "Extraction Review", "IEP Draft", "Review & Export"];

export default function IepWorkspace() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [studentId, setStudentId] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const student = (students || []).find((s) => s.id === studentId);

  const selectStudent = async (id) => {
    setStudentId(id);
    setWorkspace(null);
    setStep(0);
    if (!id) return;
    setLoading(true);
    try {
      const existing = await base44.entities.IepWorkspace.filter({ student_id: id }, '-created_date', 1);
      const ws = existing && existing.length ? existing[0] : await base44.entities.IepWorkspace.create({ student_id: id, status: "documents" });
      setWorkspace(ws);
      setStep(STATUS_INDEX[ws.status] ?? 0);
    } catch (e) {
      toast({ title: "Could not open workspace", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const save = async (patch) => {
    const updated = await base44.entities.IepWorkspace.update(workspace.id, patch);
    setWorkspace((w) => ({ ...(updated || w), ...patch }));
  };

  return (
    <div>
      <PageHeader title="New IEP Workspace" subtitle="Upload documents, verify extracted information, and build an evidence-backed IEP draft — section by section." icon={Files} />

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">
        CaseCue drafts, you decide. Every section stays a draft until the IEP team approves it — CaseCue never finalizes an IEP, makes a diagnosis, or makes a placement decision.
      </div>

      <Card className="p-5 mb-6">
        <label className="text-sm font-medium">Student</label>
        <select
          className="w-full sm:w-80 rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1"
          value={studentId}
          onChange={(e) => selectStudent(e.target.value)}
        >
          <option value="">Select a student…</option>
          {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
      </Card>

      {student && workspace && (
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
      )}

      {loading && <p className="text-muted-foreground text-sm">Opening workspace…</p>}

      {student && workspace && step === 0 && <DocumentStep student={student} onContinue={() => setStep(1)} />}
      {student && workspace && step === 1 && <ExtractionStep workspace={workspace} save={save} onDrafted={() => setStep(2)} />}
      {student && workspace && step === 2 && <DraftStep workspace={workspace} save={save} student={student} onReviewed={() => setStep(3)} />}
      {student && workspace && step === 3 && <ReviewStep workspace={workspace} save={save} student={student} />}

      {student && workspace && <PageSummaryView workspace={workspace} student={student} save={save} />}

      {studentId && !loading && !workspace && <p className="text-muted-foreground text-sm">Workspace could not be opened.</p>}
      {!studentId && !loading && <p className="text-muted-foreground text-sm">Select a student to begin. Upload the current IEP and latest evaluation, and CaseCue will extract, cite, and draft — you verify and approve every step.</p>}
    </div>
  );
}
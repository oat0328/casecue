import React, { useRef, useState } from "react";
import { Loader2, AlertTriangle, FileUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import FerpaUploadNotice from "@/components/shared/FerpaUploadNotice";
import ScheduleReview from "./ScheduleReview";

const ACCEPT = ".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp";

// Upload Schedule → AI analysis → review → save. The teacher reviews every
// extraction before anything is written.
export default function UploadScheduleDialog({ open, onOpenChange, students, onSaved }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | analyzing | review | saving
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("upload");
    setFileName("");
    setAnalysis(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const analyzeFile = async (file) => {
    setError("");
    setFileName(file.name);
    setStep("analyzing");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("scheduleAi", { mode: "analyze", file_url });
      setAnalysis(res.data);
      setStep("review");
    } catch (err) {
      setError(err.message || "Schedule analysis failed. Try a clearer file.");
      setStep("upload");
    }
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (file) analyzeFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) analyzeFile(file);
  };

  const saveEntries = async (entries) => {
    setStep("saving");
    try {
      await base44.entities.ScheduleEntry.bulkCreate(entries);
      toast({ title: "Schedule imported", description: `${entries.length} schedule entries saved.` });
      onSaved?.();
      handleOpenChange(false);
    } catch (err) {
      toast({ title: "Could not save schedule", description: err.message, variant: "destructive" });
      setStep("review");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Schedule</DialogTitle>
          <DialogDescription>
            Upload your existing schedule and CaseCue will find the groups, students, service times, and minutes — you review everything before it saves.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <FerpaUploadNotice />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-10 text-center transition-colors hover:border-primary/70"
            >
              <FileUp className="h-10 w-10 text-primary mx-auto" />
              <p className="mt-3 font-semibold">Drop your schedule here, or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, Excel (.xlsx), CSV, DOCX, screenshots and images. Google Sheets: export as Excel or CSV first.
              </p>
              <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="mt-4 font-semibold">Analyzing {fileName}…</p>
            <p className="text-sm text-muted-foreground mt-1">
              Reading student names, groups, service types, days, times, and minutes.
            </p>
          </div>
        )}

        {step === "review" && analysis && (
          <ScheduleReview analysis={analysis} students={students} saving={step === "saving"} onSave={saveEntries} onCancel={() => handleOpenChange(false)} />
        )}

        {step === "saving" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="mt-4 font-semibold">Saving schedule…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
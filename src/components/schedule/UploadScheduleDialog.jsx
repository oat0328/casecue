import React, { useRef, useState } from "react";
import { Loader2, AlertTriangle, FileUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import FerpaUploadNotice from "@/components/shared/FerpaUploadNotice";
import ScheduleReview from "./ScheduleReview";

const ACCEPT = ".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp";

// Upload Schedule → Document analysis → review → save. The teacher reviews every
// extraction before anything is written.
export default function UploadScheduleDialog({ open, onOpenChange, students, onSaved }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | analyzing | review | saving
  const [fileName, setFileName] = useState("");
  const [pullPreferences, setPullPreferences] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("upload");
    setFileName("");
    setAnalysis(null);
    setError("");
    setPullPreferences("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const analyzeFiles = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    setError("");
    setFileName(list.map(f => f.name).join(", "));
    setStep("analyzing");
    try {
      const uploaded = await Promise.all(list.map(file => base44.integrations.Core.UploadPrivateFile({ file })));
      const file_uris = uploaded.map(x => x.file_uri).filter(Boolean);
      const res = await base44.functions.invoke("scheduleAi", { mode: "analyze", file_uris, pull_preferences: pullPreferences });
      setAnalysis(res.data);
      setStep("review");
    } catch (err) {
      setError(err.message || "Schedule analysis failed. Try a clearer file.");
      setStep("upload");
    }
  };

  const onPick = (e) => {
    if (e.target.files?.length) analyzeFiles(e.target.files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) analyzeFiles(e.dataTransfer.files);
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
            Upload the school bell schedule, student/class schedules, and/or your current resource schedule together. Tell CaseCue when you prefer to pull students; it will propose groups and compare scheduled minutes with the service minutes already recorded in each student's CaseCue profile.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <FerpaUploadNotice />
            <div>
              <label className="text-sm font-semibold">When do you want to provide pull-out / push-in services?</label>
              <textarea
                value={pullPreferences}
                onChange={(e) => setPullPreferences(e.target.value)}
                placeholder="Example: Prefer pull-out 8:30–11:41 AM and 12:45–2:06 PM. Avoid PE, lunch, electives, and core tests. Reading M/W/F; math T/Th when possible."
                className="mt-2 w-full min-h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">CaseCue treats this as a planning preference, not proof that a service was delivered.</p>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-10 text-center transition-colors hover:border-primary/70"
            >
              <FileUp className="h-10 w-10 text-primary mx-auto" />
              <p className="mt-3 font-semibold">Drop your schedule here, or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add one or several files at once: school bell schedule + student schedules + resource schedule. PDF, Excel (.xlsx), CSV, DOCX, screenshots and images.
              </p>
              <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={onPick} />
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
import React, { useState } from "react";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StudentSelector from "@/components/forms/StudentSelector";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/cards";
import { useToast } from "@/components/ui/use-toast";

const AMENDMENT_TYPES = [
  { value: "add_service", label: "Add a Service" },
  { value: "remove_service", label: "Remove a Service" },
  { value: "update_goal", label: "Update a Goal" },
  { value: "update_accommodation", label: "Update an Accommodation" },
  { value: "update_placement", label: "Update Placement" },
  { value: "update_behavior_support", label: "Update Behavior Support" },
];

const OUTPUT_FIELDS = [
  { key: "reason_for_change", title: "Reason for change" },
  { key: "current_language", title: "Current language" },
  { key: "proposed_language", title: "Proposed language (edit before presenting)" },
  { key: "parent_communication_summary", title: "Parent communication summary" },
];

const selectClasses = "mt-2 w-full min-h-[44px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input";
const textareaClasses = "mt-2 w-full min-h-[110px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input";

// Amendment Drafting Tool — pick the change type, describe it, and CaseCue drafts
// editable amendment language grounded in the student's verified records.
export default function AmendmentDrafter({ students }) {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [amendmentType, setAmendmentType] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("");
  const [running, setRunning] = useState(false);
  const [amendment, setAmendment] = useState(null);

  const run = async () => {
    if (!studentId || !amendmentType || !reason.trim()) return;
    setRunning(true);
    try {
      const res = await base44.functions.invoke("draftAmendment", {
        student_id: studentId,
        amendment_type: amendmentType,
        reason: reason.trim(),
        details: details.trim(),
        current_language: currentLanguage.trim(),
      });
      setAmendment(res.data.amendment);
    } catch (e) {
      toast({
        title: "Could not draft amendment",
        description: e.response?.data?.error || e.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const updateField = (key, value) => setAmendment((a) => ({ ...a, [key]: value }));

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-5">Amendment Drafting Tool</h2>
        <StudentSelector
          students={students}
          value={studentId}
          onChange={(v) => { setStudentId(v); setAmendment(null); }}
          label="Student"
          placeholder="Select a student…"
          required
        />
        <div className="w-full max-w-[480px] mb-5">
          <Label>Change type</Label>
          <select
            value={amendmentType}
            onChange={(e) => { setAmendmentType(e.target.value); setAmendment(null); }}
            className={selectClasses}
          >
            <option value="">Select a change type…</option>
            {AMENDMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-5">
          <Label>Reason for change <span className="text-destructive">*</span></Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Student has met the current reading goal and requires a new goal to continue progress."
            className={textareaClasses}
          />
        </div>
        <div className="mb-5">
          <Label>What specifically is changing? (optional)</Label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. Increase speech services from 30 to 45 minutes per week."
            className={textareaClasses}
          />
        </div>
        <div className="mb-5">
          <Label>Current language to change (optional)</Label>
          <Textarea
            value={currentLanguage}
            onChange={(e) => setCurrentLanguage(e.target.value)}
            placeholder="Paste the current wording from the IEP, if you have it handy."
            className={textareaClasses}
          />
        </div>
        <Button
          onClick={run}
          disabled={!studentId || !amendmentType || !reason.trim() || running}
          className="brand-gradient text-white"
        >
          {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {running ? "Drafting…" : "Draft amendment language"}
        </Button>
      </Card>

      {amendment && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <b>Draft — Educator/IEP Team Review Required.</b> Edit the language below before
              presenting it; the IEP team makes all final decisions.
            </span>
          </div>
          {OUTPUT_FIELDS.map((f) => (
            <Card key={f.key} className="p-5">
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <Textarea
                value={amendment[f.key] || ""}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="min-h-[110px]"
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, Loader2, CheckCircle2, RefreshCw, Trash2, ExternalLink, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import ProfileReadiness from "@/components/iepStudio/ProfileReadiness";
import { ConfidenceBadge, ConfidenceFlag } from "@/components/shared/ConfidenceBadge";

const DOC_TYPES = [
  ["IEP", "IEP (previous or current)"],
  ["Reevaluation", "Reevaluation"],
  ["Evaluation", "Evaluation Report"],
  ["MDT Report", "MDT Report"],
  ["Psychological Report", "Psychological Report"],
  ["Eligibility Report", "Eligibility Report"],
  ["BIP", "BIP"],
  ["FBA", "FBA"],
  ["Progress Report", "Progress Report"],
  ["Parent Input", "Parent Input"],
  ["Teacher Input", "Teacher Input"],
  ["Service Provider Report", "Therapy Report (Speech / OT / PT)"],
  ["Medical Report", "Medical Report"],
  ["Behavior Log", "Behavior Log / Report"],
  ["Discipline Report", "Discipline Report"],
  ["Assessment Report", "Assessment Report"],
  ["504", "504 Plan"],
  ["Transition Assessment", "Transition Assessment"],
  ["Other", "Other"],
];

const BUSY = ["pending", "queued", "processing", "ocr_processing"];

// Extracted fields that carry AI confidence + source information.
const CONFIDENCE_FIELDS = [
  ["eligibility_category", "Eligibility"],
  ["strengths", "Strengths"],
  ["areas_of_need", "Areas of need"],
  ["present_levels", "Present levels"],
  ["accommodations", "Accommodations"],
  ["sdi", "SDI / support language"],
  ["services", "Services"],
  ["goals", "Goals"],
  ["progress_information", "Progress information"],
  ["behavior_information", "Behavior information"],
  ["parent_concerns", "Parent concerns"],
];

const STATUS_CHIP = {
  pending: "bg-muted text-foreground border-border", queued: "bg-muted text-foreground border-border",
  processing: "bg-amber-50 text-amber-700 border-amber-200", ocr_processing: "bg-amber-50 text-amber-700 border-amber-200",
  processed: "bg-emerald-50 text-emerald-700 border-emerald-200", failed: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_LABEL = {
  pending: "Queued", queued: "Queued", processing: "Reading…", ocr_processing: "Reading…",
  processed: "Processed", failed: "Failed",
};

// IEP Studio Upload Center: drag-and-drop upload → automatic document
// processing → automatic AI analysis → automatic student profile pre-fill.
// The teacher's only job is to review and edit the result.
export default function UploadCenterTab({ student, onProfileBuilt, onNavigate }) {
  const { toast } = useToast();
  const [docType, setDocType] = useState("IEP");
  const [docs, setDocs] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [building, setBuilding] = useState(false);
  const [profileResult, setProfileResult] = useState(null);
  const [autoBuilt, setAutoBuilt] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 50);
      setDocs(list || []);
    } catch { setDocs([]); }
  }, [student?.id]);

  useEffect(() => { load(); }, [load]);

  const processDoc = async (id) => {
    try {
      await base44.functions.invoke("processDocument", { document_id: id });
      await load();
    } catch { /* status refresh will surface failures */ }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    if ((docs || []).some((d) => d.filename === file.name)) {
      toast({ title: "Already uploaded", description: `"${file.name}" is already on file — duplicates are skipped so AI credits aren't re-spent.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const record = await base44.entities.Document.create({
        filename: file.name, file_url: file_uri, student_id: student.id,
        document_type: docType, date_uploaded: new Date().toISOString().slice(0, 10),
        extraction_status: "pending", review_status: "none", is_private: true,
      });
      await base44.entities.AuditLog.create({
        action: "document_uploaded", entity_type: "Document", entity_id: record.id,
        details: `${file.name} (${docType}) uploaded privately via Upload Center for student ${student.id}`,
      });
      await load();
      toast({ title: "Uploaded — reading has started", description: "CaseCue is now reading every page automatically. No further clicks needed." });
      processDoc(record.id);
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files?.[0]);
  };

  const buildProfile = async () => {
    setBuilding(true);
    try {
      const res = await base44.functions.invoke("autoBuildProfile", { student_id: student.id });
      setProfileResult(res.data);
      toast({ title: "Student profile updated", description: "Review the pre-filled sections in the Overview tab — educator review required." });
    } catch (e) {
      setProfileResult({ error: e?.response?.data?.error || e.message });
    } finally { setBuilding(false); }
  };

  const busy = (docs || []).some((d) => BUSY.includes(d.extraction_status));
  const hasProcessed = (docs || []).some((d) => d.extraction_status === "processed");

  // Poll while any document is being read.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [busy, load]);

  // Auto-run the profile build once all reads finish.
  useEffect(() => {
    if (!busy && hasProcessed && !autoBuilt) {
      setAutoBuilt(true);
      buildProfile();
    }
  }, [busy, hasProcessed, autoBuilt]);

  const openDoc = async (id) => {
    try {
      const res = await base44.functions.invoke("openDocumentUrl", { document_id: id });
      window.open(res.data.signed_url, "_blank");
    } catch (e) {
      toast({ title: "Could not open document", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (doc) => {
    await base44.entities.Document.delete(doc.id);
    load();
  };

  const SnapshotRow = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}:</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );

  const Check = ({ done, active, label, children }) => (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${done ? "border-emerald-200 bg-emerald-50" : active ? "border-amber-200 bg-amber-50" : "border-border bg-muted/30 opacity-60"}`}>
      {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        : active ? <Loader2 className="h-5 w-5 text-amber-600 animate-spin shrink-0 mt-0.5" />
        : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0 mt-0.5" />}
      <div className="text-sm">
        <div className={`font-medium ${done ? "text-emerald-800" : active ? "text-amber-800" : "text-muted-foreground"}`}>
          {done ? "✅ " : ""}{label}
        </div>
        {children && <div className="text-muted-foreground mt-1">{children}</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold mb-1">Upload Center — records for {student.first_name} {student.last_name}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drag a document in and CaseCue does the rest automatically — no extra clicks. Start with the current IEP and latest evaluation, then add MDT, reevaluation, BIP, FBA, progress reports, and parent/teacher input as you have them.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-72">
            <Label>Document type</Label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="mt-2 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
              {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"}`}
            onClick={() => document.getElementById("upload-center-input")?.click()}
          >
            <input id="upload-center-input" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => { uploadFile(e.target.files?.[0]); e.target.value = ""; }} disabled={uploading} />
            {uploading ? (
              <><Loader2 className="h-6 w-6 text-primary animate-spin" /><span className="text-sm font-medium">Uploading…</span></>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Drag &amp; drop here, or click to browse</span>
                <span className="text-xs text-muted-foreground">PDF, DOCX, JPG, PNG · stored privately · processing runs automatically</span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Live progress */}
      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold mb-4">Automatic progress</h3>
        <div className="space-y-3">
          <Check done={hasProcessed && !busy} active={busy} label="Document processed">
            {(docs || []).length === 0
              ? "Upload a document to begin."
              : busy
              ? `Reading ${(docs || []).filter((d) => BUSY.includes(d.extraction_status)).length} document(s) — every page, automatically.`
              : hasProcessed
              ? `${(docs || []).filter((d) => d.extraction_status === "processed").length} document(s) read and summarized.`
              : "No readable documents yet."}
          </Check>
          <Check done={!!profileResult && !profileResult.error} active={building} label="AI analysis complete">
            {building ? "Extracting eligibility, strengths, needs, present levels, accommodations, SDI, services, goals, progress, and behavior information…" : profileResult?.error ? profileResult.error : hasProcessed ? "Analysis is ready." : "Waits for documents to be read."}
          </Check>
          <Check done={!!profileResult && !profileResult.error} active={false} label="Student profile updated">
            {profileResult && !profileResult.error ? (
              <div className="space-y-2">
                {profileResult.filled?.length > 0 && (
                  <p><strong className="text-foreground">Pre-filled:</strong> {profileResult.filled.join(", ")}</p>
                )}
                {profileResult.goals_created > 0 && (
                  <p><strong className="text-foreground">Goals added:</strong> {profileResult.goals_created} extracted from your documents.</p>
                )}
                {profileResult.kept?.length > 0 && (
                  <p><strong className="text-foreground">Kept as-is:</strong> {profileResult.kept.join(", ")} (you already entered this).</p>
                )}
                {profileResult.data_gaps?.length > 0 && (
                  <p className="text-amber-700">Still missing: {profileResult.data_gaps.join(", ")}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={onProfileBuilt} className="brand-gradient text-white">
                    Review &amp; edit profile <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={buildProfile} disabled={building}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Rebuild from documents
                  </Button>
                </div>
                <p className="text-xs text-amber-700 flex items-start gap-1.5 pt-1">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Pre-filled content is extracted from your documents — educator review required before use in an IEP.
                </p>
              </div>
            ) : "Profile pre-fill happens automatically once analysis finishes."}
          </Check>
        </div>
      </Card>

      {/* After AI analysis: snapshot, readiness, one-click actions */}
      {profileResult && !profileResult.error && (
        <>
          <Card className="p-5 sm:p-6">
            <h3 className="font-semibold mb-4">Student Snapshot — what CaseCue found</h3>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <SnapshotRow label="Eligibility" value={profileResult.snapshot?.eligibility || "Not stated in documents"} />
              <SnapshotRow label="Behavior Supports Found" value={profileResult.snapshot?.behavior_supports_found ? "Yes — documented" : "None found"} />
              <SnapshotRow label="Strengths Found" value={`${profileResult.snapshot?.strengths_found || 0} item(s)`} />
              <SnapshotRow label="Areas of Need Found" value={`${profileResult.snapshot?.needs_found || 0} item(s)`} />
              <SnapshotRow label="Goals Found" value={`${profileResult.snapshot?.goals_found || 0} goal(s)`} />
              <SnapshotRow label="Accommodations Found" value={`${profileResult.snapshot?.accommodations_found || 0} item(s)`} />
              <SnapshotRow label="Services Found" value={`${profileResult.snapshot?.services_found || 0} service(s)`} />
              <SnapshotRow label="Missing Information" value={(profileResult.snapshot?.missing || []).length ? profileResult.snapshot.missing.join(", ") : "None — documents look complete"} />
              <SnapshotRow label="Documents Reviewed" value={`${(docs || []).filter((d) => d.extraction_status === "processed").length} document(s)`} />
              <SnapshotRow label="Parent Concerns Found" value={profileResult.snapshot?.parent_concerns_found ? "Yes — documented" : "None found"} />
            </div>
          </Card>

          {profileResult.confidence && (
            <Card className="p-5 sm:p-6">
              <h3 className="font-semibold mb-1">AI confidence &amp; sources</h3>
              <p className="text-sm text-muted-foreground mb-4">How strongly each extracted section is supported by your uploaded documents.</p>
              <div className="space-y-2">
                {CONFIDENCE_FIELDS.map(([field, label]) => {
                  const meta = profileResult.confidence[field];
                  if (!meta) return null;
                  return (
                    <div key={field} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{label}</div>
                        {meta.sources?.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">Source: {meta.sources.join(" · ")}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 justify-end shrink-0">
                        {(meta.flags || []).map((f) => <ConfidenceFlag key={f} flag={f} />)}
                        <ConfidenceBadge level={meta.level} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Confidence reflects how clearly the information appears in your documents — educator review is always required before use in an IEP.
              </p>
            </Card>
          )}

          <ProfileReadiness student={student} />

          <Card className="p-5 sm:p-6">
            <h3 className="font-semibold mb-1">One-click actions</h3>
            <p className="text-sm text-muted-foreground mb-4">Everything CaseCue found is saved to {student.first_name}'s record — jump straight into generating.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onNavigate?.("builder")}><ArrowRight className="h-3.5 w-3.5 mr-1" />Generate New IEP</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.("amendments")}>Generate Amendment</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.("meeting")}>Generate Meeting Script</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.("meeting")}>Generate IEP Meeting Navigator</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.("parent")}>Generate Parent Summary</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.("goals")}>Generate Progress Summary</Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.("compliance")}>Review Compliance</Button>
            </div>
          </Card>
        </>
      )}

      {/* Documents on file */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Documents on file</h3>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
        </div>
        {(docs || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on file yet — {student.first_name}'s records will appear here.</p>
        ) : (
          <div className="space-y-2">
            {(docs || []).map((d) => (
              <div key={d.id} className="flex items-center gap-2 sm:gap-3 border border-border rounded-xl px-3 sm:px-4 py-3 flex-wrap">
                <div className="h-9 w-9 rounded-lg brand-gradient-soft flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.filename}</div>
                  <div className="text-xs text-muted-foreground">{d.document_type} · uploaded {d.date_uploaded}</div>
                  {d.error_reason && <div className="text-xs text-rose-600 mt-0.5">{d.error_reason}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CHIP[d.extraction_status] || STATUS_CHIP.pending}`}>
                  {STATUS_LABEL[d.extraction_status] || d.extraction_status}
                </span>
                {d.extraction_status === "failed" && (
                  <Button variant="outline" size="sm" onClick={() => processDoc(d.id)}>Retry</Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => openDoc(d.id)}><ExternalLink className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(d)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Files are stored privately — only your organization can open them. Each document is read once (duplicates are blocked) to keep AI credit use predictable.
        </p>
      </Card>
    </div>
  );
}
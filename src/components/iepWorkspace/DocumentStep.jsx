import React, { useState } from "react";
import { FileText, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const DOC_TYPES = [
  "IEP", "Evaluation", "Eligibility Report", "Progress Report", "Assessment Report", "Report Card",
  "BIP", "FBA", "504", "Teacher Input", "Parent Input", "Service Provider Report",
  "Transition Assessment", "Other",
];

const EXTRACT_CHIP = {
  pending: "bg-muted text-foreground border-border",
  queued: "bg-muted text-foreground border-border",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  ocr_processing: "bg-amber-50 text-amber-700 border-amber-200",
  processed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};
const EXTRACT_LABEL = {
  pending: "Queued", queued: "Queued",
  processing: "Processing…", ocr_processing: "OCR Processing…",
  processed: "Ready", failed: "Failed",
};

// Secure document upload step: files are stored privately, duplicates are blocked,
// the uploader and date are recorded, and every upload is audit-logged.
export default function DocumentStep({ student, onContinue }) {
  const { toast } = useToast();
  const { data: documents, refetch } = useAsync(() => base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 50), [student.id]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("IEP");

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Duplicate-processing prevention
    if ((documents || []).some((d) => d.filename === file.name)) {
      toast({ title: "Already uploaded", description: `"${file.name}" is already on file — duplicates are skipped so processing credits aren't re-spent.`, variant: "destructive" });
      e.target.value = "";
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
      // Audit trail: uploader (created_by_id) and date are recorded automatically.
      await base44.entities.AuditLog.create({
        action: "document_uploaded",
        entity_type: "Document",
        entity_id: record.id,
        details: `${file.name} (${docType}) uploaded privately for student ${student.id}`,
      });
      refetch();
      toast({ title: "Uploaded securely", description: "The original is stored privately — only your organization can open it." });
    } catch (err) {
      toast({ title: "Upload failed", description: "The file could not be stored. Try again — nothing was processed.", variant: "destructive" });
    } finally { setUploading(false); e.target.value = ""; }
  };

  const remove = async (doc) => {
    await base44.entities.Document.delete(doc.id);
    await base44.entities.AuditLog.create({
      action: "document_deleted", entity_type: "Document", entity_id: doc.id,
      details: `${doc.filename} removed from student ${student.id}`,
    });
    refetch();
  };

  const openDoc = async (id) => {
    try {
      const res = await base44.functions.invoke("openDocumentUrl", { document_id: id });
      window.open(res.data.signed_url, "_blank");
    } catch (e) {
      toast({ title: "Could not open document", description: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const [processingId, setProcessingId] = useState(null);
  // A stuck "processing" status older than 10 minutes is stale and can be retried.
  const isStaleProcessing = (d) =>
    ["processing", "ocr_processing"].includes(d.extraction_status) &&
    d.last_attempted &&
    Date.now() - new Date(d.last_attempted).getTime() > 10 * 60 * 1000;

  const processDoc = async (id) => {
    setProcessingId(id);
    try {
      const res = await base44.functions.invoke("processDocument", { document_id: id });
      toast({ title: "Document processed", description: `${res.data?.pages?.length || 0} pages summarized — the results are saved to this record.` });
    } catch (err) {
      toast({ title: "Processing failed", description: err?.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
      refetch();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold mb-1">Upload documents for {student.first_name} {student.last_name}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start with the <strong>current IEP</strong> and the <strong>latest MDT/evaluation report</strong>. Progress reports, grades, assessments, BIPs/FBAs, 504 plans, parent and teacher input, service-provider reports, and transition assessments all help. PDFs, DOCX files, and clear scanned images are supported and stored privately.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="w-full sm:w-64">
            <Label>Document type</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm mt-1" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="w-full sm:w-56">
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={onUpload} disabled={uploading} className="hidden" id="ws-doc-upload" />
            <Button asChild disabled={uploading} className="brand-gradient text-white w-full h-11 cursor-pointer">
              <span>{uploading ? "Uploading…" : "Choose file"}</span>
            </Button>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Only your organization can see these documents. The Platform Owner has no default access to student documents or IEP contents.</p>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold mb-3">Documents on file</h3>
        {(documents || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet — upload at least one to continue.</p>
        ) : (
          <div className="space-y-2">
            {(documents || []).map((d) => (
              <div key={d.id} className="flex items-center gap-2 sm:gap-3 border border-border rounded-xl px-3 sm:px-4 py-3 flex-wrap">
                <div className="h-9 w-9 rounded-lg brand-gradient-soft flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.filename}</div>
                  <div className="text-xs text-muted-foreground">{d.document_type} · uploaded {d.date_uploaded}{d.is_private ? " · private" : ""}</div>
                  {d.error_reason && <div className="text-xs text-rose-600 mt-0.5">{d.error_reason}</div>}
                </div>
                {processingId === d.id ? (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing…</span>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${EXTRACT_CHIP[d.extraction_status] || EXTRACT_CHIP.pending}`}>{EXTRACT_LABEL[d.extraction_status] || d.extraction_status}</span>
                )}
                <div className="flex gap-1">
                  {["pending", "queued", "failed"].includes(d.extraction_status) || isStaleProcessing(d) ? (
                    <Button variant="outline" size="sm" onClick={() => processDoc(d.id)} disabled={processingId === d.id}>
                      {d.extraction_status === "failed" || isStaleProcessing(d) ? "Retry" : "Process"}
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" onClick={() => openDoc(d.id)}><ExternalLink className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(d)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button className="brand-gradient text-white" disabled={!(documents || []).length || uploading} onClick={onContinue}>
          Continue to extraction →
        </Button>
      </div>
    </div>
  );
}
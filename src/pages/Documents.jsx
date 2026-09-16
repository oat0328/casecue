import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, FileText, Trash2, RefreshCw, ShieldCheck, Loader2, Upload, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Documents — a read-only archive of every record uploaded through IEP Studio.
// All uploading happens in IEP Studio → Upload Center.
export default function Documents() {
  const { toast } = useToast();
  const { data: documents, refetch } = useAsync(() => base44.entities.Document.list('-date_uploaded', 200), []);
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);

  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : "—"; };

  const remove = async (id) => { await base44.entities.Document.delete(id); refetch(); };
  const openDoc = async (d) => {
    try {
      const res = await base44.functions.invoke("openDocumentUrl", { document_id: d.id });
      const url = res.data?.signed_url || res.data?.url || res.signed_url || res.url;
      if (!url) throw new Error(res.data?.error || "No viewable document URL was returned.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({ title: "Could not open document", description: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const [processingId, setProcessingId] = useState(null);
  // A stuck "processing" status older than 10 minutes is treated as stale and can be retried.
  const isStaleProcessing = (d) =>
    ["processing", "ocr_processing"].includes(d.extraction_status) &&
    d.last_attempted &&
    Date.now() - new Date(d.last_attempted).getTime() > 10 * 60 * 1000;

  const processDoc = async (id) => {
    setProcessingId(id);
    try {
      const res = await base44.functions.invoke("processDocument", { document_id: id });
      toast({ title: "Document processed", description: `${res.data?.pages?.length || 0} pages summarized — results are saved to this record.` });
    } catch (err) {
      toast({ title: "Processing failed", description: err?.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
      refetch();
    }
  };

  return (
    <div>
      <PageHeader title="Documents" subtitle="Your document archive — every record uploaded through IEP Studio. Stored privately — only you can access your records." icon={FolderOpen} />

      <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-primary mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <strong>This is a read-only archive.</strong> All uploads happen in <strong>IEP Studio → Upload Center</strong> — CaseCue reads every file automatically and pre-fills the student profile for your review.
        </div>
        <Button asChild className="brand-gradient text-white shrink-0">
          <Link to="/iep-studio"><Upload className="h-4 w-4 mr-1.5" /> Go to Upload Center</Link>
        </Button>
      </div>

      <div className="flex justify-end mb-3"><Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button></div>

      {documents && documents.length === 0 ? (
        <EmptyState title="No documents yet" description="Documents you upload in IEP Studio → Upload Center will appear here automatically." icon={FolderOpen} />
      ) : (
        <div className="space-y-2">
          {(documents || []).map((d) => (
            <Card key={d.id} className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg brand-gradient-soft flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.filename}</div>
                <div className="text-xs text-muted-foreground">{d.document_type} · {studentName(d.student_id)} · Uploaded {d.date_uploaded}</div>
                {d.error_reason && <div className="text-xs text-rose-600 mt-0.5">{d.error_reason}</div>}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {d.extraction_status === "processed" ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Ready</span>
                ) : ["processing", "ocr_processing"].includes(d.extraction_status) && !isStaleProcessing(d) ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{d.extraction_status === "ocr_processing" ? "OCR Processing…" : "Processing…"}</span>
                ) : d.extraction_status === "failed" || isStaleProcessing(d) ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Failed</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">Queued</span>
                )}
                {d.review_status === "flagged" && <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> reviewed</span>}
                <div className="flex items-center gap-1">
                  {["pending", "queued", "failed"].includes(d.extraction_status) || isStaleProcessing(d) ? (
                    <Button variant="outline" size="sm" onClick={() => processDoc(d.id)} disabled={processingId === d.id}>
                      {processingId === d.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                      {d.extraction_status === "failed" || isStaleProcessing(d) ? "Retry" : "Process"}
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => openDoc(d)}><ExternalLink className="h-3.5 w-3.5 mr-1" /> View</Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
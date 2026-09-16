import React from "react";
import { UploadCloud, FileText, ArrowRight, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { formatDate } from '@/lib/dateUtils';

const STATUS_CHIP = {
  pending: "bg-muted text-foreground border-border", queued: "bg-muted text-foreground border-border",
  processing: "bg-amber-50 text-amber-700 border-amber-200", ocr_processing: "bg-amber-50 text-amber-700 border-amber-200",
  processed: "bg-emerald-50 text-emerald-700 border-emerald-200", failed: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_LABEL = {
  pending: "Queued", queued: "Queued", processing: "Reading…", ocr_processing: "Reading…",
  processed: "Processed", failed: "Failed",
};

// Read-only document summary for the IEP Builder. The Upload Center is the
// ONLY upload location in IEP Studio — this step just shows what's on file.
export default function BuilderDocumentsSummary({ student, onContinue }) {
  const { data: documents, refetch } = useAsync(() => base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 50), [student?.id]);
  const processed = (documents || []).filter((d) => d.extraction_status === "processed");
  const busy = (documents || []).some((d) => ["pending", "queued", "processing", "ocr_processing"].includes(d.extraction_status));

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="font-semibold mb-1">Documents for {student.first_name} {student.last_name}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        All uploads happen in the <strong>Upload Center</strong> tab — documents are read and analyzed automatically there. This step uses what's already on file.
      </p>
      {(documents || []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          No documents on file yet — upload the current IEP in the Upload Center tab.
        </div>
      ) : (
        <div className="space-y-2">
          {(documents || []).map((d) => (
            <div key={d.id} className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 flex-wrap">
              <div className="h-9 w-9 rounded-lg brand-gradient-soft flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.filename}</div>
                <div className="text-xs text-muted-foreground">{d.document_type} · uploaded {formatDate(d.date_uploaded)}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CHIP[d.extraction_status] || STATUS_CHIP.pending}`}>
                {STATUS_LABEL[d.extraction_status] || d.extraction_status}
              </span>
            </div>
          ))}
        </div>
      )}
      {busy && (
        <p className="text-xs text-amber-700 mt-3 flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Documents are still being read in the Upload Center…
        </p>
      )}
      <div className="flex justify-end mt-4">
        <Button className="brand-gradient text-white" disabled={processed.length === 0} onClick={onContinue}>
          Continue to extraction <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      {(documents || []).length > 0 && processed.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2 text-right">At least one processed document is needed to continue.</p>
      )}
    </Card>
  );
}

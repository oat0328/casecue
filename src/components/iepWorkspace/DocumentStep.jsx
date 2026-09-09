import React, { useState } from "react";
import { Upload, FileText, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const DOC_TYPES = ["IEP", "Evaluation", "Progress Report", "Assessment Report", "BIP", "504", "Other"];

export default function DocumentStep({ student, onContinue }) {
  const { data: documents, refetch } = useAsync(() => base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 50), [student.id]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("IEP");

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Document.create({
        filename: file.name, file_url, student_id: student.id,
        document_type: docType, date_uploaded: new Date().toISOString().slice(0, 10),
        extraction_status: "pending", review_status: "none",
      });
      refetch();
    } finally { setUploading(false); e.target.value = ""; }
  };

  const remove = async (id) => { await base44.entities.Document.delete(id); refetch(); };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Upload documents for {student.first_name} {student.last_name}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start with the <strong>current IEP</strong> and the <strong>latest MDT/evaluation report</strong>. Progress reports, grades, assessments, behavior plans, and parent/teacher input are optional but help CaseCue draft more completely. PDF, DOCX, and clear images are supported.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="w-full sm:w-64">
            <Label>Document type</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="w-full sm:w-56">
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={onUpload} disabled={uploading} className="hidden" id="ws-doc-upload" />
            <Button asChild disabled={uploading} className="brand-gradient text-white w-full cursor-pointer">
              <span>{uploading ? "Uploading…" : "Choose file"}</span>
            </Button>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Documents on file</h3>
        {(documents || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet — upload at least one to continue.</p>
        ) : (
          <div className="space-y-2">
            {(documents || []).map((d) => (
              <div key={d.id} className="flex items-center gap-3 border border-border rounded-xl px-4 py-3">
                <div className="h-9 w-9 rounded-lg brand-gradient-soft flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.filename}</div>
                  <div className="text-xs text-muted-foreground">{d.document_type} · uploaded {d.date_uploaded}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
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
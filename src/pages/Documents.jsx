import React, { useState } from "react";
import { FolderOpen, Upload, FileText, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const DOC_TYPES = ["IEP", "Evaluation", "BIP", "504", "Progress Report", "Assessment Report", "Other"];

export default function Documents() {
  const { toast } = useToast();
  const { data: documents, refetch } = useAsync(() => base44.entities.Document.list('-date_uploaded', 200), []);
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ student_id: "", document_type: "IEP" });

  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : "—"; };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Document.create({
        filename: file.name, file_url, student_id: form.student_id || "",
        document_type: form.document_type, date_uploaded: new Date().toISOString().slice(0, 10),
        extraction_status: "pending", review_status: "none",
      });
      toast({ title: "Document uploaded" });
      refetch();
    } catch (err) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const remove = async (id) => { await base44.entities.Document.delete(id); refetch(); };

  return (
    <div>
      <PageHeader title="Documents" subtitle="Upload IEPs, evaluations, BIPs, 504s, progress reports, and assessments. Stored privately — only you can access your records." icon={FolderOpen} />

      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Upload document</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div><Label>Student</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">—</option>
              {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div><Label>Document type</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="w-full">
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={onUpload} disabled={uploading} className="hidden" id="doc-upload" />
              <Button asChild disabled={uploading} className="brand-gradient text-white w-full cursor-pointer">
                <span>{uploading ? "Uploading…" : "Choose file"}</span>
              </Button>
            </label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Supports PDF, DOCX, JPG, PNG. Files are stored in your private document storage.</p>
      </Card>

      <div className="flex justify-end mb-3"><Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button></div>

      {documents && documents.length === 0 ? (
        <EmptyState title="No documents yet" description="Upload your first IEP, evaluation, or report to get started." icon={FolderOpen} />
      ) : (
        <div className="space-y-2">
          {(documents || []).map((d) => (
            <Card key={d.id} className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg brand-gradient-soft flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.filename}</div>
                <div className="text-xs text-muted-foreground">{d.document_type} · {studentName(d.student_id)} · Uploaded {d.date_uploaded}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-muted">{d.extraction_status}</span>
                {d.review_status === "flagged" && <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> reviewed</span>}
                <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
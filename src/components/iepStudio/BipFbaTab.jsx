import React, { useCallback, useEffect, useState } from "react";
import { Upload, Loader2, Sparkles, Copy, FileWarning } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import AiDisclaimer from "@/components/shared/AiDisclaimer";

const BEHAVIOR_TYPES = ["FBA", "BIP", "Behavior Log", "Discipline Report"];

const Field = ({ title, children }) => (
  <div>
    <h4 className="font-semibold text-sm mb-1">{title}</h4>
    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{children || "—"}</div>
  </div>
);

// Tab 7 — BIP & FBA: upload behavior documents and run AI behavior analysis
// and BIP drafting, all inside IEP Studio.
export default function BipFbaTab({ student }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [docs, setDocs] = useState(null);
  const [docType, setDocType] = useState("FBA");
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [running, setRunning] = useState("");

  const loadDocs = useCallback(async () => {
    try {
      const all = await base44.entities.Document.filter({ student_id: student.id });
      setDocs((all || []).filter((d) => BEHAVIOR_TYPES.includes(d.document_type) || /behavior|discipline|fba|bip/i.test(d.filename || "")));
    } catch { setDocs([]); }
  }, [student?.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Document.create({
        student_id: student.id,
        filename: file.name,
        file_url,
        document_type: docType,
        date_uploaded: new Date().toISOString().slice(0, 10),
        uploaded_by: user?.email || "",
      });
      await loadDocs();
      toast({ title: "Uploaded", description: "Processing and extraction will begin automatically — come back in a few minutes." });
    } catch (e2) {
      toast({ title: "Upload failed", description: e2.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const run = async (mode) => {
    setRunning(mode);
    setAnalysis(null);
    try {
      const res = await base44.functions.invoke("behaviorAnalysis", {
        student_id: student.id,
        mode,
        notes,
      });
      setAnalysis(res.data.analysis);
    } catch (e) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally { setRunning(""); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Behavior documents</h3>
        <p className="text-sm text-muted-foreground mb-4">Upload FBAs, BIPs, behavior logs, and discipline reports — CaseCue reads them so you never retype behavior data.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <Label className="text-sm">Document type</Label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
              {BEHAVIOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className={`inline-flex items-center gap-2 rounded-lg brand-gradient text-white px-4 h-11 text-sm font-medium cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload document</>}
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" onChange={upload} disabled={uploading} />
          </label>
        </div>

        {docs && docs.length > 0 && (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">{d.filename}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{d.document_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.extraction_status === "processed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {d.extraction_status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-1">AI behavior analysis & BIP drafting</h3>
        <p className="text-sm text-muted-foreground mb-4">CaseCue reads every uploaded FBA, BIP, behavior log, and discipline report — never inventing incidents that aren't documented.</p>
        <Label className="text-sm">Teacher context / notes (optional)</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. behavior has escalated at recess since October" className="mt-1.5" />
        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={() => run("analysis")} disabled={!!running} className="brand-gradient text-white">
            {running === "analysis" ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4 mr-1" /> Behavior analysis</>}
          </Button>
          <Button onClick={() => run("bip_draft")} disabled={!!running} variant="outline">
            {running === "bip_draft" ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Drafting…</> : "New BIP draft"}
          </Button>
          <Button onClick={() => run("bip_revision")} disabled={!!running} variant="outline">
            {running === "bip_revision" ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Revising…</> : "BIP revision draft"}
          </Button>
        </div>
      </Card>

      {analysis && (
        <Card className="p-5">
          <AiDisclaimer className="mb-4" extra="Behavior conclusions must be verified by the team against the source documents. CaseCue does not conduct evaluations or determine behavioral function." />

          {analysis.data_gaps?.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 mb-4">
              <FileWarning className="h-4 w-4 mt-0.5 shrink-0" />
              <span><strong>Information missing:</strong> {analysis.data_gaps.join(" · ")}</span>
            </div>
          )}

          <div className="space-y-4">
            <Field title="Behavior summary">{analysis.behavior_summary}</Field>
            <Field title="Trigger analysis">{analysis.trigger_analysis}</Field>
            <Field title="Antecedent analysis">{analysis.antecedent_analysis}</Field>
            <Field title="Function of behavior">{analysis.function_of_behavior}</Field>
            {analysis.replacement_behaviors?.length > 0 && (
              <Field title="Replacement behaviors">
                <ul className="list-disc pl-5 space-y-1">{analysis.replacement_behaviors.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </Field>
            )}
            {analysis.suggested_supports?.length > 0 && (
              <Field title="Suggested supports">
                <ul className="list-disc pl-5 space-y-1">{analysis.suggested_supports.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </Field>
            )}
            {analysis.bip_draft && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">BIP draft</h4>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(analysis.bip_draft); toast({ title: "Copied" }); }}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{analysis.bip_draft}</div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
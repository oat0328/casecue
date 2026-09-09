import React, { useState } from "react";
import { Sparkles, Loader2, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import ExportBar from "@/components/shared/ExportBar";
import SourceCitations from "@/components/shared/SourceCitations";

// Dedicated Parent Summary generator: a plain-language summary written for
// families from the verified record and logged progress — generated here, not
// routed through Ask CaseCue, with the full export bar (Save, Print, PDF,
// DOCX, Email, Share).
export default function ParentSummaryTab({ student }) {
  const { toast } = useToast();
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setSummary("");
    try {
      const res = await base44.functions.invoke("generateParentSummary", { student_id: student.id });
      setSummary(res.data.summary);
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveSummary = async () => {
    try {
      await base44.entities.SavedReport.create({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        report_type: "parent_summary",
        content: { summary },
      });
      toast({ title: "Saved to Reports history" });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">Parent Summary</h3>
          <p className="text-sm text-muted-foreground">
            A warm, jargon-free summary of {student.first_name}'s verified record and progress, written for families.
          </p>
        </div>
        <Button onClick={generate} disabled={loading} className="brand-gradient text-white">
          {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Writing…</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate Parent Summary</>}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> CaseCue is writing {student.first_name}'s parent summary…
        </div>
      )}

      {!summary && !loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Generate a parent summary to review, edit, print, or share with the family.
        </div>
      )}

      {summary && (
        <div>
          <Textarea rows={14} value={summary} onChange={(e) => setSummary(e.target.value)} className="font-body" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(summary); toast({ title: "Copied" }); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <ExportBar
              title={`Parent Summary — ${student.first_name} ${student.last_name}`}
              subtitle="Parent-friendly summary of the verified record"
              filename={`Parent-Summary-${student.first_name}-${student.last_name}`}
              banner="DRAFT — Educator Review Required. Verify every statement before sharing with the family."
              gated
              onSave={saveSummary}
              sections={[{ heading: "Parent Summary", body: summary }]}
            />
            <AiDisclaimer className="flex-1 min-w-[240px]" extra="Written only from the verified record — anything not on file is stated plainly, never invented." />
          </div>
          <SourceCitations studentId={student.id} className="mt-3" />
        </div>
      )}
    </Card>
  );
}
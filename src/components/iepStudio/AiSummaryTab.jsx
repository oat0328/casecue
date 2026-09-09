import React, { useState } from "react";
import { Sparkles, Loader2, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import ExportBar from "@/components/shared/ExportBar";

// Tab 3 — AI Student Summary: full snapshot generated from the verified record.
export default function AiSummaryTab({ student }) {
  const { toast } = useToast();
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setSummary("");
    try {
      const res = await base44.functions.invoke("generateIepSection", {
        student_id: student.id,
        section_type: "student_summary",
        extra: "",
      });
      setSummary(res.data.draft);
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const saveSummary = async () => {
    try {
      await base44.entities.SavedReport.create({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        report_type: "student_summary",
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
          <h3 className="font-semibold">AI Student Summary</h3>
          <p className="text-sm text-muted-foreground">A complete snapshot of {student.first_name}'s verified record — eligibility, strengths, needs, present levels, accommodations, services, and progress.</p>
        </div>
        <Button onClick={generate} disabled={loading} className="brand-gradient text-white">
          {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate summary</>}
        </Button>
      </div>

      {loading && <div className="flex items-center justify-center gap-2 text-muted-foreground py-12"><Loader2 className="h-5 w-5 animate-spin" /> CaseCue is reading {student.first_name}'s record…</div>}

      {!summary && !loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Generate a summary to review, edit, and copy into reports or meeting materials.
        </div>
      )}

      {summary && (
        <div>
          <Textarea rows={16} value={summary} onChange={(e) => setSummary(e.target.value)} className="font-body" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(summary); toast({ title: "Copied" }); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <ExportBar
              title={`Student Summary — ${student.first_name} ${student.last_name}`}
              subtitle="AI student record summary"
              filename={`Student-Summary-${student.first_name}-${student.last_name}`}
              sections={[{ heading: "Student Summary", body: summary }]}
              gated
              onSave={saveSummary}
            />
            <AiDisclaimer className="flex-1 min-w-[240px]" />
          </div>
        </div>
      )}
    </Card>
  );
}
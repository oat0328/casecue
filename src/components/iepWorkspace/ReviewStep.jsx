import React, { useState } from "react";
import { ShieldCheck, Loader2, Download, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { exportIepWorkspacePdf, exportWorkspaceCitationsPdf, exportWorkspaceReviewPdf } from "@/lib/pdfExport";
import ExportGate from "@/components/shared/ExportGate";

const LEVEL_STYLES = {
  good: "bg-emerald-50 border-emerald-200 text-emerald-800",
  review: "bg-amber-50 border-amber-200 text-amber-800",
  missing: "bg-rose-50 border-rose-200 text-rose-800",
};
const LEVEL_LABELS = { good: "Looks Good", review: "Review Recommended", missing: "Missing / Potential Conflict" };

export default function ReviewStep({ workspace, save, student }) {
  const review = workspace.review;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true); setError("");
    try {
      const res = await base44.functions.invoke("iepWorkspaceReview", { workspace_id: workspace.id });
      await save({ review: res.data.review });
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {!review ? (
        <Card className="p-8 text-center">
          <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold">Run CaseCue Review on this draft</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
            CaseCue checks for missing sections, conflicting information, goals without baselines, unsupported accommodations, service-minute errors, and placement-percentage problems — reporting potential issues for educator review, never a compliance claim.
          </p>
          <Button className="brand-gradient text-white mt-4" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {busy ? "Reviewing draft…" : "Run CaseCue Review"}
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold">CaseCue Review — draft score {review.score != null ? `${Math.round(review.score)}/100` : "—"}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{review.summary}</p>
              </div>
              <Button variant="outline" size="sm" onClick={run} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} Re-run
              </Button>
            </div>
            {review.category_scores && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
                {Object.entries(review.category_scores).map(([key, val]) => (
                  <div key={key} className="rounded-xl bg-secondary px-3 py-2 text-center">
                    <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</div>
                    <div className="text-lg font-bold">{val != null ? Math.round(val) : "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-3">
            {(review.findings || []).map((f, i) => (
              <div key={i} className={`rounded-xl border px-4 py-3 ${LEVEL_STYLES[f.level] || LEVEL_STYLES.review}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-sm">{f.title}</span>
                  <span className="text-xs font-medium">{LEVEL_LABELS[f.level] || f.level} · {f.category}</span>
                </div>
                <p className="text-sm mt-1">{f.what_found}</p>
                <p className="text-xs opacity-80 mt-1">Why flagged: {f.why_flagged}{f.where_found ? ` · Where: ${f.where_found}` : ""}</p>
                {f.suggested_action && <p className="text-xs mt-1"><strong>Suggested action:</strong> {f.suggested_action}</p>}
              </div>
            ))}
          </div>

          <Card className="p-5">
            <h4 className="font-semibold text-sm mb-3">Export</h4>
            <div className="flex flex-wrap gap-2">
              <ExportGate documentName="New IEP draft" onExport={() => exportIepWorkspacePdf(student, workspace.draft, workspace.placement)}>
                <Button className="brand-gradient text-white"><Download className="h-4 w-4 mr-2" /> IEP draft (PDF)</Button>
              </ExportGate>
              <ExportGate documentName="Source-citation report" onExport={() => exportWorkspaceCitationsPdf(student, workspace.analysis)}>
                <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Source-citation report (PDF)</Button>
              </ExportGate>
              <ExportGate documentName="CaseCue Review report" onExport={() => exportWorkspaceReviewPdf(student, review)}>
                <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Review report (PDF)</Button>
              </ExportGate>
            </div>
            <p className="text-xs text-amber-700 mt-3">All exports are drafts — Educator/IEP Team Review Required.</p>
          </Card>
        </>
      )}
    </div>
  );
}
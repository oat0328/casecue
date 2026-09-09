import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import ExportBar from "@/components/shared/ExportBar";
import SourceCitations from "@/components/shared/SourceCitations";

const CATEGORY_LABELS = {
  present_levels: "Present Levels",
  goals: "Goals",
  data_alignment: "Data Alignment",
  services_accommodations: "Services & Accommodations",
  progress_monitoring: "Progress Monitoring",
  document_consistency: "Document Consistency",
};

// Tab 10 — Compliance Review: latest CaseCue review for this student, with a
// link to run the full review on the IEP Review page.
export default function ComplianceReviewTab({ student }) {
  const { data: reviews } = useAsync(
    () => base44.entities.IEPReview.filter({ student_id: student.id }, '-created_date', 1),
    [student?.id]
  );
  const review = (reviews || [])[0];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Compliance review</h3>
        <p className="text-sm text-muted-foreground mb-4">
          CaseCue reviews the IEP for potential issues — never as a legal determination. Every finding is flagged for educator review.
        </p>
        <Button asChild className="brand-gradient text-white">
          <Link to="/iep-review"><ShieldCheck className="h-4 w-4 mr-1.5" /> Run / manage full compliance review</Link>
        </Button>
      </Card>

      {!review && (
        <p className="text-sm text-muted-foreground">No CaseCue review on file for {student.first_name} yet.</p>
      )}

      {review && (
        <>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Latest review</h3>
              <span className="text-2xl font-bold">{review.score != null ? `${review.score}/100` : "—"}</span>
            </div>
            {review.category_scores && (
              <div className="space-y-3">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  const val = review.category_scores[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{label}</span><span>{val != null ? `${val}/100` : "—"}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full brand-gradient rounded-full" style={{ width: `${val ?? 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {review.summary && <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">{review.summary}</p>}
          </Card>

          <ExportBar
            title={`Compliance Review — ${student.first_name} ${student.last_name}`}
            subtitle="CaseCue quality review"
            filename={`Compliance-Review-${student.first_name}-${student.last_name}`}
            banner="Potential issues for educator review only — CaseCue never claims compliance or makes decisions."
            gated
            sections={[
              { heading: "Score", body: review.score != null ? `${review.score}/100` : "—" },
              { heading: "Category Scores", body: Object.entries(review.category_scores || {}).map(([k, v]) => `${(CATEGORY_LABELS[k] || k).replace(/_/g, " ")}: ${v ?? "—"}`).join("\n") },
              { heading: "Summary", body: review.summary },
              ...(review.findings || []).map((f) => ({
                heading: `${f.level === "high" ? "⚠ " : ""}${f.title}`,
                body: [
                  f.what_found && `Found: ${f.what_found}`,
                  f.why_flagged && `Why flagged: ${f.why_flagged}`,
                  f.suggested_action && `Suggested action: ${f.suggested_action}`,
                ].filter(Boolean).join("\n"),
              })),
            ]}
          />
          <SourceCitations studentId={student.id} className="mb-4" />

          {review.findings?.length > 0 && (
            <div className="space-y-3">
              {review.findings.map((f, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-2">
                    {f.level === "high" ? <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                      : <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                    <div className="text-sm">
                      <span className="font-medium">{f.title}</span>
                      {f.category && <span className="text-muted-foreground"> · {f.category}</span>}
                      {f.what_found && <p className="text-muted-foreground mt-1">{f.what_found}</p>}
                      {f.why_flagged && <p className="text-muted-foreground mt-1"><strong>Why flagged:</strong> {f.why_flagged}</p>}
                      {f.suggested_action && <p className="text-primary mt-1">{f.suggested_action}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
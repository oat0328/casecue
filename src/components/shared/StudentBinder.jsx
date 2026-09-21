import React, { useState } from "react";
import { BookOpen, Loader2, Printer, FileDown, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportGate from "@/components/shared/ExportGate";
import { printDoc, exportDocPdf, exportDocDocx } from "@/lib/docExport";

// Complete Student Binder: compiles the verified record, goals, saved CaseCue
// outputs (student summary, BIP analysis, amendments, progress reports), meeting
// info, and the latest compliance review into one document — Print, PDF, and
// DOCX. Sections with nothing on file are stated honestly, never invented.
export default function StudentBinder({ student }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const gather = async () => {
    setBusy(true);
    try {
      const [goals, docs, reports, reviews, meetings, modifications, transitionPlans, accommodationLogs, evaluations, sessions] = await Promise.all([
        base44.entities.Goal.filter({ student_id: student.id }, "-updated_date", 100),
        base44.entities.Document.filter({ student_id: student.id }, "-date_uploaded", 50),
        base44.entities.SavedReport.filter({ student_id: student.id }, "-created_date", 100),
        base44.entities.IEPReview.filter({ student_id: student.id }, "-created_date", 5),
        base44.entities.Meeting.filter({ student_id: student.id }, "-date", 10),
        base44.entities.Modification.filter({ student_id: student.id }, "-updated_date", 100),
        base44.entities.TransitionPlan.filter({ student_id: student.id }, "-updated_date", 5),
        base44.entities.AccommodationLog.filter({ student_id: student.id }, "-date", 100),
        base44.entities.EvaluationRecord.filter({ student_id: student.id }, "-updated_date", 100),
        base44.entities.SessionRecord.filter({ student_id: student.id }, "-date", 200),
      ]);

      const processed = (docs || []).filter((d) => d.extraction_status === "processed");
      const byType = (t) => (reports || []).filter((r) => r.report_type === t);
      const na = "Not on file.";

      const goalText =
        (goals || [])
          .map(
            (g, i) =>
              `${i + 1}. ${g.goal_area || "General"} (${g.status || "active"}): ${g.goal_text || "—"}\n   Baseline: ${g.baseline || "—"} · Target: ${g.target || "—"} · Criterion: ${g.criterion || "—"} · Measured by: ${g.measurement_method || "—"}`
          )
          .join("\n") || na;

      const behaviorSaved = [...byType("bip_draft"), ...byType("behavior_analysis")];
      const bipBody = behaviorSaved[0]
        ? [
            behaviorSaved[0].content?.analysis?.behavior_summary &&
              `Summary: ${behaviorSaved[0].content.analysis.behavior_summary}`,
            behaviorSaved[0].content?.analysis?.function_of_behavior &&
              `Function of behavior: ${behaviorSaved[0].content.analysis.function_of_behavior}`,
            behaviorSaved[0].content?.analysis?.bip_draft &&
              `BIP draft:\n${behaviorSaved[0].content.analysis.bip_draft}`,
          ]
            .filter(Boolean)
            .join("\n\n")
        : na + " Run an analysis in the BIP & FBA tab of IEP Studio.";

      const amendments = byType("amendment");
      const amendmentBody = amendments.length
        ? amendments
            .map(
              (a, i) =>
                `${i + 1}. ${a.content?.amendment?.amendment_language || "Saved amendment"} (saved ${new Date(
                  a.created_date
                ).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})})`
            )
            .join("\n")
        : na;

      const progressReports = byType("progress_report");
      const progressBody = progressReports.length
        ? progressReports
            .slice(0, 3)
            .map((r, i) => {
              const grs = (r.content?.goal_reports || [])
                .map((gr) => `${gr.goal_area}: ${gr.statement}`)
                .join("\n");
              return `Report ${i + 1} (saved ${new Date(r.created_date).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})}):\n${grs}${
                r.content?.overall_summary ? `\nOverall: ${r.content.overall_summary}` : ""
              }`;
            })
            .join("\n\n")
        : na + " Generate one on the Progress Reports page.";

      const aiSummary = byType("student_summary")[0];
      const review = (reviews || [])[0];
      const meeting = (meetings || [])[0];

      const sections = [
        {
          heading: "Student Snapshot",
          body: [
            `${student.first_name} ${student.last_name} · Grade ${student.grade || "—"}`,
            `Eligibility: ${student.eligibility_category || "not on file"}`,
            `IEP date: ${student.iep_date || "not on file"} · Annual review due: ${student.annual_review_due || "not on file"} · Reevaluation due: ${student.reevaluation_due || "not on file"}`,
            `Service minutes: ${student.service_minutes ?? "not on file"}`,
          ].join("\n"),
        },
        {
          heading: "CaseCue Summary",
          body:
            aiSummary?.content?.summary ||
            na + " Generate one in the CaseCue Summary tab of IEP Studio.",
        },
        { heading: "Present Levels", body: student.present_levels || na },
        { heading: "Strengths", body: student.strengths || na },
        { heading: "Areas of Need", body: student.areas_of_need || na },
        { heading: "Goals", body: goalText },
        { heading: "Accommodations", body: student.accommodations || na },
        {
          heading: "Modifications",
          body: (modifications || []).length
            ? modifications.map((m, i) => `${i + 1}. ${m.area || "General"}: ${m.modification}${m.setting ? ` · ${m.setting}` : ""}${m.frequency ? ` · ${m.frequency}` : ""}`).join("\n")
            : na,
        },
        {
          heading: "SDI / Specially Designed Instruction",
          body: na + " Draft SDI language in IEP Studio (Accommodations & SDI tab).",
        },
        { heading: "Services", body: (student.services || []).join(", ") || na },
        {
          heading: "Accommodation Implementation",
          body: (accommodationLogs || []).length
            ? accommodationLogs.slice(0, 25).map((x) => `${x.date}: ${x.accommodation} — ${String(x.status || "").replace(/_/g, " ")}${x.effectiveness ? ` · ${x.effectiveness}` : ""}`).join("\n")
            : na,
        },
        {
          heading: "Transition Planning",
          body: (transitionPlans || [])[0]
            ? [
                `Status: ${(transitionPlans || [])[0].status || "draft"}`,
                `Interests & preferences: ${(transitionPlans || [])[0].interests || "—"}`,
                `Student voice: ${(transitionPlans || [])[0].student_voice || "—"}`,
                `Education/training goal: ${(transitionPlans || [])[0].education_goal || "—"}`,
                `Employment goal: ${(transitionPlans || [])[0].employment_goal || "—"}`,
                `Independent living goal: ${(transitionPlans || [])[0].independent_living_goal || "—"}`,
                `Activities: ${(transitionPlans || [])[0].activities || "—"}`,
              ].join("\n")
            : na,
        },
        {
          heading: "Evaluations / MET / Reevaluation",
          body: (evaluations || []).length
            ? evaluations.map((e, i) => `${i + 1}. ${e.evaluation_type || "Evaluation"} · ${String(e.status || "").replace(/_/g, " ")}${e.due_date ? ` · due ${e.due_date}` : ""}${e.meeting_date ? ` · meeting ${e.meeting_date}` : ""}`).join("\n")
            : na,
        },
        {
          heading: "Recent Service Sessions",
          body: (sessions || []).length
            ? sessions.slice(0, 30).map((s) => `${s.date}: ${s.activity || s.service_type || "Session"} · ${s.delivered_minutes ?? s.duration_minutes ?? "—"} min · ${s.status || "—"}`).join("\n")
            : na,
        },
        { heading: "BIP", body: bipBody },
        {
          heading: "FBA",
          body:
            (docs || [])
              .filter((d) => d.document_type === "FBA")
              .map((d) => d.filename)
              .join(" · ") || na + " Upload one in the Upload Center.",
        },
        { heading: "Amendments", body: amendmentBody },
        {
          heading: "Meeting Packet",
          body: meeting
            ? [
                `${meeting.title} (${meeting.meeting_type || "meeting"} · ${meeting.date || "date not set"} · status: ${meeting.status || "—"})`,
                meeting.agenda && `Agenda: ${meeting.agenda}`,
                meeting.parent_concerns && `Parent concerns: ${meeting.parent_concerns}`,
                meeting.teacher_concerns && `Teacher concerns: ${meeting.teacher_concerns}`,
                meeting.notes && `Notes: ${meeting.notes}`,
              ]
                .filter(Boolean)
                .join("\n")
            : na + " Schedule a meeting in Meeting Center.",
        },
        { heading: "Progress Reports", body: progressBody },
        {
          heading: "Compliance Review",
          body: review
            ? [
                `Score: ${review.score ?? "—"}/100`,
                review.category_scores
                  ? Object.entries(review.category_scores)
                      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v ?? "—"}`)
                      .join(" · ")
                  : "",
                review.summary || "",
                ...(review.findings || []).map(
                  (f) =>
                    `[${(f.level || "").toUpperCase()}] ${f.title}: ${f.what_found || ""} Suggested action: ${f.suggested_action || "—"}`
                ),
              ]
                .filter(Boolean)
                .join("\n")
            : na + " Run one on the IEP Review page.",
        },
        {
          heading: "Sources",
          body: processed.length
            ? processed.map((d) => `${d.filename} (${d.document_type})`).join("\n")
            : "No processed documents on file — binder compiled from the verified student record.",
        },
      ];

      return {
        title: `Student Binder — ${student.first_name} ${student.last_name}`,
        subtitle: `Complete compiled binder · exported ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})}`,
        filename: `Student-Binder-${student.first_name}-${student.last_name}`,
        banner:
          "DRAFT — Educator Review Required. Compiled by CaseCue from your verified records; sections marked 'Not on file' are stated, never invented.",
        sections,
      };
    } catch (e) {
      toast({ title: "Could not build binder", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const runPrint = async () => {
    const opts = await gather();
    if (!opts) return;
    if (!printDoc(opts)) toast({ title: "Allow pop-ups to print", variant: "destructive" });
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Student Binder
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Export {student.first_name}'s complete binder in one document — snapshot, CaseCue summary, present levels,
            strengths, needs, goals, accommodations, modifications, transition, evaluations, services, BIP, FBA, amendments, meeting packet, progress
            reports, and the latest compliance review. Anything not on file is stated honestly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" onClick={runPrint} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />} Print
          </Button>
          <ExportGate documentName="Student Binder" onExport={async () => {
            const opts = await gather();
            if (opts) exportDocPdf(opts);
          }}>
            <Button variant="outline" disabled={busy}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
          </ExportGate>
          <ExportGate documentName="Student Binder" onExport={async () => {
            const opts = await gather();
            if (opts) exportDocDocx(opts);
          }}>
            <Button className="brand-gradient text-white" disabled={busy}>
              <FileText className="h-4 w-4 mr-1" /> DOCX
            </Button>
          </ExportGate>
        </div>
      </div>
    </Card>
  );
}
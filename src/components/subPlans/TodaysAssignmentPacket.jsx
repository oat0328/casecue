import React from "react";
import { BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import ExportBar from "@/components/shared/ExportBar";
import AiDisclaimer from "@/components/shared/AiDisclaimer";

const TYPE_LABELS = {
  assignment: "Assignment",
  worksheet: "Worksheet",
  reading_passage: "Reading Passage",
  lesson_material: "Lesson Materials",
  presentation: "Presentation (PPT)",
  other: "Other",
};

// Assignments For Today — one consolidated, printable packet of everything a
// substitute needs: Lesson Studio worksheets and teacher-uploaded assignments,
// in a single document with one Print / PDF / DOCX / Email / Share export.
export default function TodaysAssignmentPacket() {
  const { data: lessons } = useAsync(() => base44.entities.Lesson.list("-updated_date", 100), []);
  const { data: materials } = useAsync(() => base44.entities.TeachingMaterial.list("-updated_date", 100), []);

  const sections = [];
  (lessons || []).forEach((l) => {
    const parts = [];
    const ctx = [l.subject, l.grade ? `Grade ${l.grade}` : ""].filter(Boolean).join(" · ");
    if (ctx) parts.push(ctx);
    if (l.objective) parts.push(`Objective: ${l.objective}`);
    (l.practice_materials || []).forEach((m, i, arr) => {
      const label = arr.length > 1 ? `Worksheet ${i + 1}` : "Worksheet";
      parts.push(`${label}: ${m.title || m.material_type || "Practice material"}\n${m.content || ""}`);
      if (m.answer_key) parts.push(`Answer key (${label}) — sub copy:\n${m.answer_key}`);
    });
    if (l.accommodations) parts.push(`Accommodations: ${l.accommodations}`);
    if (parts.length) sections.push({ heading: `Lesson: ${l.title}`, body: parts.join("\n\n"), meta: "Lesson Studio" });
  });
  (materials || []).forEach((m) => {
    const parts = [];
    const ctx = [m.subject, m.grade ? `Grade ${m.grade}` : "", m.skill].filter(Boolean).join(" · ");
    if (ctx) parts.push(ctx);
    if (m.notes) parts.push(`Directions: ${m.notes}`);
    if (m.file_url) parts.push(`Attached file: ${m.filename || ""}\n${m.file_url}`);
    if (parts.length)
      sections.push({
        heading: `${TYPE_LABELS[m.material_type] || "Material"}: ${m.title}`,
        body: parts.join("\n\n"),
        meta: "Teacher Upload",
      });
  });

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const filename = `Assignments-For-Today-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Card className="p-5 sm:p-6 mb-6">
      <h3 className="font-semibold flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" /> Assignments For Today — Printable Packet
      </h3>
      <p className="text-sm text-muted-foreground mt-0.5 mb-4">
        Every lesson worksheet and uploaded assignment in one clean, printable document for your substitute.
      </p>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-medium">Nothing to include yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create lessons in Lesson Studio or upload worksheets below — they appear here automatically.
          </p>
        </div>
      ) : (
        <>
          <ExportBar
            title="Assignments For Today"
            subtitle={todayStr}
            filename={filename}
            banner="DRAFT — Educator Review Required. Verify all activities, answer keys, and directions before handing to a substitute."
            gated
            sections={sections}
          />

          <div className="mt-5 rounded-xl border border-border divide-y divide-border">
            {sections.map((s, i) => (
              <div key={i} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-primary">{s.heading}</h4>
                  <span className="text-xs text-muted-foreground shrink-0">{s.meta}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap mt-1.5 text-foreground/90">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <AiDisclaimer extra="Verify every activity, answer key, and direction before handing this packet to a substitute." />
          </div>
        </>
      )}
    </Card>
  );
}
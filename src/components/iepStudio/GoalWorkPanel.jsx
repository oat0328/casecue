import React from "react";
import ExportBar from "@/components/shared/ExportBar";
import AiDisclaimer from "@/components/shared/AiDisclaimer";

// Generated, printable student work aligned to one IEP goal: activity,
// practice items, answer key, and a progress-monitoring probe — with the
// global export bar (Save, Print, PDF, DOCX, Email, Share).
export default function GoalWorkPanel({ assignment, goal, student, onSave }) {
  const a = assignment || {};
  const items = a.items || [];
  const sections = [
    { heading: "Activity / Passage", body: a.activity },
    { heading: "Practice Items", body: items.map((it, i) => `${i + 1}. ${it.question}`).join("\n") },
    {
      heading: "Answer Key (teacher copy)",
      body: items.map((it, i) => `${i + 1}. ${it.question}\n   Answer: ${it.answer}`).join("\n\n"),
    },
    { heading: "Progress-Monitoring Probe", body: a.probe },
    { heading: "Teacher Note", body: a.teacher_note },
    { heading: "Accommodations Reminder", body: a.accommodations_reminder },
  ].filter((s) => s.body);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold">{a.activity_title || "Goal-aligned assignment"}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Skill focus: {a.skill_focus || "—"} · Source: System Generated — aligned to the verified IEP goal.
        </p>
      </div>

      <ExportBar
        title={a.activity_title || "Goal-aligned assignment"}
        subtitle={`${student?.first_name || ""} ${student?.last_name || ""} — Goal: ${goal?.goal_area || "IEP goal"}`.trim()}
        filename={`Assignment-${student?.first_name || "Student"}-${goal?.goal_area || "Goal"}`}
        banner="DRAFT — Educator Review Required. system-assisted materials aligned to the student's IEP goal."
        gated
        onSave={onSave}
        sections={sections}
      />

      {sections.map((s) => (
        <div key={s.heading}>
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.heading}</h5>
          <p className="text-sm whitespace-pre-wrap">{s.body}</p>
        </div>
      ))}

      <AiDisclaimer extra="Verify the activity matches the student's current level and documented IEP accommodations before use." />
    </div>
  );
}
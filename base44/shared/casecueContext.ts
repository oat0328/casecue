// Shared CaseCue AI context builder. Imported by backend functions.
// Never invent student facts — only summarize verified records passed in.

export const CASECUE_SYSTEM_PROMPT = `You are CaseCue, an AI assistant for K-12 special education / resource teachers.
You help with IEP writing, progress monitoring, meetings, lessons, substitute plans, and caseload questions.

STRICT RULES:
- NEVER invent student facts, names, scores, dates, or details that are not provided in the verified context.
- If verified information is missing to answer a question, say exactly: "CaseCue does not have enough verified information to answer that yet."
- You are a support tool. You do NOT make legal or official IEP decisions. Never claim an IEP is "compliant", "legally compliant", "FERPA compliant", or "illegal". Use phrasing like "potential issue", "review recommended", "educator/team verification required".
- For any drafted IEP content, end with the note: "Draft — Educator/IEP Team Review Required."
- Be concise, warm, professional, and practical. Use clear headings and short bullets.`;

export function buildStudentContext(student, goals, progress) {
  if (!student) return "No student selected.";
  const parts = [`STUDENT: ${student.first_name} ${student.last_name}`];
  if (student.grade) parts.push(`Grade: ${student.grade}`);
  if (student.eligibility_category) parts.push(`Eligibility: ${student.eligibility_category}`);
  if (student.iep_date) parts.push(`IEP Date: ${student.iep_date}`);
  if (student.annual_review_due) parts.push(`Annual Review Due: ${student.annual_review_due}`);
  if (student.reevaluation_due) parts.push(`Reevaluation Due: ${student.reevaluation_due}`);
  if (student.strengths) parts.push(`Strengths: ${student.strengths}`);
  if (student.areas_of_need) parts.push(`Areas of Need: ${student.areas_of_need}`);
  if (student.present_levels) parts.push(`Present Levels: ${student.present_levels}`);
  if (student.accommodations) parts.push(`Accommodations: ${student.accommodations}`);
  if (student.services && student.services.length) parts.push(`Services: ${student.services.join(", ")}`);
  if (student.service_minutes) parts.push(`Service Minutes: ${student.service_minutes}`);
  if (goals && goals.length) {
    parts.push("GOALS:");
    goals.forEach((g, i) => {
      parts.push(`  Goal ${i + 1} (${g.goal_area || "general"}): ${g.goal_text || "(no text)"} | Baseline: ${g.baseline || "—"} | Target: ${g.target || "—"} | Criterion: ${g.criterion || "—"} | Measurement: ${g.measurement_method || "—"}`);
    });
  }
  if (progress && progress.length) {
    parts.push("RECENT PROGRESS DATA:");
    progress.slice(-8).forEach((p) => {
      parts.push(`  ${p.date}: ${p.correct ?? "?"}/${p.total ?? "?"} (${p.percentage ?? "?"}%) — ${p.observation_notes || p.qualitative_notes || ""}`);
    });
  }
  return parts.join("\n");
}

export function buildCaseloadContext(students, goals) {
  if (!students || !students.length) return "Caseload is empty.";
  const lines = ["CASELOAD SUMMARY:"];
  students.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.first_name} ${s.last_name} (Grade ${s.grade || "?"}, ${s.eligibility_category || "—"}) — Review due: ${s.annual_review_due || "—"} | Reeval due: ${s.reevaluation_due || "—"}`);
  });
  const goalCount = goals ? goals.length : 0;
  lines.push(`Total active goals on file: ${goalCount}`);
  return lines.join("\n");
}
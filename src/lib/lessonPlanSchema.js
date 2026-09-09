// Single source of truth for the Lesson Studio structured plan: header fields,
// grouped sections, and the special accommodations field. Used by the plan
// editor, the review step, and the PDF/DOCX/print exporters.

export const LESSON_HEADER_FIELDS = [
  { key: "title", label: "Lesson title", type: "input" },
  { key: "teacher", label: "Teacher", type: "input" },
  { key: "date", label: "Date", type: "input" },
  { key: "subject_skill", label: "Subject and skill", type: "input" },
  { key: "grade_group", label: "Grade or instructional group", type: "input" },
  { key: "duration", label: "Estimated duration", type: "input" },
];

export const SPECIAL_ACCOMMODATION_KEY = "accommodations_note";

export const LESSON_GROUPS = [
  {
    title: "Objectives & Hook",
    fields: [
      { key: "iep_objective", label: "IEP-aligned lesson objective", rows: 3 },
      { key: "i_can_statement", label: "Student-friendly “I can” statement", rows: 2 },
      { key: "essential_question", label: "Essential question (with suggested answer)", rows: 2 },
      { key: "real_world_connection", label: "Real-world connection", rows: 2 },
    ],
  },
  {
    title: "Materials & Readiness",
    fields: [
      { key: "materials", label: "Required materials", rows: 2 },
      { key: "academic_vocabulary", label: "Academic vocabulary", rows: 3 },
      { key: "prior_knowledge", label: "Prior knowledge", rows: 2 },
    ],
  },
  {
    title: "Opening the Lesson",
    fields: [
      { key: "anticipatory_set", label: "Anticipatory set / warm-up (3–5 min)", rows: 3 },
      { key: "brain_teasers", label: "Brain teasers with suggested answers", rows: 3 },
    ],
  },
  {
    title: "Mini-Lesson & Modeling",
    fields: [
      { key: "mini_lecture", label: "Mini-lecture: ready-to-read teacher script", rows: 7 },
      { key: "i_do", label: "I Do — teacher model (think-aloud)", rows: 4 },
    ],
  },
  {
    title: "Guided & Independent Practice",
    fields: [
      { key: "we_do", label: "We Do — guided practice", rows: 4 },
      { key: "you_do", label: "You Do — independent practice", rows: 4 },
      { key: "example_student_response", label: "Example student response", rows: 3 },
      { key: "example_explanation", label: "Teacher explanation of the example", rows: 3 },
      { key: "checks_for_understanding", label: "Checks for understanding", rows: 3 },
      { key: "misconceptions", label: "Possible misconceptions", rows: 3 },
    ],
  },
  {
    title: "Support & Differentiation",
    fields: [
      { key: "differentiation", label: "Differentiation (emerging / developing / advanced)", rows: 4 },
      { key: "small_group_plan", label: "Small-group instructional plan", rows: 3 },
    ],
  },
  {
    title: "Data & Progress Monitoring",
    fields: [
      { key: "progress_monitoring", label: "Progress-monitoring method", rows: 3 },
      { key: "quantitative_table", label: "Quantitative data-collection table", rows: 5 },
      { key: "qualitative_template", label: "Qualitative session-note template", rows: 4 },
      { key: "quick_check", label: "Quick check / exit ticket", rows: 3 },
      { key: "answer_key", label: "Answer key / scoring guide", rows: 5 },
      { key: "mastery_criterion", label: "Mastery criterion", rows: 2 },
      { key: "cm_hub_note", label: "CM Hub Session Tracking note", rows: 2 },
    ],
  },
  {
    title: "Reflection & Next Steps",
    fields: [
      { key: "teacher_reflection", label: "Teacher reflection prompts", rows: 3 },
      { key: "next_step", label: "Recommended next instructional step", rows: 2 },
    ],
  },
];

export const ALL_PLAN_KEYS = [
  ...LESSON_HEADER_FIELDS.map((f) => f.key),
  ...LESSON_GROUPS.flatMap((g) => g.fields.map((f) => f.key)),
  SPECIAL_ACCOMMODATION_KEY,
];

// Fills any missing plan keys with "" so editors and exporters never hit undefined.
export function normalizePlan(plan) {
  const base = {};
  ALL_PLAN_KEYS.forEach((k) => { base[k] = plan?.[k] != null ? String(plan[k]) : ""; });
  return base;
}
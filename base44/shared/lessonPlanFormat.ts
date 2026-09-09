// Shared AI schemas and section definitions for the Lesson Studio upgrade.
// Imported by analyzeAssignment, generateLessonFromAssignment, and
// generateOriginalPractice backend functions.

export const ASSIGNMENT_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    detected_title: { type: "string" },
    subject: { type: "string" },
    grade_level: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    directions: { type: "string" },
    standards_alignment: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
    difficulty: { type: "string" },
    estimated_completion_time: { type: "string" },
    prerequisite_skills: { type: "array", items: { type: "string" } },
    accessibility_barriers: { type: "array", items: { type: "string" } },
    suggested_accommodations: { type: "array", items: { type: "string" } },
    answer_key: { type: "string" },
    page_summary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          page: { type: "string" },
          summary: { type: "string" }
        },
        required: ["summary"]
      }
    },
    confidence: { type: "string" },
    citations: { type: "array", items: { type: "string" } }
  },
  required: ["detected_title", "subject", "grade_level", "skills"]
};

// Header fields are provided/echoed by the teacher; every other section is generated.
export const LESSON_PLAN_SECTIONS = [
  { key: "iep_objective", label: "IEP-aligned lesson objective", guidance: "A measurable Given/then objective aligned to the assignment skills and the students' IEP goals, including the accuracy criterion." },
  { key: "i_can_statement", label: "Student-friendly 'I can' statement", guidance: "One sentence a student would say." },
  { key: "essential_question", label: "Essential question", guidance: "The question plus a suggested student-friendly answer." },
  { key: "real_world_connection", label: "Real-world connection", guidance: "One or two sentences explaining when this skill matters outside school." },
  { key: "materials", label: "Required materials", guidance: "Concrete list for this exact lesson." },
  { key: "academic_vocabulary", label: "Academic vocabulary", guidance: "One word per line as: word — kid-friendly definition." },
  { key: "prior_knowledge", label: "Prior knowledge", guidance: "What students must already be able to do." },
  { key: "anticipatory_set", label: "Anticipatory set / warm-up", guidance: "A 3–5 minute opening activity the teacher can run immediately." },
  { key: "brain_teasers", label: "Brain teasers with suggested answers", guidance: "2–3 short puzzles or riddles connected to the skill, each WITH its answer." },
  { key: "mini_lecture", label: "Mini-lecture: ready-to-read teacher script", guidance: "A 3–5 minute script written as the exact words the teacher says, natural and warm, like speaking to a small resource group." },
  { key: "i_do", label: "I Do — teacher model", guidance: "Think-aloud script: exactly what the teacher models, says, and writes." },
  { key: "we_do", label: "We Do — guided practice", guidance: "Steps for doing it together, including what students say/do at each step." },
  { key: "you_do", label: "You Do — independent practice", guidance: "The independent task tied to the uploaded assignment." },
  { key: "example_student_response", label: "Example student response", guidance: "One complete exemplar response at the target level." },
  { key: "example_explanation", label: "Teacher explanation of the example", guidance: "Why the exemplar meets the objective, point by point." },
  { key: "checks_for_understanding", label: "Checks for understanding", guidance: "3–4 quick checks with expected student answers." },
  { key: "misconceptions", label: "Possible misconceptions", guidance: "Common errors and how the teacher corrects each one." },
  { key: "accommodations_note", label: "AI-suggested accommodations", guidance: "MUST open with the sentence: 'Only use accommodations documented in the student's IEP.' Then list suggested supports clearly labeled as ideas to review against the IEP — never present them as IEP-mandated." },
  { key: "differentiation", label: "Differentiation", guidance: "Three labeled parts: Emerging, Developing, Advanced — concrete adjustments for each." },
  { key: "small_group_plan", label: "Small-group instructional plan", guidance: "Grouping, rotation, and teacher focus for small-group delivery." },
  { key: "progress_monitoring", label: "Progress-monitoring method", guidance: "How to measure the objective (probe type, frequency, recording method)." },
  { key: "quantitative_table", label: "Quantitative data-collection table", guidance: "A ready-to-use table in text form: column headers, then one row per trial/opportunity a teacher can fill in during the lesson." },
  { key: "qualitative_template", label: "Qualitative session-note template", guidance: "A fill-in-the-blank narrative template (engagement, prompting, independence, next step)." },
  { key: "quick_check", label: "Quick check / exit ticket", guidance: "The exact 2–3 item exit ticket." },
  { key: "answer_key", label: "Answer key / scoring guide", guidance: "Answers for the You Do and exit ticket, with a simple scoring guide." },
  { key: "mastery_criterion", label: "Mastery criterion", guidance: "The measurable criterion (e.g., 4 of 5 trials at 80% for 2 consecutive sessions), aligned to the IEP goal criterion." },
  { key: "cm_hub_note", label: "CM Hub Session Tracking note", guidance: "One short note on which fields to record in CaseCue's Session Tracker for this lesson (goal, activity, quantitative counts)." },
  { key: "teacher_reflection", label: "Teacher reflection prompts", guidance: "3–4 reflection questions (what worked, pacing, student response, data surprises)." },
  { key: "next_step", label: "Recommended next instructional step", guidance: "What to teach next based on likely outcomes." }
];

export const LESSON_PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    teacher: { type: "string" },
    date: { type: "string" },
    subject_skill: { type: "string" },
    grade_group: { type: "string" },
    duration: { type: "string" },
    ...Object.fromEntries(LESSON_PLAN_SECTIONS.map((s) => [s.key, { type: "string" }]))
  },
  required: ["title", "iep_objective"]
};

export const PRACTICE_MATERIAL_TYPES = [
  "worksheet",
  "guided_practice",
  "independent_practice",
  "exit_ticket",
  "warm_up",
  "vocabulary_activity",
  "progress_probe",
  "rubric"
];
// Shared schemas for CaseCue Lesson Studio.
export const ASSIGNMENT_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    detected_title: { type: "string" }, subject: { type: "string" }, grade_level: { type: "string" },
    skills: { type: "array", items: { type: "string" } }, directions: { type: "string" },
    standards_alignment: { type: "array", items: { type: "string" } }, questions: { type: "array", items: { type: "string" } },
    difficulty: { type: "string" }, estimated_completion_time: { type: "string" },
    prerequisite_skills: { type: "array", items: { type: "string" } }, accessibility_barriers: { type: "array", items: { type: "string" } },
    suggested_accommodations: { type: "array", items: { type: "string" } }, answer_key: { type: "string" },
    page_summary: { type: "array", items: { type: "object", properties: { page: { type: "string" }, summary: { type: "string" } }, required: ["summary"] } },
    confidence: { type: "string" }, citations: { type: "array", items: { type: "string" } }
  }, required: ["detected_title", "subject", "grade_level", "skills"]
};

// Full professional plan: the everyday UI can stay 1-2-3 while the saved/exported plan is admin-ready.
export const LESSON_PLAN_SECTIONS = [
  { key: "iep_objective", label: "IEP-aligned measurable objective", guidance: "Given/condition, observable skill, accuracy/criterion, and measurement method. Align only to verified attached IEP goals." },
  { key: "i_can_statement", label: "Student-friendly I can statement", guidance: "One clear sentence students can understand." },
  { key: "essential_question", label: "Essential question", guidance: "Question plus a student-friendly expected response." },
  { key: "standards_rationale", label: "Standards alignment rationale", guidance: "Explain how the selected standard connects to today's skill and task. Do not invent a standard when none is verified." },
  { key: "baseline_connection", label: "Present-level / baseline connection", guidance: "Connect instruction to the verified IEP baseline or prior performance supplied. If unavailable, say baseline data was not supplied." },
  { key: "real_world_connection", label: "Real-world connection", guidance: "Why and where this skill matters outside this lesson." },
  { key: "materials", label: "Materials and preparation", guidance: "Exact materials plus what the teacher should prepare before students arrive." },
  { key: "academic_vocabulary", label: "Academic vocabulary", guidance: "One term per line with kid-friendly definition and a quick example." },
  { key: "prior_knowledge", label: "Prerequisite / prior knowledge", guidance: "Skills students need and a quick way to check readiness." },
  { key: "anticipatory_set", label: "Warm-up / anticipatory set", guidance: "3-5 minute opener with teacher directions, student action, and expected response." },
  { key: "mini_lecture", label: "Mini-lecture teacher script", guidance: "Ready-to-read 3-5 minute natural teacher script with explicit instruction and vocabulary." },
  { key: "i_do", label: "I Do — explicit model", guidance: "Detailed think-aloud: what the teacher says, models, writes, and checks. Include approximate minutes." },
  { key: "we_do", label: "We Do — guided practice", guidance: "Step-by-step guided practice, teacher prompts, expected student responses, correction prompts, and approximate minutes." },
  { key: "you_do", label: "You Do — independent practice", guidance: "Exact independent task, directions, success criteria, and approximate minutes. Tie to source assignment when one exists." },
  { key: "checks_for_understanding", label: "Checks for understanding", guidance: "At least 4 checks placed across I Do/We Do/You Do, with expected responses and what the teacher does if students miss them." },
  { key: "questioning_plan", label: "Questioning plan", guidance: "Literal, skill/application, and higher-order questions with expected answers." },
  { key: "example_student_response", label: "Exemplar student response", guidance: "Complete target-level exemplar." },
  { key: "example_explanation", label: "Why the exemplar meets the target", guidance: "Explain the exemplar against the objective/success criteria." },
  { key: "misconceptions", label: "Anticipated misconceptions and corrections", guidance: "Likely errors, what they may indicate, and exact corrective response/reteach move." },
  { key: "accommodations_note", label: "Verified accommodations and supports", guidance: "MUST open: 'Only use accommodations documented in the student's IEP.' Clearly distinguish verified accommodations from optional instructional supports." },
  { key: "differentiation", label: "Differentiation", guidance: "Emerging, Developing, Advanced: concrete changes to prompting, representation, response mode, pacing, and task complexity without changing the IEP." },
  { key: "small_group_plan", label: "Small-group delivery plan", guidance: "Grouping, seating/rotation, teacher focus, prompting hierarchy, and independence plan." },
  { key: "behavior_engagement_plan", label: "Engagement / behavior supports", guidance: "Neutral proactive classroom supports, reinforcement/choice/attention supports where appropriate; do not invent a BIP." },
  { key: "progress_monitoring", label: "Progress-monitoring method", guidance: "What will be measured, correct/total opportunities, percentage calculation, prompting/support level, frequency, and where evidence is recorded." },
  { key: "quantitative_table", label: "Quantitative data table", guidance: "Ready-to-use text table with student, correct, total, %, prompting/support, and notes." },
  { key: "qualitative_template", label: "Qualitative session note", guidance: "Fill-in template covering engagement, strategy use, prompting, independence, error pattern, and next step." },
  { key: "quick_check", label: "Exit ticket", guidance: "Exact 2-3 item exit ticket aligned to objective." },
  { key: "answer_key", label: "Answer key / scoring guide", guidance: "Answers/scoring criteria for independent practice and exit ticket." },
  { key: "mastery_criterion", label: "Mastery criterion", guidance: "Use the verified IEP criterion when supplied; otherwise label the lesson criterion as instructional, not an IEP change." },
  { key: "reteach_plan", label: "Reteach / extension decision rule", guidance: "State what to do next for below target, near target, and at/above target performance." },
  { key: "evidence_to_save", label: "Evidence to retain", guidance: "Identify which work sample, probe, score, observation, or session note should be saved as evidence." },
  { key: "cm_hub_note", label: "CaseCue Session Tracker note", guidance: "Exact fields/data the teacher should record after teaching." },
  { key: "teacher_reflection", label: "Teacher reflection", guidance: "4 concise reflection prompts covering effectiveness, pacing, student response, data, and next instruction." },
  { key: "next_step", label: "Next instructional step", guidance: "Specific next lesson/reteach/extension recommendation based on possible outcomes." }
];

export const LESSON_PLAN_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" }, teacher: { type: "string" }, date: { type: "string" }, subject_skill: { type: "string" },
    grade_group: { type: "string" }, duration: { type: "string" },
    ...Object.fromEntries(LESSON_PLAN_SECTIONS.map((s) => [s.key, { type: "string" }]))
  }, required: ["title", "iep_objective", "i_do", "we_do", "you_do", "progress_monitoring"]
};

export const PRACTICE_MATERIAL_TYPES = ["worksheet","guided_practice","independent_practice","exit_ticket","warm_up","vocabulary_activity","progress_probe","rubric"];

import { base44 } from "@/api/base44Client";

// Fictional demo caseload — every record is labeled so it can never be mistaken
// for (or mixed with) real student data.
export const DEMO_LABEL = "DEMO DATA — NOT A REAL STUDENT";

const d = (offset) => {
  const t = new Date();
  t.setDate(t.getDate() + offset);
  return t.toISOString().slice(0, 10);
};

const STUDENTS = [
  {
    first_name: "Ava", last_name: "Rivera (Demo)", grade: "3", eligibility_category: "SLD",
    iep_date: "2025-10-21", annual_review_due: d(42), reevaluation_due: "2027-01-15",
    strengths: "DEMO — Strong listening comprehension and verbal reasoning; engages well in small-group discussion.",
    areas_of_need: "DEMO — Decoding multisyllabic words; reading fluency below grade-level benchmark.",
    present_levels: "DEMO — Reads 68 words per minute with 91% accuracy (grade-3 benchmark: 90 wpm). Comprehension of orally read text is a relative strength.",
    accommodations: "DEMO — Extended time on reading tasks; small-group testing; audiobook access for content-area texts.",
    services: ["DEMO — Reading intervention, 30 min/day, small group"], service_minutes: 150,
    status: "active", notes: DEMO_LABEL, avatar_color: "violet",
  },
  {
    first_name: "Marcus", last_name: "Johnson (Demo)", grade: "5", eligibility_category: "OHI",
    iep_date: "2025-09-21", annual_review_due: d(12), reevaluation_due: "2027-03-10",
    strengths: "DEMO — Strong spatial reasoning; builds excellent rapport with peers; advocates for himself.",
    areas_of_need: "DEMO — Sustained attention during independent work; written expression.",
    present_levels: "DEMO — Writes 3-4 sentences independently with graphic organizers before fatigue. On-task behavior averages 6 minutes without a check-in.",
    accommodations: "DEMO — Movement breaks every 20 minutes; assignments chunked into smaller steps; visual schedule.",
    services: ["DEMO — Resource support, 45 min/day", "DEMO — Counseling, 30 min/month"], service_minutes: 225,
    status: "active", notes: DEMO_LABEL, avatar_color: "blue",
  },
  {
    first_name: "Sofia", last_name: "Chen (Demo)", grade: "2", eligibility_category: "SLI",
    iep_date: "2025-11-18", annual_review_due: d(60), reevaluation_due: d(45),
    strengths: "DEMO — Expressive vocabulary in her first language is strong; motivated by peer interaction.",
    areas_of_need: "DEMO — Speech sound production (r, l, s blends); following multi-step verbal directions.",
    present_levels: "DEMO — Produces target sounds with 60% accuracy in structured settings; needs cues to carry over into conversation.",
    accommodations: "DEMO — Preferred seating near the speaker; directions repeated and paired with visuals.",
    services: ["DEMO — Speech-language therapy, 30 min, 2x/week"], service_minutes: 60,
    status: "active", notes: DEMO_LABEL, avatar_color: "emerald",
  },
  {
    first_name: "Elijah", last_name: "Brooks (Demo)", grade: "4", eligibility_category: "Autism",
    iep_date: "2027-02-12", annual_review_due: d(120), reevaluation_due: d(75),
    strengths: "DEMO — Exceptional memory for facts and routines; deep interest in trains and engineering.",
    areas_of_need: "DEMO — Flexible thinking during unexpected schedule changes; peer conversation skills.",
    present_levels: "DEMO — Uses a visual schedule independently 90% of the time. Initiatates conversation with a peer about twice per 30-minute session with one adult prompt.",
    accommodations: "DEMO — Advance notice of transitions; calm corner access; first-then boards.",
    services: ["DEMO — Social skills group, 30 min, 2x/week", "DEMO — Consultation with OT, 30 min/month"], service_minutes: 90,
    status: "active", notes: DEMO_LABEL, avatar_color: "amber",
  },
  {
    first_name: "Lily", last_name: "Patel (Demo)", grade: "6", eligibility_category: "SLD",
    iep_date: "2025-09-30", annual_review_due: d(21), reevaluation_due: "2027-04-20",
    strengths: "DEMO — Creative storyteller; strong verbal contributions during literature circles.",
    areas_of_need: "DEMO — Written expression and organization of multi-paragraph essays; materials management.",
    present_levels: "DEMO — Writes 2 paragraphs with a rubric; idea organization scores 2/4. Locker and binder need adult support 3x/week.",
    accommodations: "DEMO — Graphic organizers provided; reduced item count on written assessments; copy of class notes.",
    services: ["DEMO — Written expression intervention, 45 min, 3x/week"], service_minutes: 135,
    status: "active", notes: DEMO_LABEL, avatar_color: "rose",
  },
];

function buildGoals(id) {
  const g = (i, area, text, baseline, target, condition, criterion, method, monitoring) => ({
    student_id: id(i), goal_area: area, goal_text: `DEMO — ${text}`, baseline, target,
    condition, criterion, measurement_method: method, progress_monitoring_method: monitoring, status: "active",
  });
  return [
    g(0, "Reading Fluency", "Given a grade-3 text, Ava will read aloud at 90 words per minute with 95% accuracy in 3 of 4 consecutive probes.", "68 wpm / 91% accuracy (Aug 2026)", "90 wpm / 95% accuracy", "Given a grade-3 oral reading probe", "3 of 4 consecutive weekly probes", "1-minute oral reading probe", "Weekly curriculum-based measurement"),
    g(0, "Decoding", "Given multisyllabic word cards, Ava will decode words with vowel teams and suffixes with 90% accuracy.", "62% accuracy (Aug 2026)", "90% accuracy", "Given a 20-item word-reading list", "4 of 5 sessions", "Word-list accuracy count", "Biweekly probe"),
    g(1, "Written Expression", "Using a graphic organizer, Marcus will write a paragraph with topic, 3 details, and closing sentence in 4 of 5 probes.", "1-2 sentences (Aug 2026)", "Full paragraph, 4 of 5 probes", "Given a topic and organizer", "4 of 5 probes", "6-point rubric", "Monthly writing sample"),
    g(1, "On-Task Behavior", "During independent work, Marcus will remain on task for 15 minutes without adult prompting in 80% of observed intervals.", "6 minutes (Aug 2026)", "15 minutes", "During 20-minute independent work block", "80% of intervals across 3 observations", "10-second momentary time sampling", "2x monthly observation"),
    g(2, "Articulation", "During structured speech tasks, Sofia will produce /r/, /l/, and /s/ blend sounds with 85% accuracy.", "60% accuracy (Aug 2026)", "85% accuracy", "Given a picture-naming task", "85% across 3 sessions", "Sound-level accuracy count", "Weekly therapy data"),
    g(2, "Following Directions", "Sofia will follow 2-step verbal directions with visuals in 4 of 5 opportunities.", "2 of 5 (Aug 2026)", "4 of 5 opportunities", "Given classroom routines with visual supports", "4 of 5 opportunities", "Teacher observation checklist", "Weekly teacher log"),
    g(3, "Social Skills", "During structured peer activities, Elijah will initiate a conversation with a peer with no more than one adult prompt in 3 of 4 opportunities.", "2 initiations/30 min with 1 prompt (Aug 2026)", "Independent initiation, 3 of 4", "During a 30-minute structured peer activity", "3 of 4 opportunities", "Frequency count with prompt level", "Weekly social group data"),
    g(3, "Flexible Thinking", "Given an unexpected schedule change with advance notice, Elijah will use a coping strategy instead of escalation in 4 of 5 changes.", "1 of 5 (Aug 2026)", "4 of 5 changes", "Given a previewed schedule change", "4 of 5 changes", "Antecedent-behavior-consequence log", "Daily teacher log"),
    g(4, "Written Expression", "Using a rubric, Lily will write a 3-paragraph essay scoring 3/4 on organization in 4 of 6 probes.", "2/4 organization (Aug 2026)", "3/4 on organization", "Given a prompt and graphic organizer", "4 of 6 monthly probes", "4-point rubric", "Monthly writing sample"),
    g(4, "Organization", "Lily will arrive to class with required materials independently in 80% of checks.", "40% of checks (Aug 2026)", "80% of checks", "Given a daily materials checklist", "80% of checks over 4 weeks", "Materials checklist", "Daily checklist by case manager"),
  ];
}

function buildProgress(goalIdsByStudent) {
  const points = [];
  const add = (studentId, goalIds, dates, start, end, notes) => {
    goalIds.forEach((goalId) => {
      dates.forEach((date, i) => {
        const pct = Math.round(start + ((end - start) * i) / Math.max(dates.length - 1, 1));
        points.push({
          student_id: studentId, goal_id: goalId, date, correct: pct, total: 100, percentage: pct,
          prompting_level: i < 1 ? "verbal" : "independent", qualitative_notes: `DEMO — ${notes}`,
        });
      });
    });
  };
  const dates = ["2026-08-31", "2026-09-02", "2026-09-04", "2026-09-08"];
  const map = Object.entries(goalIdsByStudent);
  const starts = [68, 62, 55, 60, 60, 40, 50, 20, 55, 40];
  const ends = [78, 70, 65, 68, 72, 60, 62, 40, 65, 55];
  map.forEach(([studentId, goalIds]) => {
    goalIds.forEach((goalId, gi) => {
      const idx = starts.length ? (points.length + gi) % starts.length : 0;
      add(studentId, [goalId], dates, starts[idx], ends[idx], "steady growth in small-group setting");
    });
  });
  return points;
}

function buildMeetings(id) {
  const m = (i, title, type, date, time, agenda) => ({
    student_id: id(i), title: `DEMO — ${title}`, meeting_type: type, date, time,
    agenda: `DEMO — ${agenda}`, status: "scheduled",
    parent_concerns: "DEMO — Family would like updates on progress toward reading goals.",
    teacher_concerns: "DEMO — Review data collection consistency across settings.",
  });
  return [
    m(0, "Ava's Annual IEP Review", "IEP", d(30), "10:00 AM", "Review reading fluency data, discuss audiobook trial, set next-year goals."),
    m(1, "Marcus's Annual IEP Review", "IEP", d(8), "1:30 PM", "Review written-expression rubric data and attention observations; update accommodations."),
    m(2, "Sofia's MET / Reevaluation Planning", "MET", d(24), "9:00 AM", "Plan reevaluation timeline with speech-language pathologist."),
    m(3, "Elijah's Parent-Teacher Check-In", "Other", d(16), "3:15 PM", "Share social-group data and preview the field-trip support plan."),
    m(4, "Lily's Annual IEP Review", "IEP", d(18), "11:00 AM", "Review essay rubric data; discuss middle-school transition supports."),
  ];
}

function buildDocuments(id) {
  const doc = (i, filename, type, date) => ({
    student_id: id(i), filename: `DEMO — ${filename}`, document_type: type,
    date_uploaded: date, extraction_status: "processed", review_status: "none",
  });
  return [
    doc(0, "Current IEP (fictional)", "IEP", "2025-10-21"),
    doc(0, "Reading evaluation summary (fictional)", "Evaluation", "2025-09-30"),
    doc(1, "Current IEP (fictional)", "IEP", "2025-09-21"),
    doc(1, "Classroom behavior observation (fictional)", "Evaluation", "2025-09-10"),
    doc(2, "Current IEP (fictional)", "IEP", "2025-11-18"),
    doc(2, "Speech-language evaluation (fictional)", "Evaluation", "2025-10-02"),
    doc(3, "Current IEP (fictional)", "IEP", "2026-02-12"),
    doc(3, "OT consultation note (fictional)", "Other", "2026-04-05"),
    doc(4, "Current IEP (fictional)", "IEP", "2025-09-30"),
    doc(4, "Writing sample rubric summary (fictional)", "Progress Report", "2026-08-28"),
  ];
}

function buildSessions(id) {
  return [
    { goal_area: "Reading Fluency", student_ids: [id(0), id(2)], date: d(-3), minutes: 30, delivery: "pull-out", notes: "DEMO — Paired repeated reading; both students beat their wpm best." },
    { goal_area: "Written Expression", student_ids: [id(1), id(4)], date: d(-2), minutes: 45, delivery: "pull-out", notes: "DEMO — Paragraph-building warm-up; Marcus used organizer independently." },
    { goal_area: "Social Skills", student_ids: [id(3)], date: d(-1), minutes: 30, delivery: "push-in", notes: "DEMO — Train-themed conversation game; Elijah initiated twice with peers." },
  ];
}

function buildAssignments(id) {
  const a = (i, title, earned, possible, date) => ({
    student_id: id(i), title: `DEMO — ${title}`, score_earned: earned, score_possible: possible, date,
  });
  return [
    a(0, "Oral reading probe", 72, 100, "2026-09-02"),
    a(0, "Multisyllabic word list", 16, 20, "2026-09-04"),
    a(1, "Paragraph rubric", 3, 6, "2026-09-03"),
    a(1, "Independent work log", 7, 10, "2026-09-07"),
    a(2, "Sound production check", 13, 20, "2026-09-04"),
    a(2, "2-step direction task", 3, 5, "2026-09-08"),
    a(3, "Peer conversation count", 2, 4, "2026-09-07"),
    a(3, "Schedule-change coping", 3, 5, "2026-09-08"),
    a(4, "Essay organization rubric", 2, 4, "2026-09-05"),
    a(4, "Materials checklist", 4, 5, "2026-09-08"),
  ];
}

function buildTasks(id) {
  return [
    { title: "DEMO — Send draft goals home before Marcus's review", due_date: d(5), priority: "high", status: "open", student_id: id(1), category: "DEMO" },
    { title: "DEMO — Collect baseline probe for Sofia's reevaluation", due_date: d(9), priority: "medium", status: "open", student_id: id(2), category: "DEMO" },
    { title: "DEMO — Schedule Lily's review invitation letters", due_date: d(2), priority: "high", status: "open", student_id: id(4), category: "DEMO" },
  ];
}

function buildLessons(id) {
  return [
    {
      title: "DEMO — Building Strong Paragraphs", date: d(-2),
      objective: "DEMO — Students will write a topic sentence with two supporting details using an organizer.",
      essential_question: "DEMO — How do details support the main idea?",
      warm_up: "DEMO — Sort details under the best topic sentence.",
      i_do: "DEMO — Model a paragraph with think-aloud.",
      we_do: "DEMO — Build one paragraph together from an organizer.",
      you_do: "DEMO — Independent paragraph with rubric self-check.",
      accommodations: "DEMO — Chunked steps; movement break midway; organizer provided.",
      student_ids: [id(1), id(4)],
    },
  ];
}

export async function loadDemoCaseload() {
  const existing = await base44.entities.Student.list("-created_date", 500);
  if (existing.some((s) => s.notes === DEMO_LABEL)) {
    return { created: false, students: existing.filter((s) => s.notes === DEMO_LABEL).length };
  }
  const created = await base44.entities.Student.bulkCreate(STUDENTS);
  const id = (i) => created[i].id;

  const goals = await base44.entities.Goal.bulkCreate(buildGoals(id));
  const goalIdsByStudent = {};
  goals.forEach((g) => {
    (goalIdsByStudent[g.student_id] = goalIdsByStudent[g.student_id] || []).push(g.id);
  });
  await base44.entities.ProgressData.bulkCreate(buildProgress(goalIdsByStudent));
  await base44.entities.Meeting.bulkCreate(buildMeetings(id));
  await base44.entities.Document.bulkCreate(buildDocuments(id));
  await base44.entities.SessionLog.bulkCreate(buildSessions(id));
  await base44.entities.GradebookAssignment.bulkCreate(buildAssignments(id));
  await base44.entities.Task.bulkCreate(buildTasks(id));
  await base44.entities.Lesson.bulkCreate(buildLessons(id));
  return { created: true, students: created.length };
}

export async function deleteDemoCaseload() {
  const students = await base44.entities.Student.list("-created_date", 500);
  const demo = students.filter((s) => s.notes === DEMO_LABEL);
  if (demo.length === 0) return 0;
  const ids = new Set(demo.map((s) => s.id));
  let removed = demo.length;

  const targets = [
    ["Goal", (r) => ids.has(r.student_id)],
    ["ProgressData", (r) => ids.has(r.student_id)],
    ["Meeting", (r) => ids.has(r.student_id)],
    ["Document", (r) => ids.has(r.student_id)],
    ["GradebookAssignment", (r) => ids.has(r.student_id)],
    ["Task", (r) => ids.has(r.student_id)],
    // Group records are only removed when EVERY student in them is a demo student,
    // so a real student's data is never lost.
    ["Lesson", (r) => (r.student_ids || []).length > 0 && (r.student_ids || []).every((x) => ids.has(x))],
    ["SessionLog", (r) => (r.student_ids || []).length > 0 && (r.student_ids || []).every((x) => ids.has(x))],
  ];
  for (const [name, match] of targets) {
    const records = await base44.entities[name].list("-created_date", 500);
    const toDelete = records.filter(match);
    removed += toDelete.length;
    await Promise.all(toDelete.map((r) => base44.entities[name].delete(r.id)));
  }
  await Promise.all(demo.map((s) => base44.entities.Student.delete(s.id)));
  return removed;
}
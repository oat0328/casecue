// Deterministic, data-derived caseload report builders shared by the Reports
// hub and the Data Center. No AI, no invented numbers: every figure comes from
// recorded data, and missing data is stated as missing.

import { textSection, tableSection, sheetFromTable, safeFilename } from "@/lib/reportExport";

export function studentName(s) {
  return s ? `${s.first_name} ${s.last_name}` : "—";
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

const goalAreaOf = (goalId, goals) => {
  const g = (goals || []).find((x) => x.id === goalId);
  return (g && g.goal_area) || "—";
};

const byDate = (arr) => (arr || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
const round1 = (n) => Math.round(n * 10) / 10;
const pctOfScore = (a) => (a.score_possible > 0 ? round1((a.score_earned / a.score_possible) * 100) : 0);
const sessionHasStudent = (s, id) => s?.student_id === id || (s?.student_ids || []).includes(id);
const sessionMinutes = (s) => Number(s?.delivered_minutes ?? s?.duration_minutes ?? s?.minutes ?? 0) || 0;
const sessionNotes = (s) => s?.qualitative || s?.notes || s?.quantitative?.raw || "";

// ============ Student Report ============

export function buildStudentDataReport({ student, goals = [], progress = [], sessions = [], assignments = [] }) {
  const sGoals = goals.filter((g) => g.student_id === student.id);
  const sProg = byDate(progress.filter((p) => p.student_id === student.id));
  const sSess = byDate(sessions.filter((s) => sessionHasStudent(s, student.id)));
  const sAsg = byDate(assignments.filter((a) => a.student_id === student.id));

  const infoRows = [
    ["Name", studentName(student)],
    ["Grade", student.grade || "—"],
    ["Eligibility", student.eligibility_category || "—"],
    ["Status", student.status || "active"],
    ["IEP Date", student.iep_date || "—"],
    ["Annual Review Due", student.annual_review_due || "—"],
    ["Reevaluation Due", student.reevaluation_due || "—"],
    ["Present Levels", student.present_levels || "Not recorded"],
    ["Strengths", student.strengths || "Not recorded"],
    ["Areas of Need", student.areas_of_need || "Not recorded"],
    ["Accommodations", student.accommodations || "Not recorded"],
  ];

  const goalRows = sGoals.map((g) => [
    g.goal_area || "—",
    (g.goal_text || "").slice(0, 60),
    g.baseline || "—",
    g.target || "—",
    g.status || "active",
  ]);
  const progRows = sProg.map((p) => [
    p.date,
    goalAreaOf(p.goal_id, goals),
    p.correct ?? "—",
    p.total ?? "—",
    p.percentage ?? "—",
    p.prompting_level || "—",
    (p.observation_notes || "").slice(0, 40),
  ]);
  const sessRows = sSess.map((s) => [s.date, s.delivery || "—", sessionMinutes(s), sessionNotes(s).slice(0, 80)]);
  const asgRows = sAsg.map((a) => [a.date || "—", (a.title || "").slice(0, 40), a.score_earned ?? "—", a.score_possible ?? "—", pctOfScore(a)]);

  return {
    title: `Student Report — ${studentName(student)}`,
    subtitle: `Generated ${new Date().toLocaleDateString()} · ${sGoals.length} goal(s) · ${sProg.length} progress point(s) · ${sSess.length} session(s) · ${sAsg.length} assignment(s)`,
    sections: [
      textSection("Student Snapshot", infoRows.map(([k, v]) => `${k}: ${v}`)),
      sGoals.length
        ? tableSection("IEP Goals", ["Area", "Goal", "Baseline", "Target", "Status"], goalRows)
        : textSection("IEP Goals", "No goals recorded yet."),
      sProg.length
        ? tableSection("Progress Data", ["Date", "Goal Area", "Correct", "Total", "%", "Prompting", "Notes"], progRows)
        : textSection("Progress Data", "No progress data recorded yet."),
      sSess.length
        ? tableSection("Sessions", ["Date", "Delivery", "Minutes", "Notes"], sessRows)
        : textSection("Sessions", "No sessions recorded yet."),
      sAsg.length
        ? tableSection("Gradebook Assignments", ["Date", "Assignment", "Earned", "Possible", "%"], asgRows)
        : textSection("Gradebook Assignments", "No assignments recorded yet."),
    ],
    sheets: [
      sheetFromTable("Student Info", ["Field", "Value"], infoRows),
      sheetFromTable("Goals", ["Area", "Goal", "Baseline", "Target", "Status"], goalRows),
      sheetFromTable("Progress Data", ["Date", "Goal Area", "Correct", "Total", "%", "Prompting", "Notes"], progRows),
      sheetFromTable("Sessions", ["Date", "Delivery", "Minutes", "Notes"], sessRows),
      sheetFromTable("Assignments", ["Date", "Assignment", "Earned", "Possible", "%"], asgRows),
    ],
    filename: safeFilename("Student-Report", student.first_name, student.last_name),
    student_id: student.id,
  };
}

// ============ Caseload Report ============

export function buildCaseloadDataReport({ students = [], goals = [], progress = [], sessions = [], assignments = [] }) {
  const rows = students.map((st) => {
    const sp = byDate(progress.filter((p) => p.student_id === st.id));
    const ss = sessions.filter((s) => sessionHasStudent(s, st.id));
    const sa = assignments.filter((a) => a.student_id === st.id);
    const pcts = sa.filter((a) => a.score_possible > 0).map(pctOfScore);
    return [
      studentName(st),
      st.grade || "—",
      goals.filter((g) => g.student_id === st.id).length,
      sp.length,
      sp.length ? sp[sp.length - 1].percentage ?? "—" : "—",
      ss.length,
      ss.reduce((n, s) => n + sessionMinutes(s), 0),
      sa.length,
      pcts.length ? round1(pcts.reduce((a, b) => a + b, 0) / pcts.length) : "—",
    ];
  });

  const master = students.map((st) => [
    studentName(st),
    st.grade || "—",
    st.eligibility_category || "—",
    st.iep_date || "—",
    st.annual_review_due || "—",
    st.reevaluation_due || "—",
    st.status || "active",
  ]);

  return {
    title: "Caseload Report",
    subtitle: `Generated ${new Date().toLocaleDateString()} · ${students.length} student(s) · ${goals.length} goal(s) · ${sessions.length} session(s)`,
    sections: [
      textSection("Overview", [
        `Students: ${students.length}`,
        `Goals (after filters): ${goals.length}`,
        `Progress points: ${progress.length}`,
        `Sessions: ${sessions.length}`,
        `Gradebook assignments: ${assignments.length}`,
      ]),
      tableSection(
        "Caseload Overview",
        ["Student", "Grade", "Goals", "Progress Pts", "Latest %", "Sessions", "Minutes", "Assignments", "Avg %"],
        rows
      ),
    ],
    sheets: [
      sheetFromTable("Caseload Overview", ["Student", "Grade", "Goals", "Progress Pts", "Latest %", "Sessions", "Minutes", "Assignments", "Avg %"], rows),
      sheetFromTable("Students", ["Student", "Grade", "Eligibility", "IEP Date", "Review Due", "Reeval Due", "Status"], master),
    ],
    filename: safeFilename("Caseload-Report"),
    student_id: "caseload",
  };
}

// ============ Progress Monitoring Report ============

export function buildProgressMonitoringReport({ students = [], goals = [], progress = [] }) {
  const rows = students.map((st) => {
    const sp = byDate(progress.filter((p) => p.student_id === st.id));
    if (!sp.length) return [studentName(st), 0, "—", "—", "—", "—", "No data recorded"];
    const first = sp[0];
    const latest = sp[sp.length - 1];
    const change = round1((latest.percentage ?? 0) - (first.percentage ?? 0));
    const lastDate = latest.date;
    const days = daysUntil(lastDate);
    const stale = days === null || -days > 14;
    return [
      studentName(st),
      sp.length,
      first.percentage ?? "—",
      latest.percentage ?? "—",
      change > 0 ? `+${change}` : `${change}`,
      lastDate,
      stale ? "No data in last 14 days" : "Current",
    ];
  });

  const recent = byDate(progress)
    .slice(-30)
    .reverse()
    .map((p) => {
      const st = students.find((x) => x.id === p.student_id);
      return [p.date, studentName(st), goalAreaOf(p.goal_id, goals), p.percentage ?? "—", p.prompting_level || "—"];
    });

  const allRows = byDate(progress).map((p) => {
    const st = students.find((x) => x.id === p.student_id);
    return [p.date, studentName(st), goalAreaOf(p.goal_id, goals), p.correct ?? "—", p.total ?? "—", p.percentage ?? "—", p.prompting_level || "—", (p.observation_notes || "").slice(0, 40)];
  });

  return {
    title: "Progress Monitoring Report",
    subtitle: `Generated ${new Date().toLocaleDateString()} · ${progress.length} data point(s) across ${students.length} student(s)`,
    sections: [
      textSection("Summary", [
        `${progress.length} progress data point(s) recorded (after filters).`,
        "Students with no data in the last 14 days are flagged below — this is a potential data-collection issue, educator review required.",
      ]),
      tableSection("Student Progress Summary", ["Student", "Points", "First %", "Latest %", "Change", "Last Date", "Status"], rows),
      recent.length
        ? tableSection("Recent Data (last 30 entries)", ["Date", "Student", "Goal Area", "%", "Prompting"], recent)
        : textSection("Recent Data", "No progress data recorded yet."),
    ],
    sheets: [
      sheetFromTable("Progress Summary", ["Student", "Points", "First %", "Latest %", "Change", "Last Date", "Status"], rows),
      sheetFromTable("All Progress Data", ["Date", "Student", "Goal Area", "Correct", "Total", "%", "Prompting", "Notes"], allRows),
    ],
    filename: safeFilename("Progress-Monitoring-Report"),
    student_id: "caseload",
  };
}

// ============ Service Delivery Report ============

export function buildServiceDeliveryReport({ students = [], sessions = [], schedule = [] }) {
  const activeSchedule = (schedule || []).filter((e) => !e.archived);
  const rows = students.map((st) => {
    const scheduled = activeSchedule
      .filter((e) => (e.student_ids || []).includes(st.id))
      .reduce((n, e) => n + (e.service_minutes || 0), 0);
    const mine = sessions.filter((s) => sessionHasStudent(s, st.id));
    const delivered = mine.reduce((n, s) => n + sessionMinutes(s), 0);
    const pct = scheduled > 0 ? round1((delivered / scheduled) * 100) : null;
    return [
      studentName(st),
      scheduled || "—",
      delivered,
      pct === null ? "No scheduled minutes" : `${pct}%`,
      mine.filter((s) => s.delivery === "pull-out").length,
      mine.filter((s) => s.delivery === "push-in").length,
      mine.filter((s) => s.delivery === "consultation").length,
    ];
  });

  const flagged = rows.filter((r) => typeof r[3] === "string" && r[3].endsWith("%") && parseFloat(r[3]) < 80);
  const sessRows = byDate(sessions).map((s) => [
    s.date,
    s.goal_area || "—",
    s.delivery || "—",
    sessionMinutes(s) || "—",
    s.student_id ? 1 : (s.student_ids || []).length,
    (s.notes || "").slice(0, 40),
  ]);

  return {
    title: "Service Delivery Report",
    subtitle: `Generated ${new Date().toLocaleDateString()} · scheduled minutes from Instruction & Schedule, delivered minutes from logged sessions`,
    sections: [
      textSection("How to Read This Report", [
        "Scheduled minutes come from your Instruction & Schedule groups; delivered minutes come from logged sessions.",
        "Scheduled minutes are per week (as entered in your schedule); delivered minutes cover all logged sessions (after filters).",
        "A delivered percentage below 80% is flagged as a potential issue — educator review required. CaseCue does not certify service compliance.",
      ]),
      tableSection("Service Minutes by Student", ["Student", "Scheduled (weekly)", "Delivered", "Delivered %", "Pull-out", "Push-in", "Consultation"], rows),
      flagged.length
        ? textSection("Potential Issues (review required)", flagged.map((r) => `${r[0]}: ${r[3]} of scheduled minutes delivered`))
        : textSection("Potential Issues", "No students below 80% of scheduled minutes in the filtered data."),
      sessRows.length
        ? tableSection("Session Log", ["Date", "Goal Area", "Delivery", "Minutes", "Students", "Notes"], sessRows)
        : textSection("Session Log", "No sessions recorded yet."),
    ],
    sheets: [
      sheetFromTable("Service Minutes", ["Student", "Scheduled (weekly)", "Delivered", "Delivered %", "Pull-out", "Push-in", "Consultation"], rows),
      sheetFromTable("Sessions", ["Date", "Goal Area", "Delivery", "Minutes", "Students", "Notes"], sessRows),
    ],
    filename: safeFilename("Service-Delivery-Report"),
    student_id: "caseload",
  };
}

// ============ Compliance Report ============

export function buildComplianceReport({ students = [], goals = [], progress = [], meetings = [] }) {
  const iepsDue = students
    .filter((st) => { const d = daysUntil(st.annual_review_due); return d !== null && d >= 0 && d <= 60; })
    .map((st) => [studentName(st), st.annual_review_due, `${daysUntil(st.annual_review_due)} days`]);
  const reevalsDue = students
    .filter((st) => { const d = daysUntil(st.reevaluation_due); return d !== null && d >= 0 && d <= 90; })
    .map((st) => [studentName(st), st.reevaluation_due, `${daysUntil(st.reevaluation_due)} days`]);
  const withRecent = new Set(
    (progress || []).filter((p) => { const d = daysUntil(p.date); return d !== null && -d <= 14; }).map((p) => p.student_id)
  );
  const missingData = students.filter((st) => !withRecent.has(st.id)).map((st) => [studentName(st), "No progress data in last 14 days"]);
  const goalsGaps = goals
    .filter((g) => !g.baseline || !g.measurement_method)
    .map((g) => {
      const st = students.find((x) => x.id === g.student_id);
      return [studentName(st), g.goal_area || "—", !g.baseline ? "Missing baseline" : "", !g.measurement_method ? "Missing measurement method" : ""].filter(Boolean);
    });
  const upcoming = meetings
    .filter((m) => { const d = daysUntil(m.date); return d !== null && d >= 0; })
    .map((m) => [m.date, m.title, m.meeting_type || "IEP", m.status || "scheduled"]);

  return {
    title: "Compliance Report",
    subtitle: `Generated ${new Date().toLocaleDateString()} · deadline and data-gap overview from recorded dates`,
    sections: [
      textSection("Important", [
        "This report lists potential issues based on recorded dates and data. CaseCue does not certify legal, state, or district compliance — educator review required.",
      ]),
      iepsDue.length ? tableSection("Annual IEP Reviews Due (60 days)", ["Student", "Due", "Time Remaining"], iepsDue)
        : textSection("Annual IEP Reviews Due (60 days)", "None due in the next 60 days."),
      reevalsDue.length ? tableSection("Reevaluations Due (90 days)", ["Student", "Due", "Time Remaining"], reevalsDue)
        : textSection("Reevaluations Due (90 days)", "None due in the next 90 days."),
      missingData.length ? tableSection("Students Missing Recent Progress Data (14 days)", ["Student", "Issue"], missingData)
        : textSection("Students Missing Recent Progress Data", "All students have progress data within the last 14 days."),
      goalsGaps.length ? tableSection("Goals Missing Baseline or Measurement Method", ["Student", "Area", "Issue"], goalsGaps)
        : textSection("Goals Missing Baseline or Measurement Method", "No gaps found."),
      upcoming.length ? tableSection("Upcoming Meetings", ["Date", "Title", "Type", "Status"], upcoming)
        : textSection("Upcoming Meetings", "No upcoming meetings scheduled."),
    ],
    sheets: [
      sheetFromTable("IEPs Due", ["Student", "Due", "Time Remaining"], iepsDue),
      sheetFromTable("Reevaluations Due", ["Student", "Due", "Time Remaining"], reevalsDue),
      sheetFromTable("Missing Progress Data", ["Student", "Issue"], missingData),
      sheetFromTable("Goal Gaps", ["Student", "Area", "Issue"], goalsGaps),
      sheetFromTable("Upcoming Meetings", ["Date", "Title", "Type", "Status"], upcoming),
    ],
    filename: safeFilename("Compliance-Report"),
    student_id: "caseload",
  };
}

// ============ Meeting Preparation Report ============

export function buildMeetingPrepReport({ meetings = [], students = [], goals = [], progress = [], sessions = [] }) {
  const upcoming = (meetings || [])
    .filter((m) => { const d = daysUntil(m.date); return d !== null && d >= 0; })
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const sections = [
    textSection("Overview", [
      `${upcoming.length} upcoming meeting(s).`,
      "Each section below pulls the student's snapshot, goals, recent progress, and recent sessions so you can walk in prepared.",
    ]),
  ];
  const meetingRows = upcoming.map((m) => {
    const st = students.find((x) => x.id === m.student_id);
    return [m.title, m.date, m.meeting_type || "IEP", m.location || "—", studentName(st)];
  });

  upcoming.forEach((m) => {
    const st = students.find((x) => x.id === m.student_id);
    sections.push(
      textSection(`${m.title} — ${m.date}`, [
        `Type: ${m.meeting_type || "IEP"}`,
        m.location ? `Location: ${m.location}` : null,
        m.time ? `Time: ${m.time}` : null,
        m.agenda ? `Agenda: ${m.agenda}` : null,
        m.parent_concerns ? `Parent concerns: ${m.parent_concerns}` : null,
        m.teacher_concerns ? `Teacher concerns: ${m.teacher_concerns}` : null,
        st ? `Student: ${studentName(st)} · Grade ${st.grade || "—"} · Eligibility ${st.eligibility_category || "—"}` : "Student: not linked",
        st?.annual_review_due ? `Annual review due: ${st.annual_review_due}` : null,
        st?.reevaluation_due ? `Reevaluation due: ${st.reevaluation_due}` : null,
      ])
    );
    if (st) {
      const mGoals = goals.filter((g) => g.student_id === st.id);
      if (mGoals.length) {
        sections.push(
          tableSection(`${studentName(st)} — Goals`, ["Area", "Goal", "Baseline", "Target", "Status"],
            mGoals.map((g) => [g.goal_area || "—", (g.goal_text || "").slice(0, 60), g.baseline || "—", g.target || "—", g.status || "active"]))
        );
      }
      const recentProg = byDate(progress.filter((p) => p.student_id === st.id)).slice(-5).reverse();
      if (recentProg.length) {
        sections.push(
          tableSection(`${studentName(st)} — Recent Progress`, ["Date", "Goal Area", "%", "Prompting"],
            recentProg.map((p) => [p.date, goalAreaOf(p.goal_id, goals), p.percentage ?? "—", p.prompting_level || "—"]))
        );
      }
      const recentSess = byDate(sessions.filter((s) => sessionHasStudent(s, st.id))).slice(-5).reverse();
      if (recentSess.length) {
        sections.push(
          tableSection(`${studentName(st)} — Recent Sessions`, ["Date", "Delivery", "Minutes"],
            recentSess.map((s) => [s.date, s.delivery || "—", sessionMinutes(s) || "—"]))
        );
      }
    }
  });

  return {
    title: "Meeting Preparation Report",
    subtitle: `Generated ${new Date().toLocaleDateString()} · ${upcoming.length} upcoming meeting(s)`,
    sections,
    sheets: [sheetFromTable("Meetings", ["Title", "Date", "Type", "Location", "Student"], meetingRows)],
    filename: safeFilename("Meeting-Prep-Report"),
    student_id: "caseload",
  };
}

// ============ Parent Report (plain language, data-derived) ============

export function buildParentProgressReport({ student, goals = [], progress = [], sessions = [] }) {
  const sGoals = goals.filter((g) => g.student_id === student.id);
  const totalMinutes = sessions.filter((s) => sessionHasStudent(s, student.id)).reduce((n, s) => n + sessionMinutes(s), 0);

  const lines = [];
  sGoals.forEach((g) => {
    const pts = byDate(progress.filter((p) => p.goal_id === g.id || (p.goal_id && p.goal_id === g.id)));
    const area = g.goal_area || "this skill";
    if (!pts.length) {
      lines.push(`${area}: No progress scores have been recorded for this goal yet.`);
      return;
    }
    const first = pts[0];
    const latest = pts[pts.length - 1];
    let line = `${area}: Most recent score was ${latest.percentage ?? "—"}% on ${latest.date}.`;
    if (pts.length > 1 && first.percentage != null && latest.percentage != null) {
      const diff = round1(latest.percentage - first.percentage);
      line += diff >= 0
        ? ` That's up from ${first.percentage}% on ${first.date}.`
        : ` That's down from ${first.percentage}% on ${first.date}.`;
    }
    lines.push(line);
  });

  return {
    title: `Parent Report — ${studentName(student)}`,
    subtitle: `Generated ${new Date().toLocaleDateString()} · plain-language summary of recorded progress`,
    sections: [
      textSection("Overview", [
        `This report summarizes ${student.first_name}'s recorded progress on IEP goals, in everyday language.`,
        `${sessions.filter((s) => sessionHasStudent(s, student.id)).length} session(s) logged · ${totalMinutes} total minutes of recorded service.`,
      ]),
      sGoals.length ? textSection("Goal-by-Goal Progress", lines) : textSection("Goal-by-Goal Progress", "No IEP goals are recorded yet."),
      textSection("Notes", [
        "Scores come directly from progress monitoring data recorded by the teacher.",
        "If a goal shows no data, no scores have been recorded yet — ask your child's case manager for details.",
      ]),
    ],
    sheets: [
      sheetFromTable("Goals", ["Area", "Goal", "Baseline", "Target", "Status"],
        sGoals.map((g) => [g.goal_area || "—", g.goal_text || "—", g.baseline || "—", g.target || "—", g.status || "active"])),
      sheetFromTable("Progress Data", ["Date", "Goal Area", "%", "Prompting"],
        byDate(progress.filter((p) => p.student_id === student.id)).map((p) => [p.date, goalAreaOf(p.goal_id, goals), p.percentage ?? "—", p.prompting_level || "—"])),
    ],
    filename: safeFilename("Parent-Report", student.first_name, student.last_name),
    student_id: student.id,
  };
}

// ============ Definitions ============

export const REPORT_DEFINITIONS = [
  { key: "student_report", label: "Student Report", scope: "student", build: (b) => buildStudentDataReport(b) },
  { key: "progress_report", label: "Progress Report", scope: "student", build: (b) => buildProgressMonitoringReport({ ...b, students: b.student ? [b.student] : b.students }) },
  { key: "parent_report", label: "Parent Report", scope: "student", build: (b) => buildParentProgressReport(b) },
  { key: "caseload_report", label: "Caseload Report", scope: "caseload", build: (b) => buildCaseloadDataReport(b) },
  { key: "service_report", label: "Service Report", scope: "caseload", build: (b) => buildServiceDeliveryReport(b) },
  { key: "compliance_report", label: "Compliance Report", scope: "caseload", build: (b) => buildComplianceReport(b) },
  { key: "meeting_report", label: "Meeting Report", scope: "caseload", build: (b) => buildMeetingPrepReport(b) },
];

export const DATA_CENTER_DEFINITIONS = [
  { key: "student_data", label: "Student Data Report", scope: "student", build: (b) => buildStudentDataReport(b) },
  { key: "caseload_data", label: "Caseload Data Report", scope: "caseload", build: (b) => buildCaseloadDataReport(b) },
  { key: "progress_monitoring", label: "Progress Monitoring Report", scope: "caseload", build: (b) => buildProgressMonitoringReport(b) },
  { key: "service_delivery", label: "Service Delivery Report", scope: "caseload", build: (b) => buildServiceDeliveryReport(b) },
  { key: "compliance", label: "Compliance Report", scope: "caseload", build: (b) => buildComplianceReport(b) },
  { key: "meeting_prep", label: "Meeting Preparation Report", scope: "caseload", build: (b) => buildMeetingPrepReport(b) },
];
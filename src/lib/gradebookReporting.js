// Deterministic Gradebook report builders + chart data. All figures come from
// recorded assignments and sessions — nothing invented.

import { textSection, tableSection, sheetFromTable, safeFilename } from "@/lib/reportExport";
import { sortStudentsByName } from "@/lib/studentSort";
import { studentName } from "@/lib/caseReports";

const round1 = (n) => Math.round(n * 10) / 10;
const pctOf = (a) => (a.score_possible > 0 ? round1((a.score_earned / a.score_possible) * 100) : 0);
const byDate = (arr) => (arr || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
const todayStr = () => new Date().toISOString().slice(0, 10);

function goalAreaOf(goalId, goals) {
  const g = (goals || []).find((x) => x.id === goalId);
  return (g && g.goal_area) || "Unlinked";
}

// ---------- Reports ----------

export function buildStudentGradeReport({ student, assignments = [], goals = [] }) {
  const sAsg = byDate(assignments.filter((a) => a.student_id === student.id));
  const pcts = sAsg.filter((a) => a.score_possible > 0).map(pctOf);

  const perGoal = {};
  sAsg.forEach((a) => {
    const area = a.goal_id ? goalAreaOf(a.goal_id, goals) : "Unlinked";
    if (!perGoal[area]) perGoal[area] = [];
    perGoal[area].push(pctOf(a));
  });
  const goalRows = Object.entries(perGoal).map(([area, list]) => [
    area,
    list.length,
    round1(list.reduce((x, y) => x + y, 0) / list.length),
  ]);

  const asgRows = sAsg.map((a) => [
    a.date || "—",
    (a.title || "").slice(0, 40),
    goalAreaOf(a.goal_id, goals),
    a.score_earned ?? "—",
    a.score_possible ?? "—",
    pctOf(a),
    (a.notes || "").slice(0, 40),
  ]);

  return {
    title: `Student Grade Report — ${studentName(student)}`,
    subtitle: `Generated ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})} · ${sAsg.length} assignment(s) · average ${pcts.length ? round1(pcts.reduce((x, y) => x + y, 0) / pcts.length) + "%" : "—"}`,
    sections: [
      textSection("Overview", [
        `Student: ${studentName(student)} · Grade ${student.grade || "—"}`,
        `Assignments recorded: ${sAsg.length}`,
        `Average score: ${pcts.length ? round1(pcts.reduce((x, y) => x + y, 0) / pcts.length) + "%" : "No scored assignments yet"}`,
      ]),
      goalRows.length
        ? tableSection("Average by Goal Area", ["Goal Area", "Assignments", "Average %"], goalRows)
        : textSection("Average by Goal Area", "No scored assignments yet."),
      sAsg.length
        ? tableSection("All Assignments", ["Date", "Assignment", "Goal Area", "Earned", "Possible", "%", "Notes"], asgRows)
        : textSection("All Assignments", "No assignments recorded yet."),
    ],
    sheets: [
      sheetFromTable("Assignments", ["Date", "Assignment", "Goal Area", "Earned", "Possible", "%", "Notes"], asgRows),
      sheetFromTable("Goal Averages", ["Goal Area", "Assignments", "Average %"], goalRows),
    ],
    filename: safeFilename("Student-Grade-Report", student.first_name, student.last_name),
    student_id: student.id,
  };
}

export function buildGoalGradeReport({ students = [], goals = [], assignments = [] }) {
  const byArea = new Map();
  assignments.forEach((a) => {
    const area = a.goal_id ? goalAreaOf(a.goal_id, goals) : "Unlinked";
    if (!byArea.has(area)) byArea.set(area, []);
    byArea.get(area).push(a);
  });

  const sections = [
    textSection("Overview", [
      `${assignments.length} assignment(s) across ${byArea.size} goal area(s) (after filters).`,
      "Assignments not linked to a goal appear under 'Unlinked'.",
    ]),
  ];
  const sheets = [];
  const summaryRows = [];

  for (const [area, list] of [...byArea.entries()].sort((x, y) => y[1].length - x[1].length)) {
    const pcts = list.filter((a) => a.score_possible > 0).map(pctOf);
    const avg = pcts.length ? round1(pcts.reduce((x, y) => x + y, 0) / pcts.length) : "—";
    summaryRows.push([area, list.length, avg]);
    const rows = list.map((a) => {
      const st = students.find((x) => x.id === a.student_id);
      return [a.date || "—", studentName(st), (a.title || "").slice(0, 40), a.score_earned ?? "—", a.score_possible ?? "—", pctOf(a)];
    });
    sections.push(tableSection(`${area} — Assignments`, ["Date", "Student", "Assignment", "Earned", "Possible", "%"], rows));
    sheets.push(sheetFromTable(area || "Unlinked", ["Date", "Student", "Assignment", "Earned", "Possible", "%"], rows));
  }

  sections.splice(1, 0, tableSection("Summary by Goal Area", ["Goal Area", "Assignments", "Average %"], summaryRows));

  return {
    title: "Goal-Based Grade Report",
    subtitle: `Generated ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})} · grades grouped by IEP goal area`,
    sections,
    sheets: [sheetFromTable("Summary", ["Goal Area", "Assignments", "Average %"], summaryRows), ...sheets],
    filename: safeFilename("Goal-Based-Grade-Report"),
    student_id: "caseload",
  };
}

export function buildCaseloadGradeReport({ students = [], assignments = [], goals = [] }) {
  const rows = sortStudentsByName(students).map((st) => {
    const sa = byDate(assignments.filter((a) => a.student_id === st.id));
    const pcts = sa.filter((a) => a.score_possible > 0).map(pctOf);
    return [
      studentName(st),
      st.grade || "—",
      sa.length,
      pcts.length ? round1(pcts.reduce((x, y) => x + y, 0) / pcts.length) : "—",
      pcts.length ? Math.max(...pcts) : "—",
      pcts.length ? Math.min(...pcts) : "—",
      pcts.length ? pctOf(sa[sa.length - 1]) : "—",
    ];
  });
  const allPcts = assignments.filter((a) => a.score_possible > 0).map(pctOf);

  return {
    title: "Caseload Grade Report",
    subtitle: `Generated ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})} · ${assignments.length} assignment(s) across ${students.length} student(s)`,
    sections: [
      textSection("Overview", [
        `Caseload average: ${allPcts.length ? round1(allPcts.reduce((x, y) => x + y, 0) / allPcts.length) + "%" : "No scored assignments yet"}`,
        `Students with at least one assignment: ${rows.filter((r) => r[2] > 0).length} of ${students.length}`,
      ]),
      tableSection("Grades by Student", ["Student", "Grade", "Assignments", "Average %", "Highest %", "Lowest %", "Latest %"], rows),
    ],
    sheets: [sheetFromTable("Caseload Grades", ["Student", "Grade", "Assignments", "Average %", "Highest %", "Lowest %", "Latest %"], rows)],
    filename: safeFilename("Caseload-Grade-Report"),
    student_id: "caseload",
  };
}

function buildRangeGradeReport(rangeLabel, defaultDays, { students = [], goals = [], assignments = [], filters = {} }) {
  const to = filters.to || todayStr();
  const from =
    filters.from || new Date(Date.now() - (defaultDays - 1) * 86400000).toISOString().slice(0, 10);
  const list = byDate(assignments.filter((a) => a.date && a.date >= from && a.date <= to));

  const rows = sortStudentsByName(students).map((st) => {
    const sa = list.filter((a) => a.student_id === st.id);
    const pcts = sa.filter((a) => a.score_possible > 0).map(pctOf);
    return [
      studentName(st),
      sa.length,
      pcts.length ? round1(pcts.reduce((x, y) => x + y, 0) / pcts.length) : "—",
    ];
  });
  const detail = list.map((a) => {
    const st = students.find((x) => x.id === a.student_id);
    return [a.date, studentName(st), (a.title || "").slice(0, 40), goalAreaOf(a.goal_id, goals), a.score_earned ?? "—", a.score_possible ?? "—", pctOf(a)];
  });

  return {
    title: `${rangeLabel} Grade Report`,
    subtitle: `${from} to ${to} · ${list.length} assignment(s) recorded in this period`,
    sections: [
      textSection("Reporting Period", [
        `From ${from} to ${to}`,
        `${list.length} assignment(s) recorded in this period.`,
        "Tip: set a custom date range in the filters before generating to change this period.",
      ]),
      tableSection("Grades by Student", ["Student", "Assignments", "Average %"], rows),
      detail.length
        ? tableSection("Assignment Detail", ["Date", "Student", "Assignment", "Goal Area", "Earned", "Possible", "%"], detail)
        : textSection("Assignment Detail", "No assignments recorded in this period."),
    ],
    sheets: [
      sheetFromTable("Grades by Student", ["Student", "Assignments", "Average %"], rows),
      sheetFromTable("Assignments", ["Date", "Student", "Assignment", "Goal Area", "Earned", "Possible", "%"], detail),
    ],
    filename: safeFilename(`${rangeLabel}-Grade-Report`),
    student_id: "caseload",
  };
}

export const GRADEBOOK_REPORT_DEFINITIONS = [
  { key: "student_grade", label: "Student Grade Report", scope: "student", build: (b) => buildStudentGradeReport(b) },
  { key: "goal_grade", label: "Goal-Based Grade Report", scope: "caseload", build: (b) => buildGoalGradeReport(b) },
  { key: "caseload_grade", label: "Caseload Grade Report", scope: "caseload", build: (b) => buildCaseloadGradeReport(b) },
  { key: "weekly_grade", label: "Weekly Report", scope: "caseload", build: (b) => buildRangeGradeReport("Weekly", 7, b) },
  { key: "monthly_grade", label: "Monthly Report", scope: "caseload", build: (b) => buildRangeGradeReport("Monthly", 30, b) },
];

// ---------- Chart data ----------

export function weekStart(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function weeklyAssignmentData(assignments = []) {
  const byWeek = new Map();
  assignments.filter((a) => a.date).forEach((a) => {
    const w = weekStart(a.date);
    byWeek.set(w, (byWeek.get(w) || 0) + 1);
  });
  return [...byWeek.entries()].sort().map(([Week, n]) => ({ Week: Week.slice(5), Assignments: n }));
}

export function weeklyGradeTrendData(assignments = []) {
  const byWeek = new Map();
  assignments.filter((a) => a.date && a.score_possible > 0).forEach((a) => {
    const w = weekStart(a.date);
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w).push(pctOf(a));
  });
  return [...byWeek.entries()].sort().map(([Week, list]) => ({
    Week: Week.slice(5),
    "Average %": round1(list.reduce((x, y) => x + y, 0) / list.length),
  }));
}

export function studentTrendData(assignments = [], students = [], maxStudents = 6) {
  const withPct = assignments.filter((a) => a.date && a.score_possible > 0);
  const byStudent = new Map();
  withPct.forEach((a) => {
    if (!byStudent.has(a.student_id)) byStudent.set(a.student_id, []);
    byStudent.get(a.student_id).push(a);
  });
  const top = [...byStudent.entries()].sort((x, y) => y[1].length - x[1].length).slice(0, maxStudents);
  const nameOf = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name?.[0] || ""}.` : "Student";
  };
  const names = top.map(([id]) => nameOf(id));
  const dates = [...new Set(top.flatMap(([, list]) => list.map((a) => a.date)))].sort();
  const rows = dates.map((d) => {
    const row = { Date: d.slice(5) };
    top.forEach(([id, list]) => {
      const a = list.find((x) => x.date === d);
      if (a) row[nameOf(id)] = pctOf(a);
    });
    return row;
  });
  return { rows, names };
}

export function weeklyAttendanceData(sessions = []) {
  const byWeek = new Map();
  sessions.filter((s) => s.date).forEach((s) => {
    const w = weekStart(s.date);
    if (!byWeek.has(w)) byWeek.set(w, { sessions: 0, attendances: 0 });
    const e = byWeek.get(w);
    e.sessions += 1;
    e.attendances += (s.student_ids || []).length;
  });
  return [...byWeek.entries()].sort().map(([Week, e]) => ({
    Week: Week.slice(5),
    Sessions: e.sessions,
    "Student Attendances": e.attendances,
  }));
}
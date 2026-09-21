// Deterministic Goal Group report builders. All figures come from recorded
// goals, sessions, and progress data — nothing invented.

import { textSection, tableSection, sheetFromTable, safeFilename } from "@/lib/reportExport";
import { studentName } from "@/lib/caseReports";
import { sortStudentsByName } from "@/lib/studentSort";

const byDate = (arr) => (arr || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
const round1 = (n) => Math.round(n * 10) / 10;

export function weekStart(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function weeklyGroupMinutes(sessions = [], goalArea) {
  const byWeek = new Map();
  sessions
    .filter((s) => s.goal_area === goalArea && s.date)
    .forEach((s) => {
      const w = weekStart(s.date);
      byWeek.set(w, (byWeek.get(w) || 0) + (s.minutes || 0));
    });
  return [...byWeek.entries()].sort().map(([Week, Minutes]) => ({ Week: Week.slice(5), Minutes }));
}

// ---------- Caseload-wide summary ----------

export function buildGroupSummaryReport({ groups = [], students = [], goals = [], sessions = [] }) {
  const summaryRows = groups.map((g) => {
    const gs = sessions.filter((s) => s.goal_area === g.goal_area);
    const totalMinutes = gs.reduce((n, s) => n + (s.minutes || 0), 0);
    const areaGoals = goals.filter((x) => x.goal_area === g.goal_area);
    return [
      g.goal_area,
      g.students.length,
      areaGoals.length,
      gs.length,
      totalMinutes,
      gs.length ? round1(totalMinutes / gs.length) : "—",
    ];
  });

  const rosterRows = groups.flatMap((g) =>
    sortStudentsByName(g.students || []).map((s) => [g.goal_area, `${s.first_name} ${s.last_name}`, s.grade || "—"])
  );
  const sessionRows = byDate(sessions).map((s) => [
    s.date,
    s.goal_area || "—",
    s.delivery || "—",
    s.minutes ?? "—",
    (s.student_ids || []).length,
    (s.notes || "").slice(0, 40),
  ]);

  return {
    title: "Goal Group Summary",
    subtitle: `Generated ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})} · ${groups.length} group(s) · ${rosterRows.length} student placement(s)`,
    sections: [
      textSection("Overview", [
        `${groups.length} goal group(s) formed from IEP goal areas.`,
        "Groups are formed automatically from shared goal areas; minutes come from logged sessions.",
      ]),
      tableSection("Group Summary", ["Goal Group", "Students", "Goals", "Sessions", "Total Minutes", "Avg Min/Session"], summaryRows),
      ...groups.map((g) =>
        textSection(`${g.goal_area} — Students`, sortStudentsByName(g.students || []).map((s) => `${s.first_name} ${s.last_name}${s.grade ? ` (Grade ${s.grade})` : ""}`))
      ),
    ],
    sheets: [
      sheetFromTable("Group Summary", ["Goal Group", "Students", "Goals", "Sessions", "Total Minutes", "Avg Min/Session"], summaryRows),
      sheetFromTable("Roster", ["Goal Group", "Student", "Grade"], rosterRows),
      sheetFromTable("Sessions", ["Date", "Goal Group", "Delivery", "Minutes", "Students", "Notes"], sessionRows),
    ],
    filename: safeFilename("Goal-Group-Summary"),
    student_id: "caseload",
  };
}

// ---------- Single group report ----------

export function buildGroupReport({ group, students = [], goals = [], progress = [], sessions = [] }) {
  const area = group.goal_area;
  const groupSessions = byDate(sessions.filter((s) => s.goal_area === area));
  const groupStudents = sortStudentsByName(group.students || []);
  const memberIds = new Set(groupStudents.map((s) => s.id));
  const areaGoals = goals.filter((g) => g.goal_area === area && memberIds.has(g.student_id));
  const areaGoalIds = new Set(areaGoals.map((g) => g.id));

  const totalMinutes = groupSessions.reduce((n, s) => n + (s.minutes || 0), 0);

  const goalRows = areaGoals.map((g) => {
    const st = groupStudents.find((x) => x.id === g.student_id);
    return [studentName(st), (g.goal_text || "").slice(0, 60), g.baseline || "—", g.target || "—", g.status || "active"];
  });

  const attendanceRows = groupStudents.map((s) => {
    const mine = groupSessions.filter((x) => (x.student_ids || []).includes(s.id));
    return [
      studentName(s),
      mine.length,
      mine.reduce((n, x) => n + (x.minutes || 0), 0),
      mine.length ? `${round1(mine.reduce((n, x) => n + (x.minutes || 0), 0) / mine.length)}` : "—",
    ];
  });

  const growthRows = groupStudents.map((s) => {
    const pts = byDate(progress.filter((p) => p.student_id === s.id && (p.goal_id ? areaGoalIds.has(p.goal_id) : false)));
    if (!pts.length) return [studentName(s), "No progress data recorded for this goal area"];
    const first = pts[0];
    const latest = pts[pts.length - 1];
    const change = round1((latest.percentage ?? 0) - (first.percentage ?? 0));
    return [studentName(s), first.percentage ?? "—", latest.percentage ?? "—", change >= 0 ? `+${change}` : `${change}`];
  });

  const sessionRows = groupSessions.map((s) => [
    s.date,
    s.delivery || "—",
    s.minutes ?? "—",
    (s.student_ids || []).length,
    (s.notes || "").slice(0, 40),
  ]);

  const activeCount = areaGoals.filter((g) => g.status === "active").length;
  const metCount = areaGoals.filter((g) => g.status === "met").length;

  return {
    title: `Goal Group Report — ${area}`,
    subtitle: `Generated ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})} · ${group.students.length} student(s) · ${groupSessions.length} session(s) · ${totalMinutes} total minutes`,
    sections: [
      textSection("Overview", [
        `Goal group: ${area}`,
        `Students in group: ${group.students.length}`,
        `Goals addressed: ${areaGoals.length} (${activeCount} active, ${metCount} met)`,
        `Sessions logged: ${groupSessions.length} · ${totalMinutes} total minutes`,
      ]),
      textSection("Students in Group", groupStudents.map((s) => `${s.first_name} ${s.last_name}${s.grade ? ` (Grade ${s.grade})` : ""}`)),
      goalRows.length
        ? tableSection("Goals Addressed", ["Student", "Goal", "Baseline", "Target", "Status"], goalRows)
        : textSection("Goals Addressed", "No goals recorded in this area yet."),
      attendanceRows.length
        ? tableSection("Attendance (per student)", ["Student", "Sessions", "Minutes", "Avg Min/Session"], attendanceRows)
        : textSection("Attendance", "No students in this group."),
      growthRows.some((r) => r.length === 4)
        ? tableSection("Growth Trends (progress data for this goal area)", ["Student", "First %", "Latest %", "Change"], growthRows.filter((r) => r.length === 4))
        : textSection("Growth Trends", "No progress data recorded for this goal area yet."),
      sessionRows.length
        ? tableSection("Sessions", ["Date", "Delivery", "Minutes", "Students", "Notes"], sessionRows)
        : textSection("Sessions", "No sessions logged for this group yet."),
    ],
    sheets: [
      sheetFromTable("Roster", ["Student", "Grade"], groupStudents.map((s) => [studentName(s), s.grade || "—"])),
      sheetFromTable("Goals", ["Student", "Goal", "Baseline", "Target", "Status"], goalRows),
      sheetFromTable("Attendance", ["Student", "Sessions", "Minutes", "Avg Min/Session"], attendanceRows),
      sheetFromTable("Growth", ["Student", "First %", "Latest %", "Change"], growthRows.filter((r) => r.length === 4)),
      sheetFromTable("Sessions", ["Date", "Delivery", "Minutes", "Students", "Notes"], sessionRows),
    ],
    filename: safeFilename("Goal-Group-Report", area),
    student_id: "caseload",
  };
}
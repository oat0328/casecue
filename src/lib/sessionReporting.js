// Pure reporting helpers for the Session Tracker: date ranges, dashboard
// summaries, compliance calculations, and document/Excel/CSV row builders.
// All figures come from recorded session data — nothing is invented.

import { STATUS_LABEL, MISSED_STATUSES, DELIVERED_STATUSES, SERVICE_TYPES, computeQuantitative } from "@/lib/sessionCalc";
import { sortStudentsByName } from "@/lib/studentSort";

export const SERVICE_LABEL = (v) =>
  SERVICE_TYPES.find((s) => s.value === v)?.label || String(v || "").replace(/_/g, " ") || "—";

export const fmtLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const pctOf = (s) => {
  const q = s.quantitative || {};
  if (q.percentage != null) return Number(q.percentage);
  if (q.correct != null && q.total) return computeQuantitative(q.correct, q.total).percentage;
  return null;
};

export const minutesOf = (s) => Number(s.delivered_minutes ?? s.duration_minutes) || 0;

export const attendanceOf = (s) => {
  if (MISSED_STATUSES.includes(s.status)) return "Missed";
  if (DELIVERED_STATUSES.includes(s.status)) return "Attended";
  return "Other";
};

export const outcomeOf = (s) => {
  const p = pctOf(s);
  return `${STATUS_LABEL(s.status)}${p != null ? ` — ${p}% performance` : ""}`;
};

export const progressNotesOf = (s) => {
  const q = s.quantitative || {};
  const bits = [];
  if (q.percentage != null) bits.push(`${q.percentage}%`);
  else if (q.correct != null && q.total) bits.push(`${q.correct}/${q.total}`);
  if (q.prompt_level && q.prompt_level !== "independent") bits.push(`prompting: ${q.prompt_level}`);
  if (Array.isArray(s.tags) && s.tags.length) bits.push(s.tags.join(", "));
  return bits.join(" · ");
};

export function studentName(students, id) {
  const s = (students || []).find((x) => x.id === id);
  return s ? `${s.first_name} ${s.last_name}` : "Unknown student";
}

export function goalArea(goals, id) {
  return (goals || []).find((g) => g.id === id)?.goal_area || "";
}

// ---- Date ranges -----------------------------------------------------------

export function dayRange(dateStr) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const s = fmtLocal(d);
  return { start: s, end: s, label: d.toLocaleDateString(undefined, { dateStyle: "full" }) };
}

export function weekRange(refStr) {
  const r = refStr ? new Date(`${refStr}T00:00:00`) : new Date();
  r.setHours(0, 0, 0, 0);
  const dow = (r.getDay() + 6) % 7;
  const start = new Date(r);
  start.setDate(r.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: fmtLocal(start), end: fmtLocal(end), label: `Week of ${start.toLocaleDateString()}` };
}

export function monthRange(ymStr) {
  const ym = ymStr || fmtLocal(new Date()).slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start: fmtLocal(start), end: fmtLocal(end), label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
}

export function filterByRange(sessions, { start, end }) {
  return (sessions || []).filter((s) => s.date >= start && s.date <= end);
}

// ---- Summaries -------------------------------------------------------------

export function rangeSummary(sessions) {
  const all = sessions || [];
  const delivered = all.filter((s) => DELIVERED_STATUSES.includes(s.status));
  const missed = all.filter((s) => MISSED_STATUSES.includes(s.status));
  const minutes = delivered.reduce((sum, s) => sum + minutesOf(s), 0);
  const base = delivered.length + missed.length;
  return {
    total: all.length,
    deliveredCount: delivered.length,
    missedCount: missed.length,
    makeupCount: all.filter((s) => s.status === "makeup_session").length,
    minutes,
    attendanceRate: base ? Math.round((delivered.length / base) * 1000) / 10 : null,
    goalsWorkedOn: new Set(all.filter((s) => s.goal_id).map((s) => s.goal_id)).size,
    studentsSeen: new Set(delivered.map((s) => s.student_id)).size,
  };
}

// ---- Excel / CSV rows -------------------------------------------------------

export const EXCEL_HEADERS = [
  "Student Name", "Date", "Service Type", "Goal Area", "Minutes",
  "Session Notes", "Progress Notes", "Attendance", "Provider", "Location", "Outcome",
];

export function excelRows(sessions, students, goals) {
  return (sessions || []).map((s) => [
    studentName(students, s.student_id),
    s.date,
    SERVICE_LABEL(s.service_type),
    goalArea(goals, s.goal_id) || "",
    minutesOf(s),
    s.qualitative || "",
    progressNotesOf(s),
    attendanceOf(s),
    s.provider || "",
    s.location || "",
    outcomeOf(s),
  ]);
}

// ---- Document sections -------------------------------------------------------

export function sessionDocSections(sessions, students, goals) {
  const sum = rangeSummary(sessions);
  const sections = [
    {
      heading: "Summary",
      body: [
        `Sessions: ${sum.total} (${sum.deliveredCount} delivered, ${sum.missedCount} missed)`,
        `Minutes delivered: ${sum.minutes}`,
        `Attendance rate: ${sum.attendanceRate != null ? `${sum.attendanceRate}%` : "no attendance data"}`,
        `Students seen: ${sum.studentsSeen}`,
        `Goals worked on: ${sum.goalsWorkedOn}`,
      ].join("\n"),
    },
  ];
  (sessions || []).forEach((s) => {
    const details = [
      `Student: ${studentName(students, s.student_id)}`,
      `Service: ${SERVICE_LABEL(s.service_type)} (${s.delivery === "group" ? "Group" : "Individual"} · ${s.setting === "push_in" ? "Push-in" : "Pull-out"})`,
      s.goal_id ? `Goal area: ${goalArea(goals, s.goal_id)}` : null,
      `Time: ${s.start_time || "—"}–${s.end_time || "—"} · ${minutesOf(s)} min`,
      `Status: ${STATUS_LABEL(s.status)}`,
      s.provider ? `Provider: ${s.provider}` : null,
      s.location ? `Location: ${s.location}` : null,
      progressNotesOf(s) ? `Progress data: ${progressNotesOf(s)}` : null,
      s.activity ? `Activity: ${s.activity}` : null,
      s.qualitative ? `Notes: ${s.qualitative}` : null,
      s.follow_up_needed && s.follow_up_note ? `Follow-up needed: ${s.follow_up_note}` : null,
    ].filter(Boolean).join("\n");
    sections.push({
      heading: `${s.date}${s.start_time ? ` ${s.start_time}` : ""} — ${studentName(students, s.student_id)}`,
      body: details,
    });
  });
  if (!(sessions || []).length) {
    sections.push({ heading: "No sessions", body: "No sessions were recorded for this range." });
  }
  return sections;
}

// ---- Compliance -------------------------------------------------------------

export function weeksElapsedIn(range, today = new Date()) {
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  // A future month has no elapsed service weeks yet. Previously it could report
  // one required week before the reporting period had even started.
  if (today < start) return 0;
  const ref = today < end ? today : end;
  const days = Math.max(1, Math.round((ref - start) / 86400000) + 1);
  return Math.max(1, Math.min(6, Math.ceil(days / 7)));
}

export function monthCompliance(sessions, students, range) {
  const inRange = filterByRange(sessions, range);
  const weeks = weeksElapsedIn(range);
  const rows = sortStudentsByName(students || []).map((st) => {
    const ss = inRange.filter((s) => s.student_id === st.id);
    const sum = rangeSummary(ss);
    const requiredWeekly = Number(st.service_minutes) || 0;
    const required = requiredWeekly * weeks;
    const makeups = ss.filter((s) => s.status === "makeup_session");
    return {
      student: st,
      requiredWeekly,
      required,
      delivered: sum.minutes,
      sessionCount: sum.total,
      missedCount: sum.missedCount,
      missedMinutes: ss.filter((s) => MISSED_STATUSES.includes(s.status)).reduce((n, s) => n + (Number(s.scheduled_minutes) || 0), 0),
      makeupCount: makeups.length,
      makeupMinutes: makeups.reduce((n, s) => n + minutesOf(s), 0),
      compliance: required ? Math.round((sum.minutes / required) * 100) : null,
      weeks,
    };
  });
  const totalRequired = rows.reduce((n, r) => n + r.required, 0);
  const totalDelivered = rows.reduce((n, r) => n + r.delivered, 0);
  return {
    weeks,
    rows,
    totals: {
      required: totalRequired,
      delivered: totalDelivered,
      missed: rows.reduce((n, r) => n + r.missedCount, 0),
      missedMinutes: rows.reduce((n, r) => n + r.missedMinutes, 0),
      makeup: rows.reduce((n, r) => n + r.makeupCount, 0),
      makeupMinutes: rows.reduce((n, r) => n + r.makeupMinutes, 0),
      compliance: totalRequired ? Math.round((totalDelivered / totalRequired) * 100) : null,
    },
  };
}

// ---- Report builders (data-derived, data-derived) -----------------------------------

function goalStats(list) {
  const sorted = [...list].sort((a, b) =>
    `${a.date || ""} ${a.start_time || ""}`.localeCompare(`${b.date || ""} ${b.start_time || ""}`)
  );
  // Trend points must follow chronological session order. Building percentages
  // before sorting could report the wrong first/latest value when records arrived
  // from imports in a different order.
  const pcts = sorted.map((s) => pctOf(s)).filter((p) => p != null);
  const first = pcts.length ? pcts[0] : null;
  const latest = pcts.length ? pcts[pcts.length - 1] : null;
  return {
    points: pcts.length,
    average: pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : null,
    first,
    latest,
    trend: first != null && latest != null ? Math.round((latest - first) * 10) / 10 : null,
    sorted,
  };
}

export function buildStudentProgressSections(student, sessions, goals) {
  const sum = rangeSummary(sessions);
  const sections = [
    {
      heading: "Overview",
      body: [
        `Student: ${student.first_name} ${student.last_name}${student.grade ? ` · Grade ${student.grade}` : ""}`,
        `Sessions recorded: ${sum.total}`,
        `Minutes delivered: ${sum.minutes}`,
        `Attendance rate: ${sum.attendanceRate != null ? `${sum.attendanceRate}%` : "no attendance data"}`,
        `Missed sessions: ${sum.missedCount} · Makeup sessions: ${sum.makeupCount}`,
      ].join("\n"),
    },
  ];
  const byGoalArea = new Map();
  (sessions || []).forEach((s) => {
    const a = goalArea(goals, s.goal_id) || "Not linked to a goal";
    (byGoalArea.get(a) || byGoalArea.set(a, []).get(a)).push(s);
  });
  for (const [area, list] of byGoalArea) {
    const g = goalStats(list);
    const body = [
      `Sessions: ${list.length} · Minutes: ${list.reduce((n, s) => n + minutesOf(s), 0)}`,
      g.points
        ? `Data points: ${g.points} · Average: ${g.average}% · Latest: ${g.latest}%${g.trend != null ? ` · Change since first data point: ${g.trend > 0 ? "+" : ""}${g.trend}%` : ""}`
        : "No quantitative data recorded for this goal area.",
      g.sorted
        .slice(-3)
        .map((s) => `${s.date}: ${s.qualitative || progressNotesOf(s) || STATUS_LABEL(s.status)}`)
        .join("\n"),
    ].filter(Boolean).join("\n");
    sections.push({ heading: `Goal area: ${area}`, body });
  }
  if (!(sessions || []).length) {
    sections.push({ heading: "No sessions", body: "No sessions have been recorded for this student yet." });
  }
  return sections;
}

export function buildIepProgressSections(student, sessions, goals) {
  const studentGoals = (goals || []).filter((g) => g.student_id === student.id);
  const sections = [
    {
      heading: "IEP Progress Summary",
      body: [
        `Student: ${student.first_name} ${student.last_name}${student.grade ? ` · Grade ${student.grade}` : ""}`,
        student.eligibility_category ? `Eligibility: ${student.eligibility_category}` : null,
        `IEP goals on file: ${studentGoals.length}`,
      ].filter(Boolean).join("\n"),
    },
  ];
  studentGoals.forEach((g, i) => {
    const linked = (sessions || []).filter((s) => s.goal_id === g.id);
    const st = goalStats(linked);
    const trendText =
      st.trend == null
        ? "Insufficient data to describe a trend — this is not evidence of progress or lack of progress."
        : st.trend > 0
          ? `Performance has improved by ${st.trend} percentage points from the first to the most recent data point.`
          : st.trend < 0
            ? `Performance has declined by ${Math.abs(st.trend)} percentage points from the first to the most recent data point.`
            : "Performance is unchanged between the first and most recent data point.";
    sections.push({
      heading: `Goal ${i + 1} — ${g.goal_area || "General"}`,
      body: [
        g.goal_text || "Goal text not recorded.",
        `Baseline: ${g.baseline || "not recorded"} · Target: ${g.target || "not recorded"} · Criterion: ${g.criterion || "not recorded"}`,
        `Measurement method: ${g.measurement_method || "not recorded"} · Progress monitoring: ${g.progress_monitoring_method || "not recorded"}`,
        g.status ? `Goal status: ${g.status}` : null,
        "",
        `Session data: ${linked.length} session${linked.length === 1 ? "" : "s"} linked to this goal.`,
        st.points
          ? `Data points: ${st.points} · Average: ${st.average}% · Latest: ${st.latest}% (as recorded in Session Tracker)`
          : "No quantitative progress data recorded for this goal.",
        trendText,
      ].filter((l) => l != null).join("\n"),
    });
  });
  if (!studentGoals.length) {
    sections.push({ heading: "No IEP goals on file", body: "Add IEP goals before generating an IEP progress report." });
  }
  return sections;
}

export function buildParentFriendlySections(student, sessions, goals) {
  const sum = rangeSummary(sessions);
  const sorted = [...(sessions || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const activities = [...new Set(sorted.map((s) => s.activity).filter(Boolean))].slice(0, 8);
  const areas = [...new Set(sorted.map((s) => goalArea(goals, s.goal_id)).filter(Boolean))].slice(0, 6);
  const sections = [
    {
      heading: "About this report",
      body: `This report summarizes ${sum.total} recorded session${sum.total === 1 ? "" : "s"} for ${student.first_name} ${student.last_name}. All information comes directly from session records kept by the service provider.`,
    },
    {
      heading: "What we worked on",
      body: [
        areas.length ? `Skill areas: ${areas.join(", ")}` : null,
        activities.length ? `Activities: ${activities.join("; ")}` : null,
      ].filter(Boolean).join("\n") || "No activity details were recorded.",
    },
    {
      heading: "How it went",
      body:
        sorted
          .slice(-5)
          .map((s) => `${s.date}: ${s.qualitative || progressNotesOf(s) || STATUS_LABEL(s.status)}`)
          .join("\n") || "No session notes recorded yet.",
    },
    {
      heading: "Attendance and service time",
      body: [
        `Sessions attended: ${sum.deliveredCount} of ${sum.deliveredCount + sum.missedCount} scheduled`,
        `Minutes of service delivered: ${sum.minutes}`,
        `Missed sessions: ${sum.missedCount} · Makeup sessions provided: ${sum.makeupCount}`,
      ].join("\n"),
    },
  ];
  const followUps = sorted.filter((s) => s.follow_up_needed && s.follow_up_note).slice(-3);
  sections.push({
    heading: "Next steps noted by the teacher",
    body: followUps.length ? followUps.map((s) => `${s.date}: ${s.follow_up_note}`).join("\n") : "None recorded.",
  });
  return sections;
}

export function buildServiceDeliverySections(student, sessions) {
  const sum = rangeSummary(sessions);
  const month = monthRange();
  const monthSessions = filterByRange(sessions, month);
  const monthSum = rangeSummary(monthSessions);
  const requiredWeekly = Number(student.service_minutes) || 0;

  const byType = new Map();
  (sessions || []).filter((s) => DELIVERED_STATUSES.includes(s.status)).forEach((s) => {
    const k = SERVICE_LABEL(s.service_type);
    byType.set(k, (byType.get(k) || 0) + minutesOf(s));
  });

  return [
    {
      heading: "Service Delivery Report",
      body: [
        `Student: ${student.first_name} ${student.last_name}${student.grade ? ` · Grade ${student.grade}` : ""}`,
        `Required weekly minutes (per student record): ${requiredWeekly || "not recorded"}`,
      ].join("\n"),
    },
    {
      heading: `Current month — ${month.label}`,
      body: [
        `Sessions: ${monthSum.total} · Delivered: ${monthSum.deliveredCount} · Missed: ${monthSum.missedCount} · Makeups: ${monthSum.makeupCount}`,
        `Minutes delivered this month: ${monthSum.minutes}`,
        `Attendance rate: ${monthSum.attendanceRate != null ? `${monthSum.attendanceRate}%` : "no attendance data"}`,
      ].join("\n"),
    },
    {
      heading: "Minutes by service type (all recorded sessions)",
      body:
        [...byType.entries()].map(([k, v]) => `${k}: ${v} minutes`).join("\n") ||
        "No delivered sessions recorded yet.",
    },
    {
      heading: "Missed sessions (all recorded)",
      body:
        (sessions || [])
          .filter((s) => MISSED_STATUSES.includes(s.status))
          .map((s) => `${s.date}: ${STATUS_LABEL(s.status)} (${Number(s.scheduled_minutes) || 0} scheduled minutes)`)
          .join("\n") || "None recorded.",
    },
  ];
}
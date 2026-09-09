// Shared session calculation helpers, vocabulary, and CSV utilities for the Session Tracker.
// Pure functions — testable without React.

export const SERVICE_TYPES = [
  { value: "special_education", label: "Special Education" },
  { value: "general_education", label: "General Education" },
  { value: "speech", label: "Speech" },
  { value: "occupational_therapy", label: "Occupational Therapy" },
  { value: "physical_therapy", label: "Physical Therapy" },
  { value: "counseling", label: "Counseling" },
  { value: "behavior_support", label: "Behavior Support" },
  { value: "other", label: "Other" },
];

export const SESSION_STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "partially_completed", label: "Partially Completed" },
  { value: "student_absent", label: "Student Absent" },
  { value: "provider_absent", label: "Provider Absent" },
  { value: "school_activity", label: "School Activity" },
  { value: "refused", label: "Refused" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "makeup_session", label: "Makeup Session" },
  { value: "canceled", label: "Canceled" },
  { value: "other", label: "Other" },
];

export const MISSED_STATUSES = ["student_absent", "provider_absent", "refused", "school_activity", "canceled"];
export const DELIVERED_STATUSES = ["completed", "partially_completed", "makeup_session"];

export const QUAL_TAGS = [
  "Engaged", "Off Task", "Needed Redirection", "Independent", "Verbal Prompts", "Visual Prompts",
  "Modeling", "Physical Prompts", "Improved", "Maintained", "Regressed", "Generalized Skill",
];

export const PROMPT_LEVELS = [
  { value: "independent", label: "Independent" },
  { value: "verbal", label: "Verbal Prompts" },
  { value: "visual", label: "Visual Prompts" },
  { value: "modeling", label: "Modeling" },
  { value: "physical", label: "Physical Prompts" },
  { value: "full", label: "Full Physical Support" },
];

export const MEASUREMENT_TYPES = [
  { value: "accuracy", label: "Accuracy (correct/total)" },
  { value: "frequency", label: "Frequency (count)" },
  { value: "duration", label: "Duration (minutes/seconds)" },
  { value: "rate", label: "Rate (per minute)" },
  { value: "rubric", label: "Rubric score" },
  { value: "custom", label: "Custom measurement" },
];

export const STATUS_LABEL = (value) =>
  SESSION_STATUSES.find((s) => s.value === value)?.label || value || "—";

// Fraction / decimal / percentage from correct and total. Example: 4 of 15 → "4/15", 0.267, 26.7%
export function computeQuantitative(correct, total) {
  const c = Number(correct);
  const t = Number(total);
  if (!isFinite(c) || !isFinite(t) || t <= 0) return { fraction: "", decimal: null, percentage: null };
  const decimal = Math.round((c / t) * 1000) / 1000;
  return { fraction: `${c}/${t}`, decimal, percentage: Math.round((c / t) * 1000) / 10 };
}

// If a teacher enters 0.80, display 80%.
export function interpretDecimal(value) {
  const n = Number(value);
  if (!isFinite(n)) return null;
  if (n > 0 && n <= 1) return Math.round(n * 1000) / 10;
  return n;
}

// Auto-calculated duration in minutes from "HH:MM" start/end times.
export function durationMinutes(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => !isFinite(v))) return null;
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

// Monday-based week test for ISO date strings.
export function isSameWeek(dateStr, ref = new Date()) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return false;
  const r = new Date(ref);
  r.setHours(0, 0, 0, 0);
  const dow = (r.getDay() + 6) % 7;
  const start = new Date(r);
  start.setDate(r.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

export function withinDays(dateStr, days, ref = new Date()) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return false;
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff && d <= ref;
}

// Required vs delivered service minutes for the current week.
// Duplicate entries (same student, date, times, status) are counted only once,
// so a duplicate never inflates delivered minutes.
export function minutesSummary(sessions, requiredWeeklyMinutes, ref = new Date()) {
  const seen = new Set();
  const dedupeKey = (s) => `${s.student_id}|${s.date}|${s.start_time}|${s.end_time}|${s.status}|${s.service_type}`;
  const all = (sessions || []).filter((s) => {
    const k = dedupeKey(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const thisWeek = all.filter((s) => isSameWeek(s.date, ref));
  const delivered = thisWeek
    .filter((s) => DELIVERED_STATUSES.includes(s.status))
    .reduce((sum, s) => sum + (Number(s.delivered_minutes) || 0), 0);
  const scheduled = thisWeek
    .filter((s) => !["canceled", "rescheduled"].includes(s.status))
    .reduce((sum, s) => sum + (Number(s.scheduled_minutes) || 0), 0);
  const missed = thisWeek.filter((s) => MISSED_STATUSES.includes(s.status));
  const missedMinutes = missed.reduce((sum, s) => sum + (Number(s.scheduled_minutes) || 0), 0);
  const makeupSessions = thisWeek.filter((s) => s.status === "makeup_session");
  const makeupMinutes = makeupSessions.reduce((sum, s) => sum + (Number(s.delivered_minutes) || 0), 0);
  const required = Number(requiredWeeklyMinutes) || 0;
  return {
    required,
    scheduled,
    delivered,
    missedCount: missed.length,
    missedMinutes,
    makeupCount: makeupSessions.length,
    makeupMinutes,
    remaining: Math.max(0, required - delivered),
    completion: required ? Math.round((delivered / required) * 100) : null,
    noDataThisWeek: required > 0 && thisWeek.length === 0,
  };
}

// Data-quality flags: duplicates, overlaps, invalid durations, outside-goal data.
export function detectSessionFlags(sessions, goals = []) {
  const all = sessions || [];
  const flags = [];
  const key = (s) => `${s.student_id}|${s.date}|${s.start_time}|${s.status}`;
  const seen = new Map();
  const activeGoalIds = new Set((goals || []).map((g) => g.id));

  all.forEach((s) => {
    const k = key(s);
    if (seen.has(k)) {
      flags.push({ type: "duplicate", message: `Duplicate entry: ${s.date} ${s.start_time || ""} (${s.status}) — only one copy counts toward delivered minutes.` });
    } else seen.set(k, s);

    if (s.goal_id && activeGoalIds.size && !activeGoalIds.has(s.goal_id)) {
      flags.push({ type: "inactive_goal", message: `Session on ${s.date} records data for a goal that is no longer active.` });
    }
    const dur = Number(s.duration_minutes) || durationMinutes(s.start_time, s.end_time) || 0;
    if (s.start_time && s.end_time && (dur <= 0 || dur > 240)) {
      flags.push({ type: "duration", message: `Unusual duration (${dur} min) on ${s.date} — verify times.` });
    }
  });

  const byDate = {};
  all.forEach((s) => {
    if (!s.start_time || !s.end_time) return;
    (byDate[s.date] = byDate[s.date] || []).push(s);
  });
  Object.values(byDate).forEach((list) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (`${a.start_time}${a.end_time}${a.status}` === `${b.start_time}${b.end_time}${b.status}`) continue;
        const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        if (toMin(a.start_time) < toMin(b.end_time) && toMin(b.start_time) < toMin(a.end_time)) {
          flags.push({ type: "overlap", message: `Overlapping sessions on ${a.date} (${a.start_time}–${a.end_time} and ${b.start_time}–${b.end_time}).` });
        }
      }
    }
  });
  return flags;
}

export function toCsvString(headers, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function downloadCsv(filename, headers, rows) {
  const blob = new Blob(["\ufeff" + toCsvString(headers, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
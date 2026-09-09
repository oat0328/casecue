// Shared logic for Instruction & Schedule: grouping, minutes, conflicts, and
// export builders. Pure functions — used by the Schedule page, group
// management, the minutes panel, and the export panel.

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DELIVERY_LABEL = { "pull-out": "Pull-Out", "push-in": "Push-In", consultation: "Consultation" };

export const timeToMin = (t) => {
  if (!t || !String(t).includes(":")) return null;
  const [h, m] = String(t).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

export const durationMinutes = (start, end) => {
  const s = timeToMin(start);
  const e = timeToMin(end);
  return s != null && e != null && e > s ? e - s : null;
};

export const studentName = (students, id) => {
  const s = (students || []).find((x) => x.id === id);
  return s ? `${s.first_name} ${s.last_name}`.trim() : "Unknown student";
};

export const normalizeDay = (day) =>
  DAYS.find((d) => d.toLowerCase() === String(day || "").toLowerCase()) || "Monday";

// Aggregates schedule entries into groups (by group_name, active only unless includeArchived).
export function byGroup(entries, { includeArchived = false } = {}) {
  const groups = new Map();
  for (const e of entries || []) {
    if (!includeArchived && e.archived) continue;
    if (!groups.has(e.group_name)) {
      groups.set(e.group_name, { name: e.group_name, entries: [], studentIds: new Set(), archived: false });
    }
    const g = groups.get(e.group_name);
    g.entries.push(e);
    if (e.archived) g.archived = true;
    for (const id of e.student_ids || []) g.studentIds.add(id);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Deterministic conflict detection: same day, overlapping times, shared students.
export function findConflicts(entries) {
  const out = [];
  const list = (entries || []).filter((e) => !e.archived);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.day !== b.day) continue;
      const as = timeToMin(a.start_time);
      const ae = timeToMin(a.end_time);
      const bs = timeToMin(b.start_time);
      const be = timeToMin(b.end_time);
      if (as == null || ae == null || bs == null || be == null) continue;
      if (as >= be || bs >= ae) continue;
      const shared = (a.student_ids || []).filter((id) => (b.student_ids || []).includes(id));
      if (shared.length) out.push({ a, b, student_ids: shared });
    }
  }
  return out;
}

// Weekly scheduled minutes per student id.
export function scheduledMinutes(entries) {
  const out = {};
  for (const e of entries || []) {
    if (e.archived) continue;
    for (const id of e.student_ids || []) {
      out[id] = (out[id] || 0) + (e.service_minutes || 0);
    }
  }
  return out;
}

// Delivered minutes for the current week (Monday-based) per student id.
export function deliveredThisWeek(logs) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const mondayISO = monday.toISOString().slice(0, 10);
  const out = {};
  for (const log of logs || []) {
    if (!log.date || log.date < mondayISO) continue;
    for (const id of log.student_ids || []) {
      out[id] = (out[id] || 0) + (log.minutes || 0);
    }
  }
  return out;
}

// ---- Export builders (sections feed the shared Print/PDF/DOCX pipeline) ----

const BANNER = "Instruction & Schedule — CaseCue";

export function scheduleSections(entries, students) {
  return DAYS.map((day) => {
    const list = (entries || []).filter((e) => !e.archived && e.day === day);
    if (!list.length) return { heading: day, body: "No sessions scheduled." };
    return {
      heading: day,
      body: list
        .map(
          (e) =>
            `${e.group_name} — ${e.start_time || "?"} to ${e.end_time || "?"} (${DELIVERY_LABEL[e.delivery] || e.delivery}, ${e.service_minutes || 0} min)${e.teacher_classroom ? ` — ${e.teacher_classroom}` : ""}\nStudents: ${(e.student_ids || []).map((id) => studentName(students, id)).join(", ") || "None"}${e.notes ? `\nNotes: ${e.notes}` : ""}`
        )
        .join("\n\n"),
    };
  });
}

export function caseloadSections(entries, students) {
  const scheduled = scheduledMinutes(entries);
  return (students || [])
    .filter((s) => s.status !== "exited")
    .map((s) => {
      const list = (entries || []).filter((e) => !e.archived && (e.student_ids || []).includes(s.id));
      const conflicts = findConflicts(list).length;
      return {
        heading: `${s.first_name} ${s.last_name}${s.grade ? ` (Grade ${s.grade})` : ""}`,
        body:
          `Required weekly minutes: ${s.service_minutes != null ? s.service_minutes : "Not recorded"}\nScheduled weekly minutes: ${scheduled[s.id] || 0}\n` +
          (list.length
            ? list.map((e) => `${e.day} ${e.start_time || "?"}-${e.end_time || "?"} — ${e.group_name} (${DELIVERY_LABEL[e.delivery] || e.delivery}, ${e.service_minutes || 0} min)`).join("\n")
            : "No scheduled sessions.") +
          (conflicts ? `\nScheduling conflicts: ${conflicts}` : ""),
      };
    });
}

export function rosterSections(entries, students) {
  return byGroup(entries).map((g) => ({
    heading: g.name,
    body:
      g.entries
        .map((e) => `${e.day} ${e.start_time || "?"}-${e.end_time || "?"} — ${DELIVERY_LABEL[e.delivery] || e.delivery}${e.teacher_classroom ? ` — ${e.teacher_classroom}` : ""}`)
        .join("\n") +
      `\nStudents (${g.studentIds.size}): ${[...g.studentIds].map((id) => studentName(students, id)).join(", ") || "None"}`,
  }));
}

export function scheduleRows(entries, students) {
  return (entries || [])
    .filter((e) => !e.archived)
    .map((e) => [
      e.day || "",
      e.group_name || "",
      DELIVERY_LABEL[e.delivery] || e.delivery || "",
      e.start_time || "",
      e.end_time || "",
      e.service_minutes || 0,
      e.teacher_classroom || "",
      (e.student_ids || []).map((id) => studentName(students, id)).join(", "),
      e.notes || "",
    ]);
}

export const SCHEDULE_HEADERS = ["Day", "Group", "Delivery", "Start", "End", "Minutes", "Teacher / Location", "Students", "Notes"];
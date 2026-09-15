import { base44 } from "@/api/base44Client";

// Shared primitives for the reporting/export system used by Gradebook, Goal
// Groups, Data Center, and Reports. All reports are data-derived (no AI) —
// missing data is stated as missing, never invented.

// ---- File downloads ----

export function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function toCsv(headers, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...(rows || []).map((r) => r.map(esc).join(","))].join("\n");
}

export function downloadCsv(filename, headers, rows) {
  downloadFile("\ufeff" + toCsv(headers, rows), `${String(filename || "casecue-export").replace(/\.csv$/i, "")}.csv`, "text/csv;charset=utf-8;");
}

export function downloadJson(filename, data) {
  downloadFile(JSON.stringify(data, null, 2), `${String(filename || "casecue-export").replace(/\.json$/i, "")}.json`, "application/json");
}

// ---- ExportBar section builders ----

export function textSection(heading, body) {
  return {
    heading,
    body: Array.isArray(body) ? body.filter((x) => x != null && x !== "").join("\n") : String(body ?? ""),
  };
}

export function tableSection(heading, headers, rows) {
  if (!headers || !headers.length) return { heading, body: "" };
  const MAXW = 60;
  const all = [headers, ...(rows || [])];
  const widths = headers.map((_, i) =>
    Math.min(MAXW, Math.max(...all.map((r) => String(r[i] ?? "").length)))
  );
  const line = (r) => r.map((c, i) => String(c ?? "").slice(0, MAXW).padEnd(widths[i])).join("  ").trimEnd();
  const body = [line(headers), widths.map((w) => "-".repeat(w)).join("  "), ...(rows || []).map(line)].join("\n");
  return { heading, body };
}

// ---- Excel sheet builder ----

export function sheetFromTable(name, headers, rows) {
  return {
    name,
    headers: headers || [],
    rows: (rows || []).map((r) =>
      (headers || []).map((_, i) => {
        const v = r[i];
        return typeof v === "number" && isFinite(v) ? v : String(v ?? "");
      })
    ),
  };
}

export function safeFilename(prefix, ...parts) {
  return ["CaseCue", prefix, ...parts.filter(Boolean)]
    .join("-")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-");
}

// ---- Report history ----

export async function saveReportToHistory({
  student_id = "caseload",
  student_name = "Caseload report",
  report_type,
  title,
  subtitle,
  sections,
  params = {},
  banner,
}) {
  return base44.entities.SavedReport.create({
    student_id,
    student_name,
    report_type,
    content: { title, subtitle, sections: sections || [], params, banner },
  });
}

// ---- Filters ----

// Applies the Data Center / Reports filter set to a raw data bundle.
// `forcedStudentId` narrows everything to one student (student-scope reports).
// Students are filtered by grade/service only (never by date); progress,
// sessions, and assignments honor the date range; meetings stay unfiltered by
// date so upcoming meetings always appear.
export function applyFilters(data = {}, f = {}, forcedStudentId = null) {
  let students = (data.students || []).filter(
    (s) => (!f.grade || s.grade === f.grade) && (!f.service || (s.services || []).includes(f.service))
  );
  if (forcedStudentId) students = students.filter((s) => s.id === forcedStudentId);
  const ids = new Set(students.map((s) => s.id));
  const inRange = (d) => !!d && (!f.from || d >= f.from) && (!f.to || d <= f.to);

  const goals = (data.goals || []).filter(
    (g) => ids.has(g.student_id) && (!f.goal_area || g.goal_area === f.goal_area)
  );
  const progress = (data.progress || []).filter((p) => ids.has(p.student_id) && inRange(p.date));
  const sessions = (data.sessions || []).filter(
    (s) => ((s.student_id && ids.has(s.student_id)) || (s.student_ids || []).some((id) => ids.has(id))) && inRange(s.date) && (!f.provider || s.provider === f.provider)
  );
  const assignments = (data.assignments || []).filter((a) => ids.has(a.student_id) && inRange(a.date));
  const meetings = (data.meetings || []).filter((m) => !forcedStudentId || m.student_id === forcedStudentId);
  const schedule = (data.schedule || []).filter((e) => (e.student_ids || []).some((id) => ids.has(id)));

  return {
    students,
    goals,
    progress,
    sessions,
    assignments,
    meetings,
    schedule,
    student: forcedStudentId ? (data.students || []).find((s) => s.id === forcedStudentId) : null,
    filters: f,
  };
}
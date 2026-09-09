// Minimal CSV utilities: quoted-field-safe parser + student import template helpers.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\ufeff/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

export const STUDENT_IMPORT_FIELDS = [
  { key: "first_name", label: "First Name", required: true, example: "Maya" },
  { key: "last_name", label: "Last Name", required: true, example: "Torres" },
  { key: "grade", label: "Grade", example: "3" },
  { key: "eligibility_category", label: "Eligibility Category", example: "SLD" },
  { key: "iep_date", label: "IEP Date", date: true, example: "2025-10-14" },
  { key: "annual_review_due", label: "Annual Review Due", date: true, example: "2026-10-13" },
  { key: "reevaluation_due", label: "Reevaluation Due", date: true, example: "2027-10-12" },
  { key: "strengths", label: "Strengths", example: "Strong verbal reasoning" },
  { key: "areas_of_need", label: "Areas of Need", example: "Reading fluency" },
  { key: "accommodations", label: "Accommodations", example: "Extended time, small group" },
];

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, "");
}

function toIsoDate(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null; // unparseable
}

// Returns { rows: valid student objects, errors: [{ row: number, message }] }
export function parseStudentCsv(text) {
  const table = parseCsv(text);
  if (!table.length) return { rows: [], errors: [{ row: 1, message: "File is empty" }] };
  const headers = table[0].map(normalizeHeader);
  const byKey = new Map(STUDENT_IMPORT_FIELDS.map((f) => [f.key, f]));
  const rows = [];
  const errors = [];
  for (let i = 1; i < table.length; i++) {
    const raw = {};
    table[i].forEach((v, col) => {
      const field = byKey.get(headers[col]);
      if (field) raw[field.key] = v.trim();
    });
    const rowNo = i + 1;
    if (!raw.first_name || !raw.last_name) {
      errors.push({ row: rowNo, message: "Missing first or last name" });
      continue;
    }
    const record = {};
    let badDate = null;
    for (const f of STUDENT_IMPORT_FIELDS) {
      const v = raw[f.key];
      if (!v) continue;
      if (f.date) {
        const iso = toIsoDate(v);
        if (iso === null) { badDate = `${f.label} "${v}" is not a valid date`; continue; }
        if (iso) record[f.key] = iso;
      } else {
        record[f.key] = v;
      }
    }
    if (badDate) { errors.push({ row: rowNo, message: badDate }); continue; }
    rows.push(record);
  }
  return { rows, errors };
}

export function downloadStudentTemplate() {
  const header = STUDENT_IMPORT_FIELDS.map((f) => f.label).join(",");
  const example = STUDENT_IMPORT_FIELDS.map((f) => `"${f.example || ""}"`).join(",");
  const csv = `${header}\n${example}\n`;
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "CaseCue-Student-Import-Template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
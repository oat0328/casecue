// CaseCue date rule:
// - Store entity dates as ISO (YYYY-MM-DD) for safe sorting/filtering.
// - Display dates to teachers as MM/DD/YYYY everywhere in UI, reports and exports.
export const CASECUE_DATE_FORMAT = "MM/DD/YYYY";

export function formatDate(value, format = CASECUE_DATE_FORMAT) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(value);
  const [, y, mo, d] = m;
  if (format === "DD/MM/YYYY") return `${d}/${mo}/${y}`;
  return `${mo}/${d}/${y}`;
}

export function formatDateShort(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}` : String(value);
}

// Converts ISO dates embedded inside display/report prose without changing storage.
export function formatDateText(value) {
  if (value === null || value === undefined) return value;
  return String(value).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y, m, d) => `${m}/${d}/${y}`);
}

// Useful at export boundaries where a table/report object can contain dates in many fields.
export function formatDatesDeep(value) {
  if (Array.isArray(value)) return value.map(formatDatesDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, formatDatesDeep(v)]));
  }
  return typeof value === "string" ? formatDateText(value) : value;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateTime(value, format = CASECUE_DATE_FORMAT) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDateText(value);
  const date = formatDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, format);
  return `${date} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}
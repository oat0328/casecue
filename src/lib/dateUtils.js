// Store entity dates as ISO (YYYY-MM-DD); format only at the UI/export boundary.
// This avoids timezone shifts while keeping teacher-facing dates consistent.
export function formatDate(value, format = "MM/DD/YYYY") {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  const [, y, mo, d] = m;
  if (format === "DD/MM/YYYY") return `${d}/${mo}/${y}`;
  return `${mo}/${d}/${y}`;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateTime(value, format = "MM/DD/YYYY") {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = formatDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, format);
  return `${date} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}
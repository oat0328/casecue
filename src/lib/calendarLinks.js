// Privacy-safe "Add to Calendar" helpers for CaseCue meetings.
// Only the meeting type, date/time, student INITIALS, and a link back to the
// authorized CaseCue meeting page ever leave the app — never IEP content,
// disability information, evaluation findings, goals, accommodations, or services.

const TYPE_LABELS = {
  IEP: "IEP Meeting",
  MET: "MDT/MET Meeting",
  Evaluation: "Evaluation Meeting",
};

function locationText(meeting) {
  const loc = String(meeting?.location || "").trim();
  return loc || "Location / virtual meeting link: see the CaseCue meeting page";
}

const REMINDER_TEXT =
  "Reminder: set a reminder for this meeting. Full details are stored securely in CaseCue — " +
  "this calendar event intentionally excludes confidential student information.";

function pad(n) {
  return String(n).padStart(2, "0");
}

export function studentInitials(student) {
  if (!student) return "";
  const f = String(student.first_name || "").trim();
  const l = String(student.last_name || "").trim();
  return [f[0], l[0]]
    .filter(Boolean)
    .map((c) => `${c.toUpperCase()}.`)
    .join("");
}

function parseTime(t) {
  if (!t) return null;
  const m = String(t).trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, min };
}

function utcStamp(d) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

function dateStamp(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}${m}${d}`;
}

function nextDateStamp(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function meetingTitle(meeting, student) {
  const type = TYPE_LABELS[meeting.meeting_type] || "Meeting";
  const initials = studentInitials(student);
  return initials ? `${type} — ${initials}` : type;
}

function eventDescription() {
  return `${REMINDER_TEXT}\nOpen the authorized CaseCue meeting page: ${window.location.origin}/meetings`;
}

function escapeIcs(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// 1. Prefilled Google Calendar event URL
export function googleCalendarUrl(meeting, student) {
  if (!meeting.date) return "#";
  const t = parseTime(meeting.time);
  let dates;
  if (t) {
    const start = new Date(`${meeting.date}T${pad(t.h)}:${pad(t.min)}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    dates = `${utcStamp(start)}/${utcStamp(end)}`;
  } else {
    dates = `${dateStamp(meeting.date)}/${nextDateStamp(meeting.date)}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meetingTitle(meeting, student),
    dates,
    details: eventDescription(),
    location: locationText(meeting),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// 2. Standard .ics calendar file content
export function icsFileContent(meeting, student) {
  if (!meeting.date) return "";
  const t = parseTime(meeting.time);
  let start;
  let end;
  if (t) {
    const s = new Date(`${meeting.date}T${pad(t.h)}:${pad(t.min)}:00`);
    const e = new Date(s.getTime() + 60 * 60 * 1000);
    start = `DTSTART:${utcStamp(s)}`;
    end = `DTEND:${utcStamp(e)}`;
  } else {
    start = `DTSTART;VALUE=DATE:${dateStamp(meeting.date)}`;
    end = `DTEND;VALUE=DATE:${nextDateStamp(meeting.date)}`;
  }
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CaseCue//Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:casecue-meeting-${meeting.id}@getcasecue.com`,
    `DTSTAMP:${utcStamp(new Date())}`,
    start,
    end,
    `SUMMARY:${escapeIcs(meetingTitle(meeting, student))}`,
    `LOCATION:${escapeIcs(locationText(meeting))}`,
    `DESCRIPTION:${escapeIcs(eventDescription())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// 3. Plain-text meeting details for the clipboard
export function meetingDetailsText(meeting, student) {
  return [
    meetingTitle(meeting, student),
    `Date: ${meeting.date || "TBD"}`,
    `Time: ${meeting.time || "TBD"} (default 1 hour — confirm in CaseCue)`,
    locationText(meeting),
    REMINDER_TEXT,
    `Authorized CaseCue meeting page: ${window.location.origin}/meetings`,
  ].join("\n");
}
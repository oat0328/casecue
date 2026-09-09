import { jsPDF } from "jspdf";
import { LESSON_HEADER_FIELDS, LESSON_GROUPS, SPECIAL_ACCOMMODATION_KEY } from "@/lib/lessonPlanSchema";

// Lesson plan exports: polished PDF (jsPDF), Word-compatible DOCX (HTML-based),
// and clean printing. One HTML builder feeds both DOCX and print.

const esc = (t) => String(t == null ? "" : t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\n/g, "<br>");

function studentNames(lesson, students) {
  return (lesson.student_ids || [])
    .map((id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : null; })
    .filter(Boolean);
}

function goalLabels(lesson, goals) {
  return (lesson.goal_ids || [])
    .map((id) => { const g = (goals || []).find((x) => x.id === id); return g ? `${g.goal_area || "Goal"}: ${(g.goal_text || "").slice(0, 120)}` : null; })
    .filter(Boolean);
}

const escapeAttr = (u) => String(u).replace(/"/g, "%22");

export function buildLessonHtml(lesson, students, goals) {
  const plan = lesson.plan || {};
  const sections = [];
  LESSON_GROUPS.forEach((group) => {
    const rows = group.fields.map((f) =>
      `<div class="field"><div class="flabel">${esc(f.label)}</div><div class="ftext">${esc(plan[f.key]) || "<em>—</em>"}</div></div>`
    ).join("");
    sections.push(`<h2>${esc(group.title)}</h2>${rows}`);
  });

  const acc = plan[SPECIAL_ACCOMMODATION_KEY] || "";
  const videos = (lesson.videos || []).map((v) =>
    `<li>${v.label ? esc(v.label) + " — " : ""}<a href="${escapeAttr(v.url)}">${esc(v.url)}</a>${v.usage_point ? ` <em>(${esc(v.usage_point)})</em>` : ""}</li>`
  ).join("");
  const resources = (lesson.resources || []).map((r) =>
    `<li>${r.label ? esc(r.label) + " — " : ""}<a href="${escapeAttr(r.url)}">${esc(r.url)}</a>${r.licensing ? ` <em>(${esc(r.licensing)})</em>` : ""}</li>`
  ).join("");
  const practice = (lesson.practice_materials || []).map((m) =>
    `<h3>${esc(m.title)} (${esc((m.material_type || "").replace(/_/g, " "))})</h3><div class="ftext">${esc(m.content)}</div>${m.answer_key ? `<div class="flabel">Answer key</div><div class="ftext">${esc(m.answer_key)}</div>` : ""}`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(lesson.title)}</title><style>
  body{font-family:Calibri,Arial,sans-serif;color:#1a1a2e;margin:40px;}
  .hdr{background:linear-gradient(135deg,#6d28d9,#2563eb);color:#fff;padding:24px;border-radius:10px;}
  .hdr h1{margin:0 0 6px;font-size:22px;}
  .hdr .meta{font-size:13px;opacity:.92;line-height:1.6;}
  h2{color:#6d28d9;border-bottom:2px solid #e5e0f5;padding-bottom:4px;font-size:16px;margin-top:26px;}
  h3{color:#4c1d95;font-size:14px;margin-bottom:4px;}
  .field{margin:10px 0;}
  .flabel{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;margin-bottom:2px;}
  .ftext{font-size:13px;line-height:1.55;white-space:pre-wrap;}
  ul{font-size:13px;line-height:1.6;}
  .banner{background:#fff7ed;border:1px solid #fdba74;color:#9a3412;padding:10px 14px;border-radius:8px;font-size:12px;margin-top:24px;}
  .approved{background:#f0fdf4;border-color:#86efac;color:#166534;}
  </style></head><body>
  <div class="hdr"><h1>${esc(plan.title || lesson.title)}</h1>
  <div class="meta">
    Teacher: ${esc(plan.teacher)} &nbsp;·&nbsp; Date: ${esc(plan.date)}<br>
    Subject / skill: ${esc(plan.subject_skill)} &nbsp;·&nbsp; ${esc(plan.grade_group)} &nbsp;·&nbsp; Duration: ${esc(plan.duration)}<br>
    Students / group: ${esc(studentNames(lesson, students).join(", ") || lesson.group_label || "")}
  </div></div>
  <h2>IEP Goals Addressed</h2><ul>${goalLabels(lesson, goals).map((g) => `<li>${esc(g)}</li>`).join("") || "<li>No specific goals attached.</li>"}</ul>
  ${sections.join("")}
  <h2>Accommodations</h2>
  <div class="ftext"><strong>Only use accommodations documented in the student's IEP.</strong> AI suggestions below are ideas to review against the IEP.</div>
  <div class="ftext" style="margin-top:8px">${esc(acc) || "<em>—</em>"}</div>
  ${videos ? `<h2>Approved Instructional Videos</h2><ul>${videos}</ul>` : ""}
  ${resources ? `<h2>Saved Resource Links</h2><ul>${resources}</ul>` : ""}
  ${practice ? `<h2>Original Practice Materials</h2>${practice}` : ""}
  <div class="banner ${lesson.status === "approved" ? "approved" : ""}">
    ${lesson.status === "approved"
      ? "Teacher-reviewed and approved in CaseCue. Generated with AI assistance — CaseCue never guarantees IEP compliance."
      : "Draft — Teacher Review Required. AI-generated content must be reviewed by the educator before use. CaseCue never guarantees IEP compliance."}
  </div>
  </body></html>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const safeName = (t) => String(t || "lesson-plan").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function exportLessonDocx(lesson, students, goals) {
  const html = buildLessonHtml(lesson, students, goals);
  downloadBlob(new Blob(["\ufeff", html], { type: "application/msword" }), `${safeName(lesson.title)}.doc`);
}

export function printLesson(lesson, students, goals) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildLessonHtml(lesson, students, goals));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

// --- PDF-safe text -----------------------------------------------------------
// The base-14 Helvetica font renders only WinAnsi characters; anything else
// (arrows, math symbols, typographic punctuation variants) shows up as gaps
// or inconsistent glyphs in the exported PDF. Normalize AI-generated text to
// clean ASCII before it reaches jsPDF.
const pdfSafe = (t) => String(t == null ? "" : t)
  .replace(/\r\n?/g, "\n")
  .replace(/[\u2018\u2019\u201A\u201B\u2039\u203A]/g, "'")
  .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
  .replace(/[\u2013\u2014\u2015]/g, "-")
  .replace(/\u2026/g, "...")
  .replace(/[\u2192\u21D2\u27A1]/g, "->")
  .replace(/\u2190/g, "<-")
  .replace(/\u2265/g, ">=")
  .replace(/\u2264/g, "<=")
  .replace(/\u2260/g, "!=")
  .replace(/[\u2022\u25CF\u25AA\u00B7]/g, "-")
  .replace(/\u200B/g, "")
  .replace(/[\u00A0\u2007\u2009\u202F]/g, " ")
  .replace(/\t/g, " ")
  .replace(/\*\*/g, "")
  .replace(/^#{1,6}[ \t]+/gm, "")
  .replace(/[ \t]{2,}/g, " ")
  .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "");

// Parses the markdown-style pipe table the plan stores in quantitative_table
// into headers + normalized rows, so the PDF can draw a real bordered table.
function parsePipeTable(text) {
  if (!text || String(text).indexOf("|") === -1) return null;
  const rows = [];
  String(text).split(/\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line.includes("|")) return;
    const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (cells.filter((c) => c !== "").length === 0) return;
    if (cells.every((c) => c === "" || /^:?-{2,}:?$/.test(c))) return;
    rows.push(cells);
  });
  if (rows.length < 2) return null;
  const headers = rows[0].map(pdfSafe);
  const dataRows = rows.slice(1)
    .map((r) => Array.from({ length: headers.length }, (_, i) => pdfSafe(r[i] != null ? r[i] : "")));
  return { headers, rows: dataRows };
}

// Column widths sized for the standard data-collection headers (Date, Trial,
// Correct, Total, Percentage, Prompt Level, Notes), scaled to fit the page.
function tableColumnWidths(headers, total) {
  const widthFor = (h) => {
    if (/date/.test(h)) return 62;
    if (/trial|attempt|opportunit/.test(h)) return 50;
    if (/correct|right|accura/.test(h)) return 46;
    if (/total|possible|items/.test(h)) return 46;
    if (/%|percent|score|rate/.test(h)) return 58;
    if (/prompt|support|assist/.test(h)) return 84;
    return 70;
  };
  const widths = headers.map((h) => widthFor(h.toLowerCase()));
  const scale = total / widths.reduce((a, b) => a + b, 0);
  const scaled = widths.map((w) => Math.round(w * scale));
  scaled[scaled.length - 1] = total - scaled.slice(0, -1).reduce((a, b) => a + b, 0);
  return scaled;
}

export function exportLessonPdf(lesson, students, goals) {
  const plan = lesson.plan || {};
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const CW = W - 2 * M;
  let y = M;
  doc.setCharSpace(0);

  const wrap = (text, size, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(pdfSafe(text), CW);
    return lines;
  };

  const ensure = (needed) => {
    if (y + needed > H - 56) {
      doc.addPage();
      y = M;
    }
  };

  // Draws the quantitative data-collection table as a real bordered table
  // (purple header band, wrapped cell text, page-break aware).
  const drawDataTable = (table) => {
    const size = 8.5;
    const lineH = size * 1.35;
    const pad = 4;
    const widths = tableColumnWidths(table.headers, CW);
    const xFor = (i) => M + widths.slice(0, i).reduce((a, b) => a + b, 0);

    const drawHead = () => {
      const cellLines = table.headers.map((h, i) => doc.splitTextToSize(h || "", widths[i] - 2 * pad));
      const headH = Math.max(...cellLines.map((l) => l.length), 1) * lineH + 2 * pad;
      ensure(headH + 24);
      doc.setFillColor(109, 40, 217);
      doc.rect(M, y, CW, headH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold"); doc.setFontSize(size);
      cellLines.forEach((l, i) => doc.text(l, xFor(i) + pad, y + pad + size - 2));
      y += headH;
      doc.setTextColor(26, 26, 46);
    };

    drawHead();
    table.rows.forEach((cells) => {
      const cellLines = cells.map((c, i) => doc.splitTextToSize(String(c || ""), widths[i] - 2 * pad));
      const rowH = Math.max(...cellLines.map((l) => l.length), 1) * lineH + 2 * pad;
      if (y + rowH > H - 56) { doc.addPage(); y = M; drawHead(); }
      doc.setDrawColor(203, 196, 229);
      doc.setLineWidth(0.75);
      cells.forEach((_, i) => doc.rect(xFor(i), y, widths[i], rowH));
      doc.setFont("helvetica", "normal"); doc.setFontSize(size);
      cellLines.forEach((l, i) => doc.text(l, xFor(i) + pad, y + pad + size - 2));
      y += rowH;
    });
    y += 10;
  };

  const writeBlock = (text, size, bold, gap) => {
    const lines = wrap(text, size, bold);
    lines.forEach((ln) => {
      ensure(size + 4);
      doc.text(ln, M, y);
      y += size * 1.35;
    });
    y += gap;
  };

  const writeHeading = (text) => {
    ensure(46);
    doc.setDrawColor(109, 40, 217);
    doc.setLineWidth(1.4);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(76, 29, 149);
    doc.text(pdfSafe(text), M, y);
    y += 4;
    doc.line(M, y, W - M, y);
    y += 12;
    doc.setTextColor(26, 26, 46);
  };

  // Header band
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text(pdfSafe(String(plan.title || lesson.title).slice(0, 70)), M, 34, { maxWidth: CW });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(pdfSafe(`Teacher: ${plan.teacher || "-"}   Date: ${plan.date || "-"}`), M, 54);
  doc.text(pdfSafe(`Subject / skill: ${String(plan.subject_skill || "-").slice(0, 60)}   Duration: ${plan.duration || "-"}`), M, 68);
  doc.text(pdfSafe(String(plan.grade_group || lesson.group_label || "").slice(0, 80)), M, 82);
  y = 120;
  doc.setTextColor(26, 26, 46);

  const names = studentNames(lesson, students);
  if (names.length) {
    writeHeading("Students / Group");
    writeBlock(names.join(", ") || lesson.group_label, 10, false, 6);
  }

  const gLabels = goalLabels(lesson, goals);
  writeHeading("IEP Goals Addressed");
  gLabels.forEach((g) => writeBlock(`• ${g}`, 10, false, 2));
  if (!gLabels.length) writeBlock("No specific goals attached.", 10, false, 8);
  y += 6;

  LESSON_GROUPS.forEach((group) => {
    writeHeading(group.title);
    group.fields.forEach((f) => {
      const val = plan[f.key];
      if (val) {
        ensure(30);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(pdfSafe(f.label).toUpperCase(), M, y);
        y += 12;
        doc.setTextColor(26, 26, 46);
        const table = f.key === "quantitative_table" ? parsePipeTable(val) : null;
        if (table) drawDataTable(table);
        else writeBlock(val, 10, false, 8);
      }
    });
  });

  writeHeading("Accommodations");
  writeBlock("Only use accommodations documented in the student's IEP. AI suggestions are ideas to review against the IEP.", 9, true, 4);
  writeBlock(plan[SPECIAL_ACCOMMODATION_KEY] || "—", 10, false, 8);

  if ((lesson.videos || []).length) {
    writeHeading("Approved Instructional Videos");
    lesson.videos.forEach((v) => writeBlock(`• ${v.label ? `${v.label} — ` : ""}${v.url}${v.usage_point ? ` (${v.usage_point})` : ""}`, 10, false, 2));
    y += 6;
  }
  if ((lesson.resources || []).length) {
    writeHeading("Saved Resource Links");
    lesson.resources.forEach((r) => writeBlock(`• ${r.label ? `${r.label} — ` : ""}${r.url}${r.licensing ? ` (${r.licensing})` : ""}`, 10, false, 2));
    y += 6;
  }
  if ((lesson.practice_materials || []).length) {
    writeHeading("Original Practice Materials");
    lesson.practice_materials.forEach((m) => {
      writeBlock(`${m.title} (${(m.material_type || "").replace(/_/g, " ")})`, 10, true, 2);
      writeBlock(m.content, 9, false, 4);
      if (m.answer_key) { writeBlock("Answer key", 9, true, 1); writeBlock(m.answer_key, 9, false, 8); }
    });
  }

  // Footers on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 140);
    const banner = lesson.status === "approved"
      ? "Teacher-reviewed and approved in CaseCue · CaseCue never guarantees IEP compliance"
      : "Draft — Teacher Review Required · CaseCue never guarantees IEP compliance";
    doc.text(banner, M, H - 28);
    doc.text(`CaseCue Lesson Plan · Page ${p} of ${pages}`, W - M, H - 28, { align: "right" });
  }

  doc.save(`${safeName(lesson.title)}.pdf`);
}
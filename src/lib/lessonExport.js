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

export function exportLessonPdf(lesson, students, goals) {
  const plan = lesson.plan || {};
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const CW = W - 2 * M;
  let y = M;

  const wrap = (text, size, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text == null ? "" : text), CW);
    return lines;
  };

  const ensure = (needed) => {
    if (y + needed > H - 56) {
      doc.addPage();
      y = M;
    }
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
    doc.text(String(text), M, y);
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
  doc.text(String(plan.title || lesson.title).slice(0, 70), M, 34, { maxWidth: CW });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Teacher: ${plan.teacher || "—"}   Date: ${plan.date || "—"}`, M, 54);
  doc.text(`Subject / skill: ${String(plan.subject_skill || "—").slice(0, 60)}   Duration: ${plan.duration || "—"}`, M, 68);
  doc.text(String(plan.grade_group || lesson.group_label || "").slice(0, 80), M, 82);
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
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        ensure(30);
        doc.setTextColor(107, 114, 128);
        doc.text(f.label.toUpperCase(), M, y);
        y += 12;
        doc.setTextColor(26, 26, 46);
        writeBlock(val, 10, false, 8);
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
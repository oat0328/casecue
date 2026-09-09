import { base44 } from "@/api/base44Client";

// Fire-and-forget audit trail for export actions (print, pdf, docx, excel,
// csv, json, image, email, share). Logging must never block or break an
// export, so failures are swallowed on purpose.
export default function logExportAction(format, documentTitle) {
  try {
    const title = String(documentTitle || "CaseCue document").slice(0, 200);
    base44.entities.AuditLog.create({
      action: `export_${String(format).toLowerCase()}`,
      entity_type: "document_export",
      entity_id: title,
      details: `${String(format).toUpperCase()} export of "${title}"`,
    }).catch(() => {});
  } catch { /* audit logging must never block an export */ }
}
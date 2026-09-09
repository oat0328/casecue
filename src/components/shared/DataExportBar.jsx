import React from "react";
import { Save, Printer, FileDown, FileText, FileSpreadsheet, Table, Braces, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportGate from "@/components/shared/ExportGate";
import { printDoc, exportDocPdf, exportDocDocx, emailDoc, shareDoc } from "@/lib/docExport";
import { exportXlsx } from "@/lib/xlsxExport";
import { downloadCsv, downloadJson } from "@/lib/reportExport";
import logExportAction from "@/lib/exportAudit";

// The full 8-action export bar for data-derived reports: Save, Print, PDF,
// DOCX, Excel, CSV, (optional JSON), Email, Share. Same pattern as the
// Session Tracker exports. `gated` routes downloads through the AI-content
// acknowledgement gate — leave false for data-derived reports (per the
// Session Tracker precedent); use true whenever AI-generated content is inside.
export default function DataExportBar({
  title,
  subtitle,
  sections,
  filename,
  banner,
  sheets = [],
  json,
  onSave,
  gated = false,
  exclude = [],
  className = "",
}) {
  const { toast } = useToast();
  const has = (k) => !exclude.includes(k);
  const opts = { title, subtitle, sections, banner, filename };

  const bar = (label, Icon, onClick, disabled) => (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Icon className="h-3.5 w-3.5 mr-1" /> {label}
    </Button>
  );

  const gate = (onExport, children) =>
    gated ? (
      <ExportGate documentName={title} onExport={onExport}>
        {children}
      </ExportGate>
    ) : (
      children
    );

  const doExcel = () => {
    logExportAction("excel", title);
    exportXlsx(filename, sheets);
    toast({ title: "Excel workbook downloaded" });
  };
  const doCsv = () => {
    const primary = sheets[0];
    logExportAction("csv", title);
    downloadCsv(filename, primary.headers, primary.rows);
    toast({ title: "CSV downloaded" });
  };
  const doJson = () => {
    logExportAction("json", title);
    downloadJson(filename, json);
    toast({ title: "JSON downloaded" });
  };

  const primary = sheets[0];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onSave && has("save") && bar("Save", Save, onSave)}

      {has("print") &&
        bar("Print", Printer, () => {
          if (!printDoc(opts)) toast({ title: "Allow pop-ups to print", variant: "destructive" });
        })}

      {has("pdf") && gate(() => exportDocPdf(opts), bar("PDF", FileDown, () => {}))}

      {has("docx") && gate(() => exportDocDocx(opts), bar("DOCX", FileText, () => {}))}

      {has("excel") && !!primary && gate(doExcel, bar("Excel", FileSpreadsheet, () => {}))}

      {has("csv") && !!primary && gate(doCsv, bar("CSV", Table, () => {}))}

      {has("json") && json && gate(doJson, bar("JSON", Braces, () => {}))}

      {has("email") &&
        bar("Email", Mail, () => {
          emailDoc(opts);
          toast({ title: "Opening your email app" });
        })}

      {has("share") &&
        bar("Share", Share2, async () => {
          const result = await shareDoc(opts);
          if (result === "shared") toast({ title: "Shared" });
          else if (result === "copied") toast({ title: "Copied to clipboard" });
          else if (result === "failed") toast({ title: "Could not share", variant: "destructive" });
        })}
    </div>
  );
}
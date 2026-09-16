import React from "react";
import { Save, Printer, FileDown, FileText, FileSpreadsheet, Table, Braces, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportGate from "@/components/shared/ExportGate";
import { printDoc, exportDocPdf, exportDocDocx, emailDoc, shareDoc } from "@/lib/docExport";
import { exportXlsx } from "@/lib/xlsxExport";
import { downloadCsv, downloadJson } from "@/lib/reportExport";
import { formatDatesDeep } from "@/lib/dateUtils";
import logExportAction from "@/lib/exportAudit";

// User-facing exports always use CaseCue's MM/DD/YYYY display standard.
// Entity/database dates remain ISO for filtering and sorting.
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
  const displaySections = formatDatesDeep(sections || []);
  const displaySheets = formatDatesDeep(sheets || []);
  const displayJson = formatDatesDeep(json);
  const opts = { title, subtitle: formatDatesDeep(subtitle), sections: displaySections, banner: formatDatesDeep(banner), filename };

  const bar = (label, Icon, onClick, disabled) => (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Icon className="h-3.5 w-3.5 mr-1" /> {label}
    </Button>
  );

  const gate = (onExport, children) => gated ? <ExportGate documentName={title} onExport={onExport}>{children}</ExportGate> : children;

  const doExcel = () => {
    logExportAction("excel", title);
    exportXlsx(filename, displaySheets);
    toast({ title: "Excel workbook downloaded" });
  };
  const doCsv = () => {
    const primary = displaySheets[0];
    logExportAction("csv", title);
    downloadCsv(filename, primary.headers, primary.rows);
    toast({ title: "CSV downloaded" });
  };
  const doJson = () => {
    logExportAction("json", title);
    downloadJson(filename, displayJson);
    toast({ title: "JSON downloaded" });
  };

  const primary = displaySheets[0];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onSave && has("save") && bar("Save", Save, onSave)}
      {has("print") && bar("Print", Printer, () => { if (!printDoc(opts)) toast({ title: "Allow pop-ups to print", variant: "destructive" }); })}
      {has("pdf") && gate(() => exportDocPdf(opts), bar("PDF", FileDown, () => {}))}
      {has("docx") && gate(() => exportDocDocx(opts), bar("DOCX", FileText, () => {}))}
      {has("excel") && !!primary && gate(doExcel, bar("Excel", FileSpreadsheet, () => {}))}
      {has("csv") && !!primary && gate(doCsv, bar("CSV", Table, () => {}))}
      {has("json") && displayJson && gate(doJson, bar("JSON", Braces, () => {}))}
      {has("email") && bar("Email", Mail, () => { emailDoc(opts); toast({ title: "Opening your email app" }); })}
      {has("share") && bar("Share", Share2, async () => { const result = await shareDoc(opts); if (result === "shared") toast({ title: "Shared" }); else if (result === "copied") toast({ title: "Copied to clipboard" }); else if (result === "failed") toast({ title: "Could not share", variant: "destructive" }); })}
    </div>
  );
}
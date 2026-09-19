import React from "react";
import { Save, Printer, FileDown, FileText, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ExportGate from "@/components/shared/ExportGate";
import { printDoc, exportDocPdf, exportDocDocx, emailDoc, shareDoc } from "@/lib/docExport";

// Global export bar shown on every generated document: Save (optional),
// Print, PDF, DOCX, Email, Share. `gated` routes the PDF and DOCX downloads
// through the required AI-content acknowledgement gate. `exclude` hides
// buttons a surface already provides (e.g. an existing gated PDF).
export default function ExportBar({
  title,
  subtitle,
  sections,
  filename,
  banner,
  onSave,
  gated = false,
  exclude = [],
  className = "",
}) {
  const { toast } = useToast();
  const has = (k) => !exclude.includes(k);
  const opts = { title, subtitle, sections, banner, filename };

  const bar = (label, Icon, onClick) => (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Icon className="h-3.5 w-3.5 mr-1" /> {label}
    </Button>
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onSave && has("save") && bar("Save", Save, onSave)}

      {has("pdf") &&
        (gated ? (
          <ExportGate documentName={title} onExport={() => exportDocPdf(opts)}>
            {bar("Download PDF", FileDown, () => {})}
          </ExportGate>
        ) : (
          bar("Download PDF", FileDown, () => exportDocPdf(opts))
        ))}

      {has("print") &&
        bar("Print", Printer, () => {
          if (!printDoc(opts)) toast({ title: "Allow pop-ups to print", variant: "destructive" });
        })}

      {has("docx") &&
        (gated ? (
          <ExportGate documentName={title} onExport={() => exportDocDocx(opts)}>
            {bar("DOCX", FileText, () => {})}
          </ExportGate>
        ) : (
          bar("DOCX", FileText, () => exportDocDocx(opts))
        ))}

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
import React, { useRef, useState } from "react";
import { Printer, FileDown, FileSpreadsheet, Table, Image as ImageIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { captureElement } from "@/lib/chartExport";
import { printDoc, exportDocPdf } from "@/lib/docExport";
import { exportXlsx } from "@/lib/xlsxExport";
import { downloadCsv } from "@/lib/reportExport";
import logExportAction from "@/lib/exportAudit";

// Chart wrapper with per-chart export: Print, PDF, Excel, CSV, and PNG image.
// `data` is the chart's source rows (array of objects) used for Excel/CSV;
// `filename` prefixes all downloads. Recharts children render inside the
// captured area.
export default function ChartCard({ title, subtitle, data = [], filename, height = 176, children, className }) {
  const { toast } = useToast();
  const wrapRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const headers = data.length ? Object.keys(data[0]) : [];
  const rows = data.map((r) => headers.map((h) => (typeof r[h] === "number" ? r[h] : String(r[h] ?? ""))));
  const file = filename || "CaseCue-Chart";

  const withImage = async (fn) => {
    setBusy(true);
    try {
      const img = await captureElement(wrapRef.current);
      if (!img) {
        toast({ title: "Could not capture the chart", variant: "destructive" });
        return;
      }
      fn(img);
    } finally {
      setBusy(false);
    }
  };

  const opts = (img) => ({
    title,
    subtitle,
    filename: file,
    sections: [{ heading: title, body: subtitle, image: img.dataUrl, imageWidth: img.w, imageHeight: img.h }],
  });

  const btn = (label, Icon, onClick, disabled) => (
    <Button key={label} variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClick} disabled={disabled || busy}>
      {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Button>
  );

  return (
    <Card className={`p-5 ${className || ""}`}>
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div>
          <div className="font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex flex-wrap gap-1">
          {btn("Print", Printer, () =>
            withImage((img) => {
              if (!printDoc(opts(img))) toast({ title: "Allow pop-ups to print", variant: "destructive" });
            })
          )}
          {btn("PDF", FileDown, () => withImage((img) => exportDocPdf(opts(img))))}
          {btn("Excel", FileSpreadsheet, () => {
            logExportAction("excel", title);
            exportXlsx(file, [{ name: "Chart Data", headers, rows }]);
            toast({ title: "Excel downloaded" });
          }, !data.length)}
          {btn("CSV", Table, () => {
            logExportAction("csv", title);
            downloadCsv(file, headers, rows);
            toast({ title: "CSV downloaded" });
          }, !data.length)}
          {btn("Image", ImageIcon, () =>
            withImage((img) => {
              logExportAction("image", title);
              const a = document.createElement("a");
              a.href = img.dataUrl;
              a.download = `${file.replace(/[^a-z0-9-]+/gi, "-")}.png`;
              a.click();
            })
          )}
        </div>
      </div>
      <div ref={wrapRef} style={{ height }} className="w-full bg-white rounded-lg">
        {children}
      </div>
    </Card>
  );
}
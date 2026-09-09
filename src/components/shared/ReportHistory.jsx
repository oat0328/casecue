import React, { useState } from "react";
import { ChevronDown, ChevronUp, Printer, FileDown, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { printDoc, exportDocPdf } from "@/lib/docExport";

// Saved report history: view, print, download (PDF), delete, regenerate.
// Reports are stored in the SavedReport entity; each entry's content holds
// { title, subtitle, sections, banner, params }.
export default function ReportHistory({ reports, onDelete, onRegenerate }) {
  const { toast } = useToast();
  const [openId, setOpenId] = useState(null);

  if (!reports || reports.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No saved reports yet — generate a report and click Save.</p>;
  }

  const opts = (r) => ({
    title: r.content?.title || "Report",
    subtitle: r.content?.subtitle || "",
    sections: r.content?.sections || [],
    banner: r.content?.banner,
    filename: `CaseCue-${(r.content?.title || "report").replace(/[^a-z0-9]+/gi, "-")}`,
  });

  const remove = async (r) => {
    try {
      await base44.entities.SavedReport.delete(r.id);
      toast({ title: "Report deleted" });
      onDelete && onDelete();
    } catch (e) {
      toast({ title: "Could not delete", description: e.message, variant: "destructive" });
    }
  };

  const actionBtn = (label, Icon, onClick, tone) => (
    <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs ${tone || ""}`} onClick={onClick}>
      <Icon className="h-3 w-3 mr-1" /> {label}
    </Button>
  );

  return (
    <div className="divide-y divide-border">
      {reports.map((r) => {
        const open = openId === r.id;
        return (
          <div key={r.id} className="py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.content?.title || "Report"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.student_name || "Caseload"} · {r.report_type?.replace(/_/g, " ")} ·{" "}
                  {r.created_date ? new Date(r.created_date).toLocaleString() : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-0.5">
                {actionBtn(open ? "Hide" : "View", open ? ChevronUp : ChevronDown, () => setOpenId(open ? null : r.id))}
                {actionBtn("Print", Printer, () => {
                  if (!printDoc(opts(r))) toast({ title: "Allow pop-ups to print", variant: "destructive" });
                })}
                {actionBtn("PDF", FileDown, () => exportDocPdf(opts(r)))}
                {onRegenerate && actionBtn("Regenerate", RefreshCw, () => onRegenerate(r))}
                {actionBtn("Delete", Trash2, () => remove(r), "text-rose-500 hover:text-rose-600")}
              </div>
            </div>
            {open && (
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto rounded-lg bg-muted/40 p-3">
                {(r.content?.sections || []).map((s, i) => (
                  <div key={i}>
                    <div className="text-xs font-semibold text-primary">{s.heading}</div>
                    <div className="text-xs whitespace-pre-wrap mt-0.5">{s.body}</div>
                  </div>
                ))}
                {(!r.content?.sections || r.content.sections.length === 0) && (
                  <p className="text-xs text-muted-foreground">This saved report has no stored content.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
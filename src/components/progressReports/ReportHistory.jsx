import React from "react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2, FileText } from "lucide-react";
import { exportProgressReportPdf } from "@/lib/pdfExport";

export default function ReportHistory({ reports, onLoad, onDelete }) {
  const list = reports || [];
  if (list.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
        Generated reports are saved here so you can revisit or re-download them anytime.
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {list.map((r) => {
        const content = r.content || {};
        const genDate = r.created_date ? new Date(r.created_date).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}) : "";
        return (
          <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.student_name || "Student"}</div>
              <div className="text-xs text-muted-foreground">
                Progress report · {genDate} · {(content.goal_reports || []).length} goal{(content.goal_reports || []).length === 1 ? "" : "s"} covered
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onLoad(r)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              <Button size="sm" variant="outline" onClick={() => exportProgressReportPdf(content.student, content)}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
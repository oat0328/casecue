import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportBulkCsv, exportBulkRecordsPdf } from "@/lib/pdfExport";

// Bulk records export: pick students, then download everything as one CSV or one combined PDF binder.
export default function BulkExportCard({ students, savedReports }) {
  const { toast } = useToast();
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 500), []);
  // null = all selected (default); otherwise an explicit Set of ids.
  const [selected, setSelected] = React.useState(null);

  const list = students || [];
  const isSelected = (id) => selected === null || selected.has(id);
  const selectedStudents = selected === null ? list : list.filter((s) => selected.has(s.id));

  const toggle = (id) => {
    const next = new Set(selected === null ? list.map((s) => s.id) : selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const run = (kind) => {
    if (!selectedStudents.length) {
      toast({ title: "Select at least one student", variant: "destructive" });
      return;
    }
    try {
      if (kind === "csv") exportBulkCsv(selectedStudents, goals, savedReports);
      else exportBulkRecordsPdf(selectedStudents, goals, savedReports);
      toast({ title: `Export ready (${kind.toUpperCase()})`, description: `${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"} included.` });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold">Bulk records export</h3>
          <p className="text-xs text-muted-foreground">Download IEP data, goals, and each student's latest saved progress report.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Select all</Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add students first to export records.</p>
      ) : (
        <>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {list.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 accent-[hsl(255_82%_58%)]"
                />
                <span className="truncate">{s.first_name} {s.last_name}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <Button onClick={() => run("csv")} disabled={!selectedStudents.length}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button onClick={() => run("pdf")} disabled={!selectedStudents.length} className="brand-gradient text-white">
              <FileText className="h-4 w-4 mr-1" /> Export PDF binder
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              {selectedStudents.length} of {list.length} selected
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
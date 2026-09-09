import React, { useState } from "react";
import { Upload, Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { parseStudentCsv, downloadStudentTemplate, STUDENT_IMPORT_FIELDS } from "@/lib/csv";

const AVATAR_COLORS = ["violet", "blue", "emerald", "amber", "rose", "cyan"];

// Bulk CSV import for student caseloads: pick a file → preview valid rows/errors → import.
export default function ImportStudentsDialog({ onImported }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState(null); // { rows, errors }
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const reset = () => { setParsed(null); setFileName(""); };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setParsed(parseStudentCsv(String(reader.result || "")));
    reader.onerror = () => toast({ title: "Could not read file", variant: "destructive" });
    reader.readAsText(file);
    e.target.value = "";
  };

  const doImport = async () => {
    if (!parsed?.rows.length) return;
    setImporting(true);
    try {
      const withColors = parsed.rows.map((r, i) => ({ ...r, avatar_color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
      for (let i = 0; i < withColors.length; i += 100) {
        await base44.entities.Student.bulkCreate(withColors.slice(i, i + 100));
      }
      const failed = parsed.errors.length;
      toast({
        title: `Imported ${withColors.length} student${withColors.length === 1 ? "" : "s"}`,
        description: failed ? `${failed} row${failed === 1 ? "" : "s"} skipped — see preview for details.` : undefined,
      });
      setOpen(false);
      reset();
      onImported?.();
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-1" /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import students from CSV</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Required columns: <b>First Name, Last Name</b>. Optional: {STUDENT_IMPORT_FIELDS.slice(2).map((f) => f.label).join(", ")}. Dates accept YYYY-MM-DD or M/D/YYYY.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Caseload in Google Sheets? Open your sheet and choose <b>File → Download → Comma-separated values (.csv)</b>, then upload that file here.
        </p>
        <Button variant="link" className="justify-start px-0" onClick={downloadStudentTemplate}>
          <Download className="h-3.5 w-3.5 mr-1" /> Download a template CSV
        </Button>

        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/40 transition-colors">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">{fileName || "Choose a CSV file…"}</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>

        {parsed && (
          <div className="mt-2 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              {parsed.rows.length > 0 && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {parsed.rows.length} ready to import</span>}
              {parsed.errors.length > 0 && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" /> {parsed.errors.length} skipped</span>}
              {parsed.rows.length === 0 && parsed.errors.length === 0 && <span className="text-muted-foreground">No data rows found.</span>}
            </div>

            {parsed.rows.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2">First</th>
                      <th className="text-left px-3 py-2">Last</th>
                      <th className="text-left px-3 py-2">Grade</th>
                      <th className="text-left px-3 py-2">Eligibility</th>
                      <th className="text-left px-3 py-2">Review due</th>
                      <th className="text-left px-3 py-2">Reeval due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-1.5">{r.first_name}</td>
                        <td className="px-3 py-1.5">{r.last_name}</td>
                        <td className="px-3 py-1.5">{r.grade || "—"}</td>
                        <td className="px-3 py-1.5">{r.eligibility_category || "—"}</td>
                        <td className="px-3 py-1.5">{r.annual_review_due || "—"}</td>
                        <td className="px-3 py-1.5">{r.reevaluation_due || "—"}</td>
                      </tr>
                    ))}
                    {parsed.rows.length > 8 && (
                      <tr className="border-t border-border text-muted-foreground"><td colSpan={6} className="px-3 py-1.5">+ {parsed.rows.length - 8} more…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {parsed.errors.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                {parsed.errors.slice(0, 5).map((e, i) => (
                  <div key={i}>Row {e.row}: {e.message}</div>
                ))}
                {parsed.errors.length > 5 && <div>+ {parsed.errors.length - 5} more issues</div>}
              </div>
            )}

            <Button onClick={doImport} disabled={importing || parsed.rows.length === 0} className="brand-gradient text-white w-full">
              {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {importing ? "Importing…" : `Import ${parsed.rows.length} student${parsed.rows.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { Upload, Link2, Loader2, ShieldCheck, FileText, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-sm font-medium mb-2";

// Step 1 — Upload & Analyze: pick who the lesson is for, provide the assignment
// (file, pasted text, or a webpage/YouTube link), confirm authorization, and
// run the citable assignment analysis.
export default function AssignmentSource({ students, onComplete, analyzing, onAnalyzing }) {
  const { toast } = useToast();
  const [targetMode, setTargetMode] = useState("students");
  const [studentIds, setStudentIds] = useState([]);
  const [groupLabel, setGroupLabel] = useState("");
  const [grade, setGrade] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const toggleStudent = (id) =>
    setStudentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(res.file_url);
      setFileName(file.name);
      toast({ title: "Assignment uploaded", description: file.name });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const analyze = async () => {
    if (!fileUrl && !pastedText.trim() && !pageUrl.trim()) {
      toast({ title: "Add the assignment first", description: "Upload a file, paste the text, or provide a link.", variant: "destructive" });
      return;
    }
    if (!confirmed) {
      toast({ title: "Confirmation required", description: "Confirm you are authorized to upload and use this material.", variant: "destructive" });
      return;
    }
    onAnalyzing(true);
    try {
      const res = await base44.functions.invoke("analyzeAssignment", {
        file_url: fileUrl || undefined,
        pasted_text: pastedText.trim() || undefined,
        page_url: pageUrl.trim() || undefined,
        grade_hint: grade,
      });
      onComplete({
        analysis: res.data.analysis,
        target: {
          mode: targetMode,
          student_ids: studentIds,
          group_label: groupLabel,
          grade,
        },
      });
    } catch (e) {
      toast({ title: "Analysis failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      onAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /> Who is this lesson for?</h3>
        <p className="text-xs text-muted-foreground mb-4">Select students to pull their verified IEP goals and documented accommodations into the lesson.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {["students", "group"].map((m) => (
            <button key={m} type="button" onClick={() => setTargetMode(m)}
              className={cn("rounded-full px-4 py-2 text-sm border", targetMode === m ? "bg-primary text-white border-primary" : "border-border")}>
              {m === "students" ? "Student(s)" : "Class / group / grade"}
            </button>
          ))}
        </div>

        {targetMode === "students" ? (
          <div>
            <span className={labelCls}>Students</span>
            <div className="flex flex-wrap gap-2">
              {(students || []).map((s) => (
                <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                  className={cn("text-sm rounded-full border px-4 py-2 min-h-[40px]", studentIds.includes(s.id) ? "bg-primary text-white border-primary" : "border-border")}>
                  {s.first_name} {s.last_name}
                </button>
              ))}
              {(students || []).length === 0 && <p className="text-sm text-muted-foreground">No students on your caseload yet.</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls} htmlFor="ls-group-label">Class / group label</label>
              <input id="ls-group-label" className={inputCls} value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} placeholder="e.g. 3rd-grade resource math" />
            </div>
            <div>
              <label className={labelCls} htmlFor="ls-grade">Grade level</label>
              <input id="ls-grade" className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 3rd grade" />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-primary" /> The assignment</h3>
        <p className="text-xs text-muted-foreground mb-4">Upload a PDF, DOCX, image, or scanned worksheet — paste the text — or provide a webpage or YouTube link. OCR runs automatically on scans.</p>

        <div className="space-y-5">
          <div>
            <label className={labelCls} htmlFor="ls-file">Upload assignment file</label>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 h-11 cursor-pointer hover:bg-accent" htmlFor="ls-file">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Choose file"}
                <input id="ls-file" type="file" className="hidden" onChange={onUpload} disabled={uploading}
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt,.csv" />
              </label>
              {fileName && <span className="text-sm text-emerald-600">Uploaded: {fileName} ✓</span>}
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="ls-paste">Or paste the assignment text</label>
            <textarea id="ls-paste" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base min-h-[100px]"
              value={pastedText} onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste the assignment questions, passage, or directions here…" />
          </div>

          <div>
            <label className={labelCls} htmlFor="ls-url">Or a webpage / YouTube URL (optional)</label>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <input id="ls-url" className={inputCls} value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://…" inputMode="url" />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(255_82%_58%)]" />
            <span className="text-sm">
              <strong className="block">“I confirm that I am authorized to upload and use this material.”</strong>
              <span className="text-muted-foreground text-xs">CaseCue never scrapes or redistributes third-party worksheets and never uses uploaded student records to train public models.</span>
            </span>
          </label>
        </div>

        <Button onClick={analyze} disabled={analyzing || uploading} className="brand-gradient text-white h-11 px-6 mt-6">
          {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing assignment…</> : <><ShieldCheck className="h-4 w-4 mr-2" /> Analyze assignment</>}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">Analysis includes skills, questions, standards, difficulty, accessibility barriers, and page-by-page citations you can correct before the lesson is built.</p>
      </Card>
    </div>
  );
}
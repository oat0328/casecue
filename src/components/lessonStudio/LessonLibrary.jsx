import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Printer, FileDown, FileText, Copy, Star, BadgeCheck, Pencil, Trash2, PlayCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StudentSelector from "@/components/forms/StudentSelector";
import { exportLessonPdf, exportLessonDocx, printLesson, buildLessonHtml } from "@/lib/lessonExport";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-sm font-medium mb-2";

// Lesson Library — every saved lesson with history filters and lifecycle
// actions: view, print, export, approve, duplicate, template, edit, delete, and
// launching a prefilled Session Tracker entry.
export default function LessonLibrary({ students, goals, onEdit, refreshKey }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [viewing, setViewing] = useState(null);
  const { data: lessons, refetch } = useAsync(() => base44.entities.Lesson.list('-updated_date', 200), [refreshKey]);

  const filtered = (lessons || []).filter((l) => {
    if (studentId && !(l.student_ids || []).includes(studentId)) return false;
    if (subject && !(l.subject || "").toLowerCase().includes(subject.toLowerCase())) return false;
    if (status && l.status !== status) return false;
    return true;
  });

  const audit = (l, action) => [
    ...(l.audit_trail || []),
    { action, user_name: user?.full_name || user?.email || "", timestamp: new Date().toISOString() },
  ];

  const update = async (l, patch, message) => {
    try {
      await base44.entities.Lesson.update(l.id, patch);
      refetch();
      if (message) toast({ title: message });
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const duplicate = async (l) => {
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = l;
      await base44.entities.Lesson.create({
        ...rest,
        title: `${l.title} (copy)`,
        status: "draft",
        is_template: false,
        audit_trail: audit(l, "duplicated"),
      });
      refetch();
      toast({ title: "Lesson duplicated", description: "The copy is saved as a draft you can edit and reuse." });
    } catch (e) {
      toast({ title: "Duplicate failed", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (l) => {
    try {
      await base44.entities.Lesson.delete(l.id);
      refetch();
      toast({ title: "Lesson deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const startSession = (l) => {
    const p = new URLSearchParams();
    const sid = (l.student_ids || [])[0];
    const gid = (l.goal_ids || [])[0];
    if (sid) p.set("student_id", sid);
    if (gid) p.set("goal_id", gid);
    if (l.plan?.subject_skill) p.set("activity", l.plan.subject_skill);
    if (l.plan?.mastery_criterion) p.set("note", `Mastery criterion: ${l.plan.mastery_criterion}`);
    navigate(`/session-tracker?${p.toString()}`);
  };

  const exportWithAudit = (kind, l) => {
    try {
      if (kind === "pdf") exportLessonPdf(l, students, goals);
      else exportLessonDocx(l, students, goals);
      update(l, { audit_trail: audit(l, `exported_${kind}`) });
      toast({ title: `Lesson plan downloaded (${kind.toUpperCase()})` });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <StudentSelector students={students || []} value={studentId} onChange={setStudentId} noBottomSpace />
          </div>
          <div>
            <label className={labelCls} htmlFor="lib-subject">Subject</label>
            <input id="lib-subject" className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. ELA, math" />
          </div>
          <div>
            <label className={labelCls} htmlFor="lib-status">Status</label>
            <select id="lib-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No lessons found yet — build one from an assignment, or clear the filters.
        </Card>
      )}

      {filtered.map((l) => (
        <Card key={l.id} className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold truncate">{l.title}</p>
                {l.is_template && <span className="text-xs rounded-full bg-secondary px-2.5 py-0.5">Template</span>}
                <span className={`text-xs rounded-full px-2.5 py-0.5 ${l.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                  {l.status === "approved" ? "Approved" : "Draft"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {l.subject || "—"} · {l.grade || "—"} · {l.date || "—"} ·
                {" "}{(l.student_ids || []).map((id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : null; }).filter(Boolean).join(", ") || l.group_label || "no students attached"}
                {" "}· {(l.goal_ids || []).length} goal{(l.goal_ids || []).length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setViewing(l)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              <Button size="sm" variant="outline" onClick={() => startSession(l)}><PlayCircle className="h-3.5 w-3.5 mr-1" /> Start session</Button>
              <Button size="sm" variant="outline" onClick={() => exportWithAudit("pdf", l)}><FileDown className="h-3.5 w-3.5 mr-1" /> PDF</Button>
              <Button size="sm" variant="outline" onClick={() => exportWithAudit("docx", l)}><FileText className="h-3.5 w-3.5 mr-1" /> DOCX</Button>
              <Button size="sm" variant="outline" onClick={() => { printLesson(l, students, goals); update(l, { audit_trail: audit(l, "printed") }); }}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
              {l.status !== "approved" && (
                <Button size="sm" onClick={() => update(l, { status: "approved", audit_trail: audit(l, "approved") }, "Lesson approved")}>
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => duplicate(l)}><Copy className="h-3.5 w-3.5 mr-1" /> Duplicate</Button>
              <Button size="sm" variant="outline" onClick={() => update(l, { is_template: !l.is_template, audit_trail: audit(l, l.is_template ? "template removed" : "saved as template") })}>
                <Star className="h-3.5 w-3.5 mr-1" /> {l.is_template ? "Un-template" : "Template"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(l)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => remove(l)} aria-label="Delete lesson"><Trash2 className="h-3.5 w-3.5 text-rose-500" /></Button>
            </div>
          </div>
          {(l.audit_trail || []).length > 0 && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              History: {l.audit_trail.slice(-3).map((a) => `${a.action}${a.user_name ? ` by ${a.user_name}` : ""}`).join(" · ")}
            </p>
          )}
        </Card>
      ))}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <>
              <iframe title="Lesson plan preview" srcDoc={buildLessonHtml(viewing, students, goals)} className="w-full h-[60vh] rounded-lg border border-border" />
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" className="brand-gradient text-white" onClick={() => printLesson(viewing, students, goals)}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
                <Button size="sm" variant="outline" onClick={() => exportWithAudit("pdf", viewing)}><FileDown className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportWithAudit("docx", viewing)}><FileText className="h-3.5 w-3.5 mr-1" /> DOCX</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
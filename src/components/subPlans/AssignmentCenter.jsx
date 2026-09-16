import React, { useState } from "react";
import { Sparkles, Loader2, Upload, Trash2, ExternalLink, BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import ExportBar from "@/components/shared/ExportBar";

const TYPE_LABELS = {
  assignment: "Assignment",
  worksheet: "Worksheet",
  reading_passage: "Reading Passage",
  lesson_material: "Lesson Materials",
  presentation: "Presentation (PPT)",
  other: "Other",
};

// Assignments For Today — the actual student work a substitute needs, pulled
// from three real sources: Lesson Studio practice materials, teacher-uploaded
// files (PDF/DOCX/PPT/worksheets), and saved goal-generated assignments.
// Every item shows its source and exports with Print / PDF / DOCX / Email / Share.
export default function AssignmentCenter() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list("-updated_date", 200), []);
  const { data: lessons } = useAsync(() => base44.entities.Lesson.list("-updated_date", 100), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list("-updated_date", 200), []);
  const { data: materials, refetch: refetchMaterials } = useAsync(
    () => base44.entities.TeachingMaterial.list("-updated_date", 100), []
  );
  const { data: goalAssignments, refetch: refetchAssignments } = useAsync(
    () => base44.entities.SavedReport.filter({ report_type: "goal_assignment" }, "-created_date", 100), []
  );

  const [form, setForm] = useState({ title: "", material_type: "assignment", subject: "", grade: "", skill: "", notes: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const items = [];
  (lessons || []).forEach((l) =>
    (l.practice_materials || []).forEach((m, i) =>
      items.push({
        key: `${l.id}-pm-${i}`,
        name: m.title || m.material_type || "Practice material",
        context: l.title,
        source: "Lesson Studio",
        sections: [
          { heading: "Lesson", body: `${l.title}${l.subject ? ` · ${l.subject}` : ""}` },
          { heading: "Objective", body: l.objective },
          { heading: "Directions / Activity", body: m.content },
          { heading: "Answer Key (teacher copy)", body: m.answer_key },
          { heading: "Accommodations", body: l.accommodations },
        ].filter((s) => s.body),
      })
    )
  );
  (materials || []).forEach((m) =>
    items.push({
      key: m.id,
      name: m.title,
      context: [m.subject, m.grade, m.skill].filter(Boolean).join(" · "),
      source: `Teacher Upload — ${TYPE_LABELS[m.material_type] || m.material_type}`,
      file_url: m.file_url,
      notes: m.notes,
      material: m,
    })
  );
  (goalAssignments || []).forEach((r) => {
    const a = r.content?.assignment;
    if (!a) return;
    items.push({
      key: r.id,
      name: a.activity_title || "Goal-aligned assignment",
      context: r.student_name ? `for ${r.student_name} — ${r.content?.goal_area || "goal"}` : "",
      source: "System Generated — Goal Assignment",
      sections: [
        { heading: "Activity / Passage", body: a.activity },
        { heading: "Practice Items", body: (a.items || []).map((it, i) => `${i + 1}. ${it.question}`).join("\n") },
        { heading: "Answer Key (teacher copy)", body: (a.items || []).map((it, i) => `${i + 1}. ${it.question}\n   Answer: ${it.answer}`).join("\n\n") },
        { heading: "Progress-Monitoring Probe", body: a.probe },
        { heading: "Teacher Note", body: a.teacher_note },
        { heading: "Accommodations Reminder", body: a.accommodations_reminder },
      ].filter((s) => s.body),
    });
  });

  const doUpload = async () => {
    if (!form.title || !file) {
      toast({ title: "Title and file are required", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.TeachingMaterial.create({ ...form, filename: file.name, file_url });
      setForm({ title: "", material_type: "assignment", subject: "", grade: "", skill: "", notes: "" });
      setFile(null);
      refetchMaterials();
      toast({ title: "Assignment uploaded", description: "It now appears in Assignments For Today and in sub plans." });
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeMaterial = async (m) => {
    try {
      await base44.entities.TeachingMaterial.delete(m.id);
      refetchMaterials();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const generateAssignments = async () => {
    const todo = (students || [])
      .map((s) => ({ s, g: (goals || []).find((g) => g.student_id === s.id) }))
      .filter((x) => x.g);
    if (!todo.length) {
      toast({
        title: "No goals on file",
        description: "Assignments are generated from IEP goals — add goals for your students first.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    let made = 0;
    let failed = 0;
    for (const { s, g } of todo) {
      try {
        const res = await base44.functions.invoke("generateAssignmentFromGoal", { goal_id: g.id });
        await base44.entities.SavedReport.create({
          student_id: s.id,
          student_name: `${s.first_name} ${s.last_name}`,
          report_type: "goal_assignment",
          content: { goal_id: g.id, goal_area: g.goal_area, assignment: res.data.assignment },
        });
        made++;
      } catch {
        failed++;
      }
    }
    refetchAssignments();
    setGenerating(false);
    toast({
      title: `${made} assignment${made === 1 ? "" : "s"} generated`,
      description: failed
        ? `${failed} failed — try again in a moment.`
        : "Each includes an activity, answer key, and progress-monitoring probe.",
    });
  };

  return (
    <Card className="p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" /> Assignments For Today
        </h3>
        <span className="text-xs text-muted-foreground">
          Sources: Lesson Studio · Teacher Uploads · Goal Assignment Generator
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The actual student work for your substitute — each item shows its source and can be printed or exported.
      </p>

      {/* Upload assignments */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5">
        <h4 className="text-sm font-semibold mb-3">Upload assignment / worksheet / reading passage / lesson materials</h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fractions worksheet" className="mt-1.5" /></div>
          <div><Label>Type</Label>
            <select value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value })} className="mt-1.5 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Math" className="mt-1.5" /></div>
          <div><Label>Grade</Label><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="3" className="mt-1.5" /></div>
          <div><Label>Skill</Label><Input value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} placeholder="e.g. main idea" className="mt-1.5" /></div>
          <div className="lg:col-span-2"><Label>Directions / teacher notes (optional)</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. have sub read directions aloud" className="mt-1.5" /></div>
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className={`inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 h-10 text-sm font-medium cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> {file ? file.name : "Choose file (PDF, DOCX, PPT, image)"}</>}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" disabled={uploading}
                  onChange={(e) => { setFile(e.target.files?.[0] || null); e.target.value = ""; }} />
              </label>
              <Button onClick={doUpload} disabled={uploading} className="brand-gradient text-white">
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Upload Assignment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment list */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground mb-1">No assignments found.</p>
          <p className="text-sm text-muted-foreground mb-4">
            Upload materials above, or generate goal-aligned assignments — each comes with an activity, answer key, and progress probe.
          </p>
          <Button onClick={generateAssignments} disabled={generating} className="brand-gradient text-white">
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} Generate Assignment
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.key} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{it.name}</div>
                  {it.context && <div className="text-xs text-muted-foreground">{it.context}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted/50">{it.source}</span>
                  {it.material && (
                    <Button variant="ghost" size="icon" onClick={() => removeMaterial(it.material)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                  )}
                </div>
              </div>
              {it.notes && <p className="text-xs text-muted-foreground mt-1.5">{it.notes}</p>}
              <div className="mt-3">
                {it.file_url ? (
                  <Button variant="outline" size="sm" onClick={() => window.open(it.file_url, "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open / Print file
                  </Button>
                ) : (
                  <ExportBar
                    title={it.name}
                    subtitle={it.source}
                    filename={`Assignment-${it.name}`}
                    banner="DRAFT — Educator Review Required. Verify the activity and answer key before handing to a substitute."
                    gated
                    sections={it.sections}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={generateAssignments} disabled={generating} variant="outline" size="sm">
            {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} Generate more from IEP goals
          </Button>
          <span className="text-xs text-muted-foreground">One assignment per student with goals — generate more per goal in IEP Studio → Goals &amp; Progress.</span>
        </div>
      )}
    </Card>
  );
}
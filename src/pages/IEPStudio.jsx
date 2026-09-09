import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileEdit, Sparkles, Loader2, Save, Copy, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const SECTIONS = [
  { key: "present_levels", label: "Present Levels" },
  { key: "strengths", label: "Strengths" },
  { key: "needs", label: "Areas of Need" },
  { key: "annual_goal", label: "Annual Goal" },
  { key: "accommodations", label: "Accommodations" },
  { key: "sdi", label: "SDI / Support Language" },
  { key: "progress_summary", label: "Progress Summary" },
  { key: "meeting_notes", label: "Meeting Notes" },
  { key: "parent_communication", label: "Parent Communication" },
];

const SAVE_TARGET = {
  present_levels: "present_levels", strengths: "strengths", needs: "areas_of_need",
  annual_goal: null, accommodations: "accommodations", sdi: null, progress_summary: null,
  meeting_notes: null, parent_communication: null,
};

export default function IEPStudio() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [studentId, setStudentId] = useState("");
  const [section, setSection] = useState("present_levels");
  const [extra, setExtra] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const student = (students || []).find((s) => s.id === studentId);

  const generate = async () => {
    if (!studentId) { toast({ title: "Select a student first", variant: "destructive" }); return; }
    setLoading(true); setDraft("");
    try {
      const res = await base44.functions.invoke("generateIepSection", { student_id: studentId, section_type: section, extra });
      setDraft(res.data.draft);
    } catch (e) { toast({ title: "Generation failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const saveToProfile = async () => {
    const field = SAVE_TARGET[section];
    if (!field) { toast({ title: "Copied to clipboard" }); navigator.clipboard?.writeText(draft); return; }
    setSaving(true);
    try {
      const existing = student?.[field] || "";
      await base44.entities.Student.update(studentId, { [field]: existing ? existing + "\n\n" + draft : draft });
      toast({ title: "Saved to student profile — review required" });
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="IEP Studio" subtitle="Draft IEP sections with CaseCue. Every draft is a starting point — educator and IEP team review is always required." icon={FileEdit} />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 h-fit">
          <Label className="text-sm font-semibold">Student</Label>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1.5" value={studentId} onChange={(e) => { setStudentId(e.target.value); setDraft(""); }}>
            <option value="">Select a student…</option>
            {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>

          <Label className="text-sm font-semibold mt-5 block">Section to draft</Label>
          <div className="mt-2 space-y-1.5">
            {SECTIONS.map((s) => (
              <button key={s.key} onClick={() => { setSection(s.key); setDraft(""); }} className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${section === s.key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                {s.label}
              </button>
            ))}
          </div>

          <Label className="text-sm font-semibold mt-5 block">Additional instructions (optional)</Label>
          <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. focus on reading fluency" className="mt-1.5" />
          <Button onClick={generate} disabled={loading || !studentId} className="brand-gradient text-white w-full mt-4">
            {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Drafting…</> : <><Sparkles className="h-4 w-4 mr-1" /> Draft with CaseCue</>}
          </Button>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{SECTIONS.find((s) => s.key === section)?.label}</h3>
            {draft && <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(draft); toast({ title: "Copied" }); }}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
              <Button size="sm" onClick={saveToProfile} disabled={saving} className="brand-gradient text-white"><Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save to profile"}</Button>
            </div>}
          </div>
          {!draft && !loading && (
            <div className="text-center py-16 text-muted-foreground">
              <FileEdit className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Select a student and section, then draft with CaseCue.</p>
            </div>
          )}
          {loading && <div className="flex items-center justify-center gap-2 text-muted-foreground py-16"><Loader2 className="h-5 w-5 animate-spin" /> CaseCue is drafting…</div>}
          {draft && (
            <div>
              <Textarea rows={18} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-body" />
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>Draft — Educator/IEP Team Review Required.</strong> This is AI-generated support content, not an official IEP decision. Verify all details against student data before use.</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
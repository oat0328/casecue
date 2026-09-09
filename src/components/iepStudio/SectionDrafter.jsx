import React, { useState } from "react";
import { Sparkles, Loader2, Save, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import ExportBar from "@/components/shared/ExportBar";
import SourceCitations from "@/components/shared/SourceCitations";

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

// Single-section AI drafter: pick a section, add instructions, draft, edit, and
// save to the student profile. Lives inside IEP Studio.
export default function SectionDrafter({ student, sections = SECTIONS }) {
  const { toast } = useToast();
  const [section, setSection] = useState("present_levels");
  const [extra, setExtra] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    if (!student) { toast({ title: "Select a student first", variant: "destructive" }); return; }
    setLoading(true); setDraft("");
    try {
      const res = await base44.functions.invoke("generateIepSection", { student_id: student.id, section_type: section, extra });
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
      await base44.entities.Student.update(student.id, { [field]: existing ? existing + "\n\n" + draft : draft });
      toast({ title: "Saved to student profile — review required" });
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-1 h-fit">
        <Label className="text-sm font-semibold block">Section to draft</Label>
        <div className="mt-2 space-y-1.5">
          {sections.map((s) => (
            <button key={s.key} onClick={() => { setSection(s.key); setDraft(""); }} className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${section === s.key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <Label className="text-sm font-semibold mt-5 block">Additional instructions (optional)</Label>
        <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. focus on reading fluency" className="mt-1.5" />
        <Button onClick={generate} disabled={loading || !student} className="brand-gradient text-white w-full mt-6">
          {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Drafting…</> : <><Sparkles className="h-4 w-4 mr-1" /> Draft with CaseCue</>}
        </Button>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{sections.find((s) => s.key === section)?.label}</h3>
          {draft && <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(draft); toast({ title: "Copied" }); }}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
            <Button size="sm" onClick={saveToProfile} disabled={saving} className="brand-gradient text-white"><Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save to profile"}</Button>
          </div>}
        </div>
        {!draft && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <p>Pick a section, then draft with CaseCue.</p>
          </div>
        )}
        {loading && <div className="flex items-center justify-center gap-2 text-muted-foreground py-16"><Loader2 className="h-5 w-5 animate-spin" /> CaseCue is drafting…</div>}
        {draft && (
          <div>
            <Textarea rows={18} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-body" />
            <ExportBar
              className="mt-4"
              title={`${sections.find((s) => s.key === section)?.label} — ${student.first_name} ${student.last_name}`}
              subtitle="IEP section draft"
              filename={`Section-${sections.find((s) => s.key === section)?.label}-${student.first_name}-${student.last_name}`}
              exclude={["save"]}
              gated
              sections={[{ heading: sections.find((s) => s.key === section)?.label, body: draft }]}
            />
            <SourceCitations studentId={student.id} className="mt-3" />
            <AiDisclaimer className="mt-3" />
          </div>
        )}
      </Card>
    </div>
  );
}
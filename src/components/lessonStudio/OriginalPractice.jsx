import React, { useState } from "react";
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-sm font-medium mb-2";

const MATERIAL_TYPES = [
  { value: "worksheet", label: "Worksheet" },
  { value: "guided_practice", label: "Guided-practice activity" },
  { value: "independent_practice", label: "Independent-practice activity" },
  { value: "exit_ticket", label: "Exit ticket" },
  { value: "warm_up", label: "Warm-up" },
  { value: "vocabulary_activity", label: "Vocabulary activity" },
  { value: "progress_probe", label: "Progress-monitoring probe" },
  { value: "rubric", label: "Rubric" },
];

// Step 2 helper — Create Original Practice: CaseCue generates a completely
// ORIGINAL material aligned to the assignment's skills. It never copies the
// source's questions, passages, illustrations, branding, or layout.
export default function OriginalPractice({ analysis, plan, grade, practiceMaterials, onChange }) {
  const { toast } = useToast();
  const [materialType, setMaterialType] = useState("worksheet");
  const [itemCount, setItemCount] = useState(8);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);

  const defaultSkills = (analysis?.skills || []).join(", ");
  const [skills, setSkills] = useState(defaultSkills);

  const generate = async () => {
    if (!skills.trim()) {
      toast({ title: "Describe the skills first", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateOriginalPractice", {
        material_type: materialType,
        skills,
        subject: analysis?.subject || plan?.subject_skill || "",
        grade: grade || analysis?.grade_level || plan?.grade_group || "",
        item_count: itemCount,
        include_answer_key: includeAnswerKey,
      });
      setDraft(res.data.material);
    } catch (e) {
      toast({ title: "Generation failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const addToLesson = () => {
    if (!draft) return;
    onChange([...(practiceMaterials || []), {
      material_type: materialType,
      title: draft.title || "",
      content: draft.content || "",
      answer_key: draft.answer_key || "",
      created_at: new Date().toISOString(),
    }]);
    setDraft(null);
    toast({ title: "Original practice material added", description: "Teacher review required before student use." });
  };

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-primary" /> Create original practice</h3>
      <p className="text-xs text-muted-foreground mb-4">
        CaseCue writes a completely original material aligned to the same skills as the assignment — it never copies the source's questions, passages, illustrations, branding, or proprietary layout.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="op-type">Material type</label>
          <select id="op-type" className={inputCls} value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
            {MATERIAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="op-count">Number of items</label>
          <input id="op-count" type="number" min={1} max={30} className={inputCls} value={itemCount}
            onChange={(e) => setItemCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} inputMode="numeric" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="op-skills">Skills to target</label>
          <input id="op-skills" className={inputCls} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. descriptive writing, sensory details" />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeAnswerKey} onChange={(e) => setIncludeAnswerKey(e.target.checked)} className="h-4 w-4 accent-[hsl(255_82%_58%)]" />
            Include answer key / scoring guide
          </label>
        </div>
      </div>

      <Button onClick={generate} disabled={generating} className="brand-gradient text-white h-11 px-6 mt-6">
        {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating original material…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate original practice</>}
      </Button>

      {draft && (
        <div className="mt-5 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <p className="font-semibold text-sm">{draft.title || "Untitled material"}</p>
            <span className="text-xs rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1">Draft — Teacher Review Required</span>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-body bg-muted rounded-lg p-3 max-h-72 overflow-y-auto">{draft.content}</pre>
          {draft.answer_key && (
            <>
              <p className="text-xs font-semibold mt-3 mb-1">Answer key / scoring guide</p>
              <pre className="text-xs whitespace-pre-wrap font-body bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">{draft.answer_key}</pre>
            </>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={addToLesson} className="brand-gradient text-white h-11 px-6"><Plus className="h-4 w-4 mr-2" /> Add to lesson</Button>
            <Button variant="outline" className="h-11" onClick={generate} disabled={generating}>Regenerate</Button>
            <Button variant="outline" className="h-11" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        </div>
      )}

      {(practiceMaterials || []).length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium">Original materials in this lesson</p>
          {practiceMaterials.map((m, i) => (
            <div key={i} className="rounded-lg border border-border px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{m.title} <span className="text-muted-foreground font-normal">({(m.material_type || "").replace(/_/g, " ")})</span></p>
                <button aria-label="Remove material" className="p-2 rounded-lg hover:bg-muted shrink-0"
                  onClick={() => onChange(practiceMaterials.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </button>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-body mt-2 max-h-40 overflow-y-auto">{m.content}</pre>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
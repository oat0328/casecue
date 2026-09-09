import React, { useState } from "react";
import { ClipboardList, Sparkles, Loader2, Save, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const PLAN_TYPES = [
  { value: "daily", label: "Daily Sub Plan" },
  { value: "planned_absence", label: "Planned Absence" },
  { value: "emergency", label: "Emergency Sub Plan" },
];

export default function SubPlans() {
  const { toast } = useToast();
  const { data: plans, refetch } = useAsync(() => base44.entities.SubPlan.list('-date', 50), []);
  const [planType, setPlanType] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setGenerating(true); setContent("");
    try {
      const res = await base44.functions.invoke("generateSubPlan", { plan_type: planType, date });
      setContent(res.data.content);
      if (!title) setTitle(`${PLAN_TYPES.find((p) => p.value === planType)?.label} — ${date}`);
      toast({ title: "Sub plan drafted — review required" });
    } catch (e) { toast({ title: "Generation failed", description: e.message, variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const save = async () => {
    if (!title || !content) { toast({ title: "Title and content required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.SubPlan.create({ title, date, plan_type: planType, content });
      setTitle(""); setContent("");
      refetch(); toast({ title: "Sub plan saved" });
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Substitute Plans" subtitle="Never panic over an absence again. Generate daily, planned, or emergency sub plans from your real schedule and supports." icon={ClipboardList} />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 h-fit">
          <Label className="font-semibold">Plan type</Label>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={planType} onChange={(e) => setPlanType(e.target.value)}>
            {PLAN_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Label className="font-semibold mt-4 block">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          <Button onClick={generate} disabled={generating} className="brand-gradient text-white w-full mt-4">
            {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Drafting…</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate sub plan</>}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Uses your stored student schedule, groups, supports, and lesson directions.</p>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Sub plan</h3>
            <Button onClick={save} disabled={saving} className="brand-gradient text-white"><Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save plan"}</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          </div>
          {generating ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-16"><Loader2 className="h-5 w-5 animate-spin" /> CaseCue is drafting your sub plan…</div>
          ) : (
            <Textarea rows={18} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Your generated sub plan will appear here. You can also write one manually." className="text-sm" />
          )}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span><strong>Draft — Educator Review Required.</strong> Verify all student details and directions before handing to a substitute.</span>
          </div>
        </Card>
      </div>

      <h3 className="font-semibold mt-8 mb-3">Saved sub plans</h3>
      <div className="space-y-2">
        {(plans || []).map((p) => (
          <Card key={p.id} className="p-4"><div className="flex justify-between"><div className="font-medium">{p.title}</div><span className="text-xs text-muted-foreground">{p.date}</span></div><div className="text-xs text-muted-foreground mt-0.5">{PLAN_TYPES.find((x) => x.value === p.plan_type)?.label}</div></Card>
        ))}
        {(plans || []).length === 0 && <p className="text-muted-foreground text-sm">No saved sub plans yet.</p>}
      </div>
    </div>
  );
}
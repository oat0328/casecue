import React, { useState } from "react";
import { ClipboardList, Sparkles, Loader2, AlertTriangle, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import ExportBar from "@/components/shared/ExportBar";
import AssignmentCenter from "@/components/subPlans/AssignmentCenter";
import TodaysAssignmentPacket from "@/components/subPlans/TodaysAssignmentPacket";

const PLAN_TYPES = [
  { value: "daily", label: "Daily Sub Plan" },
  { value: "planned_absence", label: "Planned Absence" },
  { value: "emergency", label: "Emergency Sub Plan" },
];

export default function SubPlans() {
  const { toast } = useToast();
  const { data: plans, refetch } = useAsync(() => base44.entities.SubPlan.list('-date', 50), []);
  const [planType, setPlanType] = useState("daily");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState(null); // { sources, missing, has_materials }
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async (type = planType) => {
    setGenerating(true);
    setContent("");
    setMeta(null);
    try {
      const res = await base44.functions.invoke("generateSubPlan", { plan_type: type, date });
      setContent(res.data.content);
      setMeta({
        sources: res.data.sources || [],
        missing: res.data.missing || [],
        has_materials: res.data.has_materials !== false,
      });
      if (!title) setTitle(`${PLAN_TYPES.find((p) => p.value === type)?.label} — ${date}`);
      toast({ title: "Sub plan drafted — review required" });
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!title || !content) { toast({ title: "Title and content required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.SubPlan.create({
        title,
        date,
        plan_type: planType,
        content,
        student_schedule_info: meta?.sources?.join(" · ") || "",
      });
      setTitle(""); setContent(""); setMeta(null);
      refetch();
      toast({ title: "Sub plan saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Substitute Plans" subtitle="Never panic over an absence again. Sub plans are built from your real schedule, Lesson Studio assignments, student supports, and connected resources — with honest sourcing." icon={ClipboardList} />

      <TodaysAssignmentPacket />

      <AssignmentCenter />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 h-fit">
          <Label className="font-semibold">Plan type</Label>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={planType} onChange={(e) => setPlanType(e.target.value)}>
            {PLAN_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Label className="font-semibold mt-4 block">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          <Button onClick={() => generate()} disabled={generating} className="brand-gradient text-white w-full mt-4">
            {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Drafting…</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate sub plan</>}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Pulls your verified student records, weekly schedule, Lesson Studio assignments, and connected resource links. Anything missing is listed — never invented.</p>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          </div>
          {generating ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-16"><Loader2 className="h-5 w-5 animate-spin" /> CaseCue is drafting your sub plan…</div>
          ) : (
            <Textarea rows={18} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Your generated sub plan will appear here. You can also write one manually." className="text-sm" />
          )}

          {content && (
            <div className="mt-4 space-y-3">
              <ExportBar
                title={title || `Sub Plan — ${date}`}
                subtitle={PLAN_TYPES.find((p) => p.value === planType)?.label}
                filename={`Sub-Plan-${date}`}
                banner="DRAFT — Educator Review Required. Verify all student details and directions before handing to a substitute."
                gated
                onSave={save}
                sections={[{ heading: title || "Substitute Plan", body: content }]}
              />

              {meta && (
                <div className="rounded-xl border border-border p-4 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <span className="font-medium">Built from:</span>{" "}
                      {meta.sources.length > 0 ? (
                        meta.sources.map((s) => (
                          <span key={s} className="inline-block text-xs px-2 py-0.5 rounded-full border border-border bg-muted/50 mr-1.5">{s}</span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">No caseload data found in your account yet.</span>
                      )}
                    </div>
                  </div>
                  {meta.missing.length > 0 && (
                    <p className="text-amber-700 text-xs flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Not in CaseCue (listed in the plan so nothing is invented): {meta.missing.join("; ")}</span>
                    </p>
                  )}
                  {!meta.has_materials && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                      <p className="text-sm text-amber-800 flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 shrink-0" /> No lesson materials found.</p>
                      <p className="text-xs text-amber-700 mt-1">The assignments in this plan are AI Generated emergency activities based on your students' grades and goal areas.</p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => generate("emergency")} disabled={generating}>
                        <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Assignment
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>Draft — Educator Review Required.</strong> Verify all student details and directions before handing to a substitute.</span>
              </div>
            </div>
          )}
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
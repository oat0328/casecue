import React, { useState } from "react";
import { BookOpen, Sparkles, Loader2, Save, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const FIELDS = [
  ["objective", "Objective"], ["essential_question", "Essential Question"], ["real_world_connection", "Real-World Connection"],
  ["mini_lecture", "Mini-Lecture"], ["warm_up", "Warm-Up"], ["i_do", "I Do"], ["we_do", "We Do"], ["you_do", "You Do"],
  ["accommodations", "Accommodations"], ["data_collection", "Data Collection"], ["student_performance", "Student Performance"], ["reflection", "Reflection"],
];

export default function LessonStudio() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: lessons, refetch } = useAsync(() => base44.entities.Lesson.list('-date', 50), []);
  const [selected, setSelected] = useState([]);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lesson, setLesson] = useState({ title: "", date: new Date().toISOString().slice(0,10), objective: "", essential_question: "", real_world_connection: "", mini_lecture: "", warm_up: "", i_do: "", we_do: "", you_do: "", accommodations: "", data_collection: "", student_performance: "", reflection: "" });

  const toggleStudent = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const generate = async () => {
    if (selected.length === 0) { toast({ title: "Select at least one student", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateLesson", { student_ids: selected, topic });
      const g = res.data.lesson;
      setLesson((prev) => ({ ...prev, ...g, title: g.title || (topic || "New Lesson") }));
      toast({ title: "Lesson drafted — review required" });
    } catch (e) { toast({ title: "Generation failed", description: e.message, variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const save = async () => {
    if (!lesson.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.Lesson.create({ ...lesson, student_ids: selected });
      setLesson({ title: "", date: new Date().toISOString().slice(0,10), objective: "", essential_question: "", real_world_connection: "", mini_lecture: "", warm_up: "", i_do: "", we_do: "", you_do: "", accommodations: "", data_collection: "", student_performance: "", reflection: "" });
      refetch(); toast({ title: "Lesson saved" });
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Lesson Studio" subtitle="Generate lessons connected to student IEP goals. Full I Do / We Do / You Do structure with accommodations and data collection." icon={BookOpen} />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 h-fit">
          <Label className="font-semibold">Students (connect to goals)</Label>
          <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5">
            {(students || []).map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleStudent(s.id)} className="rounded" />
                <span className="text-sm">{s.first_name} {s.last_name}</span>
              </label>
            ))}
          </div>
          <Label className="font-semibold mt-4 block">Topic / subject</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. reading fluency" className="mt-1" />
          <Button onClick={generate} disabled={generating} className="brand-gradient text-white w-full mt-4">
            {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Drafting…</> : <><Sparkles className="h-4 w-4 mr-1" /> Generate lesson</>}
          </Button>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Lesson plan</h3>
            <Button onClick={save} disabled={saving} className="brand-gradient text-white"><Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save lesson"}</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div><Label>Title</Label><Input value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} className="mt-1" /></div>
            <div><Label>Date</Label><Input type="date" value={lesson.date} onChange={(e) => setLesson({ ...lesson, date: e.target.value })} className="mt-1" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {FIELDS.map(([key, label]) => (
              <div key={key} className={key === "mini_lecture" || key === "accommodations" || key === "data_collection" ? "sm:col-span-2" : ""}>
                <Label className="text-xs">{label}</Label>
                <Textarea rows={key === "objective" || key === "essential_question" || key === "real_world_connection" ? 2 : 3} value={lesson[key]} onChange={(e) => setLesson({ ...lesson, [key]: e.target.value })} className="mt-1 text-sm" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span><strong>Draft — Educator/IEP Team Review Required.</strong> AI-generated lesson content must be reviewed before use.</span>
          </div>
        </Card>
      </div>

      <h3 className="font-semibold mt-8 mb-3">Saved lessons</h3>
      <div className="space-y-2">
        {(lessons || []).map((l) => (
          <Card key={l.id} className="p-4 flex justify-between items-center">
            <div><div className="font-medium">{l.title}</div><div className="text-xs text-muted-foreground">{l.date} · {l.objective || "No objective"}</div></div>
          </Card>
        ))}
        {(lessons || []).length === 0 && <p className="text-muted-foreground text-sm">No saved lessons yet.</p>}
      </div>
    </div>
  );
}
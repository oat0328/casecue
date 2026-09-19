import React, { useMemo, useState } from "react";
import { BarChart3, Plus, AlertCircle, TrendingUp, ShieldCheck, FileWarning } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import StudentSelector from "@/components/forms/StudentSelector";
import ChartCard from "@/components/shared/ChartCard";
import ReportBuilderPanel from "@/components/shared/ReportBuilderPanel";
import DataSheetScanPanel from "@/components/dataCenter/DataSheetScanPanel";
import { DATA_CENTER_DEFINITIONS } from "@/lib/caseReports";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

export default function DataCenter() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 300), []);
  const { data: progress, refetch } = useAsync(() => base44.entities.ProgressData.list('-date', 500), []);
  const { data: sessions } = useAsync(() => base44.entities.SessionRecord.list('-date', 500), []);
  const { data: documents } = useAsync(() => base44.entities.Document.list('-date_uploaded', 300), []);
  const { data: workEvidence } = useAsync(() => base44.entities.WorkEvidence.list('-date', 500), []);
  const { data: assignments } = useAsync(() => base44.entities.GradebookAssignment.list('-date', 200), []);
  const { data: meetings } = useAsync(() => base44.entities.Meeting.list('date', 100), []);
  const { data: rawSchedule } = useAsync(() => base44.entities.ScheduleEntry.list('-updated_date', 300), []);
  const schedule = useMemo(() => (rawSchedule || []).filter((e) => (e.workspace || 'sped') === 'sped'), [rawSchedule]);

  const [form, setForm] = useState({ student_id: "", goal_id: "", date: new Date().toISOString().slice(0,10), correct: "", total: "", prompting_level: "independent", observation_notes: "" });
  const [saving, setSaving] = useState(false);

  const goalsForStudent = (goals || []).filter((g) => g.student_id === form.student_id);

  const needingData = useMemo(() => {
    const s = students || [];
    const recent = new Set((progress || []).filter((p) => { const d = new Date(p.date); const days = (Date.now() - d) / 86400000; return days <= 14; }).map((p) => p.student_id));
    return s.filter((st) => !recent.has(st.id));
  }, [students, progress]);

  const submit = async () => {
    if (!form.student_id || !form.date) { toast({ title: "Student and date required", variant: "destructive" }); return; }
    const correct = parseFloat(form.correct) || 0, total = parseFloat(form.total) || 0;
    const percentage = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    const decimal = total > 0 ? Math.round((correct / total) * 100) / 100 : 0;
    setSaving(true);
    try {
      await base44.entities.ProgressData.create({ ...form, correct, total, percentage, decimal });
      setForm({ student_id: "", goal_id: "", date: new Date().toISOString().slice(0,10), correct: "", total: "", prompting_level: "independent", observation_notes: "" });
      refetch(); toast({ title: "Progress data logged" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const chartFor = (sid) => (progress || []).filter((p) => p.student_id === sid && p.record_status !== 'duplicate' && p.record_status !== 'superseded' && p.percentage != null).map((p) => ({ date: p.date, percentage: p.percentage }));
  const studentsWithTrends = (students || []).filter((s) => chartFor(s.id).length >= 2);
  const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const docMatchesStudent = (d, s) => {
    const firstPage = d?.processing_results?.pages?.[0];
    if (!firstPage || firstPage.section_name === 'File Error') return null;
    const hay = norm(JSON.stringify(firstPage));
    const first = norm(s.first_name), last = norm(s.last_name).slice(0,5);
    return !!first && hay.includes(first) && (!last || hay.includes(last));
  };
  const auditRows = useMemo(() => (students || []).filter(s=>s.roster_status!=='archived').map(s=>{
    const sg=(goals||[]).filter(g=>g.student_id===s.id&&g.status!=='met');
    const sp=(progress||[]).filter(p=>p.student_id===s.id&&p.record_status!=='duplicate'&&p.record_status!=='superseded');
    const ss=(sessions||[]).filter(x=>x.student_id===s.id);
    const sw=(workEvidence||[]).filter(x=>x.student_id===s.id);
    const sd=(documents||[]).filter(x=>x.student_id===s.id);
    const mismatch=sd.some(d=>docMatchesStudent(d,s)===false);
    const fileError=sd.some(d=>d.processing_results?.pages?.[0]?.section_name==='File Error');
    const issues=[];
    if(!sd.length)issues.push('No uploaded source document');
    if(mismatch)issues.push('Uploaded document appears linked to a different student');
    if(fileError)issues.push('Document extraction contains a file-size/processing error');
    if(!sg.length)issues.push('No active goals in Goal table');
    if(sg.length&&!sp.length)issues.push('Goals exist but no formal progress data');
    if(ss.length&&!ss.some(x=>x.goal_id))issues.push('Sessions exist but are not linked to goals');
    if(sw.length&&!sw.some(x=>x.goal_id))issues.push('Work evidence exists but is not linked to goals');
    return {s,goals:sg.length,progress:sp.length,sessions:ss.length,work:sw.length,docs:sd.length,issues};
  }),[students,goals,progress,sessions,workEvidence,documents]);

  return (
    <div>
      <PageHeader title="Data Center" subtitle="Track progress monitoring across your caseload. Correct/total, percentages, decimals, prompting levels, and observation notes." icon={BarChart3} />

      <Tabs defaultValue="log">
        <TabsList className="mb-4">
          <TabsTrigger value="log">Log & Trends</TabsTrigger>
          <TabsTrigger value="scan">Scan Data Sheet</TabsTrigger>
          <TabsTrigger value="audit">Goal Data Audit</TabsTrigger>
          <TabsTrigger value="reports">Reports & Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          {/* Needing data */}
          <Card className="p-6 mb-6 border-amber-200 bg-amber-50/40">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertCircle className="h-4 w-4 text-amber-600" /> Students still needing progress data this week</h3>
            {needingData.length === 0 ? <p className="text-sm text-muted-foreground">All students have recent progress data. Great work.</p> : (
              <div className="flex flex-wrap gap-2">
                {needingData.map((s) => <span key={s.id} className="text-sm rounded-full bg-white border border-amber-200 px-3 py-1.5">{s.first_name} {s.last_name}</span>)}
              </div>
            )}
          </Card>

          {/* Log form */}
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Log progress data</h3>
            <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-5">
              <div>
                <StudentSelector
                  students={students || []}
                  value={form.student_id}
                  onChange={(id) => setForm({ ...form, student_id: id, goal_id: "" })}
                  placeholder="Select…"
                  noBottomSpace
                />
              </div>
              <div><Label>Goal</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}>
                  <option value="">—</option>
                  {goalsForStudent.map((g) => <option key={g.id} value={g.id}>{g.goal_area || "Goal"}</option>)}
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" /></div>
              <div><Label>Prompting</Label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.prompting_level} onChange={(e) => setForm({ ...form, prompting_level: e.target.value })}>
                  {["independent","verbal","visual","physical","full"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><Label>Correct</Label><Input type="number" value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} className="mt-1" /></div>
              <div><Label>Total</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2 lg:col-span-4"><Label>Observation notes</Label><Input value={form.observation_notes} onChange={(e) => setForm({ ...form, observation_notes: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Preview: {form.total > 0 ? `${form.correct || 0}/${form.total} = ${Math.round((parseFloat(form.correct||0)/parseFloat(form.total))*1000)/10}% = ${(Math.round((parseFloat(form.correct||0)/parseFloat(form.total))*100)/100)}` : "Enter correct and total"}
            </div>
            <Button onClick={submit} disabled={saving} className="brand-gradient text-white mt-6"><Plus className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Log data"}</Button>
          </Card>

          {/* Trends per student */}
          <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Progress trends</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {studentsWithTrends.map((s) => {
              const data = chartFor(s.id);
              return (
                <ChartCard
                  key={s.id}
                  title={`${s.first_name} ${s.last_name}`}
                  subtitle="Progress monitoring trend"
                  data={data}
                  filename={`CaseCue-Progress-${s.first_name}-${s.last_name}`}
                  height={160}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={10} /><YAxis domain={[0,100]} fontSize={10} /><Tooltip /><Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} /></LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              );
            })}
            {studentsWithTrends.length === 0 && <p className="text-muted-foreground text-sm">Log at least two data points per student to see trends.</p>}
          </div>
        </TabsContent>

        <TabsContent value="scan">
          <DataSheetScanPanel students={students || []} goals={goals || []} onImported={refetch} />
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-5 mb-5 border-blue-200 bg-blue-50/40"><div className="flex items-start gap-3"><ShieldCheck className="h-5 w-5 text-blue-700 mt-0.5"/><div><h3 className="font-black">Real-data audit</h3><p className="text-sm text-slate-600 mt-1">This checks the live Student, Document, Goal, ProgressData, SessionRecord and WorkEvidence records. A student can have sessions or scanned work and still show no goal trend when those records are not linked to a verified goal.</p></div></div></Card>
          <div className="space-y-3">{auditRows.map(r=><Card key={r.s.id} className={`p-4 ${r.issues.length?'border-amber-200':'border-emerald-200'}`}><div className="flex flex-col lg:flex-row lg:items-center gap-4"><div className="lg:w-52"><div className="font-black">{r.s.first_name} {r.s.last_name}</div><div className={`text-xs font-bold mt-1 ${r.issues.length?'text-amber-700':'text-emerald-700'}`}>{r.issues.length?`${r.issues.length} issue${r.issues.length===1?'':'s'} to review`:'Data chain connected'}</div></div><div className="grid grid-cols-5 gap-2 flex-1">{[['Docs',r.docs],['Goals',r.goals],['Progress',r.progress],['Sessions',r.sessions],['Work',r.work]].map(([l,v])=><div key={l} className="rounded-xl bg-slate-50 p-2 text-center"><div className="font-black">{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>)}</div><div className="lg:w-[420px]">{r.issues.length?r.issues.map((x,i)=><div key={i} className="text-xs text-amber-800 flex gap-1.5 mb-1"><FileWarning className="h-3.5 w-3.5 shrink-0"/>{x}</div>):<div className="text-xs font-semibold text-emerald-700">Document → goal → data chain is connected.</div>}</div></div></Card>)}</div>
        </TabsContent>

        <TabsContent value="reports">
          <ReportBuilderPanel
            definitions={DATA_CENTER_DEFINITIONS}
            data={{
              students: students || [],
              goals: goals || [],
              progress: progress || [],
              sessions: sessions || [],
              assignments: assignments || [],
              meetings: meetings || [],
              schedule: schedule || [],
            }}
            heading="Data Center Reports"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
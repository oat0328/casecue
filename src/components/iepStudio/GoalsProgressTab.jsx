import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PlusCircle, Sparkles, Loader2, ShieldCheck, FileWarning } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { computeGoalStatus } from "@/lib/goalStatus";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import GoalWorkPanel from "@/components/iepStudio/GoalWorkPanel";
import GoalReportExport from "@/components/iepStudio/GoalReportExport";

const STATUS_META = {
  met: { label: "Goal Met", color: "#10b981" },
  on_track: { label: "On Track", color: "#22c55e" },
  progressing: { label: "Making Progress", color: "#eab308" },
  intervention: { label: "Needs Monitoring", color: "#f59e0b" },
  at_risk: { label: "At Risk", color: "#ef4444" },
  no_data: { label: "No Data Yet", color: "#9ca3af" },
};

const parseNum = (v) => {
  const m = String(v ?? "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

const pctOf = (p) =>
  p.percentage ?? (p.correct != null && p.total ? Math.round((p.correct / p.total) * 100) : null);

// Tab 5 — Goals & Progress: baseline, current, target, growth needed, and
// auto-updating line + bar charts for every goal. Live-updates on new data.
export default function GoalsProgressTab({ student }) {
  const [goals, setGoals] = useState(null);
  const [progress, setProgress] = useState([]);
  const [sourceAudit, setSourceAudit] = useState({ documents: [], sessions: [], evidence: [] });
  const [work, setWork] = useState(null); // { goalId, data, loading }
  const chartRefs = useRef({});
  const { toast } = useToast();

  const generateWork = async (goal) => {
    setWork({ goalId: goal.id, data: null, loading: true });
    try {
      const res = await base44.functions.invoke("generateAssignmentFromGoal", { goal_id: goal.id });
      setWork({ goalId: goal.id, data: res.data, loading: false });
    } catch (e) {
      setWork(null);
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
  };

  const saveWork = async (goal, data) => {
    try {
      await base44.entities.SavedReport.create({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        report_type: "goal_assignment",
        content: { goal_id: goal.id, goal_area: goal.goal_area, assignment: data.assignment },
      });
      toast({ title: "Saved to Reports history" });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const load = useCallback(async () => {
    try {
      const gs = await base44.entities.Goal.filter({ student_id: student.id });
      const [ps, ds, ss, ev] = await Promise.all([
        base44.entities.ProgressData.filter({ student_id: student.id }, 'date', 500),
        base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 100),
        base44.entities.SessionRecord.filter({ student_id: student.id }, '-date', 500),
        base44.entities.WorkEvidence.filter({ student_id: student.id }, '-date', 500),
      ]);
      setGoals(gs || []);
      setProgress((ps || []).filter(p=>p.record_status!=='duplicate'&&p.record_status!=='superseded'));
      setSourceAudit({ documents: ds || [], sessions: ss || [], evidence: ev || [] });
    } catch {
      setGoals([]);
    }
  }, [student?.id]);

  useEffect(() => {
    load();
    const unsubGoals = base44.entities.Goal.subscribe(() => load());
    const unsubProgress = base44.entities.ProgressData.subscribe(() => load());
    return () => { unsubGoals(); unsubProgress(); };
  }, [load]);

  if (!goals) return <p className="text-muted-foreground text-sm">Loading goals…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Charts update automatically from active, non-duplicate progress records tied to each goal.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/data-center"><PlusCircle className="h-4 w-4 mr-1.5" /> Log progress data</Link>
        </Button>
      </div>

      {(() => { const docs=sourceAudit.documents||[], sessions=sourceAudit.sessions||[], evidence=sourceAudit.evidence||[]; const linkedSessions=sessions.filter(x=>x.goal_id).length, linkedEvidence=evidence.filter(x=>x.goal_id).length; const first=docs[0]?.processing_results?.pages?.[0]; const hay=String(JSON.stringify(first||{})).toLowerCase(); const fn=String(student.first_name||'').trim().toLowerCase(); const ln=String(student.last_name||'').trim().toLowerCase().replace(/[^a-z]/g,'').slice(0,5); const mismatch=first&&first.section_name!=='File Error'&&(!hay.includes(fn)|| (ln&&!hay.replace(/[^a-z]/g,'').includes(ln))); const fileError=docs.some(d=>d.processing_results?.pages?.[0]?.section_name==='File Error'); const issues=[]; if(!docs.length)issues.push('No uploaded IEP/MDT/evaluation source is linked to this student.'); if(mismatch)issues.push('The uploaded document appears to contain a different student name. Do not rely on extracted goals until the source is corrected.'); if(fileError)issues.push('The source document has a processing/file-size error.'); if(!goals.length)issues.push('No Goal records are connected to this student.'); if(goals.length&&!progress.length)issues.push('Goals are present, but no formal progress points are connected yet.'); if(sessions.length&&!linkedSessions)issues.push(`${sessions.length} session records exist, but none are linked to a goal.`); if(evidence.length&&!linkedEvidence)issues.push(`${evidence.length} work samples exist, but none are linked to a goal.`); return <Card className={`p-4 mb-5 ${issues.length?'border-amber-200 bg-amber-50/30':'border-emerald-200 bg-emerald-50/30'}`}><div className="flex items-start gap-3"><ShieldCheck className={`h-5 w-5 mt-0.5 ${issues.length?'text-amber-700':'text-emerald-700'}`}/><div className="flex-1"><div className="font-black">Goal data audit</div><div className="grid grid-cols-5 gap-2 mt-3">{[['Docs',docs.length],['Goals',goals.length],['Progress',progress.length],['Sessions',sessions.length],['Work',evidence.length]].map(([l,v])=><div key={l} className="rounded-lg bg-white/80 border px-2 py-2 text-center"><div className="font-black">{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>)}</div>{issues.length?<div className="mt-3 space-y-1">{issues.map((x,i)=><div key={i} className="text-xs text-amber-800 flex gap-1.5"><FileWarning className="h-3.5 w-3.5 shrink-0"/>{x}</div>)}</div>:<p className="text-xs font-semibold text-emerald-700 mt-3">Source document, goals, and live data are connected for this student.</p>}</div></div></Card> })()}

      {goals.length === 0 && (
        <p className="text-muted-foreground text-sm mb-4">No goals on file yet. The audit above shows whether the uploaded source contains usable data or needs review before goals are created.</p>
      )}

      <div className="space-y-4">
        {goals.map((g) => {
          const entries = progress
            .filter((p) => p.goal_id === g.id)
            .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
          const latest = entries[entries.length - 1];
          const current = latest ? pctOf(latest) : null;
          const st = computeGoalStatus(g, entries, student.annual_review_due) || { key: "no_data" };
          const meta = STATUS_META[st.key] || STATUS_META.no_data;
          const targetNum = parseNum(g.target);
          const growthNeeded = current != null && targetNum != null
            ? `${Math.max(0, Math.round(targetNum - current))} points to target`
            : "—";

          const lineData = entries
            .map((p) => ({ date: (p.date || "").slice(5), pct: pctOf(p) }))
            .filter((d) => d.pct != null);
          const barData = entries
            .filter((p) => p.correct != null && p.total)
            .map((p) => ({ date: (p.date || "").slice(5), correct: p.correct, missed: Math.max(0, p.total - p.correct) }));

          return (
            <Card key={g.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{g.goal_area || "Goal"}</span>
                  <p className="text-sm font-medium mt-0.5">{g.goal_text}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}11` }}>
                  {meta.label}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  ["Baseline", g.baseline || "—"],
                  ["Current Performance", current != null ? `${current}%` : "—"],
                  ["Target", g.target || "—"],
                  ["Growth Needed", growthNeeded],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted/60 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-sm font-semibold mt-0.5">{value}</div>
                  </div>
                ))}
              </div>

              {lineData.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2" ref={(el) => { chartRefs.current[g.id] = el; }}>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Progress trend</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" fontSize={11} />
                          <YAxis domain={[0, 100]} fontSize={11} />
                          <Tooltip />
                          <Line type="monotone" dataKey="pct" name="%" stroke={meta.color} strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {barData.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Correct / missed per session</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" fontSize={11} />
                            <YAxis allowDecimals={false} fontSize={11} />
                            <Tooltip />
                            <Bar dataKey="correct" name="Correct" stackId="a" fill="#22c55e" radius={[4, 0, 0, 4]} />
                            <Bar dataKey="missed" name="Missed" stackId="a" fill="#fca5a5" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No progress data logged for this goal yet.</p>
              )}

              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <GoalReportExport
                  student={student}
                  goal={g}
                  entries={entries}
                  statusLabel={meta.label}
                  getChartEl={() => chartRefs.current[g.id]}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => (work?.goalId === g.id ? setWork(null) : generateWork(g))}
                >
                  {work?.goalId === g.id ? "Hide assignment" : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate work from goal</>}
                </Button>
                {work?.goalId === g.id && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                    {work.loading ? (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground py-6"><Loader2 className="h-4 w-4 animate-spin" /> Creating goal-aligned materials…</p>
                    ) : (
                      <GoalWorkPanel
                        assignment={work.data?.assignment}
                        goal={g}
                        student={student}
                        onSave={() => saveWork(g, work.data)}
                      />
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
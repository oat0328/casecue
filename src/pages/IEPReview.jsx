import React, { useState } from "react";
import { ShieldCheck, Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle, Wand2, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StudentSelector from "@/components/forms/StudentSelector";
import ExportBar from "@/components/shared/ExportBar";
import SourceCitations from "@/components/shared/SourceCitations";

const LEVEL_META = {
  good: { label: "Looks Good", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  review: { label: "Review Recommended", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  missing: { label: "Missing / Potential Conflict", icon: XCircle, color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
};
const CATEGORY_LABELS = {
  present_levels: "Present Levels", goals: "Goals", data_alignment: "Data Alignment",
  services_accommodations: "Services & Accommodations", progress_monitoring: "Progress Monitoring",
  document_consistency: "Document Consistency",
};

export default function IEPReview() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: allGoals } = useAsync(() => base44.entities.Goal.list('-updated_date', 1000), []);
  const { data: allDocs } = useAsync(() => base44.entities.Document.list('-date_uploaded', 1000), []);
  const [studentId, setStudentId] = useState("");
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState(null);
  const [fixing, setFixing] = useState(null);
  const [fixResult, setFixResult] = useState({});
  const selectedStudent = (students || []).find((s) => s.id === studentId);

  const runReview = async () => {
    if (!studentId) { toast({ title: "Select a student first", variant: "destructive" }); return; }
    setRunning(true); setReview(null);
    try {
      const res = await base44.functions.invoke("reviewIep", { student_id: studentId });
      const r = res.data.review;
      setReview(r);
      try { await base44.entities.IEPReview.create({ student_id: studentId, score: r.score, category_scores: r.category_scores, findings: r.findings, summary: r.summary }); } catch {}
      toast({ title: "Review complete" });
    } catch (e) { toast({ title: "Review failed", description: e.message, variant: "destructive" }); }
    finally { setRunning(false); }
  };

  const fixWithCaseCue = async (finding) => {
    setFixing(finding.title);
    try {
      const res = await base44.functions.invoke("generateIepSection", {
        student_id: studentId,
        section_type: finding.category === "goals" ? "annual_goal" : (finding.category === "present_levels" ? "present_levels" : "present_levels"),
        extra: `Address this review finding — "${finding.title}": ${finding.what_found}. Suggested action: ${finding.suggested_action}. Provide a revised draft that fixes the issue.`
      });
      setFixResult({ ...fixResult, [finding.title]: res.data.draft });
      toast({ title: "Suggested revision ready — review required" });
    } catch (e) { toast({ title: "Fix failed", description: e.message, variant: "destructive" }); }
    finally { setFixing(null); }
  };

  const findings = review?.findings || [];
  const attentionCount = findings.filter((f) => f.level !== "good").length;
  const activeStudents=(students||[]).filter(s=>s.status!=='exited'&&s.roster_status!=='archived');
  const healthRows=activeStudents.map(s=>{const gs=(allGoals||[]).filter(g=>g.student_id===s.id&&String(g.status||'active')!=='met');const ds=(allDocs||[]).filter(d=>d.student_id===s.id);const hasIep=ds.some(d=>d.document_type==='IEP'&&d.extraction_status==='processed');const missing=[];if(!hasIep)missing.push('processed IEP');if(!gs.length)missing.push('active goals');if(!String(s.accommodations||'').trim())missing.push('accommodations');if(!(s.services||[]).length&&!Number(s.service_minutes||0))missing.push('services/minutes');if(!s.annual_review_due)missing.push('annual review date');if(!s.reevaluation_due)missing.push('reevaluation date');return {s,missing,hasIep,goals:gs.length}});
  const healthyCount=healthRows.filter(x=>x.missing.length===0).length,needsDataCount=healthRows.length-healthyCount;

  return (
    <div>
      <PageHeader title="CaseCue Check" subtitle="Review IEP readiness, missing information, data alignment, services/accommodations, progress monitoring, and document consistency. This is a quality-support check — not a legal compliance determination." icon={ShieldCheck} />

      <Card className="p-6 mb-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-xs font-black uppercase tracking-wider text-blue-700">Caseload Data Health</div><h2 className="mt-1 text-xl font-black">IEP completeness before you work</h2><p className="mt-1 text-sm text-slate-500">This checks whether CaseCue has the core structured data it needs. Missing items are review prompts, not legal compliance findings.</p></div><div className="flex gap-2"><div className="rounded-xl bg-emerald-50 px-4 py-3 text-center"><div className="text-2xl font-black text-emerald-800">{healthyCount}</div><div className="text-[10px] font-black uppercase text-emerald-700">Complete</div></div><div className="rounded-xl bg-amber-50 px-4 py-3 text-center"><div className="text-2xl font-black text-amber-800">{needsDataCount}</div><div className="text-[10px] font-black uppercase text-amber-700">Needs review</div></div></div></div><div className="mt-4 max-h-72 overflow-auto rounded-xl border"><div className="divide-y">{healthRows.map(({s,missing,goals})=><button key={s.id} onClick={()=>{setStudentId(s.id);setReview(null);setFixResult({})}} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50"><div><div className="font-bold">{s.last_name}, {s.first_name}</div><div className="text-xs text-slate-500">{goals} active goal{goals===1?'':'s'}</div></div><div className={`text-right text-xs font-bold ${missing.length?'text-amber-700':'text-emerald-700'}`}>{missing.length?`Review: ${missing.join(' · ')}`:'Core IEP data present'}</div></button>)}</div></div></Card>

      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <StudentSelector
              students={students || []}
              value={studentId}
              onChange={(id) => { setStudentId(id); setReview(null); setFixResult({}); }}
              noBottomSpace
            />
          </div>
          <Button onClick={runReview} disabled={running || !studentId} className="brand-gradient text-white">
            {running ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Reviewing…</> : <><Sparkles className="h-4 w-4 mr-1" /> Run CaseCue Check</>}
          </Button>
        </div>
      </Card>

      {running && (
        <Card className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Analyzing present levels, goals, data alignment, services, progress monitoring, and consistency…</p>
        </Card>
      )}

      {review && !running && (
        <>
          {/* Score */}
          <Card className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="text-center sm:text-left">
                <div className="text-sm text-muted-foreground">CaseCue Check</div>
                <div className="flex items-end gap-1"><span className="text-5xl font-bold text-gradient">{review.score}</span><span className="text-muted-foreground mb-1.5">/ 100</span></div>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                {Object.entries(review.category_scores || {}).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{CATEGORY_LABELS[key] || key}</span><span className="font-semibold">{val}</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full brand-gradient" style={{ width: `${val}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
              {attentionCount} item{attentionCount !== 1 ? "s" : ""} need your attention.
            </div>
            {review.summary && <p className="mt-3 text-sm text-muted-foreground">{review.summary}</p>}
          </Card>

          {/* Findings */}
          <div className="space-y-4">
            {findings.map((f, i) => {
              const meta = LEVEL_META[f.level] || LEVEL_META.review;
              const fix = fixResult[f.title];
              return (
                <Card key={i} className="p-5">
                  <div className="flex items-start gap-3">
                    <meta.icon className={`h-5 w-5 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{f.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[f.category] || f.category}</span>
                      </div>
                      <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div><span className="text-muted-foreground">What CaseCue found: </span>{f.what_found}</div>
                        <div><span className="text-muted-foreground">Why flagged: </span>{f.why_flagged}</div>
                        <div><span className="text-muted-foreground">Where: </span>{f.where_found}</div>
                        <div><span className="text-muted-foreground">Suggested action: </span>{f.suggested_action}</div>
                      </div>
                      {fix && (
                        <div className="mt-4 rounded-xl bg-muted p-4">
                          <div className="text-xs font-semibold text-primary mb-1">Suggested revision — Draft, Educator/IEP Team Review Required</div>
                          <p className="text-sm whitespace-pre-wrap">{fix}</p>
                        </div>
                      )}
                      {f.level !== "good" && (
                        <Button size="sm" variant="outline" onClick={() => fixWithCaseCue(f)} disabled={fixing === f.title} className="mt-3 border-primary/30 text-primary hover:bg-primary/5">
                          {fixing === f.title ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />} Fix With CaseCue
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            <ExportBar
              title={`CaseCue Check — ${selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : "Student"}`}
              subtitle="CaseCue quality review"
              filename={`IEP-Review-${selectedStudent ? selectedStudent.first_name : "Student"}`}
              banner="Potential issues for educator review only — CaseCue never claims compliance or makes decisions."
              gated
              sections={[
                { heading: "Score", body: review.score != null ? `${review.score}/100` : "—" },
                { heading: "Category Scores", body: Object.entries(review.category_scores || {}).map(([k, v]) => `${(CATEGORY_LABELS[k] || k).replace(/_/g, " ")}: ${v ?? "—"}`).join("\n") },
                { heading: "Summary", body: review.summary },
                ...findings.map((f) => ({
                  heading: `${f.level !== "good" ? "⚠ " : ""}${f.title}`,
                  body: [
                    f.what_found && `Found: ${f.what_found}`,
                    f.why_flagged && `Why flagged: ${f.why_flagged}`,
                    f.where_found && `Where: ${f.where_found}`,
                    f.suggested_action && `Suggested action: ${f.suggested_action}`,
                  ].filter(Boolean).join("\n"),
                })),
              ]}
            />
            <SourceCitations studentId={studentId} />
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>CaseCue Check is a quality-support tool. It does not determine legal compliance. All findings are potential issues requiring educator and IEP team verification.</span>
          </div>
        </>
      )}
    </div>
  );
}
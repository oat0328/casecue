import React, { useState } from "react";
import { ShieldCheck, Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle, Wand2, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
  const [studentId, setStudentId] = useState("");
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState(null);
  const [fixing, setFixing] = useState(null);
  const [fixResult, setFixResult] = useState({});

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

  return (
    <div>
      <PageHeader title="IEP Review" subtitle="Run a CaseCue quality review across six categories. This is a quality review — not a legal compliance score. Educator and team verification is always required." icon={ShieldCheck} />

      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-semibold">Select student / IEP</label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1.5" value={studentId} onChange={(e) => { setStudentId(e.target.value); setReview(null); setFixResult({}); }}>
              <option value="">Select a student…</option>
              {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <Button onClick={runReview} disabled={running || !studentId} className="brand-gradient text-white">
            {running ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Reviewing…</> : <><Sparkles className="h-4 w-4 mr-1" /> Run CaseCue IEP Review</>}
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
                <div className="text-sm text-muted-foreground">CaseCue IEP Review</div>
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

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>CaseCue IEP Review is a quality-support tool. It does not determine legal compliance. All findings are potential issues requiring educator and IEP team verification.</span>
          </div>
        </>
      )}
    </div>
  );
}
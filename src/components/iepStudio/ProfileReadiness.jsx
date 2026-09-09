import React from "react";
import { CheckCircle2, AlertTriangle, Gauge } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";

// IEP Readiness score: shows a case manager at a glance what's complete and
// what's missing before an IEP meeting. Computed from real records — no AI.
export default function ProfileReadiness({ student }) {
  const { data: goals } = useAsync(() => base44.entities.Goal.filter({ student_id: student.id }, '-created_date', 100), [student?.id]);
  const { data: progress } = useAsync(() => base44.entities.ProgressData.filter({ student_id: student.id }, '-date', 200), [student?.id]);
  const { data: documents } = useAsync(() => base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 100), [student?.id]);

  const docTypes = (documents || []).map((d) => d.document_type);
  const hasDoc = (type) => docTypes.includes(type);
  const ninetyDaysAgo = Date.now() - 90 * 24 * 3600 * 1000;
  const hasRecentProgress = (progress || []).some((p) => p.date && new Date(p.date).getTime() > ninetyDaysAgo);
  const gradeNum = parseInt(String(student.grade || "").replace(/[^0-9]/g, ""), 10);
  const transitionRelevant = !isNaN(gradeNum) && gradeNum >= 9;

  const checks = [
    { label: "Eligibility", warning: "Missing Eligibility", ok: !!student.eligibility_category },
    { label: "Present Levels", warning: "Missing Present Levels", ok: !!student.present_levels },
    { label: "Goals", warning: "Missing Goals", ok: (goals || []).length > 0 },
    { label: "Services", warning: "Missing Services", ok: !!(student.services && student.services.length) },
    { label: "Accommodations", warning: "Missing Accommodations", ok: !!student.accommodations },
    { label: "Progress Monitoring", warning: "Missing Recent Progress Data", ok: (progress || []).length > 0 },
    { label: "Parent Input", warning: "Missing Parent Input", ok: hasDoc("Parent Input") },
    { label: "Behavior Supports", warning: "Missing Behavior Supports", ok: hasDoc("BIP") || hasDoc("FBA") || hasDoc("Behavior Log") },
  ];
  const warnings = checks.filter((c) => !c.ok).map((c) => c.warning);
  if ((progress || []).length > 0 && !hasRecentProgress) warnings.push("Recent progress data is over 90 days old");
  if (transitionRelevant && !hasDoc("Transition Assessment")) warnings.push("Transition section needs review");

  const complete = checks.filter((c) => c.ok).length;
  const score = Math.round((complete / checks.length) * 100);
  const scoreColor = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  const barColor = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" />IEP Readiness</h3>
        <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-sm">
            {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
            <span className={c.ok ? "" : "text-muted-foreground"}>{c.ok ? c.label : c.warning}</span>
          </div>
        ))}
        {warnings.filter((w) => !checks.some((c) => c.warning === w)).map((w) => (
          <div key={w} className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">{w}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
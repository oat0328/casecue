import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Sparkles, Save, BadgeCheck, ArrowRight, PlayCircle, Plus, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import LessonStepper from "@/components/lessonStudio/LessonStepper";
import AssignmentSource from "@/components/lessonStudio/AssignmentSource";
import AnalysisReview from "@/components/lessonStudio/AnalysisReview";
import PlanEditor from "@/components/lessonStudio/PlanEditor";
import VideoFinder from "@/components/lessonStudio/VideoFinder";
import ResourceFinder from "@/components/lessonStudio/ResourceFinder";
import OriginalPractice from "@/components/lessonStudio/OriginalPractice";
import LessonLibrary from "@/components/lessonStudio/LessonLibrary";
import { normalizePlan } from "@/lib/lessonPlanSchema";
import { cn } from "@/lib/utils";

const todayStr = () => new Date().toISOString().slice(0, 10);

// Lesson Studio — Assignment-to-Lesson-Plan generator: upload & analyze,
// build & customize, review & export. All generated output is a draft the teacher
// reviews, edits, and approves before anything is saved or exported.
export default function LessonStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("create");
  const [step, setStep] = useState(1);
  const [reachedStep, setReachedStep] = useState(1);
  const [target, setTarget] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [plan, setPlan] = useState(null);
  const [standards, setStandards] = useState([]);
  const [goalIds, setGoalIds] = useState([]);
  const [videos, setVideos] = useState([]);
  const [resources, setResources] = useState([]);
  const [practiceMaterials, setPracticeMaterials] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [libraryKey, setLibraryKey] = useState(0);

  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list(), []);

  const selectedStudents = (students || []).filter((s) => (target?.student_ids || []).includes(s.id));
  const candidateGoals = (goals || []).filter((g) => (target?.student_ids || []).includes(g.student_id));
  const verifiedAccommodations = selectedStudents
    .filter((s) => s.accommodations)
    .map((s) => ({ student: `${s.first_name} ${s.last_name}`, accommodations: s.accommodations }));
  const targetLabel = selectedStudents.length
    ? selectedStudents.map((s) => `${s.first_name} ${s.last_name}`).join(", ")
    : target?.group_label || "Instructional group";

  const goStep = (n) => {
    if (n === 2 && !analysis) { toast({ title: "Analyze the assignment first", variant: "destructive" }); return; }
    if (n === 3 && !plan) { toast({ title: "Build the lesson plan first", variant: "destructive" }); return; }
    setStep(n);
    setReachedStep((r) => Math.max(r, n));
  };

  const onAnalyzed = ({ analysis: a, target: t }) => {
    setAnalysis(a);
    setTarget(t);
    setStandards(a.standards_alignment || []);
    setPlan(null);
    setGoalIds([]);
    toast({ title: "Assignment analyzed", description: "Correct anything in the analysis, then continue to build the lesson." });
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateLessonFromAssignment", {
        analysis,
        goals: candidateGoals.filter((g) => goalIds.includes(g.id))
          .map((g) => ({ goal_area: g.goal_area, goal_text: g.goal_text, baseline: g.baseline, criterion: g.criterion, measurement_method: g.measurement_method })),
        verified_accommodations: verifiedAccommodations,
        teacher_name: user?.full_name || "",
        date: todayStr(),
        grade: target?.grade || analysis?.grade_level || "",
        subject: analysis?.subject || "",
        target_label: targetLabel,
        standards,
      });
      const p = normalizePlan(res.data.plan);
      p.teacher = p.teacher || user?.full_name || "";
      p.date = p.date || todayStr();
      p.grade_group = p.grade_group || target?.grade || analysis?.grade_level || "";
      p.subject_skill = p.subject_skill || analysis?.subject || "";
      setPlan(p);
      toast({ title: "Lesson plan drafted", description: "Draft — Teacher Review Required. Edit every section before approving." });
    } catch (e) {
      toast({ title: "Generation failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const buildRecord = (status, isTemplate) => ({
    title: (plan.title || "").trim() || "Untitled lesson",
    date: plan.date || todayStr(),
    source: "assignment",
    student_ids: target?.student_ids || [],
    subject: analysis?.subject || "",
    grade: target?.grade || analysis?.grade_level || "",
    group_label: target?.group_label || "",
    goal_ids: goalIds,
    standards,
    analysis,
    plan,
    videos,
    resources,
    practice_materials: practiceMaterials,
    status,
    is_template: !!isTemplate,
    audit_trail: [...auditTrail, {
      action: editingId
        ? (status === "approved" ? "edited & approved" : "edited")
        : (status === "approved" ? "generated & approved" : "generated"),
      user_name: user?.full_name || user?.email || "",
      timestamp: new Date().toISOString(),
    }],
    objective: plan.iep_objective,
    essential_question: plan.essential_question,
    real_world_connection: plan.real_world_connection,
    mini_lecture: plan.mini_lecture,
    warm_up: plan.anticipatory_set,
    i_do: plan.i_do,
    we_do: plan.we_do,
    you_do: plan.you_do,
    accommodations: plan.accommodations_note,
    data_collection: plan.progress_monitoring,
    reflection: plan.teacher_reflection,
  });

  const save = async (status, asTemplate = false) => {
    if (!plan) return;
    setSaving(true);
    try {
      const record = buildRecord(status, asTemplate);
      if (editingId) {
        await base44.entities.Lesson.update(editingId, record);
      } else {
        const created = await base44.entities.Lesson.create(record);
        setEditingId(created.id);
      }
      setLibraryKey((k) => k + 1);
      toast({
        title: status === "approved" ? "Lesson approved and saved" : `Lesson saved${asTemplate ? " as a template" : " as a draft"}`,
        description: "Export it, or launch a prefilled session from the Lesson Library.",
      });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const loadLesson = (l) => {
    setTab("create");
    setEditingId(l.id);
    setTarget({
      mode: (l.student_ids || []).length ? "students" : "group",
      student_ids: l.student_ids || [],
      group_label: l.group_label || "",
      grade: l.grade || "",
    });
    setAnalysis(l.analysis || {});
    setStandards(l.standards || []);
    setPlan(normalizePlan(l.plan || {}));
    setGoalIds(l.goal_ids || []);
    setVideos(l.videos || []);
    setResources(l.resources || []);
    setPracticeMaterials(l.practice_materials || []);
    setAuditTrail(l.audit_trail || []);
    setStep(2);
    setReachedStep(3);
  };

  const startSession = () => {
    const p = new URLSearchParams();
    const sid = (target?.student_ids || [])[0];
    if (sid) p.set("student_id", sid);
    if (goalIds[0]) p.set("goal_id", goalIds[0]);
    if (plan?.subject_skill) p.set("activity", plan.subject_skill);
    if (plan?.mastery_criterion) p.set("note", `Mastery criterion: ${plan.mastery_criterion}`);
    navigate(`/session-tracker?${p.toString()}`);
  };

  const reset = () => {
    setStep(1); setReachedStep(1); setTarget(null); setAnalysis(null); setPlan(null);
    setStandards([]); setGoalIds([]); setVideos([]); setResources([]); setPracticeMaterials([]);
    setAuditTrail([]); setEditingId(null);
  };

  return (
    <div>
      <PageHeader
        title="Lesson Studio"
        subtitle="Turn any assignment into a complete, IEP-aligned lesson plan — upload and analyze, build and customize, then review and export. Every generated output is a draft you review before anything is saved."
        icon={BookOpen}
        actions={
          <div className="flex gap-2">
            {tab === "create" ? (
              <Button variant="outline" onClick={reset}><Plus className="h-4 w-4 mr-1" /> New lesson</Button>
            ) : null}
          </div>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
        {[["create", "Create from assignment"], ["library", "Lesson Library"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium border", tab === k ? "bg-primary text-white border-primary" : "bg-card border-border")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <LessonLibrary students={students} goals={goals} onEdit={loadLesson} refreshKey={libraryKey} />
      ) : (
        <div>
          <LessonStepper step={step} onStep={goStep} reachedStep={reachedStep} />

          {step === 1 && (
            <div className="space-y-6">
              <AssignmentSource students={students} onComplete={onAnalyzed} analyzing={analyzing} onAnalyzing={setAnalyzing} />
              {analysis && (
                <>
                  <AnalysisReview analysis={analysis} onChange={setAnalysis} />
                  <Button onClick={() => goStep(2)} className="brand-gradient text-white h-11 px-6">
                    Continue to Build &amp; Customize <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <h3 className="font-semibold">Build the lesson plan</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      For: {targetLabel} · from: {analysis?.detected_title || "your assignment"}
                    </p>
                  </div>
                  <Button onClick={generatePlan} disabled={generating} className="brand-gradient text-white h-11 px-6">
                    {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Drafting lesson plan…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate lesson plan</>}
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">Attach IEP goals addressed by this lesson</p>
                  {candidateGoals.length ? (
                    <div className="flex flex-wrap gap-2">
                      {candidateGoals.map((g) => (
                        <button key={g.id} type="button"
                          onClick={() => setGoalIds((ids) => (ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id]))}
                          className={cn("text-sm rounded-full border px-4 py-2 min-h-[40px] text-left", goalIds.includes(g.id) ? "bg-primary text-white border-primary" : "border-border")}>
                          {g.goal_area || "Goal"}: {(g.goal_text || "").slice(0, 70)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedStudents.length
                        ? "These students have no goals on file yet — add goals in Students first."
                        : "Select students in step 1 to pull in their IEP goals, or build for a class and attach goals later."}
                    </p>
                  )}
                </div>
                {plan && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span><strong>Draft — Teacher Review Required.</strong> CaseCue drafts from your verified assignment and student records only. It never guarantees IEP compliance and never changes a student's IEP automatically.</span>
                  </div>
                )}
              </Card>

              {plan && (
                <>
                  <PlanEditor plan={plan} onChange={setPlan} verifiedAccommodations={verifiedAccommodations} />
                  <VideoFinder analysis={analysis} plan={plan} grade={target?.grade || analysis?.grade_level} videos={videos} onChange={setVideos} />
                  <ResourceFinder resources={resources} onChange={setResources} />
                  <OriginalPractice analysis={analysis} plan={plan} grade={target?.grade || analysis?.grade_level} practiceMaterials={practiceMaterials} onChange={setPracticeMaterials} />
                  <Button onClick={() => goStep(3)} className="brand-gradient text-white h-11 px-6">
                    Continue to Review &amp; Export <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 3 && plan && (
            <div className="space-y-6">
              <Card className="p-5 sm:p-6">
                <h3 className="font-semibold mb-2">Review, approve &amp; export</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Everything below is still editable. Approving records you as the reviewer — CaseCue logs who generated, edited, and approved this lesson.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => save("approved")} disabled={saving} className="brand-gradient text-white h-11 px-6">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BadgeCheck className="h-4 w-4 mr-2" />} Approve &amp; Save
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => save("draft")} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" /> Save as draft
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => save("draft", true)} disabled={saving}>
                    Save as template
                  </Button>
                  {editingId && (
                    <Button variant="outline" className="h-11" onClick={startSession}>
                      <PlayCircle className="h-4 w-4 mr-2" /> Start prefilled session
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Approved lessons flow to the Lesson Library for PDF / DOCX export, printing, duplication, and session tracking.
                </p>
              </Card>
              <PlanEditor plan={plan} onChange={setPlan} verifiedAccommodations={verifiedAccommodations} />
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>Draft — Teacher Review Required.</strong> system-assisted content must be reviewed by the educator before use with students. CaseCue never guarantees IEP compliance.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
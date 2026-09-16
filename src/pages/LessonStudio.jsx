import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Save, BadgeCheck, PlayCircle, Plus, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import AssignmentSource from "@/components/lessonStudio/AssignmentSource";
import AnalysisReview from "@/components/lessonStudio/AnalysisReview";
import PlanEditor from "@/components/lessonStudio/PlanEditor";
import VideoFinder from "@/components/lessonStudio/VideoFinder";
import ResourceFinder from "@/components/lessonStudio/ResourceFinder";
import OriginalPractice from "@/components/lessonStudio/OriginalPractice";
import LessonLibrary from "@/components/lessonStudio/LessonLibrary";
import { normalizePlan } from "@/lib/lessonPlanSchema";
import { todayISO } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

// Lesson Studio: normal path is one meaningful action: add today's work -> Create Full Lesson.
// The detailed/admin-ready plan is preserved; analysis, goal matching and customization are progressive disclosure.
export default function LessonStudio() {
  const { user } = useAuth(); const { toast } = useToast(); const navigate = useNavigate();
  const [tab,setTab]=useState("create"); const [target,setTarget]=useState(null); const [analysis,setAnalysis]=useState(null); const [plan,setPlan]=useState(null);
  const [standards,setStandards]=useState([]); const [goalIds,setGoalIds]=useState([]); const [videos,setVideos]=useState([]); const [resources,setResources]=useState([]); const [practiceMaterials,setPracticeMaterials]=useState([]);
  const [auditTrail,setAuditTrail]=useState([]); const [editingId,setEditingId]=useState(null); const [generating,setGenerating]=useState(false); const [analyzing,setAnalyzing]=useState(false); const [saving,setSaving]=useState(false); const [libraryKey,setLibraryKey]=useState(0); const [customize,setCustomize]=useState(false);
  const {data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',200),[]); const {data:goals}=useAsync(()=>base44.entities.Goal.list(),[]);

  const selectedStudents=(students||[]).filter(s=>(target?.student_ids||[]).includes(s.id));
  const candidateGoals=(goals||[]).filter(g=>(target?.student_ids||[]).includes(g.student_id));
  const verifiedAccommodations=selectedStudents.filter(s=>s.accommodations).map(s=>({student:`${s.first_name} ${s.last_name}`,accommodations:s.accommodations}));
  const targetLabel=selectedStudents.length?selectedStudents.map(s=>`${s.first_name} ${s.last_name}`).join(", "):target?.group_label||"Instructional group";

  const makePlan=async(a,t,ids=null)=>{
    setGenerating(true);
    try{
      const studentIds=t?.student_ids||[];
      const matched=(goals||[]).filter(g=>studentIds.includes(g.student_id));
      // Default to all verified goals for selected learners; educator can refine under Customize.
      const selectedGoalIds=ids||matched.map(g=>g.id); setGoalIds(selectedGoalIds);
      const selectedStudentsNow=(students||[]).filter(s=>studentIds.includes(s.id));
      const accommodations=selectedStudentsNow.filter(s=>s.accommodations).map(s=>({student:`${s.first_name} ${s.last_name}`,accommodations:s.accommodations}));
      const label=selectedStudentsNow.length?selectedStudentsNow.map(s=>`${s.first_name} ${s.last_name}`).join(", "):t?.group_label||"Instructional group";
      const std=a?.standards_alignment||[]; setStandards(std);
      const res=await base44.functions.invoke("generateLessonFromAssignment",{analysis:a,goals:matched.filter(g=>selectedGoalIds.includes(g.id)).map(g=>({goal_area:g.goal_area,goal_text:g.goal_text,baseline:g.baseline,criterion:g.criterion,measurement_method:g.measurement_method})),verified_accommodations:accommodations,teacher_name:user?.full_name||"",date:todayISO(),grade:t?.grade||a?.grade_level||"",subject:a?.subject||"",target_label:label,standards:std});
      const p=normalizePlan(res.data.plan); p.teacher=p.teacher||user?.full_name||""; p.date=p.date||todayISO(); p.grade_group=p.grade_group||t?.grade||a?.grade_level||""; p.subject_skill=p.subject_skill||a?.subject||""; setPlan(p);
      toast({title:"Full lesson ready",description:"CaseCue built the detailed plan. Review it, teach it, or open Customize for advanced controls."});
    }catch(e){toast({title:"Generation failed",description:e?.response?.data?.error||e.message,variant:"destructive"});}finally{setGenerating(false);}
  };

  const onAnalyzed=async({analysis:a,target:t})=>{setAnalysis(a);setTarget(t);setPlan(null);await makePlan(a,t);};

  const buildRecord=(status,isTemplate)=>({title:(plan.title||"").trim()||"Untitled lesson",date:plan.date||todayISO(),source:"assignment",student_ids:target?.student_ids||[],subject:analysis?.subject||"",grade:target?.grade||analysis?.grade_level||"",group_label:target?.group_label||"",goal_ids:goalIds,standards,analysis,plan,videos,resources,practice_materials:practiceMaterials,status,is_template:!!isTemplate,audit_trail:[...auditTrail,{action:editingId?(status==="approved"?"edited & approved":"edited"):(status==="approved"?"generated & approved":"generated"),user_name:user?.full_name||user?.email||"",timestamp:new Date().toISOString()}],objective:plan.iep_objective,essential_question:plan.essential_question,real_world_connection:plan.real_world_connection,mini_lecture:plan.mini_lecture,warm_up:plan.anticipatory_set,i_do:plan.i_do,we_do:plan.we_do,you_do:plan.you_do,accommodations:plan.accommodations_note,data_collection:plan.progress_monitoring,reflection:plan.teacher_reflection});
  const save=async(status,asTemplate=false)=>{if(!plan)return;setSaving(true);try{const record=buildRecord(status,asTemplate);if(editingId)await base44.entities.Lesson.update(editingId,record);else{const created=await base44.entities.Lesson.create(record);setEditingId(created.id);}setLibraryKey(k=>k+1);toast({title:status==="approved"?"Lesson approved and saved":asTemplate?"Reusable template saved":"Lesson saved to history"});}catch(e){toast({title:"Save failed",description:e.message,variant:"destructive"});}finally{setSaving(false);}};
  const loadLesson=l=>{setTab("create");setEditingId(l.id);setTarget({mode:(l.student_ids||[]).length?"students":"group",student_ids:l.student_ids||[],group_label:l.group_label||"",grade:l.grade||""});setAnalysis(l.analysis||{});setStandards(l.standards||[]);setPlan(normalizePlan(l.plan||{}));setGoalIds(l.goal_ids||[]);setVideos(l.videos||[]);setResources(l.resources||[]);setPracticeMaterials(l.practice_materials||[]);setAuditTrail(l.audit_trail||[]);};
  const startSession=()=>{const p=new URLSearchParams();const sid=(target?.student_ids||[])[0];if(sid)p.set("student_id",sid);if(goalIds[0])p.set("goal_id",goalIds[0]);if(plan?.subject_skill)p.set("activity",plan.subject_skill);navigate(`/session-tracker?${p.toString()}`);};
  const reset=()=>{setTarget(null);setAnalysis(null);setPlan(null);setStandards([]);setGoalIds([]);setVideos([]);setResources([]);setPracticeMaterials([]);setAuditTrail([]);setEditingId(null);setCustomize(false);};

  return <div><PageHeader title="Lesson Studio" subtitle="Drop today's work. CaseCue builds the complete, admin-ready lesson plan." icon={BookOpen} actions={tab==="create"?<Button variant="outline" onClick={reset}><Plus className="h-4 w-4 mr-1"/>New lesson</Button>:null}/>
    <div className="flex gap-2 mb-5">{[["create","Create Lesson"],["library","Lesson History & Library"]].map(([k,label])=><button key={k} onClick={()=>setTab(k)} className={cn("rounded-full px-4 py-2 text-sm font-medium border",tab===k?"bg-primary text-white border-primary":"bg-card border-border")}>{label}</button>)}</div>
    {tab==="library"?<LessonLibrary students={students} goals={goals} onEdit={loadLesson} refreshKey={libraryKey}/>:!plan?<div><AssignmentSource students={students} onComplete={onAnalyzed} analyzing={analyzing||generating} onAnalyzing={setAnalyzing}/>{generating&&<Card className="p-8 mt-5 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto"/><h3 className="font-semibold mt-3">Building the full lesson plan…</h3><p className="text-sm text-muted-foreground mt-1">Analyzing the assignment, matching verified goals and accommodations, and writing the detailed teacher plan.</p></Card>}</div>:
      <div className="space-y-5">
        <Card className="p-5 sm:p-6"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Lesson ready</p><h2 className="text-xl font-bold mt-1">{plan.title||analysis?.detected_title||"Today's Lesson"}</h2><p className="text-sm text-muted-foreground mt-1">{targetLabel} · {plan.duration||"30 minutes"} · {plan.subject_skill||analysis?.subject||"Instruction"}</p></div><div className="flex flex-wrap gap-2"><Button onClick={()=>save("approved")} disabled={saving} className="brand-gradient text-white"><BadgeCheck className="h-4 w-4 mr-2"/>Approve & Save</Button><Button variant="outline" onClick={startSession}><PlayCircle className="h-4 w-4 mr-2"/>Teach / Take Data</Button><Button variant="outline" onClick={()=>setCustomize(v=>!v)}><SlidersHorizontal className="h-4 w-4 mr-2"/>Customize</Button></div></div><div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0"/><span><strong>Educator review required.</strong> The full plan uses verified records where available; CaseCue does not change the IEP.</span></div></Card>
        <PlanEditor plan={plan} onChange={setPlan} verifiedAccommodations={verifiedAccommodations}/>
        {customize&&<div className="space-y-5"><Card className="p-5"><h3 className="font-semibold mb-3">Advanced lesson controls</h3><p className="text-sm text-muted-foreground mb-3">Goals are matched automatically. Change them only when this lesson addresses a different verified goal.</p><div className="flex flex-wrap gap-2">{candidateGoals.map(g=><button key={g.id} onClick={()=>setGoalIds(ids=>ids.includes(g.id)?ids.filter(x=>x!==g.id):[...ids,g.id])} className={cn("text-sm rounded-full border px-3 py-2",goalIds.includes(g.id)?"bg-primary text-white border-primary":"border-border")}>{g.goal_area||"Goal"}: {(g.goal_text||"").slice(0,60)}</button>)}</div><details className="mt-5"><summary className="cursor-pointer text-sm font-medium">View/correct assignment analysis</summary><div className="mt-4"><AnalysisReview analysis={analysis} onChange={setAnalysis}/></div></details></Card><VideoFinder analysis={analysis} plan={plan} grade={target?.grade||analysis?.grade_level} videos={videos} onChange={setVideos}/><ResourceFinder resources={resources} onChange={setResources}/><OriginalPractice analysis={analysis} plan={plan} grade={target?.grade||analysis?.grade_level} practiceMaterials={practiceMaterials} onChange={setPracticeMaterials}/></div>}
        <Card className="p-5"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>save("draft")} disabled={saving}><Save className="h-4 w-4 mr-2"/>Save to lesson history</Button><Button variant="outline" onClick={()=>save("draft",true)} disabled={saving}>Save as reusable template</Button></div><p className="text-xs text-muted-foreground mt-3">Regular lessons stay in Lesson History. A lesson becomes reusable only when you intentionally save it as a template; Sub Plans remain separate.</p></Card>
      </div>}
  </div>;
}
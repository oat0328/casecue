import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FileEdit } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import StudentSelector from "@/components/forms/StudentSelector";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UploadCenterTab from "@/components/iepStudio/UploadCenterTab";
import FerpaUploadNotice from "@/components/shared/FerpaUploadNotice";
import WorkspacePipeline from "@/components/iepStudio/WorkspacePipeline";
import SectionDrafter from "@/components/iepStudio/SectionDrafter";
import StudentOverviewTab from "@/components/iepStudio/StudentOverviewTab";
import AiSummaryTab from "@/components/iepStudio/AiSummaryTab";
import GoalsProgressTab from "@/components/iepStudio/GoalsProgressTab";
import BipFbaTab from "@/components/iepStudio/BipFbaTab";
import AmendmentsTab from "@/components/iepStudio/AmendmentsTab";
import MeetingCenterTab from "@/components/iepStudio/MeetingCenterTab";
import ComplianceReviewTab from "@/components/iepStudio/ComplianceReviewTab";
import ParentSummaryTab from "@/components/iepStudio/ParentSummaryTab";
import IEPReadyBridge from "@/components/iepStudio/IEPReadyBridge";
import MetMdtBuilder from "@/components/iepStudio/MetMdtBuilder";
import StateAwareIepFlow from "@/components/iepStudio/StateAwareIepFlow";
import BaselineAssessmentStudio from "@/components/iepStudio/BaselineAssessmentStudio";

const ACCOMMODATION_SDI_SECTIONS = [
  { key: "accommodations", label: "Accommodations" },
  { key: "sdi", label: "SDI / Support Language" },
];

const GETTING_STARTED = ["Select Student", "Upload Any State IEP / Evaluation", "Review Evidence & Gaps", "Build Evidence-Linked IEP Draft", "Run Readiness & Meeting Prep"];

const TAB_TIPS = [
  ["flow", "Guided IEP Flow", "State-aware IEP blueprint that detects the jurisdiction from uploaded records and walks the teacher through the correct sequence."],
  ["overview", "Student Record", "The verified student record at a glance, with the readiness score, Meeting Mode, and Copilot."],
  ["summary", "CaseCue Summary", "CaseCue-generated summary of every uploaded document for educator review."],
  ["builder", "IEP Builder", "Evidence-first builder: source documents → page-level extraction → present levels → aligned goals → services/accommodations → review & export."],
  ["met-mdt", "MET / MDT Builder", "Turn processed MDT/MET/evaluation records into source-grounded MET 1 or MET 2 present levels, goal drafts, impact, accommodations/SDI, data gaps, and meeting talking points."],
  ["baseline", "Baseline Assessment", "Generate an original educator-administered baseline, score the student's actual performance, then draft present levels and measurable goal options from verified results."],
  ["iep-ready", "IEP Ready", "Combine school/SIS context and CaseCue SPED evidence, trace sources, review the draft, and prepare an approved transfer back to the district system."],
  ["goals", "Goals & Progress", "Goals with live progress graphs — green on track, yellow monitor, red at risk."],
  ["accommodations", "Accommodations & SDI", "Draft and manage accommodations and specially designed instruction language."],
  ["behavior", "BIP & FBA", "Analyze FBAs and BIPs — triggers, function of behavior, replacement behaviors, and BIP drafts."],
  ["amendments", "Amendments", "Compare current vs. new information and generate formal amendment language."],
  ["meeting", "Meeting Center", "One click generates the full meeting packet, page-by-page script, and talking points."],
  ["parent", "Parent Summary", "A dedicated parent-friendly summary of the verified record and progress — with full export options."],
  ["compliance", "Compliance", "Review findings and alerts before finalizing — missing sections, weak goals, inconsistencies."],
];

export default function IEPStudio() {
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [studentId, setStudentId] = useState(() => new URLSearchParams(window.location.search).get("student") || "");
  const [tab, setTab] = useState("flow");
  const [meetingAuto, setMeetingAuto] = useState(false);
  const student = (students || []).find((s) => s.id === studentId);

  return (
    <div>
      <PageHeader title="IEP Studio" subtitle="Universal IEP workspace — bring school context and SPED evidence together, preserve source-level evidence, draft and review the IEP, prepare meetings, and move approved information into the district workflow." icon={FileEdit} />
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">CaseCue drafts, you decide. Every section stays a draft until the IEP team approves it — CaseCue never finalizes an IEP, makes a diagnosis, makes a placement decision, or silently writes to an official district record.</div>
      <Card className="p-5 mb-6" id="iep-studio-selector"><StudentSelector students={students || []} value={studentId} onChange={setStudentId} noBottomSpace /></Card>
      {!student ? (
        <Card className="p-6 sm:p-8 brand-gradient-soft border-primary/20">
          <h2 className="text-2xl font-bold tracking-tight">Welcome to IEP Studio</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-2xl">Everything IEP happens here — upload an IEP, MDT, evaluation, reevaluation, progress report, behavior plan, transition assessment, or supporting record from any U.S. state. <strong className="text-foreground">Select a student above to begin.</strong></p>
          <div className="grid gap-3 sm:grid-cols-5 mb-6">{GETTING_STARTED.map((label, i) => <div key={label} className="rounded-xl bg-card border border-border p-3.5"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full brand-gradient text-white text-xs font-bold mb-2">{i + 1}</span><p className="text-sm font-medium leading-snug">{label}</p></div>)}</div>
          <div className="flex flex-wrap gap-2"><Button className="brand-gradient text-white" onClick={() => document.getElementById("iep-studio-selector")?.querySelector("select")?.focus()}>Start Here</Button><Button variant="outline" asChild><Link to="/help">How to use IEP Studio</Link></Button>{(students || []).length === 0 && <Button variant="outline" asChild><Link to="/students">Add your first student</Link></Button>}</div>
        </Card>
      ) : <>
        <div className="mb-4"><FerpaUploadNotice /></div>
        <div className="mb-8"><UploadCenterTab key={student.id} student={student} onProfileBuilt={() => setTab("flow")} onNavigate={setTab} /></div>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-1 px-1 pb-1"><TooltipProvider delayDuration={250}><TabsList className="flex-wrap h-auto gap-1 w-max min-w-full">{TAB_TIPS.map(([value,label,tip]) => <Tooltip key={value}><TooltipTrigger asChild><TabsTrigger value={value}>{label}</TabsTrigger></TooltipTrigger><TooltipContent side="bottom" className="max-w-[240px]">{tip}</TooltipContent></Tooltip>)}</TabsList></TooltipProvider></div>
          <TabsContent value="flow" className="mt-6"><StateAwareIepFlow student={student} onNavigate={setTab} /></TabsContent>
          <TabsContent value="overview" className="mt-6"><StudentOverviewTab student={student} onRunMeetingMode={() => { setMeetingAuto(true); setTab("meeting"); }} /></TabsContent>
          <TabsContent value="summary" className="mt-6"><AiSummaryTab student={student} /></TabsContent>
          <TabsContent value="builder" className="mt-6"><WorkspacePipeline student={student} /></TabsContent>
          <TabsContent value="met-mdt" className="mt-6"><MetMdtBuilder student={student} /></TabsContent>
          <TabsContent value="baseline" className="mt-6"><BaselineAssessmentStudio student={student} /></TabsContent>
          <TabsContent value="iep-ready" className="mt-6"><IEPReadyBridge student={student} /></TabsContent>
          <TabsContent value="goals" className="mt-6"><GoalsProgressTab student={student} /></TabsContent>
          <TabsContent value="accommodations" className="mt-6"><SectionDrafter student={student} sections={ACCOMMODATION_SDI_SECTIONS} /></TabsContent>
          <TabsContent value="behavior" className="mt-6"><BipFbaTab student={student} /></TabsContent>
          <TabsContent value="amendments" className="mt-6"><AmendmentsTab student={student} /></TabsContent>
          <TabsContent value="meeting" className="mt-6"><MeetingCenterTab student={student} autoGenerate={meetingAuto} onGenerated={() => setMeetingAuto(false)} /></TabsContent>
          <TabsContent value="parent" className="mt-6"><ParentSummaryTab student={student} /></TabsContent>
          <TabsContent value="compliance" className="mt-6"><ComplianceReviewTab student={student} /></TabsContent>
        </Tabs>
      </>}
    </div>
  );
}

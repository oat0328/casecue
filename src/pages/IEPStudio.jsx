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
import WorkspacePipeline from "@/components/iepStudio/WorkspacePipeline";
import SectionDrafter from "@/components/iepStudio/SectionDrafter";
import StudentOverviewTab from "@/components/iepStudio/StudentOverviewTab";
import AiSummaryTab from "@/components/iepStudio/AiSummaryTab";
import GoalsProgressTab from "@/components/iepStudio/GoalsProgressTab";
import BipFbaTab from "@/components/iepStudio/BipFbaTab";
import AmendmentsTab from "@/components/iepStudio/AmendmentsTab";
import MeetingCenterTab from "@/components/iepStudio/MeetingCenterTab";
import ComplianceReviewTab from "@/components/iepStudio/ComplianceReviewTab";

// IEP Studio — the single source of truth for all IEP work: uploads, analysis,
// drafting, goals, accommodations, behavior, amendments, meetings, compliance.
const ACCOMMODATION_SDI_SECTIONS = [
  { key: "accommodations", label: "Accommodations" },
  { key: "sdi", label: "SDI / Support Language" },
];

const GETTING_STARTED = ["Select Student", "Upload Documents", "Review AI Analysis", "Generate IEP Draft", "Prepare For Meeting"];

const TAB_TIPS = [
  ["overview", "Overview", "The verified student record at a glance, with the readiness score, Meeting Mode, and Copilot."],
  ["documents", "Upload Center", "The only upload point — drag files in and CaseCue reads, analyzes, and pre-fills the profile automatically."],
  ["summary", "AI Summary", "AI-generated summary of every uploaded document."],
  ["builder", "IEP Builder", "The 4-step pipeline: documents → extraction review → IEP draft → review & export."],
  ["goals", "Goals & Progress", "Goals with live progress graphs — green on track, yellow monitor, red at risk."],
  ["accommodations", "Accommodations & SDI", "Draft and manage accommodations and specially designed instruction language."],
  ["behavior", "BIP & FBA", "Analyze FBAs and BIPs — triggers, function of behavior, replacement behaviors, and BIP drafts."],
  ["amendments", "Amendments", "Compare current vs. new information and generate formal amendment language."],
  ["meeting", "Meeting Center", "One click generates the full meeting packet, page-by-page script, and talking points."],
  ["compliance", "Compliance", "Review findings and alerts before finalizing — missing sections, weak goals, inconsistencies."],
];

export default function IEPStudio() {
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [studentId, setStudentId] = useState("");
  const [tab, setTab] = useState("overview");
  const [meetingAuto, setMeetingAuto] = useState(false);
  const student = (students || []).find((s) => s.id === studentId);

  return (
    <div>
      <PageHeader
        title="IEP Studio"
        subtitle="The single IEP workspace — upload documents once, and CaseCue handles analysis, drafting, amendments, behavior planning, meetings, progress monitoring, and compliance from here."
        icon={FileEdit}
      />

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">
        CaseCue drafts, you decide. Every section stays a draft until the IEP team approves it — CaseCue never finalizes an IEP, makes a diagnosis, or makes a placement decision.
      </div>

      <Card className="p-5 mb-6" id="iep-studio-selector">
        <StudentSelector
          students={students || []}
          value={studentId}
          onChange={(id) => {
            setStudentId(id);
            // Uploading is step 1 of the workflow — land on the Upload Center immediately.
            setTab("documents");
          }}
          noBottomSpace
        />
      </Card>

      {!student ? (
        <Card className="p-6 sm:p-8 brand-gradient-soft border-primary/20">
          <h2 className="text-2xl font-bold tracking-tight">Welcome to IEP Studio</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-2xl">
            Everything IEP happens here — upload documents once and CaseCue automatically reads them, builds the student profile, pre-fills every section, and prepares your meeting.
          </p>
          <div className="grid gap-3 sm:grid-cols-5 mb-6">
            {GETTING_STARTED.map((label, i) => (
              <div key={label} className="rounded-xl bg-card border border-border p-3.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full brand-gradient text-white text-xs font-bold mb-2">{i + 1}</span>
                <p className="text-sm font-medium leading-snug">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="brand-gradient text-white"
              onClick={() => document.getElementById("iep-studio-selector")?.querySelector("select")?.focus()}
            >
              Start Here
            </Button>
            <Button variant="outline" asChild>
              <Link to="/help">How to use IEP Studio</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <TooltipProvider delayDuration={250}>
              <TabsList className="flex-wrap h-auto gap-1 w-max min-w-full">
                {TAB_TIPS.map(([value, label, tip]) => (
                  <Tooltip key={value}>
                    <TooltipTrigger asChild>
                      <TabsTrigger value={value}>{label}</TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px]">{tip}</TooltipContent>
                  </Tooltip>
                ))}
              </TabsList>
            </TooltipProvider>
          </div>

          <TabsContent value="overview" className="mt-6">
            <StudentOverviewTab
              student={student}
              onRunMeetingMode={() => { setMeetingAuto(true); setTab("meeting"); }}
            />
          </TabsContent>
          <TabsContent value="documents" className="mt-6">
            <UploadCenterTab student={student} onProfileBuilt={() => setTab("overview")} onNavigate={setTab} />
          </TabsContent>
          <TabsContent value="summary" className="mt-6">
            <AiSummaryTab student={student} />
          </TabsContent>
          <TabsContent value="builder" className="mt-6">
            <WorkspacePipeline student={student} />
          </TabsContent>
          <TabsContent value="goals" className="mt-6">
            <GoalsProgressTab student={student} />
          </TabsContent>
          <TabsContent value="accommodations" className="mt-6">
            <SectionDrafter student={student} sections={ACCOMMODATION_SDI_SECTIONS} />
          </TabsContent>
          <TabsContent value="behavior" className="mt-6">
            <BipFbaTab student={student} />
          </TabsContent>
          <TabsContent value="amendments" className="mt-6">
            <AmendmentsTab student={student} />
          </TabsContent>
          <TabsContent value="meeting" className="mt-6">
            <MeetingCenterTab student={student} autoGenerate={meetingAuto} onGenerated={() => setMeetingAuto(false)} />
          </TabsContent>
          <TabsContent value="compliance" className="mt-6">
            <ComplianceReviewTab student={student} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
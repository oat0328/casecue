import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FileEdit } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
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

export default function IEPStudio() {
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [studentId, setStudentId] = useState("");
  const [tab, setTab] = useState("overview");
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

      <Card className="p-5 mb-6">
        <StudentSelector
          students={students || []}
          value={studentId}
          onChange={setStudentId}
          noBottomSpace
        />
      </Card>

      {!student ? (
        <p className="text-muted-foreground text-sm">
          Select a student to begin. Upload the current IEP and latest documentation, and CaseCue will extract, cite, and draft — you verify and approve every step.
        </p>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <TabsList className="flex-wrap h-auto gap-1 w-max min-w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Upload Center</TabsTrigger>
              <TabsTrigger value="summary">AI Summary</TabsTrigger>
              <TabsTrigger value="builder">IEP Builder</TabsTrigger>
              <TabsTrigger value="goals">Goals &amp; Progress</TabsTrigger>
              <TabsTrigger value="accommodations">Accommodations &amp; SDI</TabsTrigger>
              <TabsTrigger value="behavior">BIP &amp; FBA</TabsTrigger>
              <TabsTrigger value="amendments">Amendments</TabsTrigger>
              <TabsTrigger value="meeting">Meeting Center</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            <StudentOverviewTab student={student} />
          </TabsContent>
          <TabsContent value="documents" className="mt-6">
            <UploadCenterTab student={student} onProfileBuilt={() => setTab("overview")} />
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
            <MeetingCenterTab student={student} />
          </TabsContent>
          <TabsContent value="compliance" className="mt-6">
            <ComplianceReviewTab student={student} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
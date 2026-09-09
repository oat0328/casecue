import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FileEdit, ClipboardList, ShieldCheck, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StudentSelector from "@/components/forms/StudentSelector";
import WorkspacePipeline from "@/components/iepStudio/WorkspacePipeline";
import SectionDrafter from "@/components/iepStudio/SectionDrafter";

// IEP Studio — the single source of truth for IEP work: document upload and
// analysis, the evidence-backed IEP pipeline, section drafting, compliance
// review, and meeting prep all start here.
export default function IEPStudio() {
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [studentId, setStudentId] = useState("");
  const student = (students || []).find((s) => s.id === studentId);

  return (
    <div>
      <PageHeader
        title="IEP Studio"
        subtitle="The single IEP workspace — upload and analyze documents, draft and edit the IEP, review compliance, and prepare meetings."
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
          Select a student to begin. Upload the current IEP and latest evaluation, and CaseCue will extract, cite, and draft — you verify and approve every step.
        </p>
      ) : (
        <>
          <Tabs defaultValue="workspace">
            <TabsList className="mb-6">
              <TabsTrigger value="workspace">New IEP Workspace</TabsTrigger>
              <TabsTrigger value="drafter">Section Drafter</TabsTrigger>
            </TabsList>
            <TabsContent value="workspace">
              <WorkspacePipeline student={student} />
            </TabsContent>
            <TabsContent value="drafter">
              <SectionDrafter student={student} />
            </TabsContent>
          </Tabs>

          <Card className="p-5 mt-6">
            <h3 className="font-semibold mb-3">Continue for {student.first_name} {student.last_name}</h3>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/meeting-navigator"><ClipboardList className="h-4 w-4 mr-1.5" /> Meeting Navigator (cheat sheet)</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/iep-review"><ShieldCheck className="h-4 w-4 mr-1.5" /> Compliance review</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/students/${student.id}`}><User className="h-4 w-4 mr-1.5" /> Student 360 & goal board</Link>
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
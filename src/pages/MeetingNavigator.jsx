import React, { useState, useEffect } from "react";
import { ClipboardList, Loader2, Download, Play } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import StepCard from "@/components/meetingCheatSheet/StepCard";
import MeetingMode from "@/components/meetingCheatSheet/MeetingMode";
import { exportMeetingNavigatorPdf } from "@/lib/pdfExport";
import ExportGate from "@/components/shared/ExportGate";
import ExportBar from "@/components/shared/ExportBar";
import StudentSelector from "@/components/forms/StudentSelector";

// IEP Meeting Navigator: a 32-section guided workspace filled with the student's
// verified records so the teacher can present the entire IEP meeting with confidence.
export default function MeetingNavigator() {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [record, setRecord] = useState(null);
  const [idx, setIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [inMeeting, setInMeeting] = useState(false);

  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: sheets } = useAsync(
    () => studentId ? base44.entities.MeetingCheatSheet.filter({ student_id: studentId }, '-created_date', 1) : Promise.resolve([]),
    [studentId]
  );
  const { data: documents } = useAsync(
    () => studentId ? base44.entities.Document.filter({ student_id: studentId }, '-date_uploaded', 10) : Promise.resolve([]),
    [studentId]
  );

  useEffect(() => {
    setRecord((sheets || [])[0] || null);
    setIdx((sheets || [])[0]?.current_step || 0);
  }, [sheets]);

  const student = (students || []).find((s) => s.id === studentId);
  const steps = record?.steps || [];
  const discussedCount = steps.filter((s) => s.discussed).length;

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateMeetingCheatSheet", { student_id: studentId });
      setRecord(res.data.cheat_sheet);
      setIdx(0);
      toast({ title: "Meeting guide ready", description: "Review each section — verified facts and suggestions are separated." });
    } catch (e) {
      toast({ title: "Could not prepare the meeting guide", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const save = async (patch) => {
    if (!record) return;
    const updated = await base44.entities.MeetingCheatSheet.update(record.id, patch);
    setRecord((r) => ({ ...(updated || r), ...patch }));
  };

  const openOriginal = async () => {
    if (!(documents || []).length) { toast({ title: "No documents uploaded for this student yet" }); return; }
    try {
      const res = await base44.functions.invoke("openDocumentUrl", { document_id: documents[0].id });
      window.open(res.data.signed_url, "_blank");
    } catch (e) {
      toast({ title: "Could not open document", description: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const exportPacket = async () => {
    setExporting(true);
    try {
      exportMeetingNavigatorPdf(student, record);
      toast({ title: "Meeting Preparation Packet ready", description: "The PDF downloaded to your device." });
    } catch (e) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  return (
    <div>
      <PageHeader
        title="IEP Meeting Navigator"
        subtitle="Move confidently through every part of the IEP meeting with verified student information, suggested talking points, source references, team decisions and follow-up tasks in one guided workspace."
        icon={ClipboardList}
      />

      <Card className="p-5 mb-5">
        <StudentSelector
          students={students || []}
          value={studentId}
          onChange={setStudentId}
          noBottomSpace
        />
      </Card>

      {studentId && !record && (
        <Card className="p-8 text-center">
          <ClipboardList className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold">Prepare the 32-section meeting guide</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
            CaseCue builds the guide from the student's records, goals, session data, and any New IEP Workspace draft — every item shows its source, and missing information is labeled so you can capture it in the meeting. CaseCue never decides anything — the team does.
          </p>
          <Button className="brand-gradient text-white mt-4 h-11 px-6" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {generating ? "Preparing meeting guide…" : "Prepare Meeting Guide"}
          </Button>
        </Card>
      )}

      {record && (
        <>
          <Card className="p-5 mb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold">{student ? `${student.first_name} ${student.last_name}` : ""} — {steps.length} sections</h3>
                <p className="text-sm text-muted-foreground">{discussedCount} discussed · {steps.filter((s) => s.flagged).length} flagged for follow-up · status: {record.status}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button className="brand-gradient text-white" onClick={() => setInMeeting(true)}><Play className="h-4 w-4 mr-2" /> Start Meeting Mode</Button>
                <ExportGate documentName="Meeting Preparation Packet" onExport={exportPacket}>
                  <Button variant="outline" disabled={exporting}>
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Meeting Preparation Packet
                  </Button>
                </ExportGate>
                <Button variant="outline" onClick={generate} disabled={generating}>{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Regenerate</Button>
                <ExportBar
                  title={`Meeting Preparation Packet — ${student ? `${student.first_name} ${student.last_name}` : "Student"}`}
                  subtitle={`${steps.length}-section meeting guide`}
                  filename={`Meeting-Guide-${student ? student.first_name : "Student"}`}
                  exclude={["pdf"]}
                  gated
                  sections={steps.map((s) => ({
                    heading: `${s.index ? s.index + ". " : ""}${s.title}`,
                    body: [
                      s.key_info,
                      (s.talking_points || []).map((t) => `• ${t}`).join("\n"),
                      (s.questions || []).map((q) => `? ${q}`).join("\n"),
                      s.source && `Source: ${s.source}`,
                    ].filter(Boolean).join("\n"),
                  }))}
                />
              </div>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden mt-3">
              <div className="h-full brand-gradient" style={{ width: `${steps.length ? (discussedCount / steps.length) * 100 : 0}%` }} />
            </div>
          </Card>

          <div className="flex items-center justify-between gap-2 mb-3">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Previous section</Button>
            <span className="text-sm text-muted-foreground">Section {idx + 1} of {steps.length}</span>
            <Button variant="outline" disabled={idx >= steps.length - 1} onClick={() => setIdx(idx + 1)}>Next section →</Button>
          </div>

          <StepCard
            step={steps[idx] || {}}
            index={idx}
            onPatch={(patch) => save({ steps: steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)), current_step: idx })}
            onOpenOriginal={openOriginal}
          />
        </>
      )}

      {inMeeting && record && (
        <MeetingMode student={student} record={record} onSave={save} onExit={() => setInMeeting(false)} onOpenOriginal={openOriginal} />
      )}
    </div>
  );
}
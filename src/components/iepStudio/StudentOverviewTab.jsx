import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, GraduationCap, CalendarClock, Heart, Target, FileText, Wrench, Clock, Mic, ExternalLink, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import ProfileReadiness from "@/components/iepStudio/ProfileReadiness";
import ExportBar from "@/components/shared/ExportBar";
import StudentBinder from "@/components/shared/StudentBinder";

const FACTS = [
  { label: "Eligibility", value: "eligibility_category", icon: GraduationCap },
  { label: "Grade", value: "grade", icon: GraduationCap },
  { label: "IEP Date", value: "iep_date", icon: FileText },
  { label: "Annual Review Due", value: "annual_review_due", icon: CalendarClock },
  { label: "Reevaluation Due", value: "reevaluation_due", icon: Clock },
];

const SECTIONS = [
  { label: "Strengths", value: "strengths", icon: Heart },
  { label: "Areas of Need", value: "areas_of_need", icon: Target },
  { label: "Present Levels", value: "present_levels", icon: FileText },
  { label: "Accommodations", value: "accommodations", icon: Wrench },
];

const COPILOT_PROMPTS = [
  "Summarize this student",
  "Build a new IEP",
  "Review an MDT",
  "Generate SDI",
  "Create goals",
  "Draft amendments",
  "Review accommodations",
  "Analyze a BIP",
  "Create meeting notes",
  "Create parent summary",
  "Prepare me for this meeting",
];

// Tab 1 — Student Overview: the verified record at a glance.
export default function StudentOverviewTab({ student, onRunMeetingMode }) {
  const { data: workspaces } = useAsync(() => base44.entities.IepWorkspace.filter({ student_id: student.id }, '-created_date', 1), [student?.id]);
  const { data: documents } = useAsync(() => base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 100), [student?.id]);
  const { data: evidence } = useAsync(() => base44.entities.StudentEvidence.filter({ student_id: student.id }, '-date', 100), [student?.id]);
  const { data: servicePlans } = useAsync(() => base44.entities.ServicePlan.filter({ student_id: student.id }, '-start_date', 100), [student?.id]);
  const { data: supplementaryAids } = useAsync(() => base44.entities.SupplementaryAid.filter({ student_id: student.id }, '-start_date', 100), [student?.id]);
  const latestAnalysis = workspaces?.[0]?.analysis?.auto_extracted || null;
  const ieps = (documents || []).filter(d => d.document_type === 'IEP');
  const supporting = (documents || []).filter(d => d.document_type !== 'IEP');
  const currentIep = ieps.find(d=>['current','final'].includes(d.iep_role)) || ieps[0];
  const openDocument=async d=>{if(!d?.file_url)return;try{const signed=await base44.integrations.Core.CreateFileSignedUrl({file_uri:d.file_url,expires_in:900});window.open(signed.signed_url,'_blank','noopener,noreferrer');}catch{window.open(d.file_url,'_blank','noopener,noreferrer')}};
  return (
    <div className="space-y-6">
      <Card className="p-5 brand-gradient text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 font-semibold mb-1"><Mic className="h-4 w-4" />Meeting Mode</div>
          <p className="text-sm text-white/85">
            One click prepares the full meeting packet, page-by-page IEP summary, talking points, and parent-friendly explanations — everything you need to walk into the IEP meeting ready.
          </p>
        </div>
        <Button onClick={onRunMeetingMode} variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90 shrink-0">
          🎤 Run Meeting Mode
        </Button>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FACTS.map(({ label, value, icon: Icon }) => (
          <Card key={value} className="p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium"><Icon className="h-3.5 w-3.5" />{label}</div>
            <div className="mt-1.5 font-semibold text-sm">{student[value] || <span className="text-muted-foreground font-normal">Not on file</span>}</div>
          </Card>
        ))}
      </div>

      <ExportBar
        title={`Student Snapshot — ${student.first_name} ${student.last_name}`}
        subtitle="Verified student record"
        filename={`Student-Snapshot-${student.first_name}-${student.last_name}`}
        banner="Compiled from the verified student record and uploaded documents — educator review required."
        gated
        sections={[
          { heading: "Eligibility", body: student.eligibility_category },
          { heading: "Grade", body: student.grade },
          { heading: "IEP Date", body: student.iep_date },
          { heading: "Annual Review Due", body: student.annual_review_due },
          { heading: "Reevaluation Due", body: student.reevaluation_due },
          { heading: "Strengths", body: student.strengths },
          { heading: "Areas of Need", body: student.areas_of_need },
          { heading: "Present Levels", body: student.present_levels },
          { heading: "Accommodations", body: student.accommodations },
          { heading: "Services", body: (student.services || []).join(", ") },
          { heading: "Notes", body: student.notes },
        ].filter((s) => s.body)}
      />

      <Card className="p-5 border-blue-200 bg-blue-50/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-blue-700"/>Current IEP</div><p className="mt-1 text-sm text-muted-foreground">Keep the actual IEP one click away while you work. Teachers do not need to leave the student record and hunt for the file.</p>{currentIep&&<div className="mt-2 text-xs font-medium">{currentIep.filename}{currentIep.effective_date?` · Effective ${currentIep.effective_date}`:''}</div>}</div><Button disabled={!currentIep?.file_url} onClick={()=>openDocument(currentIep)}><ExternalLink className="mr-2 h-4 w-4"/>Open Full IEP</Button></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map(({ label, value, icon: Icon }) => (
          <Card key={value} className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-2"><Icon className="h-4 w-4 text-primary" />{label}</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {student[value] || "Not on file — generate it in the Student Summary or Section Drafter tabs, or upload documents and let CaseCue extract it."}
            </p>
          </Card>
        ))}
        <Card className="p-5"><div className="flex items-center gap-2 font-semibold mb-2"><Wrench className="h-4 w-4 text-primary"/>Supplementary Aids & Services</div>{supplementaryAids?.length?supplementaryAids.map(a=><div key={a.id} className="mb-2 rounded-xl border p-3 text-sm"><div className="font-semibold">{a.aid_service}</div><div className="text-xs text-muted-foreground">{[a.condition,a.frequency,a.location].filter(Boolean).join(' · ')}</div></div>):<p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.supplementary_aids_services||'No supplementary aids/services on file.'}</p>}</Card>
        <Card className="p-5"><div className="flex items-center gap-2 font-semibold mb-2"><Clock className="h-4 w-4 text-primary"/>SDI, Services & Minutes</div>{servicePlans?.length?servicePlans.map(s=><div key={s.id} className="mb-2 rounded-xl border p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold">{s.service_type}</span><span className="font-black text-blue-700">{s.minutes?`${s.minutes} min/${s.period||'period'}`:'Minutes need review'}</span></div><div className="text-xs text-muted-foreground">{[s.frequency,s.setting,s.delivery_model,s.provider_role].filter(Boolean).join(' · ')}</div></div>):<><p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.sdi||'No structured SDI/service plan on file yet.'}</p>{student.services?.length?<ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{student.services.map((s,i)=><li key={i}>{s}</li>)}</ul>:null}{student.service_minutes?<p className="mt-2 text-sm font-semibold">{student.service_minutes} service minutes on file.</p>:null}</>}</Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold mb-2"><FileText className="h-4 w-4 text-primary" />Notes</div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.notes || "No notes on file."}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="font-semibold mb-1">Student Record Timeline</div>
        <p className="text-sm text-muted-foreground mb-4">Old IEPs, new drafts, final IEPs, MDT/evaluation records and classroom evidence stay connected to {student.first_name} instead of replacing one another.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border p-4"><div className="text-2xl font-black">{ieps.length}</div><div className="text-sm font-medium">IEP version{ieps.length===1?'':'s'}</div><div className="text-xs text-muted-foreground mt-1">{ieps.map(d=>d.iep_role||'unclassified').join(' · ') || 'Upload an IEP to begin'}</div></div>
          <div className="rounded-xl border p-4"><div className="text-2xl font-black">{supporting.length}</div><div className="text-sm font-medium">Supporting records</div><div className="text-xs text-muted-foreground mt-1">MDT, evaluations, progress, teacher/parent input and reports</div></div>
          <div className="rounded-xl border p-4"><div className="text-2xl font-black">{(evidence||[]).length}</div><div className="text-sm font-medium">Evidence points</div><div className="text-xs text-muted-foreground mt-1">Assignments, IXL, sessions and progress data can feed future IEP writing</div></div>
        </div>
      </Card>

      <ProfileReadiness student={student} analysis={latestAnalysis} />

      <StudentBinder student={student} />

      <Card className="p-5 brand-gradient text-white">
        <div className="flex items-center gap-2 font-semibold mb-1"><Sparkles className="h-4 w-4" />CaseCue Copilot</div>
        <p className="text-sm text-white/85 mb-3">
          Your case workspace assistant. Ask CaseCue to build an IEP draft, review an MDT, summarize records, create goals, generate SDI, draft amendments, analyze a BIP, or write meeting notes — it uses the student's uploaded records as context.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {COPILOT_PROMPTS.map((t) => (
            <span key={t} className="text-xs bg-white/15 border border-white/20 rounded-full px-2.5 py-1">{t}</span>
          ))}
        </div>
        <Button asChild size="sm" variant="secondary" className="bg-white text-primary hover:bg-white/90">
          <Link to="/ask-casecue"><Sparkles className="h-4 w-4 mr-1.5" />Ask CaseCue Copilot</Link>
        </Button>
      </Card>
    </div>
  );
}
import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, GraduationCap, CalendarClock, Heart, Target, FileText, Wrench, Clock } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

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

const COPILOT_TASKS = [
  "Build an IEP", "Review an MDT", "Summarize an IEP", "Create goals",
  "Generate SDI", "Draft amendments", "Analyze a BIP", "Generate meeting notes", "Create a meeting script",
];

// Tab 1 — Student Overview: the verified record at a glance.
export default function StudentOverviewTab({ student }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FACTS.map(({ label, value, icon: Icon }) => (
          <Card key={value} className="p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium"><Icon className="h-3.5 w-3.5" />{label}</div>
            <div className="mt-1.5 font-semibold text-sm">{student[value] || <span className="text-muted-foreground font-normal">Not on file</span>}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map(({ label, value, icon: Icon }) => (
          <Card key={value} className="p-5">
            <div className="flex items-center gap-2 font-semibold mb-2"><Icon className="h-4 w-4 text-primary" />{label}</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {student[value] || "Not on file — generate it in the AI Summary or Section Drafter tabs, or upload documents and let CaseCue extract it."}
            </p>
          </Card>
        ))}
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold mb-2"><Clock className="h-4 w-4 text-primary" />Services</div>
          {student.services?.length ? (
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {student.services.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No services on file.</p>}
          {student.service_minutes ? <p className="text-sm text-muted-foreground mt-2">{student.service_minutes} service minutes on file.</p> : null}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold mb-2"><FileText className="h-4 w-4 text-primary" />Notes</div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.notes || "No notes on file."}</p>
        </Card>
      </div>

      <Card className="p-5 brand-gradient text-white">
        <div className="flex items-center gap-2 font-semibold mb-1"><Sparkles className="h-4 w-4" />CaseCue Copilot</div>
        <p className="text-sm text-white/85 mb-3">
          Your AI case manager. Ask CaseCue Copilot to build an IEP, review an MDT, summarize records, create goals, generate SDI, draft amendments, analyze a BIP, or write meeting notes — it uses every uploaded document as context.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {COPILOT_TASKS.map((t) => (
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
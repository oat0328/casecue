import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, ChevronDown, RotateCcw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Help Center — step-by-step written guides for every major feature.
const GUIDES = [
  {
    title: "Quick Start Guide",
    body: (
      <>
        <p className="font-medium text-foreground">The CaseCue workflow:</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li><strong className="text-foreground">Create a student</strong> — or import your whole caseload from a CSV.</li>
          <li><strong className="text-foreground">Upload documents</strong> — in IEP Studio → Upload Center, drag in the current IEP and latest evaluation. Everything is read automatically.</li>
          <li><strong className="text-foreground">Review analysis</strong> — CaseCue extracts eligibility, strengths, needs, present levels, accommodations, SDI, services, goals, progress, and behavior info, and pre-fills the profile.</li>
          <li><strong className="text-foreground">Generate the IEP</strong> — use the IEP Builder tab or CaseCue Copilot to draft sections from your documents.</li>
          <li><strong className="text-foreground">Prepare the meeting</strong> — one click generates the full packet, page-by-page script, and talking points.</li>
          <li><strong className="text-foreground">Track progress</strong> — log data in Session Tracker or the Goals &amp; Progress tab; graphs update automatically.</li>
        </ol>
      </>
    ),
  },
  {
    title: "Upload Guide",
    body: (
      <>
        <p><strong className="text-foreground">Where:</strong> IEP Studio → Upload Center is the only upload location. The Documents page is a storage library for your records.</p>
        <p><strong className="text-foreground">What to upload:</strong> previous and current IEPs, reevaluations, evaluation and MDT reports, BIPs, FBAs, behavior logs, discipline reports, progress reports, parent and teacher input, therapy reports (speech/OT/PT), and medical reports.</p>
        <p><strong className="text-foreground">How:</strong> pick the document type, then drag and drop (or click to browse). PDF, DOCX, JPG, and PNG — including scans — are supported and read with OCR automatically.</p>
        <p><strong className="text-foreground">What happens:</strong> documents are processed, analyzed, and the student profile is pre-filled automatically — no manual buttons. Duplicates are blocked so credits aren't re-spent.</p>
        <p><strong className="text-foreground">Privacy:</strong> files are stored privately — only your organization can open them.</p>
      </>
    ),
  },
  {
    title: "IEP Builder Guide",
    body: (
      <>
        <p><strong className="text-foreground">The pipeline:</strong> Documents on file → Extraction Review → IEP Draft → Review &amp; Export.</p>
        <p>Uploads happen in the Upload Center; the Builder's first step just confirms what's on file. Extraction Review shows every fact CaseCue found with its source. The Draft step assembles a full IEP draft, and Review &amp; Export produces the final document.</p>
        <p className="text-amber-700">Every draft is labeled Draft — Educator Review Required. You approve every section before it's final.</p>
      </>
    ),
  },
  {
    title: "Amendment Guide",
    body: (
      <>
        <p>Open IEP Studio → Amendments to compare the current IEP against new information and generate formal amendment language.</p>
        <p>Each amendment shows the current language, recommended language, and the reason for change — for goals, services, placement, accommodations, and behavior supports.</p>
        <p className="text-amber-700">Amendments are drafts until your IEP team approves them.</p>
      </>
    ),
  },
  {
    title: "Goal Tracking Guide",
    body: (
      <>
        <p>Open IEP Studio → Goals &amp; Progress, or log data in Session Tracker.</p>
        <p><strong className="text-foreground">Enter:</strong> baseline data, progress updates, assessment results, and observation notes for each goal.</p>
        <p><strong className="text-foreground">Charts:</strong> line graphs, bar graphs, and goal attainment charts update automatically.</p>
        <p><strong className="text-foreground">Status colors:</strong> green = on track, yellow = monitor, red = at risk.</p>
        <p>The readiness score on the student Overview tells you at a glance what's complete and what's missing before a meeting.</p>
      </>
    ),
  },
  {
    title: "Meeting Mode Guide",
    body: (
      <>
        <p><strong className="text-foreground">Before the meeting:</strong> click 🎤 Run Meeting Mode on the student Overview — one click generates the meeting packet, the page-by-page script for every page of the uploaded IEP, talking points, and parent-friendly explanations.</p>
        <p><strong className="text-foreground">In the meeting:</strong> Meeting Navigator gives you a distraction-free, large-text guide with a timer, attendance, quick notes, decisions, and follow-ups. The original IEP page is one tap away. Audio is never recorded.</p>
        <p><strong className="text-foreground">After:</strong> CaseCue composes a draft meeting summary for you to review and save.</p>
      </>
    ),
  },
  {
    title: "Copilot Guide",
    body: (
      <>
        <p>CaseCue Copilot is your AI case manager, available from the Ask CaseCue button on every page.</p>
        <p><strong className="text-foreground">Try asking:</strong> "Summarize this student", "Build a new IEP", "Review an MDT", "Generate SDI", "Create goals", "Draft amendments", "Review accommodations", "Analyze a BIP", "Create meeting notes", "Create a parent summary", or "Prepare me for this meeting".</p>
        <p>Copilot uses your uploaded documents as context and cites its sources — it never invents student facts, and every output is a draft you review.</p>
      </>
    ),
  },
];

export default function Help() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div>
      <PageHeader title="Help Center" subtitle="Step-by-step guides for every part of CaseCue." icon={LifeBuoy} />

      <div className="space-y-3 max-w-3xl">
        {GUIDES.map((g, i) => (
          <Card key={g.title} className="overflow-hidden">
            <button
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
              onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
            >
              <span className="font-semibold">{g.title}</span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openIdx === i && "rotate-180")} />
            </button>
            {openIdx === i && (
              <div className="px-5 pb-5 text-sm text-muted-foreground space-y-2.5">{g.body}</div>
            )}
          </Card>
        ))}

        <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold">Guided Tour</p>
            <p className="text-sm text-muted-foreground">New to CaseCue — or want a refresher? Replay the full guided tour anytime.</p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/onboarding"><RotateCcw className="h-4 w-4 mr-1.5" /> Replay guided tour</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
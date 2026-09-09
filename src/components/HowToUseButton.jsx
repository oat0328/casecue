import React, { useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Global "How To Use" button — available on every page from the header.
export default function HowToUseButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
          <HelpCircle className="h-4 w-4" /> How To Use
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How to use CaseCue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Purpose</p>
            <p>CaseCue is your SPED operating system: upload student records once, let AI analyze them, then draft IEPs, track goals, plan behavior supports, and prepare meetings — all from IEP Studio.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Workflow</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Select a student in IEP Studio.</li>
              <li>Upload documents once in the Upload Center.</li>
              <li>CaseCue reads and analyzes them automatically and pre-fills the profile.</li>
              <li>Review and edit the analysis, then generate your IEP draft.</li>
              <li>Run Meeting Mode to prepare and run the IEP meeting.</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-foreground">Best practices</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Start with the current IEP and latest evaluation.</li>
              <li>Always review AI drafts — you and the IEP team approve every decision.</li>
              <li>Log progress data weekly so graphs, reports, and readiness scores stay current.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Recommended next steps</p>
            <p>Open the Help Center for step-by-step guides to every feature.</p>
          </div>
          <Button asChild className="brand-gradient text-white w-full">
            <Link to="/help" onClick={() => setOpen(false)}>Open Help Center</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
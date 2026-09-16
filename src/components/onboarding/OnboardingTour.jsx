import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, FileEdit, ChartLine, BellRing } from "lucide-react";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to CaseCue",
    body: "Your all-in-one command center for caseload management, IEP drafting, and progress monitoring. Here's a 30-second orientation.",
  },
  {
    icon: Users,
    title: "Build your caseload",
    body: "Start in Students: add each student with their eligibility, IEP dates, and reevaluation deadlines. CaseCue tracks every deadline for you from there.",
  },
  {
    icon: FileEdit,
    title: "Draft IEPs from your records",
    body: "IEP Studio drafts present levels and annual goals from your recorded data. Everything is labeled Draft and requires your review — the The system never invents student facts.",
  },
  {
    icon: ChartLine,
    title: "Track progress & report",
    body: "Log data in the Data Center, group students by goal area in Goal Groups, and turn it all into parent-ready progress reports with one click.",
  },
  {
    icon: BellRing,
    title: "Never miss a deadline",
    body: "CaseCue emails you before every annual review and reevaluation, and the Today page flags anything that needs attention. Let's get started!",
  },
];

// First-run welcome tour — shown once per account, dismissal saved to the user's profile.
export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    base44.auth.me()
      .then((me) => { if (!cancelled && !me.onboarding_seen) setOpen(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const close = async () => {
    setOpen(false);
    try { await base44.auth.updateMe({ onboarding_seen: true }); } catch (e) { /* profile flag is cosmetic */ }
  };

  const Current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md text-center">
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 brand-gradient" : "w-1.5 bg-border"}`} />
          ))}
        </div>
        <div className="mx-auto h-14 w-14 rounded-2xl brand-gradient-soft flex items-center justify-center">
          <Current.icon className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mt-4">{Current.title}</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{Current.body}</p>
        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={close}>Skip</Button>
          <Button className="brand-gradient text-white" onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? "Get started" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
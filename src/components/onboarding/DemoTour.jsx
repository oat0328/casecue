import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarClock, Users, FolderOpen, Download, Loader2 } from "lucide-react";
import { DEMO_LABEL } from "@/lib/demoData";
import { exportMeetingPacketPdf } from "@/lib/pdfExport";

const TOUR_KEY = "casecue_demo_tour";

const STEPS = [
  {
    icon: CheckCircle2,
    title: "Your demo caseload is loaded",
    body: "You now have 10 fictional students — every record is clearly labeled \"DEMO DATA\" so you can explore freely without touching real student information. This quick tour shows CaseCue's value in under three minutes.",
  },
  {
    icon: CalendarClock,
    title: "Deadline radar",
    body: "CaseCue tracks every annual review and reevaluation. Your demo caseload includes one overdue review and one urgent deadline — open Students anytime to see how clearly risk is flagged.",
  },
  {
    icon: Users,
    title: "Student 360",
    body: "Each student has one profile: goals with progress data, documents, meetings, and notes. Open any demo student to see the complete picture.",
  },
  {
    icon: FolderOpen,
    title: "Meeting-ready",
    body: "Meetings hold agendas, parent concerns, and team notes — and every IEP-related output stays a draft until you approve it.",
  },
  {
    icon: Download,
    title: "Take a sample packet",
    body: "See what CaseCue hands you for an IEP team meeting: a one-click packet with the agenda, student profile, goals, and progress data.",
  },
];

// Guided demo tour — starts right after a user loads the fictional caseload from onboarding.
// Shown once per account; the final step downloads a sample meeting packet.
export default function DemoTour() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(TOUR_KEY)) return;
    let cancelled = false;
    base44.auth.me()
      .then((me) => {
        const profile = me?.data ?? me;
        if (!cancelled && !profile?.demo_tour_done) setOpen(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const close = async () => {
    setOpen(false);
    sessionStorage.removeItem(TOUR_KEY);
    try { await base44.auth.updateMe({ demo_tour_done: true }); } catch (e) { /* cosmetic flag */ }
  };

  const downloadPacket = async () => {
    setDownloading(true);
    try {
      const [students, meetings, goals, progress] = await Promise.all([
        base44.entities.Student.list("-created_date", 500),
        base44.entities.Meeting.list("-created_date", 500),
        base44.entities.Goal.list("-created_date", 500),
        base44.entities.ProgressData.list("-created_date", 500),
      ]);
      const demoIds = new Set(students.filter((s) => s.notes === DEMO_LABEL).map((s) => s.id));
      const meeting = meetings.find((m) => demoIds.has(m.student_id) && m.status === "scheduled")
        || meetings.find((m) => demoIds.has(m.student_id));
      const student = students.find((s) => s.id === meeting?.student_id)
        || students.find((s) => s.notes === DEMO_LABEL);
      exportMeetingPacketPdf(
        meeting || { title: "Sample IEP Team Meeting", meeting_type: "IEP" },
        student,
        (goals || []).filter((g) => g.student_id === student?.id),
        (progress || []).filter((p) => p.student_id === student?.id),
      );
      setDownloaded(true);
    } finally {
      setDownloading(false);
    }
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

        {last && (
          <Button onClick={downloadPacket} disabled={downloading} className="brand-gradient text-white w-full mt-5 h-11">
            {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            {downloaded ? "Downloaded — check your files" : "Download sample meeting packet"}
          </Button>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="ghost" onClick={close}>Skip tour</Button>
          <div className="flex items-center gap-2">
            {step > 0 && !last && <Button variant="ghost" onClick={() => navigate("/students")}>Explore now</Button>}
            {last ? (
              <Button className="brand-gradient text-white" onClick={close}>Done</Button>
            ) : (
              <Button className="brand-gradient text-white" onClick={() => setStep(step + 1)}>Next</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
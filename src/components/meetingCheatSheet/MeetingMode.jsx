import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ThumbsUp, Pause, Play, Square, X } from "lucide-react";

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const inputCls = "flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base";

// Distraction-free Meeting Mode: large text, large touch targets, timer, attendance,
// notes, decisions, parking lot, and a teacher-reviewed end-of-meeting summary.
// No audio is ever recorded.
export default function MeetingMode({ student, record, onSave, onExit, onOpenOriginal }) {
  const steps = record.steps || [];
  const [idx, setIdx] = useState(Math.min(record.current_step || 0, steps.length - 1));
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [meeting, setMeeting] = useState(record.meeting_data || { attendance: [], parent_concerns: [], team_notes: [], decisions: [], follow_ups: [], parking_lot: [] });
  const [attendee, setAttendee] = useState("");
  const [quickText, setQuickText] = useState("");
  const [quickType, setQuickType] = useState("parent_concern");
  const [ending, setEnding] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const step = steps[idx] || {};
  const discussedCount = steps.filter((s) => s.discussed).length;

  const patchStep = (patch) => {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onSave({ steps: next, current_step: idx, status: "in_meeting" });
  };

  const addItem = (key, value) => {
    const next = { ...meeting, [key]: [...(meeting[key] || []), value] };
    setMeeting(next);
    onSave({ meeting_data: next, status: "in_meeting" });
  };

  const composeSummary = () => {
    const discussed = steps.filter((s) => s.discussed).map((s) => s.title);
    const unresolved = steps.filter((s) => !s.discussed).map((s) => s.title);
    const flagged = steps.filter((s) => s.flagged).map((s) => s.title);
    return [
      `IEP MEETING SUMMARY — DRAFT (educator review required before finalizing)`,
      `Student: ${student ? `${student.first_name} ${student.last_name}` : ""}`,
      `Date: ${new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'})}`,
      ``,
      `Attendance: ${(meeting.attendance || []).join(", ") || "— record attendance —"}`,
      ``,
      `Parent concerns:`,
      ...(meeting.parent_concerns || []).map((c) => `- ${c}`),
      (meeting.parent_concerns || []).length ? [] : ["- (record concerns raised)"],
      ``,
      `Topics discussed (meeting guide sections):`,
      ...(discussed.length ? discussed.map((t) => `- ${t}`) : ["- (none marked discussed)"]),
      ``,
      `Decisions made:`,
      ...(meeting.decisions || []).map((d) => `- ${d}`),
      (meeting.decisions || []).length ? [] : ["- (record team decisions)"],
      ``,
      `Follow-up tasks (add responsible person and due date):`,
      ...(meeting.follow_ups || []).map((f) => `- ${f}`),
      (meeting.follow_ups || []).length ? [] : ["- (none)"],
      ``,
      `Unresolved items:`,
      ...(unresolved.length ? unresolved.map((t) => `- ${t}`) : ["- None"]),
      ``,
      `IEP sections requiring revision or follow-up:`,
      ...(flagged.length ? flagged.map((t) => `- ${t}`) : ["- None flagged"]),
      ``,
      `Meeting duration: ${fmt(seconds)}. Audio is never recorded by CaseCue.`,
    ].join("\n");
  };

  const confirmEnd = () => { setEnding(true); setSummaryText(composeSummary()); setRunning(false); };

  const saveSummary = async () => {
    setSaving(true);
    try {
      await onSave({
        status: "completed",
        meeting_data: { ...meeting, summary: summaryText, ended_at: new Date().toISOString() },
      });
      onExit();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Meeting Mode — {student ? `${student.first_name} ${student.last_name}` : ""}</p>
            <p className="text-3xl font-bold tabular-nums">{fmt(seconds)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => setRunning(!running)}>
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="outline" className="h-12 px-4" onClick={onExit}><X className="h-5 w-5" /></Button>
            <Button className="brand-gradient text-white h-12 px-5" onClick={confirmEnd}><Square className="h-4 w-4 mr-2" /> End Meeting</Button>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full brand-gradient" style={{ width: `${steps.length ? (discussedCount / steps.length) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{discussedCount} of {steps.length} steps discussed · Step {idx + 1} of {steps.length}</p>
        </div>

        {!ending ? (
          <>
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-xl sm:text-2xl font-bold">{step.title}</h2>
              <p className="text-base mt-2">{step.key_info}</p>
              {Array.isArray(step.talking_points) && step.talking_points.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {step.talking_points.map((t, i) => <li key={i} className="text-base">• {t}</li>)}
                </ul>
              )}
              {Array.isArray(step.questions) && step.questions.length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">Ask: {step.questions.join(" · ")}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">Source: {step.source}</p>
              {step.required_decisions && step.required_decisions !== "none" && (
                <p className="text-sm text-amber-700 mt-2">Still to decide: {step.required_decisions}</p>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="h-12 px-6 flex-1 text-base" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
                <ChevronLeft className="h-5 w-5 mr-1" /> Previous
              </Button>
              <Button variant={step.discussed ? "ghost" : "outline"} className={`h-12 px-6 text-base ${step.discussed ? "text-emerald-600" : ""}`} onClick={() => patchStep({ discussed: !step.discussed })}>
                <ThumbsUp className="h-5 w-5 mr-1" /> {step.discussed ? "Discussed ✓" : "Mark discussed"}
              </Button>
              <Button className="brand-gradient text-white h-12 px-6 flex-1 text-base" disabled={idx >= steps.length - 1} onClick={() => setIdx(Math.min(idx + 1, steps.length - 1))}>
                Next <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">Quick add</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={quickType} onChange={(e) => setQuickType(e.target.value)}>
                  <option value="parent_concern">Parent concern</option>
                  <option value="team_note">Team note</option>
                  <option value="decision">Decision</option>
                  <option value="follow_up">Follow-up task</option>
                  <option value="parking_lot">Parking-lot topic</option>
                </select>
                <input className={inputCls} value={quickText} onChange={(e) => setQuickText(e.target.value)} placeholder="Type and press Add…" />
                <Button className="h-11 px-5" onClick={() => { if (quickText.trim()) { addItem(quickType, quickText.trim()); setQuickText(""); } }}>Add</Button>
              </div>

              <p className="text-sm font-medium pt-1">Attendance</p>
              <div className="flex gap-2">
                <input className={inputCls} value={attendee} onChange={(e) => setAttendee(e.target.value)} placeholder="Name (role)" />
                <Button variant="outline" className="h-11 px-5" onClick={() => { if (attendee.trim()) { addItem("attendance", attendee.trim()); setAttendee(""); } }}>Add</Button>
              </div>
              {(meeting.attendance || []).length > 0 && <p className="text-sm text-muted-foreground">{meeting.attendance.join(" · ")}</p>}

              <Button variant="ghost" size="sm" onClick={onOpenOriginal}>Open original IEP page</Button>
              <p className="text-xs text-muted-foreground">CaseCue never records audio. Decisions stay the team's — CaseCue only organizes.</p>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold text-lg">Meeting summary — review and save</h3>
            <p className="text-sm text-muted-foreground mt-1">CaseCue composed this draft from what was recorded during the meeting. Edit anything, then save — nothing is final until you approve it.</p>
            <textarea className="w-full mt-3 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" rows={18} value={summaryText} onChange={(e) => setSummaryText(e.target.value)} />
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button className="brand-gradient text-white h-12 px-6" onClick={saveSummary} disabled={saving}>
                {saving ? "Saving…" : "Approve & save meeting summary"}
              </Button>
              <Button variant="outline" className="h-12 px-6" onClick={() => setEnding(false)}>Back to meeting</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
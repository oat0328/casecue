import React, { useState } from "react";
import { FileText, Loader2, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// One-click AI meeting notes generator for a scheduled meeting.
// Draft is grounded in the student record and saved to the meeting on confirm.
export default function MeetingNotesGenerator({ meeting, onSaved }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(null);

  const generate = async () => {
    setOpen(true);
    if (notes) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("generateMeetingNotes", { meeting_id: meeting.id });
      setNotes(res.data.notes);
    } catch (e) {
      toast({ title: "Generation failed", description: e.response?.data?.error || e.message, variant: "destructive" });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const text = [
        notes.meeting_notes,
        notes.parent_participation_notes ? `\n\nParent participation: ${notes.parent_participation_notes}` : "",
        notes.team_discussion_summary ? `\n\nTeam discussion: ${notes.team_discussion_summary}` : "",
        notes.decisions_made?.length ? `\n\nDecisions:\n- ${notes.decisions_made.join("\n- ")}` : "",
        notes.next_steps?.length ? `\n\nNext steps:\n- ${notes.next_steps.join("\n- ")}` : "",
        notes.action_items?.length ? `\n\nAction items:\n- ${notes.action_items.join("\n- ")}` : "",
      ].filter(Boolean).join("");
      await base44.entities.Meeting.update(meeting.id, { notes: text });
      toast({ title: "Notes saved to meeting record" });
      setOpen(false);
      onSaved?.();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, children }) => (
    <section>
      <h4 className="font-semibold mb-1">{title}</h4>
      <div className="whitespace-pre-wrap text-muted-foreground">{children}</div>
    </section>
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={generate} className="border-primary/30 text-primary">
        <FileText className="h-3.5 w-3.5 mr-1" /> Meeting notes
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting notes — {meeting.title}</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Drafting meeting notes from the student record…</span>
            </div>
          ) : notes ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
                Draft — IEP Team Review Required. Fill in the bracketed placeholders with actual meeting outcomes before finalizing.
              </div>
              <Section title="Meeting notes">{notes.meeting_notes}</Section>
              <Section title="Parent participation">{notes.parent_participation_notes}</Section>
              <Section title="Team discussion">{notes.team_discussion_summary}</Section>
              {notes.decisions_made?.length > 0 && (
                <Section title="Decisions made">
                  <ul className="list-disc pl-5 space-y-1">{notes.decisions_made.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </Section>
              )}
              {notes.next_steps?.length > 0 && (
                <Section title="Next steps">
                  <ul className="list-disc pl-5 space-y-1">{notes.next_steps.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </Section>
              )}
              {notes.action_items?.length > 0 && (
                <Section title="Action items">
                  <ul className="list-disc pl-5 space-y-1">{notes.action_items.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </Section>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                <Button onClick={save} disabled={saving} className="brand-gradient text-white">
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {saving ? "Saving…" : "Save to meeting"}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useEffect, useState } from "react";
import { MessageSquare, Loader2, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getActiveWorkspace } from "@/lib/workspaces";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TYPES = [
  { key: "review", label: "Review" },
  { key: "feature_request", label: "Feature Request" },
  { key: "bug_report", label: "Bug Report" },
  { key: "general", label: "General" },
];

// Floating feedback button + milestone-triggered feedback prompts.
// Visible throughout the app; opens a dialog for reviews, feature requests,
// bug reports, and general feedback.
export default function FloatingFeedbackButton() {
  const { toast } = useToast();
  const { user } = useAuth();
  const activeWorkspace = getActiveWorkspace(user);
  const [open, setOpen] = useState(false);
  const [milestone, setMilestone] = useState("");
  const [type, setType] = useState("review");
  const [rating, setRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [featureRequested, setFeatureRequested] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Milestone prompts: 3 IEPs created, 10 documents uploaded, 14 days active.
  useEffect(() => {
    if (!user?.id) return;
    const check = async () => {
      try {
        const [docs, workspaces] = activeWorkspace==='sped' ? await Promise.all([
          base44.entities.Document.filter({ created_by_id: user.id }),
          base44.entities.IepWorkspace.filter({ created_by_id: user.id }),
        ]) : [[],[]];
        const iepCount = (workspaces || []).filter((w) => ["draft", "review", "exported"].includes(w.status)).length;
        const docCount = (docs || []).length;
        const daysActive = user.created_date
          ? Math.floor((Date.now() - new Date(user.created_date).getTime()) / 86400000)
          : 0;

        const hits = [];
        if (iepCount >= 3) hits.push("3 IEPs created");
        if (docCount >= 10) hits.push("10 documents uploaded");
        if (daysActive >= 14) hits.push("14 days with CaseCue");

        const fresh = hits.filter((m) => !localStorage.getItem(`cc_fb_prompt_${m}`));
        if (fresh.length) {
          fresh.forEach((m) => localStorage.setItem(`cc_fb_prompt_${m}`, "1"));
          setMilestone(fresh.join(" · "));
          setType("review");
          setOpen(true);
        }
      } catch { /* milestone check is best-effort only */ }
    };
    check();
  }, [user?.id, activeWorkspace]);

  const reset = () => {
    setType("review"); setRating(0); setWouldRecommend(""); setTitle("");
    setBody(""); setFeatureRequested(""); setDisplayName("");
  };

  const submit = async () => {
    if (!body.trim()) { toast({ title: "Tell us a little more first", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await base44.entities.Feedback.create({
        feedback_type: type,
        rating: type === "review" ? (rating || null) : null,
        would_recommend: type === "review" && wouldRecommend !== "" ? Number(wouldRecommend) : null,
        title,
        body,
        feature_requested: type === "feature_request" ? featureRequested : null,
        milestone,
        display_name: displayName,
        browser_info: navigator.userAgent,
        organization_id: user?.data?.organization_id || "",
      });
      toast({ title: "Thank you!", description: "Your feedback helps make CaseCue better." });
      setOpen(false);
      reset();
    } catch (e) {
      toast({ title: "Could not send feedback", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full border border-border bg-card text-foreground px-4 py-3 card-shadow hover:card-shadow-lg transition-all"
        >
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Feedback</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share your feedback</DialogTitle>
          </DialogHeader>

          {milestone && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-primary">
              Milestone reached: <strong>{milestone}</strong> — we'd love to hear how CaseCue is working for you.
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${type === t.key ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-5 pt-1">
            {type === "review" && (
              <>
                <div>
                  <Label className="text-sm">How would you rate CaseCue?</Label>
                  <div className="flex gap-1.5 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="p-0.5">
                        <Star className={`h-7 w-7 transition-colors ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-300"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">How likely are you to recommend CaseCue to another teacher? (0–10)</Label>
                  <select value={wouldRecommend} onChange={(e) => setWouldRecommend(e.target.value)} className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Select…</option>
                    {Array.from({ length: 11 }, (_, n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {type === "feature_request" && (
              <div>
                <Label className="text-sm">Which feature would you like?</Label>
                <Input value={featureRequested} onChange={(e) => setFeatureRequested(e.target.value)} placeholder="e.g. Google Classroom sync" className="mt-1.5" />
              </div>
            )}

            <div>
              <Label className="text-sm">{type === "bug_report" ? "What went wrong?" : type === "feature_request" ? "Describe the feature" : type === "review" ? "What's your review?" : "Your feedback"}</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5" placeholder={type === "bug_report" ? "What happened, and what did you expect instead?" : ""} />
            </div>

            <div>
              <Label className="text-sm">Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
            </div>

            <div>
              <Label className="text-sm">Name to show publicly on testimonials (optional)</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Ms. Rivera, Resource Teacher" className="mt-1.5" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="brand-gradient text-white">
              {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending…</> : "Send feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
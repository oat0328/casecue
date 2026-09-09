import React, { useState } from "react";
import { Youtube, ExternalLink, Plus, Trash2, Eye } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-sm font-medium mb-2";

const USAGE_POINTS = ["Warm-up", "Mini-lesson", "Guided practice", "Independent practice", "Exit ticket"];

// Extracts a real YouTube video ID from common URL shapes. Returns null when the
// URL is not a recognizable YouTube link — we never invent video IDs.
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.replace(/^www\./, "") === "youtube.com" || u.hostname.replace(/^www\./, "") === "m.youtube.com") {
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2]?.split("?")[0] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2]?.split("?")[0] || null;
    }
  } catch { /* not a valid URL */ }
  return null;
}

// Step 2 helper — instructional video finder. Base44 has no official YouTube
// Data API integration, so per the fallback rule this opens a properly
// constructed YouTube search in a new tab (no fake results are ever displayed).
// Teachers paste back a real video URL, preview it in privacy-enhanced mode,
// and approve it before it joins the lesson.
export default function VideoFinder({ analysis, plan, grade, videos, onChange }) {
  const { toast } = useToast();
  const [skill, setSkill] = useState((analysis?.skills || []).slice(0, 2).join(" "));
  const [subject, setSubject] = useState(analysis?.subject || "");
  const [durationHint, setDurationHint] = useState("any");
  const [captions, setCaptions] = useState(true);
  const [recent, setRecent] = useState(false);
  const [candidateUrl, setCandidateUrl] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [label, setLabel] = useState("");
  const [usagePoint, setUsagePoint] = useState("Mini-lesson");

  const gradeHint = grade || analysis?.grade_level || plan?.grade_group || "";

  const buildQuery = () => {
    const parts = [skill, subject, gradeHint, "for kids", "lesson"];
    if (durationHint === "short") parts.push("under 5 minutes");
    if (durationHint === "medium") parts.push("5 to 10 minutes");
    if (captions) parts.push("with captions");
    if (recent) parts.push("2025");
    return parts.filter(Boolean).join(" ");
  };

  const openSearch = () => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(buildQuery())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast({
      title: "YouTube search opened in a new tab",
      description: "Duration, caption, and SafeSearch filters can be applied on YouTube. Find a video you like, copy its URL, and paste it below.",
    });
  };

  const checkUrl = () => {
    const id = extractVideoId(candidateUrl.trim());
    if (!id) {
      toast({ title: "That doesn't look like a YouTube video link", description: "Paste a youtube.com/watch?v=… or youtu.be/… link.", variant: "destructive" });
      return;
    }
    setCandidate({ url: candidateUrl.trim(), video_id: id });
  };

  const addToLesson = () => {
    if (!candidate) return;
    onChange([...(videos || []), {
      url: candidate.url,
      video_id: candidate.video_id,
      label: label.trim() || "",
      usage_point: usagePoint,
      added_by: "teacher",
      added_at: new Date().toISOString(),
    }]);
    setCandidate(null);
    setCandidateUrl("");
    setLabel("");
    toast({ title: "Video added to the lesson", description: "You previewed and approved this video yourself — no student information was used in any search." });
  };

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-1"><Youtube className="h-4 w-4 text-primary" /> Find instructional videos</h3>
      <p className="text-xs text-muted-foreground mb-4">
        CaseCue is not connected to the official YouTube Data API on this plan, so it opens a real YouTube search in a new tab instead of showing results here — nothing is ever invented. Searches use grade, subject, and skill only: student names and disability information are never included.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="vf-skill">Skill</label>
          <input id="vf-skill" className={inputCls} value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. descriptive writing" />
        </div>
        <div>
          <label className={labelCls} htmlFor="vf-subject">Subject</label>
          <input id="vf-subject" className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. ELA" />
        </div>
        <div>
          <label className={labelCls} htmlFor="vf-duration">Video duration</label>
          <select id="vf-duration" className={inputCls} value={durationHint} onChange={(e) => setDurationHint(e.target.value)}>
            <option value="any">Any length</option>
            <option value="short">Short (under ~5 min)</option>
            <option value="medium">Medium (~5–10 min)</option>
          </select>
        </div>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} className="h-4 w-4 accent-[hsl(255_82%_58%)]" />
            Prefer captions
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={recent} onChange={(e) => setRecent(e.target.checked)} className="h-4 w-4 accent-[hsl(255_82%_58%)]" />
            Recently published
          </label>
        </div>
      </div>

      <Button onClick={openSearch} className="brand-gradient text-white h-11 px-6 mt-6">
        <ExternalLink className="h-4 w-4 mr-2" /> Open YouTube search (new tab)
      </Button>
      <p className="text-xs text-muted-foreground mt-2">Enable YouTube's SafeSearch / Restricted Mode in the new tab for a safer result set.</p>

      <div className="mt-6 pt-6 border-t border-border">
        <label className={labelCls} htmlFor="vf-url">Paste a YouTube video URL you want to use</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input id="vf-url" className={inputCls} value={candidateUrl} onChange={(e) => { setCandidateUrl(e.target.value); setCandidate(null); }} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" />
          <Button variant="outline" className="h-11 shrink-0" onClick={checkUrl} disabled={!candidateUrl.trim()}>
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
        </div>

        {candidate && (
          <div className="mt-4 rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-2">Preview (privacy-enhanced YouTube embed — never autoplays):</p>
            <div className="rounded-lg overflow-hidden border border-border">
              <iframe
                title="Video preview"
                src={`https://www.youtube-nocookie.com/embed/${candidate.video_id}?rel=0`}
                className="w-full aspect-video"
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
              <div>
                <label className={labelCls} htmlFor="vf-label">Label (optional)</label>
                <input id="vf-label" className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sensory details explained" />
              </div>
              <div>
                <label className={labelCls} htmlFor="vf-usage">Where in the lesson?</label>
                <select id="vf-usage" className={inputCls} value={usagePoint} onChange={(e) => setUsagePoint(e.target.value)}>
                  {USAGE_POINTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={addToLesson} className="brand-gradient text-white h-11 px-6 mt-5">
              <Plus className="h-4 w-4 mr-2" /> Add to lesson
            </Button>
          </div>
        )}

        {(videos || []).length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Approved videos in this lesson</p>
            {videos.map((v, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium truncate">{v.label || v.url}</p>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary break-all">{v.url}</a>
                  {v.usage_point && <p className="text-xs text-muted-foreground mt-0.5">Use at: {v.usage_point} · previewed &amp; approved by you</p>}
                </div>
                <button aria-label="Remove video" className="p-2 rounded-lg hover:bg-muted shrink-0"
                  onClick={() => onChange(videos.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
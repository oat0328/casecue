import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Loader2, Copy, ClipboardList, CalendarPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import ExportBar from "@/components/shared/ExportBar";

const PACKET_FIELDS = [
  ["student_snapshot", "Student Snapshot"],
  ["eligibility", "Eligibility"],
  ["strengths", "Strengths"],
  ["areas_of_need", "Areas of Need"],
  ["present_levels", "Present Levels"],
  ["goals", "Goals"],
  ["services", "Services"],
  ["accommodations", "Accommodations"],
  ["behavior_supports", "Behavior Supports"],
  ["parent_concerns", "Parent Concerns"],
  ["progress_summary", "Progress Summary"],
  ["team_recommendations", "Team Recommendations"],
  ["questions_for_discussion", "Questions for Discussion"],
];

// Tab 9 — Meeting Command Center: one click generates the full Meeting Packet
// and a read-aloud script that walks through EVERY page of the uploaded IEP.
export default function MeetingCenterTab({ student, autoGenerate, onGenerated }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await base44.functions.invoke("generateMeetingScript", { student_id: student.id });
      setData(res.data);
      onGenerated?.();
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // "Run Meeting Mode" from elsewhere in IEP Studio auto-starts generation here.
  useEffect(() => {
    if (autoGenerate && !loading && !data) generate();
  }, [autoGenerate]);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Meeting Facilitator</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your read-aloud meeting guide. It starts with a natural greeting, walks through <strong>every page</strong> of {student.first_name}'s IEP in order, explains the important details in easy words, gives you natural team questions, and closes without inventing decisions.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={loading} className="brand-gradient text-white">
            {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Building facilitator flow…</> : <><Sparkles className="h-4 w-4 mr-1" /> Build My Meeting Flow</>}
          </Button>
          <Button asChild variant="outline">
            <Link to="/meeting-navigator"><ClipboardList className="h-4 w-4 mr-1.5" /> Meeting Navigator (in-meeting mode)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/meetings"><CalendarPlus className="h-4 w-4 mr-1.5" /> Schedule a meeting</Link>
          </Button>
        </div>
        {loading && <p className="text-xs text-muted-foreground mt-3">This reads the full page-by-page IEP summary — it can take a minute.</p>}
      </Card>

      {data && (
        <>
          <AiDisclaimer extra="Meeting scripts are presentation support only — verify every statement against the IEP before reading it in the meeting." />

          <ExportBar
            title={`Meeting Materials — ${student.first_name} ${student.last_name}`}
            subtitle="Meeting packet, script, and talking points"
            filename={`Meeting-Materials-${student.first_name}-${student.last_name}`}
            banner="DRAFT — IEP Team Review Required. Meeting scripts are presentation support only."
            gated
            sections={[
              ...PACKET_FIELDS.map(([key, label]) => ({ heading: label, body: data.packet?.[key] || "" })),
              { heading: "Full Meeting Script", body: data.script || "" },
              { heading: "Talking Points", body: (data.talking_points || []).map((t) => `• ${t}`).join("\n") },
              { heading: "Important Changes to Highlight", body: (data.important_changes || []).map((t) => `• ${t}`).join("\n") },
            ]}
          />

          <h3 className="font-semibold">Meeting packet</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PACKET_FIELDS.map(([key, label]) => (
              <Card key={key} className="p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.packet?.[key] || "—"}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div><h3 className="font-semibold">Read this in the meeting</h3><p className="text-xs text-muted-foreground mt-0.5">Simple, humanized, page by page. Pause where the team needs to talk.</p></div>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(data.script || ""); toast({ title: "Copied" }); }}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
            </div>
            {data.opening && (
              <div className="mb-5 rounded-xl border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Opening</div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.opening}</p>
              </div>
            )}
            <div className="space-y-4">
              {(data.page_flow || []).map((p, i) => (
                <div key={`${p.page_number}-${i}`} className="rounded-xl border p-4">
                  <div className="font-semibold text-sm">Page {p.page_number}{p.section_name ? ` — ${p.section_name}` : ""}</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mt-2">{p.say_this}</p>
                  {(p.ask_team || []).length > 0 && <div className="mt-3 text-sm"><span className="font-medium">Pause and ask:</span> {p.ask_team.join(" · ")}</div>}
                  {p.facilitator_note && <div className="mt-2 text-xs text-muted-foreground">Facilitator note: {p.facilitator_note}</div>}
                  {p.source && <div className="mt-1 text-xs text-muted-foreground">Source: {p.source}</div>}
                </div>
              ))}
            </div>
            {data.closing && (
              <div className="mt-5 rounded-xl border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Closing</div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.closing}</p>
              </div>
            )}
            {!(data.page_flow || []).length && <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{data.script}</p>}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-semibold mb-2">Talking points</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                {(data.talking_points || []).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-2">Important changes to highlight</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
                {(data.important_changes || []).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
import React, { useMemo, useState } from "react";
import { Loader2, Search, FileText, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

const PAGE_TYPE_CHIP = {
  content: "bg-blue-50 text-blue-700 border-blue-200",
  blank: "bg-muted text-muted-foreground border-border",
  signature: "bg-purple-50 text-purple-700 border-purple-200",
  procedural: "bg-amber-50 text-amber-700 border-amber-200",
};
const VIEWS = ["Quick Summary", "Detailed Summary", "Potential Concerns", "Original Page"];

// Page-by-page IEP summary: every page summarized in plain language — including
// blank, signature, and procedural pages — with search and an original-page link.
export default function PageSummaryView({ workspace, student, save }) {
  const { toast } = useToast();
  const [docId, setDocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("Quick Summary");

  const { data: documents } = useAsync(
    () => base44.entities.Document.filter({ student_id: workspace.student_id }, '-date_uploaded', 20),
    [workspace.student_id]
  );

  const summaries = workspace.page_summaries;
  const pages = summaries?.pages || [];

  const filteredPages = useMemo(() => {
    if (!search.trim()) return pages;
    const q = search.toLowerCase();
    return pages.filter((p) => JSON.stringify(p).toLowerCase().includes(q));
  }, [pages, search]);

  const generate = async () => {
    if (!docId) { toast({ title: "Select a document first" }); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("iepPageSummaries", { workspace_id: workspace.id, document_id: docId });
      if (save) await save({ page_summaries: res.data.page_summaries });
      else await base44.entities.IepWorkspace.update(workspace.id, { page_summaries: res.data.page_summaries });
      toast({ title: "Page summaries ready" });
    } catch (e) {
      toast({ title: "Could not summarize document", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const openOriginal = async () => {
    if (!summaries?.document_id) return;
    try {
      const res = await base44.functions.invoke("openDocumentUrl", { document_id: summaries.document_id });
      window.open(res.data.signed_url, "_blank");
    } catch (e) {
      toast({ title: "Could not open document", description: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold">Page-by-page IEP summary</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Every page summarized in plain language — including blank, signature, and procedural pages, labeled accurately. Summaries are system-assisted drafts for educator review.
        </p>

        {!summaries ? (
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Document (usually the current IEP)</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm mt-1" value={docId} onChange={(e) => setDocId(e.target.value)}>
                <option value="">Select a document…</option>
                {(documents || []).map((d) => <option key={d.id} value={d.id}>{d.filename} ({d.document_type})</option>)}
              </select>
            </div>
            <Button className="brand-gradient text-white h-11 px-6" onClick={generate} disabled={busy || !docId}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {busy ? "Reading every page…" : "Summarize pages"}
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm"><FileText className="h-4 w-4 inline mr-1 text-primary" />{summaries.document_name} · {pages.length} pages · generated {String(summaries.generated_at || "").slice(0, 10)}</span>
            <div className="ml-auto flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={openOriginal}>Open original</Button>
              <Button size="sm" variant="outline" onClick={() => { setDocId(summaries.document_id); generate(); }} disabled={busy}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate</Button>
            </div>
          </div>
        )}
      </Card>

      {summaries && (
        <>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm"
              placeholder="Search pages: names, dates, goals, accommodations, services…"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {VIEWS.map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium border ${view === v ? "bg-primary text-white border-primary" : "bg-card border-border"}`}>
                {v}
              </button>
            ))}
          </div>

          {filteredPages.length === 0 && <p className="text-sm text-muted-foreground">No pages match “{search}”.</p>}

          <div className="space-y-3">
            {filteredPages.map((p) => (
              <Card key={p.page_number} className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm">Page {p.page_number} — {p.section_name || "Untitled section"}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PAGE_TYPE_CHIP[p.page_type] || PAGE_TYPE_CHIP.content}`}>{p.page_type || "content"}</span>
                </div>

                <p className="text-sm mt-2">{p.summary}</p>

                {view === "Quick Summary" && (p.important_facts || []).length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">{p.important_facts.map((f, i) => <li key={i}>• {f}</li>)}</ul>
                )}

                {view === "Detailed Summary" && (
                  <div className="mt-3 space-y-2 text-sm">
                    {[
                      ["Important facts", p.important_facts], ["Dates", p.dates], ["Scores & baselines", p.scores_baselines],
                      ["Goals", p.goals], ["Accommodations", p.accommodations], ["Services & minutes", p.services_minutes],
                    ].map(([label, list]) => (list || []).length > 0 && (
                      <div key={label}><span className="text-xs font-semibold text-muted-foreground uppercase">{label}</span>
                        <ul className="mt-0.5 space-y-0.5">{list.map((x, i) => <li key={i}>• {x}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                )}

                {view === "Potential Concerns" && (
                  <div className="mt-3 space-y-2 text-sm">
                    {(p.concerns || []).length > 0 ? (
                      <ul className="space-y-1">{p.concerns.map((c, i) => <li key={i} className="text-amber-800">⚠ {c}</li>)}</ul>
                    ) : <p className="text-muted-foreground">No potential concerns noted on this page.</p>}
                    {(p.decisions_required || []).length > 0 && (
                      <div><span className="text-xs font-semibold text-muted-foreground uppercase">Decisions still required</span>
                        <ul className="mt-0.5 space-y-0.5">{p.decisions_required.map((d, i) => <li key={i}>□ {d}</li>)}</ul>
                      </div>
                    )}
                    {(p.questions || []).length > 0 && (
                      <div><span className="text-xs font-semibold text-muted-foreground uppercase">Questions to ask</span>
                        <ul className="mt-0.5 space-y-0.5">{p.questions.map((q, i) => <li key={i}>? {q}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}

                {view === "Original Page" && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={openOriginal}><FileText className="h-3.5 w-3.5 mr-1" /> Open the original page</Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
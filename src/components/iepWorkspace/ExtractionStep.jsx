import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertTriangle, GitCompare, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import FactCard from "@/components/iepWorkspace/FactCard";

export default function ExtractionStep({ workspace, save, onDrafted }) {
  const analysis = workspace.analysis;
  const [facts, setFacts] = useState(analysis?.facts || []);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { setFacts(workspace.analysis?.facts || []); }, [workspace.analysis]);

  const errMsg = (e) => e?.response?.data?.error || e.message;

  const analyze = async () => {
    if (analysis && !window.confirm("Documents haven't changed since the last extraction — re-analyzing spends AI credits. Continue?")) return;
    setBusy("analyze"); setError("");
    try {
      const res = await base44.functions.invoke("iepWorkspaceAnalyze", { workspace_id: workspace.id });
      await save({ analysis: res.data.analysis, status: "analysis" });
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(null); }
  };

  const generateDraft = async () => {
    setBusy("draft"); setError("");
    try {
      await save({ analysis: { ...analysis, facts } });
      const res = await base44.functions.invoke("iepWorkspaceDraft", { workspace_id: workspace.id });
      await save({ draft: res.data.draft });
      onDrafted();
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(null); }
  };

  if (!analysis) {
    return (
      <Card className="p-8 text-center">
        <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
        <h3 className="font-semibold">Extract and classify the documents</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
          CaseCue reads the uploaded files and extracts each fact with its source document, page number, and supporting excerpt. It never invents information — anything missing is listed as a gap for the team.
        </p>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
        <Button className="brand-gradient text-white mt-4" onClick={analyze} disabled={busy === "analyze"}>
          {busy === "analyze" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {busy === "analyze" ? "Reading documents…" : "Extract & analyze"}
        </Button>
      </Card>
    );
  }

  const verifiedCount = facts.filter((f) => f.verified).length;

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">Review extracted information</h3>
            <p className="text-sm text-muted-foreground">
              {facts.length} facts extracted · {verifiedCount} verified. Correct any fact or mark it verified — verified facts feed the draft; unverified facts are flagged.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={analyze} disabled={!!busy}>
            {busy === "analyze" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null} Re-extract
          </Button>
        </div>
      </Card>

      {facts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {facts.map((f, i) => (
            <FactCard
              key={i}
              fact={f}
              onToggleVerified={() => setFacts((prev) => prev.map((x, idx) => idx === i ? { ...x, verified: !x.verified } : x))}
              onToggleRejected={() => setFacts((prev) => prev.map((x, idx) => idx === i ? { ...x, rejected: !x.rejected, verified: x.rejected ? false : x.verified } : x))}
              onEdit={(text) => setFacts((prev) => prev.map((x, idx) => idx === i ? { ...x, fact: text, verified: true } : x))}
            />
          ))}
        </div>
      )}

      {(analysis.gaps || []).length > 0 && (
        <Card className="p-5 border-amber-200 bg-amber-50/40">
          <h4 className="font-semibold flex items-center gap-2 text-amber-800"><AlertTriangle className="h-4 w-4" /> Missing or outdated information ({analysis.gaps.length})</h4>
          <div className="mt-3 space-y-2">
            {analysis.gaps.map((g, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{g.issue}</span>
                {g.detail && <span className="text-muted-foreground"> — {g.detail}</span>}
                {g.suggested_action && <div className="text-xs text-muted-foreground">Suggested action: {g.suggested_action}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {(analysis.conflicts || []).length > 0 && (
        <Card className="p-5 border-rose-200 bg-rose-50/40">
          <h4 className="font-semibold flex items-center gap-2 text-rose-800"><GitCompare className="h-4 w-4" /> Conflicting information ({analysis.conflicts.length})</h4>
          <div className="mt-3 space-y-2">
            {analysis.conflicts.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{c.description}</span>
                {c.documents_involved && <div className="text-xs text-muted-foreground">Documents: {c.documents_involved}</div>}
                {c.suggested_action && <div className="text-xs text-muted-foreground">Suggested action: {c.suggested_action}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center gap-3 flex-wrap">
        <Button variant="outline" onClick={async () => { setBusy("save"); try { await save({ analysis: { ...analysis, facts } }); } finally { setBusy(null); } }} disabled={!!busy}>
          {busy === "save" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save verification
        </Button>
        <Button className="brand-gradient text-white" onClick={generateDraft} disabled={!!busy}>
          {busy === "draft" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {busy === "draft" ? "Drafting IEP…" : "Generate IEP draft →"}
        </Button>
      </div>
    </div>
  );
}
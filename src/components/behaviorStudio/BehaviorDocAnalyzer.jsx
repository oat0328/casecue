import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StudentSelector from "@/components/forms/StudentSelector";
import BehaviorResults from "@/components/behaviorStudio/BehaviorResults";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/cards";
import { useToast } from "@/components/ui/use-toast";

const CONFIG = {
  bip: {
    docType: "BIP",
    label: "BIP Analyzer",
    runLabel: "Analyze BIP",
    missingDoc: "No BIP documents found for this student yet — upload one under Documents, then return here.",
    sections: [
      { key: "target_behaviors", title: "Target behaviors", kind: "objects", fields: ["behavior", "definition", "baseline"], fieldLabels: ["Behavior", "Definition", "Baseline"] },
      { key: "behavior_patterns", title: "Behavior patterns", kind: "strings" },
      { key: "triggers", title: "Triggers & antecedents", kind: "strings" },
      { key: "replacement_behaviors", title: "Replacement behaviors", kind: "strings" },
      { key: "interventions", title: "Current interventions", kind: "strings" },
      { key: "reinforcement", title: "Reinforcement systems", kind: "strings" },
      { key: "strengths", title: "BIP strengths", kind: "strings" },
      { key: "recommended_updates", title: "Recommended updates", kind: "objects", fields: ["area", "recommendation"], fieldLabels: ["Area", "Recommendation"] },
      { key: "missing_information", title: "Missing information", kind: "strings" },
    ],
  },
  fba: {
    docType: "FBA",
    label: "FBA Assistant",
    runLabel: "Analyze FBA",
    missingDoc: "No FBA documents found for this student yet — upload one under Documents, then return here.",
    sections: [
      { key: "behavior_functions", title: "Behavior functions", kind: "objects", fields: ["behavior", "hypothesized_function", "evidence"], fieldLabels: ["Behavior", "Hypothesized function", "Evidence"] },
      { key: "triggers", title: "Trigger analysis", kind: "strings" },
      { key: "environmental_factors", title: "Environmental factors", kind: "strings" },
      { key: "data_trends", title: "Data trends", kind: "strings" },
      { key: "suggested_interventions", title: "Suggested interventions", kind: "strings" },
      { key: "missing_information", title: "Missing information", kind: "strings" },
    ],
  },
};

// BIP Analyzer / FBA Assistant — pick a student, pick their uploaded BIP or FBA
// document, and run a structured AI analysis grounded in the document only.
export default function BehaviorDocAnalyzer({ students, analysisType }) {
  const { toast } = useToast();
  const cfg = CONFIG[analysisType];
  const [studentId, setStudentId] = useState("");
  const [docs, setDocs] = useState([]);
  const [docId, setDocId] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    setStudentId("");
    setDocId("");
    setAnalysis(null);
  }, [analysisType]);

  useEffect(() => {
    if (!studentId) { setDocs([]); setDocId(""); setAnalysis(null); return; }
    let alive = true;
    setLoadingDocs(true);
    setDocId("");
    setAnalysis(null);
    base44.entities.Document.filter({ student_id: studentId, document_type: cfg.docType })
      .then((res) => { if (alive) setDocs(res || []); })
      .catch(() => { if (alive) setDocs([]); })
      .finally(() => { if (alive) setLoadingDocs(false); });
    return () => { alive = false; };
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    if (!docId) return;
    setRunning(true);
    try {
      const res = await base44.functions.invoke("analyzeBehaviorDoc", { document_id: docId, analysis_type: analysisType });
      setAnalysis(res.data.analysis);
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e.response?.data?.error || e.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-5">{cfg.label}</h2>
        <StudentSelector
          students={students}
          value={studentId}
          onChange={setStudentId}
          label="Student"
          placeholder="Select a student…"
          required
        />
        <div className="w-full max-w-[480px] mb-5">
          <Label>Document</Label>
          <select
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            disabled={!studentId || loadingDocs}
            className="mt-2 w-full min-h-[44px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{loadingDocs ? "Loading…" : "Select a document…"}</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>{d.filename}</option>
            ))}
          </select>
          {studentId && !loadingDocs && docs.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-600">{cfg.missingDoc}</p>
          )}
        </div>
        <Button
          onClick={run}
          disabled={!studentId || !docId || running}
          className="brand-gradient text-white"
        >
          {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {running ? "Analyzing…" : cfg.runLabel}
        </Button>
      </Card>

      {analysis && (
        <div className="mt-6">
          <BehaviorResults analysis={analysis} sections={cfg.sections} />
        </div>
      )}
    </div>
  );
}
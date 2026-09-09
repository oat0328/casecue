import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function AskCaseCueButton() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    try {
      const res = await base44.functions.invoke("askCaseCue", {
        question,
        history: [],
        mode: "caseload",
      });
      setAnswer(res.data.answer);
    } catch (e) {
      setAnswer("CaseCue ran into an issue right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToFullChat = () => {
    setOpen(false);
    navigate("/ask-casecue");
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full brand-gradient text-white px-5 py-3.5 shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold text-sm">Ask CaseCue</span>
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-96 rounded-2xl border border-border bg-card card-shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border brand-gradient text-white">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Sparkles className="h-4 w-4" /> Ask CaseCue
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close Ask CaseCue" className="p-1 rounded-lg hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {answer && (
              <div className="rounded-xl bg-muted p-3 whitespace-pre-wrap leading-relaxed">{answer}</div>
            )}
            {!answer && !loading && (
              <div className="text-muted-foreground text-center py-6">
                Ask about your caseload — e.g. "Which IEPs are coming due?"
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> CaseCue is thinking…
              </div>
            )}
          </div>
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="Ask a question…"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button onClick={ask} disabled={loading || !question.trim()} aria-label="Send question" className="rounded-lg brand-gradient text-white p-2 disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <button onClick={goToFullChat} className="text-xs text-primary font-medium hover:underline w-full text-center">
              Open full chat →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
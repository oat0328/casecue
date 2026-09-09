import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StudentSelector from "@/components/forms/StudentSelector";

const SUGGESTIONS = [
  "Which students need data this week?",
  "Which IEPs are coming due?",
  "Prepare me for Daniel's meeting.",
  "Draft present levels from recent data.",
  "Help me improve this goal.",
  "Create a reading lesson.",
  "Generate an emergency sub plan.",
];

export default function AskCaseCue() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: conversations, refetch } = useAsync(() => base44.entities.AIConversation.list('-updated_date', 50), []);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("caseload");
  const [studentId, setStudentId] = useState("");
  const scrollRef = useRef(null);

  const active = (conversations || []).find((c) => c.id === activeId);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const newConversation = () => { setActiveId(null); setMessages([]); };

  const openConversation = (c) => { setActiveId(c.id); setMessages(c.messages || []); setMode(c.mode || "caseload"); setStudentId(c.student_id || ""); };

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput("");
    const userMsg = { role: "user", content: question, timestamp: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await base44.functions.invoke("askCaseCue", {
        question, history: newMsgs.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        mode, student_id: mode === "single" ? studentId : null,
      });
      const answer = res.data.answer;
      const aiMsg = { role: "assistant", content: answer, timestamp: new Date().toISOString() };
      const updated = [...newMsgs, aiMsg];
      setMessages(updated);
      if (activeId) {
        await base44.entities.AIConversation.update(activeId, { messages: updated });
      } else {
        const created = await base44.entities.AIConversation.create({
          title: question.slice(0, 50), messages: updated, mode, student_id: mode === "single" ? studentId : null,
        });
        setActiveId(created.id); refetch();
      }
    } catch (e) {
      toast({ title: "CaseCue couldn't respond", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const deleteConversation = async (id) => { await base44.entities.AIConversation.delete(id); if (activeId === id) { setActiveId(null); setMessages([]); } refetch(); };

  return (
    <div>
      <PageHeader title="Ask CaseCue" subtitle="Ask questions across your caseload or about a single student. CaseCue only uses your verified data — it never invents student facts." icon={MessageCircle} />

      <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
        {/* Conversation list */}
        <Card className="p-3 lg:col-span-1 flex flex-col">
          <Button onClick={newConversation} variant="outline" className="w-full mb-3 border-primary/30 text-primary"><Plus className="h-4 w-4 mr-1" /> New conversation</Button>
          <div className="flex-1 overflow-y-auto space-y-1">
            {(conversations || []).map((c) => (
              <div key={c.id} className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer ${activeId === c.id ? "bg-primary/10" : "hover:bg-muted"}`} onClick={() => openConversation(c)}>
                <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{c.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-rose-500" /></button>
              </div>
            ))}
            {(conversations || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>}
          </div>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <div className="flex items-center gap-2 font-semibold text-sm"><Sparkles className="h-4 w-4 text-primary" /> CaseCue</div>
            <div className="flex items-center gap-2 ml-auto">
              <select aria-label="Answer scope" value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs min-h-[36px]">
                <option value="caseload">Full caseload</option>
                <option value="single">Single student</option>
              </select>
            </div>
          </div>
          {mode === "single" && (
            <div className="px-4 py-5 border-b border-border">
              <StudentSelector
                students={students || []}
                value={studentId}
                onChange={setStudentId}
                noBottomSpace
              />
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-2xl brand-gradient flex items-center justify-center mb-4"><Sparkles className="h-7 w-7 text-white" /></div>
                <h3 className="font-semibold text-lg">Ask CaseCue anything</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-6 max-w-md">Grounded in your verified student data. Try one of these:</p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="text-left text-sm rounded-xl border border-border px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "brand-gradient text-white" : "bg-muted"}`}>
                    {m.content}
                  </div>
                  {m.role === "assistant" && (
                    <p className="text-[11px] text-muted-foreground mt-1 px-1">AI-generated draft. Educator and IEP-team review required.</p>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> CaseCue is thinking…</div>}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask about your caseload…" className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              <Button onClick={() => send()} disabled={loading || !input.trim()} className="brand-gradient text-white rounded-xl px-4"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
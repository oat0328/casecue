import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UsersRound, Plus, Sparkles, Loader2, Trash2, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import AddToCalendar from "@/components/meetings/AddToCalendar";
import MeetingNotesGenerator from "@/components/meetings/MeetingNotesGenerator";
import StudentSelector from "@/components/forms/StudentSelector";
import AiDisclaimer from "@/components/shared/AiDisclaimer";
import ExportBar from "@/components/shared/ExportBar";

const MEETING_TYPES = ["IEP", "MET", "Evaluation", "Other"];

export default function MeetingCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: meetings, refetch } = useAsync(() => base44.entities.Meeting.list('date', 100), []);
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: scheduleEntries } = useAsync(() => base44.entities.ScheduleEntry.list('-day', 500), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", title: "", meeting_type: "IEP", date: "", time: "", location: "", agenda: "", parent_concerns: "", teacher_concerns: "" });
  const [saving, setSaving] = useState(false);
  const [prep, setPrep] = useState(null);
  const [preparing, setPreparing] = useState(null);
  const [timeSuggestions, setTimeSuggestions] = useState([]);

  // Preserve student context: /meetings?student=<id> opens the schedule
  // dialog with that student already preselected.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("student");
    if (p) {
      setForm((f) => ({ ...f, student_id: p }));
      setOpen(true);
    }
  }, []);

  const studentName = (id) => { const s = (students || []).find((x) => x.id === id); return s ? `${s.first_name} ${s.last_name}` : "—"; };

  const add = async () => {
    if (!form.title || !form.date) { toast({ title: "Title and date required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.Meeting.create({ ...form, status: "scheduled" });
      setForm({ student_id: "", title: "", meeting_type: "IEP", date: "", time: "", location: "", agenda: "", parent_concerns: "", teacher_concerns: "" });
      setOpen(false); refetch(); toast({ title: "Meeting scheduled" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const prepare = async (m) => {
    setPreparing(m.id);
    try {
      const student = m.student_id ? await base44.entities.Student.get(m.student_id) : null;
      const goals = m.student_id ? await base44.entities.Goal.filter({ student_id: m.student_id }) : [];
      const progress = m.student_id ? await base44.entities.ProgressData.filter({ student_id: m.student_id }, '-date', 10) : [];
      const context = student ? `Student: ${student.first_name} ${student.last_name} (Grade ${student.grade}). Strengths: ${student.strengths || "—"}. Needs: ${student.areas_of_need || "—"}. Goals: ${goals.map((g) => g.goal_text).join("; ") || "—"}. Recent progress: ${progress.map((p) => `${p.date}: ${p.percentage}%`).join(", ") || "—"}` : "No student linked.";
      const res = await base44.functions.invoke("askCaseCue", {
        question: `Prepare me for this ${m.meeting_type} meeting titled "${m.title}" on ${m.date}. Provide an agenda, student snapshot, recent progress summary, and suggested discussion points. ${context}`,
        history: [], mode: "caseload",
      });
      setPrep({ meeting: m, content: res.data.answer });
    } catch (e) { toast({ title: "Prep failed", description: e.message, variant: "destructive" }); }
    finally { setPreparing(null); }
  };

  const remove = async (id) => { await base44.entities.Meeting.delete(id); refetch(); };

  const suggestTimes = () => {
    if (!form.date) { toast({ title: 'Choose a meeting date first', variant: 'destructive' }); return; }
    const day = new Date(`${form.date}T12:00:00`).toLocaleDateString('en-US',{weekday:'long'});
    const toMin = (t) => { const m=String(t||'').match(/^(\d{1,2}):(\d{2})/); return m?Number(m[1])*60+Number(m[2]):null; };
    const blocked = (scheduleEntries||[]).filter(e=>!e.archived&&e.day===day).map(e=>[toMin(e.start_time),toMin(e.end_time)]).filter(x=>x[0]!=null&&x[1]!=null);
    (meetings||[]).filter(m=>m.date===form.date&&m.status==='scheduled'&&m.time).forEach(m=>{const s=toMin(m.time); if(s!=null)blocked.push([s,s+60]);});
    const candidates=[];
    for(let start=7*60+30; start<=16*60+30; start+=15){const end=start+45; if(!blocked.some(([a,b])=>start<b&&end>a))candidates.push(start);}
    const preferred=candidates.sort((a,b)=>Math.abs(a-(15*60+15))-Math.abs(b-(15*60+15))).slice(0,3).sort((a,b)=>a-b);
    const fmt=(m)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    setTimeSuggestions(preferred.map(fmt));
    if(!preferred.length)toast({title:'No open 45-minute slots found',description:'Try another date or adjust your schedule.'});
  };

  return (
    <div>
      <PageHeader title="Meeting Center" subtitle="Upcoming IEP, MET, and evaluation meetings. Prepare agendas, snapshots, and follow-up tasks with CaseCue." icon={UsersRound}
        actions={<Button className="brand-gradient text-white" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Schedule meeting</Button>} />

      <div className="space-y-3">
        {(meetings || []).map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{m.title}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {m.date}{m.time ? ` · ${m.time}` : ""} · {m.meeting_type} · {studentName(m.student_id)}{m.location ? ` · ${m.location}` : ""}</div>
              </div>
              <div className="flex gap-2">
                <AddToCalendar meeting={m} student={(students || []).find((x) => x.id === m.student_id)} />
                <Button variant="outline" size="sm" onClick={() => prepare(m)} disabled={preparing === m.id} className="border-primary/30 text-primary">
                  {preparing === m.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} Prepare Meeting With CaseCue
                </Button>
                <MeetingNotesGenerator meeting={m} onSaved={refetch} />
                <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            </div>
            {m.agenda && <div className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Agenda:</span> {m.agenda}</div>}
          </Card>
        ))}
        {(meetings || []).length === 0 && <p className="text-muted-foreground text-center py-8">No meetings scheduled.</p>}
      </div>

      {prep && (
        <Dialog open onOpenChange={(o) => !o && setPrep(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Meeting prep — {prep.meeting.title}</DialogTitle></DialogHeader>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{prep.content}</div>
            <ExportBar
              title={`Meeting Prep — ${prep.meeting.title}`}
              subtitle="Meeting preparation"
              filename={`Meeting-Prep-${prep.meeting.title}`}
              sections={[{ heading: "Meeting Preparation", body: prep.content }]}
              gated
              className="mt-3"
            />
            <AiDisclaimer className="mt-2" />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule meeting</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <StudentSelector
                students={students || []}
                value={form.student_id}
                onChange={(id) => setForm({ ...form, student_id: id })}
                placeholder="—"
                noBottomSpace
              />
            </div>
            <div><Label>Type</Label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}>
                {MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => {setForm({ ...form, date: e.target.value });setTimeSuggestions([]);}} /></div>
            <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            <div className="col-span-2 rounded-xl border bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Automatic meeting time proposals</div><div className="text-xs text-muted-foreground">Checks your CaseCue instruction schedule and already-scheduled CaseCue meetings for open 45-minute slots.</div></div><Button type="button" variant="outline" size="sm" onClick={suggestTimes}>Suggest times</Button></div>{timeSuggestions.length>0&&<div className="flex flex-wrap gap-2 mt-3">{timeSuggestions.map(t=><button key={t} type="button" onClick={()=>setForm({...form,time:t})} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${form.time===t?'border-blue-600 bg-blue-50 text-blue-700':'bg-white'}`}>{t}</button>)}</div>}</div>
            <div className="col-span-2"><Label>Location / virtual meeting link</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Room 12 or https://meet.google.com/…" className="mt-1" /></div>
            <div className="col-span-2"><Label>Agenda</Label><Textarea rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></div>
            <div><Label>Parent concerns</Label><Textarea rows={2} value={form.parent_concerns} onChange={(e) => setForm({ ...form, parent_concerns: e.target.value })} /></div>
            <div><Label>Teacher concerns</Label><Textarea rows={2} value={form.teacher_concerns} onChange={(e) => setForm({ ...form, teacher_concerns: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={saving} className="brand-gradient text-white">{saving ? "Saving…" : "Schedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
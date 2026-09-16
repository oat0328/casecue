import React, { useMemo } from "react";
import { Card } from "@/components/ui/cards";
import { CheckCircle2, AlertTriangle, CalendarDays } from "lucide-react";
import ExportBar from "@/components/shared/ExportBar";

const iso = (d) => d.toISOString().slice(0, 10);
const dateOf = (r) => String(r?.date || r?.created_date || r?.updated_date || "").slice(0, 10);
const hasStudent = (r, id) => r?.student_id === id || (r?.student_ids || []).includes(id);

function weekWindow() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate() - ((day + 6) % 7));
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
  return { start: iso(monday), end: iso(friday) };
}

export default function WeeklyFamilyUpdate({ student, goals = [], progress = [], sessions = [], assignments = [] }) {
  const report = useMemo(() => {
    const range = weekWindow();
    const inWeek = (r) => { const d = dateOf(r); return d && d >= range.start && d <= range.end; };
    const p = progress.filter(r => r.student_id === student.id && inWeek(r));
    const s = sessions.filter(r => hasStudent(r, student.id) && inWeek(r));
    const a = assignments.filter(r => r.student_id === student.id && inWeek(r));
    const evidenceDates = [...new Set([...p, ...s, ...a].map(dateOf).filter(Boolean))].sort();
    const last = evidenceDates[evidenceDates.length - 1] || null;
    const latestAge = last ? Math.floor((new Date() - new Date(`${last}T00:00:00`)) / 86400000) : 99;
    const ready = evidenceDates.length >= 2 && latestAge <= 2;
    const goalIds = new Set(p.map(x => x.goal_id).filter(Boolean));
    const goalAreas = goals.filter(g => g.student_id === student.id && goalIds.has(g.id)).map(g => g.goal_area).filter(Boolean);
    const scored = a.filter(x => Number(x.score_possible) > 0);
    const avg = scored.length ? Math.round(scored.reduce((n,x)=>n+(Number(x.score_earned)/Number(x.score_possible))*100,0)/scored.length) : null;
    const minutes = s.reduce((n,x)=>n+Number(x.delivered_minutes ?? x.duration_minutes ?? x.minutes ?? 0),0);
    const sections = [
      { heading: "This Week", body: `${evidenceDates.length} day${evidenceDates.length===1?'':'s'} of recorded evidence · ${s.length} service/session record${s.length===1?'':'s'} · ${a.length} assignment${a.length===1?'':'s'} · ${p.length} goal progress point${p.length===1?'':'s'}.` },
      { heading: "Learning & IEP Progress", body: goalAreas.length ? `Progress was recorded in: ${[...new Set(goalAreas)].join(', ')}.` : "No goal-linked progress was recorded this week yet." },
      { heading: "Classwork", body: avg == null ? "No scored classwork is recorded for this week yet." : `${scored.length} scored assignment${scored.length===1?'':'s'} · weekly average ${avg}%.` },
      { heading: "Services & Support", body: s.length ? `${minutes} delivered minute${minutes===1?'':'s'} recorded across ${s.length} session${s.length===1?'':'s'} this week.` : "No service/session records are entered for this week yet." },
      { heading: "Family Note", body: "This weekly update summarizes records entered by school staff. Please contact the school team with questions or information you would like us to consider." },
    ];
    return { range, evidenceDates, last, latestAge, ready, sections };
  }, [student, goals, progress, sessions, assignments]);

  const title = `Weekly Family Update — ${student.first_name} ${student.last_name}`;
  return <Card className="p-6 border-blue-200">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-700"/><h2 className="font-black text-lg">Friday Family Update</h2></div>
        <p className="text-sm text-slate-500 mt-1">Keep data current during the week. By Friday, review the summary and then email, print, PDF, DOCX, or share it with the family.</p>
      </div>
      <div className={`rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${report.ready?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>
        {report.ready?<CheckCircle2 className="h-4 w-4"/>:<AlertTriangle className="h-4 w-4"/>}{report.ready?'Ready for Friday review':'Needs fresh data'}
      </div>
    </div>
    <div className="grid sm:grid-cols-3 gap-3 mt-5">
      <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Data days this week</div><div className="text-2xl font-black mt-1">{report.evidenceDates.length}</div><div className="text-xs text-slate-500">Goal data, sessions, or gradebook work</div></div>
      <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Last update</div><div className="font-black mt-1">{report.last || 'None yet'}</div><div className="text-xs text-slate-500">Target: update every 1–2 school days</div></div>
      <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">Friday status</div><div className="font-black mt-1">{report.ready?'Review & send':'Not ready'}</div><div className="text-xs text-slate-500">Teacher review is required before family sharing</div></div>
    </div>
    {!report.ready && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>What to do:</b> Upload or enter student work, IXL/progress data, or session notes today. The Friday summary rebuilds from the newest records.</div>}
    <div className="mt-5 space-y-3">{report.sections.slice(0,4).map(x=><div key={x.heading} className="rounded-xl border p-4"><div className="text-xs font-black uppercase tracking-wider text-blue-700">{x.heading}</div><div className="text-sm mt-1 text-slate-700">{x.body}</div></div>)}</div>
    <div className="mt-5 border-t pt-4">
      <div className="text-sm font-bold mb-2">Teacher-reviewed sharing</div>
      <ExportBar title={title} subtitle={`${report.range.start} through ${report.range.end}`} filename={`Weekly-Family-Update-${student.first_name}-${student.last_name}-${report.range.end}`} sections={report.sections} gated />
      <p className="text-xs text-slate-500 mt-2">The system can prepare this automatically from recorded data, but it should not send to a parent until a teacher reviews and approves it.</p>
    </div>
  </Card>;
}

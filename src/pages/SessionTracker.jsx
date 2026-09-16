import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Timer, Zap, Users, Clock3, Target, FileUp, BarChart3, ClipboardList } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import SessionForm from "@/components/sessionTracker/SessionForm";
import GroupSessionForm from "@/components/sessionTracker/GroupSessionForm";
import MinutesDashboard from "@/components/sessionTracker/MinutesDashboard";
import GoalProgressChart from "@/components/sessionTracker/GoalProgressChart";
import SessionList from "@/components/sessionTracker/SessionList";
import StudentSelector from "@/components/forms/StudentSelector";
import SessionDashboard from "@/components/sessionTracker/SessionDashboard";
import SessionCharts from "@/components/sessionTracker/SessionCharts";
import PrintExportPanel from "@/components/sessionTracker/PrintExportPanel";
import ComplianceReport from "@/components/sessionTracker/ComplianceReport";
import SessionReportGenerator from "@/components/sessionTracker/SessionReportGenerator";
import SessionImportPanel from "@/components/sessionTracker/SessionImportPanel";

const TABS = [
  { key: "quick", label: "Quick Entry", sub: "Fast individual data", icon: Zap },
  { key: "detailed", label: "Detailed Entry", sub: "Full session record", icon: ClipboardList },
  { key: "group", label: "Group Session", sub: "One group, separate student records", icon: Users },
  { key: "log", label: "Student Log", sub: "Minutes, goals & history", icon: Clock3 },
  { key: "import", label: "10,000-Entry Import", sub: "Bulk session tracking system", icon: FileUp },
  { key: "reports", label: "Reports", sub: "Caseload analytics & exports", icon: BarChart3 },
];

const todayISO=()=>new Date().toISOString().slice(0,10);

export default function SessionTracker() {
  const [tab, setTab] = useState("quick");
  const [logStudentId, setLogStudentId] = useState("");
  const [searchParams] = useSearchParams();
  const { data: rawStudents } = useAsync(() => base44.entities.Student.list('-last_name', 500), []);
  const students = useMemo(() => [...(rawStudents || [])].sort((a,b)=>`${a.last_name||''},${a.first_name||''}`.localeCompare(`${b.last_name||''},${b.first_name||''}`,undefined,{sensitivity:'base'})), [rawStudents]);
  const { data: sessions, refetch: refetchSessions } = useAsync(() => base44.entities.SessionRecord.filter({}, '-date', 500), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-created_date',1000), []);
  const { data: scheduleEntries } = useAsync(() => base44.entities.ScheduleEntry.list('-created_date',500), []);

  const recentActivities = useMemo(() => {
    const seen = [];
    (sessions || []).forEach((s) => { if (s.activity && !seen.includes(s.activity)) seen.push(s.activity); });
    return seen.slice(0, 6);
  }, [sessions]);

  const favoriteGoalIds = useMemo(() => {
    const counts = {};
    (sessions || []).forEach((s) => { if (s.goal_id) counts[s.goal_id] = (counts[s.goal_id] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 3);
  }, [sessions]);

  const recentPrompts = useMemo(() => {
    const seen = [];
    (sessions || []).forEach((s) => (s.tags || []).forEach((t) => { if (!seen.includes(t)) seen.push(t); }));
    return seen.slice(0, 8);
  }, [sessions]);

  const lastSession = (sessions || [])[0];
  const lastSessionPrefill = lastSession ? { service_type: lastSession.service_type, setting: lastSession.setting, location: lastSession.location, activity: lastSession.activity, scheduled_minutes: lastSession.scheduled_minutes } : null;

  const lessonPrefill = useMemo(() => {
    const sid = searchParams.get("student_id"), gid = searchParams.get("goal_id"), activity = searchParams.get("activity"), note = searchParams.get("note");
    if (!sid && !gid && !activity && !note) return null;
    return { student_id: sid || "", goal_id: gid || "", activity: activity || "", qualitative: note || "" };
  }, [searchParams]);

  const prefill = lessonPrefill ? { ...(lastSessionPrefill || {}), ...lessonPrefill } : lastSessionPrefill;
  const defaultStudentId = lessonPrefill?.student_id || "";

  const today=todayISO();
  const todaySessions=(sessions||[]).filter(s=>s.date===today);
  const todayMinutes=todaySessions.reduce((n,s)=>n+(Number(s.delivered_minutes??s.duration_minutes)||0),0);
  const todayStudents=new Set(todaySessions.map(s=>s.student_id).filter(Boolean)).size;
  const linkedToday=todaySessions.filter(s=>s.goal_id).length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[#07101f] p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-32 bottom-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[.2em] text-sky-300">CaseCue Service Documentation</div>
            <div className="mt-3 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Timer className="h-6 w-6 text-sky-300"/></div><h1 className="text-3xl sm:text-4xl font-black tracking-tight">Session Tracker</h1></div>
            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-7 text-slate-300">Your full service-data system: individual and group sessions, weekly quantitative and qualitative notes, IEP-goal alignment, delivered minutes, reports, and the 10,000-entry historical import engine.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-2xl font-black">{todaySessions.length}</div><div className="text-[11px] text-slate-400">Sessions today</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-2xl font-black">{todayStudents}</div><div className="text-[11px] text-slate-400">Students seen</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-2xl font-black">{todayMinutes}</div><div className="text-[11px] text-slate-400">Minutes delivered</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-2xl font-black">{linkedToday}</div><div className="text-[11px] text-slate-400">Goal-linked</div></div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {TABS.map((t) => {const I=t.icon,active=tab===t.key;return <button key={t.key} onClick={() => setTab(t.key)} className={`group rounded-2xl border p-4 text-left transition-all ${active?'border-slate-950 bg-slate-950 text-white shadow-lg':'bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'}`}><div className={`grid h-9 w-9 place-items-center rounded-xl ${active?'bg-white/10':'bg-blue-50'}`}><I className={`h-4 w-4 ${active?'text-sky-300':'text-blue-700'}`}/></div><div className="mt-3 text-sm font-black">{t.label}</div><div className={`mt-1 text-[11px] leading-4 ${active?'text-slate-400':'text-slate-500'}`}>{t.sub}</div></button>})}
      </div>

      {tab === "quick" && <SessionForm mode="quick" students={students} goals={goals} prefill={prefill} defaultStudentId={defaultStudentId} recentActivities={recentActivities} favoriteGoalIds={favoriteGoalIds} recentPrompts={recentPrompts} onSaved={refetchSessions} />}
      {tab === "detailed" && <SessionForm mode="detailed" students={students} goals={goals} prefill={prefill} defaultStudentId={defaultStudentId} recentActivities={recentActivities} favoriteGoalIds={favoriteGoalIds} recentPrompts={recentPrompts} onSaved={refetchSessions} />}
      {tab === "group" && <GroupSessionForm students={students} goals={goals} recentActivities={recentActivities} onSaved={refetchSessions} />}
      {tab === "log" && <div className="space-y-4"><Card className="p-4 sm:p-5"><div className="mb-3"><div className="text-xs font-black uppercase tracking-wider text-blue-700">Student service history</div><h2 className="text-lg font-black">Open a student log</h2></div><StudentSelector students={students || []} value={logStudentId} onChange={setLogStudentId} noBottomSpace /></Card>{logStudentId ? <><MinutesDashboard student={(students || []).find((s) => s.id === logStudentId)} sessions={(sessions || []).filter((s) => s.student_id === logStudentId)} goals={goals}/><GoalProgressChart sessions={(sessions || []).filter((s) => s.student_id === logStudentId)} goals={(goals || []).filter((g) => g.student_id === logStudentId)}/><SessionList sessions={(sessions || []).filter((s) => s.student_id === logStudentId)} goals={goals}/></> : <Card className="p-10 text-center"><Target className="h-8 w-8 mx-auto text-blue-600"/><p className="mt-3 font-bold">Choose a student to open their service ledger</p><p className="mt-1 text-sm text-slate-500">Minutes, goal-linked data, trends, and every recorded session will appear here.</p></Card>}</div>}
      {tab === "import" && <SessionImportPanel students={students || []} goals={goals || []} sessions={sessions || []} onImported={refetchSessions}/>} 
      {tab === "reports" && <div className="space-y-4"><SessionDashboard sessions={sessions} students={students} goals={goals} upcomingServices={(scheduleEntries || []).length}/><PrintExportPanel sessions={sessions} students={students} goals={goals}/><SessionCharts sessions={sessions} goals={goals}/><ComplianceReport sessions={sessions} students={students}/><SessionReportGenerator sessions={sessions} students={students} goals={goals}/></div>}
    </div>
  );
}
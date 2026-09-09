import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarClock, FileWarning, Users, ClipboardCheck, FileX, AlertCircle,
  ListTodo, Sparkles, FileEdit, Target, ClipboardList, BookOpen, Clock, TrendingUp
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import DeadlineAlerts from "@/components/deadlineAlerts/DeadlineAlerts";
import DemoTour from "@/components/onboarding/DemoTour";
import { useAuth } from "@/lib/AuthContext";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import GettingStartedCard from "@/components/onboarding/GettingStartedCard";
import AddToCalendar from "@/components/meetings/AddToCalendar";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

const QUICK_ACTIONS = [
  { label: "Generate Present Levels", icon: FileEdit, path: "/iep-studio" },
  { label: "Draft Annual Goal", icon: Target, path: "/iep-studio" },
  { label: "Create Progress Report", icon: ClipboardCheck, path: "/data-center" },
  { label: "Prepare Meeting", icon: Users, path: "/meetings" },
  { label: "Create Lesson", icon: BookOpen, path: "/lesson-studio" },
  { label: "Generate Sub Plan", icon: ClipboardList, path: "/sub-plans" },
  { label: "Ask CaseCue", icon: Sparkles, path: "/ask-casecue" },
];

export default function Today() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: tasks } = useAsync(() => base44.entities.Task.filter({ status: 'open' }, '-due_date', 50), []);
  const { data: meetings } = useAsync(() => base44.entities.Meeting.filter({ status: 'scheduled' }, 'date', 50), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 200), []);
  const { data: progress } = useAsync(() => base44.entities.ProgressData.list('-date', 200), []);
  const { data: sessionRecords } = useAsync(() => base44.entities.SessionRecord.list('-date', 200), []);
  const { data: allTasks } = useAsync(() => base44.entities.Task.list('-updated_date', 200), []);

  const stats = useMemo(() => {
    const s = students || [];
    const iepsDue = s.filter((st) => {
      const d = daysUntil(st.annual_review_due);
      return d !== null && d >= 0 && d <= 45;
    });
    const reevalsDue = s.filter((st) => {
      const d = daysUntil(st.reevaluation_due);
      return d !== null && d >= 0 && d <= 60;
    });
    const meetingsUpcoming = (meetings || []).filter((m) => {
      const d = daysUntil(m.date);
      return d !== null && d >= 0 && d <= 30;
    });
    const studentIds = new Set(s.map((st) => st.id));
    const withRecentProgress = new Set((progress || []).map((p) => p.student_id));
    const needingData = s.filter((st) => !withRecentProgress.has(st.id));
    const missingBaselines = (goals || []).filter((g) => studentIds.has(g.student_id) && !g.baseline);
    const missingDocs = s.filter((st) => !st.present_levels);
    return { iepsDue, reevalsDue, meetingsUpcoming, needingData, missingBaselines, missingDocs, total: s.length };
  }, [students, tasks, meetings, goals, progress]);

  // Real activity this week — no estimated or hard-coded numbers.
  const weekActivity = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dow = (now.getDay() + 6) % 7;
    const start = new Date(now); start.setDate(now.getDate() - dow);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    const inWeek = (d) => { const t = new Date(`${d}T00:00:00`); return !isNaN(t) && t >= start && t < end; };
    const sessionsThisWeek = (sessionRecords || []).filter((s) => inWeek(s.date));
    return {
      sessions: sessionsThisWeek.length,
      studentsWithSessions: new Set(sessionsThisWeek.map((s) => s.student_id)).size,
      progressPoints: (progress || []).filter((p) => inWeek(p.date)).length,
      tasksCompleted: (allTasks || []).filter((t) => t.status === "done" && inWeek(t.updated_date?.slice(0, 10))).length,
      meetings: (meetings || []).filter((m) => inWeek(m.date)).length,
    };
  }, [sessionRecords, progress, allTasks, meetings]);

  const attentionCards = [
    { label: "IEPs due soon", count: stats.iepsDue.length, icon: CalendarClock, tone: "amber", link: "/students" },
    { label: "Reevaluations due", count: stats.reevalsDue.length, icon: FileWarning, tone: "amber", link: "/students" },
    { label: "Meetings coming up", count: stats.meetingsUpcoming.length, icon: Users, tone: "blue", link: "/meetings" },
    { label: "Students needing data", count: stats.needingData.length, icon: ClipboardCheck, tone: "red", link: "/data-center" },
    { label: "Missing baselines", count: stats.missingBaselines.length, icon: Target, tone: "amber", link: "/iep-studio" },
    { label: "Missing documentation", count: stats.missingDocs.length, icon: FileX, tone: "red", link: "/iep-studio" },
    { label: "Tasks needing attention", count: (tasks || []).filter((t) => t.status === 'open').length, icon: ListTodo, tone: "default", link: "/app" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Today</h1>
        <p className="text-muted-foreground mt-1">What needs your attention right now.</p>
      </div>

      {/* Finish-setup banner for accounts that skipped onboarding */}
      {user && !user?.data?.onboarding_completed && (
        <Link to="/onboarding" className="mb-6 flex items-center justify-between rounded-2xl border border-primary/25 bg-card p-4 card-shadow hover:border-primary/50 transition-colors">
          <span className="text-sm font-medium">Finish setting up your CaseCue profile</span>
          <span className="text-sm font-semibold text-primary">Continue →</span>
        </Link>
      )}

      {/* Deadline alerts */}
      <DeadlineAlerts students={students} />

      <OnboardingTour />
      <DemoTour />
      <GettingStartedCard students={students} goals={goals} progress={progress} />

      {/* Real activity this week */}
      <Card className="mb-8 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="brand-gradient text-white p-6 md:w-64 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium"><Clock className="h-4 w-4" /> Your Activity This Week</div>
            <div className="text-4xl font-bold mt-1">{weekActivity.sessions}</div>
            <div className="text-white/80 text-sm mt-1">sessions logged</div>
          </div>
          <div className="p-6 flex-1">
            <div className="text-sm font-medium text-muted-foreground mb-4">Counts update from your real records</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Sessions logged", value: weekActivity.sessions, icon: ClipboardCheck },
                { label: "Students served", value: weekActivity.studentsWithSessions, icon: Users },
                { label: "Progress data points", value: weekActivity.progressPoints, icon: TrendingUp },
                { label: "Tasks completed", value: weekActivity.tasksCompleted, icon: ListTodo },
              ].map((it) => (
                <div key={it.label} className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg brand-gradient-soft flex items-center justify-center"><it.icon className="h-4 w-4 text-primary" /></div>
                  <div>
                    <div className="text-lg font-bold leading-tight">{it.value}</div>
                    <span className="text-xs font-medium text-muted-foreground">{it.label}</span>
                  </div>
                </div>
              ))}
            </div>
            {weekActivity.sessions === 0 && weekActivity.progressPoints === 0 && weekActivity.tasksCompleted === 0 && (
              <p className="text-sm text-muted-foreground mt-4">No activity recorded yet this week — these counts update automatically as you log sessions, data, and completed work.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Attention cards */}
      <h2 className="text-lg font-semibold mb-4">Needs your attention</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {attentionCards.map((c) => (
          <button key={c.label} onClick={() => navigate(c.link)} className="text-left">
            <Card className="p-5 h-full hover:-translate-y-0.5 hover:card-shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <c.icon className="h-5 w-5 text-muted-foreground" />
                <span className={`text-2xl font-bold ${c.count > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>{c.count}</span>
              </div>
              <div className="mt-3 text-sm font-medium text-muted-foreground">{c.label}</div>
            </Card>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-semibold mb-4">Quick actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {QUICK_ACTIONS.map((a) => (
          <button key={a.label} onClick={() => navigate(a.path)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 card-shadow hover:border-primary/30 hover:-translate-y-0.5 transition-all text-left">
            <div className="h-9 w-9 rounded-lg brand-gradient-soft flex items-center justify-center shrink-0"><a.icon className="h-4 w-4 text-primary" /></div>
            <span className="text-sm font-medium leading-tight">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Open tasks + upcoming meetings */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><ListTodo className="h-4 w-4 text-primary" /> Open tasks</h2>
          </div>
          {(tasks || []).filter((t) => t.status === 'open').length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No open tasks. You're all caught up.</p>
          ) : (
            <div className="space-y-2">
              {(tasks || []).filter((t) => t.status === 'open').slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm font-medium truncate">{t.title}</span>
                  {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Upcoming meetings</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/meetings")}>View all</Button>
          </div>
          {stats.meetingsUpcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No upcoming meetings scheduled.</p>
          ) : (
            <div className="space-y-2">
              {stats.meetingsUpcoming.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div><div className="text-sm font-medium truncate">{m.title}</div><div className="text-xs text-muted-foreground">{m.meeting_type}</div></div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{m.date}{m.time ? ` · ${m.time}` : ""}</span>
                    <AddToCalendar compact meeting={m} student={(students || []).find((s) => s.id === m.student_id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
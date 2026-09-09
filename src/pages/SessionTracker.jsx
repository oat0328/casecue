import React, { useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/cards";
import SessionForm from "@/components/sessionTracker/SessionForm";
import GroupSessionForm from "@/components/sessionTracker/GroupSessionForm";
import MinutesDashboard from "@/components/sessionTracker/MinutesDashboard";
import GoalProgressChart from "@/components/sessionTracker/GoalProgressChart";
import SessionList from "@/components/sessionTracker/SessionList";

const TABS = [
  { key: "quick", label: "Quick Entry" },
  { key: "detailed", label: "Detailed Entry" },
  { key: "group", label: "Group Session" },
  { key: "log", label: "Log & Minutes" },
];

// Mobile-first Session Tracker: individual quick entry, group sessions, detailed
// records, and required-vs-delivered service minutes.
export default function SessionTracker() {
  const [tab, setTab] = useState("quick");
  const [logStudentId, setLogStudentId] = useState("");
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: sessions, refetch: refetchSessions } = useAsync(
    () => base44.entities.SessionRecord.filter({}, '-date', 200),
    []
  );
  const { data: goals } = useAsync(() => base44.entities.Goal.list(), []);

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
  const prefill = lastSession
    ? { service_type: lastSession.service_type, setting: lastSession.setting, location: lastSession.location, activity: lastSession.activity, scheduled_minutes: lastSession.scheduled_minutes }
    : null;

  return (
    <div>
      <PageHeader title="Session Tracker" subtitle="Document a session in under 30 seconds — individual, group, or detailed — with automatic minutes and data calculations." icon={Timer} />

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium border ${tab === t.key ? "bg-primary text-white border-primary" : "bg-card border-border"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quick" && (
        <SessionForm mode="quick" students={students} goals={goals} prefill={prefill}
          recentActivities={recentActivities} favoriteGoalIds={favoriteGoalIds} recentPrompts={recentPrompts}
          onSaved={refetchSessions} />
      )}
      {tab === "detailed" && (
        <SessionForm mode="detailed" students={students} goals={goals} prefill={prefill}
          recentActivities={recentActivities} favoriteGoalIds={favoriteGoalIds} recentPrompts={recentPrompts}
          onSaved={refetchSessions} />
      )}
      {tab === "group" && (
        <GroupSessionForm students={students} goals={goals} recentActivities={recentActivities} onSaved={refetchSessions} />
      )}
      {tab === "log" && (
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <label className="text-sm font-medium">Student</label>
            <select className="w-full sm:w-80 rounded-lg border border-input bg-background px-3 py-2.5 text-base mt-1"
              value={logStudentId} onChange={(e) => setLogStudentId(e.target.value)}>
              <option value="">Select a student…</option>
              {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </Card>
          {logStudentId ? (
            <>
              <MinutesDashboard
                student={(students || []).find((s) => s.id === logStudentId)}
                sessions={(sessions || []).filter((s) => s.student_id === logStudentId)}
                goals={goals}
              />
              <GoalProgressChart
                sessions={(sessions || []).filter((s) => s.student_id === logStudentId)}
                goals={(goals || []).filter((g) => g.student_id === logStudentId)}
              />
              <SessionList
                sessions={(sessions || []).filter((s) => s.student_id === logStudentId)}
                goals={goals}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a student to see service minutes, goal progress, and the session log.</p>
          )}
        </div>
      )}
    </div>
  );
}
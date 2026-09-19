import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Network, Plus, FileDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import EmptyState from "@/components/EmptyState";
import SessionLogDialog from "@/components/goalGroups/SessionLogDialog";
import GroupReports from "@/components/goalGroups/GroupReports";
import { sortStudentsByName } from "@/lib/studentSort";

export default function GoalGroups() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.filter({ status: "active" }, '-updated_date', 200), []);
  const { data: goals } = useAsync(() => base44.entities.Goal.list('-updated_date', 300), []);
  const { data: sessions, refetch: refetchSessions } = useAsync(() => base44.entities.SessionLog.list('-date', 200), []);
  const { data: progress } = useAsync(() => base44.entities.ProgressData.list('-date', 500), []);

  const [dialogGroup, setDialogGroup] = useState(null);
  const [exportGroup, setExportGroup] = useState(null);

  const studentMap = new Map((students || []).map((s) => [s.id, s]));

  const groups = React.useMemo(() => {
    const byArea = new Map();
    (goals || []).forEach((g) => {
      const area = g.goal_area?.trim() || "Uncategorized";
      const student = studentMap.get(g.student_id);
      if (!student) return;
      if (!byArea.has(area)) byArea.set(area, new Map());
      byArea.get(area).set(student.id, student);
    });
    return [...byArea.entries()]
      .map(([goal_area, members]) => ({ goal_area, students: sortStudentsByName([...members.values()]) }))
      .sort((a, b) => b.students.length - a.students.length);
  }, [students, goals]);

  const sessionsByArea = React.useMemo(() => {
    const byArea = new Map();
    (sessions || []).forEach((s) => {
      if (!byArea.has(s.goal_area)) byArea.set(s.goal_area, []);
      byArea.get(s.goal_area).push(s);
    });
    return byArea;
  }, [sessions]);

  const saveSession = async (payload) => {
    try {
      await base44.entities.SessionLog.create({
        goal_area: dialogGroup.goal_area,
        student_ids: dialogGroup.students.map((s) => s.id),
        ...payload,
      });
      refetchSessions();
      setDialogGroup(null);
      toast({ title: "Session logged", description: `${payload.minutes} minutes for ${dialogGroup.students.length} student${dialogGroup.students.length === 1 ? "" : "s"}.` });
    } catch (e) {
      toast({ title: "Failed to save session", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Goal Groups"
        subtitle="Students grouped by IEP goal area — pull your small groups and log each session's minutes and delivery."
        icon={Network}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No goal groups yet"
          description="Add goals (with a goal area like Reading or Math) to your students and they'll automatically group here."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {groups.map((g) => {
            const groupSessions = sessionsByArea.get(g.goal_area) || [];
            const totalMinutes = groupSessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
            return (
              <Card key={g.goal_area} className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">{g.goal_area}</h3>
                    <p className="text-xs text-muted-foreground">
                      {g.students.length} student{g.students.length === 1 ? "" : "s"} · {groupSessions.length} session{groupSessions.length === 1 ? "" : "s"} logged · {totalMinutes} total minutes
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setExportGroup(g)} title="Export this group's report">
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" className="brand-gradient text-white" onClick={() => setDialogGroup(g)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Log session
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {g.students.map((s) => (
                    <Link
                      key={s.id}
                      to={`/students/${s.id}`}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      {s.first_name} {s.last_name?.[0]}.
                    </Link>
                  ))}
                </div>
                {groupSessions.length > 0 && (
                  <div className="space-y-1 border-t border-border pt-3">
                    {groupSessions.slice(0, 3).map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{s.date} · {s.delivery} · {s.minutes} min{s.notes ? ` — ${s.notes}` : ""}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{s.student_ids?.length || 0} students</span>
                      </div>
                    ))}
                    {groupSessions.length > 3 && (
                      <p className="text-xs text-muted-foreground">+ {groupSessions.length - 3} earlier sessions</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <GroupReports
        groups={groups}
        students={students || []}
        goals={goals || []}
        progress={progress || []}
        sessions={sessions || []}
        selectedGroup={exportGroup}
        onClear={() => setExportGroup(null)}
        onSelectGroup={setExportGroup}
      />

      <SessionLogDialog
        open={!!dialogGroup}
        onOpenChange={(open) => !open && setDialogGroup(null)}
        group={dialogGroup}
        onSave={saveSession}
      />
    </div>
  );
}
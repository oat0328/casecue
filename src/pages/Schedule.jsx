import React, { useState } from "react";
import { CalendarClock, Upload, Sparkles, Plus, UserPlus, Pencil, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import UploadScheduleDialog from "@/components/schedule/UploadScheduleDialog";
import AddGroupDialog from "@/components/schedule/AddGroupDialog";
import AddStudentDialog from "@/components/schedule/AddStudentDialog";
import EditEntryDialog from "@/components/schedule/EditEntryDialog";
import GroupsTab from "@/components/schedule/GroupsTab";
import MinutesPanel from "@/components/schedule/MinutesPanel";
import ScheduleExportPanel from "@/components/schedule/ScheduleExportPanel";
import OptimizeDialog from "@/components/schedule/OptimizeDialog";
import { DAYS, DELIVERY_LABEL, studentName } from "@/lib/scheduleUtils";

export default function Schedule() {
  const { toast } = useToast();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const { data: sessionLogs } = useAsync(() => base44.entities.SessionLog.list('-date', 500), []);
  const { data: entries, refetch } = useAsync(() => base44.entities.ScheduleEntry.list('-day', 500), []);
  const [dialog, setDialog] = useState(null); // "upload" | "group" | "student"
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const active = (entries || []).filter((e) => !e.archived);

  const remove = async (id) => {
    try {
      await base44.entities.ScheduleEntry.delete(id);
      refetch();
      toast({ title: "Schedule block deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Instruction & Schedule"
        subtitle="Upload your schedule once — CaseCue builds the groups, assigns students, calculates minutes, and detects conflicts. Manage everything manually anytime."
        icon={CalendarClock}
        actions={
          <>
            <Button onClick={() => setDialog("upload")} className="brand-gradient text-white">
              <Upload className="h-4 w-4" /> Upload Schedule
            </Button>
            <Button variant="outline" onClick={() => setOptimizeOpen(true)}>
              <Sparkles className="h-4 w-4 text-primary" /> Optimize Groups
            </Button>
            <Button variant="outline" onClick={() => setDialog("group")}>
              <Plus className="h-4 w-4" /> Add Group
            </Button>
            <Button variant="outline" onClick={() => setDialog("student")}>
              <UserPlus className="h-4 w-4" /> Add Student
            </Button>
          </>
        }
      />

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="minutes">Minutes & Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-6">
          {active.length === 0 && (
            <Card className="p-8 text-center">
              <CalendarClock className="h-10 w-10 text-primary mx-auto" />
              <p className="font-semibold mt-3">No schedule yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Upload your existing schedule (PDF, Excel, CSV, DOCX, or a photo) and CaseCue will build your groups automatically — or add groups manually.
              </p>
              <Button onClick={() => setDialog("upload")} className="brand-gradient text-white mt-4">
                <Upload className="h-4 w-4" /> Upload Schedule
              </Button>
            </Card>
          )}

          <div className="grid lg:grid-cols-5 gap-4">
            {DAYS.map((day) => (
              <Card key={day} className="p-4">
                <h3 className="font-semibold text-sm mb-3 text-primary">{day}</h3>
                <div className="space-y-2">
                  {active.filter((e) => e.day === day).map((e) => (
                    <div key={e.id} className="rounded-lg border border-border p-3 group relative">
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(e)} title="Edit" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(e.id)} title="Delete" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="font-medium text-sm pr-10">{e.group_name}</div>
                      <div className="text-xs text-muted-foreground">{e.start_time}–{e.end_time} · {DELIVERY_LABEL[e.delivery] || e.delivery}{e.period?` · ${e.period}`:''}</div>
                      <div className="text-xs text-muted-foreground">{e.service_minutes} min · {e.teacher_classroom || "—"}{e.cycle_day?` · ${e.cycle_day}`:''}{e.week_pattern&&e.week_pattern!=='every_week'?` · ${e.week_pattern.replace('_',' ')}`:''}</div>
                      {e.student_ids?.length > 0 && <div className="text-xs text-muted-foreground mt-1">{e.student_ids.map((id) => studentName(students, id)).join(", ")}</div>}
                    </div>
                  ))}
                  {active.filter((e) => e.day === day).length === 0 && <p className="text-xs text-muted-foreground">No sessions</p>}
                </div>
              </Card>
            ))}
          </div>

          <ScheduleExportPanel entries={entries || []} students={students || []} />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsTab entries={entries || []} students={students || []} onRefresh={refetch} />
        </TabsContent>

        <TabsContent value="minutes">
          <MinutesPanel students={students || []} entries={entries || []} sessionLogs={sessionLogs || []} />
        </TabsContent>
      </Tabs>

      <UploadScheduleDialog open={dialog === "upload"} onOpenChange={(o) => setDialog(o ? "upload" : null)} students={students || []} onSaved={refetch} />
      <AddGroupDialog open={dialog === "group"} onOpenChange={(o) => setDialog(o ? "group" : null)} students={students || []} onSaved={refetch} />
      <AddStudentDialog open={dialog === "student"} onOpenChange={(o) => setDialog(o ? "student" : null)} students={students || []} entries={entries || []} onSaved={refetch} />
      <OptimizeDialog open={optimizeOpen} onOpenChange={setOptimizeOpen} />
      {editing && (
        <EditEntryDialog entry={editing} students={students || []} onClose={() => setEditing(null)} onSaved={refetch} />
      )}
    </div>
  );
}
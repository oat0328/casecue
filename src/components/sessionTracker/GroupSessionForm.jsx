import React, { useState, useMemo } from "react";
import { Loader2, Users, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/cards";
import { SERVICE_TYPES, SESSION_STATUSES, durationMinutes } from "@/lib/sessionCalc";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-xs font-medium text-muted-foreground mb-2";
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowRounded = (offsetMin = 0) => {
  const d = new Date();
  d.setMinutes(Math.max(0, d.getMinutes() - (d.getMinutes() % 15)) + offsetMin, 0, 0);
  return d.toTimeString().slice(0, 5);
};

// Group session entry: shared provider/date/time/location/activity entered once;
// separate goals, performance, and narratives per student. Each student gets a
// separate private record — one student's data is never copied into another's.
export default function GroupSessionForm({ students, goals, recentActivities, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shared, setShared] = useState({
    date: todayStr(), start_time: nowRounded(0), end_time: nowRounded(30),
    provider: user?.full_name || "", service_type: "special_education", setting: "pull_out",
    location: "", activity: "", status: "completed",
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [per, setPer] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [savingIdx, setSavingIdx] = useState(null);
  const [groupId] = useState(() => crypto.randomUUID());

  const dur = durationMinutes(shared.start_time, shared.end_time);
  const set = (patch) => setShared((s) => ({ ...s, ...patch }));
  const activeStudent = selectedIds[activeIdx];
  const panel = per[activeStudent] || {};
  const setPanel = (patch) => setPer((p) => ({ ...p, [activeStudent]: { ...(p[activeStudent] || {}), ...patch } }));

  const toggleStudent = (id) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    setActiveIdx(0);
  };

  const saveOne = async (studentId, silent) => {
    const p = per[studentId] || {};
    const record = {
      student_id: studentId,
      date: shared.date, start_time: shared.start_time, end_time: shared.end_time,
      duration_minutes: dur ?? 0, provider: shared.provider, service_type: shared.service_type,
      delivery: "group", setting: shared.setting, location: shared.location, activity: shared.activity,
      scheduled_minutes: dur ?? 0, delivered_minutes: dur ?? 0,
      status: p.status || shared.status,
      quantitative: p.correct != null || p.total != null ? { measurement_type: "accuracy", correct: p.correct ?? "", total: p.total ?? "" } : {},
      qualitative: p.note || "",
      tags: p.tags || [],
      group_session_id: groupId,
      organization_id:user?.organization_id||user?.data?.organization_id||'',
    };
    await base44.entities.SessionRecord.create(record);
    const attendanceStatuses=['completed','partially_completed','makeup_session','refused','student_absent'];
    if(attendanceStatuses.includes(record.status)){
      const attendanceStatus=record.status==='student_absent'?'absent':'present';
      const existing=await base44.entities.AttendanceRecord.filter({user_id:user.id,workspace:'sped',student_id:record.student_id,date:record.date,scope:'schedule_block',schedule_start_time:record.start_time||''},'-updated_at',5);
      const student=(students||[]).find(s=>s.id===record.student_id);
      const attendance={organization_id:record.organization_id,user_id:user.id,workspace:'sped',student_id:record.student_id,student_name_snapshot:student?`${student.first_name||''} ${student.last_name||''}`.trim():'',grade_snapshot:student?.grade||'',date:record.date,status:attendanceStatus,note:`Auto-synced from Session Tracker${record.activity?`: ${record.activity}`:''}`,scope:'schedule_block',schedule_label:record.activity||record.service_type||'Session Tracker',schedule_start_time:record.start_time||'',schedule_end_time:record.end_time||'',recorded_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      if(existing?.[0]?.id)await base44.entities.AttendanceRecord.update(existing[0].id,attendance);else await base44.entities.AttendanceRecord.create(attendance);
    }
    if (!silent) toast({ title: "Session saved", description: "A separate private record was created and service attendance synced when applicable." });
  };

  const saveCurrentAndNext = async () => {
    if (!activeStudent) return;
    setSavingIdx(activeIdx);
    try {
      await saveOne(activeStudent);
      setPer((p) => ({ ...p, [activeStudent]: { ...(p[activeStudent] || {}), saved: true } }));
      if (activeIdx < selectedIds.length - 1) setActiveIdx(activeIdx + 1);
      onSaved?.();
    } catch (e) {
      toast({ title: "Could not save session", description: e.message, variant: "destructive" });
    } finally { setSavingIdx(null); }
  };

  const saveAll = async () => {
    if (!selectedIds.length) { toast({ title: "Select at least one student", variant: "destructive" }); return; }
    setSavingIdx("all");
    try {
      const gid = crypto.randomUUID();
      const records = selectedIds.map((id) => {
        const p = per[id] || {};
        return {
          student_id: id,
          date: shared.date, start_time: shared.start_time, end_time: shared.end_time,
          duration_minutes: dur ?? 0, provider: shared.provider, service_type: shared.service_type,
          delivery: "group", setting: shared.setting, location: shared.location, activity: shared.activity,
          scheduled_minutes: dur ?? 0, delivered_minutes: dur ?? 0,
          status: p.status || shared.status,
          quantitative: p.correct != null || p.total != null ? { measurement_type: "accuracy", correct: p.correct ?? "", total: p.total ?? "" } : {},
          qualitative: p.note || "", tags: p.tags || [],
          group_session_id: gid,
          organization_id:user?.organization_id||user?.data?.organization_id||'',
        };
      });
      await base44.entities.SessionRecord.bulkCreate(records);
      toast({ title: `${records.length} sessions saved`, description: "Each student has a separate private record." });
      setPer({});
      setSelectedIds([]);
      setActiveIdx(0);
      onSaved?.();
    } catch (e) {
      toast({ title: "Could not save sessions", description: e.message, variant: "destructive" });
    } finally { setSavingIdx(null); }
  };

  const studentGoals = useMemo(
    () => (goals || []).filter((g) => g.student_id === activeStudent),
    [goals, activeStudent]
  );

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary" /> Shared session details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-5">
          <div><label className={labelCls}>Date *</label><input type="date" className={inputCls} value={shared.date} onChange={(e) => set({ date: e.target.value })} /></div>
          <div><label className={labelCls}>Provider</label><input className={inputCls} value={shared.provider} onChange={(e) => set({ provider: e.target.value })} /></div>
          <div><label className={labelCls}>Start time</label><input type="time" className={inputCls} value={shared.start_time} onChange={(e) => set({ start_time: e.target.value })} /></div>
          <div><label className={labelCls}>End time</label><input type="time" className={inputCls} value={shared.end_time} onChange={(e) => set({ end_time: e.target.value })} /></div>
          <div>
            <label className={labelCls}>Service type</label>
            <select className={inputCls} value={shared.service_type} onChange={(e) => set({ service_type: e.target.value })}>
              {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Push-in or pull-out</label>
            <select className={inputCls} value={shared.setting} onChange={(e) => set({ setting: e.target.value })}>
              <option value="pull_out">Pull-out</option>
              <option value="push_in">Push-in</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Location</label><input className={inputCls} value={shared.location} onChange={(e) => set({ location: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Shared activity or skill</label>
            <input className={inputCls} value={shared.activity} onChange={(e) => set({ activity: e.target.value })} placeholder="e.g. small-group reading fluency" />
            {(recentActivities || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recentActivities.slice(0, 5).map((a) => (
                  <button key={a} className="text-xs rounded-full border border-border px-2.5 py-1 hover:bg-accent" onClick={() => set({ activity: a })}>{a}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Default status</label>
            <select className={inputCls} value={shared.status} onChange={(e) => set({ status: e.target.value })}>
              {SESSION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {dur != null && <div className="flex items-end text-sm text-muted-foreground pb-3">Duration: <strong className="ml-1">{dur} min</strong></div>}
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold mb-1">Select students</h3>
        <p className="text-xs text-muted-foreground mb-3">Each selected student gets their own record — enter performance separately below.</p>
        <div className="flex flex-wrap gap-2">
          {(students || []).map((s) => (
            <button key={s.id} onClick={() => toggleStudent(s.id)}
              className={`text-sm rounded-full border px-4 py-2 ${selectedIds.includes(s.id) ? "bg-primary text-white border-primary" : "border-border"}`}>
              {s.first_name} {s.last_name}
            </button>
          ))}
        </div>
      </Card>

      {selectedIds.length > 0 && activeStudent && (
        <Card className="p-4 sm:p-6 border-primary/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {(() => { const s = (students || []).find((x) => x.id === activeStudent); return s ? `${s.first_name} ${s.last_name}` : ""; })()}
              <span className="text-muted-foreground font-normal text-sm ml-2">Student {activeIdx + 1} of {selectedIds.length}</span>
            </h3>
            {panel.saved && <span className="text-xs text-emerald-600 font-medium">Saved ✓</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-5">
            <div>
              <label className={labelCls}>IEP goal addressed</label>
              <select className={inputCls} value={panel.goal_id || ""} onChange={(e) => setPanel({ goal_id: e.target.value })}>
                <option value="">None</option>
                {studentGoals.map((g) => <option key={g.id} value={g.id}>{g.goal_area || "Goal"}: {(g.goal_text || "").slice(0, 50)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={panel.status || shared.status} onChange={(e) => setPanel({ status: e.target.value })}>
                {SESSION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Correct responses</label>
              <input type="number" inputMode="numeric" className={inputCls} value={panel.correct ?? ""} onChange={(e) => setPanel({ correct: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Total opportunities</label>
              <input type="number" inputMode="numeric" className={inputCls} value={panel.total ?? ""} onChange={(e) => setPanel({ total: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>This student's notes (private to this record)</label>
              <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" rows={2} value={panel.note || ""} onChange={(e) => setPanel({ note: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button className="brand-gradient text-white h-11 px-6" onClick={saveCurrentAndNext} disabled={savingIdx !== null}>
              {savingIdx === activeIdx ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save &amp; Start Next Student <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline" className="h-11" onClick={saveAll} disabled={savingIdx !== null}>
              {savingIdx === "all" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save All Sessions
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
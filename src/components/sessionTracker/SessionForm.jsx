import React, { useState, useEffect } from "react";
import { Loader2, Sparkles, Star, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/cards";
import QuantitativeInput from "@/components/sessionTracker/QuantitativeInput";
import { SERVICE_TYPES, SESSION_STATUSES, QUAL_TAGS, durationMinutes, computeQuantitative } from "@/lib/sessionCalc";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-xs font-medium text-muted-foreground mb-2";

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowRounded = (offsetMin = 0) => {
  const d = new Date();
  d.setMinutes(Math.max(0, d.getMinutes() - (d.getMinutes() % 15)) + offsetMin, 0, 0);
  return d.toTimeString().slice(0, 5);
};

const emptyForm = (provider) => ({
  student_id: "", date: todayStr(), start_time: nowRounded(0), end_time: nowRounded(30),
  provider: provider || "", service_type: "special_education", delivery: "individual", setting: "pull_out",
  location: "", goal_id: "", activity: "", scheduled_minutes: "", delivered_minutes: "",
  status: "completed", quantitative: {}, qualitative: "", tags: [], follow_up_needed: false, follow_up_note: "",
});

// Individual session entry. mode="quick" = under-30-seconds minimal fields; mode="detailed" = full record.
export default function SessionForm({ mode = "quick", students, goals, defaultStudentId, prefill, recentActivities, favoriteGoalIds, recentPrompts, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(() => ({ ...emptyForm(user?.full_name), student_id: defaultStudentId || "" }));
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (defaultStudentId) set((f) => ({ ...f, student_id: f.student_id || defaultStudentId }));
  }, [defaultStudentId]);

  useEffect(() => {
    if (prefill) {
      set((f) => ({
        ...f,
        service_type: prefill.service_type || f.service_type,
        setting: prefill.setting || f.setting,
        location: prefill.location || f.location,
        goal_id: prefill.goal_id || "",
        activity: prefill.activity || "",
        scheduled_minutes: prefill.scheduled_minutes ?? "",
      }));
    }
  }, [prefill]);

  const dur = durationMinutes(form.start_time, form.end_time);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const studentGoals = (goals || []).filter((g) => g.student_id === form.student_id);
  const orderedGoals = [
    ...studentGoals.filter((g) => (favoriteGoalIds || []).includes(g.id)),
    ...studentGoals.filter((g) => !(favoriteGoalIds || []).includes(g.id)),
  ];

  const payload = () => ({
    ...form,
    duration_minutes: dur ?? 0,
    delivered_minutes: form.delivered_minutes !== "" && form.delivered_minutes != null ? Number(form.delivered_minutes) : (dur ?? 0),
    scheduled_minutes: form.scheduled_minutes !== "" && form.scheduled_minutes != null ? Number(form.scheduled_minutes) : (dur ?? 0),
  });

  const save = async (andNew) => {
    if (!form.student_id) { toast({ title: "Select a student first", variant: "destructive" }); return; }
    if (!form.date) { toast({ title: "Select a date", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.SessionRecord.create(payload());
      toast({ title: "Session saved" });
      setForm({ ...emptyForm(user?.full_name), student_id: andNew ? "" : form.student_id });
      localStorage.removeItem("casecue-session-draft");
      onSaved?.();
    } catch (e) {
      toast({ title: "Could not save session", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveDraft = () => { localStorage.setItem("casecue-session-draft", JSON.stringify(form)); toast({ title: "Draft saved on this device" }); };
  const loadDraft = () => {
    const d = localStorage.getItem("casecue-session-draft");
    if (d) { setForm(JSON.parse(d)); toast({ title: "Draft loaded" }); }
  };

  const draftNarrative = async () => {
    setDrafting(true);
    try {
      const res = await base44.functions.invoke("draftSessionNarrative", {
        service_type: form.service_type, activity: form.activity, status: form.status,
        quantitative: form.quantitative, tags: form.tags, notes: form.qualitative,
      });
      set({ qualitative: res.data.narrative });
      toast({ title: "AI-assisted draft added below — review before saving", description: "CaseCue drafts only from what you entered." });
    } catch (e) {
      toast({ title: "Could not draft narrative", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally { setDrafting(false); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set({ attachment_url: file_url });
      toast({ title: "Attachment added" });
    } finally { setUploading(false); e.target.value = ""; }
  };

  const quick = mode === "quick";
  const q = form.quantitative || {};
  const quickCalc = computeQuantitative(q.correct, q.total);

  return (
    <Card className="p-4 sm:p-6">
      {localStorage.getItem("casecue-session-draft") && (
        <button className="text-xs text-primary underline mb-3" onClick={loadDraft}>Load saved draft</button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-5">
        <div className={quick ? "" : "sm:col-span-2"}>
          <label className={labelCls}>Student *</label>
          <select className={inputCls} value={form.student_id} onChange={(e) => set({ student_id: e.target.value, goal_id: "" })}>
            <option value="">Select student…</option>
            {(students || []).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date *</label>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Start time</label>
          <input type="time" className={inputCls} value={form.start_time} onChange={(e) => set({ start_time: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>End time</label>
          <input type="time" className={inputCls} value={form.end_time} onChange={(e) => set({ end_time: e.target.value })} />
        </div>
        {dur != null && (
          <div className="sm:col-span-2 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> Duration calculated: <strong>{dur} minutes</strong>
          </div>
        )}
        <div>
          <label className={labelCls}>Service type</label>
          <select className={inputCls} value={form.service_type} onChange={(e) => set({ service_type: e.target.value })}>
            {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Session status</label>
          <select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value })}>
            {SESSION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>IEP goal addressed {favoriteGoalIds?.length ? "(★ = favorite)" : ""}</label>
          <select className={inputCls} value={form.goal_id} onChange={(e) => set({ goal_id: e.target.value })}>
            <option value="">None / not goal-linked</option>
            {orderedGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {favoriteGoalIds?.includes(g.id) ? "★ " : ""}{g.goal_area || "Goal"}: {(g.goal_text || "").slice(0, 60)}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Activity or skill</label>
          <input className={inputCls} value={form.activity} onChange={(e) => set({ activity: e.target.value })} placeholder="e.g. decoding CVC words" />
          {(recentActivities || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recentActivities.slice(0, 5).map((a) => (
                <button key={a} className="text-xs rounded-full border border-border px-2.5 py-1 hover:bg-accent" onClick={() => set({ activity: a })}>{a}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {quick ? (
        <>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className={labelCls}>Correct responses</label>
              <input type="number" inputMode="numeric" className={inputCls} value={q.correct ?? ""} onChange={(e) => set({ quantitative: { ...q, measurement_type: "accuracy", correct: e.target.value === "" ? "" : Number(e.target.value) } })} />
            </div>
            <div>
              <label className={labelCls}>Total opportunities</label>
              <input type="number" inputMode="numeric" className={inputCls} value={q.total ?? ""} onChange={(e) => set({ quantitative: { ...q, measurement_type: "accuracy", total: e.target.value === "" ? "" : Number(e.target.value) } })} />
            </div>
          </div>
          {quickCalc.fraction && (
            <p className="text-sm mt-2">{quickCalc.fraction} · {quickCalc.decimal} · <strong>{quickCalc.percentage}%</strong></p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {QUAL_TAGS.map((t) => (
              <button key={t} onClick={() => set({ tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })}
                className={`text-xs rounded-full border px-3 py-1.5 ${form.tags.includes(t) ? "bg-primary text-white border-primary" : "border-border"}`}>
                {t}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-5 mt-4">
            <div>
              <label className={labelCls}>Provider</label>
              <input className={inputCls} value={form.provider} onChange={(e) => set({ provider: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Individual or group</label>
              <select className={inputCls} value={form.delivery} onChange={(e) => set({ delivery: e.target.value })}>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Push-in or pull-out</label>
              <select className={inputCls} value={form.setting} onChange={(e) => set({ setting: e.target.value })}>
                <option value="pull_out">Pull-out</option>
                <option value="push_in">Push-in</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={form.location} onChange={(e) => set({ location: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Scheduled minutes</label>
              <input type="number" inputMode="numeric" className={inputCls} value={form.scheduled_minutes} onChange={(e) => set({ scheduled_minutes: e.target.value === "" ? "" : Number(e.target.value) })} placeholder={dur != null ? `auto: ${dur}` : ""} />
            </div>
            <div>
              <label className={labelCls}>Delivered minutes</label>
              <input type="number" inputMode="numeric" className={inputCls} value={form.delivered_minutes} onChange={(e) => set({ delivered_minutes: e.target.value === "" ? "" : Number(e.target.value) })} placeholder={dur != null ? `auto: ${dur}` : ""} />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium mb-2">Quantitative data</p>
            <QuantitativeInput value={form.quantitative} onChange={(quantitative) => set({ quantitative })} />
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Quick-select tags</p>
            <div className="flex flex-wrap gap-1.5">
              {QUAL_TAGS.map((t) => (
                <button key={t} onClick={() => set({ tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })}
                  className={`text-xs rounded-full border px-3 py-1.5 ${form.tags.includes(t) ? "bg-primary text-white border-primary" : "border-border"}`}>
                  {t}
                </button>
              ))}
              {(recentPrompts || []).filter((t) => !QUAL_TAGS.includes(t)).slice(0, 5).map((t) => (
                <button key={t} onClick={() => set({ tags: [...form.tags, t] })} className="text-xs rounded-full border border-primary/40 text-primary px-3 py-1.5">
                  <Star className="h-3 w-3 inline mr-1" />{t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Qualitative narrative</p>
              <Button size="sm" variant="outline" onClick={draftNarrative} disabled={drafting}>
                {drafting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Draft with CaseCue
              </Button>
            </div>
            <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" rows={4}
              value={form.qualitative} onChange={(e) => set({ qualitative: e.target.value })}
              placeholder="Engagement, behavior, independence, prompting, accuracy, strategy effectiveness, strengths, difficulties, response to instruction, next instructional step…" />
            <p className="text-xs text-muted-foreground mt-1">AI-assisted language is a draft from your entries — review and edit before saving.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div>
              <label className={labelCls}>Follow-up needed?</label>
              <select className={inputCls} value={form.follow_up_needed ? "yes" : "no"} onChange={(e) => set({ follow_up_needed: e.target.value === "yes" })}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            {form.follow_up_needed && (
              <div>
                <label className={labelCls}>Follow-up note</label>
                <input className={inputCls} value={form.follow_up_note} onChange={(e) => set({ follow_up_note: e.target.value })} />
              </div>
            )}
            <div>
              <label className={labelCls}>Optional attachment</label>
              <input type="file" className="w-full text-sm mt-1" onChange={onUpload} disabled={uploading} />
              {form.attachment_url && <p className="text-xs text-emerald-600 mt-1">Attached ✓</p>}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 mt-5">
        <Button className="brand-gradient text-white h-11 px-6" onClick={() => save(false)} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Session
        </Button>
        <Button variant="outline" className="h-11" onClick={saveDraft} disabled={saving}>Save Draft</Button>
        <Button variant="outline" className="h-11" onClick={() => save(true)} disabled={saving}>Save &amp; Next Student</Button>
      </div>
    </Card>
  );
}
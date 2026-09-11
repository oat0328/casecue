import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Users, RefreshCw, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import ImportStudentsDialog from "@/components/students/ImportStudentsDialog";
import RolloverDialog from "@/components/students/RolloverDialog";

const AVATAR_COLORS = ["violet", "blue", "emerald", "amber", "rose", "cyan"];
const ELIGIBILITY_OPTIONS = [
  "Autism Spectrum Disorder","Deaf/Blind","Developmental Delay","Emotional Disturbance",
  "Health Impairment","Hearing Impairment/Deaf","Intellectual Disability","Multiple Impairments",
  "Orthopedic Impairment","Specific Learning Disability","Speech/Language Impairment",
  "Traumatic Brain Injury","Visual Impairment/Blind","Other/State-Specific"
];
const colorMap = {
  violet: "bg-sky-100 text-sky-700", blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700", cyan: "bg-cyan-100 text-cyan-700",
};

function parseIsoDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2100) return null;
  return d;
}
function daysUntil(dateStr) {
  const d = parseIsoDate(dateStr); if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

export default function Students() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: students, loading, refetch } = useAsync(() => base44.entities.Student.list('-updated_date', 200), []);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const emptyForm = { first_name: "", last_name: "", grade: "", eligibility_category: "", annual_review_due: "", reevaluation_due: "" };
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const list = students || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.eligibility_category || "").toLowerCase().includes(q));
  }, [students, query]);

  const createStudent = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.Student.create({ ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] });
      toast({ title: "Student added" });
      setOpen(false); setForm(emptyForm); await refetch(); navigate(`/students/${created.id}`);
    } catch (e) {
      toast({ title: "Could not add student", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteStudent = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await base44.entities.Student.delete(deleteTarget.id);
      toast({ title: "Student deleted", description: `${deleteTarget.first_name} ${deleteTarget.last_name} was removed from your caseload.` });
      setDeleteTarget(null); await refetch();
    } catch (e) {
      toast({ title: "Could not delete student", description: e.message, variant: "destructive" });
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Caseload</div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Students</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Your student list connects IEPs, goals, progress, sessions, meetings, evidence, and Family View.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ImportStudentsDialog onImported={refetch} />
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={()=>setRolloverOpen(true)}>School-Year Rollover</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="bg-white text-slate-950 hover:bg-slate-100"><Plus className="h-4 w-4 mr-2" /> Add Student</Button></DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Add a student</DialogTitle></DialogHeader>
                <div className="grid sm:grid-cols-2 gap-4 py-2">
                  <div><Label>First name *</Label><Input value={form.first_name} onChange={(e)=>setForm({...form,first_name:e.target.value})}/></div>
                  <div><Label>Last name *</Label><Input value={form.last_name} onChange={(e)=>setForm({...form,last_name:e.target.value})}/></div>
                  <div><Label>Grade</Label><Input value={form.grade} onChange={(e)=>setForm({...form,grade:e.target.value})} placeholder="e.g. 6"/></div>
                  <div><Label>Eligibility category</Label><Select value={form.eligibility_category} onValueChange={(v)=>setForm({...form,eligibility_category:v})}><SelectTrigger><SelectValue placeholder="Select eligibility"/></SelectTrigger><SelectContent>{ELIGIBILITY_OPTIONS.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Annual review due</Label><Input type="date" value={form.annual_review_due} onChange={(e)=>setForm({...form,annual_review_due:e.target.value})}/></div>
                  <div><Label>Reevaluation due</Label><Input type="date" value={form.reevaluation_due} onChange={(e)=>setForm({...form,reevaluation_due:e.target.value})}/></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={createStudent} disabled={saving}>{saving?"Saving…":"Add student"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search students or eligibility…" className="pl-9 h-11"/></div>
        <div className="flex items-center gap-2 text-sm text-slate-500"><span>{filtered.length} student{filtered.length===1?'':'s'}</span><Button variant="outline" size="icon" onClick={refetch}><RefreshCw className="h-4 w-4"/></Button></div>
      </div>

      {loading ? <div className="py-16 text-center text-slate-500">Loading caseload…</div> : filtered.length===0 ? (
        <Card className="p-10 text-center"><Users className="h-10 w-10 mx-auto text-slate-300"/><h2 className="mt-4 text-xl font-bold">No students found</h2><p className="mt-2 text-sm text-slate-500">Add a student or adjust your search.</p><Button className="mt-5" onClick={()=>setOpen(true)}><Plus className="h-4 w-4 mr-2"/>Add Student</Button></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s)=>{
            const reviewDays=daysUntil(s.annual_review_due), reevalDays=daysUntil(s.reevaluation_due);
            const invalidDate=(s.annual_review_due && reviewDays===null)||(s.reevaluation_due && reevalDays===null);
            const urgent=(reviewDays!==null&&reviewDays<=30)||(reevalDays!==null&&reevalDays<=30);
            return <Card key={s.id} className="group p-0 overflow-hidden border-slate-200 shadow-sm hover:shadow-lg transition-all">
              <Link to={`/students/${s.id}`} className="block p-5">
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${colorMap[s.avatar_color]||colorMap.violet}`}>{s.first_name?.[0]}{s.last_name?.[0]}</div>
                  <div className="min-w-0 flex-1"><div className="font-bold truncate">{s.first_name} {s.last_name}</div><div className="text-sm text-slate-500">Grade {s.grade||'—'} · {s.eligibility_category||'Eligibility not entered'}</div></div>
                  {urgent && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Review soon</span>}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-slate-400">Annual review</div><div className="mt-1 font-semibold text-slate-700">{parseIsoDate(s.annual_review_due)?s.annual_review_due:'Needs review'}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-slate-400">Reevaluation</div><div className="mt-1 font-semibold text-slate-700">{parseIsoDate(s.reevaluation_due)?s.reevaluation_due:'Needs review'}</div></div>
                </div>
                {invalidDate && <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"><AlertTriangle className="h-4 w-4"/>One or more saved dates are invalid and should be corrected.</div>}
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-600"><ShieldCheck className="h-4 w-4"/>Open Student 360</div>
              </Link>
              <div className="flex items-center justify-between border-t bg-slate-50/70 px-4 py-3">
                <span className="text-xs text-slate-400">Student ID: {String(s.id).slice(-6)}</span>
                <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={()=>setDeleteTarget(s)}><Trash2 className="h-4 w-4 mr-1.5"/>Delete</Button>
              </div>
            </Card>
          })}
        </div>
      )}

      <RolloverDialog open={rolloverOpen} onOpenChange={setRolloverOpen} students={students||[]} onDone={refetch}/>

      <Dialog open={!!deleteTarget} onOpenChange={(v)=>!v&&setDeleteTarget(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete student?</DialogTitle></DialogHeader><div className="text-sm text-slate-600">This will remove <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong> from the Student entity. Review connected records before deleting if you need to preserve historical documentation.</div><DialogFooter><Button variant="outline" onClick={()=>setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" disabled={deleting} onClick={deleteStudent}>{deleting?'Deleting…':'Delete student'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

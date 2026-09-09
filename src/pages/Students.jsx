import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Users, CalendarClock, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const AVATAR_COLORS = ["violet", "blue", "emerald", "amber", "rose", "cyan"];
const colorMap = {
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  cyan: "bg-cyan-100 text-cyan-700",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); if (isNaN(d)) return null;
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
  const [form, setForm] = useState({ first_name: "", last_name: "", grade: "", eligibility_category: "", annual_review_due: "", reevaluation_due: "" });

  const filtered = useMemo(() => {
    const list = students || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.eligibility_category || "").toLowerCase().includes(q));
  }, [students, query]);

  const createStudent = async () => {
    if (!form.first_name || !form.last_name) { toast({ title: "First and last name are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const created = await base44.entities.Student.create({ ...form, avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] });
      toast({ title: "Student added" });
      setOpen(false);
      setForm({ first_name: "", last_name: "", grade: "", eligibility_category: "", annual_review_due: "", reevaluation_due: "" });
      refetch();
      navigate(`/students/${created.id}`);
    } catch (e) {
      toast({ title: "Could not add student", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Your caseload. Each student has a connected 360° profile."
        icon={Users}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="brand-gradient text-white"><Plus className="h-4 w-4 mr-1" /> Add Student</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a student</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div><Label>First name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>Last name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                <div><Label>Grade</Label><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. 3" /></div>
                <div><Label>Eligibility category</Label><Input value={form.eligibility_category} onChange={(e) => setForm({ ...form, eligibility_category: e.target.value })} placeholder="e.g. SLD" /></div>
                <div><Label>Annual review due</Label><Input type="date" value={form.annual_review_due} onChange={(e) => setForm({ ...form, annual_review_due: e.target.value })} /></div>
                <div><Label>Reevaluation due</Label><Input type="date" value={form.reevaluation_due} onChange={(e) => setForm({ ...form, reevaluation_due: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createStudent} disabled={saving} className="brand-gradient text-white">{saving ? "Saving…" : "Add student"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students…" className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={refetch}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading caseload…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No students yet" description="Add your first student to start building a connected 360° profile." icon={Users}
          action={<Button className="brand-gradient text-white" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Student</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const reviewDays = daysUntil(s.annual_review_due);
            const reevalDays = daysUntil(s.reevaluation_due);
            const urgent = (reviewDays !== null && reviewDays <= 30) || (reevalDays !== null && reevalDays <= 30);
            return (
              <Link key={s.id} to={`/students/${s.id}`}>
                <Card className="p-5 h-full hover:-translate-y-0.5 hover:card-shadow-lg transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center font-semibold shrink-0 ${colorMap[s.avatar_color] || colorMap.violet}`}>
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{s.first_name} {s.last_name}</div>
                      <div className="text-sm text-muted-foreground">Grade {s.grade || "—"} · {s.eligibility_category || "No eligibility"}</div>
                    </div>
                    {urgent && <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" title="Deadline approaching" />}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Review: {s.annual_review_due || "—"}</span>
                    <span>Reeval: {s.reevaluation_due || "—"}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
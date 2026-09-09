import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, ArrowRight, Loader2, UserPlus, FlaskConical } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { loadDemoCaseload } from "@/lib/demoData";

const ROLES = ["Special Education Teacher", "Case Manager", "Related Service Provider", "Educational Coordinator", "Administrator", "Other"];
const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9-12"];
const SIZES = ["Under 10", "10-15", "16-20", "21-25", "26-30", "Over 30"];
const STEP_TITLES = ["About you", "Your school", "Your caseload", "You're ready"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, checkUserAuth } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", role: "", school: "", state: "", grades: [], caseload: "" });

  useEffect(() => {
    if (user?.data?.onboarding_completed) {
      navigate("/app", { replace: true });
      return;
    }
    const saved = user?.data?.onboarding;
    if (saved) setForm((f) => ({ ...f, ...saved }));
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleGrade = (g) =>
    setForm((f) => ({ ...f, grades: f.grades.includes(g) ? f.grades.filter((x) => x !== g) : [...f.grades, g] }));

  // Progress is saved on every step, so users who leave and return pick up where they left off.
  const persist = async (extra = {}) => {
    const data = { ...form, ...extra };
    const payload = { onboarding: data };
    if (data.full_name) payload.full_name = data.full_name;
    await base44.auth.updateMe(payload);
    setForm(data);
  };

  const next = async () => {
    setSaving(true);
    try {
      await persist();
      setStep((s) => Math.min(s + 1, 3));
    } catch (e) {
      toast({ title: "Could not save your progress", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      await checkUserAuth();
      navigate("/app");
    } finally {
      setSaving(false);
    }
  };

  const choose = async (choice) => {
    setSaving(true);
    try {
      await persist({ choice });
      await base44.auth.updateMe({ onboarding_completed: true });
      if (choice === "demo") {
        sessionStorage.setItem("casecue_demo_tour", "1");
        const res = await loadDemoCaseload();
        toast({
          title: res.created ? "Demo caseload loaded" : "Demo caseload ready",
          description: `${res.students} fictional students — clearly labeled — are ready to explore.`,
        });
      }
      navigate(choice === "demo" ? "/app" : "/students");
    } catch (e) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen brand-gradient-soft flex flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="h-9 w-9 rounded-xl brand-gradient flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">CaseCue</span>
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-border bg-card card-shadow-lg p-6 sm:p-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step + 1} of {STEP_TITLES.length}</span>
            <span>{STEP_TITLES[step]}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full brand-gradient transition-all" style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }} />
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Welcome! Tell us about you.</h2>
              <p className="text-sm text-muted-foreground mt-1">This helps us tailor your dashboard — you can skip anything you'd rather not share.</p>
            </div>
            <div>
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="e.g. Jordan Reyes" className="mt-1" autoFocus />
            </div>
            <div>
              <Label>Professional role</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button key={r} onClick={() => set("role", r)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${form.role === r ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Where do you work?</h2>
              <p className="text-sm text-muted-foreground mt-1">Optional — used only to personalize your experience.</p>
            </div>
            <div>
              <Label>School or district</Label>
              <Input value={form.school} onChange={(e) => set("school", e.target.value)} placeholder="e.g. Maple Ridge Elementary" className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="e.g. California" className="mt-1" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Your caseload at a glance</h2>
              <p className="text-sm text-muted-foreground mt-1">Optional — this shapes your dashboard suggestions.</p>
            </div>
            <div>
              <Label>Grade levels served</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GRADES.map((g) => (
                  <button key={g} onClick={() => toggleGrade(g)}
                    className={`h-10 w-12 rounded-lg border text-sm font-medium transition-colors ${form.grades.includes(g) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Approximate caseload size</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button key={s} onClick={() => set("caseload", s)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${form.caseload === s ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold">You're all set!</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              How would you like to start? You can always add real students later — we'll never ask for student information outside the app.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <button onClick={() => choose("real")} disabled={saving}
                className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 text-left hover:border-primary transition-colors disabled:opacity-50">
                <UserPlus className="h-6 w-6 text-primary mb-3" />
                <div className="font-semibold">Add My First Student</div>
                <p className="text-sm text-muted-foreground mt-1">Start with your real caseload in the secure student form.</p>
              </button>
              <button onClick={() => choose("demo")} disabled={saving}
                className="rounded-2xl border-2 border-border p-5 text-left hover:border-primary/50 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-6 w-6 text-primary mb-3 animate-spin" /> : <FlaskConical className="h-6 w-6 text-primary mb-3" />}
                <div className="font-semibold">Explore With Fictional Demo Data</div>
                <p className="text-sm text-muted-foreground mt-1">Ten clearly-labeled fictional students to safely try every feature.</p>
              </button>
            </div>
          </div>
        )}

        {/* Footer nav */}
        {step < 3 && (
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            ) : (
              <Button variant="ghost" onClick={skip} disabled={saving}>Skip setup</Button>
            )}
            <div className="flex items-center gap-2">
              {step < 2 && <Button variant="ghost" onClick={skip} disabled={saving}>Skip for now</Button>}
              <Button onClick={next} disabled={saving} className="brand-gradient text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-5 max-w-md text-center">
        Your answers are saved to your profile only. CaseCue never asks for student information outside the app.
      </p>
    </div>
  );
}
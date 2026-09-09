import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

export default function DemoRequestForm() {
  const [form, setForm] = useState({ name: "", email: "", role: "", organization: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Please add your name and email so we can reach you.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await base44.functions.invoke("request-demo", form);
      setDone(true);
    } catch {
      setError("Something went wrong — please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-emerald-900">Request received!</h3>
        <p className="mt-2 text-sm text-emerald-800">
          Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""} — we'll reach out to schedule your demo within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8 card-shadow-lg space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="demo-name">Name *</Label>
          <Input id="demo-name" value={form.name} onChange={set("name")} placeholder="Jane Smith" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-email">Email *</Label>
          <Input id="demo-email" type="email" value={form.email} onChange={set("email")} placeholder="jane@school.org" required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="demo-role">Role</Label>
          <Input id="demo-role" value={form.role} onChange={set("role")} placeholder="Special education teacher" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-org">School / District</Label>
          <Input id="demo-org" value={form.organization} onChange={set("organization")} placeholder="Lincoln Elementary" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="demo-message">Anything you'd like us to know?</Label>
        <Textarea id="demo-message" value={form.message} onChange={set("message")} rows={3} placeholder="Caseload size, what you're hoping to solve, etc." />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" size="lg" disabled={submitting} className="w-full brand-gradient text-white h-12 text-base">
        {submitting ? "Sending…" : "Request a Demo"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">We'll reply within one business day. No spam, ever.</p>
    </form>
  );
}
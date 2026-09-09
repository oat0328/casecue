import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function SessionLogDialog({ open, onOpenChange, group, onSave }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), minutes: "30", delivery: "pull-out", provider: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ ...form, minutes: parseInt(form.minutes) || 0 });
      setForm({ date: new Date().toISOString().slice(0, 10), minutes: "30", delivery: "pull-out", provider: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log session — {group?.goal_area}</DialogTitle>
          <DialogDescription>
            {group?.students?.length || 0} student{group?.students?.length === 1 ? "" : "s"} in this group. Minutes count toward each member's service delivery record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Minutes</Label><Input type="number" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></div>
          <div><Label>Provider</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Ms. Chen, SLP" /></div>
          <div className="col-span-2"><Label>Delivery</Label>
            <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })}>
              <option value="pull-out">Pull-out</option>
              <option value="push-in">Push-in</option>
              <option value="consultation">Consultation</option>
            </select>
          </div>
          <div className="col-span-2"><Label>Session notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What the group worked on, student responses…" /></div>
        </div>
        <Button onClick={save} disabled={saving} className="brand-gradient text-white mt-4 w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {saving ? "Saving…" : "Save session"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
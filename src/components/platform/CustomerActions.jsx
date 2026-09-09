import React, { useState } from "react";
import {
  MoreHorizontal, Gift, CalendarClock, Hourglass, Ban, PauseCircle, PlayCircle, StickyNote, Loader2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const TRIAL_LENGTHS = [7, 14, 30, 60, 90];

// Per-customer Platform Owner actions: free access grants, trials,
// suspend/restore, and private notes. Every action (except notes) requires a
// reason and is recorded in the audit log.
export default function CustomerActions({ customer, onDone }) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState(null);
  const [untilDate, setUntilDate] = useState("");
  const [days, setDays] = useState(14);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (cfg) => {
    setDialog(cfg);
    setUntilDate("");
    setDays(14);
    setNote("");
    setReason("");
  };

  const confirm = async () => {
    if (dialog.needsReason !== false && reason.trim().length < 3) {
      toast({ title: "Reason required", description: "Enter a short reason for the audit log.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await base44.functions.invoke("platformAdminAction", {
        action: dialog.action,
        organization_id: customer.org_id,
        days,
        until_date: untilDate || undefined,
        note,
        reason: reason.trim(),
      });
      toast({
        title: dialog.doneLabel || "Done",
        description: `${customer.name || customer.email} — recorded in the audit log.`,
      });
      setDialog(null);
      onDone?.();
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast({ title: "Action failed", description: String(msg), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!customer.org_id) {
    return <span className="text-xs text-muted-foreground">No workspace</span>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={() => open({ action: "grant_complimentary", title: "Grant complimentary access (permanent)", doneLabel: "Complimentary access granted" })}>
            <Gift className="h-4 w-4 mr-2" /> Complimentary — permanent
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ action: "grant_complimentary", title: "Grant free access until a date", needsDate: true, doneLabel: "Free access granted" })}>
            <CalendarClock className="h-4 w-4 mr-2" /> Free until a date…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ action: "start_trial", title: "Start a trial", needsDays: true, doneLabel: "Trial started" })}>
            <Hourglass className="h-4 w-4 mr-2" /> Start trial…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ action: "extend_trial", title: "Extend this trial", needsDays: true, doneLabel: "Trial extended" })}>
            <Hourglass className="h-4 w-4 mr-2" /> Extend trial…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ action: "revoke_free_access", title: "Revoke free access", doneLabel: "Free access revoked" })} className="text-rose-600">
            <Ban className="h-4 w-4 mr-2" /> Revoke free access
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ action: "suspend", title: "Suspend this account", doneLabel: "Account suspended" })} className="text-rose-600">
            <PauseCircle className="h-4 w-4 mr-2" /> Suspend account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ action: "restore", title: "Restore this account", doneLabel: "Account restored" })}>
            <PlayCircle className="h-4 w-4 mr-2" /> Restore account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ action: "set_note", title: "Add a private admin note", needsNote: true, needsReason: false, doneLabel: "Note saved" })}>
            <StickyNote className="h-4 w-4 mr-2" /> Private note…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog && (
        <Dialog open onOpenChange={(o) => !o && setDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{dialog.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {dialog.needsDate && (
                <div>
                  <Label>Free until</Label>
                  <Input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} className="mt-1" />
                </div>
              )}
              {dialog.needsDays && (
                <div>
                  <Label>{dialog.action === "extend_trial" ? "Extend by (days)" : "Trial length (days)"}</Label>
                  <div className="flex gap-1.5 mt-1">
                    {TRIAL_LENGTHS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d)}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-sm transition-colors",
                          days === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {dialog.needsNote && (
                <div>
                  <Label>Private note (visible to the Platform Owner only)</Label>
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
                </div>
              )}
              {dialog.needsReason !== false && (
                <div>
                  <Label>Reason (required — recorded in the audit log)</Label>
                  <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {customer.name || customer.email} — every action is recorded in the audit log.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
              <Button onClick={confirm} disabled={busy} className="brand-gradient text-white">
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
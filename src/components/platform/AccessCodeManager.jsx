import React, { useState } from "react";
import { KeyRound, Plus, Loader2, Power, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Access Code Manager — Platform Owner tool for the free access-code system.
// Lists, creates, deactivates, and edits codes; shows real redemption history.
export default function AccessCodeManager() {
  const { toast } = useToast();
  const [codes, setCodes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "", label: "", description: "", grant_type: "complimentary",
    access_days: 30, trial_days: 14, plan_name: "Founding Teacher",
    monthly_price: 0, max_redemptions: 25, expiration_date: "",
  });
  const [editing, setEditing] = useState(null); // { id, max_redemptions, expiration_date }

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("accessCodes", { action: "list" });
      setCodes(res.data?.codes || []);
    } catch (e) {
      toast({ title: "Could not load codes", description: e?.response?.data?.error || e.message, variant: "destructive" });
      setCodes([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const createCode = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("accessCodes", { action: "create", ...form, expiration_date: form.expiration_date || null });
      toast({ title: "Access code created" });
      setShowCreate(false);
      setForm({ ...form, code: "", label: "", description: "" });
      load();
    } catch (e) {
      toast({ title: "Could not create code", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (code) => {
    try {
      await base44.functions.invoke("accessCodes", { action: "update", id: code.id, active: !code.active });
      toast({ title: code.active ? `Code ${code.code} deactivated` : `Code ${code.code} activated` });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const saveEdit = async () => {
    try {
      await base44.functions.invoke("accessCodes", {
        action: "update", id: editing.id,
        max_redemptions: editing.max_redemptions,
        expiration_date: editing.expiration_date || null,
      });
      toast({ title: "Code updated" });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const grantLabel = { complimentary: "Complimentary", trial: "Free trial", demo: "Demo" };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Free Access Codes</h3>
            <p className="text-sm text-muted-foreground">Give teachers free access — no payment info is ever collected through codes.</p>
          </div>
          <Button className="brand-gradient text-white" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-1" /> Create Code
          </Button>
        </div>
      </Card>

      {showCreate && (
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
            <div><Label>Code (users type this) *</Label><Input className="mt-2" placeholder="e.g. SPRINGFREE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Label *</Label><Input className="mt-2" placeholder="e.g. Spring Promo — 30 Days Free" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Input className="mt-2" placeholder="Shown to redeeming teachers" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Access type</Label>
              <select className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.grant_type} onChange={(e) => setForm({ ...form, grant_type: e.target.value })}>
                <option value="complimentary">Complimentary (X days free)</option>
                <option value="trial">Free trial (then paid plan)</option>
                <option value="demo">Demo (fictional data only)</option>
              </select>
            </div>
            <div>
              <Label>{form.grant_type === "trial" ? "Trial length (days)" : form.grant_type === "complimentary" ? "Access length (days)" : "—"}</Label>
              <Input type="number" min="1" className="mt-2" disabled={form.grant_type === "demo"}
                value={form.grant_type === "trial" ? form.trial_days : form.access_days}
                onChange={(e) => setForm({ ...form, [form.grant_type === "trial" ? "trial_days" : "access_days"]: Number(e.target.value) })} />
            </div>
            <div><Label>Plan name</Label><Input className="mt-2" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} /></div>
            <div><Label>Monthly price after trial (USD)</Label><Input type="number" min="0" step="0.01" className="mt-2" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} /></div>
            <div><Label>Max redemptions</Label><Input type="number" min="1" className="mt-2" value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: Number(e.target.value) })} /></div>
            <div><Label>Expiration date (optional)</Label><Input type="date" className="mt-2" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <Button className="brand-gradient text-white" onClick={createCode} disabled={busy || !form.code || !form.label}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create Code
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        (codes || []).map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold">{c.code}</span>
                  <Badge variant={c.active ? "default" : "secondary"} className={c.active ? "bg-emerald-100 text-emerald-700" : ""}>{c.active ? "Active" : "Inactive"}</Badge>
                  <Badge variant="outline">{grantLabel[c.grant_type] || c.grant_type}</Badge>
                </div>
                <div className="text-sm font-medium mt-1">{c.label}</div>
                {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
                <div className="text-xs text-muted-foreground mt-2">
                  {c.redemption_count}{c.max_redemptions ? `/${c.max_redemptions}` : ""} redeemed
                  {c.expiration_date ? ` · expires ${c.expiration_date}` : ""}
                </div>
                {c.redemptions?.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {c.redemptions.slice(0, 5).map((r, i) => (
                      <div key={i}>{r.user_email} — {r.redeemed_at?.slice(0, 10)}</div>
                    ))}
                    {c.redemptions.length > 5 && <div>+ {c.redemptions.length - 5} more</div>}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing({ id: c.id, max_redemptions: c.max_redemptions, expiration_date: c.expiration_date })}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>
                  <Power className="h-3.5 w-3.5 mr-1" /> {c.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>

            {editing?.id === c.id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4 mt-4 pt-4 border-t border-border">
                <div><Label>Max redemptions</Label><Input type="number" min="1" className="mt-2" value={editing.max_redemptions || ""} onChange={(e) => setEditing({ ...editing, max_redemptions: Number(e.target.value) })} /></div>
                <div><Label>Expiration date</Label><Input type="date" className="mt-2" value={editing.expiration_date || ""} onChange={(e) => setEditing({ ...editing, expiration_date: e.target.value })} /></div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button size="sm" className="brand-gradient text-white" onClick={saveEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
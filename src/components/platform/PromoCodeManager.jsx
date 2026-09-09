import React, { useState } from "react";
import { TicketPercent, Plus, Loader2, Power, Pencil, Copy, Trash2, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = {
  percent_off: { label: "% off (every billing cycle)", unit: "Percent off (%)" },
  fixed_off: { label: "$ off (every billing cycle)", unit: "Dollars off ($/month)" },
  first_month_free: { label: "First month free", unit: "— (no value needed)" },
  months_free: { label: "First N months free", unit: "Months free" },
  trial_extension: { label: "Extended free trial", unit: "Extra trial days" },
};

const EMPTY_FORM = {
  code: "", description: "", discount_type: "percent_off", value: 25,
  start_date: "", expiration_date: "", max_uses: 0, single_use_per_user: false,
  allowed_email_domains: "", invite_emails: "", founding_member: false, beta_tester: false,
};

// Promo Code Manager — Platform Owner marketing tool. Full control: create,
// edit, pause, extend, duplicate, and disable checkout promo codes, with
// live tracking of uses, remaining capacity, redeemed users, discount
// impact, and conversion (redemptions ÷ validations).
export default function PromoCodeManager() {
  const { toast } = useToast();
  const [codes, setCodes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null); // { id, value, max_uses, expiration_date }

  const call = async (payload, okTitle) => {
    try {
      const res = await base44.functions.invoke("promoCodeAdmin", payload);
      toast({ title: okTitle });
      return res;
    } catch (e) {
      toast({ title: "Action failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
      return null;
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("promoCodeAdmin", { action: "list" });
      setCodes(res.data?.codes || []);
    } catch (e) {
      toast({ title: "Could not load promo codes", description: e?.response?.data?.error || e.message, variant: "destructive" });
      setCodes([]);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  const createCode = async () => {
    setBusy(true);
    const res = await call({
      action: "create",
      ...form,
      value: Number(form.value) || 0,
      max_uses: Number(form.max_uses) || 0,
      allowed_email_domains: form.allowed_email_domains.split(",").map((s) => s.trim()).filter(Boolean),
      invite_emails: form.invite_emails.split(",").map((s) => s.trim()).filter(Boolean),
    }, form.code ? `Promo code ${form.code} created` : "Promo code created");
    if (res) { setShowCreate(false); setForm(EMPTY_FORM); load(); }
    setBusy(false);
  };

  const toggleActive = async (c) => {
    const res = await call({ action: "update", id: c.id, active: !c.active }, c.active ? `Code ${c.code} paused` : `Code ${c.code} activated`);
    if (res) load();
  };

  const saveEdit = async () => {
    const res = await call({
      action: "update", id: editing.id,
      value: Number(editing.value) || 0,
      max_uses: Number(editing.max_uses) || 0,
      expiration_date: editing.expiration_date || "",
    }, "Code updated");
    if (res) { setEditing(null); load(); }
  };

  const removeCode = async (c) => {
    if (!window.confirm(`Delete promo code ${c.code}? This cannot be undone.`)) return;
    const res = await call({ action: "delete", id: c.id }, `Code ${c.code} deleted`);
    if (res) load();
  };

  const duplicate = (c) => {
    setForm({
      ...EMPTY_FORM,
      code: "",
      description: c.description || "",
      discount_type: c.discount_type,
      value: c.value,
      max_uses: c.max_uses,
      single_use_per_user: c.single_use_per_user,
      founding_member: c.founding_member,
      beta_tester: c.beta_tester,
    });
    setShowCreate(true);
  };

  const perUseSaved = (c) => {
    if (c.discount_type === "percent_off") return 24.99 * ((c.value || 0) / 100);
    if (c.discount_type === "fixed_off") return c.value || 0;
    if (c.discount_type === "first_month_free") return 24.99;
    if (c.discount_type === "months_free") return 24.99 * Math.max(1, c.value || 1);
    return 0;
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><TicketPercent className="h-4 w-4 text-primary" /> Promo Codes</h3>
            <p className="text-sm text-muted-foreground">Checkout discounts and trial offers — create one in under 30 seconds, track every redemption, pause or change it anytime.</p>
          </div>
          <Button className="brand-gradient text-white" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-1" /> Create Code
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          For 100% free accounts with no checkout at all, use the Free Access Codes tab — promo codes here only shape checkout pricing (discounts, free first month(s), extended trials).
        </p>
      </Card>

      {showCreate && (
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-4">
            <div><Label>Code (users type this) *</Label><Input className="mt-2" placeholder="e.g. FOUNDING25" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Description (internal)</Label><Input className="mt-2" placeholder="e.g. 25% off forever — founding members" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Discount type</Label>
              <select className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                {Object.entries(TYPES).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>{TYPES[form.discount_type]?.unit || "Value"}</Label>
              <Input type="number" min="0" className="mt-2" disabled={form.discount_type === "first_month_free"}
                value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </div>
            <div><Label>Start date (optional)</Label><Input type="date" className="mt-2" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Expiration date (optional)</Label><Input type="date" className="mt-2" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} /></div>
            <div><Label>Maximum uses (0 = unlimited)</Label><Input type="number" min="0" className="mt-2" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.single_use_per_user} onChange={(e) => setForm({ ...form, single_use_per_user: e.target.checked })} /> Single use per user</label></div>
            <div><Label>Allowed email domains (comma-separated, empty = any)</Label><Input className="mt-2" placeholder="e.g. lvusd.org, k12.ca.us" value={form.allowed_email_domains} onChange={(e) => setForm({ ...form, allowed_email_domains: e.target.value })} /></div>
            <div><Label>Invite-only emails (comma-separated, empty = open)</Label><Input className="mt-2" placeholder="e.g. teacher@school.org" value={form.invite_emails} onChange={(e) => setForm({ ...form, invite_emails: e.target.value })} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.founding_member} onChange={(e) => setForm({ ...form, founding_member: e.target.checked })} /> Founding Member badge</label></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.beta_tester} onChange={(e) => setForm({ ...form, beta_tester: e.target.checked })} /> Beta Tester badge</label></div>
          </div>
          <div className="flex gap-2">
            <Button className="brand-gradient text-white" onClick={createCode} disabled={busy || !form.code}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create Code
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        (codes || []).map((c) => {
          const uses = (c.redemptions || []).length;
          const remaining = c.max_uses > 0 ? Math.max(0, c.max_uses - uses) : null;
          const conversions = c.validation_count > 0 ? Math.round((uses / c.validation_count) * 100) : null;
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold">{c.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${c.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground"}`}>{c.active ? "Active" : "Paused"}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">{TYPES[c.discount_type]?.label || c.discount_type}{c.value && c.discount_type !== "first_month_free" ? ` (${c.value}${c.discount_type === "percent_off" ? "%" : c.discount_type === "fixed_off" ? "$" : ""})` : ""}</span>
                    {c.founding_member && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Founding Member</span>}
                    {c.beta_tester && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Beta Tester</span>}
                  </div>
                  {c.description && <div className="text-sm text-muted-foreground mt-1">{c.description}</div>}
                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3">
                    <span><strong>{uses}</strong>{c.max_uses > 0 ? `/${c.max_uses}` : ""} used</span>
                    {remaining != null && <span>{remaining} remaining</span>}
                    <span>≈${(uses * perUseSaved(c)).toFixed(2)} discount given</span>
                    {conversions != null && <span>{conversions}% conversion</span>}
                    {c.start_date && <span>starts {c.start_date}</span>}
                    {c.expiration_date && <span>expires {c.expiration_date}</span>}
                  </div>
                  {uses > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {c.redemptions.slice(0, 5).map((r, i) => (
                        <div key={i}>{r.user_email || "anonymous"} — {r.redeemed_at?.slice(0, 10)}</div>
                      ))}
                      {uses > 5 && <div>+ {uses - 5} more</div>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing({ id: c.id, value: c.value, max_uses: c.max_uses, expiration_date: c.expiration_date })}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => duplicate(c)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>
                    <Power className="h-3.5 w-3.5 mr-1" /> {c.active ? "Pause" : "Activate"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-rose-600 border-rose-300 hover:bg-rose-50" onClick={() => removeCode(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {editing?.id === c.id && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-4 mt-4 pt-4 border-t border-border">
                  <div><Label>{TYPES[c.discount_type]?.unit || "Value"}</Label><Input type="number" min="0" className="mt-2" value={editing.value} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} /></div>
                  <div><Label>Max uses (0 = unlimited)</Label><Input type="number" min="0" className="mt-2" value={editing.max_uses} onChange={(e) => setEditing({ ...editing, max_uses: Number(e.target.value) })} /></div>
                  <div><Label>Extend expiration</Label><Input type="date" className="mt-2" value={editing.expiration_date || ""} onChange={(e) => setEditing({ ...editing, expiration_date: e.target.value })} /></div>
                  <div className="flex gap-2 sm:col-span-3">
                    <Button size="sm" className="brand-gradient text-white" onClick={saveEdit}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
      {!loading && (codes || []).length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">No promo codes yet — create your first one above.</p>
      )}
    </div>
  );
}
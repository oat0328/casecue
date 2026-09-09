import React, { useState } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// Free access-code redemption — no Stripe, no payment information.
export default function RedeemAccessCode() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const redeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast({ title: "Enter an access code first", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("accessCodes", { action: "redeem", code: trimmed });
      const a = res.data.access;
      toast({
        title: "Access code applied",
        description: `${a.plan_name}${a.ends ? ` — active until ${a.ends}` : " — no payment required."}`,
      });
      setCode("");
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast({ title: "Could not redeem code", description: String(msg), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-border p-5">
      <h3 className="font-semibold flex items-center gap-2 text-sm">
        <Ticket className="h-4 w-4 text-primary" /> Have an access code?
      </h3>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Redeem a CaseCue access code for free access — no payment information required.
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CASECUEBETA"
          className="uppercase"
          onKeyDown={(e) => e.key === "Enter" && redeem()}
        />
        <Button onClick={redeem} disabled={busy} className="brand-gradient text-white shrink-0">
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ticket className="h-4 w-4 mr-1" />} Redeem
        </Button>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { CreditCard, Download, Loader2, Ban, Check, ReceiptText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import RedeemAccessCode from "@/components/settings/RedeemAccessCode";
import { exportReceiptPdf } from "@/lib/receiptExport";

// Self-service billing: plan status, billing history with downloadable
// receipts, self-service cancel, and resubscribe — no support contact needed.
export default function BillingCard() {
  const { toast } = useToast();
  const { user, checkUserAuth } = useAuth();
  const plan = user?.plan || user?.data?.plan || "trial";
  const autoRenewOff = !!user?.data?.subscription_auto_renew_off;
  const { data: purchases } = useAsync(() => base44.entities.Base44Purchase.filter({ status: "paid" }, "-paidAt", 50), []);

  const [startingCheckout, setStartingCheckout] = useState(false);
  const [wixStatus, setWixStatus] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  const paidPurchases = purchases || [];

  const refreshStatus = async () => {
    try {
      const res = await base44.functions.invoke("manage-subscription", { action: "status" });
      setWixStatus(res.data.subscription?.status || "UNKNOWN");
    } catch { setWixStatus(null); }
  };

  useEffect(() => { if (plan === "founding_teacher") refreshStatus(); }, [plan]);

  const startCheckout = async () => {
    setStartingCheckout(true);
    try {
      await base44.auth.updateMe({ subscription_auto_renew_off: false });
      const res = await base44.functions.invoke("create-checkout", { productId: "founding-teacher" });
      window.location.href = res.data.redirectUrl;
    } catch (e) {
      toast({ title: "Could not start checkout", description: e.message, variant: "destructive" });
      setStartingCheckout(false);
    }
  };

  const cancelSubscription = async () => {
    setCancelBusy(true);
    try {
      const res = await base44.functions.invoke("manage-subscription", { action: "cancel", reason: cancelReason || undefined });
      await base44.auth.updateMe({ subscription_auto_renew_off: true });
      await checkUserAuth();
      setConfirmCancel(false);
      setCancelReason("");
      toast({
        title: res.data.immediate ? "Subscription canceled" : "Auto-renew turned off",
        description: res.data.immediate
          ? "Your subscription has been canceled."
          : "Your subscription stays active until the end of the period you've paid for, then ends automatically. No further charges.",
      });
    } catch (e) {
      toast({ title: "Cancellation failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally { setCancelBusy(false); }
  };

  return (
    <Card className="p-6 max-w-lg">
      <div className="text-sm font-semibold text-primary">Founding Teacher</div>
      <div className="flex items-end gap-1 mt-1"><span className="text-3xl font-bold">$24.99</span><span className="text-muted-foreground mb-1">/ month</span></div>

      {plan === "founding_teacher" ? (
        <>
          <div className="mt-4 rounded-xl bg-muted p-4 text-sm space-y-1">
            <p className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> Your Founding Teacher subscription is active.</p>
            {autoRenewOff ? (
              <p className="text-amber-700">Auto-renew is off — your access continues until the end of the period you've paid for, then your subscription ends automatically.</p>
            ) : (
              <p className="text-muted-foreground">Your subscription renews monthly. Cancel anytime below — no support contact needed.</p>
            )}
            {wixStatus && <p className="text-xs text-muted-foreground">Billing status: {wixStatus}</p>}
          </div>

          <div className="mt-5">
            <h4 className="text-sm font-semibold mb-2">Update payment method</h4>
            <p className="text-sm text-muted-foreground">
              To pay with a new card, turn off auto-renew below, then start a new subscription with your new card — your current access continues through the period you've already paid for.
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl bg-muted p-4 text-sm">
          {plan === "free" && "Your subscription has ended. Resubscribe anytime to restore full Founding Teacher access."}
          {plan === "trial" && "You're on the 14-day free trial. Start your subscription now to keep full access when the trial ends — your first 14 days as a subscriber are free."}
        </div>
      )}

      {plan !== "founding_teacher" && (
        <Button onClick={startCheckout} disabled={startingCheckout} className="brand-gradient text-white mt-4">
          {startingCheckout ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />}
          {startingCheckout ? "Opening checkout…" : "Start subscription — $24.99/mo"}
        </Button>
      )}

      <div className="mt-6">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><ReceiptText className="h-4 w-4 text-primary" /> Billing history</h4>
        {paidPurchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No charges yet — your receipts will appear here after your first payment.</p>
        ) : (
          <div className="space-y-2">
            {paidPurchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.productName || "CaseCue subscription"}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"} · {p.amount ? `${p.amount} ${p.currency || "USD"}` : "—"}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportReceiptPdf(p, user)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Receipt
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {plan === "founding_teacher" && (
        <div className="mt-6">
          <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-rose-600 border-rose-300 hover:bg-rose-50">
                <Ban className="h-4 w-4 mr-1" /> Cancel subscription
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Turn off auto-renew?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your subscription stays active until the end of the period you've paid for, then ends automatically — no further charges, no support contact needed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label>Reason (optional)</Label>
                <Textarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-1" placeholder="Anything we can improve?" />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my subscription</AlertDialogCancel>
                <AlertDialogAction onClick={cancelSubscription} disabled={cancelBusy} className="bg-rose-600 hover:bg-rose-700">
                  {cancelBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Turn off auto-renew
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="mt-6"><RedeemAccessCode /></div>
    </Card>
  );
}
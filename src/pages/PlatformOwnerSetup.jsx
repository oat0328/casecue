import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Secure one-time page for the app owner to claim the Platform Owner role
// using the secret setup key (stored app-side, never in this page's code).
export default function PlatformOwnerSetup() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await base44.functions.invoke("platform-owner-setup", { setup_key: key });
      if (res.data?.ok) {
        window.location.href = "/platform-admin";
      } else {
        setError(res.data?.error || "Setup failed.");
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Setup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to CaseCue
        </Link>
        <div className="rounded-2xl border border-border bg-card card-shadow p-8">
          <div className="h-12 w-12 rounded-xl brand-gradient flex items-center justify-center text-white mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Owner Setup</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Enter your secret setup key to assign the Platform Owner role to this account. You must be signed in to your own CaseCue account, and your workspace must already be set up.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="setup-key">Setup key</Label>
              <Input
                id="setup-key"
                type="password"
                className="mt-2"
                placeholder="Paste your secret key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={busy}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="brand-gradient text-white w-full h-11" disabled={busy || !key}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {busy ? "Verifying…" : "Assign Platform Owner Role"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4">
            The key is verified server-side and only applies to your signed-in account. If you don't have a key, contact the platform owner.
          </p>
        </div>
      </div>
    </div>
  );
}
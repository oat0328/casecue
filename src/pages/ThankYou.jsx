import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ThankYou() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Payment received</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for subscribing to CaseCue! We're confirming your payment — your Founding
          Teacher access will be active within a few minutes. If you were on a free trial, your
          caseload and all your data carry over unchanged.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/app"><Button size="lg" className="brand-gradient text-white">Go to CaseCue</Button></Link>
          <Link to="/"><Button size="lg" variant="outline">Back to homepage</Button></Link>
        </div>
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> CaseCue — everything SPED, connected.
        </div>
      </div>
    </div>
  );
}
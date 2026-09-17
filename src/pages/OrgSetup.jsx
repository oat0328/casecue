import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, User, Building2, Landmark, ArrowRight, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const ORG_TYPES = [
  { value: "individual_teacher", label: "Individual Teacher", description: "One teacher or case manager with a fully private workspace.", icon: User },
  { value: "school", label: "School", description: "A school where staff share students under role-based access.", icon: Building2 },
  { value: "district", label: "District", description: "A district with schools and staff across sites.", icon: Landmark },
];

export default function OrgSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, checkUserAuth } = useAuth();
  const [orgType, setOrgType] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);

  const hasOrg = user?.organization_id || user?.data?.organization_id;
  useEffect(() => {
    if (hasOrg) navigate("/workspace-setup", { replace: true });
  }, [hasOrg, navigate]);

  const needsName = orgType === "school" || orgType === "district";

  const submit = async () => {
    if (!orgType) {
      toast({ title: "Choose an organization type to continue", variant: "destructive" });
      return;
    }
    if (needsName && !name.trim()) {
      toast({ title: "Enter your school or district name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("setupOrganization", {
        orgType,
        name: name.trim() || undefined,
        state: state.trim() || undefined,
      });
      await base44.auth.updateMe({ organization_id: res.data.organization_id });
      await checkUserAuth();
      toast({
        title: "Your workspace is ready",
        description: res.data.migrated > 0
          ? `${res.data.migrated} existing records were moved into your secure workspace.`
          : "Your data is protected in its own isolated workspace.",
      });
      window.location.href = "/workspace-setup";
    } catch (e) {
      toast({ title: "Could not set up your workspace", description: e.message, variant: "destructive" });
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

      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card card-shadow-lg p-6 sm:p-8">
        <h1 className="text-xl font-bold">Create your workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your workspace is a private, secure space for your records. One organization's data can never be seen by another — sharing with teammates comes later through invitations.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mt-6">
          {ORG_TYPES.map((t) => (
            <button key={t.value} onClick={() => setOrgType(t.value)}
              className={cn(
                "rounded-2xl border-2 p-4 text-left transition-colors",
                orgType === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              )}>
              <t.icon className={cn("h-5 w-5 mb-2", orgType === t.value ? "text-primary" : "text-muted-foreground")} />
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {needsName && (
            <div>
              <Label>{orgType === "school" ? "School name" : "District name"}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maple Ridge Elementary" className="mt-1" />
            </div>
          )}
          <div>
            <Label>State <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. California" className="mt-1" />
          </div>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          Already have records in CaseCue? They'll be moved into your workspace automatically — nothing is lost or duplicated.
        </div>

        <Button onClick={submit} disabled={saving} className="brand-gradient text-white w-full mt-6 h-11">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create workspace <ArrowRight className="h-4 w-4 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}
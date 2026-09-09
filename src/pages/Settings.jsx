import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Building2, Sparkles, Lock, Download, Trash2, CreditCard, Bell, Save, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/cards";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

export default function Settings() {
  const { toast } = useToast();
  const { user, checkUserAuth } = useAuth();
  const { data: students } = useAsync(() => base44.entities.Student.list('-updated_date', 500), []);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [aiSettings, setAiSettings] = useState({ ai_provider: "OpenAI", minimum_necessary: true, full_document_ai: false });
  const [savingAi, setSavingAi] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [notifications, setNotifications] = useState({ deadlines: true, meetings: true, data_reminders: true, weekly_summary: false });

  useEffect(() => {
    if (user) {
      setProfileName(user.full_name || "");
      const d = user.data || {};
      if (d.ai_settings) setAiSettings(d.ai_settings);
      setAcknowledged(!!d.privacy_acknowledged);
      if (d.notifications) setNotifications(d.notifications);
    }
  }, [user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try { await base44.auth.updateMe({ full_name: profileName }); await checkUserAuth(); toast({ title: "Profile saved" }); }
    catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSavingProfile(false); }
  };

  const saveAi = async () => {
    setSavingAi(true);
    try { await base44.auth.updateMe({ ai_settings: aiSettings }); toast({ title: "AI settings saved" }); }
    catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSavingAi(false); }
  };

  const acknowledge = async () => {
    try { await base44.auth.updateMe({ privacy_acknowledged: true }); setAcknowledged(true); toast({ title: "Acknowledgement recorded" }); }
    catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), user, students }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `casecue-data-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url); toast({ title: "Data exported" });
  };

  const requestDeletion = async () => {
    setRequestingDeletion(true);
    try {
      await base44.entities.AuditLog.create({ action: "data_deletion_request", entity_type: "User", entity_id: user?.id, details: deletionReason || "No reason provided" });
      setDeletionReason(""); toast({ title: "Deletion request submitted", description: "CaseCue support will process your request." });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setRequestingDeletion(false); }
  };

  const saveNotifications = async () => {
    try { await base44.auth.updateMe({ notifications }); toast({ title: "Notification preferences saved" }); }
    catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, organization, AI, privacy, and subscription." icon={SettingsIcon} />

      <Tabs defaultValue="profile">
        <TabsList className="w-full justify-start overflow-x-auto mb-6 flex-wrap h-auto">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="organization"><Building2 className="h-4 w-4 mr-1.5" /> Organization</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="h-4 w-4 mr-1.5" /> AI Settings</TabsTrigger>
          <TabsTrigger value="privacy"><Lock className="h-4 w-4 mr-1.5" /> Privacy</TabsTrigger>
          <TabsTrigger value="export"><Download className="h-4 w-4 mr-1.5" /> Data Export</TabsTrigger>
          <TabsTrigger value="deletion"><Trash2 className="h-4 w-4 mr-1.5" /> Data Deletion</TabsTrigger>
          <TabsTrigger value="subscription"><CreditCard className="h-4 w-4 mr-1.5" /> Subscription</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><Card className="p-6 max-w-lg">
          <Label>Full name</Label>
          <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1" />
          <Label className="mt-4 block">Email</Label>
          <Input value={user?.email || ""} disabled className="mt-1" />
          <Label className="mt-4 block">Role</Label>
          <Input value={user?.role || "user"} disabled className="mt-1" />
          <Button onClick={saveProfile} disabled={savingProfile} className="brand-gradient text-white mt-5"><Save className="h-4 w-4 mr-1" /> {savingProfile ? "Saving…" : "Save profile"}</Button>
        </Card></TabsContent>

        <TabsContent value="organization"><Card className="p-6 max-w-lg">
          <p className="text-sm text-muted-foreground mb-4">Organization settings manage team members and roles. Owner and Admin can invite users; Teachers work with authorized student records; Viewers have read-only access.</p>
          <Label>Organization name</Label><Input defaultValue="My School / District" className="mt-1" />
          <Label className="mt-4 block">Your role</Label><Input value={user?.role || "user"} disabled className="mt-1" />
          <Button className="brand-gradient text-white mt-5">Save organization</Button>
        </Card></TabsContent>

        <TabsContent value="ai"><Card className="p-6 max-w-lg">
          <h3 className="font-semibold mb-4">AI provider</h3>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={aiSettings.ai_provider} onChange={(e) => setAiSettings({ ...aiSettings, ai_provider: e.target.value })}>
            {["OpenAI", "Anthropic", "Gemini", "Disabled"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-border p-4">
            <div><div className="font-medium text-sm">Minimum Necessary AI</div><div className="text-xs text-muted-foreground">Only send the minimum context needed to answer. On by default.</div></div>
            <Switch checked={aiSettings.minimum_necessary} onCheckedChange={(v) => setAiSettings({ ...aiSettings, minimum_necessary: v })} />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border p-4">
            <div><div className="font-medium text-sm">Full Document AI</div><div className="text-xs text-muted-foreground">Off by default. Enable only if your organization has authorized it.</div></div>
            <Switch checked={aiSettings.full_document_ai} onCheckedChange={(v) => setAiSettings({ ...aiSettings, full_document_ai: v })} />
          </div>
          {aiSettings.full_document_ai && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Full-document AI processing may send the full selected document to the configured AI provider. Only enable this if your organization has authorized this processing.
            </div>
          )}
          <Button onClick={saveAi} disabled={savingAi} className="brand-gradient text-white mt-5"><Save className="h-4 w-4 mr-1" /> {savingAi ? "Saving…" : "Save AI settings"}</Button>
        </Card></TabsContent>

        <TabsContent value="privacy"><Card className="p-6 max-w-lg">
          <h3 className="font-semibold mb-2">Privacy & security</h3>
          <p className="text-sm text-muted-foreground mb-4">CaseCue is designed with FERPA-focused privacy and security controls for authorized education use. We do not claim FERPA or HIPAA certification. Features include private document storage, row-level access control, audit logging, minimum-necessary AI, data export, data deletion, and retention controls.</p>
          <div className="rounded-xl border border-border p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acknowledged} onChange={acknowledge} className="mt-0.5" />
              <span className="text-sm">I confirm that I am authorized by my school, district, or educational organization to use CaseCue with the student information I provide.</span>
            </label>
          </div>
          {acknowledged && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Acknowledgement recorded</p>}
        </Card></TabsContent>

        <TabsContent value="export"><Card className="p-6 max-w-lg">
          <p className="text-sm text-muted-foreground mb-4">Export your caseload data as a JSON file. You can use this for your records or to move data elsewhere.</p>
          <Button onClick={exportData} className="brand-gradient text-white"><Download className="h-4 w-4 mr-1" /> Export my data</Button>
        </Card></TabsContent>

        <TabsContent value="deletion"><Card className="p-6 max-w-lg">
          <p className="text-sm text-muted-foreground mb-4">Submit a data deletion request. CaseCue support will process your request and confirm when your data has been removed.</p>
          <Label>Reason (optional)</Label>
          <Textarea rows={3} value={deletionReason} onChange={(e) => setDeletionReason(e.target.value)} className="mt-1" />
          <Button onClick={requestDeletion} disabled={requestingDeletion} variant="outline" className="mt-4 text-rose-600 border-rose-300 hover:bg-rose-50">
            {requestingDeletion ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />} Submit deletion request
          </Button>
        </Card></TabsContent>

        <TabsContent value="subscription"><Card className="p-6 max-w-lg">
          <div className="text-sm font-semibold text-primary">Founding Teacher</div>
          <div className="flex items-end gap-1 mt-1"><span className="text-3xl font-bold">$24.99</span><span className="text-muted-foreground mb-1">/ month</span></div>
          <p className="text-sm text-muted-foreground mt-1">14-day free trial · First 50 teachers</p>
          <div className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Billing is not yet active. You're on the free trial — no payment required.</div>
          <Button className="brand-gradient text-white mt-4">Manage subscription</Button>
        </Card></TabsContent>

        <TabsContent value="notifications"><Card className="p-6 max-w-lg space-y-3">
          {[
            ["deadlines", "IEP & reevaluation deadlines"],
            ["meetings", "Upcoming meetings"],
            ["data_reminders", "Progress data reminders"],
            ["weekly_summary", "Weekly time-saved summary"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-border p-4">
              <span className="text-sm font-medium">{label}</span>
              <Switch checked={notifications[key]} onCheckedChange={(v) => setNotifications({ ...notifications, [key]: v })} />
            </div>
          ))}
          <Button onClick={saveNotifications} className="brand-gradient text-white mt-2"><Save className="h-4 w-4 mr-1" /> Save preferences</Button>
        </Card></TabsContent>
      </Tabs>
    </div>
  );
}
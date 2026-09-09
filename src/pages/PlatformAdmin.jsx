import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/lib/useAsync";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewStats from "@/components/platform/OverviewStats";
import CustomersTable from "@/components/platform/CustomersTable";
import RecentLists from "@/components/platform/RecentLists";
import AccessCodeManager from "@/components/platform/AccessCodeManager";

export default function PlatformAdmin() {
  const { user } = useAuth();
  const { data: memberships } = useAsync(
    () => user?.id ? base44.entities.OrganizationMembership.filter({ user_id: user.id, status: "active" }, '-created_date', 10) : Promise.resolve([]),
    [user?.id]
  );
  const isPlatformOwner = (memberships || []).some((m) => m.org_role === "platform_owner");
  const { data, loading, refetch } = useAsync(
    () => isPlatformOwner ? base44.functions.invoke("platformAdminStats") : Promise.resolve(null),
    [isPlatformOwner]
  );
  const stats = data?.data;

  if (!memberships) {
    return <div className="py-24 text-center text-muted-foreground">Checking access…</div>;
  }
  if (!isPlatformOwner) {
    return (
      <div className="py-24 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">You do not have access to this area.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Platform Admin"
        subtitle="Your CaseCue owner center — customers, organizations, and revenue."
        icon={ShieldCheck}
      />
      {loading || !stats ? (
        <div className="py-24 text-center text-muted-foreground">Loading platform metrics…</div>
      ) : (
        <Tabs defaultValue="overview" className="mt-2">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="activity">Activity &amp; alerts</TabsTrigger>
            <TabsTrigger value="codes">Access codes</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <OverviewStats stats={stats} />
          </TabsContent>
          <TabsContent value="customers" className="mt-6">
            <CustomersTable customers={stats.customers} onRefresh={refetch} />
          </TabsContent>
          <TabsContent value="activity" className="mt-6">
            <RecentLists stats={stats} />
          </TabsContent>
          <TabsContent value="codes" className="mt-6">
            <AccessCodeManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
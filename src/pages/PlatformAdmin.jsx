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

export default function PlatformAdmin() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => base44.functions.invoke("platformAdminStats"), []);
  const stats = data?.data;

  if (user?.role !== "admin") {
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
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <OverviewStats stats={stats} />
          </TabsContent>
          <TabsContent value="customers" className="mt-6">
            <CustomersTable customers={stats.customers} />
          </TabsContent>
          <TabsContent value="activity" className="mt-6">
            <RecentLists stats={stats} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
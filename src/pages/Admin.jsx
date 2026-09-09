import React, { useEffect, useState } from "react";
import { Users, UserCheck, DollarSign, ShieldCheck, ShieldAlert, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { StatCard, Card } from "@/components/ui/cards";
import EmptyState from "@/components/EmptyState";
import UsersTable from "@/components/admin/UsersTable";
import PurchasesTable from "@/components/admin/PurchasesTable";
import DemoRequestsTable from "@/components/admin/DemoRequestsTable";

const PLAN_PRICE = 24.99;

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [demoRequests, setDemoRequests] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    base44.entities.User.list().then(setUsers);
    base44.entities.Base44Purchase.list().then(setPurchases);
    base44.entities.DemoRequest.list().then(setDemoRequests);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admins only"
        description="This area is restricted to app administrators."
      />
    );
  }

  if (!users || !purchases || !demoRequests) {
    return <div className="py-24 text-center text-muted-foreground">Loading your dashboard…</div>;
  }

  const subscribers = users.filter((u) => u.plan === "founding_teacher");
  const trials = users.filter((u) => u.plan === "trial" || !u.plan);
  const paidPurchases = purchases.filter((p) => p.status === "paid");
  const collected = paidPurchases.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Admin"
        subtitle="Your sign-ups, subscribers, and revenue at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total sign-ups" value={users.length} icon={Users} />
        <StatCard label="Active subscribers" value={subscribers.length} icon={UserCheck} tone="green" />
        <StatCard label="Monthly recurring revenue" value={`$${(subscribers.length * PLAN_PRICE).toFixed(2)}`} icon={DollarSign} tone="blue" />
        <StatCard label="Payments collected" value={`$${collected.toFixed(2)}`} icon={DollarSign} tone="amber" sublabel={`${paidPurchases.length} paid order${paidPurchases.length === 1 ? "" : "s"}`} />
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">Registered users</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"} · {trials.length} on trial
        </p>
        {users.length === 0 ? (
          <EmptyState icon={Users} title="No users yet" description="Share your site link — new teachers will show up here the moment they register." />
        ) : (
          <UsersTable users={users} />
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Payment history</h2>
        <p className="text-sm text-muted-foreground mb-4">Every checkout, including pending and canceled.</p>
        {purchases.length === 0 ? (
          <EmptyState icon={DollarSign} title="No payments yet" description="When teachers subscribe, their payments will appear here." />
        ) : (
          <PurchasesTable purchases={purchases} />
        )}
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-1">Demo requests</h2>
        <p className="text-sm text-muted-foreground mb-4">People who asked for a demo from your website.</p>
        {demoRequests.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No demo requests yet" description="When someone books a demo on your site, they'll show up here." />
        ) : (
          <DemoRequestsTable requests={demoRequests} />
        )}
      </Card>
    </div>
  );
}
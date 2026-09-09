import React from "react";
import { ShieldAlert, TicketPercent } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PromoCodeManager from "@/components/platform/PromoCodeManager";

export default function PromoCodes() {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admins only"
        description="This area is restricted to app administrators."
      />
    );
  }
  return (
    <div>
      <PageHeader
        icon={TicketPercent}
        title="Promo Codes"
        subtitle="Create and track checkout promo codes — discounts, free months, and extended trials."
      />
      <div className="mt-2">
        <PromoCodeManager />
      </div>
    </div>
  );
}
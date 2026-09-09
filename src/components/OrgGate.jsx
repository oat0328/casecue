import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// Layout gate: every authenticated user must belong to an organization
// (their isolated data workspace) before using any app page.
export default function OrgGate() {
  const { user, isAuthenticated, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && !(user?.organization_id || user?.data?.organization_id)) {
    return <Navigate to="/org-setup" replace />;
  }

  return <Outlet />;
}
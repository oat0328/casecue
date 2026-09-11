import React, { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/cards";
import EmptyState from "@/components/EmptyState";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import CustomerActions from "@/components/platform/CustomerActions";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-blue-100 text-blue-700",
  complimentary: "bg-sky-100 text-sky-700",
  demo: "bg-gray-100 text-gray-600",
  free: "bg-gray-100 text-gray-600",
  past_due: "bg-amber-100 text-amber-700",
  canceled: "bg-rose-100 text-rose-700",
  suspended: "bg-rose-100 text-rose-700",
  expired: "bg-gray-100 text-gray-600",
};

const STATUS_FILTERS = ["all", "active", "trialing", "complimentary", "demo", "past_due", "canceled", "suspended", "expired"];
const ORG_FILTERS = ["all", "individual_teacher", "school", "district", "demo"];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

function StatusBadge({ status }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[status] || STATUS_STYLES.free)}>
      {(status || "free").replace("_", " ")}
    </span>
  );
}

export default function CustomersTable({ customers, onRefresh }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [orgType, setOrgType] = useState("all");

  const rows = useMemo(() => {
    const list = customers || [];
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (status !== "all" && (c.status || "free") !== status) return false;
      if (orgType !== "all" && c.org_type !== orgType) return false;
      if (!q) return true;
      return [c.name, c.email, c.org_name, c.plan].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [customers, query, status, orgType]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, organization…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              )}>
              {s === "all" ? "All statuses" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ORG_FILTERS.map((o) => (
          <button key={o} onClick={() => setOrgType(o)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              orgType === o ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/40"
            )}>
            {o === "all" ? "All organization types" : o.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No customers match" description="Try a different search or filter." icon={Users} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Price/mo</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{c.org_name || "No organization"}</div>
                      {c.org_type && <div className="text-xs text-muted-foreground capitalize">{c.org_type.replace("_", " ")}</div>}
                    </TableCell>
                    <TableCell className="capitalize text-sm">{(c.org_role || "—").replace("_", " ")}</TableCell>
                    <TableCell className="text-sm">{c.plan || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right text-sm">{c.monthly_price != null ? `$${Number(c.monthly_price).toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-right text-sm">{c.student_count}</TableCell>
                    <TableCell className="text-sm">{fmtDate(c.registered)}</TableCell>
                    <TableCell className="text-sm">{c.last_login ? fmtDate(c.last_login) : "Never"}</TableCell>
                    <TableCell className="text-right"><CustomerActions customer={c} onDone={onRefresh} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">{rows.length} of {(customers || []).length} customers shown. Student names and case content are never shown here — only counts and account metadata.</p>
    </div>
  );
}
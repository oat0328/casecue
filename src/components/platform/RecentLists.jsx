import React from "react";
import { Card } from "@/components/ui/cards";
import { UserPlus, CreditCard, AlertTriangle, Hourglass, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—");

function ListCard({ icon: Icon, title, items, empty, tone }) {
  const tones = { default: "text-primary", amber: "text-amber-600", red: "text-rose-600", blue: "text-blue-600" };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4", tones[tone] || tones.default)} />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {(!items || items.length === 0) ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((it, i) => (
            <li key={i} className="text-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{it.primary}</div>
                {it.secondary && <div className="text-xs text-muted-foreground truncate">{it.secondary}</div>}
              </div>
              {it.meta && <span className="text-xs text-muted-foreground shrink-0">{it.meta}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function RecentLists({ stats }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ListCard
        icon={UserPlus} title="Recent registrations" tone="blue"
        items={(stats.recent_registrations || []).map((c) => ({
          primary: c.name || c.email, secondary: c.org_name || "No organization", meta: fmtDate(c.registered),
        }))}
        empty="No registrations yet"
      />
      <ListCard
        icon={CreditCard} title="Recent payments" tone="default"
        items={(stats.recent_payments || []).map((p) => ({
          primary: p.email || "—", secondary: p.product || "Payment", meta: `$${p.amount ?? "0.00"}`,
        }))}
        empty="No payments yet"
      />
      <ListCard
        icon={AlertTriangle} title="Failed payments" tone="amber"
        items={(stats.failed_payments || []).map((p) => ({
          primary: p.email || "—", secondary: p.product || "Payment", meta: `$${p.amount ?? "0.00"}`,
        }))}
        empty="No failed payments"
      />
      <ListCard
        icon={Hourglass} title="Trials ending within 7 days" tone="blue"
        items={(stats.trials_ending_soon || []).map((t) => ({
          primary: t.org, secondary: t.plan || "Trial", meta: fmtDate(t.trial_end),
        }))}
        empty="No trials ending soon"
      />
      <ListCard
        icon={UserX} title="Inactive 14+ days" tone="red"
        items={(stats.inactive_14d || []).map((u) => ({
          primary: u.name || u.email, secondary: u.email, meta: fmtDate(u.last_login),
        }))}
        empty="Everyone is active"
      />
      <ListCard
        icon={UserX} title="Registered but never logged in" tone="default"
        items={(stats.never_logged_in || []).map((u) => ({
          primary: u.name || u.email, secondary: u.email, meta: fmtDate(u.registered),
        }))}
        empty="No inactive signups"
      />
    </div>
  );
}
import React from "react";
import { Card, StatCard } from "@/components/ui/cards";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from "recharts";
import {   Users, Activity, TrendingUp, Building2, DollarSign, Repeat, FlaskConical, CheckCircle2, Gift, AlertTriangle, XCircle, Ban } from "lucide-react";

const STATUS_COLORS = {
  demo: "#9ca3af",
  complimentary: "#8b5cf6",
  trialing: "#3b82f6",
  active: "#10b981",
  past_due: "#f59e0b",
  canceled: "#f43f5e",
  suspended: "#e11d48",
  expired: "#6b7280",
};

export default function OverviewStats({ stats }) {
  const t = stats.totals;
  const s = t.subs_by_status;
  const pieData = Object.entries(s)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.replace("_", " "), value: v, key: k }));
  const orgMix = Object.entries(t.orgs_by_type).map(([k, v]) => ({ type: k.replace("_", " "), count: v }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Total users" value={t.users} icon={Users} />
        <StatCard label="Free users (no subscription)" value={t.free_users} icon={Users} />
        <StatCard label="Active (14 days)" value={t.active_14d} icon={Activity} tone="green" />
        <StatCard label="New this week" value={t.new_this_week} icon={TrendingUp} tone="blue" />
        <StatCard label="New this month" value={t.new_this_month} icon={TrendingUp} tone="blue" />
        <StatCard label="Organizations" value={t.organizations} icon={Building2} sublabel={`${orgMix.map((o) => `${o.count} ${o.type}`).join(" · ")}`} />
        <StatCard label="Monthly recurring revenue" value={`$${t.mrr.toFixed(2)}`} icon={DollarSign} tone="green" />
        <StatCard label="Trial → paid conversion" value={`${t.conversion_rate}%`} icon={Repeat} tone="amber" />
        <StatCard label="Trials" value={s.trialing} icon={FlaskConical} tone="blue" />
        <StatCard label="Paid" value={s.active} icon={CheckCircle2} tone="green" />
        <StatCard label="Complimentary" value={s.complimentary} icon={Gift} />
        <StatCard label="Past due" value={s.past_due} icon={AlertTriangle} tone="amber" />
        <StatCard label="Canceled" value={s.canceled} icon={XCircle} tone="red" />
        <StatCard label="Suspended" value={s.suspended} icon={Ban} tone="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">User growth</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.growth}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 52%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(217 91% 52%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(250 24% 91%)" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="hsl(217 91% 52%)" strokeWidth={2} fill="url(#growthFill)" name="Users" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Subscriptions by status</h3>
          {pieData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No subscriptions yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((d) => (
                    <Cell key={d.key} fill={STATUS_COLORS[d.key] || "#94a3b8"} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
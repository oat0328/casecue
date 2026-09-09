import React from "react";
import { Card } from "@/components/ui/cards";

// Service-minute table with editable minutes/sessions and auto-calculated weekly and monthly totals.
export default function ServicesTable({ services, onChange }) {
  const update = (i, patch) => onChange(services.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const weekly = (s) => (Number(s.minutes_per_session) || 0) * (Number(s.sessions_per_week) || 0);
  const weeklyTotal = (services || []).reduce((sum, s) => sum + weekly(s), 0);

  return (
    <Card className="p-5 overflow-x-auto">
      <h4 className="font-semibold text-sm mb-1">Service minutes</h4>
      <p className="text-xs text-muted-foreground mb-3">Weekly minutes calculate automatically. Any decision without supporting evidence stays unresolved until the team decides.</p>
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="py-2 pr-2">Service</th>
            <th className="py-2 pr-2">Need / goal</th>
            <th className="py-2 pr-2">Provider</th>
            <th className="py-2 pr-2">Delivery</th>
            <th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2">Min/session</th>
            <th className="py-2 pr-2">Sessions/wk</th>
            <th className="py-2">Weekly</th>
          </tr>
        </thead>
        <tbody>
          {(services || []).map((s, i) => (
            <tr key={i} className="border-b border-border/60 align-top">
              <td className="py-2 pr-2 font-medium">{s.service || "—"}</td>
              <td className="py-2 pr-2 text-xs text-muted-foreground">{s.need_or_goal || "Team decision required"}</td>
              <td className="py-2 pr-2 text-xs">
                <input className="w-24 rounded border border-input bg-background px-1.5 py-1" value={s.provider || ""} onChange={(e) => update(i, { provider: e.target.value })} />
              </td>
              <td className="py-2 pr-2 text-xs">{s.delivery || "—"}</td>
              <td className="py-2 pr-2 text-xs">{s.service_type || "direct"}</td>
              <td className="py-2 pr-2 text-xs">
                <input type="number" min="0" className="w-16 rounded border border-input bg-background px-1.5 py-1" value={s.minutes_per_session ?? ""} onChange={(e) => update(i, { minutes_per_session: Number(e.target.value) })} />
              </td>
              <td className="py-2 pr-2 text-xs">
                <input type="number" min="0" className="w-16 rounded border border-input bg-background px-1.5 py-1" value={s.sessions_per_week ?? ""} onChange={(e) => update(i, { sessions_per_week: Number(e.target.value) })} />
              </td>
              <td className="py-2 font-medium">{weekly(s)} min</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={7} className="py-2 text-xs text-muted-foreground text-right">Total weekly minutes</td>
            <td className="py-2 font-bold">{weeklyTotal} min</td>
          </tr>
          <tr>
            <td colSpan={7} className="pb-2 text-xs text-muted-foreground text-right">Approx. monthly (×4)</td>
            <td className="pb-2 font-bold">{weeklyTotal * 4} min</td>
          </tr>
        </tfoot>
      </table>
      {(!services || !services.length) && <p className="text-sm text-muted-foreground mt-2">No services in this draft.</p>}
    </Card>
  );
}
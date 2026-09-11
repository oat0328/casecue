import React, { useMemo, useRef } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Printer, FileDown, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { captureElement } from "@/lib/chartExport";
import { printDoc, exportDocPdf } from "@/lib/docExport";
import { exportXlsx } from "@/lib/xlsxExport";
import { DELIVERED_STATUSES } from "@/lib/sessionCalc";
import { rangeSummary, pctOf, goalArea, SERVICE_LABEL, minutesOf, fmtLocal } from "@/lib/sessionReporting";

// One chart with its own Print Graph / Graph PDF / Graph Excel controls.
function ChartCard({ title, subtitle, table, children }) {
  const ref = useRef(null);
  const { toast } = useToast();

  const exportGraph = async (mode) => {
    try {
      const shot = await captureElement(ref.current);
      const opts = {
        title,
        subtitle,
        sections: [
          { heading: title, image: shot?.dataUrl, imageWidth: shot?.w, imageHeight: shot?.h, body: subtitle || "" },
          { heading: "Chart data", body: (table.rows || []).map((r) => r.join(" · ")).join("\n") || "No data recorded." },
        ],
        filename: title,
        banner: "Chart generated from your recorded session data. Educator review required before distribution.",
      };
      if (mode === "print") {
        if (!printDoc(opts)) {
          toast({ title: "Allow pop-ups to print", variant: "destructive" });
          return;
        }
        toast({ title: "Print window opened" });
      } else if (mode === "pdf") {
        exportDocPdf(opts);
        toast({ title: "Graph PDF downloaded" });
      } else {
        exportXlsx(`${title}-data`, [{ name: "Chart Data", headers: table.headers, rows: table.rows }]);
        toast({ title: "Graph data downloaded (Excel)" });
      }
    } catch (err) {
      toast({ title: "Graph export failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => exportGraph("print")}><Printer className="h-3.5 w-3.5 mr-1" />Print</Button>
          <Button size="sm" variant="outline" onClick={() => exportGraph("pdf")}><FileDown className="h-3.5 w-3.5 mr-1" />PDF</Button>
          <Button size="sm" variant="outline" onClick={() => exportGraph("excel")}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel</Button>
        </div>
      </div>
      <div ref={ref} className="h-56 -mx-1 bg-white rounded-lg">
        {children}
      </div>
    </Card>
  );
}

function NoData() {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data recorded yet.</div>;
}

// Caseload-wide charts from recorded session data. Every chart exports itself.
export default function SessionCharts({ sessions, goals }) {
  const attendance = useMemo(() => {
    const sum = rangeSummary(sessions);
    return [
      { name: "Attended", count: sum.deliveredCount, fill: "#10b981" },
      { name: "Missed", count: sum.missedCount, fill: "#f43f5e" },
      { name: "Other", count: Math.max(0, sum.total - sum.deliveredCount - sum.missedCount), fill: "#94a3b8" },
    ];
  }, [sessions]);

  const minutesByType = useMemo(() => {
    const m = new Map();
    (sessions || []).filter((s) => DELIVERED_STATUSES.includes(s.status)).forEach((s) => {
      const k = SERVICE_LABEL(s.service_type);
      m.set(k, (m.get(k) || 0) + minutesOf(s));
    });
    return [...m.entries()].map(([name, minutes]) => ({ name, minutes }));
  }, [sessions]);

  const goalProgress = useMemo(() => {
    const m = new Map();
    (sessions || []).forEach((s) => {
      const p = pctOf(s);
      if (p == null) return;
      const a = goalArea(goals, s.goal_id) || "Not linked to a goal";
      const e = m.get(a) || { sum: 0, n: 0 };
      e.sum += p;
      e.n += 1;
      m.set(a, e);
    });
    return [...m.entries()].map(([area, e]) => ({
      name: area.length > 22 ? `${area.slice(0, 20)}…` : area,
      average: Math.round((e.sum / e.n) * 10) / 10,
      points: e.n,
    }));
  }, [sessions, goals]);

  const frequency = useMemo(() => {
    const weeks = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow);
    for (let i = 7; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startS = fmtLocal(start);
      const endS = fmtLocal(end);
      weeks.push({
        name: `${start.getMonth() + 1}/${start.getDate()}`,
        sessions: (sessions || []).filter((s) => s.date >= startS && s.date <= endS).length,
      });
    }
    return weeks;
  }, [sessions]);

  const trend = useMemo(() => {
    const byDate = new Map();
    (sessions || []).forEach((s) => {
      const p = pctOf(s);
      if (p == null) return;
      const arr = byDate.get(s.date) || [];
      arr.push(p);
      byDate.set(s.date, arr);
    });
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-20)
      .map(([date, arr]) => ({ date, average: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 }));
  }, [sessions]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard
        title="Attendance Chart"
        subtitle="Delivered vs missed sessions"
        table={{
          headers: ["Outcome", "Sessions"],
          rows: attendance.map((a) => [a.name, a.count]),
        }}
      >
        {attendance.some((a) => a.count > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendance} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {attendance.map((a) => <Cell key={a.name} fill={a.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard
        title="Service Minutes Chart"
        subtitle="Delivered minutes by service type"
        table={{
          headers: ["Service Type", "Minutes"],
          rows: minutesByType.map((m) => [m.name, m.minutes]),
        }}
      >
        {minutesByType.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={minutesByType} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} height={40} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="minutes" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard
        title="Goal Progress Chart"
        subtitle="Average session performance by goal area"
        table={{
          headers: ["Goal Area", "Average %", "Data Points"],
          rows: goalProgress.map((g) => [g.name, g.average, g.points]),
        }}
      >
        {goalProgress.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={goalProgress} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} height={40} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar dataKey="average" fill="hsl(217 91% 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard
        title="Session Frequency Chart"
        subtitle="Sessions per week (last 8 weeks)"
        table={{
          headers: ["Week Of", "Sessions"],
          rows: frequency.map((w) => [w.name, w.sessions]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={frequency} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="sessions" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Progress Trend Graph"
        subtitle="Average session performance over time (most recent 20 dates)"
        table={{
          headers: ["Date", "Average %"],
          rows: trend.map((t) => [t.date, t.average]),
        }}
      >
        {trend.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, "Average performance"]} />
              <Line type="monotone" dataKey="average" stroke="hsl(199 89% 55%)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </ChartCard>
    </div>
  );
}
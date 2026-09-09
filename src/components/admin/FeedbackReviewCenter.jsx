import React, { useEffect, useMemo, useState } from "react";
import { Download, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card, StatCard } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const TYPE_LABELS = { review: "Review", feature_request: "Feature Request", bug_report: "Bug Report", general: "General" };
const STATUS_OPTIONS = ["new", "planned", "in_progress", "completed", "closed"];

// Admin Review Center: every piece of feedback, analytics, filters, status
// marking, testimonial approval, and CSV export.
export default function FeedbackReviewCenter() {
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [orgNames, setOrgNames] = useState({});
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    base44.entities.Feedback.list('-created_date', 500)
      .then((f) => setItems(f || []))
      .catch(() => setItems([]));
    base44.entities.Organization.list()
      .then((os) => setOrgNames(Object.fromEntries((os || []).map((o) => [o.id, o.name || o.id]))))
      .catch(() => {});
  }, []);

  const orgIds = useMemo(() => {
    const ids = new Set((items || []).map((x) => x.organization_id).filter(Boolean));
    return [...ids];
  }, [items]);

  const filtered = useMemo(() => {
    let f = items || [];
    if (typeFilter !== "all") f = f.filter((x) => x.feedback_type === typeFilter);
    if (statusFilter !== "all") f = f.filter((x) => (x.status || "new") === statusFilter);
    if (orgFilter !== "all") f = f.filter((x) => x.organization_id === orgFilter);
    if (dateFilter !== "all") {
      const cutoff = new Date(Date.now() - Number(dateFilter) * 86400000).toISOString().slice(0, 10);
      f = f.filter((x) => (x.created_date || "") >= cutoff);
    }
    return f;
  }, [items, typeFilter, statusFilter, orgFilter, dateFilter]);

  const stats = useMemo(() => {
    const all = items || [];
    const reviews = all.filter((x) => x.feedback_type === "review");
    const rated = reviews.filter((x) => x.rating != null);
    const avgRating = rated.length ? (rated.reduce((s, x) => s + x.rating, 0) / rated.length).toFixed(1) : "—";
    const npsPool = reviews.filter((x) => x.would_recommend != null);
    let recommendScore = "—";
    if (npsPool.length) {
      const promoters = npsPool.filter((x) => x.would_recommend >= 9).length;
      const detractors = npsPool.filter((x) => x.would_recommend <= 6).length;
      recommendScore = Math.round(((promoters - detractors) / npsPool.length) * 100);
    }
    const top = (list, key) => {
      const m = {};
      list.forEach((x) => {
        const k = (x[key] || "").trim();
        if (k) { const lk = k.toLowerCase(); m[lk] = { label: k, n: (m[lk]?.n || 0) + 1 }; }
      });
      return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 5);
    };
    return {
      avgRating,
      totalReviews: reviews.length,
      recommendScore,
      topFeatures: top(all.filter((x) => x.feedback_type === "feature_request"), "feature_requested"),
      topBugs: top(all.filter((x) => x.feedback_type === "bug_report"), "title"),
    };
  }, [items]);

  const update = async (id, patch) => {
    setItems((prev) => (prev || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));
    try {
      await base44.entities.Feedback.update(id, patch);
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const exportCsv = () => {
    const rows = (filtered || []).map((f) => [
      (f.created_date || "").slice(0, 10), TYPE_LABELS[f.feedback_type] || f.feedback_type,
      f.rating ?? "", f.would_recommend ?? "",
      (f.title || "").replace(/"/g, "'"), (f.body || "").replace(/"/g, "'"),
      (f.feature_requested || "").replace(/"/g, "'"), f.status || "new",
      f.approved_for_testimonial ? "yes" : "no",
      orgNames[f.organization_id] || f.organization_id || "",
    ]);
    const csv = [
      "date,type,rating,would_recommend,title,body,feature_requested,status,testimonial,school",
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "casecue-feedback.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!items) return <p className="text-muted-foreground text-sm mb-6">Loading feedback…</p>;

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold">Customer Feedback &amp; Reviews</h2>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Reviews, feature requests, and bug reports from your users — with ratings and recommendation scores.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Average rating" value={stats.avgRating} sublabel="out of 5 stars" tone="amber" />
        <StatCard label="Total reviews" value={stats.totalReviews} />
        <StatCard label="Recommendation score" value={stats.recommendScore} sublabel="% promoters − % detractors" tone="green" />
        <StatCard label="Feature requests" value={(items || []).filter((x) => x.feedback_type === "feature_request").length} tone="blue" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-2">Most requested features</h3>
          {stats.topFeatures.length ? (
            <ul className="text-sm text-muted-foreground space-y-1">
              {stats.topFeatures.map((f) => <li key={f.label}>· {f.label} <span className="text-muted-foreground/70">({f.n})</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No feature requests yet.</p>}
        </div>
        <div className="rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-2">Most reported bugs</h3>
          {stats.topBugs.length ? (
            <ul className="text-sm text-muted-foreground space-y-1">
              {stats.topBugs.map((f) => <li key={f.label}>· {f.label} <span className="text-muted-foreground/70">({f.n})</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No bug reports yet.</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">All time</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">All schools</option>
          {orgIds.map((id) => <option key={id} value={id}>{orgNames[id] || id}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">No feedback matches these filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <div key={f.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{TYPE_LABELS[f.feedback_type] || f.feedback_type}</span>
                <span>{(f.created_date || "").slice(0, 10)}</span>
                {f.organization_id && <span>· {orgNames[f.organization_id] || "School"}</span>}
                {f.milestone && <span>· milestone: {f.milestone}</span>}
                <span className="ml-auto flex items-center gap-0.5">
                  {f.rating != null && Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </span>
              </div>
              {f.title && <div className="font-medium text-sm">{f.title}</div>}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{f.body}</p>
              {f.feature_requested && <p className="text-sm text-primary mt-1">Feature requested: {f.feature_requested}</p>}
              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Status
                  <select
                    value={f.status || "new"}
                    onChange={(e) => update(f.id, { status: e.target.value })}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={!!f.approved_for_testimonial} onCheckedChange={(c) => update(f.id, { approved_for_testimonial: c })} />
                  Approved for public testimonial
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
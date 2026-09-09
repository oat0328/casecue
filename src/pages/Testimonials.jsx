import React from "react";
import { Link } from "react-router-dom";
import { Star, Sparkles, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";

// Public testimonials page — approved reviews only.
export default function Testimonials() {
  const { data } = useAsync(
    () => base44.entities.Feedback.filter({ approved_for_testimonial: true, feedback_type: "review" }),
    []
  );
  const reviews = (data || []).filter((r) => (r.body || "").trim()).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="brand-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to CaseCue
          </Link>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">CaseCue</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Loved by special education teachers</h1>
          <p className="mt-3 text-white/85 max-w-2xl">
            Real reviews from the educators who use CaseCue every day to manage caseloads, draft IEPs, and track progress.
          </p>
          {avg && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-2">
              <Star className="h-5 w-5 fill-amber-300 text-amber-300" />
              <span className="font-semibold">{avg} / 5</span>
              <span className="text-white/70 text-sm">· {reviews.length} verified review{reviews.length === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {reviews.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-medium">Reviews are coming soon.</p>
            <p className="text-muted-foreground mt-2 text-sm">CaseCue teachers are just getting started — check back soon for verified reviews.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card card-shadow p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < (r.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">"{r.body}"</p>
                <div className="mt-4 text-sm font-medium">{r.display_name || "Verified CaseCue educator"}</div>
                <div className="text-xs text-muted-foreground">CaseCue user{r.milestone ? ` · ${r.milestone}` : ""}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 rounded-2xl brand-gradient-soft border border-border p-8 text-center">
          <h2 className="text-xl font-bold">Ready to spend less time on paperwork?</h2>
          <p className="text-muted-foreground mt-2 text-sm">Join the special education teachers running their caseload on CaseCue.</p>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full brand-gradient text-white px-6 py-3 text-sm font-semibold mt-5">
            Get started with CaseCue
          </Link>
          <p className="text-xs text-muted-foreground mt-4">Questions? contact@getcasecue.com</p>
        </div>
      </div>
    </div>
  );
}
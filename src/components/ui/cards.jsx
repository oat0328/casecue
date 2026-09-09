import React from "react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, sublabel, icon: Icon, tone = "default", onClick }) {
  const tones = {
    default: "text-primary",
    blue: "text-blue-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-rose-600",
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 card-shadow transition-all",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:card-shadow-lg"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className={cn("h-5 w-5", tones[tone])} />}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      {sublabel && <div className="mt-1 text-sm text-muted-foreground">{sublabel}</div>}
    </div>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card card-shadow", className)} {...props}>
      {children}
    </div>
  );
}
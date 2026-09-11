import React from "react";

export default function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#07111f] via-[#0b1730] to-[#12345d] px-6 py-6 sm:px-7 sm:py-7 text-white shadow-xl shadow-slate-950/10 mb-7">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sky-200 backdrop-blur shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-sky-300">CaseCue Workspace</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 max-w-3xl text-sm sm:text-base leading-6 text-slate-300">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </section>
  );
}
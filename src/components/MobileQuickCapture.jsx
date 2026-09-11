import React from "react";
import { useNavigate } from "react-router-dom";
import { Timer, BarChart3, Camera, Users } from "lucide-react";

export default function MobileQuickCapture() {
  const navigate = useNavigate();
  const items = [
    ["Session", Timer, "/session-tracker"],
    ["Data", BarChart3, "/progress-monitoring-day"],
    ["Evidence", Camera, "/evidence-vault"],
    ["Students", Users, "/students"],
  ];
  return (
    <div className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl px-2 py-2 grid grid-cols-4 gap-1">
      {items.map(([label, Icon, path]) => (
        <button key={label} onClick={() => navigate(path)} className="rounded-xl px-2 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex flex-col items-center gap-1">
          <Icon className="h-4 w-4 text-blue-600" />
          {label}
        </button>
      ))}
    </div>
  );
}

import React from "react";

export default function CustomerDashboardTabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={
            "inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition " +
            (activeTab === t.id
              ? "bg-cyan-500/18 border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.10)]"
              : "bg-slate-950/55 border-slate-800/80 hover:bg-slate-900/40 text-slate-200")
          }
          onClick={() => onChange?.(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
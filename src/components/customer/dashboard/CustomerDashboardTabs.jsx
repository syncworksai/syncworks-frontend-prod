import React from "react";

function badgeFromLabel(label = "") {
  const match = String(label).match(/\((\d+)\)/);
  return match?.[1] || "";
}

function cleanLabel(label = "") {
  return String(label).replace(/\s*\(\d+\)\s*/g, "").trim();
}

export default function CustomerDashboardTabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="rounded-[1.65rem] border border-cyan-500/25 bg-slate-950/40 p-2 shadow-[0_0_55px_rgba(34,211,238,0.08)] backdrop-blur-xl">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {tabs.map((t) => {
          const badge = badgeFromLabel(t.label);
          const label = cleanLabel(t.label);
          const active = activeTab === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange?.(t.id)}
              className={
                "relative inline-flex h-12 items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition " +
                (active
                  ? "border-cyan-500/45 bg-cyan-500/18 text-cyan-100 shadow-[0_0_32px_rgba(34,211,238,0.16)]"
                  : "border-slate-800/90 bg-slate-950/65 text-slate-200 hover:border-cyan-500/25 hover:bg-slate-900/55")
              }
            >
              <span className="truncate">{label}</span>

              {badge ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/20 px-1.5 text-[10px] font-black text-fuchsia-100">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
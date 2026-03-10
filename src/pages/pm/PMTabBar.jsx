// src/pages/pm/PMTabBar.jsx
import React from "react";

export default function PMTabBar({ tabs, activeKey, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={[
            "h-9 px-4 rounded-xl border text-xs transition",
            activeKey === t.key
              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
              : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/40",
          ].join(" ")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

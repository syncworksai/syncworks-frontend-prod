// src/components/PlatformTabs.jsx
import React from "react";
import GodModeBuildBacklog from "./GodModeBuildBacklog";

export default function PlatformTabs({ tabs, active, onChange }) {
  const backlogActive = active === "__build_backlog";

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={[
                "px-3 py-2 rounded-xl text-sm border transition",
                isActive
                  ? "bg-cyan-500/15 border-cyan-500/35 text-cyan-100"
                  : "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange("__build_backlog")}
          className={[
            "px-3 py-2 rounded-xl text-sm font-black border transition",
            backlogActive
              ? "bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-100"
              : "bg-slate-950 border-fuchsia-500/20 hover:bg-fuchsia-500/10 text-fuchsia-200",
          ].join(" ")}
        >
          Build Backlog
        </button>
      </div>
      {backlogActive ? <GodModeBuildBacklog /> : null}
    </>
  );
}

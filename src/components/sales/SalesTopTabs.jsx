// src/components/SalesOsTopTabs.jsx
import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function tabClass(active) {
  return cx(
    "inline-flex items-center gap-2 h-10 px-4 rounded-2xl border text-sm font-semibold transition",
    active
      ? "border-transparent bg-gradient-to-r from-fuchsia-500/35 via-indigo-500/30 to-cyan-500/25 text-white shadow-[0_0_30px_rgba(217,70,239,0.22)]"
      : "border-slate-800 bg-slate-950/55 text-slate-200 hover:bg-slate-900/40"
  );
}

export default function SalesOsTopTabs({
  pipelineId,
  rightSlot = null,
}) {
  const loc = useLocation();

  const qs = useMemo(() => {
    return pipelineId ? `?pipeline_id=${encodeURIComponent(String(pipelineId))}` : "";
  }, [pipelineId]);

  const path = String(loc.pathname || "");

  const tabs = [
    { to: `/sales/dashboard${qs}`, label: "Dashboard", match: "/sales/dashboard" },
    { to: `/sales/board${qs}`, label: "Pipeline Board", match: "/sales/board" },
    { to: `/sales/stages${qs}`, label: "Stages + Templates", match: "/sales/stages" },
    { to: `/sales/agent${qs}`, label: "Agent", match: "/sales/agent" },
    { to: `/sales/calendar${qs}`, label: "Calendar", match: "/sales/calendar" },
    { to: `/sales/seats${qs}`, label: "Seats", match: "/sales/seats" },
    { to: `/sales/settings${qs}`, label: "Settings", match: "/sales/settings" },
  ];

  return (
    <div className="border-b border-slate-800 bg-slate-950/45 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((t) => {
            const active = path.startsWith(t.match);
            return (
              <Link key={t.to} to={t.to} className={tabClass(active)}>
                {t.label}
              </Link>
            );
          })}
        </div>

        {rightSlot ? <div className="ml-auto flex items-center gap-2">{rightSlot}</div> : <div className="ml-auto" />}
      </div>
    </div>
  );
}
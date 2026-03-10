// src/components/SalesOsSubNav.jsx
import React from "react";
import { Link } from "react-router-dom";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function q(pipelineId) {
  return pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : "";
}

/**
 * Sales OS sub navigation — keeps ModeBar clean and avoids mixing with global ModeBar tabs.
 * - Centered tabs
 * - Optional "actions" row under tabs (always visible, middle of page)
 */
export default function SalesOsSubNav({
  pipelineId,
  active = "dashboard",
  actions = null, // ReactNode (buttons)
}) {
  const items = [
    { id: "dashboard", label: "Dashboard", to: `/sales/dashboard${q(pipelineId)}` },
    { id: "board", label: "Board", to: `/sales/board${q(pipelineId)}` },
    { id: "calendar", label: "Calendar", to: `/sales/calendar${q(pipelineId)}` },
    { id: "seats", label: "Seats", to: `/sales/seats${q(pipelineId)}` },
    { id: "settings", label: "Settings", to: `/sales/settings` },
    { id: "stages", label: "Stages", to: `/sales/stages${q(pipelineId)}` },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4">
      <div className="w-full flex items-center justify-center">
        <div className="inline-flex items-center gap-2 flex-wrap rounded-full border border-slate-800 bg-slate-950/40 p-2">
          {items.map((it) => {
            const on = it.id === active;
            const needsPid = !["dashboard", "settings"].includes(it.id);
            const disabled = needsPid && !pipelineId;

            return (
              <Link
                key={it.id}
                to={disabled ? "#" : it.to}
                className={cx(
                  "text-xs rounded-full px-3 py-2 border transition",
                  disabled ? "pointer-events-none opacity-50 bg-slate-950/40 border-slate-800 text-slate-500" : "",
                  on
                    ? "bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-200"
                    : "bg-slate-950/60 border-slate-800 hover:bg-slate-900/40 text-slate-200"
                )}
                title={disabled ? "Pick a pipeline first" : ""}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>

      {actions ? (
        <div className="pt-3 flex items-center justify-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">{actions}</div>
        </div>
      ) : null}
    </div>
  );
}
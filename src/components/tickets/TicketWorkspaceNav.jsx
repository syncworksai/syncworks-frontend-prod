// src/components/tickets/TicketWorkspaceNav.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function TicketWorkspaceNav({ items = [], activeKey, onChange }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cx(
                "shrink-0 h-11 px-4 rounded-2xl border text-sm font-semibold transition",
                active
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
              )}
            >
              <span className="inline-flex items-center gap-2">
                {item.icon ? <span className="opacity-90">{item.icon}</span> : null}
                <span>{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
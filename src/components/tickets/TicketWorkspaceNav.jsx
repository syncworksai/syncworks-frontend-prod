import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function TicketWorkspaceNav({ items = [], activeKey, onChange, isCustomer = false }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-3 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.08),transparent_22%)]" />

      <div className="relative flex items-center gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const active = item.key === activeKey;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cx(
                "shrink-0 h-11 px-4 rounded-2xl border text-sm font-semibold transition whitespace-nowrap inline-flex items-center gap-2",
                active
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.12)]"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700",
                isCustomer ? "min-w-[120px] justify-center" : ""
              )}
            >
              {item.icon ? <span className="opacity-90">{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
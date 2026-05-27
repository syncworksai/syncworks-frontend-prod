import React from "react";
import { cx } from "./GlassCard";

export default function SidebarNav({
  title = "SyncWorks",
  subtitle = "Command Center",
  items = [],
  footer,
  className = "",
}) {
  return (
    <aside
      className={cx(
        "hidden lg:sticky lg:top-[104px] lg:block lg:self-start",
        "rounded-3xl border border-slate-800/80 bg-slate-950/55 p-4 backdrop-blur-xl",
        "shadow-[0_0_50px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div className="mb-4 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
          {title}
        </div>
        <div className="mt-1 text-sm font-extrabold text-white">{subtitle}</div>
      </div>

      <nav className="space-y-1.5">
        {items.map((item) => {
          const active = !!item.active;

          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              disabled={!!item.disabled}
              className={cx(
                "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition",
                active
                  ? "border-cyan-400/35 bg-cyan-500/14 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                  : "border-transparent bg-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/55 hover:text-slate-100",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <span
                className={cx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-base",
                  active
                    ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 group-hover:text-slate-100"
                )}
              >
                {item.icon || "•"}
              </span>

              <span className="min-w-0 flex-1 truncate">{item.label}</span>

              {item.badge ? (
                <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-fuchsia-200">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </aside>
  );
}
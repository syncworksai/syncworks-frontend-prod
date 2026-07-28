import React from "react";
import { useNavigate } from "react-router-dom";

export default function PMHeader({ title = "Property Management", subtitle = "", actions = null }) {
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-[#050914]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => nav("/pm")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-slate-950/80 shadow-[0_0_28px_rgba(34,211,238,0.14)]"
          aria-label="Open Property Management dashboard"
        >
          <img src="/brands/syncworks new logo.jpg" alt="SyncWorks" className="h-9 w-9 rounded-xl object-cover" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-black tracking-wide text-white">SyncWorks</span>
            <span className="rounded-full border border-fuchsia-500/35 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
              Property Manager
            </span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-cyan-100">{title}</div>
          {subtitle ? <div className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">{subtitle}</div> : null}
        </div>

        <button
          type="button"
          onClick={() => nav("/pm")}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-xs font-bold text-slate-100"
        >
          Dashboard
        </button>

        {actions ? <div className="hidden items-center gap-2 md:flex">{actions}</div> : null}
      </div>
    </header>
  );
}

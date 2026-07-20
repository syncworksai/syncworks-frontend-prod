// src/components/customer-health/HealthMobileQuickNav.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Icon({ type }) {
  const paths = {
    home: <><path d="m4 11 8-7 8 7" /><path d="M6.5 10.5V20h11v-9.5M10 20v-5h4v5" /></>,
    plan: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 9h18M7 13h3M14 13h3M7 17h3" /></>,
    progress: <><path d="M5 20V11M12 20V5M19 20v-8" /><path d="m4 8 5-4 4 3 7-5" /></>,
    log: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  };
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

function NavButton({ label, icon, onClick, active = false }) {
  return (
    <button type="button" onClick={onClick} className={cx("flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-black uppercase tracking-[0.08em] transition active:scale-[0.96]", active ? "bg-emerald-400/[0.08] text-emerald-100" : "text-slate-500 hover:bg-white/[0.03] hover:text-white") }>
      <span className={cx("flex h-8 w-8 items-center justify-center rounded-xl border", active ? "border-emerald-300/35 bg-emerald-400/[0.09] text-emerald-200 shadow-[0_0_12px_rgba(0,245,106,0.12)]" : "border-white/10 bg-white/[0.025] text-slate-400")}>{icon}</span>
      <span className="w-full truncate text-center">{label}</span>
    </button>
  );
}

export default function HealthMobileQuickNav({ onOpen, hasCoachProposal, activeView = "home" }) {
  return (
    <div data-syncworks-module-nav="health" className="fixed inset-x-0 bottom-0 z-[75] border-t border-emerald-300/18 bg-[#020403]/97 px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-18px_55px_rgba(0,245,106,0.10)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-5 items-stretch gap-1">
          <NavButton label="Home" icon={<Icon type="home" />} active={activeView === "home"} onClick={() => onOpen?.("home")} />
          <NavButton label="Workouts" icon={<Icon type="plan" />} onClick={() => onOpen?.("planner")} />

          <button type="button" onClick={() => onOpen?.("coach-chat")} aria-label="Open SYNC Health assistant" className="group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-300/35 bg-[linear-gradient(180deg,rgba(0,245,106,0.10),rgba(2,4,3,0.98))] px-1 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-emerald-100 shadow-[0_0_22px_rgba(0,245,106,0.16)] transition active:scale-[0.96]">
            <span className="pointer-events-none absolute left-1/2 top-2 h-11 w-11 -translate-x-1/2 rounded-full bg-emerald-300/12 blur-xl" />
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/40 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.09),transparent_28%),linear-gradient(145deg,#142019,#020403)] text-xl font-black italic text-emerald-300 shadow-[0_0_18px_rgba(0,245,106,0.22)]">
              S
              <span className="absolute bottom-1 h-px w-5 bg-emerald-300 shadow-[0_0_7px_rgba(0,245,106,0.8)]" />
            </span>
            <span className="w-full truncate text-center">SYNC</span>
            <span className="max-w-full truncate text-[7px] font-bold normal-case tracking-normal text-slate-500">Coach</span>
          </button>

          <NavButton label="Progress" icon={<Icon type="progress" />} active={activeView === "insights" || activeView === "dashboard"} onClick={() => onOpen?.("insights")} />
          <NavButton label="Log" icon={<Icon type="log" />} active={hasCoachProposal} onClick={() => onOpen?.("quick-log")} />
        </div>
      </div>
    </div>
  );
}

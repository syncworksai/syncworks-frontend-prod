// src/components/customer-health/HealthMobileQuickNav.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="m4 11 8-7 8 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5V20h11v-9.5M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 3v4M17 3v4M3 9h18M7 13h3M14 13h3M7 17h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 20V11M12 20V5M19 20v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m4 8 5-4 4 3 7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 4h14v16H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function NavButton({ label, icon, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-black uppercase tracking-[0.08em] transition active:scale-[0.96]",
        active
          ? "bg-emerald-400/10 text-emerald-100"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-emerald-100"
      )}
    >
      <span className={cx(
        "flex h-8 w-8 items-center justify-center rounded-xl border",
        active
          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
          : "border-cyan-300/15 bg-cyan-400/[0.06] text-cyan-200"
      )}>
        {icon}
      </span>
      <span className="w-full truncate text-center">{label}</span>
    </button>
  );
}

export default function HealthMobileQuickNav({
  onOpen,
  hasCoachProposal,
  activeView = "home",
}) {
  return (
    <div
      data-syncworks-module-nav="health"
      className="fixed inset-x-0 bottom-0 z-[75] border-t border-emerald-300/20 bg-[#020817]/97 px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-18px_55px_rgba(52,211,153,0.18)] backdrop-blur-2xl lg:hidden"
    >
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-5 items-stretch gap-1">
          <NavButton
            label="Health"
            icon={<HomeIcon />}
            active={activeView === "home"}
            onClick={() => onOpen?.("home")}
          />
          <NavButton
            label="Plan"
            icon={<PlanIcon />}
            onClick={() => onOpen?.("planner")}
          />
          <button
            type="button"
            onClick={() => onOpen?.("coach-chat")}
            aria-label="Open SYNC Health assistant"
            className="group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-300/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(2,8,23,0.96))] px-1 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-emerald-50 shadow-[0_0_20px_rgba(57,255,136,0.22)] transition active:scale-[0.96]"
          >
            <span className="pointer-events-none absolute left-1/2 top-2 h-11 w-11 -translate-x-1/2 rounded-full bg-emerald-300/18 blur-xl transition group-hover:bg-cyan-300/22" />
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/35 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.20),transparent_24%),linear-gradient(145deg,rgba(34,211,238,0.20),rgba(57,255,136,0.22),rgba(139,92,246,0.22))] shadow-[0_0_10px_rgba(34,211,238,0.62),0_0_18px_rgba(57,255,136,0.30)]">
              <img
                src="/health/brand/syncworks-start-logo.png"
                alt=""
                aria-hidden="true"
                className="h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.62)]"
              />
            </span>
            <span className="w-full truncate text-center">SYNC</span>
            <span className="max-w-full truncate text-[7px] font-bold normal-case tracking-normal text-emerald-100/70">
              Talk Â· Train Â· Log
            </span>
          </button>
          <NavButton
            label="Progress"
            icon={<ProgressIcon />}
            active={activeView === "insights" || activeView === "dashboard"}
            onClick={() => onOpen?.("insights")}
          />
          <NavButton
            label="Log"
            icon={<LogIcon />}
            active={hasCoachProposal}
            onClick={() => onOpen?.("quick-log")}
          />
        </div>
      </div>
    </div>
  );
}
// src/components/customer-health/HealthMobileQuickNav.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.2v-6.2H9.2V21H4a1 1 0 0 1-1-1v-9.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
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

function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M12 3v3M8 4.5l1.5 2M16 4.5l-1.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4" y="7" width="16" height="13" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <path d="M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 20V11M12 20V5M19 20v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m4 8 5-4 4 3 7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavButton({
  label,
  icon,
  onClick,
  active = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-slate-400 transition active:scale-[0.97]",
        active
          ? "bg-sky-400/10 text-sky-100"
          : "hover:bg-white/[0.04] hover:text-sky-100"
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-sky-300/15 bg-sky-400/[0.06] text-sky-200">
        {icon}
      </span>
      <span className="w-full truncate text-center">{label}</span>
    </button>
  );
}

export default function HealthMobileQuickNav({
  onOpen,
  onStartWorkout,
  onStartFallback,
  nextSession,
  hasCoachProposal,
}) {
  function startNow() {
    if (nextSession) {
      onStartWorkout?.(nextSession);
      return;
    }

    onStartFallback?.();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-sky-300/15 bg-[#020817]/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-16px_45px_rgba(0,145,255,0.16)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-[1fr_1fr_1.15fr_1fr_1fr] items-end gap-1">
          <NavButton
            label="Home"
            icon={<HomeIcon />}
            onClick={() => onOpen?.("home")}
          />

          <NavButton
            label="Plan"
            icon={<PlanIcon />}
            onClick={() => onOpen?.("planner")}
          />

          <button
            type="button"
            onClick={startNow}
            className="group relative -mt-6 flex min-w-0 flex-col items-center justify-end rounded-[1.45rem] border border-sky-300/30 bg-[linear-gradient(180deg,rgba(14,165,233,0.18),rgba(2,8,23,0.98))] px-1 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.12em] text-sky-100 shadow-[0_0_28px_rgba(0,174,255,0.24)] transition active:scale-[0.96]"
          >
            <span className="absolute inset-x-2 top-1 h-10 rounded-full bg-sky-300/15 blur-xl" />

            <img
              src="/health/brand/syncworks-start-logo.png"
              alt=""
              aria-hidden="true"
              className="relative h-12 w-12 object-contain drop-shadow-[0_0_10px_rgba(0,200,255,0.8)]"
            />

            <span className="-mt-0.5">Start</span>
          </button>

          <NavButton
            label="Coach"
            icon={<CoachIcon />}
            active={hasCoachProposal}
            onClick={() => onOpen?.("coach-chat")}
          />

          <NavButton
            label="Insights"
            icon={<InsightsIcon />}
            onClick={() => onOpen?.("insights")}
          />
        </div>
      </div>
    </div>
  );
}
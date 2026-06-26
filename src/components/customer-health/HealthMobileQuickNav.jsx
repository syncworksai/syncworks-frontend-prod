// src/components/customer-health/HealthMobileQuickNav.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function NavButton({
  label,
  icon,
  onClick,
  active = false,
  tone = "blue",
}) {
  const toneMap = {
    blue:
      "border-sky-300/20 bg-sky-400/[0.08] text-sky-100 hover:bg-sky-400/[0.14]",
    indigo:
      "border-indigo-300/20 bg-indigo-400/[0.08] text-indigo-100 hover:bg-indigo-400/[0.14]",
    cyan:
      "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-100 hover:bg-cyan-400/[0.14]",
    violet:
      "border-violet-300/20 bg-violet-400/[0.08] text-violet-100 hover:bg-violet-400/[0.14]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition active:scale-[0.98]",
        toneMap[tone] || toneMap.blue,
        active &&
          "ring-1 ring-sky-300/40 shadow-[0_0_22px_rgba(14,165,233,0.18)]"
      )}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="max-w-full truncate">{label}</span>
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
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-sky-300/15 bg-[#010712]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-3 shadow-[0_-24px_70px_rgba(0,119,255,0.18)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-5 gap-2">
          <NavButton
            label="Home"
            icon="âŒ‚"
            tone="blue"
            onClick={() => onOpen?.("home")}
          />

          <NavButton
            label="Plan"
            icon="â–¦"
            tone="indigo"
            onClick={() => onOpen?.("planner")}
          />

          <button
            type="button"
            onClick={startNow}
            className="group relative -mt-8 flex min-w-0 flex-col items-center justify-center rounded-[1.65rem] border border-sky-300/35 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),rgba(2,6,23,0.96)_66%)] px-2 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-50 shadow-[0_0_42px_rgba(0,174,255,0.38)] transition active:scale-[0.97]"
          >
            <span className="pointer-events-none absolute inset-x-3 top-1 h-8 rounded-full bg-sky-300/20 blur-xl" />

            <img
              src="/health/brand/syncworks-start-logo.png"
              alt=""
              aria-hidden="true"
              className="relative h-14 w-14 object-contain drop-shadow-[0_0_14px_rgba(0,200,255,0.9)] transition group-active:scale-95"
            />

            <span className="-mt-1 text-sky-100">
              Start
            </span>
          </button>

          <NavButton
            label="Coach"
            icon="âœ¦"
            tone={hasCoachProposal ? "cyan" : "blue"}
            active={hasCoachProposal}
            onClick={() => onOpen?.("coach-chat")}
          />

          <NavButton
            label="Insights"
            icon="âŒ"
            tone="violet"
            onClick={() => onOpen?.("insights")}
          />
        </div>
      </div>
    </div>
  );
}
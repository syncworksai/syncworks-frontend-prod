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
  tone = "default",
}) {
  const toneMap = {
    default:
      "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
    emerald:
      "border-emerald-300/30 bg-emerald-300/15 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.18)]",
    cyan:
      "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15",
    amber:
      "border-amber-300/25 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15",
    fuchsia:
      "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100 hover:bg-fuchsia-300/15",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition active:scale-[0.98]",
        toneMap[tone] || toneMap.default,
        active && "ring-1 ring-cyan-300/30"
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
  onLogData,
  nextSession,
  hasCoachProposal,
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#020617]/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-5 gap-2">
          <NavButton
            label="Coach"
            icon="🤖"
            tone={hasCoachProposal ? "emerald" : "cyan"}
            onClick={() => onOpen?.("coach-chat")}
          />

          <NavButton
            label="Today"
            icon="⚡"
            tone="default"
            onClick={() => onOpen?.("today")}
          />

          <button
            type="button"
            onClick={() =>
              nextSession
                ? onStartWorkout?.(nextSession)
                : onOpen?.("planner")
            }
            className="relative -mt-5 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1.35rem] border border-emerald-300/35 bg-gradient-to-br from-emerald-400/25 to-cyan-400/15 px-2 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-50 shadow-[0_0_34px_rgba(16,185,129,0.28)] transition active:scale-[0.98]"
          >
            <span className="absolute -top-1 h-2 w-10 rounded-full bg-emerald-300/80 blur-sm" />
            <span className="text-2xl leading-none">▶</span>
            <span className="max-w-full truncate">
              {nextSession ? "Start" : "Plan"}
            </span>
          </button>

          <NavButton
            label="Plan"
            icon="📅"
            tone="default"
            onClick={() => onOpen?.("planner")}
          />

          <NavButton
            label="Log"
            icon="✍️"
            tone="fuchsia"
            onClick={onLogData}
          />
        </div>
      </div>
    </div>
  );
}

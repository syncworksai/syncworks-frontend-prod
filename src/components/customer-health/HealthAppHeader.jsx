// src/components/customer-health/HealthAppHeader.jsx
import React from "react";
import { ArrowLeft, Activity, Dumbbell, HeartPulse, Utensils, UserRound, Sparkles } from "lucide-react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const PRIMARY_ITEMS = [
  ["Health Home", "home", HeartPulse],
  ["Workouts", "dashboard", Dumbbell],
  ["Nutrition", "nutrition-dashboard", Utensils],
  ["Progress", "insights", Activity],
  ["SYNC Coach", "coach-chat", Sparkles],
  ["Profile", "profile-intake", UserRound],
];

export default function HealthAppHeader({ hasHealthAccess, syncStatus = "local", onExit, onOpen }) {
  const syncCopy = {
    local: "Local save",
    loading: "Loading",
    syncing: "Syncing",
    saved: "Saved",
    error: "Sync issue",
  };

  return (
    <div className="relative z-30 border-b border-cyan-400/10 bg-[#030816]/88 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-5 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[11px] font-black text-slate-200 transition hover:border-cyan-300/30 hover:text-white sm:min-h-10 sm:rounded-2xl sm:text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300 sm:text-[10px] sm:tracking-[0.2em]">Health & Fitness</div>
            <div className="truncate text-[10px] text-slate-500 sm:text-xs sm:text-slate-400">Training, nutrition, recovery and SYNC coaching.</div>
          </div>

          {hasHealthAccess ? (
            <span
              className={cx(
                "shrink-0 rounded-xl border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] sm:px-2.5 sm:py-2 sm:text-[9px] sm:tracking-[0.12em]",
                syncStatus === "error"
                  ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
                  : syncStatus === "saved"
                  ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                  : "border-blue-400/20 bg-blue-400/[0.06] text-blue-100"
              )}
            >
              {syncCopy[syncStatus] || "Local save"}
            </span>
          ) : null}
        </div>

        {hasHealthAccess ? (
          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-3" aria-label="Health shortcuts">
            {PRIMARY_ITEMS.map(([label, target, Icon]) => (
              <button
                key={target}
                type="button"
                onClick={() => onOpen?.(target)}
                className={cx(
                  "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-black transition sm:min-h-10 sm:gap-2 sm:rounded-2xl sm:px-3 sm:text-xs",
                  target === "coach-chat"
                    ? "border-blue-400/25 bg-blue-500/[0.08] text-blue-100 hover:border-blue-300/40"
                    : "border-white/10 bg-white/[0.025] text-slate-300 hover:border-cyan-300/30 hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

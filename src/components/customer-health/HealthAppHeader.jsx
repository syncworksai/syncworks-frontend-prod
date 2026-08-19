// src/components/customer-health/HealthAppHeader.jsx
import React from "react";
import { ArrowLeft, Activity, Dumbbell, HeartPulse, Utensils, UserRound, Sparkles } from "lucide-react";
import ModeBar from "../ModeBar";

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
    <>
      <ModeBar title="SyncWorks" subtitle="Health" />

      <div className="relative z-30 border-b border-emerald-400/15 bg-[#030816]/88 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-slate-200 transition hover:border-cyan-300/30 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Personal</span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Health & Fitness</div>
              <div className="truncate text-xs text-slate-400">Training, nutrition, recovery and SYNC coaching.</div>
            </div>

            {hasHealthAccess ? (
              <span
                className={cx(
                  "shrink-0 rounded-xl border px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em]",
                  syncStatus === "error"
                    ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
                    : syncStatus === "saved"
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                    : "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-100"
                )}
              >
                {syncCopy[syncStatus] || "Local save"}
              </span>
            ) : null}
          </div>

          {hasHealthAccess ? (
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Health shortcuts">
              {PRIMARY_ITEMS.map(([label, target, Icon]) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => onOpen?.(target)}
                  className={cx(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-black transition",
                    target === "coach-chat"
                      ? "border-violet-400/25 bg-violet-500/[0.08] text-violet-100 hover:border-violet-300/40"
                      : "border-white/10 bg-white/[0.025] text-slate-200 hover:border-emerald-300/30 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

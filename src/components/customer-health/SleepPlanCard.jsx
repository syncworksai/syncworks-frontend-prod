// src/components/customer-health/SleepPlanCard.jsx
import React, { useMemo } from "react";
import {
  buildSleepRecommendation,
  formatClock,
  formatHours,
  getQuietHours,
  normalizeSleepPlan,
  plannedSleepHours,
} from "./healthSleepPlanner";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function SleepPlanCard({ profile, snapshot, onOpen }) {
  const plan = useMemo(
    () => normalizeSleepPlan(snapshot?.sleep_plan || profile?.sleep_plan || {}),
    [snapshot?.sleep_plan, profile?.sleep_plan]
  );

  const recommendation = useMemo(
    () => buildSleepRecommendation({ plan, snapshot }),
    [plan, snapshot]
  );

  const quiet = getQuietHours(plan);
  const scheduledHours = plannedSleepHours(plan);

  const lastSleep = Number(
    snapshot?.last_sleep_hours || snapshot?.sleep_hours || 0
  );

  const toneMap = {
    emerald: "border-lime-300/25 bg-lime-300/10 text-lime-100",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    rose: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  };

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-fuchsia-300/15 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.12),transparent_24%),linear-gradient(145deg,#07111f,#030712)] p-4 shadow-[0_16px_55px_rgba(0,0,0,0.30)] sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
              Tonight’s Recovery
            </div>

            <h2 className="mt-1 text-2xl font-black text-white">
              Sleep Planner
            </h2>
          </div>

          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-xs font-black text-lime-100">
            {formatHours(plan.sleep_goal_hours)} goal
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Bedtime
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {formatClock(plan.bedtime)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Wake
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {formatClock(plan.wake_time)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Scheduled
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {formatHours(scheduledHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Last Night
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {lastSleep ? formatHours(lastSleep) : "Log it"}
            </div>
          </div>
        </div>

        <div
          className={cx(
            "mt-4 rounded-2xl border p-3 text-sm leading-6",
            toneMap[recommendation.tone] || toneMap.cyan
          )}
        >
          <div className="font-black">{recommendation.title}</div>
          <div className="mt-1 opacity-90">{recommendation.message}</div>
        </div>

        <div className="mt-3 text-xs leading-5 text-slate-500">
          Quiet hours: {formatClock(quiet.starts_at)}–
          {formatClock(quiet.ends_at)}
        </div>

        <button
          type="button"
          onClick={() => onOpen?.("sleep")}
          className="mt-4 h-11 w-full rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-300/20 sm:w-auto"
        >
          Open Sleep & Recovery
        </button>
      </div>
    </section>
  );
}
// src/components/customer-health/HealthMomentumCard.jsx
import React, { useMemo } from "react";
import { buildHealthAchievements } from "./healthAchievements";
import { cx } from "./healthStorage";

function Badge({ item }) {
  const tones = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-100",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-3 py-3",
        item.achieved
          ? tones[item.tone] || tones.cyan
          : "border-white/10 bg-slate-950/45 text-slate-400"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="text-lg">{item.icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.12em]">
            {item.label}
          </div>
          <div className="mt-1 text-[11px] leading-4 opacity-80">
            {item.description}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HealthMomentumCard({
  profile,
  snapshot,
  history,
  progressLogs,
  onOpen,
}) {
  const achievements = useMemo(() => {
    return buildHealthAchievements({
      profile,
      snapshot,
      history,
      progressLogs,
    });
  }, [profile, snapshot, history, progressLogs]);

  return (
    <section className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-[0_10px_36px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
            Streaks & Milestones
          </div>

          <h2 className="mt-2 text-2xl font-black text-white">
            {achievements.momentumLabel}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/90">
            {achievements.momentumMessage}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-center">
            <div className="text-2xl font-black text-white">
              {achievements.workoutStreak}
            </div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Day Streak
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-center">
            <div className="text-2xl font-black text-white">
              {achievements.completedWorkouts}
            </div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Workouts
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-center">
            <div className="text-2xl font-black text-white">
              {achievements.achieved.length}
            </div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Badges
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {achievements.milestones.map((item) => (
          <Badge key={item.id} item={item} />
        ))}
      </div>

      {achievements.next ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Next badge
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">
                {achievements.next.icon} {achievements.next.label}
              </div>
              <div className="mt-1 text-sm leading-5 text-slate-400">
                {achievements.next.description}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpen?.("workout")}
                className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-500/20"
              >
                Log Workout
              </button>

              <button
                type="button"
                onClick={() => onOpen?.("steps")}
                className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-500/20"
              >
                Update Steps
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
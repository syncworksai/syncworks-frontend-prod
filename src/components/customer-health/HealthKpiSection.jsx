// src/components/customer-health/HealthKpiSection.jsx
import React, { useMemo, useState } from "react";
import { formatSeconds } from "./healthWorkoutSession";
import {
  buildHealthKpis,
  formatKpiNumber,
} from "./healthKpiEngine";
import { buildAdaptiveDailyPlan } from "./healthAdaptivePlan";
import ExerciseProgressCard from "./ExerciseProgressCard";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function KpiTile({ label, value, tone = "cyan" }) {
  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    emerald:
      "border-lime-300/20 bg-lime-300/10 text-lime-100",
    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-100",
    fuchsia:
      "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
    rose:
      "border-rose-300/20 bg-rose-300/10 text-rose-100",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-3 py-3",
        toneMap[tone] || toneMap.cyan
      )}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.14em] opacity-75">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function PriorityCard({ priority }) {
  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-50",
    emerald:
      "border-lime-300/20 bg-lime-300/10 text-lime-50",
    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-50",
    fuchsia:
      "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-50",
    rose:
      "border-rose-300/20 bg-rose-300/10 text-rose-50",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border p-3",
        toneMap[priority.tone] || toneMap.cyan
      )}
    >
      <div className="text-sm font-black">{priority.label}</div>
      <div className="mt-1 text-xs leading-5 opacity-80">
        {priority.message}
      </div>
    </div>
  );
}

export default function HealthKpiSection({
  history,
  snapshot,
  profile,
}) {
  const [showAllExercises, setShowAllExercises] = useState(false);

  const kpis = useMemo(
    () =>
      buildHealthKpis({
        history,
        snapshot,
        profile,
      }),
    [history, snapshot, profile]
  );

  const plan = useMemo(
    () =>
      buildAdaptiveDailyPlan({
        kpis,
        snapshot,
        profile,
      }),
    [kpis, snapshot, profile]
  );

  const visibleExercises = showAllExercises
    ? kpis.exercises
    : kpis.exercises.slice(0, 4);

  if (!kpis.workout.session_count) {
    return (
      <section className="rounded-[1.75rem] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(139,92,246,0.08))] p-4 sm:p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
          Performance Intelligence
        </div>

        <h2 className="mt-1 text-2xl font-black text-white">
          KPI tracking is ready
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Complete timed workout sets and SyncWorks will calculate exercise
          progression, volume, effort, pain frequency, active time, rest
          efficiency and readiness.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.10),transparent_25%),linear-gradient(145deg,#07111f,#030712)] p-4 sm:p-5">
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Performance Intelligence
              </div>

              <h2 className="mt-1 text-2xl font-black text-white">
                Adaptive KPI Overview
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                These numbers are calculated from your completed sessions—not
                generic fitness averages.
              </p>
            </div>

            <div
              className={cx(
                "w-fit rounded-2xl border px-4 py-3",
                plan.readiness.tone === "emerald"
                  ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
                  : plan.readiness.tone === "rose"
                  ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                  : "border-amber-300/25 bg-amber-300/10 text-amber-100"
              )}
            >
              <div className="text-[9px] font-black uppercase tracking-[0.14em] opacity-75">
                Readiness
              </div>
              <div className="mt-1 text-2xl font-black">
                {plan.readiness.score}/100
              </div>
              <div className="text-xs font-bold">
                {plan.readiness.status}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <KpiTile
              label="Sessions"
              value={kpis.workout.session_count}
              tone="cyan"
            />

            <KpiTile
              label="Total Sets"
              value={kpis.workout.total_sets}
              tone="emerald"
            />

            <KpiTile
              label="Volume"
              value={formatKpiNumber(kpis.workout.total_volume)}
              tone="fuchsia"
            />

            <KpiTile
              label="Completion"
              value={`${kpis.workout.completion_rate}%`}
              tone="amber"
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <KpiTile
              label="Active Ratio"
              value={`${kpis.workout.active_ratio}%`}
              tone="emerald"
            />

            <KpiTile
              label="Rest Ratio"
              value={`${kpis.workout.rest_ratio}%`}
              tone="amber"
            />

            <KpiTile
              label="Idle Ratio"
              value={`${kpis.workout.idle_ratio}%`}
              tone="cyan"
            />

            <KpiTile
              label="Avg Set"
              value={
                kpis.workout.average_set_seconds
                  ? formatSeconds(kpis.workout.average_set_seconds)
                  : "—"
              }
              tone="fuchsia"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">
              Today’s Training Direction
            </div>

            <div className="mt-1 text-lg font-black text-white">
              {plan.training.title}
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-300">
              {plan.training.message}
            </div>
          </div>

          {plan.priorities.length ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {plan.priorities.map((priority) => (
                <PriorityCard key={priority.id} priority={priority} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {visibleExercises.length ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                Exercise Intelligence
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Next-session recommendations
              </h3>
            </div>

            {kpis.exercises.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAllExercises((previous) => !previous)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200"
              >
                {showAllExercises ? "Show Less" : "Show All"}
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {visibleExercises.map((metric) => (
              <ExerciseProgressCard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
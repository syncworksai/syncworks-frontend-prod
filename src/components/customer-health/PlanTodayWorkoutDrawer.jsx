// src/components/customer-health/PlanTodayWorkoutDrawer.jsx
import React, { useMemo, useState } from "react";

import { buildAdaptiveWorkout } from "./healthAdaptiveWorkoutGenerator";

function optionLabel(mode) {
  const labels = {
    recommended: "Coach Recommended",
    strength: "Strength",
    cardio: "Cardio",
    mobility: "Mobility",
    recovery: "Recovery",
  };

  return labels[mode] || "Workout";
}

export default function PlanTodayWorkoutDrawer({
  open,
  onClose,
  profile,
  snapshot,
  history,
  onPlan,
  onStart,
  onOpenFullStudio,
}) {
  const [mode, setMode] = useState("recommended");
  const [allowSoreOverride, setAllowSoreOverride] =
    useState(false);

  const plan = useMemo(
    () =>
      buildAdaptiveWorkout({
        history,
        snapshot: {
          ...snapshot,
          allow_sore_muscle_override:
            allowSoreOverride,
        },
        profile,
        mode,
      }),
    [
      history,
      snapshot,
      profile,
      mode,
      allowSoreOverride,
    ]
  );

  if (!open) return null;

  const soreAreas =
    plan?.avoided_sore_areas || [];

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 p-3 backdrop-blur-md sm:items-center">
      <button
        type="button"
        aria-label="Close plan today"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[151] max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-cyan-300/20 bg-[#07111f] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.7)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Plan Today
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">
              Pick a simple direction
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Your coach uses recent workouts, readiness,
              soreness, time, equipment, and goals.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white"
          >
            âœ•
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            "recommended",
            "strength",
            "cardio",
            "mobility",
            "recovery",
          ].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-2xl border px-3 py-3 text-xs font-black ${
                mode === item
                  ? "border-lime-300/30 bg-lime-300/15 text-lime-100"
                  : "border-white/10 bg-white/[0.035] text-slate-300"
              }`}
            >
              {optionLabel(item)}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-lime-300/20 bg-lime-300/[0.07] p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-200">
            Coach Pick
          </div>
          <div className="mt-1 text-xl font-black text-white">
            {plan?.title || "Adaptive workout"}
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            {plan?.reason ||
              "Built from your recent training balance."}
          </div>

          {soreAreas.length ? (
            <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
              Avoiding sore areas: {soreAreas.join(", ")}.
            </div>
          ) : null}

          <div className="mt-3 space-y-2">
            {(plan?.exercises || []).slice(0, 6).map(
              (exercise, index) => (
                <div
                  key={
                    exercise.id ||
                    `${exercise.name}-${index}`
                  }
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white">
                      {exercise.name}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {exercise.planned_sets || exercise.sets || "3"} sets Â·{" "}
                      {exercise.planned_reps ||
                        exercise.reps ||
                        "8-12"}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] font-black uppercase tracking-wider text-cyan-200">
                    {exercise.category ||
                      exercise.movement_pattern ||
                      ""}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {soreAreas.length ? (
          <label className="mt-3 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <input
              type="checkbox"
              checked={allowSoreOverride}
              onChange={(event) =>
                setAllowSoreOverride(
                  event.target.checked
                )
              }
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-black text-white">
                Let me train sore areas anyway
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                This intentionally overrides the coach's
                protection filter.
              </span>
            </span>
          </label>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onPlan?.(plan)}
            className="h-12 rounded-2xl border border-cyan-300/30 bg-cyan-300/15 text-sm font-black text-cyan-100"
          >
            Add to Today
          </button>

          <button
            type="button"
            onClick={() => onStart?.(plan)}
            className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100"
          >
            Add and Start
          </button>

          <button
            type="button"
            onClick={onOpenFullStudio}
            className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white"
          >
            More Options
          </button>
        </div>
      </section>
    </div>
  );
}

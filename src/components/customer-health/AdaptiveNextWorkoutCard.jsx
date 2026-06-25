// src/components/customer-health/AdaptiveNextWorkoutCard.jsx
import React, { useMemo } from "react";
import { buildAdaptiveWorkout } from "./healthAdaptiveWorkoutGenerator";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function AdaptiveNextWorkoutCard({
  history,
  snapshot,
  profile,
  onOpen,
}) {
  const plan = useMemo(
    () =>
      buildAdaptiveWorkout({
        history,
        snapshot,
        profile,
      }),
    [history, snapshot, profile]
  );

  const tone =
    plan.recovery === "Recovery"
      ? "border-rose-300/25 bg-rose-300/[0.07]"
      : plan.recovery === "Caution"
      ? "border-amber-300/25 bg-amber-300/[0.07]"
      : "border-lime-300/25 bg-lime-300/[0.06]";

  return (
    <section
      className={cx(
        "rounded-[1.75rem] border p-4",
        tone
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">
            Adaptive Next Workout
          </div>
          <h3 className="mt-1 text-xl font-black text-white">
            {plan.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {plan.reason} Recovery status: {plan.recovery}.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white">
          {plan.includes_cardio ? "Cardio included" : "Strength focus"}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {plan.exercises.map((exercise, index) => (
          <div
            key={`${exercise.id}-${index}`}
            className="rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              {exercise.category} Â· {index + 1}
            </div>
            <div className="mt-1 text-sm font-black text-white">
              {exercise.name}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {exercise.planned_sets} set
              {String(exercise.planned_sets) === "1" ? "" : "s"} Â·{" "}
              {exercise.planned_reps}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => onOpen?.("workout")}
          className="h-11 rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 text-sm font-black text-lime-100"
        >
          Open Workout Builder
        </button>
        <button
          type="button"
          onClick={() => onOpen?.("library")}
          className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
        >
          Browse Full Library
        </button>
      </div>
    </section>
  );
}

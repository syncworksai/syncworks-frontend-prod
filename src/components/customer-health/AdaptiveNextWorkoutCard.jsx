// src/components/customer-health/AdaptiveNextWorkoutCard.jsx
import React, { useMemo, useState } from "react";
import { buildAdaptiveWorkout } from "./healthAdaptiveWorkoutGenerator";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const MODES = [
  { id: "recommended", label: "Recommended" },
  { id: "strength", label: "Strength" },
  { id: "cardio", label: "Cardio" },
  { id: "mobility", label: "Mobility" },
  { id: "recovery", label: "Recovery" },
  { id: "second-session", label: "Second Session" },
];

export default function AdaptiveNextWorkoutCard({
  history,
  snapshot,
  profile,
  onOpen,
  onStartAdaptive,
  onOpenCardio,
}) {
  const [excludedIds, setExcludedIds] = useState([]);
  const [mode, setMode] = useState("recommended");

  const plan = useMemo(
    () => buildAdaptiveWorkout({ history, snapshot, profile, mode }),
    [history, snapshot, profile, mode]
  );

  const visibleExercises = plan.exercises.filter(
    (exercise) => !excludedIds.includes(exercise.id)
  );

  const launchPlan = { ...plan, exercises: visibleExercises };

  const tone =
    plan.recovery === "Recovery"
      ? "border-rose-300/25 bg-rose-300/[0.07]"
      : plan.recovery === "Caution"
      ? "border-amber-300/25 bg-amber-300/[0.07]"
      : "border-lime-300/25 bg-lime-300/[0.06]";

  function changeMode(nextMode) {
    setMode(nextMode);
    setExcludedIds([]);
  }

  return (
    <section className={cx("rounded-[1.75rem] border p-4", tone)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">
            Ready Now
          </div>
          <h3 className="mt-1 text-xl font-black text-white">{plan.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {plan.reason} Recovery status: {plan.recovery}.
          </p>
        </div>
        <div className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-lime-100">
          Ready to start
        </div>
      </div>

      <div className="health-segmented-control mt-4 flex flex-wrap gap-1">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeMode(item.id)}
            className={cx(
              "rounded-xl border px-3 py-2 text-xs font-black transition",
              mode === item.id
                ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-black/20 text-slate-300"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibleExercises.map((exercise, index) => (
          <div
            key={`${exercise.id}-${index}`}
            className="rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                  {exercise.category || "Training"} - {index + 1}
                </div>
                <div className="mt-1 text-sm font-black text-white">
                  {exercise.name}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {exercise.planned_sets} set
                  {String(exercise.planned_sets) === "1" ? "" : "s"} - {exercise.planned_reps}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExcludedIds((previous) =>
                    previous.includes(exercise.id)
                      ? previous
                      : [...previous, exercise.id]
                  )
                }
                className="shrink-0 rounded-xl border border-rose-300/20 bg-rose-300/10 px-2 py-1 text-[10px] font-black text-rose-100"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-300">
        Rest days change the suggested intensity. They do not lock you out. You can start strength, cardio, mobility, recovery, or a second session whenever you choose.
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={!visibleExercises.length}
          onClick={() => onStartAdaptive?.(launchPlan)}
          className="health-primary-action h-12 rounded-2xl border px-5 text-sm font-black disabled:opacity-40"
        >
          Start Workout Now
        </button>
        <button
          type="button"
          onClick={() => onOpenCardio?.(launchPlan)}
          className="health-secondary-action h-12 rounded-2xl border px-4 text-sm font-black"
        >
          Open Cardio Player
        </button>
        <button
          type="button"
          onClick={() => onOpen?.("library")}
          className="health-secondary-action h-12 rounded-2xl border px-4 text-sm font-black"
        >
          Modify From Library
        </button>
        {excludedIds.length ? (
          <button
            type="button"
            onClick={() => setExcludedIds([])}
            className="health-secondary-action h-12 rounded-2xl border px-4 text-sm font-black"
          >
            Restore Recommendation
          </button>
        ) : null}
      </div>
    </section>
  );
}
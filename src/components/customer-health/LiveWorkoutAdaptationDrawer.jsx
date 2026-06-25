// src/components/customer-health/LiveWorkoutAdaptationDrawer.jsx
import React, { useMemo, useState } from "react";

import {
  HEALTH_EXERCISE_CATALOG,
  trackExerciseLibraryKpi,
} from "./healthExerciseCatalog";

import {
  analyzeWorkoutBalance,
  trackWorkoutAdaptationKpi,
} from "./healthWorkoutAdaptation";

function matches(exercise, search) {
  const query = String(search || "").trim().toLowerCase();
  if (!query) return true;

  return [
    exercise.name,
    exercise.equipment,
    exercise.location,
    exercise.movement_pattern,
    ...(exercise.primary_muscles || []),
    ...(exercise.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export default function LiveWorkoutAdaptationDrawer({
  open,
  onClose,
  mode = "replace",
  session,
  currentExercise,
  onSelect,
}) {
  const [search, setSearch] = useState("");

  const balance = useMemo(
    () => analyzeWorkoutBalance(session || {}),
    [session]
  );

  const list = useMemo(() => {
    return HEALTH_EXERCISE_CATALOG.filter(
      (exercise) => matches(exercise, search)
    ).slice(0, 40);
  }, [search]);

  if (!open) return null;

  const titles = {
    replace: "Swap Exercise",
    variation: "Add Variation",
    accessory: "Add Accessory",
    finisher: "Keep Training",
  };

  function choose(exercise) {
    trackExerciseLibraryKpi(
      "live_workout_exercise_selected",
      {
        exercise_id: exercise.id,
        mode,
        current_exercise_id: currentExercise?.id || "",
      }
    );

    trackWorkoutAdaptationKpi(
      mode === "replace"
        ? "exercise_replaced"
        : mode === "variation"
        ? "variation_added"
        : mode === "accessory"
        ? "accessory_added"
        : "workout_extended",
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        current_exercise_id: currentExercise?.id || "",
        current_exercise_name: currentExercise?.name || "",
        balance_before: balance.totals,
      }
    );

    onSelect?.(exercise, mode);
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/85 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close exercise adaptation"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[151] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#07111f] shadow-[0_30px_100px_rgba(0,0,0,0.75)]">
        <header className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                Live Coach Adaptation
              </div>

              <h3 className="mt-1 text-2xl font-black text-white">
                {titles[mode] || "Choose Exercise"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Search by exercise, muscle, equipment, or movement.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] font-black text-white"
            >
              ✕
            </button>
          </div>

          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cable fly, hip flexor, triceps..."
            className="mt-4 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
          />
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {balance.primary_warning ? (
            <div className="mb-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
              <strong>Coach volume check:</strong>{" "}
              {balance.primary_warning}
            </div>
          ) : (
            <div className="mb-3 rounded-2xl border border-lime-300/20 bg-lime-300/[0.07] p-3 text-sm text-lime-100">
              Volume is currently within the adaptive range.
            </div>
          )}

          <div className="mb-3 text-xs font-bold text-slate-500">
            {list.length} matching exercises
          </div>

          <div className="grid gap-2">
            {list.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => choose(exercise)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.07]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-white">
                      {exercise.name}
                    </div>

                    <div className="mt-1 text-xs leading-5 text-slate-400">
                      {(exercise.primary_muscles || []).join(", ")} •{" "}
                      {exercise.equipment}
                    </div>

                    <div className="mt-2 text-xs font-bold text-cyan-100">
                      {exercise.sets} sets × {exercise.reps} •{" "}
                      {exercise.rest}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    Select
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

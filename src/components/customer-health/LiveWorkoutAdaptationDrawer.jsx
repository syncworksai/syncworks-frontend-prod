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

function similarityScore(exercise, currentExercise) {
  if (!currentExercise) return 0;
  const currentPrimary = new Set(currentExercise.primary_muscles || currentExercise.muscles || []);
  const currentPattern = String(currentExercise.movement_pattern || "").toLowerCase();
  const currentName = String(currentExercise.name || "").toLowerCase();
  let score = 0;
  (exercise.primary_muscles || []).forEach((muscle) => {
    if (currentPrimary.has(muscle)) score += 4;
  });
  if (currentPattern && String(exercise.movement_pattern || "").toLowerCase() === currentPattern) score += 6;
  if (/squat/.test(currentName) && /squat|leg press|hack/.test(String(exercise.name || "").toLowerCase())) score += 8;
  if (/bench|press/.test(currentName) && /bench|press|fly/.test(String(exercise.name || "").toLowerCase())) score += 5;
  if (/row|pulldown/.test(currentName) && /row|pulldown|pull/.test(String(exercise.name || "").toLowerCase())) score += 5;
  return score;
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
    return HEALTH_EXERCISE_CATALOG
      .filter((exercise) => matches(exercise, search))
      .filter((exercise) => exercise.id !== currentExercise?.id)
      .sort((a, b) => similarityScore(b, currentExercise) - similarityScore(a, currentExercise))
      .slice(0, 40);
  }, [search, currentExercise]);

  if (!open) return null;

  const titles = {
    replace: "Swap Exercise",
    variation: "Add Variation",
    accessory: "Add Accessory",
    finisher: "Keep Training",
  };

  function choose(exercise) {
    trackExerciseLibraryKpi("live_workout_exercise_selected", {
      exercise_id: exercise.id,
      mode,
      current_exercise_id: currentExercise?.id || "",
    });

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
    <div className="health-workout-adaptation-drawer fixed inset-0 z-[560] flex items-end justify-center bg-black/90 p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:items-center sm:p-4">
      <button type="button" aria-label="Close exercise adaptation" onClick={onClose} className="absolute inset-0" />

      <section className="relative z-[561] flex max-h-[calc(100dvh-max(.75rem,env(safe-area-inset-top))-max(.75rem,env(safe-area-inset-bottom)))] w-full max-w-2xl flex-col overflow-hidden rounded-[1.4rem] border border-cyan-300/20 bg-[#07111f] shadow-[0_30px_100px_rgba(0,0,0,0.75)] sm:rounded-[2rem]">
        <header className="shrink-0 border-b border-white/10 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-200">Live Coach Adaptation</div>
              <h3 className="mt-1 text-lg font-black text-white sm:text-2xl">{titles[mode] || "Choose Exercise"}</h3>
              <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
                Replacing: {currentExercise?.substitute_name || currentExercise?.name || "Current exercise"}
              </p>
            </div>
            <button type="button" onClick={onClose} className="h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-[10px] font-black text-white">Close</button>
          </div>

          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exercise, muscle, equipment..."
            className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40 sm:h-12 sm:text-sm"
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] sm:p-3">
          {balance.primary_warning ? (
            <div className="mb-2 rounded-xl border border-amber-300/25 bg-amber-300/10 p-2.5 text-[11px] leading-4 text-amber-100">
              <strong>Coach volume check:</strong> {balance.primary_warning}
            </div>
          ) : null}

          <div className="mb-2 flex items-center justify-between text-[9px] font-bold text-slate-500">
            <span>{search ? "Search results" : "Best matches first"}</span>
            <span>{list.length} options</span>
          </div>

          <div className="grid gap-2">
            {list.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => choose(exercise)}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5 text-left transition active:border-cyan-300/30 active:bg-cyan-300/[0.08]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-white">{exercise.name}</div>
                    <div className="mt-1 truncate text-[10px] text-slate-400">
                      {(exercise.primary_muscles || []).join(", ") || "Similar movement"} · {exercise.equipment || "Equipment varies"}
                    </div>
                    <div className="mt-1 text-[9px] font-bold text-cyan-100">
                      {exercise.sets} sets × {exercise.reps} · {exercise.rest}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100">Use</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

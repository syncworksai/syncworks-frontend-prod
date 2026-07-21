// src/components/customer-health/WorkoutFocusLaunchDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : fallback;
}

function workoutTotals(workout) {
  const exercises = Array.isArray(workout?.exercises)
    ? workout.exercises
    : [];

  const sets = exercises.reduce(
    (total, exercise) =>
      total +
      Math.max(
        1,
        safeNumber(
          exercise?.planned_sets || exercise?.sets,
          1
        )
      ),
    0
  );

  return {
    exercises: exercises.length,
    sets,
    duration:
      safeNumber(
        workout?.duration_minutes ||
          workout?.requested_duration_minutes,
        45
      ) || 45,
  };
}

export default function WorkoutFocusLaunchDrawer({
  open,
  workout,
  onCancel,
  onBegin,
}) {
  const [countdown, setCountdown] = useState(3);
  const [started, setStarted] = useState(false);

  const totals = useMemo(
    () => workoutTotals(workout),
    [workout]
  );

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      setStarted(false);
      return undefined;
    }

    setCountdown(3);
    setStarted(false);
    return undefined;
  }, [open, workout?.id]);

  useEffect(() => {
    if (!open || !started) return undefined;

    if (countdown <= 0) {
      const timer = window.setTimeout(() => {
        onBegin?.();
      }, 450);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () => setCountdown((value) => value - 1),
      850
    );

    return () => window.clearTimeout(timer);
  }, [countdown, open, started, onBegin]);

  if (!open) return null;

  const currentExercise = Array.isArray(workout?.exercises)
    ? workout.exercises[0]
    : null;

  const location =
    workout?.workout_location_name ||
    workout?.requested_location ||
    "Selected location";

  const equipment = Array.isArray(
    workout?.workout_equipment
  )
    ? workout.workout_equipment
    : [];

  return (
    <div className="fixed inset-0 z-[155] overflow-y-auto bg-[#010201] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(0,245,106,0.17),transparent_26%),radial-gradient(circle_at_20%_80%,rgba(0,245,106,0.08),transparent_32%),linear-gradient(180deg,#060a07_0%,#010201_65%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 pt-5 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
              SYNC Fitness Coach
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Focus Mode
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={started}
            className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-300 disabled:opacity-30"
          >
            Exit
          </button>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
              {location}
            </div>

            <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl">
              {workout?.workout_name ||
                workout?.title ||
                "Today's Workout"}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
              The dashboard is stepping aside. Your coach, current exercise,
              timers, logs, rest, and next move will stay in one focused
              training experience.
            </p>
          </div>

          <div className="relative mx-auto mt-8 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
            <div className="absolute inset-0 rounded-full border border-emerald-300/15 shadow-[0_0_80px_rgba(0,245,106,0.12)]" />
            <div
              className={`absolute inset-3 rounded-full border-[10px] border-emerald-400/15 ${
                started ? "animate-spin" : ""
              }`}
              style={{
                borderTopColor: "rgb(52 211 153)",
                borderRightColor: "rgba(52,211,153,0.42)",
                animationDuration: "1.15s",
              }}
            />
            <div className="absolute inset-10 rounded-full border border-white/10 bg-black/55 shadow-[inset_0_0_45px_rgba(0,0,0,0.8)]" />

            <div className="relative text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                {started
                  ? countdown > 0
                    ? "Starting in"
                    : "Locked in"
                  : "Ready"}
              </div>
              <div className="mt-1 text-7xl font-black tabular-nums text-white">
                {started
                  ? countdown > 0
                    ? countdown
                    : "GO"
                  : totals.exercises}
              </div>
              <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                {started
                  ? countdown > 0
                    ? "Prepare"
                    : "Begin"
                  : "Exercises"}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-8 grid w-full max-w-xl grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
              <div className="text-2xl font-black text-white">
                {totals.exercises || "-"}
              </div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                Exercises
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
              <div className="text-2xl font-black text-white">
                {totals.sets || "-"}
              </div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                Sets
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
              <div className="text-2xl font-black text-white">
                {totals.duration}
              </div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                Min Est.
              </div>
            </div>
          </div>

          <section className="mx-auto mt-4 w-full max-w-xl rounded-[1.5rem] border border-emerald-300/18 bg-emerald-300/[0.055] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
              First Movement
            </div>
            <div className="mt-2 text-xl font-black text-white">
              {currentExercise?.name ||
                currentExercise?.exercise_name ||
                "Coach will load your first exercise"}
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-400">
              Target:{" "}
              {currentExercise?.planned_sets ||
                currentExercise?.sets ||
                3}{" "}
              sets x{" "}
              {currentExercise?.planned_reps ||
                currentExercise?.reps ||
                10}{" "}
              reps
              {equipment.length
                ? ` using ${equipment.slice(0, 3).join(", ")}`
                : ""}.
            </div>
          </section>
        </main>

        <footer className="sticky bottom-0 rounded-[1.5rem] border border-white/10 bg-black/80 p-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setStarted(true)}
            disabled={started}
            className="h-16 w-full rounded-2xl border border-emerald-300/60 bg-emerald-400 text-base font-black uppercase tracking-[0.14em] text-black shadow-[0_0_36px_rgba(0,245,106,0.24)] disabled:cursor-wait disabled:opacity-80"
          >
            {started
              ? countdown > 0
                ? `Starting in ${countdown}`
                : "Enter Workout"
              : "Start Focus Mode"}
          </button>
        </footer>
      </div>
    </div>
  );
}

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

function formatCountdown(value) {
  return `00:${String(Math.max(0, value)).padStart(2, "0")}`;
}

export default function WorkoutFocusLaunchDrawer({
  open,
  workout,
  onCancel,
  onBegin,
}) {
  const [countdown, setCountdown] = useState(15);
  const [started, setStarted] = useState(false);
  const [bpm, setBpm] = useState(() => {
    if (typeof window === "undefined") return 0;
    return safeNumber(
      window.localStorage.getItem(
        "syncworks_health_current_bpm"
      ),
      0
    );
  });

  const totals = useMemo(
    () => workoutTotals(workout),
    [workout]
  );

  useEffect(() => {
    if (!open) {
      setCountdown(15);
      setStarted(false);
      return undefined;
    }

    setCountdown(15);
    setStarted(false);
    return undefined;
  }, [open, workout?.id]);

  useEffect(() => {
    if (!open || !started) return undefined;

    if (countdown <= 0) {
      const timer = window.setTimeout(
        () => onBegin?.(),
        450
      );
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () =>
        setCountdown((value) =>
          Math.max(0, value - 1)
        ),
      1000
    );

    return () => window.clearTimeout(timer);
  }, [countdown, open, started, onBegin]);

  function updateBpm(value) {
    const next = Math.max(
      0,
      Math.min(240, safeNumber(value, 0))
    );
    setBpm(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "syncworks_health_current_bpm",
        String(next || "")
      );
    }
  }

  if (!open) return null;

  const currentExercise = Array.isArray(
    workout?.exercises
  )
    ? workout.exercises[0]
    : null;

  const location =
    workout?.workout_location_name ||
    workout?.requested_location ||
    "Selected location";

  const progress = started
    ? Math.max(0, Math.min(100, (countdown / 15) * 100))
    : 100;

  return (
    <div className="fixed inset-0 z-[155] overflow-y-auto bg-[#020403] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(87,255,61,0.17),transparent_28%),linear-gradient(180deg,#060906_0%,#010201_72%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-6 pt-5 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight text-white">
              {workout?.workout_name ||
                workout?.title ||
                "Workout"}
            </div>
            <div className="mt-1 text-xs font-black text-lime-300">
              {location}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={started}
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white disabled:opacity-30"
          >
            Exit
          </button>
        </header>

        <main className="flex flex-1 flex-col justify-center py-6">
          <div className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
            <div className="absolute inset-0 rounded-full bg-lime-300/[0.03] blur-2xl" />
            <div className="absolute inset-2 rounded-full border border-lime-300/20 shadow-[0_0_70px_rgba(112,255,61,0.22),inset_0_0_55px_rgba(112,255,61,0.08)]" />
            <div
              className="absolute inset-6 rounded-full"
              style={{
                background: `conic-gradient(rgb(112 255 61) ${progress}%, rgba(112,255,61,0.09) ${progress}% 100%)`,
                boxShadow:
                  "0 0 34px rgba(112,255,61,0.34)",
              }}
            />
            <div className="absolute inset-[2.15rem] rounded-full bg-[#030604] shadow-[inset_0_0_42px_rgba(0,0,0,0.95)]" />
            <div className="absolute inset-[3.1rem] rounded-full border border-lime-300/15" />

            <div className="relative text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300">
                {started ? "Get Ready" : "Focus Countdown"}
              </div>
              <div className="mt-2 text-6xl font-black tabular-nums tracking-[-0.06em] text-white sm:text-7xl">
                {started
                  ? formatCountdown(countdown)
                  : "00:15"}
              </div>
              <div className="mt-3 flex justify-center gap-1.5">
                {Array.from({ length: 8 }).map(
                  (_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 w-1.5 rounded-full ${
                        started &&
                        index <
                          Math.ceil(
                            ((15 - countdown) / 15) * 8
                          )
                          ? "bg-lime-300"
                          : "bg-white/15"
                      }`}
                    />
                  )
                )}
              </div>
            </div>
          </div>

          <section className="mx-auto mt-6 w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-300">
              SYNC Coach
            </div>
            <div className="mt-2 text-lg font-black text-white">
              {currentExercise?.name ||
                currentExercise?.exercise_name ||
                "First exercise ready"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {totals.exercises} exercises, {totals.sets} sets,
              about {totals.duration} minutes. Get your
              equipment ready and lock in.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <span className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                  Current BPM
                </span>
                <input
                  type="number"
                  min="0"
                  max="240"
                  inputMode="numeric"
                  value={bpm || ""}
                  onChange={(event) =>
                    updateBpm(event.target.value)
                  }
                  placeholder="Optional"
                  className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-black text-white outline-none"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                  Estimated Time
                </div>
                <div className="mt-1 text-2xl font-black text-white">
                  {totals.duration} min
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="sticky bottom-0 rounded-[1.5rem] border border-white/10 bg-black/85 p-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setStarted(true)}
            disabled={started}
            className="h-16 w-full rounded-2xl border border-lime-300/60 bg-lime-300 text-base font-black uppercase tracking-[0.12em] text-black shadow-[0_0_34px_rgba(112,255,61,0.28)] disabled:cursor-wait disabled:opacity-85"
          >
            {started
              ? countdown > 0
                ? `Starting in ${countdown}`
                : "Enter Workout"
              : "Start 15 Second Countdown"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// src/components/customer-health/WorkoutFocusLaunchDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

import {
  playWorkoutCoachMessage,
  stopWorkoutCoachAudio,
  unlockWorkoutCoachAudio,
} from "./healthWorkoutAudioController";

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

function workoutName(workout) {
  return (
    workout?.workout_name ||
    workout?.title ||
    workout?.name ||
    "today's workout"
  );
}

function firstExerciseName(workout) {
  const first = Array.isArray(workout?.exercises)
    ? workout.exercises[0]
    : null;

  return (
    first?.name ||
    first?.exercise_name ||
    "your first exercise"
  );
}

function buildBriefing({
  workout,
  totals,
  location,
  energy,
  adjustment,
}) {
  const focus =
    workout?.adaptive_focus ||
    workout?.requested_focus ||
    workout?.focus ||
    "";

  return [
    `Here is the update for ${workoutName(workout)}.`,
    `${totals.exercises} exercises, ${totals.sets} total sets, and about ${totals.duration} minutes.`,
    focus ? `Today's focus is ${focus}.` : "",
    `You are training at ${location}.`,
    `We will begin with ${firstExerciseName(workout)}.`,
    energy
      ? `You reported your energy as ${energy.toLowerCase()}.`
      : "",
    adjustment && adjustment !== "No changes"
      ? `I noted this change: ${adjustment}.`
      : "",
    "Use the countdown to get your equipment ready. Stay controlled and adjust any load that does not feel right.",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function WorkoutFocusLaunchDrawer({
  open,
  workout,
  onCancel,
  onBegin,
}) {
  const [countdown, setCountdown] = useState(15);
  const [started, setStarted] = useState(false);
  const [energy, setEnergy] = useState("");
  const [adjustment, setAdjustment] = useState("No changes");
  const [briefingStatus, setBriefingStatus] = useState("");

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

  const location =
    workout?.workout_location_name ||
    workout?.requested_location ||
    "your selected location";

  const briefing = useMemo(
    () =>
      buildBriefing({
        workout,
        totals,
        location,
        energy,
        adjustment,
      }),
    [workout, totals, location, energy, adjustment]
  );

  useEffect(() => {
    if (!open) {
      setCountdown(15);
      setStarted(false);
      setBriefingStatus("");
      stopWorkoutCoachAudio();
      return undefined;
    }

    setCountdown(15);
    setStarted(false);
    setBriefingStatus("");

    return () => stopWorkoutCoachAudio();
  }, [open, workout?.id]);

  useEffect(() => {
    if (!open || !started) return undefined;

    if (countdown <= 0) {
      const timer = window.setTimeout(() => {
        stopWorkoutCoachAudio();
        onBegin?.({
          launch_briefing_completed_at:
            new Date().toISOString(),
        });
      }, 450);

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

  function playBriefing({ replay = false } = {}) {
    unlockWorkoutCoachAudio();
    setBriefingStatus("playing");

    playWorkoutCoachMessage({
      id: `${workout?.id || workoutName(workout)}:preworkout-brief`,
      text: briefing,
      priority: "high",
      playOnce: !replay,
      replace: true,
      audioMode: "essential",
      voicePreference: "female",
      rate: 0.98,
      pitch: 1,
      volume: 1,
      cancelFirst: true,
      eventType: "preworkout_briefing",
      browserFallback: false,
    });

    window.setTimeout(
      () => setBriefingStatus("played"),
      600
    );
  }

  function startCountdown() {
    if (started) return;

    setStarted(true);
    playBriefing({ replay: false });
  }

  if (!open) return null;

  const progress = started
    ? Math.max(
        0,
        Math.min(100, (countdown / 15) * 100)
      )
    : 100;

  return (
    <div className="fixed inset-0 z-[155] overflow-y-auto bg-[#020403] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(87,255,61,0.18),transparent_30%),linear-gradient(180deg,#060906_0%,#010201_72%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-6 pt-5 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-black uppercase tracking-tight text-white">
              {workoutName(workout)}
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

        <main className="flex flex-1 flex-col justify-center py-5">
          <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
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
                {started
                  ? "Coach Briefing Playing"
                  : "Pre-Workout Briefing"}
              </div>

              <div className="mt-2 text-6xl font-black tabular-nums tracking-[-0.06em] text-white sm:text-7xl">
                {started
                  ? formatCountdown(countdown)
                  : "00:15"}
              </div>

              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {briefingStatus === "playing"
                  ? "Audio starting"
                  : briefingStatus === "played"
                  ? "Audio active"
                  : "Tap start to hear today's plan"}
              </div>
            </div>
          </div>

          <section className="mx-auto mt-5 w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-300">
                  SYNC Coach Update
                </div>

                <div className="mt-2 text-lg font-black text-white">
                  {firstExerciseName(workout)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => playBriefing({ replay: true })}
                className="shrink-0 rounded-xl border border-lime-300/30 bg-lime-300/[0.08] px-3 py-2 text-[10px] font-black text-lime-100"
              >
                Replay Audio
              </button>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {totals.exercises} exercises, {totals.sets} sets,
              about {totals.duration} minutes. Confirm anything
              that changed before the timer starts.
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

              <label className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <span className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                  Energy
                </span>

                <select
                  value={energy}
                  onChange={(event) =>
                    setEnergy(event.target.value)
                  }
                  className="mt-1 w-full border-0 bg-transparent p-0 text-base font-black text-white outline-none"
                >
                  <option value="">Not logged</option>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </label>
            </div>

            <div className="mt-3">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                Any change before we begin?
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  "No changes",
                  "Short on time",
                  "Equipment changed",
                  "Pain or soreness",
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAdjustment(option)}
                    className={`min-h-11 rounded-xl border px-2 text-[10px] font-black ${
                      adjustment === option
                        ? "border-lime-300/45 bg-lime-300/[0.10] text-lime-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="sticky bottom-0 rounded-[1.5rem] border border-white/10 bg-black/90 p-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={startCountdown}
            disabled={started}
            className="h-16 w-full rounded-2xl border border-lime-300/60 bg-lime-300 text-base font-black uppercase tracking-[0.12em] text-black shadow-[0_0_34px_rgba(112,255,61,0.28)] disabled:cursor-wait disabled:opacity-85"
          >
            {started
              ? countdown > 0
                ? `Starting in ${countdown}`
                : "Enter Workout"
              : "Play Briefing and Start"}
          </button>
        </footer>
      </div>
    </div>
  );
}

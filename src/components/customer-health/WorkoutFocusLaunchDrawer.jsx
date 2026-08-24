// src/components/customer-health/WorkoutFocusLaunchDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

import {
  playWorkoutCoachMessage,
  stopWorkoutCoachAudio,
  unlockWorkoutCoachAudio,
} from "./healthWorkoutAudioController";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function workoutTotals(workout) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const sets = exercises.reduce(
    (total, exercise) =>
      total + Math.max(1, safeNumber(exercise?.planned_sets || exercise?.sets, 1)),
    0
  );

  return {
    exercises: exercises.length,
    sets,
    duration:
      safeNumber(
        workout?.duration_minutes || workout?.requested_duration_minutes,
        45
      ) || 45,
  };
}

function workoutName(workout) {
  return workout?.workout_name || workout?.title || workout?.name || "Today's workout";
}

function firstExerciseName(workout) {
  const first = Array.isArray(workout?.exercises) ? workout.exercises[0] : null;
  return first?.name || first?.exercise_name || "First exercise";
}

function buildBriefing({ workout, totals, location, energy, adjustment }) {
  const focus = workout?.adaptive_focus || workout?.requested_focus || workout?.focus || "";
  return [
    `Here is the update for ${workoutName(workout)}.`,
    `${totals.exercises} exercises, ${totals.sets} total sets, and about ${totals.duration} minutes.`,
    focus ? `Today's focus is ${focus}.` : "",
    `You are training at ${location}.`,
    `We will begin with ${firstExerciseName(workout)}.`,
    energy ? `You reported your energy as ${energy.toLowerCase()}.` : "",
    adjustment && adjustment !== "No changes"
      ? `I noted this change: ${adjustment}.`
      : "",
    "Enter workout when ready.",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function WorkoutFocusLaunchDrawer({ open, workout, onCancel, onBegin }) {
  const [started, setStarted] = useState(false);
  const [energy, setEnergy] = useState("");
  const [adjustment, setAdjustment] = useState("No changes");
  const [briefingStatus, setBriefingStatus] = useState("");
  const [bpm, setBpm] = useState(() => {
    if (typeof window === "undefined") return 0;
    return safeNumber(window.localStorage.getItem("syncworks_health_current_bpm"), 0);
  });

  const totals = useMemo(() => workoutTotals(workout), [workout]);
  const location =
    workout?.workout_location_name || workout?.requested_location || "Selected location";

  const briefing = useMemo(
    () => buildBriefing({ workout, totals, location, energy, adjustment }),
    [workout, totals, location, energy, adjustment]
  );

  useEffect(() => {
    if (!open) {
      setStarted(false);
      setBriefingStatus("");
      stopWorkoutCoachAudio();
      return undefined;
    }
    setStarted(false);
    setBriefingStatus("");
    return () => stopWorkoutCoachAudio();
  }, [open, workout?.id]);

  useEffect(() => {
    if (!open || !started) return undefined;
    const timer = window.setTimeout(() => {
      stopWorkoutCoachAudio();
      onBegin?.({
        launch_briefing_completed_at: new Date().toISOString(),
        launch_mode: "immediate_mission",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, started, onBegin]);

  function updateBpm(value) {
    const next = Math.max(0, Math.min(240, safeNumber(value, 0)));
    setBpm(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("syncworks_health_current_bpm", String(next || ""));
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
    window.setTimeout(() => setBriefingStatus("played"), 600);
  }

  function startWorkout() {
    if (started) return;
    unlockWorkoutCoachAudio();
    playBriefing();
    setStarted(true);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[260] overflow-y-auto bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(34,211,238,0.13),transparent_27%),radial-gradient(circle_at_85%_35%,rgba(37,99,235,0.11),transparent_25%),linear-gradient(180deg,#020617_0%,#02040b_100%)]" />

      <div className="relative mx-auto min-h-[100dvh] w-full max-w-xl px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[max(.75rem,env(safe-area-inset-top))] sm:px-5">
        <header className="sticky top-0 z-20 -mx-3 flex items-center justify-between gap-3 border-b border-cyan-300/10 bg-[#020617]/95 px-3 py-2 backdrop-blur-xl sm:-mx-5 sm:px-5">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">Ready to train</div>
            <div className="truncate text-lg font-black text-white">{workoutName(workout)}</div>
            <div className="truncate text-[10px] font-bold text-slate-500">{location}</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={started}
            className="h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-white disabled:opacity-30"
          >
            Exit
          </button>
        </header>

        <main className="pt-3">
          <section className="rounded-2xl border border-cyan-300/20 bg-[#07101e] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">Today's workout</div>
                <div className="mt-1 text-xl font-black text-white">{firstExerciseName(workout)}</div>
              </div>
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-right">
                <div className="text-lg font-black text-cyan-200">READY</div>
                <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {briefingStatus === "playing" ? "Audio starting" : briefingStatus === "played" ? "Audio ready" : "SYNC ready"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/8 bg-black/20 p-2 text-center">
                <div className="text-base font-black text-white">{totals.exercises}</div>
                <div className="text-[9px] text-slate-500">Exercises</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-2 text-center">
                <div className="text-base font-black text-white">{totals.sets}</div>
                <div className="text-[9px] text-slate-500">Sets</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-2 text-center">
                <div className="text-base font-black text-white">{totals.duration}</div>
                <div className="text-[9px] text-slate-500">Minutes</div>
              </div>
            </div>
          </section>

          <section className="mt-3 rounded-2xl border border-white/10 bg-[#07101e] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">SYNC briefing</div>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">Confirm anything that changed. Everything else stays out of the way.</p>
              </div>
              <button
                type="button"
                onClick={() => playBriefing({ replay: true })}
                className="h-9 shrink-0 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-[10px] font-black text-cyan-100"
              >
                Hear Briefing
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">Current BPM</span>
                <input
                  type="number"
                  min="0"
                  max="240"
                  inputMode="numeric"
                  value={bpm || ""}
                  onChange={(event) => updateBpm(event.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full border-0 bg-transparent p-0 text-xl font-black text-white outline-none"
                />
              </label>

              <label className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">Energy</span>
                <select
                  value={energy}
                  onChange={(event) => setEnergy(event.target.value)}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-black text-white outline-none"
                >
                  <option value="">Not logged</option>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </label>
            </div>

            <div className="mt-3">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">Any change before we begin?</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {["No changes", "Short on time", "Equipment changed", "Pain or soreness"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAdjustment(option)}
                    className={`min-h-9 rounded-xl border px-2 text-[10px] font-black ${
                      adjustment === option
                        ? "border-cyan-300/45 bg-cyan-300/[0.11] text-cyan-100"
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

        <footer className="fixed inset-x-0 bottom-0 z-[280] border-t border-cyan-300/15 bg-[#020617]/97 px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <div className="mx-auto grid w-full max-w-xl grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={() => playBriefing({ replay: true })}
              disabled={started}
              className="h-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-[10px] font-black text-cyan-100 disabled:opacity-40"
            >
              Audio
            </button>
            <button
              type="button"
              onClick={startWorkout}
              disabled={started}
              className="health-workout-start-button h-12 rounded-2xl border border-cyan-300/60 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 px-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_0_26px_rgba(34,211,238,.2)] disabled:cursor-wait disabled:opacity-80"
            >
              {started ? "Entering Workout..." : "Start Workout"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

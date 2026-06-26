// src/components/customer-health/PreWorkoutCheckInDrawer.jsx
import React, { useState } from "react";

const SORE_AREAS = [
  "Chest",
  "Shoulders",
  "Back",
  "Arms",
  "Core",
  "Hips",
  "Legs",
];

function toggleItem(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function PreWorkoutCheckInDrawer({
  open,
  onClose,
  workout,
  snapshot,
  onConfirm,
}) {
  const [readiness, setReadiness] = useState(
    snapshot?.readiness || "Good"
  );
  const [energy, setEnergy] = useState("Good");
  const [soreAreas, setSoreAreas] = useState([]);
  const [pain, setPain] = useState("None");
  const [adjustWorkout, setAdjustWorkout] =
    useState(true);

  if (!open || !workout) return null;

  const title =
    workout.workout_name ||
    workout.title ||
    workout.name ||
    "Today's Workout";

  const exerciseCount = Array.isArray(workout.exercises)
    ? workout.exercises.length
    : 0;

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/85 p-3 backdrop-blur-md sm:items-center">
      <button
        type="button"
        aria-label="Close pre-workout check-in"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[171] flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[#07111f] shadow-[0_28px_90px_rgba(0,0,0,0.72)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">
            Pre-Workout Check-In
          </div>
          <h2 className="mt-1 text-2xl font-black text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {exerciseCount} exercise
            {exerciseCount === 1 ? "" : "s"}. Check your
            body before the coach starts.
          </p>

          <div className="mt-5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Readiness
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["Low", "Good", "Ready"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setReadiness(item)}
                  className={`h-11 rounded-2xl border text-xs font-black ${
                    readiness === item
                      ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Energy
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["Low", "Good", "High"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEnergy(item)}
                  className={`h-11 rounded-2xl border text-xs font-black ${
                    energy === item
                      ? "border-lime-300/30 bg-lime-300/15 text-lime-100"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Sore areas
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SORE_AREAS.map((item) => {
                const active = soreAreas.includes(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setSoreAreas((previous) =>
                        toggleItem(previous, item)
                      )
                    }
                    className={`h-11 rounded-2xl border text-xs font-black ${
                      active
                        ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
                        : "border-white/10 bg-white/[0.035] text-slate-300"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Pain
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {["None", "Mild", "Moderate", "Stop"].map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPain(item)}
                    className={`h-11 rounded-2xl border text-[10px] font-black sm:text-xs ${
                      pain === item
                        ? "border-rose-300/30 bg-rose-300/15 text-rose-100"
                        : "border-white/10 bg-white/[0.035] text-slate-300"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.07] p-3">
            <input
              type="checkbox"
              checked={adjustWorkout}
              onChange={(event) =>
                setAdjustWorkout(event.target.checked)
              }
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-black text-white">
                Let the coach adjust today's workout
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                The coach can avoid sore areas and lower
                intensity before the workout begins.
              </span>
            </span>
          </label>

          {pain === "Stop" ? (
            <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm font-bold text-rose-100">
              Do not start this session with stop-level pain.
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-lime-300/15 bg-[#07111f]/98 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white"
            >
              Back
            </button>
            <button
              type="button"
              disabled={pain === "Stop"}
              onClick={() =>
                onConfirm?.({
                  readiness,
                  energy,
                  sore_areas: soreAreas,
                  pain,
                  adjust_workout: adjustWorkout,
                })
              }
              className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {adjustWorkout
                ? "Adjust and Begin"
                : "Begin Workout"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

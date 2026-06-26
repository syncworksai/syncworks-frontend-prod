// src/components/customer-health/PlanTodayWorkoutDrawer.jsx
import React, { useMemo, useState } from "react";

import { buildAdaptiveWorkout } from "./healthAdaptiveWorkoutGenerator";

const LOCATIONS = ["Gym", "Home", "Outside"];
const DURATIONS = [15, 30, 45, 60];
const TARGETS = [
  ["recommended", "Coach Pick"],
  ["hiit", "Quick HIIT"],
  ["core", "Abs / Core"],
  ["push", "Push"],
  ["pull", "Pull"],
  ["legs", "Legs"],
  ["cardio", "Cardio"],
  ["mobility", "Mobility"],
];

function baseMode(target) {
  if (target === "hiit" || target === "cardio") {
    return "cardio";
  }

  if (target === "mobility") {
    return "mobility";
  }

  return target === "recommended"
    ? "recommended"
    : "strength";
}

function exerciseText(exercise) {
  return [
    exercise?.name,
    exercise?.category,
    exercise?.movement_pattern,
    ...(exercise?.primary_muscles || []),
    ...(exercise?.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesTarget(exercise, target) {
  const value = exerciseText(exercise);

  if (target === "push") {
    return /chest|shoulder|tricep|push|press/.test(value);
  }

  if (target === "pull") {
    return /back|lat|bicep|pull|row/.test(value);
  }

  if (target === "legs") {
    return /leg|quad|hamstring|glute|calf|squat|lunge/.test(
      value
    );
  }

  if (target === "core") {
    return /core|ab|plank|rotation|oblique/.test(value);
  }

  if (target === "hiit") {
    return /cardio|hiit|interval|burpee|jump|sprint/.test(
      value
    );
  }

  return true;
}

function locationAllowed(exercise, location) {
  if (location === "Gym") return true;

  const value = [
    exercise?.equipment,
    exercise?.location,
    exercise?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (location === "Home") {
    return !/machine|cable station|smith machine|rack/.test(
      value
    );
  }

  return /bodyweight|band|run|walk|sprint|jump|plank|push-up|lunge|squat/.test(
    value
  );
}

function trimForDuration(exercises, duration) {
  const limits = {
    15: 4,
    30: 6,
    45: 8,
    60: 10,
  };

  return exercises.slice(0, limits[duration] || 6);
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
  const [location, setLocation] = useState(
    snapshot?.training_location ||
      profile?.training_location ||
      "Gym"
  );
  const [duration, setDuration] = useState(30);
  const [target, setTarget] = useState("recommended");
  const [allowSoreOverride, setAllowSoreOverride] =
    useState(false);

  const plan = useMemo(() => {
    const generated = buildAdaptiveWorkout({
      history,
      snapshot: {
        ...snapshot,
        allow_sore_muscle_override:
          allowSoreOverride,
      },
      profile,
      mode: baseMode(target),
    });

    const original = Array.isArray(generated?.exercises)
      ? generated.exercises
      : [];

    const locationFiltered = original.filter((exercise) =>
      locationAllowed(exercise, location)
    );

    const targetFiltered =
      target === "recommended" ||
      target === "cardio" ||
      target === "mobility"
        ? locationFiltered
        : locationFiltered.filter((exercise) =>
            matchesTarget(exercise, target)
          );

    const selected =
      targetFiltered.length >= 3
        ? targetFiltered
        : locationFiltered.length
        ? locationFiltered
        : original;

    return {
      ...generated,
      title:
        target === "recommended"
          ? generated?.title
          : `${
              TARGETS.find(([value]) => value === target)?.[1] ||
              "Workout"
            } - ${duration} min`,
      exercises: trimForDuration(selected, duration),
      requested_location: location,
      requested_duration_minutes: duration,
      requested_focus: target,
    };
  }, [
    history,
    snapshot,
    profile,
    location,
    duration,
    target,
    allowSoreOverride,
  ]);

  if (!open) return null;

  const soreAreas = plan?.avoided_sore_areas || [];

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 p-3 backdrop-blur-md sm:items-center">
      <button
        type="button"
        aria-label="Close plan today"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[151] flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#07111f] shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                Plan With Coach
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                What fits today?
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Pick where you are, how much time you have,
                and what you want to train.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Location
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LOCATIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLocation(item)}
                  className={`h-11 rounded-2xl border text-xs font-black ${
                    location === item
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
              Time available
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DURATIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDuration(item)}
                  className={`h-11 rounded-2xl border text-xs font-black ${
                    duration === item
                      ? "border-lime-300/30 bg-lime-300/15 text-lime-100"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {item}m
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Workout focus
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TARGETS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={`min-h-12 rounded-2xl border px-3 py-2 text-xs font-black ${
                    target === value
                      ? "border-fuchsia-300/30 bg-fuchsia-300/15 text-fuchsia-100"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-lime-300/20 bg-lime-300/[0.07] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-200">
              Coach Recommendation
            </div>
            <div className="mt-1 text-xl font-black text-white">
              {plan?.title || "Adaptive workout"}
            </div>
            <div className="mt-1 text-xs font-bold text-cyan-100">
              {location} | {duration} minutes
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
              {(plan?.exercises || []).map(
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
                        {exercise.planned_sets ||
                          exercise.sets ||
                          "3"}{" "}
                        sets |{" "}
                        {exercise.planned_reps ||
                          exercise.reps ||
                          "8-12"}
                      </div>
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
                  This overrides the coach protection filter.
                </span>
              </span>
            </label>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-cyan-300/15 bg-[#07111f]/98 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPlan?.(plan)}
              className="h-12 rounded-2xl border border-cyan-300/30 bg-cyan-300/15 text-sm font-black text-cyan-100"
            >
              Add for Later
            </button>
            <button
              type="button"
              onClick={() => onStart?.(plan)}
              className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onOpenFullStudio}
              className="col-span-2 h-10 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
            >
              Advanced Builder
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// src/components/customer-health/WorkoutFocusLaunchDrawer.jsx
import React, { useEffect, useMemo, useRef } from "react";

import {
  playWorkoutCoachMessage,
  stopWorkoutCoachAudio,
  unlockWorkoutCoachAudio,
} from "./healthWorkoutAudioController";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function workoutName(workout) {
  return workout?.workout_name || workout?.title || workout?.name || "Today's workout";
}

function firstExerciseName(workout) {
  const first = Array.isArray(workout?.exercises) ? workout.exercises[0] : null;
  return first?.name || first?.exercise_name || "your first exercise";
}

function workoutTotals(workout) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const sets = exercises.reduce(
    (total, exercise) => total + Math.max(1, safeNumber(exercise?.planned_sets || exercise?.sets, 1)),
    0
  );

  return {
    exercises: exercises.length,
    sets,
    duration: safeNumber(workout?.duration_minutes || workout?.requested_duration_minutes, 45) || 45,
  };
}

function buildBriefing(workout) {
  const totals = workoutTotals(workout);
  const location = workout?.workout_location_name || workout?.requested_location || "your selected location";
  const focus = workout?.adaptive_focus || workout?.requested_focus || workout?.focus || "";

  return [
    `${workoutName(workout)} is ready.`,
    `${totals.exercises} exercises, ${totals.sets} sets, about ${totals.duration} minutes.`,
    focus ? `Today's focus is ${focus}.` : "",
    location ? `Training location: ${location}.` : "",
    `Starting with ${firstExerciseName(workout)}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function WorkoutFocusLaunchDrawer({ open, workout, onCancel, onBegin }) {
  const launchedRef = useRef("");
  const totals = useMemo(() => workoutTotals(workout), [workout]);
  const launchKey = `${workout?.id || workout?.workout_id || workoutName(workout)}:${open ? "open" : "closed"}`;

  useEffect(() => {
    if (!open) {
      launchedRef.current = "";
      stopWorkoutCoachAudio();
      return undefined;
    }

    if (!workout || totals.exercises === 0) return undefined;
    if (launchedRef.current === launchKey) return undefined;

    launchedRef.current = launchKey;
    unlockWorkoutCoachAudio();

    playWorkoutCoachMessage({
      id: `${workout?.id || workoutName(workout)}:direct-start-brief`,
      text: buildBriefing(workout),
      priority: "high",
      playOnce: true,
      replace: true,
      audioMode: "essential",
      voicePreference: "female",
      rate: 0.98,
      pitch: 1,
      volume: 1,
      cancelFirst: true,
      eventType: "preworkout_briefing",
      browserFallback: true,
    });

    const timer = window.setTimeout(() => {
      onBegin?.({
        launch_briefing_completed_at: new Date().toISOString(),
        launch_mode: "direct_to_workout",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [open, workout, totals.exercises, launchKey, onBegin]);

  if (!open) return null;

  if (!workout || totals.exercises === 0) {
    return (
      <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#020617] px-6 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-cyan-300/20 bg-[#07101e] p-5 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">SYNC Health</div>
          <div className="mt-2 text-lg font-black">Restoring your workout plan</div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Your workout details are still loading. Nothing has been discarded.</p>
          <button type="button" onClick={onCancel} className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white">Back to Health</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#020617] text-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Opening workout</div>
      </div>
    </div>
  );
}

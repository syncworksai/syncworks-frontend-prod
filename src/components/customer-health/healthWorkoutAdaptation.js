// src/components/customer-health/healthWorkoutAdaptation.js

export const WORKOUT_ADAPTATION_KPI_KEY =
  "sw_health_workout_adaptation_kpis_v1";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanName(exercise = {}) {
  return exercise.substitute_name || exercise.name || "Exercise";
}

function getWorkingSets(exercise = {}) {
  return safeArray(exercise.set_logs).filter(
    (set) => set?.set_type !== "warmup"
  );
}

function classifyMovement(exercise = {}) {
  const text = [
    exercise.movement_pattern,
    exercise.name,
    exercise.substitute_name,
    ...(exercise.primary_muscles || []),
    ...(exercise.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("row") ||
    text.includes("pull") ||
    text.includes("lat") ||
    text.includes("back") ||
    text.includes("biceps")
  ) {
    return "pull";
  }

  if (
    text.includes("press") ||
    text.includes("push") ||
    text.includes("chest") ||
    text.includes("triceps") ||
    text.includes("shoulder")
  ) {
    return "push";
  }

  if (
    text.includes("squat") ||
    text.includes("deadlift") ||
    text.includes("leg") ||
    text.includes("quad") ||
    text.includes("hamstring") ||
    text.includes("glute") ||
    text.includes("calf")
  ) {
    return "legs";
  }

  if (
    text.includes("core") ||
    text.includes("abs") ||
    text.includes("oblique")
  ) {
    return "core";
  }

  return "other";
}

export function trackWorkoutAdaptationKpi(event, payload = {}) {
  if (typeof window === "undefined" || !event) return;

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(WORKOUT_ADAPTATION_KPI_KEY) || "[]"
    );

    const next = [
      ...(Array.isArray(saved) ? saved : []),
      {
        id: `adapt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        event,
        payload,
        created_at: new Date().toISOString(),
      },
    ].slice(-500);

    window.localStorage.setItem(
      WORKOUT_ADAPTATION_KPI_KEY,
      JSON.stringify(next)
    );
  } catch {
    // KPI tracking must never block a workout.
  }
}

export function buildAdaptiveExercise(
  catalogExercise,
  mode = "add"
) {
  const now = Date.now();

  return {
    id: `adaptive-${now}-${Math.random().toString(16).slice(2)}`,
    name: catalogExercise?.name || "Custom Exercise",
    original_name: catalogExercise?.name || "Custom Exercise",
    planned_sets: catalogExercise?.sets || "3",
    planned_reps: catalogExercise?.reps || "8-12",
    planned_weight: "",
    current_target_weight: "",
    current_target_reps: catalogExercise?.reps || "8-12",
    rest_seconds: Number(
      String(catalogExercise?.rest || "60").match(/\d+/)?.[0] || 60
    ),
    set_logs: [],
    skipped: false,
    substituted: false,
    substitute_name: "",
    pain_score: "0",
    difficulty_score: "",
    notes: "",
    source: "adaptive_library",
    adaptation_mode: mode,
    added_during_workout: true,
    catalog_id: catalogExercise?.id || "",
    equipment: catalogExercise?.equipment || "",
    movement_pattern: catalogExercise?.movement_pattern || "",
    primary_muscles: catalogExercise?.primary_muscles || [],
    secondary_muscles: catalogExercise?.secondary_muscles || [],
    added_at: new Date(now).toISOString(),
  };
}

export function analyzeWorkoutBalance(session = {}) {
  const totals = {
    push: 0,
    pull: 0,
    legs: 0,
    core: 0,
    other: 0,
    working_sets: 0,
    extra_exercises: 0,
  };

  for (const exercise of safeArray(session.exercises)) {
    const sets = getWorkingSets(exercise).length;
    const planned = Number(exercise.planned_sets || 0);
    const countedSets = sets || Math.max(0, planned);

    const group = classifyMovement(exercise);
    totals[group] += countedSets;
    totals.working_sets += sets;

    if (exercise.added_during_workout) {
      totals.extra_exercises += 1;
    }
  }

  const warnings = [];

  if (totals.push >= totals.pull + 8) {
    warnings.push(
      "Push volume is running well ahead of pull volume. Consider recovery or add balanced back work in a future session."
    );
  }

  if (totals.pull >= totals.push + 8) {
    warnings.push(
      "Pull volume is running well ahead of push volume. Protect elbow and upper-back recovery before adding more."
    );
  }

  if (totals.push >= 16) {
    warnings.push(
      "You already have high push volume today. Add only focused accessory work unless recovery is excellent."
    );
  }

  if (totals.pull >= 16) {
    warnings.push(
      "You already have high pull volume today. Additional rows or curls may reduce recovery quality."
    );
  }

  if (totals.legs >= 18) {
    warnings.push(
      "Lower-body volume is high. Keep any extra work controlled and avoid adding painful ranges."
    );
  }

  if (totals.extra_exercises >= 3) {
    warnings.push(
      "This workout has already been extended several times. The coach will track whether the extra volume improves progress or hurts recovery."
    );
  }

  return {
    totals,
    warnings,
    primary_warning: warnings[0] || "",
  };
}

export function buildPreWorkoutBriefing(session = {}) {
  const exercises = safeArray(session.exercises);
  const firstNames = exercises.slice(0, 4).map(cleanName);

  const exerciseCopy = firstNames.length
    ? `Today's plan starts with ${firstNames.join(", ")}.`
    : "Today's workout is ready.";

  return [
    `Pre-workout briefing for ${session.workout_name || "today's workout"}.`,
    exerciseCopy,
    `You have ${exercises.length} planned exercises.`,
    "Use swap if equipment is unavailable, add a variation if you want more work, and log every set so I can adapt future sessions.",
  ].join(" ");
}

export function buildPostWorkoutWrapUp(
  session = {},
  summary = {}
) {
  const balance = analyzeWorkoutBalance(session);

  const completedSets =
    summary.completed_sets ??
    session.completed_sets ??
    balance.totals.working_sets;

  const totalMinutes = Math.max(
    1,
    Math.round(
      Number(
        summary.total_seconds ??
          session.total_seconds ??
          0
      ) / 60
    )
  );

  const focus = [
    balance.totals.push
      ? `${balance.totals.push} push sets`
      : "",
    balance.totals.pull
      ? `${balance.totals.pull} pull sets`
      : "",
    balance.totals.legs
      ? `${balance.totals.legs} leg sets`
      : "",
    balance.totals.core
      ? `${balance.totals.core} core sets`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  const recovery =
    balance.primary_warning ||
    "Focus on hydration, protein, sleep, and recovering the muscles you trained before your next hard session.";

  return [
    "Congratulations on completing today's workout.",
    `You logged ${completedSets} sets in about ${totalMinutes} minutes.`,
    focus ? `Your training balance was ${focus}.` : "",
    recovery,
    "I will use today's performance, pain, form, swaps, and added exercises to adjust future recommendations.",
  ]
    .filter(Boolean)
    .join(" ");
}

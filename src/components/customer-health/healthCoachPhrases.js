// src/components/customer-health/healthCoachPhrases.js

const ELEVENLABS_EVENTS = new Set([
  "workout_welcome",
  "exercise_intro",
  "exercise_swap",
  "workout_completed",
  "pain_response",
]);

export function getWorkoutCoachDelivery(
  eventType,
  {
    exerciseFinished = false,
    important = false,
  } = {}
) {
  if (
    ELEVENLABS_EVENTS.has(eventType) ||
    important ||
    (eventType === "set_completed" &&
      exerciseFinished)
  ) {
    return {
      provider: "elevenlabs",
      eventType,
    };
  }

  return {
    provider: "browser",
    eventType,
  };
}

export function buildWorkoutWelcomePhrase(
  session = {}
) {
  const workoutName =
    session.workout_name || "today's workout";
  const count = Array.isArray(session.exercises)
    ? session.exercises.length
    : 0;

  return [
    `Welcome to ${workoutName}.`,
    count
      ? `You have ${count} exercise${
          count === 1 ? "" : "s"
        } planned.`
      : "",
    "Stay controlled, train with purpose, and tell me immediately if you feel sharp or joint pain.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildNaturalExerciseIntroPhrase({
  exercise,
  knowledge = {},
} = {}) {
  const name =
    exercise?.substituted &&
    exercise?.substitute_name
      ? exercise.substitute_name
      : exercise?.name ||
        knowledge?.name ||
        "this exercise";

  const targetWeight =
    exercise?.current_target_weight ||
    exercise?.planned_weight ||
    "bodyweight";

  const targetReps =
    exercise?.current_target_reps ||
    exercise?.planned_reps ||
    "";

  const target = targetReps
    ? `Your target is ${targetWeight} for ${targetReps}.`
    : "";

  const cue =
    knowledge?.short_cue ||
    knowledge?.feel_cue ||
    "";

  const warning =
    knowledge?.correction_cue ||
    knowledge?.coach_warning ||
    "";

  return [
    `Next up, ${name}.`,
    target,
    cue,
    warning,
    "Own the movement and keep every rep clean.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildSetStartPhrase({
  setNumber = 1,
  exercise,
} = {}) {
  const name =
    exercise?.substituted &&
    exercise?.substitute_name
      ? exercise.substitute_name
      : exercise?.name || "this exercise";

  return `Set ${setNumber} of ${name}. Brace, get tight, and go.`;
}

export function buildRestStartPhrase({
  restSeconds = 0,
} = {}) {
  const restLine = restSeconds
    ? `You have ${restSeconds} seconds.`
    : "Your rest starts now.";

  return `Set complete. ${restLine} Log your weight, reps, effort, form, and any movement pain while you recover.`;
}

export function buildRestCuePhrase({
  remaining = 0,
  nextExerciseName = "",
  exerciseFinished = false,
} = {}) {
  if (remaining === 30) {
    return "Thirty seconds left. Breathe, reset your grip, and get ready.";
  }

  if (remaining === 10) {
    return "Ten seconds. Get into position and lock in.";
  }

  if (remaining === 0 && nextExerciseName) {
    return `Rest complete. Move to ${nextExerciseName}, set your equipment, and tap start when ready.`;
  }

  if (remaining === 0 && exerciseFinished) {
    return "Rest complete. That exercise is finished. Move to your next station.";
  }

  if (remaining === 0) {
    return "Rest complete. Reset your position and start the next set with control.";
  }

  return "";
}

export function buildWarmupCompletePhrase() {
  return "Warmup complete. Your body is ready. Set up the first exercise and start strong.";
}

export function buildExerciseSwapPhrase({
  previousName = "the previous exercise",
  nextName = "the replacement",
} = {}) {
  return `${previousName} is replaced with ${nextName}. Keep moving with clean form. I will track the substitution and adjust future coaching.`;
}

export function buildExerciseAddedPhrase({
  name,
  label = "extra exercise",
} = {}) {
  return `${name || "The exercise"} is added as a ${label}. I will track the added volume and use it in future planning.`;
}

export function buildWorkoutCompletionPhrase({
  wrapUp = "",
  recommendation = "",
} = {}) {
  return [
    wrapUp,
    recommendation,
    "Workout complete. Recover with purpose and come back ready to improve.",
  ]
    .filter(Boolean)
    .join(" ");
}
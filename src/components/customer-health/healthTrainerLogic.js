// src/components/customer-health/healthTrainerLogic.js

function safeNumber(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function parseRepTarget(value = "") {
  const raw = String(value || "");
  const nums = raw.match(/\d+/g)?.map(Number) || [];

  if (!nums.length) {
    return {
      min: 8,
      max: 12,
      label: raw || "8-12",
    };
  }

  if (nums.length === 1) {
    return {
      min: nums[0],
      max: nums[0],
      label: raw,
    };
  }

  return {
    min: nums[0],
    max: nums[1],
    label: raw,
  };
}

function getLastLoggedSet(exercise = {}) {
  const logs = Array.isArray(exercise.set_logs) ? exercise.set_logs : [];
  return logs[logs.length - 1] || null;
}

function getExerciseCompletionCount(exercise = {}) {
  return Array.isArray(exercise.set_logs) ? exercise.set_logs.length : 0;
}

function getPlannedSets(exercise = {}) {
  return safeNumber(exercise.planned_sets || exercise.sets || 3, 3);
}

export function buildTrainerNudge({
  session,
  exercise,
  audibleEnabled = false,
}) {
  if (!session || !exercise) {
    return {
      tone: "cyan",
      priority: "normal",
      title: "Trainer Ready",
      message: "Start your workout and I’ll guide the next set.",
      speak: false,
    };
  }

  const pain = safeNumber(exercise.pain_score ?? session.pain_score, 0);
  const difficulty = String(exercise.difficulty_score || "").toLowerCase();
  const lastSet = getLastLoggedSet(exercise);
  const loggedSets = getExerciseCompletionCount(exercise);
  const plannedSets = getPlannedSets(exercise);
  const target = parseRepTarget(exercise.planned_reps || exercise.reps || "8-12");
  const lastReps = safeNumber(lastSet?.reps, 0);
  const restSeconds = safeNumber(session.rest_seconds, 0);
  const idleSeconds = safeNumber(session.idle_seconds, 0);
  const isResting = !!session.rest_active;
  const isPaused = !!session.paused;

  if (pain >= 4) {
    return {
      tone: "rose",
      priority: "high",
      title: "Pain Warning",
      message:
        "Pain is high. Reduce the weight, shorten the range, or swap this exercise before pushing harder.",
      speak: audibleEnabled,
    };
  }

  if (exercise.skipped) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Exercise Skipped",
      message:
        "Good call if something felt off. Pick a swap or move on clean instead of forcing bad reps.",
      speak: false,
    };
  }

  if (isPaused) {
    return {
      tone: "slate",
      priority: "normal",
      title: "Paused",
      message:
        "Workout is paused. When you are ready, resume and log the next set.",
      speak: false,
    };
  }

  if (isResting && restSeconds >= 180) {
    return {
      tone: "rose",
      priority: "high",
      title: "Rest Is Getting Long",
      message:
        "You are over three minutes of rest. Start the next set, reduce the weight, or mark the exercise skipped.",
      speak: audibleEnabled,
    };
  }

  if (isResting && restSeconds >= 90) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Rest Check",
      message:
        "Rest is long enough for most sets. Breathe, brace, and get ready to go again.",
      speak: audibleEnabled,
    };
  }

  if (!lastSet && safeNumber(session.total_seconds, 0) >= 120) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Start Logging",
      message:
        "You have been in the workout for a bit. Log the first set or mark this exercise skipped.",
      speak: audibleEnabled,
    };
  }

  if (idleSeconds >= 240) {
    return {
      tone: "rose",
      priority: "high",
      title: "Idle Too Long",
      message:
        "You are sitting too long. Get moving, log the next set, or close the workout if you are done.",
      speak: audibleEnabled,
    };
  }

  if (lastSet && lastReps > target.max && difficulty.includes("easy")) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Progress It",
      message: `You beat the ${target.label} target and marked it easy. Add weight next set or slow the tempo.`,
      speak: audibleEnabled,
    };
  }

  if (lastSet && lastReps >= target.max && !difficulty.includes("hard")) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Strong Set",
      message:
        "You hit the top of the rep range. If form was clean, add a small amount of weight next set.",
      speak: audibleEnabled,
    };
  }

  if (lastSet && lastReps < target.min && difficulty.includes("hard")) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Adjust Load",
      message:
        "Reps were under target and the set felt hard. Keep the same weight or reduce slightly.",
      speak: audibleEnabled,
    };
  }

  if (loggedSets >= plannedSets) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Exercise Complete",
      message:
        "Planned sets are complete. Move to the next exercise or add one bonus set only if form is still clean.",
      speak: false,
    };
  }

  if (!lastSet) {
    return {
      tone: "cyan",
      priority: "normal",
      title: "First Set",
      message: `Target ${target.label} clean reps. Leave 1-2 reps in the tank unless the plan says failure.`,
      speak: false,
    };
  }

  return {
    tone: "cyan",
    priority: "normal",
    title: "Next Set",
    message:
      "Match or beat the last clean set. Keep form tight, control the negative, and log honestly.",
    speak: false,
  };
}

export function buildNextSetSuggestion(exercise = {}) {
  const lastSet = getLastLoggedSet(exercise);
  const target = parseRepTarget(exercise.planned_reps || exercise.reps || "8-12");

  if (!lastSet) {
    return {
      reps: target.max || target.min || "",
      weight: exercise.planned_weight || "",
    };
  }

  return {
    reps: lastSet.reps || target.max || "",
    weight: lastSet.weight || exercise.planned_weight || "",
  };
}

export function explainFailure() {
  return {
    title: "What does push to failure mean?",
    body:
      "Push to failure means you keep going until you cannot complete another clean rep with safe form. Technical failure is when form breaks. True failure is when the rep will not move. Most users should stop 1-2 reps before true failure unless the plan specifically says to go to failure.",
  };
}
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

function getEaseBand(easeScore) {
  const score = safeNumber(easeScore, 0);

  if (!score) return "unknown";
  if (score <= 3) return "too_easy";
  if (score <= 6) return "good";
  if (score <= 8) return "hard";
  return "too_hard";
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
  const lastEase = safeNumber(lastSet?.ease_score, 0);
  const easeBand = getEaseBand(lastEase);
  const restSeconds = safeNumber(session.rest_seconds, 0);
  const idleSeconds = safeNumber(session.idle_seconds, 0);
  const currentSetSeconds = safeNumber(session.current_set_seconds, 0);
  const isResting = !!session.rest_active;
  const isPaused = !!session.paused;
  const isSetActive = !!session.set_active;

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

  if (isSetActive && currentSetSeconds >= 90) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Long Set",
      message:
        "This set is running long. Finish clean reps, stop the set, and log what actually happened.",
      speak: audibleEnabled,
    };
  }

  if (isSetActive) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Set In Progress",
      message:
        "Stay tight. Control the rep, finish the set, then log reps, weight, ease, and pain honestly.",
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
        "You have been in the workout for a bit. Tap Start Set and begin tracking real active time.",
      speak: audibleEnabled,
    };
  }

  if (idleSeconds >= 240) {
    return {
      tone: "rose",
      priority: "high",
      title: "Idle Too Long",
      message:
        "You are sitting too long. Start the next set, log the next movement, or close the workout if you are done.",
      speak: audibleEnabled,
    };
  }

  if (lastSet && easeBand === "too_easy" && lastReps >= target.min) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Push Harder",
      message:
        "That set was too easy. Increase weight, add reps, slow the tempo, or shorten rest next set.",
      speak: audibleEnabled,
    };
  }

  if (lastSet && easeBand === "good" && lastReps >= target.min) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Good Working Set",
      message:
        "That was a good set. Match it next round or add a small push if form still feels clean.",
      speak: false,
    };
  }

  if (lastSet && easeBand === "hard") {
    return {
      tone: "amber",
      priority: "normal",
      title: "Hold The Weight",
      message:
        "That set was hard. Keep the same weight and chase clean reps. Do not force sloppy progress.",
      speak: false,
    };
  }

  if (lastSet && easeBand === "too_hard") {
    return {
      tone: "rose",
      priority: "high",
      title: "Too Heavy",
      message:
        "That set was near max effort. Reduce weight or reps so the next set stays safe and clean.",
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
      message: `Target ${target.label} clean reps. Tap Start Set so active time tracks only the work.`,
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
      ease_score: "",
      pain_score: exercise.pain_score || "0",
    };
  }

  const easeBand = getEaseBand(lastSet.ease_score);
  const lastWeight = lastSet.weight || exercise.planned_weight || "";
  const lastReps = safeNumber(lastSet.reps, target.max || 10);

  if (easeBand === "too_easy") {
    return {
      reps: String(Math.max(lastReps, target.max || lastReps)),
      weight: lastWeight,
      ease_score: "",
      pain_score: exercise.pain_score || lastSet.pain_score || "0",
      note: "Too easy last set. Add weight if possible or beat reps.",
    };
  }

  if (easeBand === "too_hard") {
    return {
      reps: String(Math.max(target.min || 6, lastReps - 2)),
      weight: lastWeight,
      ease_score: "",
      pain_score: exercise.pain_score || lastSet.pain_score || "0",
      note: "Too hard last set. Reduce reps or weight.",
    };
  }

  return {
    reps: lastSet.reps || target.max || "",
    weight: lastWeight,
    ease_score: "",
    pain_score: exercise.pain_score || lastSet.pain_score || "0",
    note: "Match the last clean set.",
  };
}

export function explainFailure() {
  return {
    title: "What does push to failure mean?",
    body:
      "Push to failure means you keep going until you cannot complete another clean rep with safe form. Technical failure is when form breaks. True failure is when the rep will not move. Most users should stop 1-2 reps before true failure unless the plan specifically says to go to failure.",
  };
}
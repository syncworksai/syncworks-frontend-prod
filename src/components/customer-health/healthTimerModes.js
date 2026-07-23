// src/components/customer-health/healthTimerModes.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textFor(exercise = {}) {
  return [
    exercise.name,
    exercise.tracking_type,
    exercise.training_tag,
    exercise.workout_stage,
    exercise.target,
    exercise.focus,
    exercise.notes,
    exercise.planned_reps,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text, values) {
  return values.some((value) => text.includes(value));
}

export const TIMER_MODE_LABELS = {
  strength: "Strength",
  timed_hold: "Timed Hold",
  interval: "HIIT Interval",
  tabata: "Tabata",
  circuit: "Circuit",
  rounds: "Rounds",
  duration: "Cardio",
  mobility: "Mobility",
};

export function inferTimerMode(exercise = {}) {
  const explicit = String(exercise.tracking_type || "").toLowerCase();

  if (explicit === "reps_load") return "strength";
  if (explicit === "timed_hold") return "timed_hold";
  if (explicit === "interval") return "interval";
  if (explicit === "tabata") return "tabata";
  if (explicit === "rounds") return "rounds";
  if (explicit === "duration") return "duration";
  if (explicit === "mobility") return "mobility";

  const text = textFor(exercise);

  if (text.includes("tabata")) return "tabata";
  if (hasAny(text, ["hiit", "interval"])) return "interval";
  if (hasAny(text, ["circuit", "rounds"])) return "circuit";
  if (hasAny(text, ["plank", "hold", "isometric", "wall sit"])) {
    return "timed_hold";
  }
  if (hasAny(text, ["run", "walk", "bike", "rower", "cardio", "treadmill"])) {
    return "duration";
  }
  if (hasAny(text, ["mobility", "stretch", "ankle rock", "yoga"])) {
    return "mobility";
  }

  return "strength";
}

export function buildTimerConfig(exercise = {}, modeOverride = "") {
  const mode = modeOverride || inferTimerMode(exercise);
  const repsValue = safeNumber(
    exercise.planned_reps || exercise.current_target_reps,
    0
  );
  const rest = Math.max(
    0,
    safeNumber(exercise.rest_seconds || exercise.rest, 60)
  );

  const configs = {
    strength: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: false,
      work_seconds: 0,
      rest_seconds: rest || 60,
      rounds: Math.max(1, safeNumber(exercise.planned_sets, 3)),
      guidance:
        "No forced countdown. Start and finish each strength set manually; the rest timer begins only after the set is logged.",
    },
    timed_hold: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: true,
      work_seconds: repsValue || safeNumber(exercise.duration_seconds, 30) || 30,
      rest_seconds: rest || 30,
      rounds: Math.max(1, safeNumber(exercise.planned_sets, 3)),
      guidance:
        "The timer controls the hold. Stop early if position breaks or pain increases.",
    },
    interval: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: true,
      work_seconds: safeNumber(exercise.work_seconds, 40) || 40,
      rest_seconds: safeNumber(exercise.interval_rest_seconds, 20) || 20,
      rounds: Math.max(1, safeNumber(exercise.rounds || exercise.planned_sets, 6)),
      guidance:
        "Work and recovery alternate automatically. Use sustainable intensity across every round.",
    },
    tabata: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: true,
      work_seconds: 20,
      rest_seconds: 10,
      rounds: Math.max(1, safeNumber(exercise.rounds, 8) || 8),
      guidance:
        "Classic Tabata timing: 20 seconds work, 10 seconds rest, repeated for eight rounds.",
    },
    circuit: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: true,
      work_seconds: safeNumber(exercise.work_seconds, 45) || 45,
      rest_seconds: safeNumber(exercise.interval_rest_seconds, 15) || 15,
      rounds: Math.max(1, safeNumber(exercise.rounds || exercise.planned_sets, 3)),
      guidance:
        "Complete each station for time, then use the short transition before the next round.",
    },
    rounds: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: true,
      work_seconds: safeNumber(exercise.work_seconds, 60) || 60,
      rest_seconds: rest || 30,
      rounds: Math.max(1, safeNumber(exercise.rounds || exercise.planned_sets, 3)),
      guidance:
        "Track one timed effort per round. Quality stays more important than rushing.",
    },
    duration: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: true,
      work_seconds:
        safeNumber(exercise.duration_seconds, 0) ||
        safeNumber(exercise.duration_minutes, 10) * 60 ||
        600,
      rest_seconds: 0,
      rounds: 1,
      guidance:
        "Use the timer for the full cardio duration. Pause only when the activity actually stops.",
    },
    mobility: {
      mode,
      label: TIMER_MODE_LABELS[mode],
      timed: true,
      work_seconds: repsValue || safeNumber(exercise.duration_seconds, 45) || 45,
      rest_seconds: 10,
      rounds: Math.max(1, safeNumber(exercise.planned_sets, 1)),
      guidance:
        "Move slowly through a comfortable range. This is not a race or a forced stretch.",
    },
  };

  return configs[mode] || configs.strength;
}

export function formatTimerSeconds(value) {
  const safe = Math.max(0, Math.round(Number(value || 0)));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// src/components/customer-health/healthWorkoutRecoveryGuard.js
import { dayDistance, localYmd } from "./healthWorkoutDateLifecycle";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function sessionYmd(session = {}) {
  return String(
    session?.completed_ymd ||
      session?.finished_at ||
      session?.completed_at ||
      session?.started_at ||
      session?.ymd ||
      session?.scheduled_ymd ||
      ""
  ).slice(0, 10);
}

function exerciseNames(workout = {}) {
  return (Array.isArray(workout?.exercises) ? workout.exercises : [])
    .map((exercise) =>
      normalize(
        exercise?.substitute_name ||
          exercise?.name ||
          exercise?.exercise_name ||
          exercise?.title
      )
    )
    .filter(Boolean);
}

const FOCUS_RULES = [
  ["chest", ["chest", "bench", "pec", "push-up", "push up", "fly", "incline press", "decline press"]],
  ["back", ["back", "lat ", "pulldown", "pull-down", "row", "face pull", "rear delt"]],
  ["shoulders", ["shoulder", "overhead press", "lateral raise", "front raise", "arnold press", "delt"]],
  ["biceps", ["bicep", "curl", "preacher"]],
  ["triceps", ["tricep", "pushdown", "skull crusher", "extension"]],
  ["quads", ["quad", "squat", "leg press", "leg extension", "lunge", "split squat"]],
  ["hamstrings", ["hamstring", "leg curl", "romanian deadlift", "rdl"]],
  ["glutes", ["glute", "hip thrust", "bridge"]],
  ["calves", ["calf", "calves"]],
  ["core", ["core", "ab", "plank", "sit-up", "sit up", "crunch", "dead bug"]],
  ["conditioning", ["cardio", "hiit", "tabata", "bike", "treadmill", "run", "walk", "conditioning"]],
];

export function workoutFocus(workout = {}) {
  const text = [
    normalize(workout?.workout_name || workout?.name || workout?.title),
    normalize(workout?.subtitle || workout?.focus || workout?.muscle_focus),
    ...exerciseNames(workout),
  ].join(" ");

  const result = new Set();
  FOCUS_RULES.forEach(([focus, terms]) => {
    if (terms.some((term) => text.includes(term))) result.add(focus);
  });

  if (text.includes("push")) {
    result.add("chest");
    result.add("shoulders");
    result.add("triceps");
  }
  if (text.includes("pull")) {
    result.add("back");
    result.add("biceps");
  }
  if (text.includes("lower") || text.includes("legs") || text.includes("leg day")) {
    result.add("quads");
    result.add("hamstrings");
    result.add("glutes");
  }

  return [...result];
}

export function latestCompletedWorkout(history = [], today = localYmd()) {
  return [...(Array.isArray(history) ? history : [])]
    .filter((session) => {
      const status = normalize(session?.status || session?.lifecycle_status);
      return Boolean(
        session?.finished_at ||
          session?.completed_at ||
          session?.completed === true ||
          status.includes("completed")
      );
    })
    .map((session) => ({
      session,
      ymd: sessionYmd(session),
    }))
    .filter((row) => row.ymd && dayDistance(row.ymd, today) >= 0)
    .sort((a, b) => b.ymd.localeCompare(a.ymd))[0]?.session || null;
}

export function evaluateRecentMuscleConflict({
  proposedWorkout,
  history = [],
  today = localYmd(),
  recoveryWindowDays = 1,
} = {}) {
  if (!proposedWorkout) {
    return { conflict: false, recentWorkout: null, overlap: [], proposedFocus: [] };
  }

  const recentWorkout = latestCompletedWorkout(history, today);
  if (!recentWorkout) {
    return { conflict: false, recentWorkout: null, overlap: [], proposedFocus: workoutFocus(proposedWorkout) };
  }

  const recentYmd = sessionYmd(recentWorkout);
  const ageDays = dayDistance(recentYmd, today);
  if (ageDays < 0 || ageDays > recoveryWindowDays) {
    return { conflict: false, recentWorkout, overlap: [], proposedFocus: workoutFocus(proposedWorkout), recentFocus: workoutFocus(recentWorkout), ageDays };
  }

  const proposedFocus = workoutFocus(proposedWorkout);
  const recentFocus = workoutFocus(recentWorkout);
  const overlap = proposedFocus.filter((focus) => recentFocus.includes(focus));

  return {
    conflict: overlap.length > 0,
    recentWorkout,
    recentYmd,
    ageDays,
    overlap,
    proposedFocus,
    recentFocus,
  };
}

export function chooseRecoverySafeWorkout({
  proposedWorkout,
  candidates = [],
  history = [],
  today = localYmd(),
} = {}) {
  const evaluation = evaluateRecentMuscleConflict({
    proposedWorkout,
    history,
    today,
  });

  if (!evaluation.conflict) {
    return {
      workout: proposedWorkout,
      revised: false,
      reason: "",
      evaluation,
    };
  }

  const alternate = [...(Array.isArray(candidates) ? candidates : [])]
    .filter((item) => item && item !== proposedWorkout)
    .filter((item) => item?.workout_name || item?.name || item?.title)
    .find((item) => {
      const focus = workoutFocus(item);
      return !focus.some((muscle) => evaluation.recentFocus.includes(muscle));
    });

  const overlapLabel = evaluation.overlap.join(", ");
  const recentName =
    evaluation.recentWorkout?.workout_name ||
    evaluation.recentWorkout?.name ||
    evaluation.recentWorkout?.title ||
    "your previous workout";

  if (alternate) {
    return {
      workout: {
        ...alternate,
        ai_revised_from_workout_name:
          proposedWorkout?.workout_name || proposedWorkout?.name || proposedWorkout?.title || "Scheduled workout",
        ai_revision_reason: `You trained ${overlapLabel} in ${recentName} yesterday, so SYNC moved to a recovery-safe session.`,
        ai_revised: true,
      },
      revised: true,
      reason: `You trained ${overlapLabel} yesterday. SYNC selected a different muscle focus so that work can recover.`,
      evaluation,
    };
  }

  return {
    workout: proposedWorkout,
    revised: true,
    needsRebuild: true,
    reason: `You trained ${overlapLabel} yesterday, and the current plan does not contain a recovery-safe alternate. SYNC recommends rebuilding today's session before you start.`,
    evaluation,
  };
}

// src/components/customer-health/healthTrainingConnectivity.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function exerciseName(exercise = {}) {
  return String(
    exercise.substitute_name ||
      exercise.name ||
      exercise.exercise_name ||
      ""
  )
    .trim()
    .toLowerCase();
}

function exerciseMuscleText(exercise = {}) {
  return [
    exerciseName(exercise),
    exercise.category,
    exercise.movement_pattern,
    ...(Array.isArray(exercise.primary_muscles)
      ? exercise.primary_muscles
      : []),
    ...(Array.isArray(exercise.secondary_muscles)
      ? exercise.secondary_muscles
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyExerciseFocus(exercise = {}) {
  const text = exerciseMuscleText(exercise);

  if (
    /plank|crunch|sit up|sit-up|abdom|core|oblique|rotation|pallof|dead bug|bird dog/.test(
      text
    )
  ) {
    return "Core";
  }

  if (
    /squat|lunge|deadlift|leg press|leg extension|leg curl|hamstring|quadricep|quad|glute|calf|hip thrust|lower body|walking lunge/.test(
      text
    )
  ) {
    return "Legs";
  }

  if (
    /row|pulldown|pull down|pull-up|pull up|chin-up|chin up|lat|rear delt|face pull|back|biceps|bicep|curl/.test(
      text
    )
  ) {
    return "Pull";
  }

  if (
    /bench|press|push-up|push up|chest|triceps|tricep|fly|shoulder press|overhead press|lateral raise|front raise/.test(
      text
    )
  ) {
    return "Push";
  }

  return "Other";
}

export function workingSetLogs(exercise = {}) {
  const logs = Array.isArray(exercise.set_logs)
    ? exercise.set_logs
    : [];

  return logs.filter(
    (setLog) =>
      String(setLog?.set_type || "working").toLowerCase() !==
      "warmup"
  );
}

export function countWorkingSets(session = {}) {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : Array.isArray(session?.session?.exercises)
    ? session.session.exercises
    : [];

  return exercises.reduce(
    (total, exercise) =>
      total + workingSetLogs(exercise).length,
    0
  );
}

export function buildFocusBalance(session = {}) {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : Array.isArray(session?.session?.exercises)
    ? session.session.exercises
    : [];

  const result = {
    Push: 0,
    Pull: 0,
    Legs: 0,
    Core: 0,
  };

  exercises.forEach((exercise) => {
    const focus = classifyExerciseFocus(exercise);

    if (!(focus in result)) {
      return;
    }

    result[focus] += workingSetLogs(exercise).length;
  });

  return result;
}

export function buildLiveTrainingSummary(session = {}) {
  return {
    id: session.id || "",
    session_id: session.id || "",
    workout_name:
      session.workout_name ||
      session.name ||
      "Active Workout",
    status: session.status || "active",
    started_at:
      session.started_at ||
      new Date().toISOString(),
    updated_at:
      new Date().toISOString(),
    ymd:
      session.ymd ||
      new Date().toISOString().slice(0, 10),
    completed_sets:
      countWorkingSets(session),
    active_seconds:
      Number(session.active_seconds || 0),
    total_seconds:
      Number(session.total_seconds || 0),
    focus_balance:
      buildFocusBalance(session),
    exercises:
      Array.isArray(session.exercises)
        ? session.exercises
        : [],
    source:
      "active_workout_live_connectivity",
  };
}

export function mergeLiveTrainingWithHistory(
  history,
  liveSession
) {
  const rows = Array.isArray(history)
    ? [...history]
    : [];

  if (
    !liveSession ||
    typeof liveSession !== "object" ||
    !liveSession.session_id
  ) {
    return rows;
  }

  const alreadySaved = rows.some(
    (item) =>
      String(
        item?.id ||
          item?.session_id ||
          item?.session?.id ||
          ""
      ) === String(liveSession.session_id)
  );

  return alreadySaved
    ? rows
    : [liveSession, ...rows];
}

export function buildImmediateSetCoachMessage({
  exercise,
  savedSet,
  suggestion,
  restSeconds = 0,
  exerciseFinished = false,
  nextExerciseName = "",
}) {
  const name =
    exercise?.substitute_name ||
    exercise?.name ||
    "That exercise";

  const weight =
    savedSet?.actual_weight ??
    savedSet?.weight ??
    "";

  const reps =
    savedSet?.actual_reps ??
    savedSet?.reps ??
    "";

  const rpe = safeNumber(
    savedSet?.rpe ??
      savedSet?.ease_score,
    0
  );

  const pain = safeNumber(
    savedSet?.pain_score,
    0
  );

  const completedLine = `${name}. ${reps || "Set"} reps at ${
    weight || "bodyweight"
  }${weight ? " pounds" : ""} saved.`;

  if (pain >= 3) {
    return `${completedLine} Pain was reported. Reduce the load or switch to a pain-free variation.`;
  }

  if (exerciseFinished && nextExerciseName) {
    return `${completedLine} Strong work. ${name} is complete. Next is ${nextExerciseName}.`;
  }

  if (exerciseFinished) {
    return `${completedLine} ${name} is complete. Finish the workout review when you are ready.`;
  }

  const targetWeight =
    suggestion?.target_weight ??
    suggestion?.weight ??
    exercise?.current_target_weight ??
    exercise?.planned_weight ??
    "";

  const targetReps =
    suggestion?.target_reps ??
    suggestion?.reps ??
    exercise?.current_target_reps ??
    exercise?.planned_reps ??
    "";

  let direction = "";

  if (suggestion?.action === "increase") {
    direction = targetWeight
      ? `You earned a progression. Move to ${targetWeight} pounds and target ${targetReps || reps} clean reps.`
      : "You earned a progression. Keep the load and add one or two clean reps.";
  } else if (
    suggestion?.action === "reduce" ||
    rpe >= 9
  ) {
    direction = `That was a hard set. Keep the same load or reduce slightly and target ${targetReps || reps} clean reps.`;
  } else if (rpe > 0 && rpe <= 7) {
    direction = targetWeight
      ? `You had more available. Use ${targetWeight} pounds if it is available, or keep the load and increase the rep target.`
      : "You had more available. Keep the movement controlled and increase the rep target.";
  } else {
    direction = "Stay with the current target and make the next set cleaner.";
  }

  const restLine =
    restSeconds > 0
      ? `You have ${restSeconds} seconds to recover.`
      : "";

  return [completedLine, direction, restLine]
    .filter(Boolean)
    .join(" ");
}
// src/components/customer-health/healthMissionMode.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function exerciseLogs(exercise = {}) {
  return Array.isArray(exercise.set_logs) ? exercise.set_logs : [];
}

function totalPlannedSets(exercises = []) {
  return exercises.reduce(
    (sum, exercise) =>
      sum + Math.max(0, safeNumber(exercise.planned_sets || exercise.sets, 0)),
    0
  );
}

function completedExercises(exercises = []) {
  return exercises.filter((exercise) => {
    const planned = Math.max(
      1,
      safeNumber(exercise.planned_sets || exercise.sets, 1)
    );
    return (
      exercise.completed ||
      exercise.skipped ||
      exerciseLogs(exercise).length >= planned
    );
  }).length;
}

function totalVolume(exercises = []) {
  return exercises.reduce(
    (total, exercise) =>
      total +
      exerciseLogs(exercise).reduce((setTotal, setLog) => {
        const weight = safeNumber(
          setLog.actual_weight ?? setLog.weight,
          0
        );
        const reps = safeNumber(
          setLog.actual_reps ?? setLog.reps,
          0
        );
        return setTotal + weight * reps;
      }, 0),
    0
  );
}

function bestSet(exercises = []) {
  let best = null;

  for (const exercise of exercises) {
    for (const setLog of exerciseLogs(exercise)) {
      const weight = safeNumber(
        setLog.actual_weight ?? setLog.weight,
        0
      );
      const reps = safeNumber(
        setLog.actual_reps ?? setLog.reps,
        0
      );
      const score = weight * reps;

      if (!best || score > best.score) {
        best = {
          score,
          weight,
          reps,
          exercise_name:
            exercise.substitute_name || exercise.name || "Exercise",
        };
      }
    }
  }

  return best;
}

function sessionObjective(session = {}) {
  const category =
    session.training_category ||
    session.scientific_title ||
    session.workout_name ||
    session.name ||
    "Today's training";

  const focus =
    session.primary_muscles ||
    session.body_region ||
    session.movement_pattern ||
    "";

  return focus
    ? `Complete ${category} while progressing ${Array.isArray(focus) ? focus.join(", ") : focus} with quality reps and controlled effort.`
    : `Complete ${category} with quality reps, controlled effort, and accurate set logging.`;
}

function motivationalLine(percent, currentExercise = {}) {
  if (percent >= 100) {
    return "Mission complete. Save the result, review the data, and recover with purpose.";
  }

  if (percent >= 75) {
    return "Finish strong. Protect form and close the final objectives.";
  }

  if (percent >= 50) {
    return "Past halfway. Stay precise and keep the quality high.";
  }

  if (percent >= 25) {
    return "Momentum is building. Stack the next clean set.";
  }

  const name =
    currentExercise?.substitute_name ||
    currentExercise?.name ||
    "the first exercise";

  return `Mission is live. Establish control on ${name} and build from there.`;
}

export function buildMissionMetrics(session = {}) {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const plannedSets =
    safeNumber(session.total_planned_sets, 0) ||
    totalPlannedSets(exercises);

  const completedSets =
    safeNumber(session.completed_sets, 0) ||
    exercises.reduce(
      (sum, exercise) => sum + exerciseLogs(exercise).length,
      0
    );

  const exerciseTotal = exercises.length;
  const exerciseCompleted = completedExercises(exercises);

  const setPercent =
    plannedSets > 0
      ? Math.min(100, Math.round((completedSets / plannedSets) * 100))
      : 0;

  const exercisePercent =
    exerciseTotal > 0
      ? Math.min(
          100,
          Math.round((exerciseCompleted / exerciseTotal) * 100)
        )
      : 0;

  const progressPercent =
    plannedSets > 0
      ? Math.round(setPercent * 0.75 + exercisePercent * 0.25)
      : exercisePercent;

  const activeRatio =
    safeNumber(session.total_seconds, 0) > 0
      ? Math.round(
          (safeNumber(session.active_seconds, 0) /
            Math.max(1, safeNumber(session.total_seconds, 1))) *
            100
        )
      : 0;

  const currentExercise =
    exercises[safeNumber(session.current_exercise_index, 0)] ||
    exercises.find((exercise) => !exercise.completed && !exercise.skipped) ||
    exercises[0] ||
    null;

  const nextCheckpoint =
    progressPercent < 25
      ? "Checkpoint 1: establish baseline"
      : progressPercent < 50
      ? "Checkpoint 2: maintain form under volume"
      : progressPercent < 75
      ? "Checkpoint 3: hold target effort"
      : progressPercent < 100
      ? "Final checkpoint: finish clean"
      : "All checkpoints cleared";

  const best = bestSet(exercises);
  const volume = totalVolume(exercises);

  const objectives = [
    {
      id: "sets",
      label: "Complete planned sets",
      current: completedSets,
      target: plannedSets,
      complete: plannedSets > 0 && completedSets >= plannedSets,
    },
    {
      id: "exercises",
      label: "Complete exercise list",
      current: exerciseCompleted,
      target: exerciseTotal,
      complete:
        exerciseTotal > 0 && exerciseCompleted >= exerciseTotal,
    },
    {
      id: "logging",
      label: "Log every completed set",
      current: completedSets,
      target: plannedSets,
      complete: plannedSets > 0 && completedSets >= plannedSets,
    },
  ];

  return {
    mission_title:
      session.scientific_title ||
      session.workout_name ||
      session.name ||
      "Training Mission",
    objective: sessionObjective(session),
    progress_percent: Math.min(100, Math.max(0, progressPercent)),
    completed_sets: completedSets,
    planned_sets: plannedSets,
    completed_exercises: exerciseCompleted,
    total_exercises: exerciseTotal,
    active_ratio_percent: activeRatio,
    total_volume: Math.round(volume),
    best_set: best,
    current_exercise: currentExercise,
    next_checkpoint: nextCheckpoint,
    motivational_line: motivationalLine(progressPercent, currentExercise),
    objectives,
  };
}

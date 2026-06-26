// src/components/customer-health/healthWorkoutReport.js

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function workingSets(exercise = {}) {
  return (Array.isArray(exercise.set_logs) ? exercise.set_logs : [])
    .filter((setLog) => setLog?.set_type !== "warmup");
}

function exerciseName(exercise = {}) {
  return exercise.substituted && exercise.substitute_name
    ? exercise.substitute_name
    : exercise.name || "Exercise";
}

function setVolume(setLog = {}) {
  return num(setLog.actual_weight ?? setLog.weight) *
    num(setLog.actual_reps ?? setLog.reps);
}

export function buildWorkoutReport(session = {}) {
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const rows = exercises.map((exercise) => {
    const sets = workingSets(exercise);
    const completedSets = sets.length;
    const plannedSets = num(exercise.planned_sets);
    const volume = sets.reduce(
      (sum, setLog) => sum + setVolume(setLog),
      0
    );
    const failures = sets.filter(
      (setLog) => Boolean(setLog.reached_failure)
    ).length;
    const maxPain = Math.max(
      0,
      ...sets.map((setLog) => num(setLog.pain_score)),
      num(exercise.pain_score)
    );
    const poorForm = sets.some(
      (setLog) => setLog.form_quality === "Poor"
    );
    const averageRpe = sets.length
      ? sets.reduce(
          (sum, setLog) =>
            sum + num(setLog.rpe ?? setLog.ease_score),
          0
        ) / sets.length
      : 0;

    let outcome = "completed";
    if (exercise.skipped) outcome = "skipped";
    else if (maxPain >= 3 || poorForm) outcome = "attention";
    else if (plannedSets > 0 && completedSets < plannedSets)
      outcome = "incomplete";

    return {
      id: exercise.id,
      name: exerciseName(exercise),
      plannedSets,
      completedSets,
      volume,
      failures,
      maxPain,
      poorForm,
      averageRpe:
        averageRpe > 0
          ? Math.round(averageRpe * 10) / 10
          : 0,
      outcome,
      sets,
    };
  });

  const totalVolume = rows.reduce(
    (sum, row) => sum + row.volume,
    0
  );
  const totalSets = rows.reduce(
    (sum, row) => sum + row.completedSets,
    0
  );
  const painFlags = rows.filter(
    (row) => row.maxPain >= 3 || row.poorForm
  ).length;
  const missedTargets = rows.filter(
    (row) =>
      row.outcome === "incomplete" ||
      row.outcome === "skipped"
  ).length;
  const failureSets = rows.reduce(
    (sum, row) => sum + row.failures,
    0
  );

  const wins = [];
  if (totalSets > 0) {
    wins.push(`${totalSets} working sets completed`);
  }
  if (totalVolume > 0) {
    wins.push(`${Math.round(totalVolume).toLocaleString()} lb total volume`);
  }
  if (!painFlags && totalSets > 0) {
    wins.push("No major pain or form flags");
  }

  const nextSteps = [];
  if (painFlags) {
    nextSteps.push(
      "Review flagged exercises and reduce load or change the movement next time."
    );
  }
  if (failureSets >= 2) {
    nextSteps.push(
      "Avoid repeated failure sets; leave 1-2 reps in reserve on most working sets."
    );
  }
  if (missedTargets) {
    nextSteps.push(
      "Keep the same load until planned working sets are completed cleanly."
    );
  }
  if (!nextSteps.length && totalSets > 0) {
    nextSteps.push(
      "Recovery looks good. Follow the progression recommendation next session."
    );
  }

  const totalSeconds = num(session.total_seconds);
  const activeSeconds = num(session.active_seconds);
  const restSeconds = num(session.rest_seconds);
  const idleSeconds = Math.max(
    0,
    num(session.idle_seconds) ||
      totalSeconds - activeSeconds - restSeconds
  );

  return {
    rows,
    totalVolume,
    totalSets,
    painFlags,
    missedTargets,
    failureSets,
    wins,
    nextSteps,
    totalSeconds,
    activeSeconds,
    restSeconds,
    idleSeconds,
  };
}

// src/components/customer-health/healthWorkoutReport.js

function num(value) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );
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

function setTargetVolume(setLog = {}) {
  return num(setLog.target_weight ?? setLog.planned_weight) *
    num(setLog.target_reps ?? setLog.planned_reps);
}

function average(values = []) {
  const clean = values.filter((value) => value > 0);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function describeEffort(score) {
  if (score >= 9.5) return "Max Effort";
  if (score >= 8) return "Hard";
  if (score >= 6) return "Medium";
  if (score > 0) return "Easy";
  return "Not logged";
}

function buildSessionScore({
  totalSets,
  plannedSets,
  activeRatio,
  averageEffort,
  painFlags,
  missedTargets,
}) {
  const completionScore = plannedSets
    ? Math.min(100, Math.round((totalSets / plannedSets) * 100))
    : totalSets > 0
    ? 75
    : 0;

  const effortScore = averageEffort
    ? Math.min(100, Math.round(averageEffort * 10))
    : totalSets > 0
    ? 70
    : 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        completionScore * 0.5 +
          activeRatio * 0.25 +
          effortScore * 0.25 -
          painFlags * 5 -
          missedTargets * 3
      )
    )
  );
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
    const targetVolume = sets.reduce(
      (sum, setLog) => sum + setTargetVolume(setLog),
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
    const averageEffort = average(
      sets.map((setLog) => num(setLog.rpe ?? setLog.ease_score))
    );

    const missedReps = sets.filter((setLog) => {
      const actual = num(setLog.actual_reps ?? setLog.reps);
      const target = num(setLog.target_reps ?? setLog.planned_reps);
      return target > 0 && actual > 0 && actual < target;
    }).length;

    const missedLoad = sets.filter((setLog) => {
      const actual = num(setLog.actual_weight ?? setLog.weight);
      const target = num(setLog.target_weight ?? setLog.planned_weight);
      return target > 0 && actual > 0 && actual < target;
    }).length;

    let outcome = "completed";
    if (exercise.skipped) outcome = "skipped";
    else if (maxPain >= 3 || poorForm) outcome = "attention";
    else if (plannedSets > 0 && completedSets < plannedSets)
      outcome = "incomplete";
    else if (missedReps || missedLoad) outcome = "target missed";

    const nextWeight = (() => {
      if (!sets.length) {
        return (
          exercise.current_target_weight ||
          exercise.planned_weight ||
          ""
        );
      }

      const last = sets[sets.length - 1];
      const lastWeight = num(last.actual_weight ?? last.weight);
      const targetReps = num(last.target_reps ?? last.planned_reps);
      const actualReps = num(last.actual_reps ?? last.reps);
      const hard = num(last.rpe ?? last.ease_score) >= 9;
      const pain = num(last.pain_score) > 0;

      if (!lastWeight) return "";
      if (pain || poorForm) return Math.max(0, lastWeight - 5);
      if (actualReps >= targetReps && !hard && targetReps > 0) {
        return lastWeight + 5;
      }

      return lastWeight;
    })();

    const nextReps = (() => {
      if (!sets.length) {
        return (
          exercise.current_target_reps ||
          exercise.planned_reps ||
          ""
        );
      }

      const last = sets[sets.length - 1];
      const targetReps = num(last.target_reps ?? last.planned_reps);
      const actualReps = num(last.actual_reps ?? last.reps);

      if (targetReps > 0) return targetReps;
      if (actualReps > 0) return actualReps;
      return exercise.current_target_reps || exercise.planned_reps || "";
    })();

    return {
      id: exercise.id,
      name: exerciseName(exercise),
      plannedSets,
      completedSets,
      volume,
      targetVolume,
      failures,
      maxPain,
      poorForm,
      averageRpe:
        averageEffort > 0
          ? Math.round(averageEffort * 10) / 10
          : 0,
      effortLabel: describeEffort(averageEffort),
      missedReps,
      missedLoad,
      outcome,
      nextWeight,
      nextReps,
      sets,
    };
  });

  const totalVolume = rows.reduce(
    (sum, row) => sum + row.volume,
    0
  );
  const targetVolume = rows.reduce(
    (sum, row) => sum + row.targetVolume,
    0
  );
  const totalSets = rows.reduce(
    (sum, row) => sum + row.completedSets,
    0
  );
  const plannedSets = rows.reduce(
    (sum, row) => sum + row.plannedSets,
    0
  );
  const painFlags = rows.filter(
    (row) => row.maxPain >= 3 || row.poorForm
  ).length;
  const missedTargets = rows.filter(
    (row) =>
      row.outcome === "incomplete" ||
      row.outcome === "skipped" ||
      row.outcome === "target missed"
  ).length;
  const failureSets = rows.reduce(
    (sum, row) => sum + row.failures,
    0
  );
  const averageEffort = average(
    rows.map((row) => row.averageRpe)
  );

  const totalSeconds = num(session.total_seconds);
  const activeSeconds = num(session.active_seconds);
  const restSeconds = num(session.rest_seconds);
  const idleSeconds = Math.max(
    0,
    num(session.idle_seconds) ||
      totalSeconds - activeSeconds - restSeconds
  );

  const activeRatio =
    totalSeconds > 0
      ? Math.min(
          100,
          Math.round((activeSeconds / totalSeconds) * 100)
        )
      : 0;

  const sessionScore = num(
    session?.completion_meta?.session_score ??
      session?.session_score
  ) || buildSessionScore({
    totalSets,
    plannedSets,
    activeRatio,
    averageEffort,
    painFlags,
    missedTargets,
  });

  const strongestRow = rows.reduce(
    (best, row) => (!best || row.volume > best.volume ? row : best),
    null
  );

  const attentionRows = rows.filter(
    (row) =>
      row.outcome === "attention" ||
      row.outcome === "incomplete" ||
      row.outcome === "skipped" ||
      row.outcome === "target missed"
  );

  const progressionRows = rows
    .filter((row) => row.completedSets > 0)
    .slice(0, 4)
    .map((row) => ({
      id: row.id,
      name: row.name,
      nextWeight: row.nextWeight,
      nextReps: row.nextReps,
      reason:
        row.maxPain >= 3 || row.poorForm
          ? "Safer repeat or slight reduction recommended."
          : row.missedReps || row.missedLoad
          ? "Repeat until the target is clean."
          : row.averageRpe >= 9
          ? "Repeat load before adding intensity."
          : "Progress is available if form stays clean.",
    }));

  const wins = [];
  if (totalSets > 0) {
    wins.push(`${totalSets} working sets completed`);
  }
  if (totalVolume > 0) {
    wins.push(`${Math.round(totalVolume).toLocaleString()} lb total volume`);
  }
  if (strongestRow?.volume > 0) {
    wins.push(`Strongest movement: ${strongestRow.name}`);
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

  const coachSummary =
    painFlags > 0
      ? "Good work getting it done, but SYNC flagged pain or form risk. Next session should protect the joints first, then build intensity."
      : missedTargets > 0
      ? "Solid session. SYNC wants the same weights repeated until every planned set is clean."
      : sessionScore >= 85
      ? "Strong session. SYNC can progress one variable next time: weight, reps, or control."
      : totalSets > 0
      ? "Good consistency. SYNC wants cleaner execution and a little more active time before pushing harder."
      : "Start logging sets so SYNC can coach the next workout accurately.";

  return {
    rows,
    totalVolume,
    targetVolume,
    totalSets,
    plannedSets,
    painFlags,
    missedTargets,
    failureSets,
    wins,
    nextSteps,
    totalSeconds,
    activeSeconds,
    restSeconds,
    idleSeconds,
    activeRatio,
    averageEffort:
      averageEffort > 0
        ? Math.round(averageEffort * 10) / 10
        : 0,
    effortLabel: describeEffort(averageEffort),
    sessionScore,
    strongestMovement: strongestRow?.name || "",
    attentionRows,
    progressionRows,
    coachSummary,
  };
}
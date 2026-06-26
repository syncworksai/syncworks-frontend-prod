// src/components/customer-health/healthProgressionLogic.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function normalizeName(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function workingSets(exercise = {}) {
  const logs = Array.isArray(exercise.set_logs)
    ? exercise.set_logs
    : [];

  return logs.filter(
    (setLog) => setLog?.set_type !== "warmup"
  );
}

function average(values = []) {
  const valid = values
    .map((value) => safeNumber(value, NaN))
    .filter(Number.isFinite);

  if (!valid.length) return 0;

  return (
    valid.reduce((sum, value) => sum + value, 0) /
    valid.length
  );
}

function completedHistoryEntries(history = []) {
  return (Array.isArray(history) ? history : [])
    .filter(
      (entry) =>
        entry?.type === "workout_session" ||
        entry?.session?.status === "completed"
    )
    .sort((a, b) => {
      const aTime = new Date(
        a?.completed_at ||
          a?.session?.finished_at ||
          0
      ).getTime();

      const bTime = new Date(
        b?.completed_at ||
          b?.session?.finished_at ||
          0
      ).getTime();

      return bTime - aTime;
    });
}

export function findPreviousExercisePerformance({
  history = [],
  exerciseName = "",
  currentSessionId = "",
} = {}) {
  const targetName = normalizeName(exerciseName);

  if (!targetName) return null;

  for (const entry of completedHistoryEntries(history)) {
    const priorSession = entry?.session || {};

    if (
      currentSessionId &&
      priorSession.id === currentSessionId
    ) {
      continue;
    }

    const exercises = Array.isArray(
      priorSession.exercises
    )
      ? priorSession.exercises
      : [];

    const match = exercises.find((exercise) => {
      const actualName =
        exercise?.substituted &&
        exercise?.substitute_name
          ? exercise.substitute_name
          : exercise?.name;

      return normalizeName(actualName) === targetName;
    });

    if (match) {
      return {
        entry,
        session: priorSession,
        exercise: match,
        sets: workingSets(match),
      };
    }
  }

  return null;
}

function chooseIncrement(weight) {
  const value = safeNumber(weight, 0);

  if (value <= 0) return 0;
  if (value < 50) return 2.5;
  return 5;
}

export function buildExerciseProgression({
  history = [],
  exercise = null,
  session = null,
} = {}) {
  if (!exercise) {
    return {
      status: "empty",
      previous: null,
      recommendation: null,
    };
  }

  const exerciseName =
    exercise.substituted &&
    exercise.substitute_name
      ? exercise.substitute_name
      : exercise.name;

  const previous = findPreviousExercisePerformance({
    history,
    exerciseName,
    currentSessionId: session?.id || "",
  });

  const currentWeight = safeNumber(
    exercise.current_target_weight ??
      exercise.planned_weight,
    0
  );

  const currentReps = safeNumber(
    exercise.current_target_reps ??
      exercise.planned_reps,
    0
  );

  if (!previous || !previous.sets.length) {
    return {
      status: "first_session",
      previous: null,
      recommendation: {
        action: "baseline",
        tone: "cyan",
        weight: currentWeight || "",
        reps: currentReps || "",
        title: "Build your baseline",
        message:
          "No previous working sets were found. Complete clean sets today so the coach can compare your next session.",
      },
    };
  }

  const sets = previous.sets;
  const reps = sets.map(
    (setLog) =>
      safeNumber(
        setLog.actual_reps ?? setLog.reps,
        0
      )
  );
  const weights = sets.map(
    (setLog) =>
      safeNumber(
        setLog.actual_weight ?? setLog.weight,
        0
      )
  );
  const rpes = sets.map(
    (setLog) =>
      safeNumber(
        setLog.rpe ?? setLog.ease_score,
        0
      )
  );

  const lastWeight =
    [...weights].reverse().find((value) => value > 0) ||
    currentWeight;

  const targetReps = Math.max(
    1,
    safeNumber(
      previous.exercise.current_target_reps ??
        previous.exercise.planned_reps ??
        currentReps,
      currentReps || 1
    )
  );

  const avgRpe = average(
    rpes.filter((value) => value > 0)
  );

  const failureCount = sets.filter(
    (setLog) => Boolean(setLog.reached_failure)
  ).length;

  const painScore = Math.max(
    ...sets.map(
      (setLog) =>
        safeNumber(setLog.pain_score, 0)
    ),
    0
  );

  const poorForm = sets.some(
    (setLog) => setLog.form_quality === "Poor"
  );

  const allTargetsMet =
    reps.length > 0 &&
    reps.every((value) => value >= targetReps);

  const missedByTwoOrMore = reps.some(
    (value) => value < targetReps - 1
  );

  let recommendation;

  if (painScore >= 3 || poorForm) {
    const reducedWeight =
      lastWeight > 0
        ? Math.max(
            0,
            lastWeight - chooseIncrement(lastWeight)
          )
        : "";

    recommendation = {
      action: "reduce",
      tone: "rose",
      weight: reducedWeight,
      reps: Math.max(1, targetReps - 1),
      title: "Reduce and protect form",
      message:
        "Pain or poor form was logged last time. Reduce the load, keep the movement controlled, and stop if pain continues.",
    };
  } else if (
    failureCount >= 2 ||
    avgRpe >= 9.5 ||
    missedByTwoOrMore
  ) {
    const reducedWeight =
      lastWeight > 0
        ? Math.max(
            0,
            lastWeight - chooseIncrement(lastWeight)
          )
        : "";

    recommendation = {
      action: "reduce",
      tone: "amber",
      weight: reducedWeight,
      reps: targetReps,
      title: "Take a small step back",
      message:
        "The previous working sets were too close to failure or missed the rep target. Reduce slightly and rebuild clean reps.",
    };
  } else if (
    allTargetsMet &&
    avgRpe > 0 &&
    avgRpe <= 8 &&
    failureCount === 0
  ) {
    recommendation = {
      action: "increase",
      tone: "emerald",
      weight:
        lastWeight > 0
          ? lastWeight + chooseIncrement(lastWeight)
          : "",
      reps: targetReps,
      title: "Progress the load",
      message:
        "You completed every working-set target without failure. Add a small amount of weight and keep the same rep goal.",
    };
  } else {
    recommendation = {
      action: "hold",
      tone: "cyan",
      weight: lastWeight || "",
      reps: targetReps,
      title: "Hold and beat last time",
      message:
        "Keep the load steady and improve total clean reps before increasing weight.",
    };
  }

  return {
    status: "ready",
    previous: {
      sets: sets.map((setLog) => ({
        id: setLog.id,
        weight:
          setLog.actual_weight ??
          setLog.weight ??
          "",
        reps:
          setLog.actual_reps ??
          setLog.reps ??
          "",
        rpe:
          setLog.rpe ??
          setLog.ease_score ??
          "",
        reachedFailure:
          Boolean(setLog.reached_failure),
      })),
      averageRpe:
        avgRpe > 0
          ? Math.round(avgRpe * 10) / 10
          : "",
      failureCount,
      totalVolume: sets.reduce(
        (sum, setLog) =>
          sum +
          safeNumber(
            setLog.actual_weight ??
              setLog.weight,
            0
          ) *
            safeNumber(
              setLog.actual_reps ??
                setLog.reps,
              0
            ),
        0
      ),
    },
    recommendation,
  };
}

export function formatPreviousSet(setLog = {}) {
  const weight = safeNumber(setLog.weight, 0);
  const load =
    weight > 0
      ? `${weight} lb`
      : "Bodyweight";
  const reps = setLog.reps || "-";
  const rpe = setLog.rpe
    ? ` · RPE ${setLog.rpe}`
    : "";
  const failure = setLog.reachedFailure
    ? " · Failure"
    : "";

  return `${load} x ${reps}${rpe}${failure}`;
}

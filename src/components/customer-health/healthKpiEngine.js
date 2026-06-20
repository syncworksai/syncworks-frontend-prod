// src/components/customer-health/healthKpiEngine.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(values = []) {
  const valid = values
    .map((value) => safeNumber(value, NaN))
    .filter((value) => Number.isFinite(value));

  if (!valid.length) return 0;

  return (
    Math.round(
      (valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10
    ) / 10
  );
}

function normalizeExerciseName(value = "") {
  return String(value || "Exercise")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayExerciseName(value = "") {
  return String(value || "Exercise").trim() || "Exercise";
}

function parseRepRange(value = "") {
  const matches = String(value || "").match(/\d+/g) || [];
  const numbers = matches.map(Number).filter(Number.isFinite);

  if (!numbers.length) {
    return {
      minimum: 0,
      maximum: 0,
    };
  }

  if (numbers.length === 1) {
    return {
      minimum: numbers[0],
      maximum: numbers[0],
    };
  }

  return {
    minimum: Math.min(numbers[0], numbers[1]),
    maximum: Math.max(numbers[0], numbers[1]),
  };
}

function plannedSetsForExercise(exercise = {}) {
  return Math.max(
    0,
    safeNumber(exercise.planned_sets || exercise.sets, 0)
  );
}

function sessionFromHistoryItem(item = {}) {
  if (item?.session && typeof item.session === "object") {
    return item.session;
  }

  if (item?.type === "workout_session" && item?.summary) {
    return {
      ...item.summary,
      workout_name: item.workout_name,
      completed_at: item.completed_at,
      exercises: [],
    };
  }

  return null;
}

function completedAtForSession(session = {}, item = {}) {
  return (
    session.finished_at ||
    session.saved_at ||
    item.completed_at ||
    item.created_at ||
    ""
  );
}

function sortSessionsNewestFirst(a, b) {
  const aTime = new Date(a.completed_at || 0).getTime();
  const bTime = new Date(b.completed_at || 0).getTime();

  return bTime - aTime;
}

function calculateTargetHit(exercise = {}) {
  const setLogs = Array.isArray(exercise.set_logs) ? exercise.set_logs : [];
  const plannedSets = plannedSetsForExercise(exercise);
  const repRange = parseRepRange(exercise.planned_reps);

  const setTargetHit =
    plannedSets > 0 ? setLogs.length >= plannedSets : setLogs.length > 0;

  const repTargetHits = setLogs.map((setLog) => {
    const reps = safeNumber(setLog.reps);

    if (!repRange.minimum) return reps > 0;

    return reps >= repRange.minimum;
  });

  const repTargetHit =
    repTargetHits.length > 0 && repTargetHits.every(Boolean);

  return {
    setTargetHit,
    repTargetHit,
    overall: setTargetHit && repTargetHit,
  };
}

function buildExerciseOccurrence({
  exercise,
  session,
  historyItem,
  workoutName,
}) {
  const setLogs = Array.isArray(exercise.set_logs) ? exercise.set_logs : [];
  const targetHit = calculateTargetHit(exercise);

  const reps = setLogs.reduce(
    (sum, setLog) => sum + safeNumber(setLog.reps),
    0
  );

  const volume = setLogs.reduce((sum, setLog) => {
    const setReps = safeNumber(setLog.reps);
    const setWeight = safeNumber(setLog.weight);

    return sum + setReps * setWeight;
  }, 0);

  const weights = setLogs
    .map((setLog) => safeNumber(setLog.weight, NaN))
    .filter((value) => Number.isFinite(value));

  const efforts = setLogs
    .map((setLog) => safeNumber(setLog.ease_score, NaN))
    .filter((value) => Number.isFinite(value));

  const painScores = [
    safeNumber(exercise.pain_score, NaN),
    ...setLogs.map((setLog) => safeNumber(setLog.pain_score, NaN)),
  ].filter((value) => Number.isFinite(value));

  return {
    id: `${session.id || historyItem.id || "session"}_${exercise.id || exercise.name}`,
    session_id: session.id || "",
    workout_name: workoutName,
    exercise_name:
      exercise.substituted && exercise.substitute_name
        ? exercise.substitute_name
        : exercise.name,
    original_exercise_name: exercise.name,
    completed_at: completedAtForSession(session, historyItem),
    planned_sets: plannedSetsForExercise(exercise),
    planned_reps: exercise.planned_reps || exercise.reps || "",
    sets_completed: setLogs.length,
    reps_completed: reps,
    volume,
    best_weight: weights.length ? Math.max(...weights) : 0,
    average_weight: average(weights),
    average_effort: average(efforts),
    maximum_pain: painScores.length ? Math.max(...painScores) : 0,
    average_set_seconds: average(
      setLogs.map((setLog) => setLog.set_duration_seconds)
    ),
    target_hit: targetHit.overall,
    set_target_hit: targetHit.setTargetHit,
    rep_target_hit: targetHit.repTargetHit,
    skipped: !!exercise.skipped,
    substituted: !!exercise.substituted,
    rest_seconds: safeNumber(exercise.rest_seconds, 0),
    set_logs: setLogs,
  };
}

function recommendationForExercise(metric = {}) {
  const last = metric.last_occurrence;

  if (!last) {
    return {
      type: "collect_data",
      label: "Collect More Data",
      tone: "cyan",
      message: "Complete this exercise to build a personalized recommendation.",
    };
  }

  if (last.maximum_pain >= 4 || metric.pain_frequency >= 0.4) {
    return {
      type: "substitute",
      label: "Protect and Reassess",
      tone: "rose",
      message:
        "Pain is occurring too frequently to progress safely. Reduce load, range, or choose an alternative.",
    };
  }

  if (last.maximum_pain >= 2) {
    return {
      type: "maintain_pain",
      label: "Maintain and Monitor",
      tone: "amber",
      message:
        "Keep the load stable and focus on form before adding weight or volume.",
    };
  }

  if (
    last.target_hit &&
    last.average_effort > 0 &&
    last.average_effort <= 5
  ) {
    return {
      type: "increase_weight",
      label: "Increase Weight",
      tone: "emerald",
      message:
        "You reached the target with manageable effort and no meaningful pain.",
    };
  }

  if (
    last.target_hit &&
    last.average_effort >= 6 &&
    last.average_effort <= 7
  ) {
    return {
      type: "maintain",
      label: "Maintain",
      tone: "cyan",
      message:
        "The load is productive. Repeat it and improve control or rep quality.",
    };
  }

  if (last.target_hit && !last.average_effort) {
    return {
      type: "maintain_missing_effort",
      label: "Maintain for Now",
      tone: "cyan",
      message:
        "The target was completed, but effort data is missing. Log effort next time before progressing.",
    };
  }

  if (
    !last.target_hit &&
    last.average_effort >= 8
  ) {
    return {
      type: "reduce_weight",
      label: "Reduce Weight",
      tone: "rose",
      message:
        "The target was missed at high effort. Reduce the load or increase recovery time.",
    };
  }

  if (!last.target_hit) {
    return {
      type: "repeat_target",
      label: "Repeat the Target",
      tone: "amber",
      message:
        "Keep the current load and complete the planned rep range before progressing.",
    };
  }

  return {
    type: "maintain",
    label: "Maintain",
    tone: "cyan",
    message:
      "Repeat the current plan and keep collecting clean performance data.",
  };
}

export function buildExerciseKpis(history = []) {
  const sessions = (Array.isArray(history) ? history : [])
    .map((historyItem) => {
      const session = sessionFromHistoryItem(historyItem);

      if (!session) return null;

      return {
        historyItem,
        session,
        completed_at: completedAtForSession(session, historyItem),
      };
    })
    .filter(Boolean)
    .sort(sortSessionsNewestFirst);

  const occurrenceMap = new Map();

  sessions.forEach(({ historyItem, session }) => {
    const exercises = Array.isArray(session.exercises)
      ? session.exercises
      : [];

    exercises.forEach((exercise) => {
      const exerciseName =
        exercise.substituted && exercise.substitute_name
          ? exercise.substitute_name
          : exercise.name;

      const key = normalizeExerciseName(exerciseName);

      if (!key) return;

      const occurrence = buildExerciseOccurrence({
        exercise,
        session,
        historyItem,
        workoutName: session.workout_name || historyItem.workout_name || "Workout",
      });

      const current = occurrenceMap.get(key) || [];
      current.push(occurrence);
      occurrenceMap.set(key, current);
    });
  });

  return Array.from(occurrenceMap.entries())
    .map(([key, occurrences]) => {
      const sorted = [...occurrences].sort(sortSessionsNewestFirst);
      const completedOccurrences = sorted.filter(
        (occurrence) => !occurrence.skipped && occurrence.sets_completed > 0
      );

      const totalSets = completedOccurrences.reduce(
        (sum, occurrence) => sum + occurrence.sets_completed,
        0
      );

      const totalVolume = completedOccurrences.reduce(
        (sum, occurrence) => sum + occurrence.volume,
        0
      );

      const totalTargets = completedOccurrences.length;
      const targetsHit = completedOccurrences.filter(
        (occurrence) => occurrence.target_hit
      ).length;

      const painOccurrences = completedOccurrences.filter(
        (occurrence) => occurrence.maximum_pain >= 2
      ).length;

      const metric = {
        id: key.replace(/\s+/g, "-"),
        key,
        name: displayExerciseName(
          completedOccurrences[0]?.exercise_name ||
            sorted[0]?.exercise_name ||
            key
        ),
        sessions_completed: completedOccurrences.length,
        total_sets: totalSets,
        total_reps: completedOccurrences.reduce(
          (sum, occurrence) => sum + occurrence.reps_completed,
          0
        ),
        total_volume: totalVolume,
        best_weight: completedOccurrences.length
          ? Math.max(
              ...completedOccurrences.map(
                (occurrence) => occurrence.best_weight || 0
              )
            )
          : 0,
        best_session_volume: completedOccurrences.length
          ? Math.max(
              ...completedOccurrences.map(
                (occurrence) => occurrence.volume || 0
              )
            )
          : 0,
        average_effort: average(
          completedOccurrences.map(
            (occurrence) => occurrence.average_effort
          )
        ),
        average_set_seconds: average(
          completedOccurrences.map(
            (occurrence) => occurrence.average_set_seconds
          )
        ),
        target_hit_rate:
          totalTargets > 0
            ? Math.round((targetsHit / totalTargets) * 100)
            : 0,
        pain_frequency:
          totalTargets > 0
            ? Math.round((painOccurrences / totalTargets) * 100) / 100
            : 0,
        last_occurrence: completedOccurrences[0] || null,
        occurrences: sorted,
      };

      return {
        ...metric,
        recommendation: recommendationForExercise(metric),
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.last_occurrence?.completed_at || 0).getTime();
      const bTime = new Date(b.last_occurrence?.completed_at || 0).getTime();

      return bTime - aTime;
    });
}

export function buildWorkoutKpis(history = []) {
  const sessions = (Array.isArray(history) ? history : [])
    .map((historyItem) => {
      const session = sessionFromHistoryItem(historyItem);

      if (!session) return null;

      return {
        ...session,
        completed_at: completedAtForSession(session, historyItem),
      };
    })
    .filter(Boolean)
    .sort(sortSessionsNewestFirst);

  if (!sessions.length) {
    return {
      session_count: 0,
      total_training_seconds: 0,
      total_active_seconds: 0,
      total_rest_seconds: 0,
      total_idle_seconds: 0,
      total_sets: 0,
      total_volume: 0,
      active_ratio: 0,
      rest_ratio: 0,
      idle_ratio: 0,
      average_set_seconds: 0,
      average_effort: 0,
      completion_rate: 0,
      pain_session_rate: 0,
      recent_volume_change: 0,
      last_session: null,
    };
  }

  const totalTrainingSeconds = sessions.reduce(
    (sum, session) => sum + safeNumber(session.total_seconds),
    0
  );

  const totalActiveSeconds = sessions.reduce(
    (sum, session) => sum + safeNumber(session.active_seconds),
    0
  );

  const totalRestSeconds = sessions.reduce(
    (sum, session) => sum + safeNumber(session.rest_seconds),
    0
  );

  const totalIdleSeconds = sessions.reduce(
    (sum, session) => sum + safeNumber(session.idle_seconds),
    0
  );

  const allExercises = sessions.flatMap((session) =>
    Array.isArray(session.exercises) ? session.exercises : []
  );

  const allSets = allExercises.flatMap((exercise) =>
    Array.isArray(exercise.set_logs) ? exercise.set_logs : []
  );

  const totalVolume = allSets.reduce((sum, setLog) => {
    return (
      sum +
      safeNumber(setLog.reps) *
        safeNumber(setLog.weight)
    );
  }, 0);

  const plannedExercises = allExercises.filter(
    (exercise) => !exercise.skipped
  ).length;

  const completedExercises = allExercises.filter(
    (exercise) =>
      !exercise.skipped &&
      Array.isArray(exercise.set_logs) &&
      exercise.set_logs.length > 0
  ).length;

  const painSessions = sessions.filter((session) => {
    const sessionPain = safeNumber(session.pain_score);

    const exercisePain = (session.exercises || []).some(
      (exercise) =>
        safeNumber(exercise.pain_score) >= 2 ||
        (exercise.set_logs || []).some(
          (setLog) => safeNumber(setLog.pain_score) >= 2
        )
    );

    return sessionPain >= 2 || exercisePain;
  }).length;

  function sessionVolume(session) {
    return (session.exercises || [])
      .flatMap((exercise) => exercise.set_logs || [])
      .reduce(
        (sum, setLog) =>
          sum +
          safeNumber(setLog.reps) *
            safeNumber(setLog.weight),
        0
      );
  }

  const recentSessions = sessions.slice(0, 3);
  const previousSessions = sessions.slice(3, 6);

  const recentAverageVolume = average(
    recentSessions.map(sessionVolume)
  );

  const previousAverageVolume = average(
    previousSessions.map(sessionVolume)
  );

  const recentVolumeChange =
    previousAverageVolume > 0
      ? Math.round(
          ((recentAverageVolume - previousAverageVolume) /
            previousAverageVolume) *
            100
        )
      : 0;

  return {
    session_count: sessions.length,
    total_training_seconds: totalTrainingSeconds,
    total_active_seconds: totalActiveSeconds,
    total_rest_seconds: totalRestSeconds,
    total_idle_seconds: totalIdleSeconds,
    total_sets: allSets.length,
    total_volume: Math.round(totalVolume),
    active_ratio:
      totalTrainingSeconds > 0
        ? Math.round((totalActiveSeconds / totalTrainingSeconds) * 100)
        : 0,
    rest_ratio:
      totalTrainingSeconds > 0
        ? Math.round((totalRestSeconds / totalTrainingSeconds) * 100)
        : 0,
    idle_ratio:
      totalTrainingSeconds > 0
        ? Math.round((totalIdleSeconds / totalTrainingSeconds) * 100)
        : 0,
    average_set_seconds: average(
      allSets.map((setLog) => setLog.set_duration_seconds)
    ),
    average_effort: average(
      allSets.map((setLog) => setLog.ease_score)
    ),
    completion_rate:
      plannedExercises > 0
        ? Math.round((completedExercises / plannedExercises) * 100)
        : 0,
    pain_session_rate:
      sessions.length > 0
        ? Math.round((painSessions / sessions.length) * 100)
        : 0,
    recent_volume_change: recentVolumeChange,
    last_session: sessions[0] || null,
  };
}

export function buildReadinessKpi({
  snapshot = {},
  profile = {},
  workoutKpis = {},
}) {
  const sleepGoal = Math.max(
    1,
    safeNumber(
      snapshot?.sleep_plan?.sleep_goal_hours ||
        profile?.sleep_goal_hours ||
        8,
      8
    )
  );

  const sleepHours = safeNumber(
    snapshot.last_sleep_hours || snapshot.sleep_hours,
    0
  );

  const stepGoal = Math.max(
    1,
    safeNumber(snapshot.step_goal || profile.step_goal || 8000, 8000)
  );

  const steps = safeNumber(snapshot.steps, 0);

  const proteinGoal = Math.max(
    1,
    safeNumber(
      snapshot.protein_goal || profile.protein_goal || 150,
      150
    )
  );

  const protein = safeNumber(snapshot.protein_today, 0);

  const soreness = String(
    snapshot.soreness_score || snapshot.soreness || "Normal"
  ).toLowerCase();

  const lastPain = safeNumber(
    workoutKpis?.last_session?.pain_score ||
      snapshot?.last_workout_stats?.pain_score,
    0
  );

  const sleepScore = sleepHours
    ? clamp((sleepHours / sleepGoal) * 100)
    : 55;

  const movementScore = clamp((steps / stepGoal) * 100);
  const nutritionScore = clamp((protein / proteinGoal) * 100);

  let sorenessScore = 85;

  if (soreness.includes("painful")) sorenessScore = 30;
  else if (soreness.includes("high")) sorenessScore = 50;
  else if (soreness.includes("none")) sorenessScore = 100;

  const painScore =
    lastPain >= 4
      ? 25
      : lastPain >= 2
      ? 55
      : 100;

  const score = Math.round(
    sleepScore * 0.35 +
      sorenessScore * 0.2 +
      painScore * 0.2 +
      nutritionScore * 0.15 +
      movementScore * 0.1
  );

  let status = "Ready";
  let tone = "emerald";

  if (score < 55) {
    status = "Recovery";
    tone = "rose";
  } else if (score < 72) {
    status = "Maintain";
    tone = "amber";
  }

  return {
    score,
    status,
    tone,
    sleep_hours: sleepHours,
    sleep_goal: sleepGoal,
    step_progress: Math.round(clamp((steps / stepGoal) * 100)),
    protein_progress: Math.round(clamp((protein / proteinGoal) * 100)),
    pain_score: lastPain,
    soreness,
  };
}

export function buildHealthKpis({
  history = [],
  snapshot = {},
  profile = {},
}) {
  const workout = buildWorkoutKpis(history);
  const exercises = buildExerciseKpis(history);
  const readiness = buildReadinessKpi({
    snapshot,
    profile,
    workoutKpis: workout,
  });

  return {
    workout,
    exercises,
    readiness,
    generated_at: new Date().toISOString(),
  };
}

export function formatKpiNumber(value = 0) {
  return new Intl.NumberFormat().format(Math.round(safeNumber(value)));
}
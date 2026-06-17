// src/components/customer-health/healthWorkoutSession.js

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeNumber(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRestSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value || "").toLowerCase();
  const number = safeNumber(raw, 0);

  if (!number) return 60;
  if (raw.includes("min")) return number * 60;

  return number;
}

function normalizeExercise(exercise = {}, index = 0) {
  const plannedSets = exercise.planned_sets || exercise.sets || "3";
  const plannedReps = exercise.planned_reps || exercise.reps || "10";

  return {
    id: exercise.id || uid(`exercise_${index + 1}`),
    name: exercise.name || `Exercise ${index + 1}`,
    target: exercise.target || exercise.group || exercise.focus || "",
    equipment: exercise.equipment || "",
    planned_sets: plannedSets,
    planned_reps: plannedReps,
    planned_weight: exercise.weight || "",
    rest_seconds: normalizeRestSeconds(
      exercise.rest_seconds || exercise.rest || "60 sec"
    ),
    notes: exercise.notes || "",
    completed: false,
    skipped: false,
    substituted: false,
    substitute_name: "",
    pain_score: exercise.pain || "0",
    difficulty_score: exercise.difficulty || "Medium",
    set_logs: [],
  };
}

function findWorkoutForPlannerItem(plannerItem = {}, workouts = []) {
  if (!plannerItem || !Array.isArray(workouts)) return null;

  const workoutId = plannerItem.workout_id || plannerItem.id;
  const workoutName = String(plannerItem.workout_name || "").toLowerCase();

  return (
    workouts.find((workout) => workout.id && workout.id === workoutId) ||
    workouts.find(
      (workout) => String(workout.name || "").toLowerCase() === workoutName
    ) ||
    null
  );
}

function getExercisesForPlannerItem(plannerItem = {}, workouts = []) {
  if (Array.isArray(plannerItem.exercises) && plannerItem.exercises.length) {
    return plannerItem.exercises;
  }

  const matchedWorkout = findWorkoutForPlannerItem(plannerItem, workouts);

  if (
    matchedWorkout &&
    Array.isArray(matchedWorkout.exercises) &&
    matchedWorkout.exercises.length
  ) {
    return matchedWorkout.exercises;
  }

  return [
    {
      name: plannerItem.workout_name || "Workout Warm-Up",
      sets: "1",
      reps: "5 min",
      rest: "30 sec",
      notes: "Start controlled and log how the body feels.",
      difficulty: "Medium",
      pain: "0",
    },
  ];
}

export function createWorkoutSessionFromPlannerItem({
  plannerItem,
  workouts = [],
}) {
  const safePlannerItem = plannerItem || {};
  const exercises = getExercisesForPlannerItem(safePlannerItem, workouts);

  return {
    id: uid("session"),
    planner_item_id: safePlannerItem.id || "",
    workout_id: safePlannerItem.workout_id || safePlannerItem.id || "",
    workout_name:
      safePlannerItem.workout_name ||
      safePlannerItem.title ||
      safePlannerItem.name ||
      "Active Workout",
    day_label: safePlannerItem.day_label || "",
    ymd: safePlannerItem.ymd || "",
    source: safePlannerItem.source || "planner",
    status: "active",
    started_at: nowIso(),
    finished_at: "",
    saved_at: "",
    edited_after_finish_at: "",
    paused: false,
    rest_active: false,
    current_exercise_index: 0,
    active_seconds: 0,
    rest_seconds: 0,
    idle_seconds: 0,
    longest_rest_seconds: 0,
    total_seconds: 0,
    completed_sets: 0,
    skipped_exercises: 0,
    substituted_exercises: 0,
    pain_score: "0",
    difficulty_score: "Medium",
    energy_score: "",
    soreness_score: "",
    notes: "",
    review_acknowledged: false,
    exercises: exercises.map((exercise, index) =>
      normalizeExercise(exercise, index)
    ),
  };
}

export function updateSessionTimer(session = {}, mode = "active") {
  const next = {
    ...session,
    total_seconds: safeNumber(session.total_seconds) + 1,
  };

  if (session.paused) {
    next.idle_seconds = safeNumber(session.idle_seconds) + 1;
    return next;
  }

  if (mode === "rest" || session.rest_active) {
    const nextRest = safeNumber(session.rest_seconds) + 1;

    next.rest_seconds = nextRest;
    next.longest_rest_seconds = Math.max(
      safeNumber(session.longest_rest_seconds),
      nextRest
    );

    return next;
  }

  next.active_seconds = safeNumber(session.active_seconds) + 1;
  return next;
}

export function toggleSessionPause(session = {}) {
  return {
    ...session,
    paused: !session.paused,
    rest_active: false,
  };
}

export function toggleRestTimer(session = {}) {
  return {
    ...session,
    paused: false,
    rest_active: !session.rest_active,
  };
}

export function moveToExercise(session = {}, index = 0) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];
  const nextIndex = Math.max(0, Math.min(index, safeExercises.length - 1));

  return {
    ...session,
    current_exercise_index: nextIndex,
    rest_active: false,
  };
}

export function addSetToExercise(session = {}, exerciseId, setLog = {}) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const nextExercises = safeExercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    const nextSet = {
      id: uid("set"),
      reps: setLog.reps || exercise.planned_reps || "",
      weight: setLog.weight || exercise.planned_weight || "",
      completed: true,
      logged_at: nowIso(),
    };

    return {
      ...exercise,
      completed: true,
      skipped: false,
      set_logs: [...(exercise.set_logs || []), nextSet],
    };
  });

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,
    rest_active: true,
  });
}

export function updateExerciseField(session = {}, exerciseId, field, value) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const nextExercises = safeExercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    return {
      ...exercise,
      [field]: value,
    };
  });

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,
  });
}

export function updateSetField(session = {}, exerciseId, setId, field, value) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const nextExercises = safeExercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    return {
      ...exercise,
      set_logs: (exercise.set_logs || []).map((setLog) => {
        if (setLog.id !== setId) return setLog;

        return {
          ...setLog,
          [field]: value,
        };
      }),
    };
  });

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,
  });
}

export function removeSetFromExercise(session = {}, exerciseId, setId) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const nextExercises = safeExercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    const nextSetLogs = (exercise.set_logs || []).filter(
      (setLog) => setLog.id !== setId
    );

    return {
      ...exercise,
      completed: nextSetLogs.length > 0,
      set_logs: nextSetLogs,
    };
  });

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,
  });
}

export function markExerciseSkipped(session = {}, exerciseId) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const nextExercises = safeExercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    return {
      ...exercise,
      skipped: !exercise.skipped,
      completed: exercise.skipped ? exercise.completed : false,
      set_logs: exercise.skipped ? exercise.set_logs || [] : [],
    };
  });

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,
    rest_active: false,
  });
}

export function markExerciseSubstituted(session = {}, exerciseId, value = "") {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const cleanValue = String(value || "").trim();

  const nextExercises = safeExercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    return {
      ...exercise,
      substituted: !!cleanValue,
      substitute_name: cleanValue,
    };
  });

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,
  });
}

export function recalcSessionStats(session = {}) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const completedSets = safeExercises.reduce(
    (total, exercise) => total + (exercise.set_logs || []).length,
    0
  );

  const skippedExercises = safeExercises.filter(
    (exercise) => exercise.skipped
  ).length;

  const substitutedExercises = safeExercises.filter(
    (exercise) => exercise.substituted
  ).length;

  return {
    ...session,
    completed_sets: completedSets,
    skipped_exercises: skippedExercises,
    substituted_exercises: substitutedExercises,
  };
}

export function validateWorkoutSessionForFinish(session = {}) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const missing = [];
  const warnings = [];

  const untouchedExercises = safeExercises.filter(
    (exercise) =>
      !exercise.skipped &&
      !exercise.completed &&
      (!Array.isArray(exercise.set_logs) || exercise.set_logs.length === 0)
  );

  const exercisesWithoutPain = safeExercises.filter(
    (exercise) =>
      !exercise.skipped &&
      (exercise.pain_score === "" ||
        exercise.pain_score === null ||
        exercise.pain_score === undefined)
  );

  const exercisesWithoutDifficulty = safeExercises.filter(
    (exercise) =>
      !exercise.skipped &&
      !String(exercise.difficulty_score || "").trim()
  );

  const substitutedWithoutName = safeExercises.filter(
    (exercise) => exercise.substituted && !String(exercise.substitute_name || "").trim()
  );

  if (safeNumber(session.completed_sets) <= 0) {
    missing.push({
      id: "no_sets",
      label: "No sets have been logged yet.",
      severity: "important",
    });
  }

  if (untouchedExercises.length > 0) {
    missing.push({
      id: "untouched_exercises",
      label: `${untouchedExercises.length} exercise${
        untouchedExercises.length === 1 ? "" : "s"
      } still need sets logged or need to be marked skipped.`,
      severity: "important",
      items: untouchedExercises.map((exercise) => exercise.name),
    });
  }

  if (!String(session.energy_score || "").trim()) {
    missing.push({
      id: "energy",
      label: "Energy score is not filled out.",
      severity: "normal",
    });
  }

  if (!String(session.soreness_score || "").trim()) {
    missing.push({
      id: "soreness",
      label: "Soreness score is not filled out.",
      severity: "normal",
    });
  }

  if (!String(session.difficulty_score || "").trim()) {
    missing.push({
      id: "difficulty",
      label: "Overall difficulty score is not filled out.",
      severity: "normal",
    });
  }

  if (
    session.pain_score === "" ||
    session.pain_score === null ||
    session.pain_score === undefined
  ) {
    missing.push({
      id: "pain",
      label: "Overall pain score is not filled out.",
      severity: "normal",
    });
  }

  if (exercisesWithoutPain.length > 0) {
    warnings.push({
      id: "exercise_pain",
      label: `${exercisesWithoutPain.length} exercise${
        exercisesWithoutPain.length === 1 ? "" : "s"
      } do not have pain scores.`,
      items: exercisesWithoutPain.map((exercise) => exercise.name),
    });
  }

  if (exercisesWithoutDifficulty.length > 0) {
    warnings.push({
      id: "exercise_difficulty",
      label: `${exercisesWithoutDifficulty.length} exercise${
        exercisesWithoutDifficulty.length === 1 ? "" : "s"
      } do not have difficulty scores.`,
      items: exercisesWithoutDifficulty.map((exercise) => exercise.name),
    });
  }

  if (substitutedWithoutName.length > 0) {
    warnings.push({
      id: "substitution_name",
      label: "A substituted exercise is missing the replacement name.",
      items: substitutedWithoutName.map((exercise) => exercise.name),
    });
  }

  if (!String(session.notes || "").trim()) {
    warnings.push({
      id: "notes",
      label:
        "Workout notes are empty. A quick note helps the coach adjust your next plan.",
    });
  }

  return {
    canFinish: true,
    missing,
    warnings,
    hasIssues: missing.length > 0 || warnings.length > 0,
    importantCount: missing.filter((item) => item.severity === "important")
      .length,
  };
}

export function formatSeconds(totalSeconds = 0) {
  const total = Math.max(0, safeNumber(totalSeconds, 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const pad = (value) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(seconds)}`;
}

export function buildWorkoutSummary(session = {}) {
  const safeExercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  const completedExercises = safeExercises.filter(
    (exercise) => exercise.completed
  ).length;

  return {
    workout_name: session.workout_name || "Workout",
    started_at: session.started_at || "",
    finished_at: session.finished_at || "",
    saved_at: session.saved_at || "",
    edited_after_finish_at: session.edited_after_finish_at || "",
    total_seconds: safeNumber(session.total_seconds),
    active_seconds: safeNumber(session.active_seconds),
    rest_seconds: safeNumber(session.rest_seconds),
    idle_seconds: safeNumber(session.idle_seconds),
    longest_rest_seconds: safeNumber(session.longest_rest_seconds),
    completed_sets: safeNumber(session.completed_sets),
    completed_exercises: completedExercises,
    skipped_exercises: safeNumber(session.skipped_exercises),
    substituted_exercises: safeNumber(session.substituted_exercises),
    pain_score: session.pain_score || "0",
    difficulty_score: session.difficulty_score || "Medium",
    energy_score: session.energy_score || "",
    soreness_score: session.soreness_score || "",
    notes: session.notes || "",
  };
}

function updatePlannerItemStatus(weekPlan = [], plannerItemId = "") {
  if (!Array.isArray(weekPlan)) return [];

  return weekPlan.map((item) => {
    if (!plannerItemId || item.id !== plannerItemId) return item;

    return {
      ...item,
      status: "Completed",
      completed_at: nowIso(),
    };
  });
}

export function finishWorkoutSession({
  session,
  snapshot = {},
  history = [],
}) {
  const finishedSession = recalcSessionStats({
    ...session,
    status: "completed",
    finished_at: session.finished_at || nowIso(),
    saved_at: nowIso(),
    paused: false,
    rest_active: false,
    review_acknowledged: true,
  });

  const summary = buildWorkoutSummary(finishedSession);

  const historyEntry = {
    id: uid("history"),
    type: "workout_session",
    source: "active_workout_session",
    ymd: finishedSession.ymd || "",
    workout_name: finishedSession.workout_name || "Workout",
    workout_id: finishedSession.workout_id || "",
    planner_item_id: finishedSession.planner_item_id || "",
    completed_at: finishedSession.finished_at,
    summary,
    session: finishedSession,
  };

  const nextHistory = [historyEntry, ...(Array.isArray(history) ? history : [])];

  const nextWeekPlan = updatePlannerItemStatus(
    snapshot.week_plan,
    finishedSession.planner_item_id
  );

  const nextSnapshot = {
    ...snapshot,
    week_plan: nextWeekPlan,
    last_completed_workout: finishedSession.workout_name || "Workout",
    last_completed_at: finishedSession.finished_at,
    last_workout_stats: summary,
    last_workout_session: finishedSession,
    weekly_completed: nextHistory.length,
    completed_workouts: safeNumber(snapshot.completed_workouts) + 1,
    updated_at: nowIso(),
  };

  return {
    finishedSession,
    summary,
    historyEntry,
    nextHistory,
    nextSnapshot,
  };
}

export function updateCompletedWorkoutSession({
  session,
  snapshot = {},
  history = [],
}) {
  const editedSession = recalcSessionStats({
    ...session,
    status: "completed",
    edited_after_finish_at: nowIso(),
    saved_at: session.saved_at || nowIso(),
    paused: false,
    rest_active: false,
  });

  const summary = buildWorkoutSummary(editedSession);

  const nextHistory = Array.isArray(history)
    ? history.map((item, index) => {
        const sameSession =
          item?.session?.id && item.session.id === editedSession.id;
        const samePlanner =
          item?.planner_item_id &&
          item.planner_item_id === editedSession.planner_item_id;

        if (sameSession || (!sameSession && samePlanner && index === 0)) {
          return {
            ...item,
            workout_name: editedSession.workout_name || item.workout_name,
            summary,
            session: editedSession,
            edited_after_finish_at: editedSession.edited_after_finish_at,
          };
        }

        return item;
      })
    : [];

  const nextSnapshot = {
    ...snapshot,
    last_completed_workout: editedSession.workout_name || "Workout",
    last_completed_at: editedSession.finished_at,
    last_workout_stats: summary,
    last_workout_session: editedSession,
    updated_at: nowIso(),
  };

  return {
    editedSession,
    summary,
    nextHistory,
    nextSnapshot,
  };
}
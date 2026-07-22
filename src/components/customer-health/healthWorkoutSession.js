// src/components/customer-health/healthWorkoutSession.js

import { buildExercisesForWorkoutName } from "./healthExerciseKnowledge";
import {
  classifyWorkout,
  ymdFromIso,
} from "./healthTrainingClassification";

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function cleanValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizeRestSeconds(value) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(0, value);
  }

  const raw = String(value || "").toLowerCase();
  const number = safeNumber(raw, 0);

  if (!number) return 60;
  if (raw.includes("min")) return number * 60;

  return number;
}

function plannedSetCount(exercise = {}) {
  return Math.max(
    0,
    safeNumber(
      exercise.planned_sets ||
        exercise.sets,
      0
    )
  );
}

function normalizeSetLog(
  setLog = {},
  exercise = {},
  index = 0
) {
  const plannedWeight =
    setLog.planned_weight ??
    exercise.planned_weight ??
    exercise.weight ??
    "";

  const plannedReps =
    setLog.planned_reps ??
    exercise.planned_reps ??
    exercise.reps ??
    "";

  const targetWeight =
    setLog.target_weight ??
    setLog.actual_weight ??
    setLog.weight ??
    plannedWeight;

  const targetReps =
    setLog.target_reps ??
    setLog.actual_reps ??
    setLog.reps ??
    plannedReps;

  const actualWeight =
    setLog.actual_weight ??
    setLog.weight ??
    targetWeight;

  const actualReps =
    setLog.actual_reps ??
    setLog.reps ??
    targetReps;

  const rpe =
    setLog.rpe ??
    setLog.ease_score ??
    "";

  return {
    ...setLog,

    id:
      setLog.id ||
      uid(`set_${index + 1}`),

    set_number:
      setLog.set_number ||
      index + 1,

    planned_weight: cleanValue(
      plannedWeight
    ),

    planned_reps: cleanValue(
      plannedReps
    ),

    target_weight: cleanValue(
      targetWeight
    ),

    target_reps: cleanValue(
      targetReps
    ),

    actual_weight: cleanValue(
      actualWeight
    ),

    actual_reps: cleanValue(
      actualReps
    ),

    // Backwards compatibility.
    weight: cleanValue(actualWeight),
    reps: cleanValue(actualReps),

    rpe: cleanValue(rpe),
    ease_score: cleanValue(rpe),

    form_quality:
      setLog.form_quality || "",

    set_type:
      setLog.set_type === "warmup"
        ? "warmup"
        : "working",

    reached_failure:
      Boolean(setLog.reached_failure),

    copied_from_set_id:
      setLog.copied_from_set_id || "",
    pain_score:
      setLog.pain_score ??
      exercise.pain_score ??
      "0",

    set_duration_seconds:
      safeNumber(
        setLog.set_duration_seconds,
        0
      ),

    rest_after_seconds:
      safeNumber(
        setLog.rest_after_seconds,
        0
      ),

    weight_changed_manually:
      Boolean(
        setLog.weight_changed_manually
      ),

    reps_changed_manually:
      Boolean(
        setLog.reps_changed_manually
      ),

    adjustment_source:
      setLog.adjustment_source ||
      "",

    previous_target_weight:
      cleanValue(
        setLog.previous_target_weight
      ),

    previous_target_reps:
      cleanValue(
        setLog.previous_target_reps
      ),

    weight_change_amount:
      safeNumber(
        setLog.weight_change_amount,
        0
      ),

    reps_change_amount:
      safeNumber(
        setLog.reps_change_amount,
        0
      ),

    recommendation:
      setLog.recommendation || null,

    recommendation_accepted:
      Boolean(
        setLog.recommendation_accepted
      ),

    recommendation_overridden:
      Boolean(
        setLog.recommendation_overridden
      ),

    recommendation_decision:
      setLog.recommendation_decision ||
      "",

    recommendation_decided_at:
      setLog.recommendation_decided_at ||
      "",

    edit_history:
      Array.isArray(setLog.edit_history)
        ? setLog.edit_history
        : [],

    completed:
      setLog.completed !== false,

    started_at:
      setLog.started_at || "",

    completed_at:
      setLog.completed_at || "",

    logged_at:
      setLog.logged_at || "",
  };
}

function normalizeExercise(
  exercise = {},
  index = 0
) {
  const plannedSets =
    exercise.planned_sets ||
    exercise.sets ||
    "3";

  const plannedReps =
    exercise.planned_reps ||
    exercise.reps ||
    "10";

  const plannedWeight =
    exercise.planned_weight ||
    exercise.weight ||
    exercise.load ||
    "";

  const currentTargetWeight =
    exercise.current_target_weight ??
    plannedWeight;

  const currentTargetReps =
    exercise.current_target_reps ??
    plannedReps;

  const logs = Array.isArray(
    exercise.set_logs
  )
    ? exercise.set_logs.map(
        (setLog, setIndex) =>
          normalizeSetLog(
            setLog,
            exercise,
            setIndex
          )
      )
    : [];

  return {
    id:
      exercise.id ||
      uid(`exercise_${index + 1}`),

    name:
      exercise.name ||
      `Exercise ${index + 1}`,

    target:
      exercise.target ||
      exercise.group ||
      exercise.focus ||
      "",

    equipment:
      exercise.equipment || "",

    planned_sets: plannedSets,
    planned_reps: plannedReps,
    planned_weight: plannedWeight,

    current_target_weight:
      cleanValue(currentTargetWeight),

    current_target_reps:
      cleanValue(currentTargetReps),

    target_adjustment_source:
      exercise.target_adjustment_source ||
      "",

    target_adjusted_at:
      exercise.target_adjusted_at ||
      "",

    last_recommendation:
      exercise.last_recommendation ||
      null,

    recommendation_history:
      Array.isArray(
        exercise.recommendation_history
      )
        ? exercise.recommendation_history
        : [],

    rest_seconds:
      normalizeRestSeconds(
        exercise.rest_seconds ||
          exercise.rest ||
          "60 sec"
      ),

    notes:
      exercise.notes || "",

    completed:
      Boolean(exercise.completed),

    skipped:
      Boolean(exercise.skipped),

    substituted:
      Boolean(exercise.substituted),

    substitute_name:
      exercise.substitute_name || "",

    pain_score:
      exercise.pain_score ??
      exercise.pain ??
      "0",

    difficulty_score:
      exercise.difficulty_score ||
      exercise.difficulty ||
      "Medium",

    set_logs: logs,
  };
}

function findWorkoutForPlannerItem(
  plannerItem = {},
  workouts = []
) {
  if (
    !plannerItem ||
    !Array.isArray(workouts)
  ) {
    return null;
  }

  const workoutId =
    plannerItem.workout_id ||
    plannerItem.id;

  const workoutName = String(
    plannerItem.workout_name || ""
  ).toLowerCase();

  return (
    workouts.find(
      (workout) =>
        workout.id &&
        workout.id === workoutId
    ) ||
    workouts.find(
      (workout) =>
        String(
          workout.name || ""
        ).toLowerCase() === workoutName
    ) ||
    null
  );
}

function getExercisesForPlannerItem(
  plannerItem = {},
  workouts = []
) {
  if (
    Array.isArray(
      plannerItem.exercises
    ) &&
    plannerItem.exercises.length
  ) {
    return plannerItem.exercises;
  }

  const matchedWorkout =
    findWorkoutForPlannerItem(
      plannerItem,
      workouts
    );

  if (
    matchedWorkout &&
    Array.isArray(
      matchedWorkout.exercises
    ) &&
    matchedWorkout.exercises.length
  ) {
    return matchedWorkout.exercises;
  }

  return buildExercisesForWorkoutName(
    plannerItem.workout_name ||
      plannerItem.title ||
      plannerItem.name ||
      ""
  );
}

function activeExerciseForSession(
  session = {}
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  return (
    exercises[
      session.current_exercise_index || 0
    ] ||
    exercises.find(
      (exercise) =>
        exercise.id ===
        session.active_exercise_id
    ) ||
    exercises[0] ||
    null
  );
}

function getExerciseById(
  session = {},
  exerciseId
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  return (
    exercises.find(
      (exercise) =>
        exercise.id === exerciseId
    ) || null
  );
}

function nextSetNumber(exercise = {}) {
  return (
    (
      Array.isArray(exercise.set_logs)
        ? exercise.set_logs.length
        : 0
    ) + 1
  );
}

function resolveTargetWeight(
  exercise = {},
  setLog = {}
) {
  return cleanValue(
    setLog.target_weight ??
      exercise.current_target_weight ??
      exercise.planned_weight ??
      ""
  );
}

function resolveTargetReps(
  exercise = {},
  setLog = {}
) {
  return cleanValue(
    setLog.target_reps ??
      exercise.current_target_reps ??
      exercise.planned_reps ??
      ""
  );
}

function createSetRecord({
  exercise,
  setLog = {},
  setNumber,
  duration,
  startedAt,
}) {
  const plannedWeight =
    cleanValue(
      setLog.planned_weight ??
        exercise.planned_weight ??
        ""
    );

  const plannedReps =
    cleanValue(
      setLog.planned_reps ??
        exercise.planned_reps ??
        ""
    );

  const targetWeight =
    resolveTargetWeight(
      exercise,
      setLog
    );

  const targetReps =
    resolveTargetReps(
      exercise,
      setLog
    );

  const actualWeight =
    cleanValue(
      setLog.actual_weight ??
        setLog.weight ??
        targetWeight
    );

  const actualReps =
    cleanValue(
      setLog.actual_reps ??
        setLog.reps ??
        targetReps
    );

  const rpe =
    cleanValue(
      setLog.rpe ??
        setLog.ease_score ??
        ""
    );

  const plannedWeightNumber =
    safeNumber(plannedWeight, 0);

  const targetWeightNumber =
    safeNumber(targetWeight, 0);

  const plannedRepsNumber =
    safeNumber(plannedReps, 0);

  const targetRepsNumber =
    safeNumber(targetReps, 0);

  const weightChanged =
    setLog.weight_changed_manually ??
    (
      plannedWeightNumber > 0 &&
      targetWeightNumber > 0 &&
      plannedWeightNumber !==
        targetWeightNumber
    );

  const repsChanged =
    setLog.reps_changed_manually ??
    (
      plannedRepsNumber > 0 &&
      targetRepsNumber > 0 &&
      plannedRepsNumber !==
        targetRepsNumber
    );

  return {
    id: uid("set"),
    set_number: setNumber,

    planned_weight: plannedWeight,
    planned_reps: plannedReps,

    target_weight: targetWeight,
    target_reps: targetReps,

    actual_weight: actualWeight,
    actual_reps: actualReps,

    // Backwards compatibility.
    weight: actualWeight,
    reps: actualReps,

    rpe,
    ease_score: rpe,

    form_quality:
      setLog.form_quality || "",

    set_type:
      setLog.set_type === "warmup"
        ? "warmup"
        : "working",

    reached_failure:
      Boolean(setLog.reached_failure),

    copied_from_set_id:
      setLog.copied_from_set_id || "",
    pain_score:
      setLog.pain_score ??
      exercise.pain_score ??
      "0",

    set_duration_seconds:
      Math.max(0, duration),

    rest_after_seconds:
      safeNumber(
        setLog.rest_after_seconds,
        0
      ),

    weight_changed_manually:
      Boolean(weightChanged),

    reps_changed_manually:
      Boolean(repsChanged),

    adjustment_source:
      setLog.adjustment_source ||
      (
        weightChanged ||
        repsChanged
          ? "user"
          : ""
      ),

    previous_target_weight:
      cleanValue(
        setLog.previous_target_weight
      ),

    previous_target_reps:
      cleanValue(
        setLog.previous_target_reps
      ),

    weight_change_amount:
      targetWeightNumber &&
      plannedWeightNumber
        ? targetWeightNumber -
          plannedWeightNumber
        : 0,

    reps_change_amount:
      targetRepsNumber &&
      plannedRepsNumber
        ? targetRepsNumber -
          plannedRepsNumber
        : 0,

    recommendation:
      setLog.recommendation || null,

    recommendation_accepted:
      Boolean(
        setLog.recommendation_accepted
      ),

    recommendation_overridden:
      Boolean(
        setLog.recommendation_overridden
      ),

    recommendation_decision:
      setLog.recommendation_decision ||
      "",

    recommendation_decided_at:
      setLog.recommendation_decided_at ||
      "",

    edit_history: [],

    started_at:
      startedAt || "",

    completed_at:
      nowIso(),

    logged_at:
      nowIso(),

    completed: true,
  };
}

export function createWorkoutSessionFromPlannerItem({
  plannerItem,
  workouts = [],
}) {
  const safePlannerItem =
    plannerItem || {};

  const exercises =
    getExercisesForPlannerItem(
      safePlannerItem,
      workouts
    );

  const workoutClassification =
    classifyWorkout({
      ...safePlannerItem,
      exercises,
    });

  return {
    id: uid("session"),

    planner_item_id:
      safePlannerItem.id || "",

    workout_id:
      safePlannerItem.workout_id ||
      safePlannerItem.id ||
      "",

    workout_name:
      safePlannerItem.workout_name ||
      safePlannerItem.title ||
      safePlannerItem.name ||
      "Active Workout",

    original_workout_name:
      safePlannerItem.original_workout_name ||
      safePlannerItem.workout_name ||
      safePlannerItem.title ||
      safePlannerItem.name ||
      "Active Workout",

    scientific_title:
      safePlannerItem.scientific_title ||
      workoutClassification.scientific_title,

    training_category:
      safePlannerItem.training_category ||
      workoutClassification.training_category,

    body_region:
      safePlannerItem.body_region ||
      workoutClassification.body_region,

    movement_pattern:
      safePlannerItem.movement_pattern ||
      workoutClassification.movement_pattern,

    primary_muscles:
      Array.isArray(safePlannerItem.primary_muscles)
        ? safePlannerItem.primary_muscles
        : workoutClassification.primary_muscles,

    secondary_muscles:
      Array.isArray(safePlannerItem.secondary_muscles)
        ? safePlannerItem.secondary_muscles
        : workoutClassification.secondary_muscles,

    planned_date:
      safePlannerItem.planned_date ||
      safePlannerItem.ymd ||
      "",

    session_number:
      Math.max(
        1,
        Number(
          safePlannerItem.session_number ||
            safePlannerItem.session_number_for_day ||
            1
        )
      ),

    multiple_sessions_today:
      Boolean(
        safePlannerItem.multiple_sessions_today
      ),

    available_minutes:
      Number(
        safePlannerItem.available_minutes ||
          safePlannerItem.requested_duration_minutes ||
          0
      ),

    day_label:
      safePlannerItem.day_label || "",

    ymd:
      safePlannerItem.ymd || "",

    source:
      safePlannerItem.source ||
      "planner",

    status: "active",
    started_at: nowIso(),
    finished_at: "",
    saved_at: "",
    edited_after_finish_at: "",

    paused: false,

    set_active: false,
    active_exercise_id: "",
    active_set_started_at: "",
    current_set_seconds: 0,

    rest_active: false,
    rest_target_seconds: 0,
    rest_remaining_seconds: 0,
    current_rest_seconds: 0,
    rest_started_at: "",
    rest_completed_at: "",
    last_rest_seconds: 0,
    rest_overrun_seconds: 0,

    current_exercise_index: 0,

    total_seconds: 0,
    active_seconds: 0,
    rest_seconds: 0,
    idle_seconds: 0,
    longest_rest_seconds: 0,

    completed_sets: 0,
    skipped_exercises: 0,
    substituted_exercises: 0,

    average_ease_score: "",
    average_rpe: "",
    average_set_seconds: 0,

    accepted_recommendations: 0,
    overridden_recommendations: 0,

    pain_score: "0",
    difficulty_score: "Medium",
    energy_score: "",
    soreness_score: "",
    notes: "",
    review_acknowledged: false,

    exercises: exercises.map(
      (exercise, index) =>
        normalizeExercise(
          exercise,
          index
        )
    ),
  };
}

export function updateSessionTimer(
  session = {}
) {
  if (
    session.status !== "active"
  ) {
    return session;
  }

  const next = {
    ...session,
    total_seconds:
      safeNumber(
        session.total_seconds
      ) + 1,
  };

  if (session.paused) {
    next.idle_seconds =
      safeNumber(
        session.idle_seconds
      ) + 1;

    return next;
  }

  if (session.set_active) {
    next.active_seconds =
      safeNumber(
        session.active_seconds
      ) + 1;

    next.current_set_seconds =
      safeNumber(
        session.current_set_seconds
      ) + 1;

    return next;
  }

  if (session.rest_active) {
    const currentRest =
      safeNumber(
        session.current_rest_seconds
      ) + 1;

    const cumulativeRest =
      safeNumber(
        session.rest_seconds
      ) + 1;

    const targetRest =
      safeNumber(
        session.rest_target_seconds
      );

    const remaining =
      targetRest > 0
        ? Math.max(
            0,
            targetRest - currentRest
          )
        : 0;

    next.current_rest_seconds =
      currentRest;

    next.rest_seconds =
      cumulativeRest;

    next.rest_remaining_seconds =
      remaining;

    next.rest_overrun_seconds =
      targetRest > 0
        ? Math.max(
            0,
            currentRest - targetRest
          )
        : 0;

    next.longest_rest_seconds =
      Math.max(
        safeNumber(
          session.longest_rest_seconds
        ),
        currentRest
      );

    return next;
  }

  next.idle_seconds =
    safeNumber(
      session.idle_seconds
    ) + 1;

  return next;
}

export function advanceSessionTimer(
  session = {},
  elapsedSeconds = 0
) {
  if (session.status !== "active") {
    return session;
  }

  const elapsed = Math.max(
    0,
    Math.min(
      21600,
      Math.floor(safeNumber(elapsedSeconds, 0))
    )
  );

  if (!elapsed) return session;

  const next = {
    ...session,
    total_seconds:
      safeNumber(session.total_seconds) + elapsed,
  };

  if (session.paused) {
    next.idle_seconds =
      safeNumber(session.idle_seconds) + elapsed;

    return next;
  }

  if (session.set_active) {
    next.active_seconds =
      safeNumber(session.active_seconds) + elapsed;

    next.current_set_seconds =
      safeNumber(session.current_set_seconds) + elapsed;

    return next;
  }

  if (session.rest_active) {
    const currentRest =
      safeNumber(session.current_rest_seconds) + elapsed;

    const cumulativeRest =
      safeNumber(session.rest_seconds) + elapsed;

    const targetRest = safeNumber(
      session.rest_target_seconds
    );

    next.current_rest_seconds = currentRest;
    next.rest_seconds = cumulativeRest;
    next.rest_remaining_seconds =
      targetRest > 0
        ? Math.max(0, targetRest - currentRest)
        : 0;

    next.rest_overrun_seconds =
      targetRest > 0
        ? Math.max(0, currentRest - targetRest)
        : 0;

    next.longest_rest_seconds = Math.max(
      safeNumber(session.longest_rest_seconds),
      currentRest
    );

    return next;
  }

  next.idle_seconds =
    safeNumber(session.idle_seconds) + elapsed;

  return next;
}

export function startActiveSet(
  session = {},
  exerciseId
) {
  if (
    !exerciseId ||
    session.status !== "active"
  ) {
    return session;
  }

  return {
    ...session,
    paused: false,

    rest_active: false,
    rest_remaining_seconds: 0,

    last_rest_seconds:
      session.rest_active
        ? safeNumber(
            session.current_rest_seconds
          )
        : safeNumber(
            session.last_rest_seconds
          ),

    rest_completed_at:
      session.rest_active
        ? nowIso()
        : session.rest_completed_at ||
          "",

    set_active: true,
    active_exercise_id:
      exerciseId,

    active_set_started_at:
      nowIso(),

    current_set_seconds: 0,
  };
}

export function stopActiveSet(
  session = {}
) {
  if (!session.set_active) {
    return session;
  }

  return {
    ...session,
    set_active: false,
    active_exercise_id: "",
    active_set_started_at: "",
    current_set_seconds: 0,
  };
}

export function startRestTimer(
  session = {},
  targetSeconds
) {
  const currentExercise =
    activeExerciseForSession(session);

  const target = Math.max(
    0,
    safeNumber(
      targetSeconds ||
        currentExercise?.rest_seconds ||
        session.rest_target_seconds ||
        60,
      60
    )
  );

  return {
    ...session,
    paused: false,

    set_active: false,
    active_exercise_id: "",
    active_set_started_at: "",
    current_set_seconds: 0,

    rest_active: target > 0,
    rest_target_seconds: target,
    rest_remaining_seconds: target,
    current_rest_seconds: 0,

    rest_started_at:
      target > 0
        ? nowIso()
        : "",

    rest_completed_at: "",
    rest_overrun_seconds: 0,
  };
}

export function stopRestTimer(
  session = {}
) {
  if (!session.rest_active) {
    return session;
  }

  return {
    ...session,
    rest_active: false,
    rest_remaining_seconds: 0,
    rest_completed_at: nowIso(),

    last_rest_seconds:
      safeNumber(
        session.current_rest_seconds
      ),
  };
}

export function toggleRestTimer(
  session = {}
) {
  if (session.rest_active) {
    return stopRestTimer(session);
  }

  return startRestTimer(session);
}

export function toggleSessionPause(
  session = {}
) {
  if (session.paused) {
    return {
      ...session,
      paused: false,
    };
  }

  return {
    ...session,
    paused: true,

    set_active: false,
    active_exercise_id: "",
    active_set_started_at: "",
    current_set_seconds: 0,

    rest_active: false,
    rest_remaining_seconds: 0,

    rest_completed_at:
      session.rest_active
        ? nowIso()
        : session.rest_completed_at ||
          "",

    last_rest_seconds:
      session.rest_active
        ? safeNumber(
            session.current_rest_seconds
          )
        : safeNumber(
            session.last_rest_seconds
          ),
  };
}

export function completeActiveSet(
  session = {},
  exerciseId,
  setLog = {}
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  const targetExerciseId =
    exerciseId ||
    session.active_exercise_id ||
    exercises[0]?.id;

  if (!targetExerciseId) {
    return session;
  }

  const duration = Math.max(
    1,
    safeNumber(
      setLog.set_duration_seconds ||
        session.current_set_seconds,
      1
    )
  );

  let completedExercise = null;

  const nextExercises =
    exercises.map((exercise) => {
      if (
        exercise.id !==
        targetExerciseId
      ) {
        return exercise;
      }

      const normalizedExercise =
        normalizeExercise(exercise);

      const setRecord =
        createSetRecord({
          exercise:
            normalizedExercise,

          setLog,

          setNumber:
            nextSetNumber(
              normalizedExercise
            ),

          duration,

          startedAt:
            session.active_set_started_at ||
            "",
        });

      const nextSetLogs = [
        ...normalizedExercise.set_logs,
        setRecord,
      ];

      const plannedSets =
        plannedSetCount(
          normalizedExercise
        );

      completedExercise = {
        ...normalizedExercise,

        completed:
          plannedSets > 0
            ? nextSetLogs.length >=
              plannedSets
            : true,

        skipped: false,

        pain_score:
          setRecord.pain_score,

        current_target_weight:
          cleanValue(
            setLog.next_target_weight ??
              setRecord.target_weight
          ),

        current_target_reps:
          cleanValue(
            setLog.next_target_reps ??
              setRecord.target_reps
          ),

        set_logs: nextSetLogs,
      };

      return completedExercise;
    });

  const restTarget = Math.max(
    0,
    safeNumber(
      completedExercise?.rest_seconds ||
        60,
      60
    )
  );

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,

    set_active: false,
    active_exercise_id: "",
    active_set_started_at: "",
    current_set_seconds: 0,

    rest_active:
      restTarget > 0,

    rest_target_seconds:
      restTarget,

    rest_remaining_seconds:
      restTarget,

    current_rest_seconds: 0,

    rest_started_at:
      restTarget > 0
        ? nowIso()
        : "",

    rest_completed_at: "",
    rest_overrun_seconds: 0,
  });
}

export function moveToExercise(
  session = {},
  index = 0
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  if (!exercises.length) {
    return session;
  }

  const nextIndex = Math.max(
    0,
    Math.min(
      index,
      exercises.length - 1
    )
  );

  return {
    ...session,
    current_exercise_index:
      nextIndex,

    set_active: false,
    active_exercise_id: "",
    active_set_started_at: "",
    current_set_seconds: 0,

    rest_active: false,
    rest_remaining_seconds: 0,

    rest_completed_at:
      session.rest_active
        ? nowIso()
        : session.rest_completed_at ||
          "",

    last_rest_seconds:
      session.rest_active
        ? safeNumber(
            session.current_rest_seconds
          )
        : safeNumber(
            session.last_rest_seconds
          ),
  };
}

export function addSetToExercise(
  session = {},
  exerciseId,
  setLog = {}
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  let updatedExercise = null;

  const nextExercises =
    exercises.map((exercise) => {
      if (
        exercise.id !== exerciseId
      ) {
        return exercise;
      }

      const normalizedExercise =
        normalizeExercise(exercise);

      const setRecord =
        createSetRecord({
          exercise:
            normalizedExercise,

          setLog,

          setNumber:
            nextSetNumber(
              normalizedExercise
            ),

          duration:
            safeNumber(
              setLog.set_duration_seconds,
              0
            ),

          startedAt:
            setLog.started_at ||
            "",
        });

      const nextSetLogs = [
        ...normalizedExercise.set_logs,
        setRecord,
      ];

      const plannedSets =
        plannedSetCount(
          normalizedExercise
        );

      updatedExercise = {
        ...normalizedExercise,

        completed:
          plannedSets > 0
            ? nextSetLogs.length >=
              plannedSets
            : true,

        skipped: false,

        pain_score:
          setRecord.pain_score,

        current_target_weight:
          cleanValue(
            setLog.next_target_weight ??
              setRecord.target_weight
          ),

        current_target_reps:
          cleanValue(
            setLog.next_target_reps ??
              setRecord.target_reps
          ),

        set_logs: nextSetLogs,
      };

      return updatedExercise;
    });

  const restTarget = Math.max(
    0,
    safeNumber(
      updatedExercise?.rest_seconds ||
        60,
      60
    )
  );

  return recalcSessionStats({
    ...session,
    exercises: nextExercises,

    rest_active:
      restTarget > 0,

    rest_target_seconds:
      restTarget,

    rest_remaining_seconds:
      restTarget,

    current_rest_seconds: 0,

    rest_started_at:
      restTarget > 0
        ? nowIso()
        : "",

    rest_completed_at: "",
    rest_overrun_seconds: 0,
  });
}

export function updateExerciseField(
  session = {},
  exerciseId,
  field,
  value
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  return recalcSessionStats({
    ...session,

    exercises:
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise
      ),
  });
}

export function updateExerciseTarget(
  session = {},
  exerciseId,
  {
    weight,
    reps,
    source = "user",
    applyToFutureSets = true,
  } = {}
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  return recalcSessionStats({
    ...session,

    exercises:
      exercises.map((exercise) => {
        if (
          exercise.id !== exerciseId
        ) {
          return exercise;
        }

        const normalizedExercise =
          normalizeExercise(exercise);

        const previousWeight =
          normalizedExercise
            .current_target_weight;

        const previousReps =
          normalizedExercise
            .current_target_reps;

        return {
          ...normalizedExercise,

          current_target_weight:
            weight !== undefined
              ? cleanValue(weight)
              : previousWeight,

          current_target_reps:
            reps !== undefined
              ? cleanValue(reps)
              : previousReps,

          target_adjustment_source:
            source,

          target_adjusted_at:
            nowIso(),

          apply_target_to_future_sets:
            Boolean(
              applyToFutureSets
            ),
        };
      }),
  });
}

export function applyCoachRecommendationDecision(
  session = {},
  exerciseId,
  recommendation = {},
  decision = "accepted",
  manualTarget = {}
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  const decidedAt = nowIso();

  return recalcSessionStats({
    ...session,

    exercises:
      exercises.map((exercise) => {
        if (
          exercise.id !== exerciseId
        ) {
          return exercise;
        }

        const normalizedExercise =
          normalizeExercise(exercise);

        const accepted =
          decision === "accepted";

        const keepCurrent =
          decision === "keep_current";

        const manual =
          decision === "manual";

        const selectedWeight =
          accepted
            ? recommendation.recommended_weight
            : manual
            ? manualTarget.weight
            : normalizedExercise
                .current_target_weight;

        const selectedReps =
          accepted
            ? recommendation.recommended_reps
            : manual
            ? manualTarget.reps
            : normalizedExercise
                .current_target_reps;

        const decisionRecord = {
          id: uid("recommendation"),

          recommendation: {
            ...recommendation,
          },

          decision,

          accepted,

          overridden:
            !accepted,

          override_type:
            keepCurrent
              ? "keep_current"
              : manual
              ? "manual_adjustment"
              : "",

          previous_target_weight:
            normalizedExercise
              .current_target_weight,

          previous_target_reps:
            normalizedExercise
              .current_target_reps,

          selected_weight:
            cleanValue(
              selectedWeight
            ),

          selected_reps:
            cleanValue(
              selectedReps
            ),

          decided_at:
            decidedAt,
        };

        return {
          ...normalizedExercise,

          current_target_weight:
            cleanValue(
              selectedWeight
            ),

          current_target_reps:
            cleanValue(
              selectedReps
            ),

          target_adjustment_source:
            accepted
              ? "coach"
              : manual
              ? "user"
              : "kept_current",

          target_adjusted_at:
            decidedAt,

          last_recommendation:
            decisionRecord,

          recommendation_history: [
            ...normalizedExercise
              .recommendation_history,
            decisionRecord,
          ],
        };
      }),
  });
}

export function updateSetField(
  session = {},
  exerciseId,
  setId,
  field,
  value
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  return recalcSessionStats({
    ...session,

    exercises:
      exercises.map((exercise) => {
        if (
          exercise.id !== exerciseId
        ) {
          return exercise;
        }

        return {
          ...exercise,

          set_logs:
            (
              exercise.set_logs || []
            ).map((setLog) => {
              if (
                setLog.id !== setId
              ) {
                return setLog;
              }

              const normalizedSet =
                normalizeSetLog(
                  setLog,
                  exercise
                );

              const previousValue =
                normalizedSet[field];

              const edit = {
                id: uid("edit"),
                field,
                previous_value:
                  previousValue ?? "",
                next_value:
                  value ?? "",
                edited_at:
                  nowIso(),
              };

              const nextSet = {
                ...normalizedSet,
                [field]: value,

                edit_history: [
                  ...normalizedSet
                    .edit_history,
                  edit,
                ],
              };

              if (
                field === "weight" ||
                field ===
                  "actual_weight"
              ) {
                nextSet.weight =
                  cleanValue(value);

                nextSet.actual_weight =
                  cleanValue(value);
              }

              if (
                field === "reps" ||
                field ===
                  "actual_reps"
              ) {
                nextSet.reps =
                  cleanValue(value);

                nextSet.actual_reps =
                  cleanValue(value);
              }

              if (
                field === "rpe" ||
                field ===
                  "ease_score"
              ) {
                nextSet.rpe =
                  cleanValue(value);

                nextSet.ease_score =
                  cleanValue(value);
              }

              return nextSet;
            }),
        };
      }),
  });
}

export function removeSetFromExercise(
  session = {},
  exerciseId,
  setId
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  return recalcSessionStats({
    ...session,

    exercises:
      exercises.map((exercise) => {
        if (
          exercise.id !== exerciseId
        ) {
          return exercise;
        }

        const nextSetLogs =
          (
            exercise.set_logs || []
          )
            .filter(
              (setLog) =>
                setLog.id !== setId
            )
            .map(
              (setLog, index) => ({
                ...setLog,
                set_number:
                  index + 1,
              })
            );

        const plannedSets =
          plannedSetCount(exercise);

        return {
          ...exercise,

          completed:
            plannedSets > 0
              ? nextSetLogs.length >=
                plannedSets
              : nextSetLogs.length > 0,

          set_logs:
            nextSetLogs,
        };
      }),
  });
}

export function markExerciseSkipped(
  session = {},
  exerciseId
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  return recalcSessionStats({
    ...session,

    exercises:
      exercises.map((exercise) => {
        if (
          exercise.id !== exerciseId
        ) {
          return exercise;
        }

        const nextSkipped =
          !exercise.skipped;

        return {
          ...exercise,
          skipped: nextSkipped,

          completed:
            nextSkipped
              ? false
              : exercise.completed,
        };
      }),

    set_active: false,
    active_exercise_id: "",
    active_set_started_at: "",
    current_set_seconds: 0,

    rest_active: false,
    rest_remaining_seconds: 0,
  });
}

export function markExerciseSubstituted(
  session = {},
  exerciseId,
  value = ""
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  const cleanSubstitute =
    String(value || "").trim();

  return recalcSessionStats({
    ...session,

    exercises:
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,

              substituted:
                Boolean(
                  cleanSubstitute
                ),

              substitute_name:
                cleanSubstitute,
            }
          : exercise
      ),
  });
}

function average(numbers = []) {
  const valid = numbers
    .map((value) =>
      safeNumber(value, NaN)
    )
    .filter((value) =>
      Number.isFinite(value)
    );

  if (!valid.length) {
    return "";
  }

  return (
    Math.round(
      (
        valid.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / valid.length
      ) * 10
    ) / 10
  );
}

export function recalcSessionStats(
  session = {}
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises.map(
        (exercise, index) =>
          normalizeExercise(
            exercise,
            index
          )
      )
    : [];

  const setLogs =
    exercises.flatMap(
      (exercise) =>
        Array.isArray(
          exercise.set_logs
        )
          ? exercise.set_logs
          : []
    );

  const recommendationHistory =
    exercises.flatMap(
      (exercise) =>
        Array.isArray(
          exercise.recommendation_history
        )
          ? exercise.recommendation_history
          : []
    );

  return {
    ...session,
    exercises,

    completed_sets:
      setLogs.length,

    skipped_exercises:
      exercises.filter(
        (exercise) =>
          exercise.skipped
      ).length,

    substituted_exercises:
      exercises.filter(
        (exercise) =>
          exercise.substituted
      ).length,

    average_ease_score:
      average(
        setLogs.map(
          (setLog) =>
            setLog.rpe ||
            setLog.ease_score
        )
      ),

    average_rpe:
      average(
        setLogs.map(
          (setLog) =>
            setLog.rpe ||
            setLog.ease_score
        )
      ),

    average_set_seconds:
      setLogs.length
        ? Math.round(
            setLogs.reduce(
              (sum, setLog) =>
                sum +
                safeNumber(
                  setLog
                    .set_duration_seconds
                ),
              0
            ) / setLogs.length
          )
        : 0,

    accepted_recommendations:
      recommendationHistory.filter(
        (item) =>
          item.accepted === true
      ).length,

    overridden_recommendations:
      recommendationHistory.filter(
        (item) =>
          item.overridden === true
      ).length,
  };
}

export function validateWorkoutSessionForFinish(
  session = {}
) {
  const exercises = Array.isArray(
    session.exercises
  )
    ? session.exercises
    : [];

  const missing = [];
  const warnings = [];

  const untouched =
    exercises.filter(
      (exercise) =>
        !exercise.skipped &&
        (
          !Array.isArray(
            exercise.set_logs
          ) ||
          exercise.set_logs.length ===
            0
        )
    );

  if (session.set_active) {
    missing.push({
      id: "active_set",

      label:
        "A set is currently active. Complete the set before finishing.",

      severity: "important",
    });
  }

  if (
    safeNumber(
      session.completed_sets
    ) <= 0
  ) {
    missing.push({
      id: "no_sets",

      label:
        "No sets have been logged yet.",

      severity: "important",
    });
  }

  if (untouched.length) {
    missing.push({
      id: "untouched_exercises",

      label:
        `${untouched.length} exercise${
          untouched.length === 1
            ? ""
            : "s"
        } still need a set or need to be skipped.`,

      severity: "important",

      items:
        untouched.map(
          (exercise) =>
            exercise.name
        ),
    });
  }

  if (
    !String(
      session.energy_score || ""
    ).trim()
  ) {
    warnings.push({
      id: "energy",
      label:
        "Energy score is not filled out.",
    });
  }

  if (
    !String(
      session.soreness_score || ""
    ).trim()
  ) {
    warnings.push({
      id: "soreness",
      label:
        "Soreness score is not filled out.",
    });
  }

  if (
    !String(
      session.notes || ""
    ).trim()
  ) {
    warnings.push({
      id: "notes",

      label:
        "Workout notes are empty. A quick note helps the coach adjust the next plan.",
    });
  }

  return {
    canFinish:
      !session.set_active,

    missing,
    warnings,

    hasIssues:
      missing.length > 0 ||
      warnings.length > 0,

    importantCount:
      missing.filter(
        (item) =>
          item.severity ===
          "important"
      ).length,
  };
}

export function formatSeconds(
  totalSeconds = 0
) {
  const total = Math.max(
    0,
    Math.floor(
      safeNumber(
        totalSeconds,
        0
      )
    )
  );

  const hours = Math.floor(
    total / 3600
  );

  const minutes = Math.floor(
    (total % 3600) / 60
  );

  const seconds =
    total % 60;

  const pad = (value) =>
    String(value).padStart(
      2,
      "0"
    );

  if (hours > 0) {
    return `${hours}:${pad(
      minutes
    )}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(
    seconds
  )}`;
}

export function buildWorkoutSummary(
  session = {}
) {
  const normalizedSession =
    recalcSessionStats(session);

  const exercises =
    normalizedSession.exercises;

  const setLogs =
    exercises.flatMap(
      (exercise) =>
        Array.isArray(
          exercise.set_logs
        )
          ? exercise.set_logs
          : []
    );

  return {
    workout_name:
      normalizedSession.workout_name ||
      "Workout",

    started_at:
      normalizedSession.started_at ||
      "",

    finished_at:
      normalizedSession.finished_at ||
      "",

    saved_at:
      normalizedSession.saved_at ||
      "",

    edited_after_finish_at:
      normalizedSession
        .edited_after_finish_at ||
      "",

    total_seconds:
      safeNumber(
        normalizedSession.total_seconds
      ),

    active_seconds:
      safeNumber(
        normalizedSession.active_seconds
      ),

    rest_seconds:
      safeNumber(
        normalizedSession.rest_seconds
      ),

    idle_seconds:
      safeNumber(
        normalizedSession.idle_seconds
      ),

    longest_rest_seconds:
      safeNumber(
        normalizedSession
          .longest_rest_seconds
      ),

    completed_sets:
      safeNumber(
        normalizedSession
          .completed_sets
      ),

    completed_exercises:
      exercises.filter(
        (exercise) =>
          exercise.completed
      ).length,

    skipped_exercises:
      safeNumber(
        normalizedSession
          .skipped_exercises
      ),

    substituted_exercises:
      safeNumber(
        normalizedSession
          .substituted_exercises
      ),

    average_ease_score:
      normalizedSession
        .average_ease_score ||
      "",

    average_rpe:
      normalizedSession
        .average_rpe ||
      "",

    average_set_seconds:
      safeNumber(
        normalizedSession
          .average_set_seconds
      ),

    accepted_recommendations:
      safeNumber(
        normalizedSession
          .accepted_recommendations
      ),

    overridden_recommendations:
      safeNumber(
        normalizedSession
          .overridden_recommendations
      ),

    total_set_volume:
      setLogs.reduce(
        (sum, setLog) => {
          const reps =
            safeNumber(
              setLog.actual_reps ??
                setLog.reps
            );

          const weight =
            safeNumber(
              setLog.actual_weight ??
                setLog.weight
            );

          return reps && weight
            ? sum +
                reps * weight
            : sum;
        },
        0
      ),

    pain_score:
      normalizedSession
        .pain_score ||
      "0",

    difficulty_score:
      normalizedSession
        .difficulty_score ||
      "Medium",

    energy_score:
      normalizedSession
        .energy_score ||
      "",

    soreness_score:
      normalizedSession
        .soreness_score ||
      "",

    notes:
      normalizedSession.notes ||
      "",
  };
}

function updatePlannerItemStatus(
  weekPlan = [],
  plannerItemId = ""
) {
  if (!Array.isArray(weekPlan)) {
    return [];
  }

  return weekPlan.map(
    (item) =>
      plannerItemId &&
      item.id === plannerItemId
        ? {
            ...item,

            status:
              "Completed",

            completed_at:
              nowIso(),

            actual_completion_date:
              ymdFromIso(nowIso()),

            completed_on_date:
              ymdFromIso(nowIso()),
          }
        : item
  );
}

export function finishWorkoutSession({
  session,
  snapshot = {},
  history = [],
}) {
  const finishedSession =
    recalcSessionStats({
      ...stopRestTimer(
        stopActiveSet(session)
      ),

      status: "completed",

      finished_at:
        session.finished_at ||
        nowIso(),

      saved_at:
        nowIso(),

      paused: false,

      review_acknowledged:
        true,

      actual_completion_date:
        session.actual_completion_date ||
        ymdFromIso(
          session.finished_at ||
            new Date().toISOString()
        ),

      planned_date:
        session.planned_date ||
        session.ymd ||
        "",
    });

  const summary =
    buildWorkoutSummary(
      finishedSession
    );

  const historyEntry = {
    id: uid("history"),

    type:
      "workout_session",

    source:
      "active_workout_session",

    ymd:
      finishedSession.actual_completion_date ||
      ymdFromIso(finishedSession.finished_at),

    planned_date:
      finishedSession.planned_date ||
      finishedSession.ymd ||
      "",

    actual_completion_date:
      finishedSession.actual_completion_date ||
      ymdFromIso(finishedSession.finished_at),

    session_number:
      finishedSession.session_number || 1,

    scientific_title:
      finishedSession.scientific_title ||
      finishedSession.workout_name ||
      "Workout",

    training_category:
      finishedSession.training_category || "",

    body_region:
      finishedSession.body_region || "",

    movement_pattern:
      finishedSession.movement_pattern || "",

    primary_muscles:
      finishedSession.primary_muscles || [],

    secondary_muscles:
      finishedSession.secondary_muscles || [],

    workout_name:
      finishedSession.workout_name ||
      "Workout",

    workout_id:
      finishedSession.workout_id ||
      "",

    planner_item_id:
      finishedSession
        .planner_item_id ||
      "",

    completed_at:
      finishedSession
        .finished_at,

    summary,
    session:
      finishedSession,
  };

  const nextHistory = [
    historyEntry,

    ...(Array.isArray(history)
      ? history
      : []),
  ];

  const nextSnapshot = {
    ...snapshot,

    week_plan:
      updatePlannerItemStatus(
        snapshot.week_plan,
        finishedSession
          .planner_item_id
      ),

    last_completed_workout:
      finishedSession.workout_name ||
      "Workout",

    last_completed_at:
      finishedSession.finished_at,

    last_workout_stats:
      summary,

    last_workout_session:
      finishedSession,

    weekly_completed:
      nextHistory.length,

    completed_workouts:
      safeNumber(
        snapshot.completed_workouts
      ) + 1,

    updated_at:
      nowIso(),
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
  const editedSession =
    recalcSessionStats({
      ...stopRestTimer(
        stopActiveSet(session)
      ),

      status: "completed",

      edited_after_finish_at:
        nowIso(),

      saved_at:
        session.saved_at ||
        nowIso(),

      paused: false,
    });

  const summary =
    buildWorkoutSummary(
      editedSession
    );

  const nextHistory =
    Array.isArray(history)
      ? history.map(
          (item, index) => {
            const sameSession =
              item?.session?.id &&
              item.session.id ===
                editedSession.id;

            const samePlanner =
              item?.planner_item_id &&
              item.planner_item_id ===
                editedSession
                  .planner_item_id;

            if (
              sameSession ||
              (
                !sameSession &&
                samePlanner &&
                index === 0
              )
            ) {
              return {
                ...item,

                workout_name:
                  editedSession
                    .workout_name ||
                  item.workout_name,

                summary,

                session:
                  editedSession,

                edited_after_finish_at:
                  editedSession
                    .edited_after_finish_at,
              };
            }

            return item;
          }
        )
      : [];

  const nextSnapshot = {
    ...snapshot,

    last_completed_workout:
      editedSession.workout_name ||
      "Workout",

    last_completed_at:
      editedSession.finished_at,

    last_workout_stats:
      summary,

    last_workout_session:
      editedSession,

    updated_at:
      nowIso(),
  };

  return {
    editedSession,
    summary,
    nextHistory,
    nextSnapshot,
  };
}

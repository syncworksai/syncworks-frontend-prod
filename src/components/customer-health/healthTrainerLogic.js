// src/components/customer-health/healthTrainerLogic.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function roundLoad(value) {
  const number = safeNumber(value, 0);

  if (!number) return "";

  return String(
    Math.round(number * 2) / 2
  );
}

function parseRepTarget(value = "") {
  const raw = String(value || "");
  const numbers =
    raw.match(/\d+/g)?.map(Number) || [];

  if (!numbers.length) {
    return {
      min: 8,
      max: 12,
      label: raw || "8-12",
    };
  }

  if (numbers.length === 1) {
    return {
      min: numbers[0],
      max: numbers[0],
      label: raw || String(numbers[0]),
    };
  }

  return {
    min: Math.min(numbers[0], numbers[1]),
    max: Math.max(numbers[0], numbers[1]),
    label: raw,
  };
}

function getSetLogs(exercise = {}) {
  return Array.isArray(exercise?.set_logs)
    ? exercise.set_logs.filter(
        (setLog) =>
          setLog &&
          typeof setLog === "object"
      )
    : [];
}

function getLastLoggedSet(exercise = {}) {
  const logs = getSetLogs(exercise);

  return logs[logs.length - 1] || null;
}

function getPreviousLoggedSet(exercise = {}) {
  const logs = getSetLogs(exercise);

  return logs.length >= 2
    ? logs[logs.length - 2]
    : null;
}

function getExerciseCompletionCount(exercise = {}) {
  return getSetLogs(exercise).length;
}

function getPlannedSets(exercise = {}) {
  return Math.max(
    1,
    safeNumber(
      exercise.planned_sets ||
        exercise.sets ||
        3,
      3
    )
  );
}

function getActualReps(setLog = {}) {
  const safeSetLog =
    setLog &&
    typeof setLog === "object"
      ? setLog
      : {};

  return safeNumber(
    safeSetLog.actual_reps ??
      safeSetLog.reps,
    0
  );
}

function getActualWeight(setLog = {}) {
  const safeSetLog =
    setLog &&
    typeof setLog === "object"
      ? setLog
      : {};

  const value =
    safeSetLog.actual_weight ??
    safeSetLog.weight ??
    safeSetLog.target_weight ??
    safeSetLog.planned_weight ??
    "";

  return safeNumber(value, 0);
}

function getTargetReps(
  setLog = {},
  exercise = {}
) {
  const safeSetLog =
    setLog &&
    typeof setLog === "object"
      ? setLog
      : {};

  const safeExercise =
    exercise &&
    typeof exercise === "object"
      ? exercise
      : {};

  return safeNumber(
    safeSetLog.target_reps ??
      safeSetLog.planned_reps ??
      safeExercise.current_target_reps ??
      safeExercise.planned_reps ??
      safeExercise.reps,
    0
  );
}

function getTargetWeight(
  setLog = {},
  exercise = {}
) {
  const safeSetLog =
    setLog &&
    typeof setLog === "object"
      ? setLog
      : {};

  const safeExercise =
    exercise &&
    typeof exercise === "object"
      ? exercise
      : {};

  return safeNumber(
    safeSetLog.target_weight ??
      safeSetLog.planned_weight ??
      safeExercise.current_target_weight ??
      safeExercise.planned_weight ??
      safeExercise.weight,
    0
  );
}

function getRpe(setLog = {}) {
  const safeSetLog =
    setLog &&
    typeof setLog === "object"
      ? setLog
      : {};

  return safeNumber(
    safeSetLog.rpe ??
      safeSetLog.ease_score,
    0
  );
}

function getPain(
  setLog = {},
  exercise = {},
  session = {}
) {
  const safeSetLog =
    setLog &&
    typeof setLog === "object"
      ? setLog
      : {};

  const safeExercise =
    exercise &&
    typeof exercise === "object"
      ? exercise
      : {};

  const safeSession =
    session &&
    typeof session === "object"
      ? session
      : {};

  return safeNumber(
    safeSetLog.pain_score ??
      safeExercise.pain_score ??
      safeSession.pain_score,
    0
  );
}

function getFormQuality(setLog = {}) {
  const safeSetLog =
    setLog &&
    typeof setLog === "object"
      ? setLog
      : {};

  return String(
    safeSetLog.form_quality || ""
  )
    .trim()
    .toLowerCase();
}

function isPoorForm(formQuality) {
  return [
    "poor",
    "bad",
    "unsafe",
    "breaking",
  ].includes(
    String(formQuality || "")
      .trim()
      .toLowerCase()
  );
}

function isGoodForm(formQuality) {
  return [
    "good",
    "great",
    "clean",
    "excellent",
  ].includes(
    String(formQuality || "")
      .trim()
      .toLowerCase()
  );
}

function getWeightIncrement(exercise = {}) {
  const explicitIncrement = safeNumber(
    exercise.weight_increment ||
      exercise.load_increment,
    0
  );

  if (explicitIncrement > 0) {
    return explicitIncrement;
  }

  const equipment = String(
    exercise.equipment || ""
  ).toLowerCase();

  if (
    equipment.includes("dumbbell") ||
    equipment.includes("machine")
  ) {
    return 5;
  }

  return 5;
}

function recommendedIncrease(
  currentWeight,
  exercise = {}
) {
  if (!currentWeight) return "";

  const increment =
    getWeightIncrement(exercise);

  return roundLoad(
    currentWeight + increment
  );
}

function recommendedDecrease(
  currentWeight,
  exercise = {},
  severity = "normal"
) {
  if (!currentWeight) return "";

  const increment =
    getWeightIncrement(exercise);

  const percentage =
    severity === "high"
      ? 0.15
      : 0.08;

  const percentageReduction =
    currentWeight * percentage;

  const reduction = Math.max(
    increment,
    percentageReduction
  );

  return roundLoad(
    Math.max(0, currentWeight - reduction)
  );
}

function buildRecommendationBase({
  exercise,
  lastSet,
  target,
}) {
  const actualWeight =
    getActualWeight(lastSet);

  const actualReps =
    getActualReps(lastSet);

  const targetWeight =
    getTargetWeight(lastSet, exercise);

  const targetReps =
    getTargetReps(lastSet, exercise) ||
    target.max ||
    target.min ||
    10;

  return {
    source: "syncworks_set_coach",
    generated_after_set:
      getExerciseCompletionCount(exercise),

    action: "hold",
    tone: "cyan",
    priority: "normal",
    confidence: "medium",

    recommended_weight:
      actualWeight ||
      targetWeight ||
      "",

    recommended_reps:
      targetReps ||
      actualReps ||
      "",

    reason:
      "Match the last clean working set.",

    planned_weight:
      targetWeight || "",

    planned_reps:
      targetReps || "",

    actual_weight:
      actualWeight || "",

    actual_reps:
      actualReps || "",

    rpe: getRpe(lastSet),

    pain_score:
      safeNumber(
        lastSet?.pain_score,
        0
      ),

    form_quality:
      lastSet?.form_quality || "",

    generated_at:
      new Date().toISOString(),
  };
}

export function buildSetRecommendation({
  session,
  exercise,
} = {}) {
  if (!exercise) {
    return {
      source: "syncworks_set_coach",
      action: "start",
      tone: "cyan",
      priority: "normal",
      confidence: "low",
      recommended_weight: "",
      recommended_reps: "",
      reason:
        "Start the exercise and log the first working set.",
      generated_after_set: 0,
      generated_at:
        new Date().toISOString(),
    };
  }

  const lastSet =
    getLastLoggedSet(exercise);

  const previousSet =
    getPreviousLoggedSet(exercise);

  const target = parseRepTarget(
    exercise.planned_reps ||
      exercise.reps ||
      "8-12"
  );

  if (!lastSet) {
    return {
      source: "syncworks_set_coach",
      action: "start",
      tone: "cyan",
      priority: "normal",
      confidence: "medium",

      recommended_weight:
        exercise.current_target_weight ??
        exercise.planned_weight ??
        exercise.weight ??
        "",

      recommended_reps:
        exercise.current_target_reps ??
        target.max ??
        target.min ??
        "",

      reason:
        `Begin with the planned ${target.label} clean reps and evaluate effort, pain, and form.`,

      generated_after_set: 0,
      generated_at:
        new Date().toISOString(),
    };
  }

  const recommendation =
    buildRecommendationBase({
      exercise,
      lastSet,
      target,
    });

  const actualWeight =
    getActualWeight(lastSet);

  const actualReps =
    getActualReps(lastSet);

  const plannedWeight =
    getTargetWeight(
      lastSet,
      exercise
    );

  const plannedReps =
    getTargetReps(
      lastSet,
      exercise
    ) ||
    target.max ||
    target.min ||
    10;

  const rpe = getRpe(lastSet);

  const pain = getPain(
    lastSet,
    exercise,
    session
  );

  const formQuality =
    getFormQuality(lastSet);

  const previousReps =
    getActualReps(previousSet);

  const previousWeight =
    getActualWeight(previousSet);

  const manualWeightChange = Boolean(
    lastSet.weight_changed_manually ||
      lastSet.adjustment_source === "user" ||
      (
        plannedWeight > 0 &&
        actualWeight > 0 &&
        actualWeight !== plannedWeight
      )
  );

  const repDrop =
    previousSet &&
    previousWeight === actualWeight
      ? previousReps - actualReps
      : 0;

  if (pain >= 4) {
    return {
      ...recommendation,
      action: "stop_or_swap",
      tone: "rose",
      priority: "high",
      confidence: "high",
      recommended_weight:
        recommendedDecrease(
          actualWeight,
          exercise,
          "high"
        ),
      recommended_reps:
        Math.max(
          1,
          Math.min(
            actualReps || plannedReps,
            plannedReps
          )
        ),
      reason:
        "High pain was reported. Stop the movement, reduce the load substantially, or substitute the exercise.",
    };
  }

  if (pain >= 2) {
    return {
      ...recommendation,
      action: "reduce_weight",
      tone: "rose",
      priority: "high",
      confidence: "high",
      recommended_weight:
        recommendedDecrease(
          actualWeight,
          exercise,
          "high"
        ),
      recommended_reps:
        Math.max(
          target.min,
          Math.min(
            actualReps || plannedReps,
            plannedReps
          )
        ),
      reason:
        "Pain was reported. Reduce the load and continue only with a comfortable range and clean form.",
    };
  }

  if (isPoorForm(formQuality)) {
    return {
      ...recommendation,
      action: "reduce_weight",
      tone: "rose",
      priority: "high",
      confidence: "high",
      recommended_weight:
        recommendedDecrease(
          actualWeight,
          exercise,
          "normal"
        ),
      recommended_reps:
        Math.max(
          target.min,
          Math.min(
            actualReps || plannedReps,
            plannedReps
          )
        ),
      reason:
        "Form quality was poor. Reduce the load and prioritize controlled, technically clean repetitions.",
    };
  }

  if (
    repDrop >= 3 &&
    rpe >= 8
  ) {
    return {
      ...recommendation,
      action: "reduce_weight",
      tone: "rose",
      priority: "high",
      confidence: "high",
      recommended_weight:
        recommendedDecrease(
          actualWeight,
          exercise
        ),
      recommended_reps:
        Math.max(
          target.min,
          actualReps
        ),
      reason:
        "Performance dropped sharply at high effort. Reduce the load before fatigue causes poor repetitions.",
    };
  }

  if (
    actualReps < target.min &&
    rpe >= 9
  ) {
    return {
      ...recommendation,
      action: "reduce_weight",
      tone: "rose",
      priority: "high",
      confidence: "high",
      recommended_weight:
        recommendedDecrease(
          actualWeight,
          exercise
        ),
      recommended_reps:
        target.min,
      reason:
        "Reps were below target at near-max effort. Reduce the weight so the next set returns to the prescribed range.",
    };
  }

  if (
    actualReps < target.min &&
    rpe >= 7
  ) {
    return {
      ...recommendation,
      action: "reduce_weight",
      tone: "amber",
      priority: "normal",
      confidence: "high",
      recommended_weight:
        recommendedDecrease(
          actualWeight,
          exercise
        ),
      recommended_reps:
        target.min,
      reason:
        "The set missed the minimum rep target and felt hard. Reduce the load slightly and restore clean target reps.",
    };
  }

  if (
    manualWeightChange &&
    actualWeight > plannedWeight &&
    actualReps < plannedReps
  ) {
    return {
      ...recommendation,
      action:
        rpe >= 9
          ? "reduce_weight"
          : "hold_weight",
      tone:
        rpe >= 9
          ? "rose"
          : "amber",
      priority:
        rpe >= 9
          ? "high"
          : "normal",
      confidence: "high",
      recommended_weight:
        rpe >= 9
          ? plannedWeight ||
            recommendedDecrease(
              actualWeight,
              exercise
            )
          : actualWeight,
      recommended_reps:
        Math.max(
          target.min,
          actualReps
        ),
      reason:
        rpe >= 9
          ? "You increased the load manually, missed the rep target, and reached very high effort. Return toward the planned load."
          : "You increased the load manually and reps fell below plan. Hold this weight and use the achieved rep target before progressing again.",
    };
  }

  if (
    rpe >= 9 ||
    (
      actualReps <= target.min &&
      rpe >= 8
    )
  ) {
    return {
      ...recommendation,
      action: "hold_weight",
      tone: "amber",
      priority: "normal",
      confidence: "high",
      recommended_weight:
        actualWeight ||
        plannedWeight,
      recommended_reps:
        Math.max(
          target.min,
          actualReps
        ),
      reason:
        "That set was near maximum effort. Keep the load steady and protect form rather than adding weight.",
    };
  }

  if (
    actualReps >= target.max &&
    rpe > 0 &&
    rpe <= 6 &&
    !isPoorForm(formQuality)
  ) {
    return {
      ...recommendation,
      action: "increase_weight",
      tone: "emerald",
      priority: "normal",
      confidence:
        isGoodForm(formQuality)
          ? "high"
          : "medium",
      recommended_weight:
        recommendedIncrease(
          actualWeight ||
            plannedWeight,
          exercise
        ),
      recommended_reps:
        target.max,
      reason:
        "You completed the full rep target at low-to-moderate effort. Add a small amount of weight while keeping the same clean rep goal.",
    };
  }

  if (
    actualReps > target.max &&
    rpe <= 7 &&
    !isPoorForm(formQuality)
  ) {
    return {
      ...recommendation,
      action: "increase_weight",
      tone: "emerald",
      priority: "normal",
      confidence: "high",
      recommended_weight:
        recommendedIncrease(
          actualWeight ||
            plannedWeight,
          exercise
        ),
      recommended_reps:
        target.max,
      reason:
        "You exceeded the top of the rep range without excessive effort. Increase the load slightly next set.",
    };
  }

  if (
    actualReps >= target.min &&
    actualReps <= target.max &&
    rpe >= 7 &&
    rpe <= 8
  ) {
    return {
      ...recommendation,
      action: "hold_weight",
      tone: "emerald",
      priority: "normal",
      confidence: "high",
      recommended_weight:
        actualWeight ||
        plannedWeight,
      recommended_reps:
        Math.max(
          target.min,
          actualReps
        ),
      reason:
        "The set landed in the target range at productive effort. Keep the same load and match the clean performance.",
    };
  }

  if (
    actualReps >= target.max &&
    !rpe
  ) {
    return {
      ...recommendation,
      action: "hold_or_increase",
      tone: "cyan",
      priority: "normal",
      confidence: "medium",
      recommended_weight:
        actualWeight ||
        plannedWeight,
      recommended_reps:
        target.max,
      reason:
        "You reached the top of the rep range. Log RPE and form quality so the coach can decide whether to increase weight.",
    };
  }

  return {
    ...recommendation,
    action: "hold_weight",
    tone: "cyan",
    priority: "normal",
    confidence: "medium",
    recommended_weight:
      actualWeight ||
      plannedWeight,
    recommended_reps:
      actualReps ||
      plannedReps ||
      target.max,
    reason:
      "Match the last clean set. Use honest RPE, pain, and form feedback to guide the following adjustment.",
  };
}

function recommendationTitle(
  recommendation = {}
) {
  switch (recommendation.action) {
    case "increase_weight":
      return "Increase The Load";

    case "reduce_weight":
      return "Reduce The Load";

    case "stop_or_swap":
      return "Stop Or Substitute";

    case "hold_weight":
      return "Hold The Weight";

    case "hold_or_increase":
      return "Hold Or Add Slightly";

    case "start":
      return "First Set";

    default:
      return "Next Set";
  }
}

export function buildTrainerNudge({
  session,
  exercise,
  audibleEnabled = false,
}) {
  if (!session || !exercise) {
    return {
      tone: "cyan",
      priority: "normal",
      title: "Trainer Ready",
      message:
        "Start your workout and I'll guide the next set.",
      speak: false,
      recommendation: null,
    };
  }

  const lastSet =
    getLastLoggedSet(exercise);

  const loggedSets =
    getExerciseCompletionCount(exercise);

  const plannedSets =
    getPlannedSets(exercise);

  const restSeconds = safeNumber(
    session.current_rest_seconds ??
      session.rest_seconds,
    0
  );

  const idleSeconds = safeNumber(
    session.idle_seconds,
    0
  );

  const currentSetSeconds = safeNumber(
    session.current_set_seconds,
    0
  );

  const isResting =
    Boolean(session.rest_active);

  const isPaused =
    Boolean(session.paused);

  const isSetActive =
    Boolean(session.set_active);

  if (exercise.skipped) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Exercise Skipped",
      message:
        "Good call if something felt off. Choose a safe substitute or move on instead of forcing poor repetitions.",
      speak: false,
      recommendation: null,
    };
  }

  if (isPaused) {
    return {
      tone: "slate",
      priority: "normal",
      title: "Workout Paused",
      message:
        "Resume when ready. Your workout data and current set position are preserved.",
      speak: false,
      recommendation: null,
    };
  }

  if (
    isSetActive &&
    currentSetSeconds >= 90
  ) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Long Set",
      message:
        "This set is running long. Finish only clean repetitions, stop the set, and log what actually happened.",
      speak: audibleEnabled,
      recommendation: null,
    };
  }

  if (isSetActive) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Set In Progress",
      message:
        "Stay braced, control the repetition, and stop when clean form breaks. Log actual weight, reps, RPE, form, and pain afterward.",
      speak: false,
      recommendation: null,
    };
  }

  if (
    isResting &&
    restSeconds >= 240
  ) {
    return {
      tone: "rose",
      priority: "high",
      title: "Rest Is Too Long",
      message:
        "You are over four minutes of rest. Start the next set, reduce the load, or end this exercise.",
      speak: audibleEnabled,
      recommendation:
        buildSetRecommendation({
          session,
          exercise,
        }),
    };
  }

  if (
    isResting &&
    restSeconds >= 120
  ) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Prepare For The Next Set",
      message:
        "Rest is long enough for most working sets. Reset your position and prepare to follow the coach recommendation.",
      speak: audibleEnabled,
      recommendation:
        buildSetRecommendation({
          session,
          exercise,
        }),
    };
  }

  if (
    !lastSet &&
    safeNumber(
      session.total_seconds,
      0
    ) >= 120
  ) {
    return {
      tone: "amber",
      priority: "normal",
      title: "Start Logging",
      message:
        "You have been in the workout for a while. Tap Start Set so active time tracks only real work.",
      speak: audibleEnabled,
      recommendation:
        buildSetRecommendation({
          session,
          exercise,
        }),
    };
  }

  if (idleSeconds >= 240) {
    return {
      tone: "rose",
      priority: "high",
      title: "Idle Too Long",
      message:
        "Start the next set, move to the next exercise, or close the workout if you are finished.",
      speak: audibleEnabled,
      recommendation:
        buildSetRecommendation({
          session,
          exercise,
        }),
    };
  }

  if (
    loggedSets >= plannedSets
  ) {
    return {
      tone: "emerald",
      priority: "normal",
      title: "Exercise Complete",
      message:
        "All planned sets are complete. Move to the next exercise unless the plan specifically calls for an additional set.",
      speak: false,
      recommendation: null,
    };
  }

  const recommendation =
    buildSetRecommendation({
      session,
      exercise,
    });

  return {
    tone:
      recommendation.tone ||
      "cyan",

    priority:
      recommendation.priority ||
      "normal",

    title:
      recommendationTitle(
        recommendation
      ),

    message:
      recommendation.reason,

    speak:
      Boolean(
        audibleEnabled &&
          recommendation.priority === "high"
      ),

    recommendation,
  };
}

export function buildNextSetSuggestion(
  exercise = {},
  session = {}
) {
  const recommendation =
    buildSetRecommendation({
      session,
      exercise,
    });

  return {
    reps:
      recommendation.recommended_reps ??
      "",

    weight:
      recommendation.recommended_weight ??
      "",

    target_reps:
      recommendation.recommended_reps ??
      "",

    target_weight:
      recommendation.recommended_weight ??
      "",

    ease_score: "",
    rpe: "",

    pain_score:
      exercise.pain_score ||
      "0",

    action:
      recommendation.action,

    note:
      recommendation.reason,

    recommendation,
  };
}

export function explainFailure() {
  return {
    title:
      "What does pushing to failure mean?",

    body:
      "Technical failure is the point where you can no longer complete another repetition with safe, controlled form. True muscular failure is when the repetition will not move. Most users should stop one or two repetitions before true failure unless the plan specifically calls for it.",
  };
}
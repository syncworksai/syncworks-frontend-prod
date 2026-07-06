// src/components/customer-health/healthExerciseMemory.js

export const EXERCISE_MEMORY_KEY =
  "syncworks_health_exercise_memory_v1";

const ALIAS_GROUPS = {
  "bench press": [
    "barbell bench press",
    "flat barbell bench",
    "flat bench press",
    "bb bench press",
    "barbell bench",
  ],
  "incline bench press": [
    "incline barbell bench press",
    "incline barbell bench",
    "incline bb press",
  ],
  "dumbbell bench press": [
    "db bench press",
    "flat dumbbell press",
    "dumbbell chest press",
  ],
  squat: [
    "barbell squat",
    "back squat",
    "barbell back squat",
  ],
  deadlift: [
    "barbell deadlift",
    "conventional deadlift",
  ],
  "shoulder press": [
    "overhead press",
    "barbell overhead press",
    "military press",
  ],
  "lat pulldown": [
    "lat pull down",
    "wide grip pulldown",
  ],
  "seated row": [
    "cable row",
    "seated cable row",
  ],
  "biceps curl": [
    "bicep curl",
    "barbell curl",
    "dumbbell curl",
  ],
  "triceps pushdown": [
    "tricep pushdown",
    "cable pushdown",
  ],
};

function cleanText(value) {
  return String(value ?? "").trim();
}

function safeNumber(value) {
  const number = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );
  return Number.isFinite(number) ? number : 0;
}

function normalizeBasic(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(left|right|single arm|single-arm)\b/g, " ")
    .replace(/\b(machine|cable machine)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeExerciseKey(name) {
  const normalized = normalizeBasic(name);
  if (!normalized) return "";

  for (const [canonical, aliases] of Object.entries(ALIAS_GROUPS)) {
    const choices = [canonical, ...aliases].map(normalizeBasic);
    if (choices.includes(normalized)) return normalizeBasic(canonical);
  }

  return normalized;
}

function readSetValue(log, field) {
  if (!log || typeof log !== "object") return "";
  if (field === "weight") {
    return log.actual_weight ?? log.weight ?? log.load ?? "";
  }
  if (field === "reps") {
    return log.actual_reps ?? log.reps ?? "";
  }
  if (field === "rpe") {
    return log.rpe ?? log.ease_score ?? "";
  }
  return log[field] ?? "";
}

function normalizeSetLog(log, index = 0) {
  return {
    id: log?.id || `memory-set-${index + 1}`,
    set_number: Number(log?.set_number || index + 1),
    weight: readSetValue(log, "weight"),
    reps: readSetValue(log, "reps"),
    rpe: readSetValue(log, "rpe"),
    form_quality: log?.form_quality || "",
    pain_score: log?.pain_score ?? "",
    set_type: log?.set_type || "working",
    reached_failure: !!log?.reached_failure,
    completed_at: log?.completed_at || log?.logged_at || "",
  };
}

function collectExerciseRows(session) {
  const exercises = Array.isArray(session?.exercises)
    ? session.exercises
    : [];

  return exercises
    .map((exercise) => {
      const name =
        exercise?.substitute_name ||
        exercise?.name ||
        exercise?.exercise_name ||
        "";
      const key = normalizeExerciseKey(name);
      const logs = Array.isArray(exercise?.set_logs)
        ? exercise.set_logs
        : Array.isArray(exercise?.sets)
        ? exercise.sets
        : [];
      const normalizedSets = logs
        .map(normalizeSetLog)
        .filter(
          (set) =>
            cleanText(set.weight) ||
            cleanText(set.reps) ||
            cleanText(set.rpe)
        );

      if (!key || !normalizedSets.length) return null;

      return {
        key,
        name,
        aliases: Array.from(
          new Set([
            name,
            exercise?.name,
            exercise?.substitute_name,
          ].filter(Boolean))
        ),
        sets: normalizedSets,
        workout_name:
          session?.workout_name ||
          session?.name ||
          session?.title ||
          "",
        performed_at:
          session?.completed_at ||
          session?.updated_at ||
          session?.started_at ||
          new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

function buildSummary(sets) {
  const workingSets = sets.filter((set) => set.set_type !== "warmup");
  const source = workingSets.length ? workingSets : sets;
  const numericRpes = source
    .map((set) => safeNumber(set.rpe))
    .filter((value) => value > 0);

  const bestSet = source.reduce((best, set) => {
    const weight = safeNumber(set.weight);
    const reps = safeNumber(set.reps);
    const score = weight * Math.max(reps, 1);
    if (!best || score > best.score) {
      return {
        score,
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe,
      };
    }
    return best;
  }, null);

  const lastSet = source[source.length - 1] || null;

  return {
    average_rpe: numericRpes.length
      ? Number(
          (
            numericRpes.reduce((total, value) => total + value, 0) /
            numericRpes.length
          ).toFixed(1)
        )
      : "",
    best_set: bestSet
      ? { weight: bestSet.weight, reps: bestSet.reps, rpe: bestSet.rpe }
      : null,
    last_set: lastSet
      ? { weight: lastSet.weight, reps: lastSet.reps, rpe: lastSet.rpe }
      : null,
    pain_flag: source.some((set) => safeNumber(set.pain_score) >= 3),
    poor_form: source.some(
      (set) => cleanText(set.form_quality).toLowerCase() === "poor"
    ),
  };
}

function mergeRow(memory, row) {
  const previous = memory[row.key] || {};
  const summary = buildSummary(row.sets);

  return {
    ...previous,
    key: row.key,
    canonical_name: previous.canonical_name || row.name,
    aliases: Array.from(
      new Set([
        ...(Array.isArray(previous.aliases) ? previous.aliases : []),
        ...row.aliases,
      ])
    ),
    last_performed_at: row.performed_at,
    last_workout_name: row.workout_name,
    last_sets: row.sets,
    average_rpe: summary.average_rpe,
    best_set: summary.best_set || previous.best_set || null,
    last_set: summary.last_set,
    pain_flag: summary.pain_flag,
    poor_form: summary.poor_form,
    session_count: Number(previous.session_count || 0) + 1,
    updated_at: new Date().toISOString(),
  };
}

export function readExerciseMemory() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EXERCISE_MEMORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function writeExerciseMemory(memory) {
  if (
    typeof window === "undefined" ||
    !memory ||
    typeof memory !== "object"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      EXERCISE_MEMORY_KEY,
      JSON.stringify(memory)
    );
  } catch {
    // Existing workout history remains the source of truth.
  }
}

export function buildExerciseMemoryFromHistory(history, existingMemory = {}) {
  const memory = {
    ...(existingMemory && typeof existingMemory === "object"
      ? existingMemory
      : {}),
  };

  const sessions = Array.isArray(history) ? [...history] : [];

  sessions
    .sort((left, right) =>
      String(
        left?.completed_at ||
          left?.updated_at ||
          left?.started_at ||
          ""
      ).localeCompare(
        String(
          right?.completed_at ||
            right?.updated_at ||
            right?.started_at ||
            ""
        )
      )
    )
    .forEach((session) => {
      collectExerciseRows(session).forEach((row) => {
        memory[row.key] = mergeRow(memory, row);
      });
    });

  return memory;
}

export function mergeSessionIntoExerciseMemory(memory, session) {
  const next = {
    ...(memory && typeof memory === "object" ? memory : {}),
  };

  collectExerciseRows(session).forEach((row) => {
    const previous = next[row.key] || {};
    const previousSignature = JSON.stringify(previous.last_sets || []);
    const nextSignature = JSON.stringify(row.sets || []);

    if (
      previousSignature === nextSignature &&
      previous.last_workout_name === row.workout_name
    ) {
      next[row.key] = {
        ...previous,
        last_performed_at: row.performed_at,
        updated_at: new Date().toISOString(),
      };
      return;
    }

    next[row.key] = mergeRow(next, row);
  });

  return next;
}

function getRecommendation(memory) {
  const lastSet = memory?.last_set;
  const bestSet = memory?.best_set;
  const weight = safeNumber(lastSet?.weight);
  const reps = safeNumber(lastSet?.reps);
  const bestWeight = safeNumber(bestSet?.weight);
  const bestReps = safeNumber(bestSet?.reps);
  const averageRpe = safeNumber(memory?.average_rpe);
  const previousSets = Array.isArray(memory?.last_sets)
    ? memory.last_sets.filter((set) => set?.set_type !== "warmup")
    : [];

  if (!lastSet) return null;

  const completedSetCount = previousSets.length;
  const painOrForm = Boolean(memory.pain_flag || memory.poor_form);
  const hitFailure = previousSets.some((set) => !!set.reached_failure);
  const cleanSession = !painOrForm && !hitFailure;
  const bestVolume = bestWeight * Math.max(bestReps, 1);
  const lastVolume = weight * Math.max(reps, 1);
  const performanceNote =
    bestVolume > 0 && lastVolume >= bestVolume
      ? "Matched or beat the best recent working set."
      : bestVolume > 0
      ? "Previous session finished below the best recent set."
      : "Previous working set is ready to carry forward.";

  if (painOrForm) {
    return {
      weight: weight > 0 ? String(Math.max(0, weight - 5)) : lastSet.weight,
      reps: lastSet.reps,
      action: "protect",
      confidence: "high",
      warning:
        "Pain or form was flagged last time. SYNC should protect the joints first.",
      note:
        "Reduce load slightly or choose an alternative if pain returns.",
      reason:
        "Previous pain or form feedback was recorded. Start conservatively and confirm pain-free movement.",
      previous_sets: completedSetCount,
      previous_effort: averageRpe || "",
      performance_note: performanceNote,
    };
  }

  if (averageRpe > 0 && averageRpe <= 7.5 && cleanSession) {
    const nextWeight =
      weight > 0
        ? String(
            Math.max(
              weight + 5,
              Math.round((weight * 1.025) / 5) * 5
            )
          )
        : lastSet.weight;

    return {
      weight: nextWeight,
      reps: lastSet.reps,
      action: "progress",
      confidence: "medium",
      warning: "",
      note:
        "Previous effort was controlled. Add a small jump if warmups feel clean.",
      reason:
        "The previous working sets were controlled, so a small progression is available.",
      previous_sets: completedSetCount,
      previous_effort: averageRpe || "",
      performance_note: performanceNote,
    };
  }

  if (averageRpe >= 9 || hitFailure) {
    return {
      weight: lastSet.weight,
      reps: reps > 1 ? String(reps) : lastSet.reps,
      action: "hold",
      confidence: "high",
      warning:
        hitFailure
          ? "Failure was recorded last time. Do not increase load yet."
          : "Previous effort was very high. Earn the same target cleaner first.",
      note:
        "Repeat the target and aim for better control before progressing.",
      reason:
        "The previous effort was very high. Repeat or slightly reduce the target before adding load.",
      previous_sets: completedSetCount,
      previous_effort: averageRpe || "",
      performance_note: performanceNote,
    };
  }

  return {
    weight: lastSet.weight,
    reps: lastSet.reps,
    action: "repeat",
    confidence: "medium",
    warning: "",
    note:
      "Repeat the previous target and make the reps cleaner before adding load.",
    reason:
      "Repeat the previous working target and improve consistency before progressing.",
    previous_sets: completedSetCount,
    previous_effort: averageRpe || "",
    performance_note: performanceNote,
  };
}

export function hydrateSessionWithExerciseMemory({ session, history }) {
  if (!session || typeof session !== "object") return session;

  const memory = buildExerciseMemoryFromHistory(
    history,
    readExerciseMemory()
  );
  writeExerciseMemory(memory);

  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  return {
    ...session,
    exercises: exercises.map((exercise) => {
      const exerciseName =
        exercise?.substitute_name || exercise?.name || "";
      const key = normalizeExerciseKey(exerciseName);
      const previous = key ? memory[key] || null : null;

      if (!previous) return exercise;

      const recommendation = getRecommendation(previous);
      const hasCurrentLogs =
        Array.isArray(exercise.set_logs) &&
        exercise.set_logs.length > 0;
      const currentWeight =
        exercise.current_target_weight ??
        exercise.planned_weight ??
        "";
      const currentReps =
        exercise.current_target_reps ??
        exercise.planned_reps ??
        "";

      return {
        ...exercise,
        exercise_memory_key: key,
        previous_performance: previous,
        memory_recommendation: recommendation,
        current_target_weight:
          hasCurrentLogs || cleanText(currentWeight)
            ? exercise.current_target_weight
            : recommendation?.weight ??
              previous.last_set?.weight ??
              "",
        current_target_reps:
          hasCurrentLogs || cleanText(currentReps)
            ? exercise.current_target_reps
            : recommendation?.reps ??
              previous.last_set?.reps ??
              "",
        memory_prefilled:
          !hasCurrentLogs &&
          !cleanText(currentWeight) &&
          !cleanText(currentReps),
        memory_action: recommendation?.action || "",
        memory_confidence: recommendation?.confidence || "",
        memory_warning: recommendation?.warning || "",
        memory_note: recommendation?.note || "",
        memory_reason: recommendation?.reason || "",
        memory_previous_sets:
          recommendation?.previous_sets ?? "",
        memory_previous_effort:
          recommendation?.previous_effort ?? "",
        memory_performance_note:
          recommendation?.performance_note || "",
      };
    }),
  };
}

export function persistSessionExerciseMemory(session, history) {
  const fromHistory = buildExerciseMemoryFromHistory(
    history,
    readExerciseMemory()
  );
  const next = mergeSessionIntoExerciseMemory(fromHistory, session);
  writeExerciseMemory(next);
  return next;
}
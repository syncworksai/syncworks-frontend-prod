// src/components/customer-health/healthPersonalRecords.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeName(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function getExerciseName(exercise = {}) {
  return (
    exercise.substituted && exercise.substitute_name
      ? exercise.substitute_name
      : exercise.name
  ) || "";
}

function workingSets(exercise = {}) {
  return (Array.isArray(exercise.set_logs) ? exercise.set_logs : []).filter(
    (setLog) => setLog?.set_type !== "warmup" && setLog?.completed !== false
  );
}

function setMetrics(setLog = {}) {
  const weight = safeNumber(setLog.actual_weight ?? setLog.weight, 0);
  const reps = safeNumber(setLog.actual_reps ?? setLog.reps, 0);
  return {
    weight,
    reps,
    volume: weight * reps,
    estimatedOneRepMax:
      weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0,
  };
}

function matchingHistoryExercises(history = [], targetName = "", currentSessionId = "") {
  const normalizedTarget = normalizeName(targetName);
  const matches = [];

  for (const entry of Array.isArray(history) ? history : []) {
    const session = entry?.session || {};
    if (currentSessionId && session.id === currentSessionId) continue;

    for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
      if (normalizeName(getExerciseName(exercise)) === normalizedTarget) {
        matches.push({ entry, session, exercise });
      }
    }
  }

  return matches;
}

function historicalBests(matches = []) {
  const setMetricsList = matches.flatMap((item) =>
    workingSets(item.exercise).map(setMetrics)
  );

  return {
    sessions: matches.length,
    maxWeight: Math.max(0, ...setMetricsList.map((item) => item.weight)),
    maxReps: Math.max(0, ...setMetricsList.map((item) => item.reps)),
    maxEstimatedOneRepMax: Math.max(
      0,
      ...setMetricsList.map((item) => item.estimatedOneRepMax)
    ),
    bestSessionVolume: Math.max(
      0,
      ...matches.map((item) =>
        workingSets(item.exercise)
          .map(setMetrics)
          .reduce((sum, setItem) => sum + setItem.volume, 0)
      )
    ),
  };
}

export function buildPersonalRecords({
  history = [],
  exercise = null,
  session = null,
} = {}) {
  if (!exercise) {
    return { hasHistory: false, records: [], current: null, previous: null };
  }

  const currentSets = workingSets(exercise).map(setMetrics);
  const current = {
    maxWeight: Math.max(0, ...currentSets.map((item) => item.weight)),
    maxReps: Math.max(0, ...currentSets.map((item) => item.reps)),
    maxEstimatedOneRepMax: Math.max(
      0,
      ...currentSets.map((item) => item.estimatedOneRepMax)
    ),
    sessionVolume: currentSets.reduce((sum, item) => sum + item.volume, 0),
    workingSets: currentSets.length,
  };

  const matches = matchingHistoryExercises(
    history,
    getExerciseName(exercise),
    session?.id || ""
  );
  const previous = historicalBests(matches);
  const records = [];

  if (currentSets.length) {
    if (current.maxWeight > previous.maxWeight) {
      records.push({
        id: "weight",
        label: "Weight PR",
        value: `${current.maxWeight} lb`,
        detail:
          previous.maxWeight > 0
            ? `Previous best ${previous.maxWeight} lb`
            : "First recorded weighted set",
      });
    }

    if (current.maxReps > previous.maxReps) {
      records.push({
        id: "reps",
        label: "Rep PR",
        value: `${current.maxReps} reps`,
        detail:
          previous.maxReps > 0
            ? `Previous best ${previous.maxReps} reps`
            : "First recorded working set",
      });
    }

    if (current.maxEstimatedOneRepMax > previous.maxEstimatedOneRepMax) {
      records.push({
        id: "estimated-1rm",
        label: "Estimated 1RM PR",
        value: `${Math.round(current.maxEstimatedOneRepMax)} lb`,
        detail:
          previous.maxEstimatedOneRepMax > 0
            ? `Previous estimate ${Math.round(previous.maxEstimatedOneRepMax)} lb`
            : "First strength estimate",
      });
    }

    if (current.sessionVolume > previous.bestSessionVolume) {
      records.push({
        id: "volume",
        label: "Volume PR",
        value: `${Math.round(current.sessionVolume)} lb`,
        detail:
          previous.bestSessionVolume > 0
            ? `Previous best ${Math.round(previous.bestSessionVolume)} lb`
            : "First recorded session volume",
      });
    }
  }

  return {
    hasHistory: previous.sessions > 0,
    records,
    current,
    previous,
  };
}

export function buildLastTimeComparison({
  history = [],
  exercise = null,
  session = null,
} = {}) {
  if (!exercise) return null;

  const matches = matchingHistoryExercises(
    history,
    getExerciseName(exercise),
    session?.id || ""
  );

  if (!matches.length) return null;

  const latest = [...matches].sort(
    (a, b) =>
      new Date(b.entry?.completed_at || b.session?.finished_at || 0).getTime() -
      new Date(a.entry?.completed_at || a.session?.finished_at || 0).getTime()
  )[0];

  const previousSets = workingSets(latest.exercise).map(setMetrics);
  const currentSets = workingSets(exercise).map(setMetrics);

  const previousVolume = previousSets.reduce((sum, item) => sum + item.volume, 0);
  const currentVolume = currentSets.reduce((sum, item) => sum + item.volume, 0);

  return {
    previousVolume,
    currentVolume,
    volumeDifference: currentVolume - previousVolume,
  };
}

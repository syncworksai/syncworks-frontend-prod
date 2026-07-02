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
  const weight = safeNumber(
    setLog.actual_weight ?? setLog.weight,
    0
  );
  const reps = safeNumber(
    setLog.actual_reps ?? setLog.reps,
    0
  );

  return {
    weight,
    reps,
    volume: weight * reps,
    estimatedOneRepMax:
      weight > 0 && reps > 0
        ? weight * (1 + reps / 30)
        : 0,
  };
}

function percentageGain(current, previous) {
  if (!(previous > 0) || !(current > previous)) {
    return 0;
  }

  return Math.round(
    ((current - previous) / previous) * 100
  );
}

function recordDetail({
  previous,
  current,
  unit,
  firstLabel,
}) {
  if (!(previous > 0)) return firstLabel;

  const gain = percentageGain(current, previous);

  return gain > 0
    ? `Previous best ${Math.round(previous)} ${unit} · +${gain}%`
    : `Previous best ${Math.round(previous)} ${unit}`;
}

function strengthMilestones(
  current = {},
  previous = {}
) {
  const milestones = [];

  const weightThresholds = [
    45, 95, 135, 185, 225, 275, 315, 365, 405, 495,
  ];

  for (const threshold of weightThresholds) {
    if (
      current.maxWeight >= threshold &&
      previous.maxWeight < threshold
    ) {
      milestones.push({
        id: `weight-${threshold}`,
        type: "strength",
        label: `${threshold} lb Milestone`,
        value: `${threshold} lb`,
        detail: "Heaviest working-set milestone reached.",
      });
    }
  }

  const repThresholds = [10, 12, 15, 20, 25, 30, 50];

  for (const threshold of repThresholds) {
    if (
      current.maxReps >= threshold &&
      previous.maxReps < threshold
    ) {
      milestones.push({
        id: `reps-${threshold}`,
        type: "endurance",
        label: `${threshold}-Rep Milestone`,
        value: `${threshold} reps`,
        detail: "Working-set repetition milestone reached.",
      });
    }
  }

  const volumeThresholds = [
    1000, 2500, 5000, 10000, 15000, 20000,
  ];

  for (const threshold of volumeThresholds) {
    if (
      current.sessionVolume >= threshold &&
      previous.bestSessionVolume < threshold
    ) {
      milestones.push({
        id: `volume-${threshold}`,
        type: "volume",
        label: `${threshold.toLocaleString()} lb Volume`,
        value: `${threshold.toLocaleString()} lb`,
        detail: "Exercise session-volume milestone reached.",
      });
    }
  }

  return milestones.slice(-3);
}

function bestRepsAtCurrentWeight(
  matches = [],
  weight = 0
) {
  if (!(weight > 0)) return 0;

  return Math.max(
    0,
    ...matches.flatMap((item) =>
      workingSets(item.exercise)
        .map(setMetrics)
        .filter(
          (metric) => metric.weight === weight
        )
        .map((metric) => metric.reps)
    )
  );
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
  const hasHistory = previous.sessions > 0;

  const currentTopWeightSet = [...currentSets]
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        b.reps - a.reps
    )[0] || null;

  const previousRepsAtWeight =
    currentTopWeightSet
      ? bestRepsAtCurrentWeight(
          matches,
          currentTopWeightSet.weight
        )
      : 0;

  if (currentSets.length && hasHistory) {
    if (current.maxWeight > previous.maxWeight) {
      records.push({
        id: "weight",
        label: "Weight PR",
        value: `${current.maxWeight} lb`,
        gain_percent: percentageGain(
          current.maxWeight,
          previous.maxWeight
        ),
        detail: recordDetail({
          previous: previous.maxWeight,
          current: current.maxWeight,
          unit: "lb",
          firstLabel: "First recorded weighted set",
        }),
      });
    }

    if (current.maxReps > previous.maxReps) {
      records.push({
        id: "reps",
        label: "Rep PR",
        value: `${current.maxReps} reps`,
        gain_percent: percentageGain(
          current.maxReps,
          previous.maxReps
        ),
        detail: recordDetail({
          previous: previous.maxReps,
          current: current.maxReps,
          unit: "reps",
          firstLabel: "First recorded working set",
        }),
      });
    }

    if (
      currentTopWeightSet?.weight > 0 &&
      currentTopWeightSet.reps >
        previousRepsAtWeight &&
      previousRepsAtWeight > 0
    ) {
      records.push({
        id: "reps-at-weight",
        label: "Rep-at-Weight PR",
        value: `${currentTopWeightSet.weight} lb × ${currentTopWeightSet.reps}`,
        gain_percent: percentageGain(
          currentTopWeightSet.reps,
          previousRepsAtWeight
        ),
        detail: `Previous best at this weight: ${previousRepsAtWeight} reps`,
      });
    }

    if (
      current.maxEstimatedOneRepMax >
      previous.maxEstimatedOneRepMax
    ) {
      records.push({
        id: "estimated-1rm",
        label: "Estimated 1RM PR",
        value: `${Math.round(
          current.maxEstimatedOneRepMax
        )} lb`,
        gain_percent: percentageGain(
          current.maxEstimatedOneRepMax,
          previous.maxEstimatedOneRepMax
        ),
        detail: recordDetail({
          previous:
            previous.maxEstimatedOneRepMax,
          current:
            current.maxEstimatedOneRepMax,
          unit: "lb",
          firstLabel: "First strength estimate",
        }),
      });
    }

    if (
      current.sessionVolume >
      previous.bestSessionVolume
    ) {
      records.push({
        id: "volume",
        label: "Volume PR",
        value: `${Math.round(
          current.sessionVolume
        ).toLocaleString()} lb`,
        gain_percent: percentageGain(
          current.sessionVolume,
          previous.bestSessionVolume
        ),
        detail: recordDetail({
          previous:
            previous.bestSessionVolume,
          current: current.sessionVolume,
          unit: "lb",
          firstLabel:
            "First recorded session volume",
        }),
      });
    }
  }

  const milestones = strengthMilestones(
    current,
    previous
  );

  return {
    hasHistory,
    isBaseline:
      currentSets.length > 0 && !hasHistory,
    records,
    milestones,
    current,
    previous,
    headline:
      records.length > 0
        ? records.length === 1
          ? "New personal record"
          : `${records.length} new personal records`
        : milestones.length > 0
        ? "New training milestone"
        : hasHistory
        ? "Chasing the next record"
        : "Baseline established",
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

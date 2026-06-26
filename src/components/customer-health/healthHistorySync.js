// src/components/customer-health/healthHistorySync.js

const HISTORY_BACKUP_KEY =
  "sw_customer_health_history_backup_v1";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeDate(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeSession(entry = {}) {
  if (entry?.session && typeof entry.session === "object") {
    return entry.session;
  }

  if (
    entry?.type === "workout_session" &&
    Array.isArray(entry?.exercises)
  ) {
    return entry;
  }

  return null;
}

function normalizeHistoryEntry(entry = {}, index = 0) {
  const session = normalizeSession(entry);
  if (!session) return null;

  const completedAt =
    entry.completed_at ||
    session.finished_at ||
    session.saved_at ||
    session.completed_at ||
    "";

  return {
    ...entry,
    id:
      entry.id ||
      `recovered-history-${session.id || index}`,
    type: entry.type || "workout_session",
    source:
      entry.source || "recovered_health_history",
    ymd: entry.ymd || session.ymd || "",
    workout_name:
      entry.workout_name ||
      session.workout_name ||
      "Workout",
    workout_id:
      entry.workout_id ||
      session.workout_id ||
      "",
    planner_item_id:
      entry.planner_item_id ||
      session.planner_item_id ||
      "",
    completed_at: completedAt,
    session: {
      ...session,
      status: session.status || "completed",
      finished_at:
        session.finished_at || completedAt,
      saved_at:
        session.saved_at || completedAt,
      exercises: Array.isArray(session.exercises)
        ? session.exercises
        : [],
    },
  };
}

function countSetLogs(entry = {}) {
  return asArray(entry?.session?.exercises).reduce(
    (total, exercise) =>
      total + asArray(exercise?.set_logs).length,
    0
  );
}

function completenessScore(entry = {}) {
  const session = entry?.session || {};
  const exercises = asArray(session.exercises);

  return (
    countSetLogs(entry) * 100 +
    exercises.length * 10 +
    (session.summary ? 5 : 0) +
    (entry.summary ? 5 : 0) +
    (session.notes ? 1 : 0)
  );
}

function historyKey(entry = {}, index = 0) {
  const session = entry?.session || {};

  if (session.id) return `session:${session.id}`;
  if (entry.id) return `entry:${entry.id}`;

  const plannerId =
    entry.planner_item_id ||
    session.planner_item_id ||
    "";

  const completedAt =
    entry.completed_at ||
    session.finished_at ||
    session.saved_at ||
    "";

  if (plannerId && completedAt) {
    return `planner:${plannerId}:${completedAt}`;
  }

  return [
    "fallback",
    entry.workout_id || session.workout_id || "",
    entry.workout_name ||
      session.workout_name ||
      "workout",
    completedAt,
    index,
  ].join(":");
}

function chooseMoreComplete(current, candidate) {
  const currentScore = completenessScore(current);
  const candidateScore = completenessScore(candidate);

  if (candidateScore > currentScore) return candidate;
  if (candidateScore < currentScore) return current;

  const currentTime = safeDate(
    current?.completed_at ||
      current?.session?.saved_at
  );

  const candidateTime = safeDate(
    candidate?.completed_at ||
      candidate?.session?.saved_at
  );

  return candidateTime > currentTime
    ? candidate
    : current;
}

export function mergeHealthHistory({
  localHistory = [],
  cloudHistory = [],
} = {}) {
  const normalizedLocal = asArray(localHistory)
    .map(normalizeHistoryEntry)
    .filter(Boolean);

  const normalizedCloud = asArray(cloudHistory)
    .map(normalizeHistoryEntry)
    .filter(Boolean);

  const mergedByKey = new Map();
  let duplicatesMerged = 0;

  [...normalizedLocal, ...normalizedCloud].forEach(
    (entry, index) => {
      const key = historyKey(entry, index);

      if (!mergedByKey.has(key)) {
        mergedByKey.set(key, entry);
        return;
      }

      duplicatesMerged += 1;
      mergedByKey.set(
        key,
        chooseMoreComplete(
          mergedByKey.get(key),
          entry
        )
      );
    }
  );

  const history = [...mergedByKey.values()].sort(
    (a, b) =>
      safeDate(
        b.completed_at ||
          b.session?.finished_at
      ) -
      safeDate(
        a.completed_at ||
          a.session?.finished_at
      )
  );

  return {
    history,
    report: {
      local_count: normalizedLocal.length,
      cloud_count: normalizedCloud.length,
      final_count: history.length,
      duplicates_merged: duplicatesMerged,
      local_preserved:
        normalizedLocal.length > 0 &&
        normalizedCloud.length === 0,
    },
  };
}

export function backupHealthHistory(history = []) {
  if (
    typeof window === "undefined" ||
    !Array.isArray(history) ||
    !history.length
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      HISTORY_BACKUP_KEY,
      JSON.stringify({
        backed_up_at: new Date().toISOString(),
        history,
      })
    );
  } catch {
    // Backup is best effort.
  }
}

export function getHealthHistoryBackup() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(
      HISTORY_BACKUP_KEY
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed?.history)
      ? parsed.history
      : [];
  } catch {
    return [];
  }
}

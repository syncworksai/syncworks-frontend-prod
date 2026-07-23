// src/components/customer-health/healthRecoveryEngine.js

const HOUR = 60 * 60 * 1000;

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,|/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sessionTime(session = {}) {
  return new Date(
    session.finished_at ||
      session.completed_at ||
      session.actual_completion_date ||
      session.updated_at ||
      0
  ).getTime();
}

function collectMuscles(session = {}) {
  const values = new Set([
    ...toArray(session.primary_muscles),
    ...toArray(session.secondary_muscles),
  ]);

  for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
    for (const item of [
      ...toArray(exercise.primary_muscles),
      ...toArray(exercise.secondary_muscles),
      exercise.target,
      exercise.focus,
    ]) {
      if (item) values.add(item);
    }
  }

  return [...values].map(normalize).filter(Boolean);
}

function averageRpe(session = {}) {
  const values = [];

  for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
    for (const setLog of Array.isArray(exercise.set_logs) ? exercise.set_logs : []) {
      const value = Number(setLog.rpe || setLog.ease_score || 0);
      if (Number.isFinite(value) && value > 0) values.push(value);
    }
  }

  if (!values.length) return Number(session.average_rpe || 0) || 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function highestPain(session = {}) {
  let highest = Number(session.pain_score || 0) || 0;

  for (const exercise of Array.isArray(session.exercises) ? session.exercises : []) {
    highest = Math.max(highest, Number(exercise.pain_score || 0) || 0);

    for (const setLog of Array.isArray(exercise.set_logs) ? exercise.set_logs : []) {
      highest = Math.max(highest, Number(setLog.pain_score || 0) || 0);
    }
  }

  return highest;
}

function statusFor(score) {
  if (score >= 8) return "Avoid Heavy Loading";
  if (score >= 5) return "Recovering";
  if (score >= 3) return "Use Caution";
  return "Ready";
}

export function buildRecoveryAnalysis({
  history = [],
  snapshot = {},
  now = new Date(),
} = {}) {
  const nowMs = now.getTime();
  const recent = (Array.isArray(history) ? history : [])
    .filter((session) => {
      const time = sessionTime(session);
      return Number.isFinite(time) && time > 0 && nowMs - time <= 72 * HOUR;
    })
    .sort((a, b) => sessionTime(b) - sessionTime(a));

  const muscleMap = new Map();

  for (const session of recent) {
    const hoursAgo = Math.max(0, (nowMs - sessionTime(session)) / HOUR);
    const recency = hoursAgo <= 24 ? 4 : hoursAgo <= 48 ? 2.5 : 1.25;
    const rpe = averageRpe(session);
    const pain = highestPain(session);
    const sets = Number(session.completed_sets || 0);
    const load =
      recency +
      (rpe >= 9 ? 3 : rpe >= 8 ? 2 : rpe >= 7 ? 1 : 0) +
      (pain >= 7 ? 5 : pain >= 4 ? 3 : pain > 0 ? 1 : 0) +
      (sets >= 18 ? 2 : sets >= 10 ? 1 : 0);

    for (const muscle of collectMuscles(session)) {
      const current = muscleMap.get(muscle) || {
        muscle,
        score: 0,
        sessions: 0,
        latest_hours_ago: 999,
      };

      current.score += load;
      current.sessions += 1;
      current.latest_hours_ago = Math.min(current.latest_hours_ago, hoursAgo);
      muscleMap.set(muscle, current);
    }
  }

  const sorenessAreas = toArray(snapshot.soreness_areas).map(normalize);
  const severity = String(snapshot.soreness_severity || "").toLowerCase();

  for (const muscle of sorenessAreas) {
    const current = muscleMap.get(muscle) || {
      muscle,
      score: 0,
      sessions: 0,
      latest_hours_ago: 999,
    };

    current.score += severity.includes("high")
      ? 6
      : severity.includes("moderate")
      ? 4
      : 2;

    muscleMap.set(muscle, current);
  }

  const muscles = [...muscleMap.values()]
    .map((item) => ({
      ...item,
      score: Math.round(item.score * 10) / 10,
      status: statusFor(item.score),
    }))
    .sort((a, b) => b.score - a.score);

  const avoid = muscles.filter((item) => item.status === "Avoid Heavy Loading");
  const recovering = muscles.filter((item) => item.status === "Recovering");
  const caution = muscles.filter((item) => item.status === "Use Caution");

  const overall =
    avoid.length > 0
      ? "Protect"
      : recovering.length > 0
      ? "Recovering"
      : caution.length > 0
      ? "Use Caution"
      : "Ready";

  const recommendation =
    avoid.length > 0
      ? `Avoid heavy loading for ${avoid.slice(0, 3).map((item) => item.muscle).join(", ")}.`
      : recovering.length > 0
      ? `${recovering.slice(0, 3).map((item) => item.muscle).join(", ")} are still recovering. Reduce volume or train another pattern.`
      : caution.length > 0
      ? `Use controlled loading for ${caution.slice(0, 3).map((item) => item.muscle).join(", ")}.`
      : "Recent training load supports normal progression today.";

  return {
    generated_at: now.toISOString(),
    window_hours: 72,
    recent_session_count: recent.length,
    overall,
    recommendation,
    muscles,
  };
}

function workoutMuscles(workout = {}) {
  const values = new Set([
    ...toArray(workout.primary_muscles),
    ...toArray(workout.secondary_muscles),
    workout.body_region,
    workout.training_category,
    workout.focus,
  ]);

  for (const exercise of Array.isArray(workout.exercises) ? workout.exercises : []) {
    for (const item of [
      ...toArray(exercise.primary_muscles),
      ...toArray(exercise.secondary_muscles),
      exercise.target,
      exercise.focus,
    ]) {
      if (item) values.add(item);
    }
  }

  return [...values].map(normalize).filter(Boolean);
}

export function evaluateWorkoutRecovery(workout = {}, analysis = {}) {
  const targets = workoutMuscles(workout);
  const matches = (Array.isArray(analysis.muscles) ? analysis.muscles : []).filter(
    (row) =>
      targets.some(
        (target) =>
          row.muscle.includes(target) ||
          target.includes(row.muscle)
      )
  );

  const blocked = matches.filter((row) => row.status === "Avoid Heavy Loading");
  const recovering = matches.filter((row) => row.status === "Recovering");
  const caution = matches.filter((row) => row.status === "Use Caution");

  const decision =
    blocked.length > 0
      ? "replace_or_recovery"
      : recovering.length > 0
      ? "reduce_volume"
      : caution.length > 0
      ? "proceed_with_caution"
      : "proceed";

  const explanation =
    decision === "replace_or_recovery"
      ? `This workout overlaps muscles that should not be heavily loaded yet: ${blocked.map((item) => item.muscle).join(", ")}.`
      : decision === "reduce_volume"
      ? `This workout overlaps recovering muscles: ${recovering.map((item) => item.muscle).join(", ")}.`
      : decision === "proceed_with_caution"
      ? `Use a conservative first set because ${caution.map((item) => item.muscle).join(", ")} still show recent fatigue.`
      : "No meaningful recovery conflict was found in the last 72 hours.";

  return {
    decision,
    explanation,
    requires_workout_review: decision !== "proceed",
    auto_start_blocked: decision === "replace_or_recovery",
    matched_muscles: matches.map((item) => item.muscle),
  };
}

export function adaptWorkoutForRecovery(workout = {}, analysis = {}) {
  if (!workout) return workout;

  const evaluation = evaluateWorkoutRecovery(workout, analysis);

  return {
    ...workout,
    recovery_decision: evaluation.decision,
    recovery_explanation: evaluation.explanation,
    recovery_conflict_muscles: evaluation.matched_muscles,
    requires_workout_review: evaluation.requires_workout_review,
    auto_start_blocked: evaluation.auto_start_blocked,
  };
}

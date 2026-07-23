// src/components/customer-health/healthProgressSimulation.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sessionFromEntry(entry = {}) {
  return entry?.session || entry || {};
}

function exerciseSets(exercise = {}) {
  return (Array.isArray(exercise.set_logs) ? exercise.set_logs : []).filter(
    (setLog) =>
      setLog?.completed !== false &&
      setLog?.set_type !== "warmup"
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
  };
}

function completedAt(session = {}, entry = {}) {
  const raw =
    session.completed_at ||
    session.ended_at ||
    entry.completed_at ||
    entry.created_at ||
    session.date ||
    entry.date;

  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

export function buildProgressSummary({
  history = [],
  snapshot = {},
} = {}) {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const twentyEightDays = 28 * 24 * 60 * 60 * 1000;

  const completed = (Array.isArray(history) ? history : [])
    .map((entry) => ({
      entry,
      session: sessionFromEntry(entry),
    }))
    .filter(({ session }) =>
      ["completed", "complete", "finished"].includes(
        String(session.status || "completed").toLowerCase()
      )
    );

  const summarize = (windowMs) => {
    const sessions = completed.filter(
      ({ entry, session }) =>
        completedAt(session, entry) >= now - windowMs
    );

    let volume = 0;
    let sets = 0;
    let activeMinutes = 0;
    const exerciseNames = new Set();

    for (const { session } of sessions) {
      activeMinutes += safeNumber(
        session.active_minutes ||
          session.active_duration_minutes ||
          session.duration_minutes,
        0
      );

      for (const exercise of Array.isArray(session.exercises)
        ? session.exercises
        : []) {
        const name = String(
          exercise.substitute_name || exercise.name || ""
        ).trim();

        if (name) exerciseNames.add(name.toLowerCase());

        const workingSets = exerciseSets(exercise);
        sets += workingSets.length;
        volume += workingSets
          .map(setMetrics)
          .reduce((sum, item) => sum + item.volume, 0);
      }
    }

    return {
      sessions: sessions.length,
      volume: Math.round(volume),
      sets,
      activeMinutes: Math.round(activeMinutes),
      exerciseVariety: exerciseNames.size,
    };
  };

  const week = summarize(sevenDays);
  const month = summarize(twentyEightDays);
  const weeklyTarget = Math.max(
    1,
    safeNumber(
      snapshot.weekly_workout_goal ||
        snapshot.workouts_per_week ||
        snapshot.training_days_per_week,
      3
    )
  );

  const adherence = Math.min(
    100,
    Math.round((week.sessions / weeklyTarget) * 100)
  );

  const streak = completed
    .map(({ entry, session }) => completedAt(session, entry))
    .filter(Boolean)
    .sort((a, b) => b - a)
    .reduce(
      (result, time, index, times) => {
        if (index === 0) return { count: 1, previous: time };
        const dayGap = Math.round(
          (result.previous - time) / (24 * 60 * 60 * 1000)
        );
        return dayGap <= 2
          ? { count: result.count + 1, previous: time }
          : result;
      },
      { count: 0, previous: 0 }
    ).count;

  return {
    week,
    month,
    weeklyTarget,
    adherence,
    streak,
    trend:
      month.sessions > 0
        ? Math.round(
            ((week.sessions * 4 - month.sessions) /
              Math.max(1, month.sessions)) *
              100
          )
        : 0,
  };
}

export function simulateTrainingProgram({
  weekPlan = [],
  history = [],
  snapshot = {},
  weeks = 8,
} = {}) {
  const summary = buildProgressSummary({ history, snapshot });
  const plannedSessions = Math.max(
    1,
    (Array.isArray(weekPlan) ? weekPlan : []).filter(
      (item) =>
        item?.workout_name &&
        !["Skipped", "Rest"].includes(item?.status)
    ).length || summary.weeklyTarget
  );

  const expectedAdherence = Math.max(
    0.45,
    Math.min(
      1,
      summary.adherence > 0 ? summary.adherence / 100 : 0.75
    )
  );

  const baselineVolume =
    summary.week.volume > 0
      ? summary.week.volume
      : summary.month.volume > 0
      ? Math.round(summary.month.volume / 4)
      : 0;

  const projection = [];
  let projectedVolume = baselineVolume;

  for (let index = 1; index <= weeks; index += 1) {
    const deload = index % 4 === 0;
    const growthRate = deload ? 0.88 : 1.025;

    projectedVolume =
      projectedVolume > 0
        ? Math.round(projectedVolume * growthRate)
        : 0;

    projection.push({
      week: index,
      label: `Week ${index}`,
      plannedSessions,
      expectedSessions: Math.max(
        1,
        Math.round(plannedSessions * expectedAdherence)
      ),
      projectedVolume,
      phase: deload ? "Recovery week" : "Build week",
      loadPercent: deload ? 88 : Math.round(100 + index * 2.5),
    });
  }

  return {
    weeks,
    expectedAdherence: Math.round(expectedAdherence * 100),
    plannedSessions,
    baselineVolume,
    projectedSessions: projection.reduce(
      (sum, week) => sum + week.expectedSessions,
      0
    ),
    projection,
    note:
      "Simulation is directional. SYNC should adjust the real plan using completed workouts, pain, soreness, sleep, readiness, and available time.",
  };
}

export function buildPlanControlOptions({
  hasPlan = false,
  hasHistory = false,
} = {}) {
  return [
    {
      id: "review",
      label: "Review Plan",
      detail: "Inspect the current week before making changes.",
      enabled: hasPlan,
      route: "plan-today",
    },
    {
      id: "rebuild",
      label: "Rebuild Plan",
      detail: "Create a new plan from goals, schedule, recovery, and equipment.",
      enabled: true,
      route: "workout-plan-builder",
    },
    {
      id: "restart-keep",
      label: "Restart + Keep Weights",
      detail: "Restart the program while preserving prior working weights.",
      enabled: hasPlan || hasHistory,
      route: "restart-plan-keep-weights",
    },
    {
      id: "reset",
      label: "Reset Plan",
      detail: "Clear the active program only after confirmation.",
      enabled: hasPlan,
      route: "reset-health-plan",
      destructive: true,
    },
  ];
}

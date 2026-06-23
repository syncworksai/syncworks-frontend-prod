// src/components/customer-health/healthDailyLifecycle.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function isValidDate(date) {
  return (
    date instanceof Date &&
    Number.isFinite(date.getTime())
  );
}

function parseLocalYmd(ymd) {
  if (!ymd) return null;

  const parsed = new Date(
    `${ymd}T12:00:00`
  );

  return isValidDate(parsed)
    ? parsed
    : null;
}

function addDays(date, days) {
  const next = new Date(date);

  next.setDate(
    next.getDate() + days
  );

  return next;
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function normalizeStatus(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isCompletedStatus(value = "") {
  return normalizeStatus(value) === "completed";
}

function isSkippedStatus(value = "") {
  return normalizeStatus(value) === "skipped";
}

function isRestStatus(value = "") {
  const normalized =
    normalizeStatus(value);

  return (
    normalized === "rest day" ||
    normalized === "rest" ||
    normalized === "recovery"
  );
}

function hasWorkout(item = {}) {
  return Boolean(
    String(
      item?.workout_name || ""
    ).trim()
  );
}

function normalizeWeekPlan(
  weekPlan = []
) {
  return Array.isArray(weekPlan)
    ? weekPlan.filter(Boolean)
    : [];
}

export function localYmd(
  date = new Date()
) {
  const yyyy =
    date.getFullYear();

  const mm = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const dd = String(
    date.getDate()
  ).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function startOfLocalDayIso(
  date = new Date()
) {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );

  return start.toISOString();
}

export function getWorkoutCompletedYmd(
  item = {}
) {
  const raw =
    item?.completed_at ||
    item?.session?.finished_at ||
    item?.session?.saved_at ||
    item?.summary?.finished_at ||
    item?.created_at ||
    "";

  if (!raw) {
    return (
      item?.ymd ||
      item?.session?.ymd ||
      ""
    );
  }

  const parsed = new Date(raw);

  return isValidDate(parsed)
    ? localYmd(parsed)
    : "";
}

export function countWorkoutsForDay(
  history = [],
  ymd = localYmd()
) {
  return (
    Array.isArray(history)
      ? history
      : []
  ).filter(
    (item) =>
      getWorkoutCompletedYmd(
        item
      ) === ymd
  ).length;
}

export function getLocalWeekBounds(
  date = new Date()
) {
  const current = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const currentDay =
    current.getDay();

  // Monday begins the SyncWorks training week.
  const mondayOffset =
    currentDay === 0
      ? -6
      : 1 - currentDay;

  const start = new Date(current);

  start.setDate(
    current.getDate() +
      mondayOffset
  );

  const end = new Date(start);

  end.setDate(
    start.getDate() + 6
  );

  return {
    startYmd: localYmd(start),
    endYmd: localYmd(end),
    startDate: start,
    endDate: end,
  };
}

export function countWorkoutsThisWeek(
  history = [],
  date = new Date()
) {
  const {
    startYmd,
    endYmd,
  } = getLocalWeekBounds(date);

  return (
    Array.isArray(history)
      ? history
      : []
  ).filter((item) => {
    const ymd =
      getWorkoutCompletedYmd(
        item
      );

    return (
      ymd &&
      ymd >= startYmd &&
      ymd <= endYmd
    );
  }).length;
}

export function getWeekPlanBounds(
  weekPlan = []
) {
  const dates = normalizeWeekPlan(
    weekPlan
  )
    .map((item) => item?.ymd)
    .filter(Boolean)
    .sort();

  if (!dates.length) {
    return {
      startYmd: "",
      endYmd: "",
      hasDates: false,
    };
  }

  return {
    startYmd: dates[0],
    endYmd:
      dates[dates.length - 1],
    hasDates: true,
  };
}

export function isWeekPlanExpired(
  weekPlan = [],
  now = new Date()
) {
  const { endYmd, hasDates } =
    getWeekPlanBounds(
      weekPlan
    );

  if (!hasDates) {
    return false;
  }

  return endYmd < localYmd(now);
}

export function isWeekPlanCurrent(
  weekPlan = [],
  now = new Date()
) {
  const {
    startYmd,
    endYmd,
    hasDates,
  } = getWeekPlanBounds(
    weekPlan
  );

  if (!hasDates) {
    return false;
  }

  const today = localYmd(now);

  return (
    today >= startYmd &&
    today <= endYmd
  );
}

export function isWeekPlanFuture(
  weekPlan = [],
  now = new Date()
) {
  const {
    startYmd,
    hasDates,
  } = getWeekPlanBounds(
    weekPlan
  );

  if (!hasDates) {
    return false;
  }

  return startYmd > localYmd(now);
}

export function summarizeWeekPlan(
  weekPlan = [],
  history = []
) {
  const plan = normalizeWeekPlan(
    weekPlan
  );

  const bounds =
    getWeekPlanBounds(plan);

  const plannedSessions =
    plan.filter(
      (item) =>
        hasWorkout(item) &&
        !isRestStatus(
          item?.status
        )
    );

  const completedSessions =
    plannedSessions.filter(
      (item) =>
        isCompletedStatus(
          item?.status
        )
    );

  const skippedSessions =
    plannedSessions.filter(
      (item) =>
        isSkippedStatus(
          item?.status
        )
    );

  const restDays =
    plan.filter(
      (item) =>
        !hasWorkout(item) ||
        isRestStatus(
          item?.status
        )
    );

  const historyItems =
    (
      Array.isArray(history)
        ? history
        : []
    ).filter((item) => {
      const ymd =
        getWorkoutCompletedYmd(
          item
        );

      if (
        !ymd ||
        !bounds.hasDates
      ) {
        return false;
      }

      return (
        ymd >= bounds.startYmd &&
        ymd <= bounds.endYmd
      );
    });

  const completedCount =
    Math.max(
      completedSessions.length,
      historyItems.length
    );

  const completionRate =
    plannedSessions.length > 0
      ? Math.round(
          (
            completedCount /
            plannedSessions.length
          ) * 100
        )
      : 0;

  return {
    start_ymd:
      bounds.startYmd,

    end_ymd:
      bounds.endYmd,

    total_days:
      plan.length,

    planned_sessions:
      plannedSessions.length,

    completed_sessions:
      completedCount,

    skipped_sessions:
      skippedSessions.length,

    rest_days:
      restDays.length,

    completion_rate:
      Math.max(
        0,
        Math.min(
          100,
          completionRate
        )
      ),

    history_count:
      historyItems.length,

    workout_names:
      plannedSessions
        .map(
          (item) =>
            item.workout_name
        )
        .filter(Boolean),

    completed_workout_names:
      historyItems
        .map(
          (item) =>
            item.workout_name ||
            item?.session
              ?.workout_name ||
            ""
        )
        .filter(Boolean),
  };
}

function buildWeeklyArchiveEntry({
  weekPlan = [],
  history = [],
  archivedAt = new Date(),
}) {
  const plan = normalizeWeekPlan(
    weekPlan
  );

  const summary =
    summarizeWeekPlan(
      plan,
      history
    );

  return {
    id:
      summary.start_ymd &&
      summary.end_ymd
        ? `week-${summary.start_ymd}-${summary.end_ymd}`
        : uid("week"),

    start_ymd:
      summary.start_ymd,

    end_ymd:
      summary.end_ymd,

    archived_at:
      archivedAt.toISOString(),

    summary,

    week_plan:
      plan.map((item) => ({
        ...item,
      })),
  };
}

function mergeWeeklyArchive(
  weeklyHistory = [],
  archiveEntry
) {
  const existing =
    Array.isArray(
      weeklyHistory
    )
      ? weeklyHistory
      : [];

  const withoutSameWeek =
    existing.filter(
      (item) =>
        !(
          item?.start_ymd ===
            archiveEntry.start_ymd &&
          item?.end_ymd ===
            archiveEntry.end_ymd
        )
    );

  // Preserve roughly two years of weekly history.
  return [
    archiveEntry,
    ...withoutSameWeek,
  ].slice(0, 110);
}

export function archiveCurrentWeekPlan({
  snapshot = {},
  history = [],
  now = new Date(),
  clearCurrentPlan = false,
} = {}) {
  const weekPlan =
    normalizeWeekPlan(
      snapshot.week_plan
    );

  if (!weekPlan.length) {
    return {
      changed: false,
      archived: false,
      snapshot,
      archiveEntry: null,
    };
  }

  const archiveEntry =
    buildWeeklyArchiveEntry({
      weekPlan,
      history,
      archivedAt: now,
    });

  const weeklyHistory =
    mergeWeeklyArchive(
      snapshot.weekly_history,
      archiveEntry
    );

  return {
    changed: true,
    archived: true,
    archiveEntry,

    snapshot: {
      ...snapshot,

      weekly_history:
        weeklyHistory,

      last_archived_week:
        archiveEntry,

      last_week_summary:
        archiveEntry.summary,

      last_week_archived_at:
        now.toISOString(),

      week_plan:
        clearCurrentPlan
          ? []
          : weekPlan,
    },
  };
}

function findWorkoutByIdOrName(
  workouts = [],
  item = {}
) {
  const safeWorkouts =
    Array.isArray(workouts)
      ? workouts
      : [];

  return (
    safeWorkouts.find(
      (workout) =>
        item?.workout_id &&
        workout?.id ===
          item.workout_id
    ) ||
    safeWorkouts.find(
      (workout) =>
        String(
          workout?.name || ""
        )
          .trim()
          .toLowerCase() ===
        String(
          item?.workout_name || ""
        )
          .trim()
          .toLowerCase()
    ) ||
    null
  );
}

function inferNextPlanStart(
  now = new Date()
) {
  const {
    startDate,
  } = getLocalWeekBounds(now);

  const nextMonday =
    addDays(startDate, 7);

  return nextMonday;
}

function copyPlannerItemToDate({
  item = {},
  date,
  workouts = [],
  mode = "repeat",
  index = 0,
}) {
  const selectedWorkout =
    findWorkoutByIdOrName(
      workouts,
      item
    );

  const workoutName =
    selectedWorkout?.name ||
    item.workout_name ||
    "";

  const workoutId =
    selectedWorkout?.id ||
    item.workout_id ||
    "";

  const isRest =
    !workoutName ||
    isRestStatus(
      item.status
    );

  const adaptedNote =
    mode === "adaptive"
      ? "Adapted from last week using your completed workout data."
      : "Repeated from last week.";

  return {
    ...item,

    id: uid("plan"),

    ymd: localYmd(date),

    day_label:
      date.toLocaleDateString(
        undefined,
        {
          weekday: "short",
        }
      ),

    workout_id:
      isRest ? "" : workoutId,

    workout_name:
      isRest
        ? ""
        : workoutName,

    status:
      isRest
        ? "Rest Day"
        : "Planned",

    note:
      isRest
        ? "Recovery / open day"
        : adaptedNote,

    source:
      mode === "adaptive"
        ? "adaptive_week_rollover"
        : "repeated_week",

    previous_plan_id:
      item.id || "",

    previous_status:
      item.status || "",

    carried_forward_at:
      new Date().toISOString(),

    sequence:
      index + 1,

    completed_at: "",
  };
}

function hasPlanForBounds(
  snapshot = {},
  startYmd,
  endYmd
) {
  const currentBounds =
    getWeekPlanBounds(
      snapshot.week_plan
    );

  if (
    currentBounds.hasDates &&
    currentBounds.startYmd ===
      startYmd &&
    currentBounds.endYmd ===
      endYmd
  ) {
    return true;
  }

  const archived =
    Array.isArray(
      snapshot.weekly_history
    )
      ? snapshot.weekly_history
      : [];

  return archived.some(
    (item) =>
      item?.start_ymd ===
        startYmd &&
      item?.end_ymd ===
        endYmd
  );
}

export function buildNextWeekPlan({
  previousWeekPlan = [],
  workouts = [],
  now = new Date(),
  mode = "adaptive",
} = {}) {
  const previousPlan =
    normalizeWeekPlan(
      previousWeekPlan
    );

  const startDate =
    inferNextPlanStart(now);

  return Array.from({
    length: 7,
  }).map((_, index) => {
    const date = addDays(
      startDate,
      index
    );

    const previousItem =
      previousPlan[index] || {};

    return copyPlannerItemToDate({
      item: previousItem,
      date,
      workouts,
      mode,
      index,
    });
  });
}

export function createNextWeekFromSnapshot({
  snapshot = {},
  history = [],
  workouts = [],
  now = new Date(),
  mode = "adaptive",
} = {}) {
  const currentPlan =
    normalizeWeekPlan(
      snapshot.week_plan
    );

  const archiveResult =
    currentPlan.length
      ? archiveCurrentWeekPlan({
          snapshot,
          history,
          now,
          clearCurrentPlan: false,
        })
      : {
          snapshot,
          archived: false,
          archiveEntry: null,
        };

  const sourceSnapshot =
    archiveResult.snapshot ||
    snapshot;

  const previousPlan =
    currentPlan.length
      ? currentPlan
      : sourceSnapshot
          ?.last_archived_week
          ?.week_plan ||
        [];

  const nextPlan =
    buildNextWeekPlan({
      previousWeekPlan:
        previousPlan,

      workouts,
      now,
      mode,
    });

  const nextBounds =
    getWeekPlanBounds(
      nextPlan
    );

  const currentBounds =
    getWeekPlanBounds(
      sourceSnapshot.week_plan
    );

  const duplicateCurrentWeek =
    currentBounds.hasDates &&
    currentBounds.startYmd ===
      nextBounds.startYmd &&
    currentBounds.endYmd ===
      nextBounds.endYmd;

  if (duplicateCurrentWeek) {
    return {
      changed: false,
      duplicate: true,
      archived:
        archiveResult.archived,

      archiveEntry:
        archiveResult.archiveEntry,

      weekPlan:
        sourceSnapshot.week_plan,

      snapshot:
        sourceSnapshot,
    };
  }

  return {
    changed: true,
    duplicate: false,
    archived:
      archiveResult.archived,

    archiveEntry:
      archiveResult.archiveEntry,

    weekPlan: nextPlan,

    snapshot: {
      ...sourceSnapshot,

      week_plan:
        nextPlan,

      active_week_start:
        nextBounds.startYmd,

      active_week_end:
        nextBounds.endYmd,

      week_plan_status:
        "active",

      week_plan_source:
        mode === "adaptive"
          ? "adaptive_rollover"
          : "repeated_week",

      week_plan_created_at:
        now.toISOString(),

      last_week_rollover_at:
        now.toISOString(),
    },
  };
}

export function ensureCurrentHealthWeek({
  snapshot = {},
  history = [],
  workouts = [],
  now = new Date(),
  autoCreate = false,
  mode = "adaptive",
} = {}) {
  const weekPlan =
    normalizeWeekPlan(
      snapshot.week_plan
    );

  const bounds =
    getWeekPlanBounds(
      weekPlan
    );

  const expired =
    isWeekPlanExpired(
      weekPlan,
      now
    );

  const current =
    isWeekPlanCurrent(
      weekPlan,
      now
    );

  const future =
    isWeekPlanFuture(
      weekPlan,
      now
    );

  if (
    !weekPlan.length
  ) {
    return {
      changed: false,
      expired: false,
      current: false,
      future: false,
      missing: true,

      summary:
        summarizeWeekPlan(
          weekPlan,
          history
        ),

      snapshot: {
        ...snapshot,

        week_plan_status:
          "missing",
      },
    };
  }

  if (
    expired &&
    autoCreate
  ) {
    const rollover =
      createNextWeekFromSnapshot({
        snapshot,
        history,
        workouts,
        now,
        mode,
      });

    return {
      ...rollover,

      expired: true,
      current: false,
      future: false,
      missing: false,

      previousBounds:
        bounds,

      summary:
        summarizeWeekPlan(
          weekPlan,
          history
        ),
    };
  }

  const status =
    expired
      ? "expired"
      : current
      ? "active"
      : future
      ? "future"
      : "unknown";

  return {
    changed:
      snapshot.week_plan_status !==
      status,

    expired,
    current,
    future,
    missing: false,

    bounds,

    summary:
      summarizeWeekPlan(
        weekPlan,
        history
      ),

    snapshot: {
      ...snapshot,

      active_week_start:
        bounds.startYmd,

      active_week_end:
        bounds.endYmd,

      week_plan_status:
        status,

      week_plan_checked_at:
        now.toISOString(),
    },
  };
}

function buildDailyArchiveEntry(
  snapshot = {},
  history = [],
  archivedYmd
) {
  const workoutCount =
    countWorkoutsForDay(
      history,
      archivedYmd
    );

  return {
    id:
      `daily-${archivedYmd}`,

    ymd:
      archivedYmd,

    archived_at:
      new Date().toISOString(),

    steps:
      safeNumber(
        snapshot.steps
      ),

    step_goal:
      safeNumber(
        snapshot.step_goal,
        8000
      ),

    calories:
      safeNumber(
        snapshot.calories
      ),

    calorie_goal:
      safeNumber(
        snapshot.calorie_goal,
        2200
      ),

    protein:
      safeNumber(
        snapshot.protein_today
      ),

    protein_goal:
      safeNumber(
        snapshot.protein_goal,
        150
      ),

    water:
      safeNumber(
        snapshot.water
      ),

    water_goal:
      safeNumber(
        snapshot.water_goal,
        100
      ),

    weight:
      safeNumber(
        snapshot.weight
      ),

    readiness:
      snapshot.readiness || "",

    soreness:
      snapshot.soreness_score ||
      snapshot.soreness ||
      "",

    energy:
      snapshot.energy_score ||
      snapshot.energy ||
      "",

    notes:
      snapshot.daily_notes ||
      snapshot.notes ||
      "",

    sleep_hours:
      safeNumber(
        snapshot.last_sleep_hours ||
        snapshot.sleep_hours
      ),

    sleep_quality:
      snapshot.last_sleep_quality ||
      "",

    workout_completed:
      workoutCount > 0,

    workout_count:
      workoutCount,

    last_completed_workout:
      snapshot.last_completed_workout ||
      "",
  };
}

function mergeDailyArchive(
  dailyHistory = [],
  archiveEntry
) {
  const existing =
    Array.isArray(
      dailyHistory
    )
      ? dailyHistory
      : [];

  const withoutSameDay =
    existing.filter(
      (item) =>
        item?.ymd !==
        archiveEntry.ymd
    );

  // Preserve slightly more than one year.
  return [
    archiveEntry,
    ...withoutSameDay,
  ].slice(0, 400);
}

export function ensureCurrentHealthDay({
  snapshot = {},
  history = [],
  now = new Date(),
} = {}) {
  const today =
    localYmd(now);

  const snapshotDay =
    snapshot.current_day ||
    snapshot.daily_ymd ||
    "";

  if (
    snapshotDay === today
  ) {
    const todayWorkoutCount =
      countWorkoutsForDay(
        history,
        today
      );

    return {
      changed: false,
      archived: false,
      previousDay:
        snapshotDay,

      snapshot: {
        ...snapshot,

        current_day:
          today,

        daily_ymd:
          today,

        daily_workout_count:
          todayWorkoutCount,

        workout_completed_today:
          todayWorkoutCount > 0,
      },
    };
  }

  const canArchive =
    Boolean(snapshotDay) &&
    snapshotDay < today;

  const archiveEntry =
    canArchive
      ? buildDailyArchiveEntry(
          snapshot,
          history,
          snapshotDay
        )
      : null;

  const dailyHistory =
    archiveEntry
      ? mergeDailyArchive(
          snapshot.daily_history,
          archiveEntry
        )
      : Array.isArray(
          snapshot.daily_history
        )
      ? snapshot.daily_history
      : [];

  const todayWorkoutCount =
    countWorkoutsForDay(
      history,
      today
    );

  const nextSnapshot = {
    ...snapshot,

    current_day:
      today,

    daily_ymd:
      today,

    daily_started_at:
      startOfLocalDayIso(now),

    previous_day:
      snapshotDay || "",

    last_daily_rollover_at:
      new Date().toISOString(),

    daily_history:
      dailyHistory,

    // Daily activity fields.
    steps: "",
    calories: "",
    protein_today: "",
    water: "",

    // Daily readiness fields.
    readiness: "Moderate",
    soreness: "",
    soreness_score: "",
    energy: "",
    energy_score: "",
    daily_notes: "",
    notes: "",

    // Daily workout state.
    today_workout_id: "",
    workout: "",

    workout_completed_today:
      todayWorkoutCount > 0,

    daily_workout_count:
      todayWorkoutCount,

    // Last-night sleep check-in resets so it
    // cannot carry into another calendar day.
    last_sleep_hours: "",
    sleep_hours: "",
    last_sleep_quality: "",
    last_sleep_logged_at: "",
  };

  return {
    changed: true,
    archived:
      Boolean(archiveEntry),

    previousDay:
      snapshotDay,

    archiveEntry,

    snapshot:
      nextSnapshot,
  };
}

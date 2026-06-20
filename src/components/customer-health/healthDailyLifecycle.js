// src/components/customer-health/healthDailyLifecycle.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function localYmd(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function startOfLocalDayIso(date = new Date()) {
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

export function getWorkoutCompletedYmd(item = {}) {
  const raw =
    item?.completed_at ||
    item?.session?.finished_at ||
    item?.session?.saved_at ||
    item?.summary?.finished_at ||
    item?.created_at ||
    "";

  if (!raw) {
    return item?.ymd || item?.session?.ymd || "";
  }

  const parsed = new Date(raw);

  return Number.isFinite(parsed.getTime())
    ? localYmd(parsed)
    : "";
}

export function countWorkoutsForDay(
  history = [],
  ymd = localYmd()
) {
  return (Array.isArray(history) ? history : []).filter(
    (item) => getWorkoutCompletedYmd(item) === ymd
  ).length;
}

export function getLocalWeekBounds(date = new Date()) {
  const current = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const currentDay = current.getDay();

  // Monday is the beginning of the SyncWorks training week.
  const mondayOffset =
    currentDay === 0 ? -6 : 1 - currentDay;

  const start = new Date(current);
  start.setDate(current.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startYmd: localYmd(start),
    endYmd: localYmd(end),
  };
}

export function countWorkoutsThisWeek(
  history = [],
  date = new Date()
) {
  const { startYmd, endYmd } =
    getLocalWeekBounds(date);

  return (Array.isArray(history) ? history : []).filter(
    (item) => {
      const ymd = getWorkoutCompletedYmd(item);

      return (
        ymd &&
        ymd >= startYmd &&
        ymd <= endYmd
      );
    }
  ).length;
}

function buildDailyArchiveEntry(
  snapshot = {},
  history = [],
  archivedYmd
) {
  const workoutCount = countWorkoutsForDay(
    history,
    archivedYmd
  );

  return {
    id: `daily-${archivedYmd}`,
    ymd: archivedYmd,
    archived_at: new Date().toISOString(),

    steps: safeNumber(snapshot.steps),
    step_goal: safeNumber(
      snapshot.step_goal,
      8000
    ),

    calories: safeNumber(snapshot.calories),
    calorie_goal: safeNumber(
      snapshot.calorie_goal,
      2200
    ),

    protein: safeNumber(snapshot.protein_today),
    protein_goal: safeNumber(
      snapshot.protein_goal,
      150
    ),

    water: safeNumber(snapshot.water),
    water_goal: safeNumber(
      snapshot.water_goal,
      100
    ),

    weight: safeNumber(snapshot.weight),

    readiness: snapshot.readiness || "",

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

    sleep_hours: safeNumber(
      snapshot.last_sleep_hours ||
        snapshot.sleep_hours
    ),

    sleep_quality:
      snapshot.last_sleep_quality || "",

    workout_completed: workoutCount > 0,
    workout_count: workoutCount,

    last_completed_workout:
      snapshot.last_completed_workout || "",
  };
}

function mergeDailyArchive(
  dailyHistory = [],
  archiveEntry
) {
  const existing = Array.isArray(dailyHistory)
    ? dailyHistory
    : [];

  const withoutSameDay = existing.filter(
    (item) => item?.ymd !== archiveEntry.ymd
  );

  // Keep slightly more than one year of daily history.
  return [archiveEntry, ...withoutSameDay].slice(
    0,
    400
  );
}

export function ensureCurrentHealthDay({
  snapshot = {},
  history = [],
  now = new Date(),
} = {}) {
  const today = localYmd(now);

  const snapshotDay =
    snapshot.current_day ||
    snapshot.daily_ymd ||
    "";

  if (snapshotDay === today) {
    return {
      changed: false,
      archived: false,
      previousDay: snapshotDay,

      snapshot: {
        ...snapshot,
        current_day: today,
        daily_ymd: today,

        daily_workout_count:
          countWorkoutsForDay(history, today),

        workout_completed_today:
          countWorkoutsForDay(history, today) > 0,
      },
    };
  }

  const canArchive =
    !!snapshotDay &&
    snapshotDay < today;

  const archiveEntry = canArchive
    ? buildDailyArchiveEntry(
        snapshot,
        history,
        snapshotDay
      )
    : null;

  const dailyHistory = archiveEntry
    ? mergeDailyArchive(
        snapshot.daily_history,
        archiveEntry
      )
    : Array.isArray(snapshot.daily_history)
    ? snapshot.daily_history
    : [];

  const todayWorkoutCount =
    countWorkoutsForDay(history, today);

  const nextSnapshot = {
    ...snapshot,

    current_day: today,
    daily_ymd: today,

    daily_started_at:
      startOfLocalDayIso(now),

    previous_day: snapshotDay || "",

    last_daily_rollover_at:
      new Date().toISOString(),

    daily_history: dailyHistory,

    // Daily activity fields
    steps: "",
    calories: "",
    protein_today: "",
    water: "",

    // Daily check-in fields
    readiness: "Moderate",
    soreness: "",
    soreness_score: "",
    energy: "",
    energy_score: "",
    daily_notes: "",
    notes: "",

    // Daily workout state
    today_workout_id: "",
    workout: "",

    workout_completed_today:
      todayWorkoutCount > 0,

    daily_workout_count:
      todayWorkoutCount,

    // Last-night sleep check-in resets so it cannot
    // incorrectly carry across multiple calendar days.
    last_sleep_hours: "",
    sleep_hours: "",
    last_sleep_quality: "",
    last_sleep_logged_at: "",
  };

  return {
    changed: true,
    archived: !!archiveEntry,
    previousDay: snapshotDay,
    archiveEntry,
    snapshot: nextSnapshot,
  };
}
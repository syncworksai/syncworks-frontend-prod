// src/components/customer-health/healthSleepPlanner.js

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const DEFAULT_SLEEP_PLAN = {
  enabled: true,
  bedtime: "22:30",
  wake_time: "06:30",
  sleep_goal_hours: 8,
  quiet_hours_enabled: true,
  notification_cutoff_minutes: 30,
  wind_down_minutes: 45,
  days: [...DAY_KEYS],
  calendar_enabled: false,
  motivation_styles: [],
  notification_frequency: "balanced",
  reminders: {
    morning_readiness: true,
    midday_nutrition: true,
    step_check: true,
    pre_workout: true,
    post_workout_review: true,
    evening_goal_check: true,
  },
};

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitTime(value = "00:00") {
  const [hours, minutes] = String(value).split(":").map(Number);

  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

export function normalizeSleepPlan(value = {}) {
  const input = value && typeof value === "object" ? value : {};

  return {
    ...DEFAULT_SLEEP_PLAN,
    ...input,
    days:
      Array.isArray(input.days) && input.days.length
        ? input.days.filter((day) => DAY_KEYS.includes(day))
        : [...DEFAULT_SLEEP_PLAN.days],
    reminders: {
      ...DEFAULT_SLEEP_PLAN.reminders,
      ...(input.reminders || {}),
    },
    motivation_styles: Array.isArray(input.motivation_styles)
      ? input.motivation_styles
      : [],
  };
}

export function minutesBetweenTimes(
  bedtime = "22:30",
  wakeTime = "06:30"
) {
  const bed = splitTime(bedtime);
  const wake = splitTime(wakeTime);

  const bedMinutes = bed.hours * 60 + bed.minutes;
  let wakeMinutes = wake.hours * 60 + wake.minutes;

  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60;
  }

  return Math.max(0, wakeMinutes - bedMinutes);
}

export function plannedSleepHours(plan = {}) {
  const normalized = normalizeSleepPlan(plan);

  return (
    Math.round(
      (minutesBetweenTimes(normalized.bedtime, normalized.wake_time) / 60) * 10
    ) / 10
  );
}

export function formatClock(value = "") {
  if (!value) return "—";

  const { hours, minutes } = splitTime(value);
  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatHours(value = 0) {
  const totalMinutes = Math.round(safeNumber(value, 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function buildSleepRecommendation({ plan, snapshot = {} }) {
  const normalized = normalizeSleepPlan(plan);
  const goal = safeNumber(normalized.sleep_goal_hours, 8);

  const lastSleep = safeNumber(
    snapshot.last_sleep_hours || snapshot.sleep_hours || 0,
    0
  );

  const soreness = String(
    snapshot.soreness || snapshot.soreness_score || ""
  ).toLowerCase();

  const readiness = String(snapshot.readiness || "").toLowerCase();

  const deficit = lastSleep > 0 ? Math.max(0, goal - lastSleep) : 0;

  if (!lastSleep) {
    return {
      tone: "cyan",
      title: "Log last night’s sleep",
      message:
        "A quick sleep check-in helps SyncWorks adjust today’s training, steps, nutrition, and recovery priorities.",
      deficit,
      intensity: "unknown",
    };
  }

  if (
    lastSleep < 5.5 ||
    soreness.includes("high") ||
    readiness.includes("recovery")
  ) {
    return {
      tone: "rose",
      title: "Recovery-first day",
      message:
        "Keep intensity controlled, avoid max-effort work, prioritize protein, hydration, mobility, and an earlier bedtime.",
      deficit,
      intensity: "recovery",
    };
  }

  if (lastSleep < 7) {
    return {
      tone: "amber",
      title: "Maintain, don’t force",
      message:
        "Train with clean reps, keep optional volume flexible, and protect tonight’s sleep window.",
      deficit,
      intensity: "maintain",
    };
  }

  return {
    tone: "emerald",
    title: "Recovery supports progression",
    message:
      "Sleep is supporting today’s plan. Progress only where reps, effort, and pain data also support it.",
    deficit,
    intensity: "progress",
  };
}

export function getQuietHours(plan = {}) {
  const normalized = normalizeSleepPlan(plan);
  const cutoff = safeNumber(normalized.notification_cutoff_minutes, 30);
  const bedtime = splitTime(normalized.bedtime);

  const date = new Date();
  date.setHours(bedtime.hours, bedtime.minutes, 0, 0);
  date.setMinutes(date.getMinutes() - cutoff);

  return {
    starts_at: `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`,
    ends_at: normalized.wake_time,
  };
}

export function isWithinQuietHours(plan = {}, now = new Date()) {
  const normalized = normalizeSleepPlan(plan);

  if (!normalized.quiet_hours_enabled) {
    return false;
  }

  const quiet = getQuietHours(normalized);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const start = splitTime(quiet.starts_at);
  const end = splitTime(quiet.ends_at);

  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function buildSleepPlannerSnapshot(snapshot = {}, plan = {}) {
  const normalized = normalizeSleepPlan(plan);

  const recommendation = buildSleepRecommendation({
    plan: normalized,
    snapshot,
  });

  return {
    ...snapshot,
    sleep_plan: normalized,
    sleep_recommendation: recommendation,
    updated_at: new Date().toISOString(),
  };
}
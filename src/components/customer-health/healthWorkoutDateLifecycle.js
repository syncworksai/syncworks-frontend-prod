// src/components/customer-health/healthWorkoutDateLifecycle.js

export function localYmd(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatHealthDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function workoutScheduledYmd(session = {}, plannerItem = {}) {
  return String(
    session?.scheduled_ymd ||
      session?.scheduled_date ||
      session?.ymd ||
      plannerItem?.ymd ||
      plannerItem?.scheduled_ymd ||
      ""
  ).slice(0, 10);
}

export function workoutStartedYmd(session = {}) {
  return String(
    session?.started_ymd ||
      session?.started_date ||
      session?.started_at ||
      ""
  ).slice(0, 10);
}

export function dayDistance(fromYmd, toYmd = localYmd()) {
  if (!fromYmd || !toYmd) return 0;
  const from = new Date(`${fromYmd}T12:00:00`);
  const to = new Date(`${toYmd}T12:00:00`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

export function annotateWorkoutDateLifecycle(session = {}, plannerItem = {}, now = new Date()) {
  const today = localYmd(now);
  const scheduledYmd = workoutScheduledYmd(session, plannerItem) || today;
  const startedYmd = workoutStartedYmd(session) || localYmd(session?.started_at || now) || scheduledYmd;
  const ageDays = Math.max(0, dayDistance(scheduledYmd, today));
  const status = String(session?.status || "active").toLowerCase();
  const completed = status === "completed" || Boolean(session?.finished_at || session?.completed_at);

  let lifecycleStatus = session?.lifecycle_status || "Active";
  if (completed) lifecycleStatus = ageDays > 0 ? "Completed Late" : "Completed";
  else if (ageDays === 0) lifecycleStatus = "Active";
  else if (ageDays === 1) lifecycleStatus = "Partial";
  else lifecycleStatus = "Expired Partial";

  return {
    ...session,
    scheduled_ymd: scheduledYmd,
    started_ymd: startedYmd,
    last_activity_at: session?.last_activity_at || session?.updated_at || session?.started_at || new Date().toISOString(),
    lifecycle_status: lifecycleStatus,
    completed_late: completed && ageDays > 0,
    date_age_days: ageDays,
    date_checked_ymd: today,
  };
}

export function classifyUnfinishedWorkout(session = {}, plannerItem = {}, now = new Date()) {
  const annotated = annotateWorkoutDateLifecycle(session, plannerItem, now);
  const ageDays = annotated.date_age_days || 0;
  return {
    session: annotated,
    ageDays,
    isToday: ageDays === 0,
    isYesterday: ageDays === 1,
    isExpired: ageDays >= 2,
    canResume: ageDays <= 1,
    label: ageDays === 0 ? "Today - In Progress" : ageDays === 1 ? "Yesterday - Incomplete" : `${ageDays} days ago - Partial`,
  };
}

export function currentDayWorkout(weekPlan = [], today = localYmd()) {
  return (Array.isArray(weekPlan) ? weekPlan : []).find(
    (item) =>
      String(item?.ymd || item?.scheduled_ymd || "").slice(0, 10) === today &&
      item?.workout_name &&
      !["Completed", "Skipped", "Rescheduled"].includes(item?.status)
  ) || null;
}

export function shouldOfferPreviousWorkout(activeWorkout = {}, now = new Date()) {
  if (!activeWorkout?.session || activeWorkout.session.status !== "active") {
    return { offer: false, expired: false, ageDays: 0, session: activeWorkout?.session || null };
  }
  const classification = classifyUnfinishedWorkout(
    activeWorkout.session,
    {
      id: activeWorkout.planner_item_id,
      workout_id: activeWorkout.workout_id,
      ymd: activeWorkout.session?.scheduled_ymd || activeWorkout.session?.ymd,
    },
    now
  );
  return {
    offer: classification.canResume,
    expired: classification.isExpired,
    ageDays: classification.ageDays,
    session: classification.session,
    label: classification.label,
  };
}

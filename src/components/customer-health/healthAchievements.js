// src/components/customer-health/healthAchievements.js

function safeNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function ymdFromValue(value) {
  if (!value) return "";

  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function addDays(ymd, amount) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + amount);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function uniqueCompletedWorkoutDays(history = []) {
  const days = new Set();

  for (const item of Array.isArray(history) ? history : []) {
    const date = ymdFromValue(item.completed_at || item.date || item.created_at);
    if (date) days.add(date);
  }

  return days;
}

function calculateWorkoutStreak(history = []) {
  const days = uniqueCompletedWorkoutDays(history);
  if (!days.size) return 0;

  let cursor = todayYmd();
  let streak = 0;

  if (!days.has(cursor)) {
    const yesterday = addDays(cursor, -1);

    if (!days.has(yesterday)) {
      return 0;
    }

    cursor = yesterday;
  }

  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function hasWorkoutToday(history = []) {
  const today = todayYmd();
  return uniqueCompletedWorkoutDays(history).has(today);
}

function getCompletedWorkoutCount(history = []) {
  return Array.isArray(history) ? history.length : 0;
}

function getProgressLogCount(progressLogs = []) {
  return Array.isArray(progressLogs) ? progressLogs.length : 0;
}

function getWeeklyCompleted(snapshot = {}, history = []) {
  return safeNumber(snapshot.weekly_completed || history.length || 0);
}

function getPlannedWorkoutCount(snapshot = {}) {
  const weekPlan = Array.isArray(snapshot.week_plan) ? snapshot.week_plan : [];
  const fromPlan = weekPlan.filter((item) => item?.workout_name).length;

  return safeNumber(snapshot.planned_workouts || fromPlan || 0);
}

function getStepPercent(snapshot = {}) {
  const steps = safeNumber(snapshot.steps);
  const goal = safeNumber(snapshot.step_goal) || 8000;

  if (!goal) return 0;

  return Math.round((steps / goal) * 100);
}

function getProteinPercent(snapshot = {}) {
  const protein = safeNumber(snapshot.protein_today);
  const goal = safeNumber(snapshot.protein_goal) || 150;

  if (!goal) return 0;

  return Math.round((protein / goal) * 100);
}

export function buildHealthAchievements({
  profile = {},
  snapshot = {},
  history = [],
  progressLogs = [],
}) {
  const workoutStreak = calculateWorkoutStreak(history);
  const workoutToday = hasWorkoutToday(history);
  const completedWorkouts = getCompletedWorkoutCount(history);
  const progressCount = getProgressLogCount(progressLogs);
  const weeklyCompleted = getWeeklyCompleted(snapshot, history);
  const plannedWorkouts = getPlannedWorkoutCount(snapshot);
  const stepPercent = getStepPercent(snapshot);
  const proteinPercent = getProteinPercent(snapshot);

  const trainingDaysGoal = safeNumber(profile.training_days) || 3;
  const weeklyGoalHit = weeklyCompleted >= trainingDaysGoal;
  const plannedWeekBuilt = plannedWorkouts >= 3;

  const milestones = [
    {
      id: "first-workout",
      label: "First Workout Logged",
      description: "You logged the first workout. Now the coach has real data.",
      achieved: completedWorkouts >= 1,
      tone: "emerald",
      icon: "🏁",
    },
    {
      id: "three-workouts",
      label: "3 Workouts Logged",
      description: "You are building momentum.",
      achieved: completedWorkouts >= 3,
      tone: "cyan",
      icon: "💪",
    },
    {
      id: "seven-day-streak",
      label: "7 Day Streak",
      description: "Seven straight active workout days is elite consistency.",
      achieved: workoutStreak >= 7,
      tone: "fuchsia",
      icon: "🔥",
    },
    {
      id: "weekly-goal",
      label: "Weekly Workout Goal",
      description: "You hit your planned training frequency this week.",
      achieved: weeklyGoalHit,
      tone: "emerald",
      icon: "✅",
    },
    {
      id: "step-goal",
      label: "Step Goal Hit",
      description: "Steps are one of the easiest daily wins.",
      achieved: stepPercent >= 100,
      tone: "cyan",
      icon: "👟",
    },
    {
      id: "protein-goal",
      label: "Protein Goal Hit",
      description: "Protein consistency drives recovery and progress.",
      achieved: proteinPercent >= 100,
      tone: "amber",
      icon: "🥤",
    },
    {
      id: "first-progress-log",
      label: "Progress Log Added",
      description: "Tracking progress makes the goal visible.",
      achieved: progressCount >= 1,
      tone: "fuchsia",
      icon: "📈",
    },
    {
      id: "week-planned",
      label: "Week Planned",
      description: "A planned week beats a random week.",
      achieved: plannedWeekBuilt,
      tone: "cyan",
      icon: "📅",
    },
  ];

  const achieved = milestones.filter((item) => item.achieved);
  const next = milestones.find((item) => !item.achieved);

  let momentumLabel = "Starting";
  let momentumMessage = "Log today's workout, steps, or protein to start building momentum.";

  if (workoutStreak >= 7) {
    momentumLabel = "On Fire";
    momentumMessage = "You are stacking days. Protect the streak and stay smart.";
  } else if (workoutStreak >= 3) {
    momentumLabel = "Building";
    momentumMessage = "Momentum is forming. Keep the daily action small and repeatable.";
  } else if (workoutToday) {
    momentumLabel = "Won Today";
    momentumMessage = "Workout logged today. Now finish the day with steps and protein.";
  } else if (completedWorkouts >= 1) {
    momentumLabel = "Active";
    momentumMessage = "You have logged workouts. Win today to keep the trend moving.";
  }

  return {
    workoutStreak,
    workoutToday,
    completedWorkouts,
    progressCount,
    weeklyCompleted,
    plannedWorkouts,
    stepPercent,
    proteinPercent,
    achieved,
    next,
    milestones,
    momentumLabel,
    momentumMessage,
  };
}
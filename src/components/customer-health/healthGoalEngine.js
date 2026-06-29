// src/components/customer-health/healthGoalEngine.js
function n(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function d(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function bmi(weight, profile = {}) {
  const inches = n(profile.height_ft) * 12 + n(profile.height_in);
  return weight > 0 && inches > 0 ? (weight / (inches * inches)) * 703 : 0;
}

function weightRows(logs = [], profile = {}, snapshot = {}) {
  const rows = (Array.isArray(logs) ? logs : [])
    .filter((entry) => entry?.type === "weight")
    .map((entry) => ({
      weight: n(entry.value),
      date: d(entry.ymd || String(entry.created_at || "").slice(0, 10)),
    }))
    .filter((entry) => entry.weight > 0 && entry.date)
    .sort((a, b) => a.date - b.date);

  const fallback = n(snapshot.weight || profile.weight);
  if (!rows.length && fallback > 0) {
    rows.push({ weight: fallback, date: new Date() });
  }
  return rows;
}

function observedWeeklyRate(rows = []) {
  if (rows.length < 3) return 0;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const elapsedDays = (last.date - first.date) / 86400000;
  if (elapsedDays < 7) return 0;
  const rawRate = ((last.weight - first.weight) / elapsedDays) * 7;
  return Math.max(-3, Math.min(3, rawRate));
}

function safePlanningRate(direction, requiredRate) {
  if (direction === "loss") {
    return -Math.min(2, Math.max(0.5, Math.abs(requiredRate || 1)));
  }
  if (direction === "gain") {
    return Math.min(1, Math.max(0.25, Math.abs(requiredRate || 0.5)));
  }
  return 0;
}

export function buildGoalAnalysis({
  profile = {},
  snapshot = {},
  progressLogs = [],
  history = [],
} = {}) {
  const current = n(snapshot.weight || profile.weight);
  const target = n(profile.target_weight);
  const start = n(profile.goal_start_weight || current);

  const targetDate = d(profile.goal_target_date);
  const startDate = d(profile.goal_start_date) || new Date();
  const now = new Date();

  const totalDays = targetDate
    ? Math.max(1, Math.ceil((targetDate - startDate) / 86400000))
    : 0;

  const totalChange = target - start;
  const remaining = target - current;
  const required = totalDays ? (totalChange / totalDays) * 7 : 0;
  const direction =
    totalChange < 0 ? "loss" : totalChange > 0 ? "gain" : "maintain";

  const rows = weightRows(progressLogs, profile, snapshot);
  const actual = observedWeeklyRate(rows);
  const hasReliableTrend = rows.length >= 3 && actual !== 0;
  const planningRate = hasReliableTrend
    ? actual
    : safePlanningRate(direction, required);

  let projected = null;
  if (
    current > 0 &&
    target > 0 &&
    planningRate !== 0 &&
    Math.sign(planningRate) === Math.sign(remaining)
  ) {
    const weeks = Math.abs(remaining / planningRate);
    projected = addDays(now, Math.max(7, Math.round(weeks * 7)));
  }

  const expected = totalDays
    ? start +
      totalChange *
        Math.min(1, Math.max(0, (now - startDate) / 86400000 / totalDays))
    : 0;

  let status = "Set a target date";
  let statusTone = "slate";
  let paceWarning = "";

  if (target > 0 && targetDate) {
    const gap = direction === "loss" ? current - expected : expected - current;
    if (Math.abs(gap) <= 0.75) {
      status = "On pace";
      statusTone = "lime";
    } else if (gap < -0.75) {
      status = "Ahead of pace";
      statusTone = "cyan";
    } else {
      status = "Behind pace";
      statusTone = "amber";
    }

    if (direction === "loss" && Math.abs(required) > 2) {
      paceWarning =
        "Your selected date requires more than 2 lb per week. SYNC is using a safer planning pace.";
      status = "Aggressive target";
      statusTone = "amber";
    }

    if (direction === "gain" && Math.abs(required) > 1) {
      paceWarning =
        "Your selected date requires unusually rapid weight gain. SYNC is using a steadier planning pace.";
      status = "Aggressive target";
      statusTone = "amber";
    }
  }

  const steps = n(snapshot.steps);
  const stepGoal = n(snapshot.step_goal, 8000);
  const protein = n(snapshot.protein_today);
  const proteinGoal = n(snapshot.protein_goal, 150);
  const calories = n(snapshot.calories);
  const calorieGoal = n(snapshot.calorie_goal, 2200);
  const trained = Boolean(snapshot.workout_completed_today);
  const active = n(snapshot.active_minutes_today);

  let todayAction = {
    title: "Set your goal",
    detail: "Add a target weight and date so the coach can calculate a realistic pace.",
    action: "goals",
    button: "Set Goal",
  };

  if (target > 0 && targetDate) {
    if (!trained && active < 10 && steps < stepGoal * 0.65) {
      todayAction = {
        title: "Move for 12 minutes",
        detail:
          "You have not trained today and activity is below target. A short home session or brisk walk keeps momentum.",
        action: "plan-today",
        button: "Start Quick Session",
      };
    } else if (proteinGoal > 0 && protein < proteinGoal * 0.7) {
      todayAction = {
        title: "Close your protein gap",
        detail: `You have logged ${Math.round(protein)} of ${Math.round(
          proteinGoal
        )} g. Add a protein-focused meal or snack.`,
        action: "nutrition-dashboard",
        button: "Plan Protein",
      };
    } else if (calorieGoal > 0 && calories > calorieGoal * 1.08) {
      todayAction = {
        title: "Choose light activity",
        detail:
          "Logged calories are above today''s planned range. Use a walk or low-impact session, not punishment.",
        action: "cardio-player",
        button: "Start Walk",
      };
    } else if (steps < stepGoal) {
      todayAction = {
        title: "Finish your steps",
        detail: `${Math.max(
          0,
          Math.round(stepGoal - steps)
        ).toLocaleString()} steps remain today. A short walk is the simplest useful action.`,
        action: "cardio-player",
        button: "Start Walk",
      };
    } else {
      todayAction = {
        title: "Stay consistent",
        detail:
          "Your key activity signals are on track today. Keep logging accurately so projections become more reliable.",
        action: "quick:weight",
        button: "Log Weight",
      };
    }
  }

  const formatDate = (value) =>
    value
      ? value.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Not set";

  return {
    currentWeight: current,
    targetWeight: target,
    remainingWeight: Math.abs(remaining),
    requiredWeeklyRate: required,
    actualWeeklyRate: actual,
    planningWeeklyRate: planningRate,
    currentBmi: bmi(current, profile),
    targetBmi: bmi(target, profile),
    targetDateLabel: formatDate(targetDate),
    projectedDateLabel: projected
      ? formatDate(projected)
      : rows.length < 3
      ? "Needs 3 weigh-ins over 7+ days"
      : "Trend not moving toward goal",
    projectionSource: hasReliableTrend ? "observed trend" : "safe planning pace",
    paceWarning,
    status,
    statusTone,
    todayAction,
    weightLogCount: rows.length,
    historyCount: Array.isArray(history) ? history.length : 0,
  };
}

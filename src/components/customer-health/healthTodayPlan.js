// src/components/customer-health/healthTodayPlan.js

function safeNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return cleanText(value).toLowerCase();
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(value) {
  if (!value) return null;

  const start = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const end = new Date(`${todayYmd()}T00:00:00`);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function latestWorkoutLog(history = []) {
  const logs = Array.isArray(history) ? history : [];

  if (!logs.length) return null;

  return [...logs].sort((a, b) => {
    const aTime = new Date(a.completed_at || a.date || 0).getTime();
    const bTime = new Date(b.completed_at || b.date || 0).getTime();
    return bTime - aTime;
  })[0];
}

function getCoachPath(profile = {}, snapshot = {}) {
  const goal = lower(profile.primary_goal || snapshot.goal);
  const inspiration = lower(profile.inspiration_goal);
  const identity = lower(profile.training_identity);
  const limitations = lower(profile.limitations);
  const sport = cleanText(profile.sport);

  if (
    limitations.includes("pain") ||
    limitations.includes("injury") ||
    limitations.includes("surgery") ||
    goal.includes("pain") ||
    goal.includes("mobility") ||
    goal.includes("rebuild") ||
    identity.includes("recovery")
  ) {
    return {
      key: "recovery",
      label: "Recovery-aware",
      tone: "amber",
      pressure: "Controlled",
      mission: "Move pain-free and build trust with the body.",
    };
  }

  if (
    sport ||
    goal.includes("sport") ||
    goal.includes("athletic") ||
    inspiration.includes("polamalu") ||
    identity.includes("athlete")
  ) {
    return {
      key: "athlete",
      label: "Athletic performance",
      tone: "fuchsia",
      pressure: "Aggressive but smart",
      mission: "Train movement quality, hips, core, power, and conditioning.",
    };
  }

  if (
    goal.includes("strength") ||
    inspiration.includes("harrison") ||
    identity.includes("strength")
  ) {
    return {
      key: "strength",
      label: "Strength-focused",
      tone: "indigo",
      pressure: "Heavy only when ready",
      mission: "Get stronger through controlled overload and clean reps.",
    };
  }

  if (
    goal.includes("fitness model") ||
    goal.includes("muscle") ||
    goal.includes("hypertrophy") ||
    inspiration.includes("fitness model")
  ) {
    return {
      key: "aesthetic",
      label: "Lean muscle / aesthetic",
      tone: "emerald",
      pressure: "Volume and consistency",
      mission: "Build lean muscle, hit protein, and keep weekly progress visible.",
    };
  }

  if (
    goal.includes("fat") ||
    goal.includes("weight") ||
    goal.includes("lean") ||
    identity.includes("weight loss")
  ) {
    return {
      key: "weight-loss",
      label: "Weight loss / consistency",
      tone: "cyan",
      pressure: "Daily consistency",
      mission: "Win with steps, protein, calories, and repeatable workouts.",
    };
  }

  if (
    lower(profile.experience).includes("beginner") ||
    identity.includes("busy parent") ||
    identity.includes("beginner")
  ) {
    return {
      key: "beginner",
      label: "Beginner / busy life",
      tone: "cyan",
      pressure: "Low friction",
      mission: "Build the habit first. Repeat clean movement before chasing intensity.",
    };
  }

  return {
    key: "general",
    label: "General health",
    tone: "slate",
    pressure: "Balanced",
    mission: "Balance strength, steps, food, recovery, and consistency.",
  };
}

function chooseWorkout(profile = {}, snapshot = {}, workouts = [], history = []) {
  const available = Array.isArray(workouts) ? workouts : [];
  const path = getCoachPath(profile, snapshot);
  const readiness = lower(snapshot.readiness);
  const latest = latestWorkoutLog(history);
  const daysSince = daysBetween(latest?.date || latest?.completed_at);

  if (!available.length) {
    return {
      workout: null,
      reason: "No workouts are built yet. Create or add a template in Workout Studio.",
    };
  }

  if (daysSince != null && daysSince >= 3) {
    const reset =
      available.find((w) => lower(w.name).includes("recovery")) ||
      available.find((w) => lower(w.focus).includes("mobility")) ||
      available.find((w) => lower(w.name).includes("walk")) ||
      available[0];

    return {
      workout: reset,
      reason: "You have missed logs. Today should restart momentum, not punish you.",
    };
  }

  if (readiness.includes("pain") || readiness.includes("recovery")) {
    const recovery =
      available.find((w) => lower(w.name).includes("recovery")) ||
      available.find((w) => lower(w.focus).includes("mobility")) ||
      available.find((w) => lower(w.name).includes("walk")) ||
      available[0];

    return {
      workout: recovery,
      reason: "Readiness is low. Recovery, walking, mobility, and controlled lifting win today.",
    };
  }

  if (path.key === "athlete") {
    const athletic =
      available.find((w) => lower(w.name).includes("athletic")) ||
      available.find((w) => lower(w.focus).includes("sport")) ||
      available.find((w) => lower(w.focus).includes("performance")) ||
      available[0];

    return {
      workout: athletic,
      reason: "Athletic goals need power, hips, core, and conditioning without sloppy fatigue.",
    };
  }

  if (path.key === "strength") {
    const strength =
      available.find((w) => lower(w.name).includes("strength")) ||
      available.find((w) => lower(w.focus).includes("strength")) ||
      available[0];

    return {
      workout: strength,
      reason: "Strength goals need planned overload, longer rest, and clean reps.",
    };
  }

  if (path.key === "aesthetic") {
    const lean =
      available.find((w) => lower(w.name).includes("lean")) ||
      available.find((w) => lower(w.focus).includes("hypertrophy")) ||
      available[0];

    return {
      workout: lean,
      reason: "Aesthetic goals need lifting volume, protein, steps, and visible weekly progress.",
    };
  }

  return {
    workout: available[0],
    reason: path.mission,
  };
}

function getLogStatus(history = [], profile = {}) {
  const latest = latestWorkoutLog(history);
  const days = daysBetween(latest?.date || latest?.completed_at);

  if (!latest) {
    return {
      label: "No workout logs yet",
      tone: "amber",
      daysSince: null,
      message: "Complete one workout today so the coach has real data.",
    };
  }

  if (days >= 7) {
    return {
      label: "Off track",
      tone: "rose",
      daysSince: days,
      message:
        lower(profile.accountability_level).includes("no excuses")
          ? "No excuses reset. Complete a short workout or walk today."
          : "Restart today with a short session. Do not try to make up the whole week.",
    };
  }

  if (days >= 3) {
    return {
      label: "Needs reset",
      tone: "amber",
      daysSince: days,
      message: "Lower the pressure today and rebuild momentum.",
    };
  }

  if (days >= 1) {
    return {
      label: "Active",
      tone: "cyan",
      daysSince: days,
      message: "You are still active. Log readiness before deciding how hard to push.",
    };
  }

  return {
    label: "Logged today",
    tone: "emerald",
    daysSince: 0,
    message: "Data is current. Use today to push, hold, or recover based on readiness.",
  };
}

function buildNutritionTarget(profile = {}, snapshot = {}) {
  const path = getCoachPath(profile, snapshot);
  const protein = safeNumber(snapshot.protein_today);
  const proteinGoal = safeNumber(snapshot.protein_goal) || 150;
  const calories = safeNumber(snapshot.calories);
  const calorieGoal = safeNumber(snapshot.calorie_goal) || 2200;
  const proteinGap = Math.max(0, proteinGoal - protein);

  if (path.key === "weight-loss") {
    return {
      title: "Nutrition target",
      target: `${proteinGoal}g protein | ${calorieGoal} calories`,
      note:
        proteinGap > 30
          ? `Protein is short by about ${proteinGap}g. Fix that before adding extra intensity.`
          : "Keep calories controlled and protein high.",
    };
  }

  if (path.key === "aesthetic") {
    return {
      title: "Nutrition target",
      target: `${proteinGoal}g protein | consistent meals`,
      note:
        proteinGap > 30
          ? `Protein is short by about ${proteinGap}g. Muscle goals need protein consistency.`
          : "Protein is the anchor. Lift, eat, recover, repeat.",
    };
  }

  if (path.key === "strength" || path.key === "athlete") {
    return {
      title: "Fuel target",
      target: `${proteinGoal}g protein | performance fuel`,
      note:
        calories && calories < calorieGoal * 0.75
          ? "Calories look low for performance. Do not under-fuel a hard training day."
          : "Fuel the session and recover after.",
    };
  }

  return {
    title: "Nutrition target",
    target: `${proteinGoal}g protein`,
    note:
      proteinGap > 30
        ? `Protein is short by about ${proteinGap}g.`
        : "Keep food simple and consistent.",
  };
}

function buildStepTarget(profile = {}, snapshot = {}) {
  const path = getCoachPath(profile, snapshot);
  const steps = safeNumber(snapshot.steps);
  const stepGoal = safeNumber(snapshot.step_goal) || 8000;
  const gap = Math.max(0, stepGoal - steps);

  if (path.key === "weight-loss") {
    return {
      title: "Steps target",
      target: `${stepGoal.toLocaleString()} steps`,
      note:
        gap > 1500
          ? `You are short by ${gap.toLocaleString()} steps. Add a walk today.`
          : "Steps are supporting the fat-loss plan.",
    };
  }

  if (path.key === "recovery") {
    return {
      title: "Movement target",
      target: `${Math.min(stepGoal, 7000).toLocaleString()} easy steps`,
      note: "Keep movement easy and pain-free.",
    };
  }

  return {
    title: "Steps target",
    target: `${stepGoal.toLocaleString()} steps`,
    note:
      gap > 1500
        ? `You are short by ${gap.toLocaleString()} steps. A walk is the easiest win.`
        : "Steps are in a good range.",
  };
}

function buildRecoveryWarning(profile = {}, snapshot = {}, history = []) {
  const latest = latestWorkoutLog(history);
  const soreness = safeNumber(latest?.soreness);
  const energy = safeNumber(latest?.energy);
  const readiness = lower(snapshot.readiness);
  const limitations = lower(profile.limitations);

  if (readiness.includes("pain")) {
    return {
      tone: "rose",
      title: "Pain warning",
      message: "Pain is the limiter today. Reduce load, range, speed, or impact.",
    };
  }

  if (soreness >= 7 || energy <= 3 || readiness.includes("recovery")) {
    return {
      tone: "amber",
      title: "Recovery warning",
      message: "Recovery is low. Hold intensity and keep the session controlled.",
    };
  }

  if (limitations.includes("hip") || limitations.includes("knee") || limitations.includes("back")) {
    return {
      tone: "amber",
      title: "Weak-area guardrail",
      message: "Respect the limitation notes. Progress only if pain stays under control.",
    };
  }

  return {
    tone: "emerald",
    title: "Recovery status",
    message: "No major recovery red flags. Push only what feels clean.",
  };
}

function buildCoachPressure(profile = {}, snapshot = {}, history = []) {
  const path = getCoachPath(profile, snapshot);
  const logStatus = getLogStatus(history, profile);
  const intensity = lower(profile.coaching_intensity);
  const accountability = lower(profile.accountability_level);
  const readiness = lower(snapshot.readiness);

  if (readiness.includes("pain") || path.key === "recovery") {
    return {
      label: "Controlled pressure",
      tone: "amber",
      message: "The coach should push consistency, not pain.",
    };
  }

  if (logStatus.daysSince >= 3) {
    return {
      label: "Reset pressure",
      tone: "amber",
      message: "The coach should restart momentum with one achievable win today.",
    };
  }

  if (intensity.includes("hardcore") || accountability.includes("no excuses")) {
    return {
      label: "High pressure",
      tone: "rose",
      message: "Push hard, but stop if pain or form breaks down.",
    };
  }

  if (intensity.includes("push")) {
    return {
      label: "Push pressure",
      tone: "fuchsia",
      message: "Challenge the user today and hold them accountable to the log.",
    };
  }

  if (intensity.includes("gentle")) {
    return {
      label: "Low pressure",
      tone: "cyan",
      message: "Keep it simple. One completed log is the win.",
    };
  }

  return {
    label: path.pressure,
    tone: path.tone,
    message: path.mission,
  };
}

export function buildTodayPlan({ profile, snapshot, workouts, history }) {
  const coachPath = getCoachPath(profile, snapshot);
  const workoutChoice = chooseWorkout(profile, snapshot, workouts, history);
  const logStatus = getLogStatus(history, profile);
  const nutrition = buildNutritionTarget(profile, snapshot);
  const steps = buildStepTarget(profile, snapshot);
  const recovery = buildRecoveryWarning(profile, snapshot, history);
  const pressure = buildCoachPressure(profile, snapshot, history);

  const missionParts = [];

  if (logStatus.daysSince >= 3) {
    missionParts.push("Reset momentum");
  } else if (coachPath.key === "strength") {
    missionParts.push("Train strength with clean reps");
  } else if (coachPath.key === "athlete") {
    missionParts.push("Train athletic movement quality");
  } else if (coachPath.key === "aesthetic") {
    missionParts.push("Build lean muscle and hit protein");
  } else if (coachPath.key === "weight-loss") {
    missionParts.push("Win steps, protein, and consistency");
  } else if (coachPath.key === "recovery") {
    missionParts.push("Move pain-free and protect the body");
  } else {
    missionParts.push("Complete the day with a clean log");
  }

  const todayMission = missionParts[0];

  const checklist = [
    workoutChoice.workout
      ? `Complete: ${workoutChoice.workout.name}`
      : "Create or select a workout",
    `${steps.title}: ${steps.target}`,
    `${nutrition.title}: ${nutrition.target}`,
    "Log energy, soreness, difficulty, and pain",
    logStatus.daysSince >= 3
      ? "Restart without trying to make up missed days"
      : "Let the coach update the next session from today's data",
  ];

  return {
    coachPath,
    todayMission,
    workout: workoutChoice.workout,
    workoutReason: workoutChoice.reason,
    logStatus,
    nutrition,
    steps,
    recovery,
    pressure,
    checklist,
    generatedAt: new Date().toISOString(),
  };
}
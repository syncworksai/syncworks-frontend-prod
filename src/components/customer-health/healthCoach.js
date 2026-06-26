// src/components/customer-health/healthCoach.js

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

function firstNumber(value) {
  const match = String(value ?? "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function normalizeExerciseName(name) {
  return cleanText(name).toLowerCase().replace(/\s+/g, " ");
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateValue) {
  if (!dateValue) return null;

  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(`${todayYmd()}T00:00:00`);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return null;
  }

  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function latestLog(history = []) {
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
      type: "Recovery-aware coaching",
      short: "Recovery",
      cadence: "Day-to-day",
      tone: "amber",
      strategy: "Protect the weak area, build consistency, and only increase intensity when pain stays controlled.",
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
      type: "Athletic performance coaching",
      short: "Athlete",
      cadence: "Hybrid",
      tone: "fuchsia",
      strategy: "Build explosive movement, hips, core, conditioning, body control, and recovery together.",
    };
  }

  if (
    goal.includes("strength") ||
    inspiration.includes("harrison") ||
    identity.includes("strength")
  ) {
    return {
      type: "Strength-focused coaching",
      short: "Strength",
      cadence: "Week-to-week",
      tone: "indigo",
      strategy: "Use controlled overload. Increase load only when reps, form, pain, and recovery support it.",
    };
  }

  if (
    goal.includes("fitness model") ||
    goal.includes("muscle") ||
    goal.includes("hypertrophy") ||
    inspiration.includes("fitness model")
  ) {
    return {
      type: "Lean muscle / aesthetic coaching",
      short: "Aesthetic",
      cadence: "Week-to-week",
      tone: "emerald",
      strategy: "Prioritize protein, consistent lifting, visible progress, steps, and controlled volume increases.",
    };
  }

  if (
    goal.includes("fat") ||
    goal.includes("weight") ||
    goal.includes("lean") ||
    identity.includes("weight loss")
  ) {
    return {
      type: "Weight loss and consistency coaching",
      short: "Weight Loss",
      cadence: "Day-to-day",
      tone: "cyan",
      strategy: "Win the day with steps, protein, calories, repeatable workouts, and accountability.",
    };
  }

  if (
    lower(profile.experience).includes("beginner") ||
    identity.includes("busy parent") ||
    identity.includes("beginner")
  ) {
    return {
      type: "Beginner / busy-life coaching",
      short: "Beginner",
      cadence: "Day-to-day",
      tone: "cyan",
      strategy: "Build habits first. Repeat clean movement before adding weight or intensity.",
    };
  }

  return {
    type: "General health coaching",
    short: "General",
    cadence: "Hybrid",
    tone: "slate",
    strategy: "Balance strength, steps, nutrition, recovery, and consistency.",
  };
}

function getCoachVoice(profile = {}) {
  const intensity = lower(profile.coaching_intensity);
  const accountability = lower(profile.accountability_level);

  if (intensity.includes("hardcore") || accountability.includes("no excuses")) {
    return {
      label: "Hardcore accountability",
      message:
        "The coach should push hard, but still respect pain, recovery, and form. No skipped logs without a reset plan.",
    };
  }

  if (intensity.includes("push") || accountability.includes("hold")) {
    return {
      label: "Push me",
      message:
        "The coach should challenge the user daily and call out missed effort, while adapting intelligently.",
    };
  }

  if (intensity.includes("recovery")) {
    return {
      label: "Recovery-first",
      message:
        "The coach should protect joints, pain points, and energy while still keeping the user moving.",
    };
  }

  if (intensity.includes("gentle") || accountability.includes("low")) {
    return {
      label: "Gentle consistency",
      message:
        "The coach should keep pressure low and focus on small wins, habit formation, and confidence.",
    };
  }

  return {
    label: "Balanced coaching",
    message:
      "The coach should push when the data says go, hold when recovery is low, and keep the user consistent.",
  };
}

function getWeakAreaAdvice(profile = {}) {
  const weakAreas = Array.isArray(profile.weak_areas) ? profile.weak_areas : [];
  const notes = cleanText(profile.limitations);
  const avoid = cleanText(profile.avoid_movements);

  const areas = [...weakAreas];

  if (lower(notes).includes("hip")) areas.push("Hip");
  if (lower(notes).includes("knee")) areas.push("Knee");
  if (lower(notes).includes("shoulder")) areas.push("Shoulder");
  if (lower(notes).includes("back")) areas.push("Back");

  const unique = Array.from(new Set(areas));

  if (!unique.length && !avoid) {
    return {
      label: "No major weak area selected",
      advice:
        "Progress normally, but keep tracking pain level, difficulty, and soreness after each workout.",
    };
  }

  const adviceMap = {
    Hip: "Prioritize glute bridges, dead bugs, controlled RDLs, walking, and hip mobility. Avoid forcing painful depth.",
    Knee: "Prioritize controlled squats, step-ups, hamstring/glute support, and pain-free range of motion.",
    Shoulder: "Prioritize rows, rear delts, light presses, and shoulder blade control. Avoid painful overhead work.",
    Back: "Prioritize bracing, dead bugs, walking, glute work, and controlled hinges. Avoid rushed heavy loading.",
    Core: "Prioritize dead bugs, planks, carries, slow tempo, and breathing control.",
    Mobility: "Prioritize warm-ups, walking, mobility resets, and slower controlled reps.",
    Endurance: "Prioritize step goals, active minutes, walking, and steady conditioning.",
    Balance: "Prioritize step-ups, carries, split stance work, and slower controlled reps.",
  };

  const areaAdvice = unique
    .map((area) => adviceMap[area] || `${area}: keep movement controlled and pain-free.`)
    .join(" ");

  return {
    label: unique.length ? unique.join(", ") : "Movement limits",
    advice: [areaAdvice, avoid ? `Avoid or modify: ${avoid}.` : ""].filter(Boolean).join(" "),
  };
}

function flattenHistoryExercises(history = []) {
  const rows = [];

  for (const log of Array.isArray(history) ? history : []) {
    const exercises = Array.isArray(log.exercises) ? log.exercises : [];

    for (const exercise of exercises) {
      rows.push({
        workoutName: log.workout_name || log.workout || "Workout",
        date: log.date || log.completed_at || "",
        completedAt: log.completed_at || log.date || "",
        userPath: log.user_path || "",
        cadence: log.progression_cadence || "",
        sessionFeel: log.session_feel || "",
        energy: safeNumber(log.energy),
        soreness: safeNumber(log.soreness),
        sleepQuality: log.sleep_quality || "",
        name: exercise.name || "Exercise",
        sets: firstNumber(exercise.sets),
        reps: firstNumber(exercise.reps),
        weight: safeNumber(exercise.weight),
        difficulty: cleanText(exercise.difficulty || "Medium"),
        pain: safeNumber(exercise.pain),
        notes: cleanText(exercise.notes),
      });
    }
  }

  return rows.sort((a, b) => {
    const aTime = new Date(a.completedAt || a.date || 0).getTime();
    const bTime = new Date(b.completedAt || b.date || 0).getTime();
    return bTime - aTime;
  });
}

function latestByExercise(history = []) {
  const rows = flattenHistoryExercises(history);
  const map = new Map();

  for (const row of rows) {
    const key = normalizeExerciseName(row.name);
    if (!key) continue;
    if (!map.has(key)) map.set(key, row);
  }

  return Array.from(map.values());
}

function buildProgressionForExercise(row, profile = {}, snapshot = {}) {
  const path = getCoachPath(profile, snapshot);
  const difficulty = lower(row.difficulty);
  const pain = safeNumber(row.pain);
  const weight = safeNumber(row.weight);
  const reps = safeNumber(row.reps);
  const sets = safeNumber(row.sets);
  const soreness = safeNumber(row.soreness);
  const energy = safeNumber(row.energy);
  const readiness = lower(snapshot.readiness);

  if (pain >= 4 || readiness.includes("pain")) {
    return {
      name: row.name,
      status: "Protect",
      recommendation:
        "Pain is the limiter. Reduce load, range, or impact next session and keep pain below 3/10.",
      reason: "Pain beats progression.",
    };
  }

  if (soreness >= 7 || energy <= 3 || readiness.includes("recovery")) {
    return {
      name: row.name,
      status: "Recover",
      recommendation:
        "Repeat the movement lighter or reduce total volume next session. The goal is to keep momentum without overreaching.",
      reason: "Recovery is low.",
    };
  }

  if (path.short === "Recovery") {
    return {
      name: row.name,
      status: "Quality",
      recommendation:
        "Keep tempo slow, range controlled, and pain-free. Progress by cleaner reps before adding load.",
      reason: "Recovery-aware path.",
    };
  }

  if (path.short === "Beginner") {
    if (difficulty.includes("easy")) {
      return {
        name: row.name,
        status: "Add reps",
        recommendation: reps
          ? `Try ${sets || 3} sets of ${reps + 1} reps next time. Add weight later.`
          : "Add a small amount of reps or time next session.",
        reason: "Beginners progress best through consistency and clean reps.",
      };
    }

    return {
      name: row.name,
      status: "Repeat",
      recommendation:
        "Repeat the same target next session and make the movement cleaner before increasing intensity.",
      reason: "Build skill first.",
    };
  }

  if (path.short === "Weight Loss") {
    if (difficulty.includes("easy")) {
      return {
        name: row.name,
        status: "Add volume",
        recommendation:
          "Add 1 set, add a short finisher, or increase steps. Do not chase heavy weight if calories/recovery are off.",
        reason: "Fat loss rewards consistency and total movement.",
      };
    }

    return {
      name: row.name,
      status: "Repeat",
      recommendation:
        "Repeat the workout, keep nutrition tight, and aim to hit steps/protein again tomorrow.",
      reason: "Consistency beats random intensity.",
    };
  }

  if (difficulty.includes("hard")) {
    return {
      name: row.name,
      status: "Hold",
      recommendation: weight
        ? `Hold ${weight} lbs next time and improve form before adding weight.`
        : "Hold the same variation and make it cleaner.",
      reason: "Hard sets need consolidation.",
    };
  }

  if (difficulty.includes("easy")) {
    if (weight > 0) {
      const nextWeight = Math.max(weight + 5, Math.round((weight * 1.05) / 5) * 5);

      return {
        name: row.name,
        status: "Increase",
        recommendation:
          path.short === "Strength"
            ? `Try ${nextWeight} lbs next time if warm-ups feel strong.`
            : `Try ${nextWeight} lbs or add 1-2 reps per set.`,
        reason: "Difficulty was easy and pain was controlled.",
      };
    }

    return {
      name: row.name,
      status: "Increase",
      recommendation: reps
        ? `Add 1-3 reps per set from ${reps}, or use a slightly harder variation.`
        : "Add reps, time, tempo, or a slightly harder variation.",
      reason: "Difficulty was easy and pain was controlled.",
    };
  }

  if (weight > 0) {
    return {
      name: row.name,
      status: "Progress",
      recommendation: `Keep ${weight} lbs and add 1 clean rep per set. Increase load only when form stays strong.`,
      reason: "Medium difficulty means controlled progression.",
    };
  }

  return {
    name: row.name,
    status: "Progress",
    recommendation:
      "Repeat the movement and add cleaner reps, slower tempo, or a little more time.",
    reason: "Progress does not always mean heavier.",
  };
}

function getMissedLogStatus(history = [], profile = {}) {
  const latest = latestLog(history);
  const days = daysBetween(latest?.date || latest?.completed_at);

  if (!latest) {
    return {
      status: "No logs yet",
      tone: "amber",
      daysSince: null,
      message:
        "No completed workouts are logged yet. The coach needs the first log to start adapting.",
      action:
        "Complete one workout today, even if it is short. Data beats guessing.",
    };
  }

  if (days >= 7) {
    return {
      status: "Off track",
      tone: "rose",
      daysSince: days,
      message: `No workout has been logged in ${days} days.`,
      action:
        lower(profile.accountability_level).includes("no excuses")
          ? "Reset today. Log a short workout or walk before the day ends."
          : "Restart with a short session today. Do not try to make up every missed day at once.",
    };
  }

  if (days >= 3) {
    return {
      status: "Needs reset",
      tone: "amber",
      daysSince: days,
      message: `Last log was ${days} days ago.`,
      action:
        "Use a lower-pressure workout today and rebuild momentum before increasing intensity.",
    };
  }

  if (days === 1 || days === 2) {
    return {
      status: "Active",
      tone: "cyan",
      daysSince: days,
      message: `Last log was ${days} day${days === 1 ? "" : "s"} ago.`,
      action:
        "Stay on schedule. Log today's readiness before deciding whether to push or hold.",
    };
  }

  return {
    status: "Logged today",
    tone: "emerald",
    daysSince: 0,
    message: "Workout data is current.",
    action:
      "Use today's data to decide whether the next session should push, hold, or recover.",
  };
}

function chooseRecommendedWorkout(profile = {}, snapshot = {}, workouts = [], history = []) {
  const path = getCoachPath(profile, snapshot);
  const missed = getMissedLogStatus(history, profile);
  const readiness = lower(snapshot.readiness);
  const available = Array.isArray(workouts) ? workouts : [];

  if (!available.length) {
    return {
      workout: null,
      reason: "Add a workout first so the coach can recommend the best next session.",
    };
  }

  if (missed.daysSince >= 3) {
    const reset =
      available.find((w) => lower(w.name).includes("recovery")) ||
      available.find((w) => lower(w.focus).includes("mobility")) ||
      available.find((w) => lower(w.name).includes("walk")) ||
      available[0];

    return {
      workout: reset,
      reason:
        "The user has missed logs, so the coach should restart momentum instead of overcorrecting.",
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
      reason:
        "Readiness is low, so today should favor recovery, walking, mobility, and controlled movement.",
    };
  }

  if (path.short === "Athlete") {
    const athletic =
      available.find((w) => lower(w.name).includes("athletic")) ||
      available.find((w) => lower(w.focus).includes("sport")) ||
      available.find((w) => lower(w.focus).includes("core")) ||
      available[0];

    return {
      workout: athletic,
      reason:
        "Athletic goals need hips, core, power, conditioning, and movement quality together.",
    };
  }

  if (path.short === "Strength") {
    const strength =
      available.find((w) => lower(w.name).includes("strength")) ||
      available.find((w) => lower(w.focus).includes("strength")) ||
      available[0];

    return {
      workout: strength,
      reason:
        "Strength goals need planned overload, longer rest, and clean reps before added load.",
    };
  }

  if (path.short === "Aesthetic") {
    const lean =
      available.find((w) => lower(w.name).includes("lean")) ||
      available.find((w) => lower(w.focus).includes("hypertrophy")) ||
      available[0];

    return {
      workout: lean,
      reason:
        "Fitness model goals need consistent lifting, protein, steps, and visible weekly progress.",
    };
  }

  return {
    workout: available[0],
    reason: path.strategy,
  };
}

function buildDailyFocus({ profile, snapshot, history }) {
  const path = getCoachPath(profile, snapshot);
  const missed = getMissedLogStatus(history, profile);

  const steps = safeNumber(snapshot?.steps);
  const stepGoal = safeNumber(snapshot?.step_goal) || 8000;
  const protein = safeNumber(snapshot?.protein_today);
  const proteinGoal = safeNumber(snapshot?.protein_goal);
  const calories = safeNumber(snapshot?.calories);
  const calorieGoal = safeNumber(snapshot?.calorie_goal) || 2200;

  const stepGap = Math.max(0, stepGoal - steps);
  const proteinGap = Math.max(0, proteinGoal - protein);

  if (missed.daysSince >= 3) {
    return `${missed.action} The coach should lower the starting pressure, then rebuild consistency.`;
  }

  if (lower(snapshot?.readiness).includes("pain")) {
    return "Protect the body today. Train pain-free, reduce load or range, and log exactly what hurts.";
  }

  if (lower(snapshot?.readiness).includes("recovery")) {
    return "Recovery is the limiter today. Move, walk, stretch, or lift light - do not chase a personal record.";
  }

  if (proteinGoal && proteinGap > 30) {
    return `Protein is short by about ${proteinGap}g. Hit protein earlier so training has something to build from.`;
  }

  if (stepGap > 1500 && path.short === "Weight Loss") {
    return `Steps are short by ${stepGap.toLocaleString()}. Add a walk before adding more workout volume.`;
  }

  if (calories > calorieGoal && calorieGoal > 0 && path.short === "Weight Loss") {
    return "Calories are above target. Keep training normal, but tighten food choices tomorrow.";
  }

  if (path.short === "Strength") {
    return "Push the main lift only if warm-ups feel strong. If reps slow down or pain rises, hold the weight.";
  }

  if (path.short === "Athlete") {
    return "Train movement quality first: hips, core, power, and conditioning. Do not let fatigue make reps sloppy.";
  }

  if (path.short === "Aesthetic") {
    return "Win with protein, clean lifting volume, and steps. Add reps before adding random intensity.";
  }

  return "Stay consistent today. Log readiness, workout, steps, protein, and how the body feels.";
}

function buildNextActions({ profile, snapshot, history }) {
  const path = getCoachPath(profile, snapshot);
  const missed = getMissedLogStatus(history, profile);

  if (missed.daysSince >= 3) {
    return [
      "Complete a short reset workout today.",
      "Log energy, soreness, pain, and difficulty.",
      "Do not try to make up every missed workout in one day.",
    ];
  }

  if (path.short === "Recovery") {
    return [
      "Keep pain below 3/10.",
      "Prioritize mobility, glutes, core, and controlled range.",
      "Progress only through cleaner reps first.",
    ];
  }

  if (path.short === "Strength") {
    return [
      "Warm up honestly before heavy sets.",
      "Increase load only if last session was clean.",
      "Hold weight if difficulty was hard or recovery is low.",
    ];
  }

  if (path.short === "Athlete") {
    return [
      "Train hips, core, power, and conditioning.",
      "Stop explosive work if pain or sloppy reps appear.",
      "Track session feel so the coach can manage fatigue.",
    ];
  }

  if (path.short === "Aesthetic") {
    return [
      "Hit protein target.",
      "Complete planned lifting volume.",
      "Use steps/cardio to support leanness without wrecking recovery.",
    ];
  }

  return [
    "Complete today's workout or a short walk.",
    "Log difficulty and pain.",
    "Let the coach adjust the next session from real data.",
  ];
}

export function buildHealthCoachReport({
  profile,
  snapshot,
  workouts,
  history,
  progressLogs,
}) {
  const coachPath = getCoachPath(profile, snapshot);
  const coachVoice = getCoachVoice(profile);
  const weak = getWeakAreaAdvice(profile);
  const missed = getMissedLogStatus(history, profile);

  const latest = latestByExercise(history).slice(0, 10);
  const progression = latest.map((row) => buildProgressionForExercise(row, profile, snapshot));

  const recommended = chooseRecommendedWorkout(profile, snapshot, workouts, history);

  const trainingIdentity = [
    coachPath.short,
    profile?.primary_goal || snapshot?.goal || "General fitness",
    profile?.inspiration_goal ? `Inspired by: ${profile.inspiration_goal}` : "",
    profile?.sport ? `Sport: ${profile.sport}` : "",
    profile?.experience ? `Level: ${profile.experience}` : "",
    profile?.training_days ? `${profile.training_days} days/week` : "",
    profile?.preferred_time ? profile.preferred_time : "",
  ].filter(Boolean);

  const dailyFocus = buildDailyFocus({ profile, snapshot, history });
  const nextActions = buildNextActions({ profile, snapshot, history });

  return {
    trainingIdentity,
    coachPath,
    coachVoice,
    dailyFocus,
    nextActions,
    accountability: missed,
    weakArea: weak,
    recommendedWorkout: recommended.workout,
    recommendedReason: recommended.reason,
    progression,
    hasHistory: latest.length > 0,
    progressCount: Array.isArray(progressLogs) ? progressLogs.length : 0,
    coachMessage: `${coachPath.type}: ${coachPath.strategy}`,
  };
}
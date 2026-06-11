// src/components/customer-health/healthCoach.js

function safeNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function firstNumber(value) {
  const match = String(value ?? "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function normalizeExerciseName(name) {
  return cleanText(name).toLowerCase().replace(/\s+/g, " ");
}

function goalTone(goal = "") {
  const g = goal.toLowerCase();

  if (g.includes("fat")) return "steps, full-body strength, calories, and consistency";
  if (g.includes("muscle")) return "hypertrophy, protein, progressive overload, and recovery";
  if (g.includes("strength")) return "compound lifts, rest, form quality, and gradual load increases";
  if (g.includes("sport")) return "movement quality, hips, core, strength, conditioning, and recovery";
  if (g.includes("mobility") || g.includes("pain") || g.includes("rehab")) {
    return "controlled movement, mobility, weak-area support, and pain-free progress";
  }

  return "general fitness, consistency, steps, strength, and recovery";
}

function getWeakAreaAdvice(profile = {}) {
  const weakAreas = Array.isArray(profile.weak_areas) ? profile.weak_areas : [];
  const notes = cleanText(profile.limitations);

  const areas = [...weakAreas];

  if (notes.toLowerCase().includes("hip")) areas.push("Hip");
  if (notes.toLowerCase().includes("knee")) areas.push("Knee");
  if (notes.toLowerCase().includes("shoulder")) areas.push("Shoulder");
  if (notes.toLowerCase().includes("back")) areas.push("Back");

  const unique = Array.from(new Set(areas));

  if (!unique.length) {
    return {
      label: "No major weak area selected",
      advice: "Progress normally, but keep tracking pain level and difficulty after each workout.",
    };
  }

  const adviceMap = {
    Hip: "Prioritize glute bridges, dead bugs, controlled RDLs, walking, and hip mobility. Avoid forcing painful depth.",
    Knee: "Prioritize controlled squats, step-ups, hamstring/glute support, and pain-free range of motion.",
    Shoulder: "Prioritize rows, face-pull style movements, light presses, and shoulder blade control. Avoid painful overhead work.",
    Back: "Prioritize bracing, dead bugs, walking, glute work, and controlled hinges. Avoid rushed heavy loading.",
    Core: "Prioritize dead bugs, planks, carries, slow tempo, and breathing control.",
    Mobility: "Prioritize warm-ups, walking, mobility resets, and slower controlled reps.",
    Endurance: "Prioritize step goals, active minutes, walking, and steady conditioning.",
  };

  return {
    label: unique.join(", "),
    advice: unique.map((area) => adviceMap[area] || `${area}: keep movement controlled and pain-free.`).join(" "),
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

  return rows;
}

function latestByExercise(history = []) {
  const rows = flattenHistoryExercises(history);
  const map = new Map();

  for (const row of rows) {
    const key = normalizeExerciseName(row.name);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

function buildProgressionForExercise(row) {
  const difficulty = cleanText(row.difficulty).toLowerCase();
  const pain = safeNumber(row.pain);
  const weight = safeNumber(row.weight);
  const reps = safeNumber(row.reps);
  const sets = safeNumber(row.sets);

  if (pain >= 4) {
    return {
      name: row.name,
      status: "Protect",
      recommendation: `Pain was ${pain}/10. Reduce load or range of motion next time and keep the movement pain-free.`,
    };
  }

  if (difficulty.includes("hard")) {
    return {
      name: row.name,
      status: "Hold",
      recommendation: weight
        ? `Hold ${weight} lbs and try to make the same ${sets || 3} sets cleaner before increasing.`
        : `Hold the same version and make the reps cleaner before increasing difficulty.`,
    };
  }

  if (difficulty.includes("easy")) {
    if (weight > 0) {
      const nextWeight = Math.round((weight * 1.05) / 5) * 5 || weight + 5;

      return {
        name: row.name,
        status: "Increase",
        recommendation: `Try ${nextWeight} lbs next time, or keep ${weight} lbs and add 1–2 reps per set.`,
      };
    }

    return {
      name: row.name,
      status: "Increase",
      recommendation: reps
        ? `Add 1–3 reps per set next time, or choose a slightly harder variation.`
        : `Increase time, reps, or control slightly next time.`,
    };
  }

  if (weight > 0) {
    return {
      name: row.name,
      status: "Progress",
      recommendation: `Keep ${weight} lbs and try to add 1 rep per set. Increase weight only when form stays clean.`,
    };
  }

  return {
    name: row.name,
    status: "Progress",
    recommendation: `Repeat the movement and add cleaner reps, slower tempo, or a little more time.`,
  };
}

function chooseRecommendedWorkout(profile = {}, snapshot = {}, workouts = []) {
  const readiness = cleanText(snapshot.readiness);
  const goal = cleanText(profile.primary_goal || snapshot.goal || "General fitness").toLowerCase();
  const weak = getWeakAreaAdvice(profile);

  const available = Array.isArray(workouts) ? workouts : [];

  if (readiness === "Pain / Limit" || readiness === "Need Recovery") {
    const recovery =
      available.find((w) => cleanText(w.name).toLowerCase().includes("recovery")) ||
      available.find((w) => cleanText(w.focus).toLowerCase().includes("mobility")) ||
      available.find((w) => cleanText(w.focus).toLowerCase().includes("steps"));

    return {
      workout: recovery || available[0] || null,
      reason: "Readiness is low, so today should favor recovery, walking, mobility, and controlled movement.",
    };
  }

  if (goal.includes("sport")) {
    const sport =
      available.find((w) => cleanText(w.name).toLowerCase().includes("athletic")) ||
      available.find((w) => cleanText(w.focus).toLowerCase().includes("core")) ||
      available.find((w) => cleanText(w.focus).toLowerCase().includes("hips"));

    return {
      workout: sport || available[0] || null,
      reason: `Sport performance should prioritize ${goalTone("sport performance")}. Weak-area note: ${weak.label}.`,
    };
  }

  if (goal.includes("muscle") || goal.includes("strength")) {
    const strength =
      available.find((w) => cleanText(w.focus).toLowerCase().includes("strength")) ||
      available.find((w) => cleanText(w.name).toLowerCase().includes("upper")) ||
      available.find((w) => cleanText(w.name).toLowerCase().includes("push"));

    return {
      workout: strength || available[0] || null,
      reason: "Goal is strength or muscle, so use progressive overload while keeping form clean.",
    };
  }

  return {
    workout: available[0] || null,
    reason: `Current focus: ${goalTone(profile.primary_goal || snapshot.goal)}.`,
  };
}

export function buildHealthCoachReport({ profile, snapshot, workouts, history, progressLogs }) {
  const latest = latestByExercise(history).slice(0, 8);
  const progression = latest.map(buildProgressionForExercise);
  const recommended = chooseRecommendedWorkout(profile, snapshot, workouts);
  const weak = getWeakAreaAdvice(profile);

  const steps = safeNumber(snapshot?.steps);
  const stepGoal = safeNumber(snapshot?.step_goal) || 8000;
  const protein = safeNumber(snapshot?.protein_today);
  const proteinGoal = safeNumber(snapshot?.protein_goal);
  const calories = safeNumber(snapshot?.calories);
  const calorieGoal = safeNumber(snapshot?.calorie_goal) || 2200;

  const stepGap = Math.max(0, stepGoal - steps);
  const proteinGap = Math.max(0, proteinGoal - protein);

  let dailyFocus = "Stay consistent today. Track the workout, steps, protein, and how the body feels.";

  if (snapshot?.readiness === "Pain / Limit") {
    dailyFocus = "Protect the body today. Choose recovery, walking, and controlled mobility instead of chasing intensity.";
  } else if (snapshot?.readiness === "Need Recovery") {
    dailyFocus = "Lower the volume today. Keep movement easy and prioritize recovery.";
  } else if (proteinGoal && proteinGap > 30) {
    dailyFocus = `Protein is short by about ${proteinGap}g. Hit protein earlier before pushing intensity higher.`;
  } else if (stepGap > 1500) {
    dailyFocus = `Steps are short by ${stepGap.toLocaleString()}. Add a walk before adding more workout volume.`;
  } else if (calories > calorieGoal && calorieGoal > 0) {
    dailyFocus = "Calories are above target. Keep training normal, but tighten nutrition tomorrow.";
  }

  const trainingIdentity = [
    profile?.primary_goal || snapshot?.goal || "General fitness",
    profile?.sport ? `Sport: ${profile.sport}` : "",
    profile?.experience ? `Level: ${profile.experience}` : "",
    profile?.training_days ? `${profile.training_days} days/week` : "",
  ].filter(Boolean);

  return {
    trainingIdentity,
    dailyFocus,
    weakArea: weak,
    recommendedWorkout: recommended.workout,
    recommendedReason: recommended.reason,
    progression,
    hasHistory: latest.length > 0,
    progressCount: Array.isArray(progressLogs) ? progressLogs.length : 0,
  };
}
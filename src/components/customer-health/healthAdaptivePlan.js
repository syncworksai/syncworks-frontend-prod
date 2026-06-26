// src/components/customer-health/healthAdaptivePlan.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatAmount(value, suffix = "") {
  return `${Math.max(0, Math.round(value))}${suffix}`;
}

function topExerciseChanges(exercises = []) {
  return exercises
    .filter((exercise) => exercise.last_occurrence)
    .filter(
      (exercise) =>
        exercise.recommendation?.type !== "collect_data"
    )
    .slice(0, 4)
    .map((exercise) => ({
      id: exercise.id,
      exercise: exercise.name,
      label: exercise.recommendation.label,
      message: exercise.recommendation.message,
      tone: exercise.recommendation.tone,
    }));
}

export function buildAdaptiveDailyPlan({
  kpis,
  snapshot = {},
  profile = {},
}) {
  const readiness = kpis?.readiness || {
    score: 60,
    status: "Maintain",
    tone: "amber",
  };

  const proteinGoal = safeNumber(
    snapshot.protein_goal || profile.protein_goal || 150,
    150
  );

  const protein = safeNumber(snapshot.protein_today, 0);
  const proteinRemaining = Math.max(0, proteinGoal - protein);

  const stepGoal = safeNumber(
    snapshot.step_goal || profile.step_goal || 8000,
    8000
  );

  const steps = safeNumber(snapshot.steps, 0);
  const stepsRemaining = Math.max(0, stepGoal - steps);

  const calorieGoal = safeNumber(
    snapshot.calorie_goal || profile.calorie_goal || 2200,
    2200
  );

  const calories = safeNumber(snapshot.calories, 0);
  const caloriesRemaining = Math.max(0, calorieGoal - calories);

  let trainingTitle = "Train as planned";
  let trainingMessage =
    "Use today's exercise recommendations and continue collecting effort and pain data.";

  if (readiness.status === "Recovery") {
    trainingTitle = "Recovery-first training";
    trainingMessage =
      "Reduce optional volume, avoid max-effort sets, and prioritize mobility, walking, nutrition and sleep.";
  } else if (readiness.status === "Maintain") {
    trainingTitle = "Maintain productive intensity";
    trainingMessage =
      "Use clean repetitions and hold progression where recovery or pain data is uncertain.";
  } else {
    trainingTitle = "Ready for productive progression";
    trainingMessage =
      "Progress only exercises that reached their targets with manageable effort and no meaningful pain.";
  }

  const priorities = [];

  if (proteinRemaining > 0) {
    priorities.push({
      id: "protein",
      label: `${formatAmount(proteinRemaining, "g")} protein remaining`,
      message:
        "Spread the remaining protein across your next meals instead of leaving it all for the end of the day.",
      tone: "emerald",
    });
  }

  if (stepsRemaining > 0) {
    priorities.push({
      id: "steps",
      label: `${formatAmount(stepsRemaining)} steps remaining`,
      message:
        stepsRemaining > 3000
          ? "Use two or three short walks to close the gap."
          : "A short walk can finish today's movement target.",
      tone: "cyan",
    });
  }

  if (caloriesRemaining > 0) {
    priorities.push({
      id: "calories",
      label: `${formatAmount(caloriesRemaining)} calories remaining`,
      message:
        "Use the calorie target with protein, hydration and training goals-not as an isolated number.",
      tone: "amber",
    });
  }

  if (readiness.sleep_hours > 0 && readiness.sleep_hours < readiness.sleep_goal) {
    priorities.push({
      id: "sleep",
      label: `${Math.round(
        (readiness.sleep_goal - readiness.sleep_hours) * 10
      ) / 10} hours below sleep goal`,
      message:
        "Protect tonight's sleep block and avoid unnecessary late-day stimulation.",
      tone: "fuchsia",
    });
  }

  return {
    readiness,
    training: {
      title: trainingTitle,
      message: trainingMessage,
    },
    exercise_changes: topExerciseChanges(kpis?.exercises || []),
    priorities: priorities.slice(0, 4),
    generated_at: new Date().toISOString(),
  };
}
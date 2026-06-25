// src/components/customer-health/healthAdaptiveWorkoutGenerator.js
import { HEALTH_EXERCISE_CATALOG } from "./healthExerciseCatalog";
import { buildCoachIntelligence } from "./healthCoachIntelligence";

function text(value) {
  return String(value || "").toLowerCase();
}

function categoryMatches(exercise, focus) {
  const haystack = [
    exercise.name,
    exercise.category,
    exercise.movement_pattern,
    ...(exercise.primary_muscles || []),
    ...(exercise.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const patterns = {
    Push: /chest|triceps|shoulder|press|push/,
    Pull: /back|lat|biceps|row|pull/,
    Legs: /quad|glute|hamstring|calf|squat|hinge|lunge|leg/,
    Core: /core|abs|oblique|plank|rotation/,
    Cardio: /cardio|hiit|treadmill|bike|row|elliptical|walk|run|stair/,
  };

  return patterns[focus]?.test(haystack) || false;
}

function selectUnique(list, count, used = new Set()) {
  const selected = [];

  for (const item of list) {
    if (selected.length >= count) break;
    if (!item?.id || used.has(item.id)) continue;
    used.add(item.id);
    selected.push(item);
  }

  return selected;
}

export function buildAdaptiveWorkout({
  history = [],
  snapshot = {},
  profile = {},
} = {}) {
  const intelligence = buildCoachIntelligence({ history, days: 7 });
  const recovery = intelligence.recovery?.level || "Ready";
  const nextFocus = intelligence.next_focus?.focus || "Balanced full body";
  const wantsCardio =
    text(profile.primary_goal).includes("weight") ||
    text(profile.primary_goal).includes("health") ||
    text(snapshot.goal).includes("weight") ||
    intelligence.sessions < 2;

  const used = new Set();
  let focus = nextFocus;

  if (recovery === "Recovery") {
    focus = "Recovery";
  }

  const pool = HEALTH_EXERCISE_CATALOG.filter(
    (exercise) =>
      exercise.category !== "Mobility" &&
      exercise.category !== "Warm-up"
  );

  let strength = [];

  if (focus === "Recovery") {
    strength = selectUnique(
      HEALTH_EXERCISE_CATALOG.filter((exercise) =>
        /mobility|warm-up|bodyweight/i.test(
          `${exercise.category} ${exercise.equipment}`
        )
      ),
      5,
      used
    );
  } else {
    strength = selectUnique(
      pool.filter((exercise) => categoryMatches(exercise, focus)),
      4,
      used
    );

    if (strength.length < 4) {
      strength.push(
        ...selectUnique(
          pool.filter((exercise) => exercise.category === "Strength"),
          4 - strength.length,
          used
        )
      );
    }
  }

  const cardioPool = HEALTH_EXERCISE_CATALOG.filter((exercise) =>
    /cardio|hiit/i.test(exercise.category)
  );

  const cardio = wantsCardio
    ? selectUnique(
        cardioPool.filter((exercise) =>
          recovery === "Recovery"
            ? /walk|bike|elliptical/i.test(exercise.name)
            : true
        ),
        1,
        used
      )
    : [];

  const exercises = [...strength, ...cardio].map((exercise, index) => ({
    ...exercise,
    planned_sets:
      exercise.category === "Cardio" || exercise.category === "HIIT"
        ? "1"
        : recovery === "Caution"
        ? String(Math.max(2, Number(exercise.sets || 3) - 1))
        : exercise.sets,
    planned_reps: exercise.reps,
    rest_seconds:
      exercise.category === "Cardio" || exercise.category === "HIIT"
        ? 0
        : recovery === "Recovery"
        ? 45
        : recovery === "Caution"
        ? 90
        : 75,
    order: index + 1,
  }));

  return {
    title:
      recovery === "Recovery"
        ? "Recovery and movement session"
        : `${focus} adaptive workout`,
    focus,
    recovery,
    reason:
      intelligence.next_focus?.reason ||
      "Built from your recent training balance.",
    exercises,
    intelligence,
    includes_cardio: cardio.length > 0,
  };
}

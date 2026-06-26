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
    Mobility: /mobility|stretch|recovery|warm-up|range of motion/,
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

function normalizeMode(mode = "recommended") {
  const value = text(mode);
  if (value.includes("recovery")) return "recovery";
  if (value.includes("mobility")) return "mobility";
  if (value.includes("cardio")) return "cardio";
  if (value.includes("second")) return "second-session";
  if (value.includes("strength")) return "strength";
  return "recommended";
}

function buildFallbackExercises({ recovery, mode, used }) {
  const mobilityPool = HEALTH_EXERCISE_CATALOG.filter((exercise) =>
    /mobility|warm-up|stretch|recovery/i.test(
      `${exercise.category} ${exercise.name} ${exercise.movement_pattern}`
    )
  );

  const bodyweightPool = HEALTH_EXERCISE_CATALOG.filter((exercise) =>
    /bodyweight|band|mat|no equipment/i.test(
      `${exercise.equipment} ${exercise.location}`
    )
  );

  const cardioPool = HEALTH_EXERCISE_CATALOG.filter((exercise) =>
    /cardio|hiit|walk|bike|elliptical|row|stair/i.test(
      `${exercise.category} ${exercise.name}`
    )
  );

  if (mode === "cardio") return selectUnique(cardioPool, 4, used);

  if (mode === "mobility" || mode === "recovery" || recovery === "Recovery") {
    const selected = selectUnique(mobilityPool, 5, used);
    if (selected.length < 5) {
      selected.push(...selectUnique(bodyweightPool, 5 - selected.length, used));
    }
    return selected;
  }

  return selectUnique(HEALTH_EXERCISE_CATALOG, 5, used);
}

export function buildAdaptiveWorkout({
  history = [],
  snapshot = {},
  profile = {},
  mode = "recommended",
} = {}) {
  const intelligence = buildCoachIntelligence({ history, days: 7 });
  const requestedMode = normalizeMode(mode);
  const recovery = intelligence.recovery?.level || "Ready";
  const nextFocus = intelligence.next_focus?.focus || "Balanced full body";

  const wantsCardio =
    requestedMode === "cardio" ||
    text(profile.primary_goal).includes("weight") ||
    text(profile.primary_goal).includes("health") ||
    text(snapshot.goal).includes("weight") ||
    intelligence.sessions < 2;

  const used = new Set();
  let focus = nextFocus;

  if (requestedMode === "recovery") focus = "Recovery";
  else if (requestedMode === "mobility") focus = "Mobility";
  else if (requestedMode === "cardio") focus = "Cardio";
  else if (requestedMode === "second-session") {
    focus = recovery === "Recovery" ? "Mobility" : "Core";
  } else if (requestedMode === "strength") {
    focus = nextFocus === "Balanced full body" ? "Push" : nextFocus;
  } else if (recovery === "Recovery") {
    focus = "Recovery";
  }

  const strengthPool = HEALTH_EXERCISE_CATALOG.filter(
    (exercise) =>
      !/mobility|warm-up|recovery/i.test(exercise.category || "") &&
      !/cardio|hiit/i.test(exercise.category || "")
  );

  let strength = [];

  if (focus === "Recovery" || focus === "Mobility") {
    strength = buildFallbackExercises({ recovery, mode: requestedMode, used });
  } else if (focus !== "Cardio") {
    const targetCount = requestedMode === "second-session" ? 3 : 4;
    strength = selectUnique(
      strengthPool.filter((exercise) => categoryMatches(exercise, focus)),
      targetCount,
      used
    );

    if (strength.length < targetCount) {
      strength.push(...selectUnique(strengthPool, targetCount - strength.length, used));
    }
  }

  const cardioPool = HEALTH_EXERCISE_CATALOG.filter((exercise) =>
    /cardio|hiit|walk|bike|elliptical|row|stair/i.test(
      `${exercise.category} ${exercise.name}`
    )
  );

  const cardioCount = requestedMode === "cardio" ? 4 : wantsCardio ? 1 : 0;
  const cardio = selectUnique(
    cardioPool.filter((exercise) =>
      recovery === "Recovery"
        ? /walk|bike|elliptical|mobility/i.test(exercise.name)
        : true
    ),
    cardioCount,
    used
  );

  let selected = [...strength, ...cardio];
  if (!selected.length) {
    selected = buildFallbackExercises({
      recovery,
      mode: requestedMode === "recommended" ? "recovery" : requestedMode,
      used,
    });
  }
  if (!selected.length) selected = selectUnique(HEALTH_EXERCISE_CATALOG, 4, used);

  const exercises = selected.map((exercise, index) => {
    const isCardio = /cardio|hiit/i.test(exercise.category || "");
    return {
      ...exercise,
      planned_sets: isCardio
        ? "1"
        : requestedMode === "second-session"
        ? String(Math.min(3, Math.max(2, Number(exercise.sets || 3))))
        : recovery === "Caution"
        ? String(Math.max(2, Number(exercise.sets || 3) - 1))
        : exercise.sets || "3",
      planned_reps: exercise.reps || (isCardio ? "10-20 min" : "8-12"),
      rest_seconds: isCardio
        ? 0
        : recovery === "Recovery"
        ? 45
        : recovery === "Caution"
        ? 90
        : 75,
      order: index + 1,
    };
  });

  const titleByMode = {
    recovery: "Light recovery session",
    mobility: "Mobility and movement session",
    cardio: "Cardio session",
    "second-session":
      recovery === "Recovery"
        ? "Second session: mobility reset"
        : "Second session: short accessory workout",
    strength: `${focus} strength workout`,
  };

  return {
    title:
      titleByMode[requestedMode] ||
      (recovery === "Recovery"
        ? "Recovery and movement session"
        : `${focus} adaptive workout`),
    focus,
    recovery,
    requested_mode: requestedMode,
    reason:
      requestedMode === "second-session"
        ? "A shorter second session is ready without blocking you from training again."
        : requestedMode === "recovery" || requestedMode === "mobility"
        ? "Recovery guidance changes the intensity, not your ability to begin a session."
        : requestedMode === "cardio"
        ? "A cardio session is always available when you want to move."
        : intelligence.next_focus?.reason ||
          "Built from your recent training balance.",
    exercises,
    intelligence,
    includes_cardio: cardio.length > 0,
    ready_to_start: exercises.length > 0,
  };
}
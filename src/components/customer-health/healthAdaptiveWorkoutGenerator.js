// src/components/customer-health/healthAdaptiveWorkoutGenerator.js
import { HEALTH_EXERCISE_CATALOG } from "./healthExerciseCatalog";
import { buildCoachIntelligence } from "./healthCoachIntelligence";

function text(value) {
  return String(value || "").toLowerCase();
}

function loggedSoreAreas(snapshot = {}) {
  const values = [
    snapshot.sore_areas,
    snapshot.soreness_areas,
    snapshot.sore_muscles,
    snapshot.sore_body_parts,
    snapshot.pain_area,
    snapshot.pain_areas,
    snapshot.preworkout_pain_areas,
    snapshot.protected_pain_areas,
    snapshot.readiness_notes,
    snapshot.notes,
  ];

  const raw = values
    .flatMap((value) =>
      Array.isArray(value) ? value : [value]
    )
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const patterns = {
    Neck: /neck|cervical/,
    Chest: /chest|pec|pector/,
    Shoulders: /shoulder|delt/,
    Elbows: /elbow/,
    Wrists: /wrist|forearm/,
    Triceps: /tricep/,
    "Upper Back": /upper back|lat|trap|rhomboid/,
    "Lower Back": /lower back|lumbar|spine/,
    Back: /back|lat|trap|rhomboid/,
    Biceps: /bicep/,
    Hips: /hip|glute|hip flexor/,
    Knees: /knee|patella/,
    Ankles: /ankle|achilles/,
    Quads: /quad/,
    Hamstrings: /hamstring/,
    Calves: /calf/,
    Legs: /leg|quad|hamstring|glute|calf|hip|knee|ankle/,
    Core: /core|ab|oblique/,
  };

  return Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(raw))
    .map(([label]) => label);
}

function exerciseHitsSoreArea(
  exercise,
  soreAreas = []
) {
  if (!soreAreas.length) return false;

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
    Neck: /neck|shrug|upper trap/,
    Chest: /chest|pec|bench|fly|push-up/,
    Shoulders: /shoulder|delt|overhead press|lateral raise|vertical press/,
    Elbows: /curl|tricep|pushdown|extension|press/,
    Wrists: /barbell|dumbbell|curl|press|push-up|plank/,
    Triceps: /tricep|pushdown|press/,
    "Upper Back": /upper back|lat|row|pulldown|pull-up|trap|rhomboid/,
    "Lower Back": /lower back|lumbar|deadlift|hinge|good morning|back extension|bent-over/,
    Back: /back|lat|row|pulldown|pull-up|trap|rhomboid|deadlift/,
    Biceps: /bicep|curl/,
    Hips: /hip|glute|squat|deadlift|hinge|lunge|leg press|step-up|running|stair/,
    Knees: /knee|squat|lunge|leg press|leg extension|step-up|running|stair|jump/,
    Ankles: /ankle|calf|running|walking|jump|stair|lunge/,
    Quads: /quad|squat|lunge|leg press|leg extension/,
    Hamstrings: /hamstring|deadlift|hinge|leg curl|good morning/,
    Calves: /calf|running|walking|jump|stair/,
    Legs: /leg|quad|hamstring|glute|calf|squat|hinge|lunge|deadlift/,
    Core: /core|ab|oblique|plank|rotation/,
  };

  return soreAreas.some(
    (area) => patterns[area]?.test(haystack)
  );
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
  const liveSession = snapshot?.live_training_session;
  const connectedHistory =
    liveSession?.session_id &&
    !history.some(
      (item) =>
        String(
          item?.id ||
            item?.session_id ||
            item?.session?.id ||
            ""
        ) === String(liveSession.session_id)
    )
      ? [liveSession, ...history]
      : history;

  const intelligence = buildCoachIntelligence({
    history: connectedHistory,
    days: 7,
  });
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
    focus =
      nextFocus === "Balanced full body"
        ? "Full body"
        : nextFocus;
  } else if (recovery === "Recovery") {
    focus = "Recovery";
  }

  const soreAreas = loggedSoreAreas(snapshot);
  const allowSoreOverride =
    snapshot.allow_sore_muscle_override === true;

  const strengthPool = HEALTH_EXERCISE_CATALOG.filter(
    (exercise) =>
      !/mobility|warm-up|recovery/i.test(exercise.category || "") &&
      !/cardio|hiit/i.test(exercise.category || "") &&
      (
        allowSoreOverride ||
        !exerciseHitsSoreArea(exercise, soreAreas)
      )
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
    const protectedAreas = Array.isArray(snapshot.protected_pain_areas)
      ? snapshot.protected_pain_areas
      : [];
    return {
      ...exercise,
      coach_reason:
        protectedAreas.length > 0
          ? `Selected because it supports today's ${focus.toLowerCase()} goal while training around ${protectedAreas.join(", ")}.`
          : `Selected to support today's ${focus.toLowerCase()} goal.`,
      available_today: true,
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
    balance_protection:
      intelligence.next_focus?.protected_focus
        ? {
            protected_focus:
              intelligence.next_focus.protected_focus,
            recommended_focus:
              intelligence.next_focus.focus,
            spread:
              intelligence.next_focus.balance_spread || 0,
          }
        : null,
    exercises,
    intelligence,
    includes_cardio: cardio.length > 0,
    ready_to_start: exercises.length > 0,
    avoided_sore_areas:
      allowSoreOverride ? [] : soreAreas,
    protected_pain_areas:
      Array.isArray(snapshot.protected_pain_areas)
        ? snapshot.protected_pain_areas
        : [],
    can_train_focus: focus,
    positive_alternatives_message:
      soreAreas.length > 0 && !allowSoreOverride
        ? `You can still train today. The coach selected ${focus.toLowerCase()} movements that work around ${soreAreas.join(", ")}.`
        : `You can train the planned ${focus.toLowerCase()} focus today.`,
    soreness_override_active:
      allowSoreOverride,
  };
}
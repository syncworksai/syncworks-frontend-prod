// src/components/customer-health/healthTrainingClassification.js

const WORKOUT_RULES = [
  {
    id: "upper_push",
    title: "Upper Body Push",
    body_region: "Upper Body",
    movement_pattern: "Push",
    primary_muscles: ["Chest", "Front Delts", "Triceps"],
    terms: ["bench", "chest press", "push-up", "push up", "shoulder press", "overhead press", "chest fly", "triceps", "upper push"],
  },
  {
    id: "upper_pull",
    title: "Upper Body Pull",
    body_region: "Upper Body",
    movement_pattern: "Pull",
    primary_muscles: ["Lats", "Upper Back", "Rear Delts", "Biceps"],
    terms: ["row", "pulldown", "pull-down", "pull-up", "pull up", "lat", "biceps", "rear delt", "upper pull"],
  },
  {
    id: "lower_push",
    title: "Lower Body Push",
    body_region: "Lower Body",
    movement_pattern: "Push",
    primary_muscles: ["Quads", "Glutes", "Calves"],
    terms: ["squat", "leg press", "lunge", "split squat", "step-up", "step up", "leg extension", "quad", "lower push"],
  },
  {
    id: "lower_pull",
    title: "Lower Body Pull",
    body_region: "Lower Body",
    movement_pattern: "Pull",
    primary_muscles: ["Hamstrings", "Glutes", "Posterior Chain"],
    terms: ["deadlift", "romanian", "rdl", "leg curl", "hip hinge", "good morning", "hamstring", "lower pull"],
  },
  {
    id: "core",
    title: "Core and Stability",
    body_region: "Core",
    movement_pattern: "Stability",
    primary_muscles: ["Abdominals", "Obliques", "Spinal Stabilizers"],
    terms: ["core", "plank", "sit-up", "sit up", "crunch", "dead bug", "bird dog", "pallof"],
  },
  {
    id: "conditioning",
    title: "Conditioning",
    body_region: "Full Body",
    movement_pattern: "Conditioning",
    primary_muscles: ["Cardiorespiratory System"],
    terms: ["hiit", "conditioning", "cardio", "run", "bike", "rower", "circuit"],
  },
  {
    id: "recovery",
    title: "Active Recovery",
    body_region: "Recovery",
    movement_pattern: "Mobility",
    primary_muscles: ["Recovery", "Mobility", "Breathing"],
    terms: ["recovery", "mobility", "stretch", "yoga", "rest day", "reset"],
  },
];

function workoutText(workout = {}) {
  const exercises = Array.isArray(workout.exercises)
    ? workout.exercises.map((item) => item?.name || item?.title || "").join(" ")
    : "";

  return [
    workout.workout_name,
    workout.title,
    workout.name,
    workout.focus,
    workout.adaptive_focus,
    workout.requested_focus,
    workout.note,
    exercises,
  ].filter(Boolean).join(" ").toLowerCase();
}

export function classifyWorkout(workout = {}) {
  const text = workoutText(workout);

  const ranked = WORKOUT_RULES.map((rule) => ({
    rule,
    score: rule.terms.reduce(
      (sum, term) => sum + (text.includes(term) ? 1 : 0),
      0
    ),
  })).sort((a, b) => b.score - a.score);

  const selected = ranked[0]?.score > 0
    ? ranked[0].rule
    : {
        id: "full_body",
        title:
          String(
            workout.workout_name ||
              workout.title ||
              workout.name ||
              "Full Body Strength"
          ).trim(),
        body_region: "Full Body",
        movement_pattern: "Mixed",
        primary_muscles: [],
      };

  return {
    training_category: selected.id,
    scientific_title: selected.title,
    body_region: selected.body_region,
    movement_pattern: selected.movement_pattern,
    primary_muscles: selected.primary_muscles,
    secondary_muscles: [],
    classification_source:
      ranked[0]?.score > 0 ? "rules_v1" : "workout_title",
  };
}

export function ymdFromIso(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

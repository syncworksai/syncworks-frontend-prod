// src/components/customer-health/PlanTodayWorkoutDrawer.jsx
import React, { useMemo, useState } from "react";

import { buildAdaptiveWorkout } from "./healthAdaptiveWorkoutGenerator";
import { HEALTH_EXERCISE_CATALOG } from "./healthExerciseCatalog";

const LOCATIONS = ["Gym", "Home", "Outside"];
const DURATIONS = [15, 30, 45, 60];
const TARGETS = [
  ["recommended", "Coach Pick"],
  ["hiit", "Quick HIIT"],
  ["core", "Abs / Core"],
  ["push", "Push"],
  ["pull", "Pull"],
  ["legs", "Legs"],
  ["cardio", "Cardio"],
  ["mobility", "Mobility"],
];

const HOME_EQUIPMENT = [
  ["bodyweight", "Floor / Bodyweight"],
  ["bands", "Resistance Bands"],
  ["dumbbells", "Dumbbells"],
  ["kettlebell", "Kettlebell"],
  ["bench", "Bench"],
  ["barbell", "Barbell + Rack"],
  ["cardio", "Cardio Machine"],
];

const MOBILITY_FOCUS = [
  ["full-body", "Full Body"],
  ["shoulders-chest", "Shoulders + Chest"],
  ["upper-back", "Upper Back"],
  ["core-back", "Core + Lower Back"],
  ["hips", "Hips"],
  ["hamstrings", "Hamstrings"],
  ["quads-knees", "Quads + Knees"],
  ["ankles-calves", "Ankles + Calves"],
  ["yoga", "Recovery Yoga"],
  ["dynamic", "Dynamic Warm-Up"],
  ["cooldown", "Cooldown"],
];

const HOME_EXERCISE_POOL = [
  {
    id: "air-squat",
    name: "Air Squat",
    target: "legs",
    equipment_key: "bodyweight",
    sets: "4",
    reps: "12-20",
    primary_muscles: ["Quads", "Glutes"],
    movement_pattern: "Squat",
    equipment: "Bodyweight",
    location: "Home or anywhere",
  },
  {
    id: "reverse-lunge",
    name: "Reverse Lunge",
    target: "legs",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "8-12 each",
    primary_muscles: ["Quads", "Glutes"],
    movement_pattern: "Lunge",
    equipment: "Bodyweight",
    location: "Home or anywhere",
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    target: "legs",
    equipment_key: "bodyweight",
    sets: "4",
    reps: "12-20",
    primary_muscles: ["Glutes", "Hamstrings"],
    movement_pattern: "Hip extension",
    equipment: "Floor",
    location: "Home or anywhere",
  },
  {
    id: "single-leg-glute-bridge",
    name: "Single-Leg Glute Bridge",
    target: "legs",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "8-12 each",
    primary_muscles: ["Glutes", "Hamstrings"],
    movement_pattern: "Single-leg hip extension",
    equipment: "Floor",
    location: "Home or anywhere",
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    target: "legs",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "30-60 sec",
    primary_muscles: ["Quads", "Glutes"],
    movement_pattern: "Isometric squat",
    equipment: "Wall",
    location: "Home",
  },
  {
    id: "standing-calf-raise",
    name: "Standing Calf Raise",
    target: "legs",
    equipment_key: "bodyweight",
    sets: "4",
    reps: "15-25",
    primary_muscles: ["Calves"],
    movement_pattern: "Calf raise",
    equipment: "Bodyweight",
    location: "Home or anywhere",
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    target: "legs",
    equipment_key: "kettlebell",
    sets: "4",
    reps: "8-15",
    primary_muscles: ["Quads", "Glutes"],
    movement_pattern: "Squat",
    equipment: "Kettlebell",
    location: "Home",
  },
  {
    id: "kettlebell-rdl",
    name: "Kettlebell Romanian Deadlift",
    target: "legs",
    equipment_key: "kettlebell",
    sets: "4",
    reps: "8-15",
    primary_muscles: ["Hamstrings", "Glutes"],
    movement_pattern: "Hip hinge",
    equipment: "Kettlebell",
    location: "Home",
  },
  {
    id: "dumbbell-goblet-squat",
    name: "Dumbbell Goblet Squat",
    target: "legs",
    equipment_key: "dumbbells",
    sets: "4",
    reps: "8-15",
    primary_muscles: ["Quads", "Glutes"],
    movement_pattern: "Squat",
    equipment: "Dumbbell",
    location: "Home",
  },
  {
    id: "dumbbell-rdl",
    name: "Dumbbell Romanian Deadlift",
    target: "legs",
    equipment_key: "dumbbells",
    sets: "4",
    reps: "8-15",
    primary_muscles: ["Hamstrings", "Glutes"],
    movement_pattern: "Hip hinge",
    equipment: "Dumbbells",
    location: "Home",
  },
  {
    id: "barbell-back-squat",
    name: "Barbell Back Squat",
    target: "legs",
    equipment_key: "barbell",
    sets: "4",
    reps: "5-10",
    primary_muscles: ["Quads", "Glutes"],
    movement_pattern: "Squat",
    equipment: "Barbell and rack",
    location: "Home gym",
  },
  {
    id: "push-up-home",
    name: "Push-Up",
    target: "push",
    equipment_key: "bodyweight",
    sets: "4",
    reps: "8-20",
    primary_muscles: ["Chest", "Triceps"],
    movement_pattern: "Horizontal press",
    equipment: "Bodyweight",
    location: "Home or anywhere",
  },
  {
    id: "pike-push-up",
    name: "Pike Push-Up",
    target: "push",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "6-15",
    primary_muscles: ["Shoulders", "Triceps"],
    movement_pattern: "Vertical press",
    equipment: "Bodyweight",
    location: "Home or anywhere",
  },
  {
    id: "floor-press",
    name: "Dumbbell Floor Press",
    target: "push",
    equipment_key: "dumbbells",
    sets: "4",
    reps: "8-15",
    primary_muscles: ["Chest", "Triceps"],
    movement_pattern: "Horizontal press",
    equipment: "Dumbbells and floor",
    location: "Home",
  },
  {
    id: "band-chest-press",
    name: "Band Chest Press",
    target: "push",
    equipment_key: "bands",
    sets: "3",
    reps: "12-20",
    primary_muscles: ["Chest", "Triceps"],
    movement_pattern: "Horizontal press",
    equipment: "Resistance band",
    location: "Home",
  },
  {
    id: "towel-row",
    name: "Towel Isometric Row",
    target: "pull",
    equipment_key: "bodyweight",
    sets: "4",
    reps: "20-30 sec",
    primary_muscles: ["Back", "Biceps"],
    movement_pattern: "Isometric pull",
    equipment: "Towel",
    location: "Home",
  },
  {
    id: "prone-y-raise",
    name: "Prone Y Raise",
    target: "pull",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "10-15",
    primary_muscles: ["Upper Back", "Rear Shoulders"],
    movement_pattern: "Scapular control",
    equipment: "Floor",
    location: "Home or anywhere",
  },
  {
    id: "band-row",
    name: "Resistance Band Row",
    target: "pull",
    equipment_key: "bands",
    sets: "4",
    reps: "10-20",
    primary_muscles: ["Back", "Lats"],
    movement_pattern: "Horizontal pull",
    equipment: "Resistance band",
    location: "Home",
  },
  {
    id: "band-pulldown",
    name: "Resistance Band Pulldown",
    target: "pull",
    equipment_key: "bands",
    sets: "4",
    reps: "10-20",
    primary_muscles: ["Lats", "Upper Back"],
    movement_pattern: "Vertical pull",
    equipment: "Resistance band",
    location: "Home",
  },
  {
    id: "one-arm-dumbbell-row-home",
    name: "One-Arm Dumbbell Row",
    target: "pull",
    equipment_key: "dumbbells",
    sets: "4",
    reps: "8-15 each",
    primary_muscles: ["Lats", "Mid Back"],
    movement_pattern: "Horizontal pull",
    equipment: "Dumbbell",
    location: "Home",
  },
  {
    id: "dead-bug",
    name: "Dead Bug",
    target: "core",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "8-12 each",
    primary_muscles: ["Core"],
    movement_pattern: "Anti-extension",
    equipment: "Floor",
    location: "Home or anywhere",
  },
  {
    id: "front-plank",
    name: "Front Plank",
    target: "core",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "30-60 sec",
    primary_muscles: ["Core"],
    movement_pattern: "Anti-extension",
    equipment: "Floor",
    location: "Home or anywhere",
  },
  {
    id: "side-plank",
    name: "Side Plank",
    target: "core",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "20-45 sec each",
    primary_muscles: ["Obliques", "Core"],
    movement_pattern: "Anti-lateral flexion",
    equipment: "Floor",
    location: "Home or anywhere",
  },
  {
    id: "bird-dog",
    name: "Bird Dog",
    target: "core",
    equipment_key: "bodyweight",
    sets: "3",
    reps: "8-12 each",
    primary_muscles: ["Core", "Lower Back"],
    movement_pattern: "Spinal stability",
    equipment: "Floor",
    location: "Home or anywhere",
  },
  {
    id: "band-pallof-press",
    name: "Band Pallof Press",
    target: "core",
    equipment_key: "bands",
    sets: "3",
    reps: "10-15 each",
    primary_muscles: ["Core", "Obliques"],
    movement_pattern: "Anti-rotation",
    equipment: "Resistance band",
    location: "Home",
  },
];

const MOBILITY_POOL = [
  ["cat-cow", "Cat-Cow", "core-back", "bodyweight"],
  ["child-pose-reach", "Child's Pose Reach", "upper-back", "bodyweight"],
  ["thread-needle", "Thread the Needle", "upper-back", "bodyweight"],
  ["wall-slide", "Wall Slides", "shoulders-chest", "bodyweight"],
  ["floor-angel", "Floor Angels", "shoulders-chest", "bodyweight"],
  ["doorway-chest-stretch", "Doorway Chest Stretch", "shoulders-chest", "bodyweight"],
  ["scapular-push-up", "Scapular Push-Up", "shoulders-chest", "bodyweight"],
  ["dead-bug-mobility", "Dead Bug", "core-back", "bodyweight"],
  ["bird-dog-mobility", "Bird Dog", "core-back", "bodyweight"],
  ["cobra-child-flow", "Cobra to Child's Pose Flow", "core-back", "bodyweight"],
  ["ninety-ninety", "90/90 Hip Switch", "hips", "bodyweight"],
  ["hip-flexor-stretch", "Half-Kneeling Hip Flexor Stretch", "hips", "bodyweight"],
  ["adductor-rockback", "Adductor Rock-Back", "hips", "bodyweight"],
  ["pigeon-variation", "Pigeon Stretch Variation", "hips", "bodyweight"],
  ["hamstring-sweep", "Dynamic Hamstring Sweep", "hamstrings", "bodyweight"],
  ["supine-hamstring", "Supine Hamstring Stretch", "hamstrings", "bodyweight"],
  ["quad-rockback", "Quad Rock-Back", "quads-knees", "bodyweight"],
  ["couch-stretch", "Couch Stretch", "quads-knees", "bodyweight"],
  ["knee-over-toe-rock", "Knee-Over-Toe Rock", "ankles-calves", "bodyweight"],
  ["calf-wall-stretch", "Wall Calf Stretch", "ankles-calves", "bodyweight"],
  ["deep-squat-hold", "Deep Squat Hold", "full-body", "bodyweight"],
  ["world-greatest-stretch", "World's Greatest Stretch", "full-body", "bodyweight"],
  ["down-dog-flow", "Downward Dog Flow", "yoga", "bodyweight"],
  ["sun-salutation", "Sun Salutation", "yoga", "bodyweight"],
  ["walking-lunge-reach", "Walking Lunge with Reach", "dynamic", "bodyweight"],
  ["inchworm", "Inchworm", "dynamic", "bodyweight"],
  ["standing-forward-fold", "Standing Forward Fold", "cooldown", "bodyweight"],
  ["supine-twist", "Supine Spinal Twist", "cooldown", "bodyweight"],
  ["band-pull-apart-mobility", "Band Pull-Apart", "shoulders-chest", "bands"],
  ["band-lat-stretch", "Band-Assisted Lat Stretch", "upper-back", "bands"],
].map(([id, name, focus, equipment_key]) => ({
  id,
  name,
  target: "mobility",
  mobility_focus: focus,
  equipment_key,
  sets: "2",
  reps:
    focus === "dynamic"
      ? "8-12 each"
      : "30-45 sec",
  primary_muscles: ["Mobility"],
  movement_pattern: "Mobility",
  equipment:
    equipment_key === "bands"
      ? "Resistance band"
      : "Bodyweight",
  location: "Home or anywhere",
}));

function baseMode(target) {
  if (target === "hiit" || target === "cardio") {
    return "cardio";
  }

  if (target === "mobility") {
    return "mobility";
  }

  return target === "recommended"
    ? "recommended"
    : "strength";
}

function exerciseText(exercise) {
  return [
    exercise?.name,
    exercise?.category,
    exercise?.movement_pattern,
    exercise?.training_tag,
    exercise?.equipment,
    exercise?.location,
    ...(exercise?.primary_muscles || []),
    ...(exercise?.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const TARGET_PATTERNS = {
  push:
    /chest|pector|tricep|shoulder|front delt|side delt|horizontal press|vertical press|push-up|chest fly/,
  pull:
    /lat|back|rhomboid|trap|rear shoulder|rear delt|bicep|vertical pull|horizontal pull|row|pulldown|pull-up|curl/,
  legs:
    /quad|hamstring|glute|calf|adductor|abductor|leg|squat|lunge|hinge|deadlift|step-up|lower body/,
  core:
    /core|abdom|abs|oblique|plank|crunch|rotation|anti-rotation|leg raise|dead bug|bird dog|mountain climber/,
  hiit:
    /hiit|interval|burpee|jump|sprint|mountain climber|high knees|jumping jack|skater|battle rope/,
  cardio:
    /cardio|walk|run|treadmill|bike|cycling|elliptical|rower|stair|swim/,
  mobility:
    /mobility|stretch|recovery|warm-up|range of motion|foam roll|yoga/,
};

function matchesTarget(exercise, target) {
  if (target === "recommended") return true;
  return TARGET_PATTERNS[target]?.test(exerciseText(exercise)) || false;
}

function locationAllowed(exercise, location) {
  if (location === "Gym") return true;

  const value = exerciseText(exercise);
  const exerciseLocation = String(
    exercise?.location || ""
  ).toLowerCase();

  if (location === "Home") {
    if (/gym only/.test(exerciseLocation)) return false;

    return !/machine|cable station|smith machine|pec deck|leg press|lat pulldown station|row station/.test(
      value
    );
  }

  return /anywhere|outside|outdoor|bodyweight|band|run|walk|sprint|jump|plank|push-up|lunge|squat|mobility|stretch/.test(
    value
  );
}

function uniqueById(exercises) {
  const used = new Set();

  return exercises.filter((exercise) => {
    const key =
      exercise?.id ||
      exercise?.slug ||
      exercise?.name;

    if (!key || used.has(key)) return false;
    used.add(key);
    return true;
  });
}

function equipmentAllowed(exercise, equipment = []) {
  const available = new Set(
    equipment.length ? equipment : ["bodyweight"]
  );

  const key = exercise?.equipment_key;
  if (!key || key === "bodyweight") return true;
  return available.has(key);
}

function buildHomeTargetPool(
  target,
  equipment,
  mobilityFocus
) {
  if (target === "mobility") {
    const selectedFocus =
      mobilityFocus === "full-body"
        ? [
            "full-body",
            "shoulders-chest",
            "upper-back",
            "core-back",
            "hips",
            "hamstrings",
            "quads-knees",
            "ankles-calves",
          ]
        : [mobilityFocus];

    return uniqueById(
      MOBILITY_POOL.filter(
        (exercise) =>
          selectedFocus.includes(exercise.mobility_focus) &&
          equipmentAllowed(exercise, equipment)
      )
    );
  }

  return uniqueById(
    HOME_EXERCISE_POOL.filter(
      (exercise) =>
        exercise.target === target &&
        equipmentAllowed(exercise, equipment)
    )
  );
}

function buildStrictTargetPool(
  target,
  location,
  equipment,
  mobilityFocus
) {
  if (location === "Home") {
    return buildHomeTargetPool(
      target,
      equipment,
      mobilityFocus
    );
  }

  if (target === "mobility") {
    const selectedFocus =
      mobilityFocus === "full-body"
        ? null
        : mobilityFocus;

    return uniqueById(
      MOBILITY_POOL.filter(
        (exercise) =>
          (!selectedFocus ||
            exercise.mobility_focus === selectedFocus) &&
          (
            location !== "Outside" ||
            exercise.equipment_key === "bodyweight"
          )
      )
    );
  }

  return uniqueById(
    HEALTH_EXERCISE_CATALOG.filter(
      (exercise) =>
        locationAllowed(exercise, location) &&
        matchesTarget(exercise, target)
    )
  );
}

function trimForDuration(exercises, duration) {
  const limits = {
    15: 4,
    30: 6,
    45: 8,
    60: 10,
  };

  return exercises.slice(0, limits[duration] || 6);
}

export default function PlanTodayWorkoutDrawer({
  open,
  onClose,
  profile,
  snapshot,
  history,
  onPlan,
  onStart,
  onOpenFullStudio,
}) {
  const [location, setLocation] = useState(
    snapshot?.training_location ||
      profile?.training_location ||
      "Gym"
  );
  const [duration, setDuration] = useState(30);
  const [target, setTarget] = useState("recommended");
  const [homeEquipment, setHomeEquipment] = useState(
    Array.isArray(snapshot?.home_equipment) &&
      snapshot.home_equipment.length
      ? snapshot.home_equipment
      : ["bodyweight"]
  );
  const [mobilityFocus, setMobilityFocus] =
    useState("full-body");
  const [allowSoreOverride, setAllowSoreOverride] =
    useState(false);

  function toggleEquipment(value) {
    setHomeEquipment((previous) => {
      const current = Array.isArray(previous)
        ? previous
        : [];

      if (value === "bodyweight") {
        return current.includes(value)
          ? current.filter((item) => item !== value)
          : [value, ...current];
      }

      return current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
    });
  }

  const plan = useMemo(() => {
    const generated = buildAdaptiveWorkout({
      history,
      snapshot: {
        ...snapshot,
        allow_sore_muscle_override:
          allowSoreOverride,
      },
      profile,
      mode: baseMode(target),
    });

    const generatedExercises = Array.isArray(
      generated?.exercises
    )
      ? generated.exercises
      : [];

    const selected =
      target === "recommended"
        ? uniqueById(
            generatedExercises.filter((exercise) =>
              locationAllowed(exercise, location)
            )
          )
        : buildStrictTargetPool(
            target,
            location,
            homeEquipment,
            mobilityFocus
          );

    const finalExercises =
      selected.length > 0
        ? selected
        : target === "recommended"
        ? generatedExercises
        : [];

    return {
      ...generated,
      title:
        target === "recommended"
          ? generated?.title
          : `${
              TARGETS.find(([value]) => value === target)?.[1] ||
              "Workout"
            } - ${duration} min`,
      exercises: trimForDuration(finalExercises, duration),
      requested_location: location,
      requested_duration_minutes: duration,
      requested_focus: target,
      requested_home_equipment:
        location === "Home"
          ? homeEquipment
          : [],
      requested_mobility_focus:
        target === "mobility"
          ? mobilityFocus
          : "",
    };
  }, [
    history,
    snapshot,
    profile,
    location,
    duration,
    target,
    homeEquipment,
    mobilityFocus,
    allowSoreOverride,
  ]);

  if (!open) return null;

  const soreAreas = plan?.avoided_sore_areas || [];

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 p-3 backdrop-blur-md sm:items-center">
      <button
        type="button"
        aria-label="Close plan today"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[151] flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#07111f] shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                Plan With Coach
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                What fits today?
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Pick where you are, how much time you have,
                and what you want to train.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Location
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LOCATIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLocation(item)}
                  className={`h-11 rounded-2xl border text-xs font-black ${
                    location === item
                      ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {location === "Home" ? (
            <div className="mt-4 rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                What equipment do you have?
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Select everything available. Floor/bodyweight
                movements remain available unless removed.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {HOME_EQUIPMENT.map(([value, label]) => {
                  const active =
                    homeEquipment.includes(value);

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        toggleEquipment(value)
                      }
                      className={`min-h-11 rounded-2xl border px-3 py-2 text-xs font-black ${
                        active
                          ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.035] text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Time available
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DURATIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDuration(item)}
                  className={`h-11 rounded-2xl border text-xs font-black ${
                    duration === item
                      ? "border-lime-300/30 bg-lime-300/15 text-lime-100"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {item}m
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Workout focus
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TARGETS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={`min-h-12 rounded-2xl border px-3 py-2 text-xs font-black ${
                    target === value
                      ? "border-fuchsia-300/30 bg-fuchsia-300/15 text-fuchsia-100"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {target === "mobility" ? (
            <div className="mt-4 rounded-[1.5rem] border border-fuchsia-300/15 bg-fuchsia-300/[0.04] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
                Mobility focus
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MOBILITY_FOCUS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setMobilityFocus(value)
                    }
                    className={`min-h-11 rounded-2xl border px-3 py-2 text-xs font-black ${
                      mobilityFocus === value
                        ? "border-fuchsia-300/30 bg-fuchsia-300/15 text-fuchsia-100"
                        : "border-white/10 bg-white/[0.035] text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-[1.5rem] border border-lime-300/20 bg-lime-300/[0.07] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-200">
              Coach Recommendation
            </div>
            <div className="mt-1 text-xl font-black text-white">
              {plan?.title || "Adaptive workout"}
            </div>
            <div className="mt-1 text-xs font-bold text-cyan-100">
              {location} | {duration} minutes
              {location === "Home" && homeEquipment.length
                ? ` | ${homeEquipment
                    .map(
                      (item) =>
                        HOME_EQUIPMENT.find(
                          ([value]) => value === item
                        )?.[1] || item
                    )
                    .join(", ")}`
                : ""}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              {plan?.reason ||
                "Built from your recent training balance."}
            </div>

            {soreAreas.length ? (
              <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                Avoiding sore areas: {soreAreas.join(", ")}.
              </div>
            ) : null}

            {!(plan?.exercises || []).length ? (
              <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                No matching exercises are available for this
                location yet. Choose another location or use
                Advanced Builder.
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {(plan?.exercises || []).map(
                (exercise, index) => (
                  <div
                    key={
                      exercise.id ||
                      `${exercise.name}-${index}`
                    }
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">
                        {exercise.name}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {exercise.planned_sets ||
                          exercise.sets ||
                          "3"}{" "}
                        sets |{" "}
                        {exercise.planned_reps ||
                          exercise.reps ||
                          "8-12"}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {soreAreas.length ? (
            <label className="mt-3 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <input
                type="checkbox"
                checked={allowSoreOverride}
                onChange={(event) =>
                  setAllowSoreOverride(
                    event.target.checked
                  )
                }
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-black text-white">
                  Let me train sore areas anyway
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  This overrides the coach protection filter.
                </span>
              </span>
            </label>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-cyan-300/15 bg-[#07111f]/98 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPlan?.(plan)}
              disabled={!(plan?.exercises || []).length}
              className="h-12 rounded-2xl border border-cyan-300/30 bg-cyan-300/15 text-sm font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add for Later
            </button>
            <button
              type="button"
              onClick={() => onStart?.(plan)}
              disabled={!(plan?.exercises || []).length}
              className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onOpenFullStudio}
              className="col-span-2 h-10 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
            >
              Advanced Builder
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

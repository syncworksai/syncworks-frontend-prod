// src/components/customer-health/healthExerciseCatalog.js

import { HEALTH_EXERCISE_CATALOG_EXPANSION } from "./healthExerciseCatalogExpansion";

export const EXERCISE_LIBRARY_KPI_KEY =
  "sw_health_exercise_library_kpis_v1";
export const EXERCISE_FAVORITES_KEY =
  "sw_health_exercise_favorites_v1";

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeExercise(data) {
  const slug = data.slug || slugify(data.name);

  return {
    id: slug,
    slug,
    image: `/health/exercises/${slug}/${slug}-hero.png`,
    primary_muscles: [],
    secondary_muscles: [],
    equipment: "Bodyweight",
    location: "Anywhere",
    difficulty: "Intermediate",
    movement_pattern: "",
    category: "Strength",
    sets: "3",
    reps: "8-12",
    rest: "60-90 sec",
    feel: "",
    instructions: [],
    mistakes: [],
    safety: "",
    alternatives: [],
    variations: [],
    ...data,
  };
}

export const HEALTH_EXERCISE_CATALOG = [
  makeExercise({
    name: "Barbell Bench Press",
    primary_muscles: ["Chest"],
    secondary_muscles: ["Triceps", "Front shoulders"],
    equipment: "Barbell and bench",
    location: "Gym",
    movement_pattern: "Horizontal press",
    sets: "4",
    reps: "6-10",
    rest: "90-150 sec",
    feel: "Chest driving the bar while the upper back stays tight.",
    instructions: [
      "Plant your feet and pull your shoulder blades back and down.",
      "Lower the bar under control toward the lower chest.",
      "Press up while keeping wrists stacked over elbows.",
    ],
    mistakes: ["Elbows flaring too wide", "Bouncing the bar", "Losing upper-back tension"],
    safety: "Use a spotter or safety arms for challenging sets.",
    alternatives: ["dumbbell-bench-press", "machine-chest-press", "push-up"],
    variations: ["close-grip-bench-press", "incline-dumbbell-press", "decline-dumbbell-press"],
  }),
  makeExercise({
    name: "Dumbbell Bench Press",
    primary_muscles: ["Chest"],
    secondary_muscles: ["Triceps", "Front shoulders"],
    equipment: "Dumbbells and bench",
    location: "Gym",
    movement_pattern: "Horizontal press",
    sets: "3",
    reps: "8-12",
    rest: "75-120 sec",
    feel: "Chest stretch at the bottom and a strong press without shoulder pain.",
    instructions: [
      "Set the shoulder blades against the bench.",
      "Lower the dumbbells beside the chest with control.",
      "Press up and slightly inward without crashing the dumbbells together.",
    ],
    mistakes: ["Dropping too deep", "Wrists bending back", "Shoulders rolling forward"],
    safety: "Choose a range of motion that keeps the shoulders comfortable.",
    alternatives: ["barbell-bench-press", "machine-chest-press", "push-up"],
    variations: ["incline-dumbbell-press", "decline-dumbbell-press", "neutral-grip-dumbbell-press"],
  }),
  makeExercise({
    name: "Incline Dumbbell Press",
    primary_muscles: ["Upper chest"],
    secondary_muscles: ["Triceps", "Front shoulders"],
    equipment: "Dumbbells and incline bench",
    location: "Gym",
    movement_pattern: "Incline press",
    sets: "3",
    reps: "8-12",
    feel: "Upper chest pressing while the shoulders stay packed.",
    instructions: ["Set the bench to a moderate incline.", "Lower with elbows slightly tucked.", "Press up over the upper chest."],
    mistakes: ["Bench angle too steep", "Shrugging", "Using momentum"],
    alternatives: ["machine-incline-press", "low-to-high-cable-fly", "feet-elevated-push-up"],
    variations: ["incline-barbell-press", "neutral-grip-incline-press"],
  }),
  makeExercise({
    name: "Decline Dumbbell Press",
    primary_muscles: ["Lower chest"],
    secondary_muscles: ["Triceps"],
    equipment: "Dumbbells and decline bench",
    location: "Gym",
    movement_pattern: "Decline press",
    sets: "3",
    reps: "8-12",
    feel: "Lower chest driving the dumbbells with stable shoulders.",
    instructions: ["Secure the legs.", "Lower dumbbells toward the lower chest.", "Press without locking out aggressively."],
    mistakes: ["Unstable setup", "Rushing the descent", "Overextending the shoulders"],
    alternatives: ["chest-dip", "machine-chest-press", "decline-push-up"],
    variations: ["decline-barbell-press"],
  }),
  makeExercise({
    name: "Machine Chest Press",
    primary_muscles: ["Chest"],
    secondary_muscles: ["Triceps", "Front shoulders"],
    equipment: "Chest press machine",
    location: "Gym",
    movement_pattern: "Horizontal press",
    sets: "3",
    reps: "8-15",
    feel: "Chest working through a controlled path with less stabilization demand.",
    instructions: ["Adjust the seat so handles align with mid chest.", "Keep shoulder blades back.", "Press without letting the shoulders roll forward."],
    mistakes: ["Seat too low or high", "Partial reps", "Slamming the stack"],
    alternatives: ["dumbbell-bench-press", "barbell-bench-press", "push-up"],
    variations: ["single-arm-machine-press"],
  }),
  makeExercise({
    name: "Cable Chest Fly",
    primary_muscles: ["Chest"],
    secondary_muscles: ["Front shoulders"],
    equipment: "Cable station",
    location: "Gym",
    movement_pattern: "Chest isolation",
    sets: "3",
    reps: "10-15",
    rest: "45-75 sec",
    feel: "Chest bringing the arms together while the elbows stay softly bent.",
    instructions: ["Set the pulleys near shoulder height.", "Step forward into a stable stance.", "Bring hands together in a wide hugging arc."],
    mistakes: ["Turning it into a press", "Overstretching", "Using body momentum"],
    safety: "Keep the shoulder in a pain-free range.",
    alternatives: ["machine-fly", "dumbbell-fly", "band-chest-fly"],
    variations: ["low-to-high-cable-fly", "high-to-low-cable-fly", "single-arm-cable-fly"],
  }),
  makeExercise({
    name: "Machine Fly",
    primary_muscles: ["Chest"],
    secondary_muscles: ["Front shoulders"],
    equipment: "Pec deck machine",
    location: "Gym",
    movement_pattern: "Chest isolation",
    sets: "3",
    reps: "10-15",
    feel: "Chest squeezing the arms together with a stable torso.",
    instructions: ["Adjust the seat to align elbows with the chest.", "Keep the back against the pad.", "Close under control and pause briefly."],
    mistakes: ["Shoulders rolling forward", "Stack slamming", "Excessive stretch"],
    alternatives: ["cable-chest-fly", "dumbbell-fly", "band-chest-fly"],
    variations: ["single-arm-machine-fly"],
  }),
  makeExercise({
    name: "Push-Up",
    primary_muscles: ["Chest"],
    secondary_muscles: ["Triceps", "Shoulders", "Core"],
    equipment: "Bodyweight",
    location: "Anywhere",
    movement_pattern: "Horizontal press",
    sets: "3",
    reps: "8-20",
    feel: "Chest and triceps pressing while the body stays rigid.",
    instructions: ["Brace the core and glutes.", "Lower the chest between the hands.", "Press the floor away."],
    mistakes: ["Hips sagging", "Elbows flaring", "Short range"],
    alternatives: ["incline-push-up", "dumbbell-bench-press", "machine-chest-press"],
    variations: ["incline-push-up", "decline-push-up", "close-grip-push-up"],
  }),
  makeExercise({
    name: "Lat Pulldown",
    primary_muscles: ["Lats"],
    secondary_muscles: ["Biceps", "Upper back"],
    equipment: "Cable machine",
    location: "Gym",
    movement_pattern: "Vertical pull",
    sets: "3",
    reps: "8-12",
    feel: "Elbows driving down toward the ribs and lats shortening.",
    instructions: ["Sit tall with thighs secured.", "Pull elbows down without excessive lean.", "Return slowly to a full stretch."],
    mistakes: ["Pulling behind the neck", "Using momentum", "Shrugging"],
    alternatives: ["assisted-pull-up", "band-pulldown", "single-arm-lat-pulldown"],
    variations: ["wide-grip-lat-pulldown", "neutral-grip-lat-pulldown", "underhand-lat-pulldown"],
  }),
  makeExercise({
    name: "Seated Cable Row",
    primary_muscles: ["Mid back"],
    secondary_muscles: ["Lats", "Biceps", "Rear shoulders"],
    equipment: "Cable row station",
    location: "Gym",
    movement_pattern: "Horizontal pull",
    sets: "3",
    reps: "8-12",
    feel: "Shoulder blades moving back and elbows pulling past the torso.",
    instructions: ["Sit tall with a neutral spine.", "Row toward the lower ribs.", "Control the reach forward."],
    mistakes: ["Rocking the torso", "Shrugging", "Curling more than rowing"],
    alternatives: ["chest-supported-row", "one-arm-dumbbell-row", "band-row"],
    variations: ["wide-grip-cable-row", "neutral-grip-cable-row", "single-arm-cable-row"],
  }),
  makeExercise({
    name: "One Arm Dumbbell Row",
    primary_muscles: ["Lats", "Mid back"],
    secondary_muscles: ["Biceps", "Rear shoulders"],
    equipment: "Dumbbell and bench",
    location: "Gym or home",
    movement_pattern: "Horizontal pull",
    sets: "3",
    reps: "8-12 each",
    feel: "Lat pulling the elbow toward the hip.",
    instructions: ["Brace one hand on a bench.", "Keep hips square.", "Row the elbow toward the back pocket."],
    mistakes: ["Twisting", "Shrugging", "Pulling only with the arm"],
    alternatives: ["seated-cable-row", "chest-supported-row", "band-row"],
    variations: ["meadows-row"],
  }),
  makeExercise({
    name: "Shoulder Press",
    primary_muscles: ["Shoulders"],
    secondary_muscles: ["Triceps"],
    equipment: "Dumbbells",
    location: "Gym or home",
    movement_pattern: "Vertical press",
    sets: "3",
    reps: "8-12",
    feel: "Shoulders pressing overhead while ribs stay controlled.",
    instructions: ["Brace the core.", "Start with forearms vertical.", "Press overhead without leaning back."],
    mistakes: ["Excessive back arch", "Elbows drifting behind", "Forcing painful range"],
    alternatives: ["machine-shoulder-press", "landmine-press", "pike-push-up"],
    variations: ["arnold-press", "single-arm-shoulder-press"],
  }),
  makeExercise({
    name: "Lateral Raise",
    primary_muscles: ["Side shoulders"],
    secondary_muscles: [],
    equipment: "Dumbbells",
    location: "Gym or home",
    movement_pattern: "Shoulder isolation",
    sets: "3",
    reps: "12-20",
    rest: "45-60 sec",
    feel: "Side delts lifting the arms away from the body.",
    instructions: ["Keep a soft elbow bend.", "Lift slightly forward of the body.", "Stop near shoulder height."],
    mistakes: ["Shrugging", "Swinging", "Going too heavy"],
    alternatives: ["cable-lateral-raise", "machine-lateral-raise"],
    variations: ["lean-away-lateral-raise", "partial-lateral-raise"],
  }),
  makeExercise({
    name: "Rope Triceps Pushdown",
    primary_muscles: ["Triceps"],
    secondary_muscles: [],
    equipment: "Cable station and rope",
    location: "Gym",
    movement_pattern: "Elbow extension",
    sets: "3",
    reps: "10-15",
    feel: "Triceps straightening the elbow while upper arms stay still.",
    instructions: ["Pin elbows near the ribs.", "Extend fully without moving the shoulders.", "Separate the rope at the bottom."],
    mistakes: ["Elbows drifting", "Leaning over excessively", "Using body momentum"],
    alternatives: ["straight-bar-pushdown", "band-pushdown", "close-grip-push-up"],
    variations: ["reverse-grip-pushdown", "single-arm-pushdown", "overhead-rope-extension"],
  }),
  makeExercise({
    name: "Overhead Triceps Extension",
    primary_muscles: ["Triceps"],
    secondary_muscles: [],
    equipment: "Cable or dumbbell",
    location: "Gym or home",
    movement_pattern: "Elbow extension",
    sets: "3",
    reps: "10-15",
    feel: "Long head of the triceps working in a stretched position.",
    instructions: ["Keep ribs down.", "Point elbows forward.", "Extend without letting elbows flare."],
    mistakes: ["Back arching", "Elbows spreading", "Going too heavy"],
    alternatives: ["rope-triceps-pushdown", "skull-crusher", "band-overhead-extension"],
    variations: ["single-arm-overhead-extension"],
  }),
  makeExercise({
    name: "Dumbbell Biceps Curl",
    primary_muscles: ["Biceps"],
    secondary_muscles: ["Forearms"],
    equipment: "Dumbbells",
    location: "Gym or home",
    movement_pattern: "Elbow flexion",
    sets: "3",
    reps: "8-15",
    feel: "Biceps curling without the shoulder moving forward.",
    instructions: ["Keep elbows near the sides.", "Curl through a full comfortable range.", "Lower slowly."],
    mistakes: ["Swinging", "Elbows drifting forward", "Dropping the weight"],
    alternatives: ["cable-curl", "machine-curl", "band-curl"],
    variations: ["hammer-curl", "incline-dumbbell-curl", "preacher-curl"],
  }),
  makeExercise({
    name: "Barbell Back Squat",
    primary_muscles: ["Quads", "Glutes"],
    secondary_muscles: ["Hamstrings", "Core"],
    equipment: "Barbell and rack",
    location: "Gym",
    movement_pattern: "Squat",
    sets: "4",
    reps: "5-10",
    rest: "120-180 sec",
    feel: "Quads and glutes driving up while the torso stays braced.",
    instructions: ["Brace before descending.", "Track knees with toes.", "Drive through the whole foot."],
    mistakes: ["Knees collapsing inward", "Losing brace", "Rushing depth"],
    safety: "Use safety arms and a load appropriate for your mobility.",
    alternatives: ["goblet-squat", "leg-press", "hack-squat"],
    variations: ["front-squat", "box-squat", "tempo-squat"],
  }),
  makeExercise({
    name: "Leg Press",
    primary_muscles: ["Quads", "Glutes"],
    secondary_muscles: ["Hamstrings"],
    equipment: "Leg press machine",
    location: "Gym",
    movement_pattern: "Squat",
    sets: "3",
    reps: "10-15",
    feel: "Quads and glutes pushing while the hips stay against the pad.",
    instructions: ["Place feet securely.", "Lower until the pelvis remains stable.", "Press without locking knees aggressively."],
    mistakes: ["Lower back rounding", "Knees collapsing", "Hands pushing on knees"],
    alternatives: ["hack-squat", "goblet-squat", "split-squat"],
    variations: ["single-leg-press", "high-foot-leg-press"],
  }),
  makeExercise({
    name: "Romanian Deadlift",
    primary_muscles: ["Hamstrings", "Glutes"],
    secondary_muscles: ["Back", "Core"],
    equipment: "Barbell or dumbbells",
    location: "Gym or home",
    movement_pattern: "Hinge",
    sets: "3",
    reps: "8-12",
    feel: "Hamstrings lengthening as hips travel backward, then glutes finishing the rep.",
    instructions: ["Soften the knees.", "Push hips back.", "Keep the weight close and stand by squeezing glutes."],
    mistakes: ["Squatting the movement", "Rounding the back", "Reaching the weight away"],
    alternatives: ["dumbbell-rdl", "cable-pull-through", "hip-thrust"],
    variations: ["single-leg-rdl", "b-stance-rdl"],
  }),
  makeExercise({
    name: "Hip Thrust",
    primary_muscles: ["Glutes"],
    secondary_muscles: ["Hamstrings"],
    equipment: "Bench and barbell or machine",
    location: "Gym",
    movement_pattern: "Hip extension",
    sets: "3",
    reps: "8-15",
    feel: "Glutes finishing hip extension without low-back strain.",
    instructions: ["Set shoulder blades on the bench.", "Tuck the chin slightly.", "Drive hips up and pause with ribs down."],
    mistakes: ["Hyperextending the back", "Feet too far away", "Rushing the top"],
    alternatives: ["glute-bridge", "cable-pull-through", "reverse-hyper"],
    variations: ["single-leg-hip-thrust", "banded-hip-thrust"],
  }),
  makeExercise({
    name: "Hip Flexor March",
    primary_muscles: ["Hip flexors"],
    secondary_muscles: ["Core"],
    equipment: "Band optional",
    location: "Anywhere",
    category: "Mobility and strength",
    movement_pattern: "Hip flexion",
    sets: "3",
    reps: "10-15 each",
    feel: "Front of the hip lifting the knee while the pelvis stays level.",
    instructions: ["Stand tall and brace lightly.", "Lift one knee without leaning back.", "Pause and lower with control."],
    mistakes: ["Leaning backward", "Pelvis rotating", "Rushing"],
    safety: "Stop if the movement causes pinching or sharp hip pain.",
    alternatives: ["dead-bug-march", "supported-knee-raise", "seated-hip-flexor-lift"],
    variations: ["banded-hip-flexor-march", "wall-supported-march"],
  }),
  makeExercise({
    name: "Kneeling Hip Flexor Stretch",
    primary_muscles: ["Hip flexors"],
    secondary_muscles: ["Quads"],
    equipment: "Mat",
    location: "Anywhere",
    category: "Mobility",
    movement_pattern: "Hip extension mobility",
    sets: "2",
    reps: "30-45 sec each",
    rest: "20 sec",
    feel: "Gentle stretch at the front of the rear hip.",
    instructions: ["Start in a half-kneeling stance.", "Tuck the pelvis slightly.", "Shift forward without arching the back."],
    mistakes: ["Overarching", "Pushing into pain", "Losing pelvic position"],
    safety: "Use a pad under the knee and keep the stretch gentle.",
    alternatives: ["couch-stretch", "standing-hip-flexor-stretch"],
    variations: ["rear-foot-elevated-hip-flexor-stretch"],
  }),
  makeExercise({
    name: "Plank",
    primary_muscles: ["Core"],
    secondary_muscles: ["Shoulders", "Glutes"],
    equipment: "Bodyweight",
    location: "Anywhere",
    movement_pattern: "Anti-extension",
    sets: "3",
    reps: "20-60 sec",
    feel: "Abs and glutes holding the ribs and pelvis in one line.",
    instructions: ["Set elbows below shoulders.", "Squeeze glutes.", "Breathe while holding a neutral body line."],
    mistakes: ["Hips sagging", "Holding breath", "Shrugging"],
    alternatives: ["dead-bug", "incline-plank", "pallof-press"],
    variations: ["side-plank", "long-lever-plank"],
  }),
];

const BY_ID = Object.fromEntries(
  HEALTH_EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise])
);

export function getExerciseById(id) {
  return BY_ID[id] || null;
}

export function resolveExerciseList(ids = []) {
  return ids.map(getExerciseById).filter(Boolean);
}

export function getExerciseAlternatives(exercise) {
  return resolveExerciseList(exercise?.alternatives || []);
}

export function getExerciseVariations(exercise) {
  return resolveExerciseList(exercise?.variations || []);
}

export function readExerciseFavorites() {
  try {
    const value = JSON.parse(
      localStorage.getItem(EXERCISE_FAVORITES_KEY) || "[]"
    );
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeExerciseFavorites(ids = []) {
  localStorage.setItem(
    EXERCISE_FAVORITES_KEY,
    JSON.stringify([...new Set(ids)])
  );
}

export function trackExerciseLibraryKpi(event, details = {}) {
  try {
    const current = JSON.parse(
      localStorage.getItem(EXERCISE_LIBRARY_KPI_KEY) || "[]"
    );
    const next = Array.isArray(current) ? current : [  ...HEALTH_EXERCISE_CATALOG_EXPANSION,
];

    next.push({
      id: `exercise-kpi-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
      type: "exercise_library_kpi",
      event,
      details,
      created_at: new Date().toISOString(),
    });

    localStorage.setItem(
      EXERCISE_LIBRARY_KPI_KEY,
      JSON.stringify(next.slice(-500))
    );
  } catch {
    // Keep the library usable if storage is unavailable.
  }
}

export function buildExerciseCoachSpeech(exercise) {
  if (!exercise) return "";

  return [
    exercise.name,
    exercise.feel,
    exercise.instructions?.[0],
    exercise.safety,
  ]
    .filter(Boolean)
    .join(". ");
}

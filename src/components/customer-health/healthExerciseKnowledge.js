// src/components/customer-health/healthExerciseKnowledge.js

const EXERCISE_ASSET_ROOT = "/health/exercises";

function slugify(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function youtubeSearchUrl(query = "") {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query
  )}`;
}

function createAssetPaths(slug) {
  return {
    hero_image: `${EXERCISE_ASSET_ROOT}/${slug}/${slug}-hero.png`,
    step_1_image: `${EXERCISE_ASSET_ROOT}/${slug}/${slug}-step-1.png`,
    step_2_image: `${EXERCISE_ASSET_ROOT}/${slug}/${slug}-step-2.png`,
    step_3_image: `${EXERCISE_ASSET_ROOT}/${slug}/${slug}-step-3.png`,
  };
}

function createExercise(config) {
  const slug = config.slug || slugify(config.name);

  return {
    slug,
    aliases: config.aliases || [],
    name: config.name,
    category: config.category || "Compound",
    training_tag: config.training_tag || "Strength",
    movement_pattern: config.movement_pattern || "General",
    primary_muscles: config.primary_muscles || [],
    secondary_muscles: config.secondary_muscles || [],
    short_cue: config.short_cue || "",
    feel_cue: config.feel_cue || "",
    correction_cue: config.correction_cue || "",
    coach_warning: config.coach_warning || "",
    pro_tip: config.pro_tip || "",
    form_focus: config.form_focus || [],
    steps: config.steps || [],
    demo_url:
      config.demo_url ||
      youtubeSearchUrl(`${config.name} proper form demonstration`),
    ...createAssetPaths(slug),
  };
}

export const EXERCISE_KNOWLEDGE = [
  createExercise({
    name: "Deadlift",
    aliases: ["barbell deadlift"],
    category: "Compound",
    training_tag: "Strength",
    movement_pattern: "Posterior Chain",
    primary_muscles: ["glutes", "hamstrings", "back", "core"],
    secondary_muscles: ["lats", "traps", "forearms", "quads"],
    short_cue:
      "Hinge at the hips, brace your core, keep the bar close, and squeeze your glutes at the top.",
    feel_cue:
      "You should mainly feel glutes, hamstrings, core tension, and a strong upper-back brace.",
    correction_cue:
      "If you mainly feel your lower back, reduce the weight and reset your hinge and brace.",
    coach_warning:
      "Do not yank the bar from the floor or round your spine.",
    pro_tip:
      "Push through the floor and keep the bar close to your body from start to finish.",
    form_focus: ["Neutral spine", "Core braced", "Bar close", "Glute lockout"],
    steps: [
      {
        title: "Setup",
        cue: "Feet hip-width apart, hands just outside legs, hinge at hips, chest tall.",
      },
      {
        title: "Drive",
        cue: "Push through heels, extend hips and knees together, keep the bar close.",
      },
      {
        title: "Lockout",
        cue: "Stand tall, hips through, squeeze glutes, and do not lean back.",
      },
    ],
  }),

  createExercise({
    name: "Bench Press",
    aliases: ["barbell bench press", "flat bench press"],
    category: "Compound",
    training_tag: "Strength",
    movement_pattern: "Upper Push",
    primary_muscles: ["chest", "triceps", "front delts"],
    secondary_muscles: ["upper back", "core"],
    short_cue:
      "Shoulders back and down, feet planted, lower with control, and press through the mid-hand.",
    feel_cue:
      "You should feel chest driving the press, triceps helping, and upper back staying tight.",
    correction_cue:
      "If your shoulders take over, lower the load and reset your shoulder position.",
    coach_warning:
      "Do not bounce the bar or let elbows flare excessively.",
    pro_tip:
      "Think about bending the bar and keeping your upper back pinned to the bench.",
    form_focus: ["Scapulas set", "Feet planted", "Control descent", "Press with chest"],
    steps: [
      {
        title: "Setup",
        cue: "Eyes under the bar, shoulder blades squeezed down, feet stable.",
      },
      {
        title: "Lower",
        cue: "Lower with control to the lower chest while keeping wrists stacked.",
      },
      {
        title: "Press",
        cue: "Drive up and slightly back while keeping chest proud and glutes on bench.",
      },
    ],
  }),

  createExercise({
    name: "Leg Press",
    aliases: ["sled leg press"],
    category: "Compound",
    training_tag: "Lower Body",
    movement_pattern: "Knee Dominant",
    primary_muscles: ["quads", "glutes"],
    secondary_muscles: ["hamstrings", "calves"],
    short_cue:
      "Drive through the full foot, control the descent, and do not let your lower back roll.",
    feel_cue:
      "You should mostly feel quads and glutes working through a controlled range.",
    correction_cue:
      "If your hips tuck hard off the pad, shorten the range and keep your lower back planted.",
    coach_warning:
      "Do not slam the sled or lock your knees aggressively.",
    pro_tip:
      "Use the biggest pain-free range you can control while keeping hips down.",
    form_focus: ["Full foot pressure", "Knees track over toes", "Hips stay down"],
    steps: [
      {
        title: "Setup",
        cue: "Feet shoulder-width, back and hips set into the pad, core tight.",
      },
      {
        title: "Lower",
        cue: "Lower slowly until knees bend deeply without the hips rolling off the seat.",
      },
      {
        title: "Drive",
        cue: "Push through mid-foot, extend knees and hips, and stop just short of hard lockout.",
      },
    ],
  }),

  createExercise({
    name: "Romanian Deadlift",
    aliases: ["rdl", "barbell rdl", "romanian dl"],
    category: "Compound",
    training_tag: "Posterior Chain",
    movement_pattern: "Hip Hinge",
    primary_muscles: ["hamstrings", "glutes"],
    secondary_muscles: ["lower back", "lats", "forearms"],
    short_cue:
      "Soft knees, push hips back, keep the bar close, and stretch the hamstrings before driving up.",
    feel_cue:
      "You should feel a strong hamstring stretch and glutes working the return.",
    correction_cue:
      "If it becomes all lower back, reduce load and stop lowering once the spine wants to round.",
    coach_warning:
      "Do not turn this into a squat. The hinge is the priority.",
    pro_tip:
      "Stop the descent when hamstrings are fully loaded, not just when the bar gets lower.",
    form_focus: ["Hips back", "Soft knees", "Long spine", "Bar close"],
    steps: [
      {
        title: "Setup",
        cue: "Stand tall, unlock knees slightly, brace core, and pull shoulders down.",
      },
      {
        title: "Hinge",
        cue: "Push hips back while the bar tracks down the legs and torso folds forward.",
      },
      {
        title: "Return",
        cue: "Drive hips forward and squeeze glutes without overextending the back.",
      },
    ],
  }),

  createExercise({
    name: "Step-Up",
    aliases: ["step up", "box step-up"],
    category: "Compound",
    training_tag: "Athletic",
    movement_pattern: "Single Leg",
    primary_muscles: ["glutes", "quads"],
    secondary_muscles: ["hamstrings", "calves", "core"],
    short_cue:
      "Drive through the working leg, stay tall, and control the lowering phase.",
    feel_cue:
      "You should feel glutes and quads of the working leg doing most of the work.",
    correction_cue:
      "If you are pushing hard off the back leg, lower the box and own the movement.",
    coach_warning:
      "Avoid collapsing the knee inward as you step up.",
    pro_tip:
      "Think about pulling yourself onto the box instead of jumping off the back foot.",
    form_focus: ["Tall torso", "Front leg drive", "Control down"],
    steps: [
      {
        title: "Setup",
        cue: "Plant the whole front foot on the box and brace your torso.",
      },
      {
        title: "Drive",
        cue: "Push through the front leg to stand tall on top of the box.",
      },
      {
        title: "Lower",
        cue: "Lower slowly and keep tension on the front leg instead of dropping down.",
      },
    ],
  }),

  createExercise({
    name: "Dumbbell Curl",
    aliases: ["bicep curl", "biceps curl"],
    category: "Isolation",
    training_tag: "Arms",
    movement_pattern: "Elbow Flexion",
    primary_muscles: ["biceps"],
    secondary_muscles: ["forearms"],
    short_cue:
      "Keep elbows close, curl without swinging, and squeeze hard at the top.",
    feel_cue:
      "You should feel biceps driving the lift and a strong squeeze at the top.",
    correction_cue:
      "If you are throwing your torso, the weight is too heavy for strict reps.",
    coach_warning:
      "Do not turn the rep into a full-body swing.",
    pro_tip:
      "Slow the lowering phase for a stronger contraction and cleaner stimulus.",
    form_focus: ["Elbows fixed", "No swing", "Squeeze top", "Slow lower"],
    steps: [
      {
        title: "Setup",
        cue: "Stand tall with elbows tucked and palms ready to supinate if needed.",
      },
      {
        title: "Curl",
        cue: "Curl the dumbbells up while keeping shoulders quiet and torso still.",
      },
      {
        title: "Lower",
        cue: "Lower slowly and keep tension on the biceps the entire time.",
      },
    ],
  }),

  createExercise({
    name: "Chest Fly",
    aliases: ["dumbbell chest fly", "pec fly"],
    category: "Isolation",
    training_tag: "Chest",
    movement_pattern: "Horizontal Adduction",
    primary_muscles: ["chest"],
    secondary_muscles: ["front delts", "biceps"],
    short_cue:
      "Keep a soft bend in the elbows, open with control, and hug inward with your chest.",
    feel_cue:
      "You should feel the chest stretching open and then squeezing together.",
    correction_cue:
      "If shoulders feel irritated, reduce range and lower the load.",
    coach_warning:
      "Do not turn this into a press and do not overstretch the shoulder.",
    pro_tip:
      "Think about bringing your upper arms together, not just the dumbbells.",
    form_focus: ["Soft elbows", "Control stretch", "Chest squeeze"],
    steps: [
      {
        title: "Setup",
        cue: "Set the shoulders back and keep a slight bend in the elbows.",
      },
      {
        title: "Open",
        cue: "Lower out wide with control until you feel a chest stretch.",
      },
      {
        title: "Squeeze",
        cue: "Bring the arms back together by squeezing the chest, not shrugging.",
      },
    ],
  }),

  createExercise({
    name: "Lat Pulldown",
    aliases: ["lat pull down", "wide grip pulldown"],
    category: "Compound",
    training_tag: "Back",
    movement_pattern: "Vertical Pull",
    primary_muscles: ["lats", "upper back"],
    secondary_muscles: ["biceps", "rear delts", "core"],
    short_cue:
      "Chest up, elbows drive down, and pull with your back instead of yanking with the hands.",
    feel_cue:
      "You should feel lats and upper back drawing the elbows toward your sides.",
    correction_cue:
      "If the biceps dominate, lighten the load and think elbows down to pockets.",
    coach_warning:
      "Do not swing the torso backward to finish the rep.",
    pro_tip:
      "Pause briefly near the chest and keep tension on the lats before controlling up.",
    form_focus: ["Chest up", "Elbows down", "No torso swing"],
    steps: [
      {
        title: "Setup",
        cue: "Grip the bar, set the shoulders, and sit tall with a slight lean.",
      },
      {
        title: "Pull",
        cue: "Drive elbows down toward your sides while keeping the chest lifted.",
      },
      {
        title: "Return",
        cue: "Let the bar rise under control while keeping shoulders from shrugging hard.",
      },
    ],
  }),

  createExercise({
    name: "Shoulder Press",
    aliases: ["dumbbell shoulder press", "overhead press"],
    category: "Compound",
    training_tag: "Shoulders",
    movement_pattern: "Vertical Push",
    primary_muscles: ["delts", "triceps"],
    secondary_muscles: ["upper chest", "core"],
    short_cue:
      "Brace the core, press up in a strong line, and keep the ribs from flaring.",
    feel_cue:
      "You should feel delts and triceps working while your core keeps you stable.",
    correction_cue:
      "If your lower back arches hard, reduce the load and brace tighter.",
    coach_warning:
      "Do not let rib flare and lumbar extension take over.",
    pro_tip:
      "Exhale through the sticking point while staying stacked through your torso.",
    form_focus: ["Core stacked", "Press vertical", "Control down"],
    steps: [
      {
        title: "Setup",
        cue: "Hold the weights at shoulder height and brace your midline.",
      },
      {
        title: "Press",
        cue: "Press overhead while staying tall and keeping wrists over elbows.",
      },
      {
        title: "Lower",
        cue: "Lower slowly back to shoulder height without losing tension.",
      },
    ],
  }),

  createExercise({
    name: "Push-Up",
    aliases: ["push up"],
    category: "Compound",
    training_tag: "Bodyweight",
    movement_pattern: "Upper Push",
    primary_muscles: ["chest", "triceps", "front delts"],
    secondary_muscles: ["core", "serratus"],
    short_cue:
      "Stay in a straight line, screw hands into the floor, and press the floor away.",
    feel_cue:
      "You should feel chest, triceps, and core working together.",
    correction_cue:
      "If hips sag or shoulders pinch, elevate hands and own a cleaner position.",
    coach_warning:
      "Do not let the lower back collapse or the head poke forward.",
    pro_tip:
      "Keep the glutes squeezed and ribs down to hold a stronger plank position.",
    form_focus: ["Body line", "Core tight", "Elbows controlled"],
    steps: [
      {
        title: "Setup",
        cue: "Hands just outside shoulder width, glutes tight, and body in a straight line.",
      },
      {
        title: "Lower",
        cue: "Lower chest under control while elbows angle naturally, not straight out.",
      },
      {
        title: "Press",
        cue: "Press the floor away and return to a strong plank.",
      },
    ],
  }),

  createExercise({
    name: "Dynamic Warm-Up",
    aliases: ["warm-up", "dynamic warm up"],
    category: "Prep",
    training_tag: "Warm-Up",
    movement_pattern: "Mobility",
    primary_muscles: ["hips", "shoulders", "core"],
    secondary_muscles: ["hamstrings", "glutes", "ankles"],
    short_cue:
      "Move with intent, open the joints, and raise body temperature without rushing.",
    feel_cue:
      "You should feel looser, warmer, and more prepared for the main lift.",
    correction_cue:
      "Do not turn the warm-up into conditioning. Save the hard work for the workout.",
    coach_warning: "Warm up the areas you are about to train most.",
    pro_tip: "The best warm-up makes the first working set feel more natural.",
    form_focus: ["Controlled movement", "Range of motion", "Breathing"],
    steps: [
      { title: "Open", cue: "Mobilize hips, shoulders, and ankles through easy ranges." },
      { title: "Activate", cue: "Wake up glutes, core, and upper back with simple drills." },
      { title: "Prepare", cue: "Build to the first exercise with a few specific practice reps." },
    ],
  }),

  createExercise({
    name: "Cooldown Mobility",
    aliases: ["cooldown", "cool down", "mobility"],
    category: "Recovery",
    training_tag: "Cooldown",
    movement_pattern: "Mobility",
    primary_muscles: ["hips", "back", "shoulders"],
    secondary_muscles: ["hamstrings", "glutes"],
    short_cue:
      "Slow your breathing, regain range, and bring tension back down after the workout.",
    feel_cue:
      "You should feel less tight and more relaxed than when you finished the final set.",
    correction_cue:
      "Do not force painful stretches. Breathe and move gently into range.",
    coach_warning: "Cooldown should calm the body, not create more fatigue.",
    pro_tip:
      "Long exhales help bring the body out of go-mode and into recovery mode.",
    form_focus: ["Slow breathing", "Easy range", "Relaxed control"],
    steps: [
      { title: "Breathe", cue: "Use slow nasal inhales and long exhales." },
      { title: "Open", cue: "Stretch the tightest areas from the session gently." },
      { title: "Reset", cue: "Finish with easy mobility so you leave the gym feeling better." },
    ],
  }),
];

function nameMatches(name = "", exercise = {}) {
  const clean = slugify(name);
  const exerciseSlug = slugify(exercise.name);
  const aliases = Array.isArray(exercise.aliases) ? exercise.aliases : [];

  if (clean === exerciseSlug) return true;
  if (clean.includes(exerciseSlug)) return true;
  if (exerciseSlug.includes(clean) && clean.length > 3) return true;

  return aliases.some((alias) => {
    const aliasSlug = slugify(alias);
    return clean === aliasSlug || clean.includes(aliasSlug) || aliasSlug.includes(clean);
  });
}

export function getExerciseKnowledge(name = "") {
  const found =
    EXERCISE_KNOWLEDGE.find((exercise) => nameMatches(name, exercise)) || null;

  if (found) return found;

  const fallbackName = String(name || "Exercise").trim() || "Exercise";
  const slug = slugify(fallbackName);

  return createExercise({
    name: fallbackName,
    slug,
    category: "General",
    training_tag: "Training",
    movement_pattern: "General",
    primary_muscles: ["target muscle group"],
    secondary_muscles: ["support muscles"],
    short_cue:
      "Move with control, brace your core, and use a clean range of motion.",
    feel_cue:
      "You should feel the target muscle group working more than the joints.",
    correction_cue:
      "If the movement feels painful or unstable, reduce load and slow the rep down.",
    coach_warning:
      "Choose a pain-free range and focus on quality over ego.",
    pro_tip:
      "A slower eccentric and cleaner setup usually improve the contraction immediately.",
    form_focus: ["Brace", "Control", "Clean reps"],
    steps: [
      { title: "Setup", cue: "Set your body position and brace before the rep." },
      { title: "Move", cue: "Perform the rep under control through the working range." },
      { title: "Finish", cue: "End the rep in a strong position and reset cleanly." },
    ],
  });
}

export const getExerciseKnowledgeByName = getExerciseKnowledge;
export const getExerciseGuide = getExerciseKnowledge;

function buildExerciseStub(name, sets, reps, restSeconds, target, notes = "") {
  const knowledge = getExerciseKnowledge(name);

  return {
    name: knowledge.name,
    target: target || knowledge.primary_muscles.join(", "),
    planned_sets: sets,
    planned_reps: reps,
    rest_seconds: restSeconds,
    notes,
    equipment: "",
  };
}

export function buildExercisesForWorkoutName(workoutName = "") {
  const clean = String(workoutName || "").toLowerCase();

  if (
    clean.includes("lower") ||
    clean.includes("athletic base") ||
    clean.includes("leg")
  ) {
    return [
      buildExerciseStub("Dynamic Warm-Up", "1", "5-8 min", 30, "prep"),
      buildExerciseStub("Deadlift", "3", "5-8", 90, "glutes, hamstrings, back"),
      buildExerciseStub("Leg Press", "4", "8-10", 75, "quads, glutes"),
      buildExerciseStub("Romanian Deadlift", "3", "8-10", 75, "hamstrings, glutes"),
      buildExerciseStub("Step-Up", "3", "10 each side", 60, "glutes, quads"),
      buildExerciseStub("Cooldown Mobility", "1", "5 min", 30, "recovery"),
    ];
  }

  if (clean.includes("push") || clean.includes("chest")) {
    return [
      buildExerciseStub("Dynamic Warm-Up", "1", "5-8 min", 30, "prep"),
      buildExerciseStub("Bench Press", "4", "6-10", 90, "chest, triceps"),
      buildExerciseStub("Chest Fly", "3", "10-12", 60, "chest"),
      buildExerciseStub("Shoulder Press", "3", "8-10", 75, "shoulders, triceps"),
      buildExerciseStub("Push-Up", "2", "AMRAP", 45, "chest, triceps"),
      buildExerciseStub("Cooldown Mobility", "1", "5 min", 30, "recovery"),
    ];
  }

  if (clean.includes("pull") || clean.includes("back")) {
    return [
      buildExerciseStub("Dynamic Warm-Up", "1", "5-8 min", 30, "prep"),
      buildExerciseStub("Lat Pulldown", "4", "8-12", 75, "lats, upper back"),
      buildExerciseStub("Romanian Deadlift", "3", "8-10", 75, "posterior chain"),
      buildExerciseStub("Dumbbell Curl", "3", "10-12", 45, "biceps"),
      buildExerciseStub("Cooldown Mobility", "1", "5 min", 30, "recovery"),
    ];
  }

  return [
    buildExerciseStub("Dynamic Warm-Up", "1", "5-8 min", 30, "prep"),
    buildExerciseStub("Deadlift", "3", "5-8", 90, "glutes, hamstrings, back"),
    buildExerciseStub("Push-Up", "3", "8-15", 45, "chest, triceps"),
    buildExerciseStub("Dumbbell Curl", "3", "10-12", 45, "biceps"),
    buildExerciseStub("Cooldown Mobility", "1", "5 min", 30, "recovery"),
  ];
}

export const HEALTH_EXERCISE_IMAGE_CONVENTION = {
  root: "public/health/exercises/<exercise-slug>/",
  hero: "<exercise-slug>-hero.png",
  step1: "<exercise-slug>-step-1.png",
  step2: "<exercise-slug>-step-2.png",
  step3: "<exercise-slug>-step-3.png",
};
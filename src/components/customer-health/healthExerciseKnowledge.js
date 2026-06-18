// src/components/customer-health/healthExerciseKnowledge.js

const EXERCISE_KNOWLEDGE = {
  "bench press": {
    name: "Bench Press",
    aliases: ["barbell bench", "chest press"],
    muscles: ["Chest", "Front delts", "Triceps"],
    feel: [
      "Chest stretching as the bar lowers under control.",
      "Chest and triceps driving the bar up.",
      "Upper back tight against the bench.",
    ],
    contractionTips: [
      "Pull shoulder blades down and back before unracking.",
      "Think about pushing yourself away from the bar.",
      "Lower to lower/mid chest, not the neck.",
      "Control the negative. Do not bounce.",
      "Keep feet planted and use leg drive without lifting hips.",
    ],
    mistakes: [
      "Flaring elbows too wide.",
      "Bouncing the bar off the chest.",
      "Letting shoulders roll forward.",
      "Losing tightness before the press.",
    ],
    failureCue:
      "For bench press, stop at technical failure unless the plan says otherwise. Technical failure means your bar speed dies or your shoulder position breaks.",
    swaps: ["Push-Ups", "Dumbbell Press", "Machine Chest Press"],
    youtubeQuery: "bench press proper form chest contraction",
  },

  "incline dumbbell press": {
    name: "Incline Dumbbell Press",
    aliases: ["incline press", "db incline press"],
    muscles: ["Upper chest", "Front delts", "Triceps"],
    feel: [
      "Upper chest stretching at the bottom.",
      "Chest squeezing as the dumbbells come up and slightly in.",
      "Shoulders stable, not pinching.",
    ],
    contractionTips: [
      "Use a low incline, around 20-35 degrees.",
      "Keep shoulder blades pinned back.",
      "Let elbows travel slightly below the chest line.",
      "Press up and slightly together without smashing dumbbells.",
    ],
    mistakes: [
      "Incline too high turning it into shoulders.",
      "Short reps.",
      "Dumbbells drifting too far forward.",
    ],
    failureCue:
      "Stop when you cannot keep the dumbbells controlled and symmetrical.",
    swaps: ["Push-Ups", "Machine Incline Press", "Flat Dumbbell Press"],
    youtubeQuery: "incline dumbbell press proper form upper chest",
  },

  "chest fly": {
    name: "Chest Fly",
    aliases: ["dumbbell fly", "cable fly", "pec fly"],
    muscles: ["Chest"],
    feel: [
      "Deep chest stretch with control.",
      "Chest squeezing as arms come together.",
      "Minimal triceps involvement.",
    ],
    contractionTips: [
      "Keep a soft bend in the elbows.",
      "Think hug the tree, not press the weight.",
      "Stop the stretch before shoulder discomfort.",
      "Squeeze chest hard at the top.",
    ],
    mistakes: [
      "Turning the fly into a press.",
      "Going too heavy.",
      "Overstretching shoulders.",
    ],
    failureCue:
      "Failure on flys should be controlled. Stop when you lose chest tension or shoulders take over.",
    swaps: ["Cable Fly", "Push-Ups", "Pec Deck"],
    youtubeQuery: "chest fly proper form chest contraction",
  },

  "push-ups": {
    name: "Push-Ups",
    aliases: ["pushup", "push ups"],
    muscles: ["Chest", "Triceps", "Core", "Front delts"],
    feel: [
      "Chest and triceps pressing the floor away.",
      "Core tight like a plank.",
      "Shoulders stable.",
    ],
    contractionTips: [
      "Hands slightly outside shoulder width.",
      "Lower chest toward the floor.",
      "Squeeze glutes and brace abs.",
      "Keep elbows about 30-60 degrees from your body.",
    ],
    mistakes: ["Sagging hips.", "Half reps.", "Head reaching to the floor."],
    failureCue:
      "Push-up failure means you cannot complete another clean rep without sagging or shortening the range.",
    swaps: ["Incline Push-Ups", "Knee Push-Ups", "Machine Chest Press"],
    youtubeQuery: "push up proper form chest triceps",
  },

  "biceps curls": {
    name: "Biceps Curls",
    aliases: ["bicep curl", "bicept curls", "dumbbell curl", "barbell curl"],
    muscles: ["Biceps", "Forearms"],
    feel: [
      "Biceps shortening as the weight comes up.",
      "Biceps stretching at the bottom.",
      "Forearms working without shoulders swinging.",
    ],
    contractionTips: [
      "Pin elbows near your sides.",
      "Curl without rocking your body.",
      "Turn pinky slightly up at the top for a harder squeeze.",
      "Lower slowly for 2-3 seconds.",
    ],
    mistakes: [
      "Swinging the weight.",
      "Elbows drifting forward too much.",
      "Cutting the bottom short.",
    ],
    failureCue:
      "Failure means you cannot curl another clean rep without swinging or moving elbows forward.",
    swaps: ["Hammer Curls", "Cable Curls", "Preacher Curls"],
    youtubeQuery: "dumbbell bicep curl proper form biceps contraction",
  },

  "hammer curls": {
    name: "Hammer Curls",
    aliases: ["hammer curl"],
    muscles: ["Biceps", "Brachialis", "Forearms"],
    feel: [
      "Outer arm and forearm working.",
      "Biceps assisting without wrist pain.",
    ],
    contractionTips: [
      "Keep thumbs up the entire rep.",
      "Do not swing.",
      "Control the lower.",
    ],
    mistakes: ["Swinging.", "Shrugging.", "Letting wrists bend back."],
    failureCue:
      "Stop when the dumbbell path gets sloppy or you need momentum.",
    swaps: ["Biceps Curls", "Cable Rope Curls", "Cross-Body Hammer Curls"],
    youtubeQuery: "hammer curl proper form brachialis forearms",
  },

  "triceps pressdown": {
    name: "Triceps Pressdown",
    aliases: ["tricep pushdown", "rope pressdown", "cable pressdown"],
    muscles: ["Triceps"],
    feel: [
      "Back of the arm squeezing hard at the bottom.",
      "Elbows staying pinned.",
    ],
    contractionTips: [
      "Lock elbows at your sides.",
      "Separate the rope at the bottom.",
      "Pause and squeeze for one second.",
    ],
    mistakes: ["Elbows drifting.", "Using body weight.", "Half reps."],
    failureCue:
      "Failure means you cannot press down without shoulders or torso taking over.",
    swaps: ["Close-Grip Push-Ups", "Overhead Triceps Extension", "Dips"],
    youtubeQuery: "triceps pressdown proper form rope pushdown",
  },

  "lat pulldown": {
    name: "Lat Pulldown",
    aliases: ["pulldown", "lat pull down"],
    muscles: ["Lats", "Upper back", "Biceps"],
    feel: [
      "Lats pulling elbows down toward ribs.",
      "Upper back tight at the bottom.",
    ],
    contractionTips: [
      "Lead with elbows, not hands.",
      "Pull the bar to upper chest.",
      "Lean back slightly, do not turn it into a row.",
      "Pause at the bottom.",
    ],
    mistakes: ["Yanking with arms.", "Pulling behind the neck.", "Too much lean."],
    failureCue:
      "Stop when you cannot pull with lats and start jerking with your body.",
    swaps: ["Assisted Pull-Up", "Seated Row", "Single-Arm Cable Pulldown"],
    youtubeQuery: "lat pulldown proper form feel lats",
  },

  rows: {
    name: "Rows",
    aliases: ["row", "seated row", "cable row", "machine row", "dumbbell row"],
    muscles: ["Upper back", "Lats", "Rear delts", "Biceps"],
    feel: [
      "Shoulder blades pulling back.",
      "Elbows driving behind the body.",
      "Lats and mid-back working together.",
    ],
    contractionTips: [
      "Start by pulling shoulder blades back.",
      "Drive elbows, not hands.",
      "Pause at the squeeze.",
      "Control the stretch forward.",
    ],
    mistakes: ["Shrugging.", "Rounding low back.", "Using too much momentum."],
    failureCue:
      "Failure means you cannot keep posture and squeeze your back cleanly.",
    swaps: ["Lat Pulldown", "Chest-Supported Row", "One-Arm Dumbbell Row"],
    youtubeQuery: "seated cable row proper form back contraction",
  },

  squat: {
    name: "Squat",
    aliases: ["barbell squat", "goblet squat", "bodyweight squat"],
    muscles: ["Quads", "Glutes", "Core", "Adductors"],
    feel: [
      "Quads and glutes driving up.",
      "Core braced.",
      "Feet gripping the floor.",
    ],
    contractionTips: [
      "Brace before you descend.",
      "Sit between your hips, not just straight down.",
      "Drive knees in line with toes.",
      "Push the floor away.",
    ],
    mistakes: ["Knees collapsing.", "Heels lifting.", "Losing brace."],
    failureCue:
      "Stop before form breaks. For hips or joint pain, reduce depth/load or swap.",
    swaps: ["Leg Press", "Goblet Squat", "Box Squat"],
    youtubeQuery: "squat proper form knees hips bracing",
  },

  "leg press": {
    name: "Leg Press",
    aliases: ["machine leg press"],
    muscles: ["Quads", "Glutes", "Hamstrings"],
    feel: [
      "Quads and glutes pressing the platform.",
      "Controlled stretch at the bottom.",
    ],
    contractionTips: [
      "Keep lower back against the pad.",
      "Control depth.",
      "Do not lock knees aggressively.",
      "Push through mid-foot.",
    ],
    mistakes: ["Too deep with hips rolling.", "Locking knees hard.", "Half reps."],
    failureCue:
      "Failure means you cannot press cleanly without hips rolling or knees caving.",
    swaps: ["Goblet Squat", "Step-Ups", "Split Squat"],
    youtubeQuery: "leg press proper form foot placement",
  },

  "romanian deadlift": {
    name: "Romanian Deadlift",
    aliases: ["rdl", "dumbbell rdl", "barbell rdl"],
    muscles: ["Hamstrings", "Glutes", "Lower back"],
    feel: [
      "Hamstrings stretching as hips move back.",
      "Glutes driving hips forward.",
      "Back staying flat and braced.",
    ],
    contractionTips: [
      "Push hips back like closing a car door.",
      "Keep weight close to legs.",
      "Stop when hamstrings stretch hard.",
      "Stand tall by squeezing glutes.",
    ],
    mistakes: ["Squatting the movement.", "Rounding back.", "Letting weight drift."],
    failureCue:
      "Stop when back position changes or hamstrings lose tension.",
    swaps: ["Hip Thrust", "Hamstring Curl", "Glute Bridge"],
    youtubeQuery: "romanian deadlift proper form hamstrings glutes",
  },

  "lateral raises": {
    name: "Lateral Raises",
    aliases: ["lateral raise", "side raises"],
    muscles: ["Side delts"],
    feel: [
      "Side shoulders lifting the arms.",
      "Minimal traps.",
    ],
    contractionTips: [
      "Lead with elbows.",
      "Keep shoulders down.",
      "Use lighter weight and strict control.",
      "Stop around shoulder height.",
    ],
    mistakes: ["Shrugging.", "Swinging.", "Going too heavy."],
    failureCue:
      "Failure means you cannot lift without swinging or shrugging.",
    swaps: ["Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Raise"],
    youtubeQuery: "lateral raise proper form side delts",
  },

  "shoulder press": {
    name: "Shoulder Press",
    aliases: ["overhead press", "dumbbell shoulder press"],
    muscles: ["Shoulders", "Triceps", "Upper chest"],
    feel: [
      "Shoulders pressing up.",
      "Triceps finishing the lockout.",
      "Core braced.",
    ],
    contractionTips: [
      "Brace ribs down.",
      "Press slightly back over the head.",
      "Keep wrists stacked over elbows.",
    ],
    mistakes: ["Arching low back.", "Pressing too far forward.", "Loose wrists."],
    failureCue:
      "Stop when you cannot keep ribs down or press path clean.",
    swaps: ["Machine Shoulder Press", "Landmine Press", "Lateral Raises"],
    youtubeQuery: "dumbbell shoulder press proper form shoulders",
  },

  plank: {
    name: "Plank",
    aliases: ["front plank"],
    muscles: ["Core", "Glutes", "Shoulders"],
    feel: [
      "Abs braced.",
      "Glutes squeezed.",
      "Body straight from head to heels.",
    ],
    contractionTips: [
      "Pull ribs down.",
      "Squeeze glutes.",
      "Push elbows into the floor.",
      "Breathe while staying tight.",
    ],
    mistakes: ["Hips sagging.", "Holding breath.", "Butt too high."],
    failureCue:
      "Failure means you cannot hold position without hips sagging or shaking badly.",
    swaps: ["Dead Bug", "Side Plank", "Hollow Hold"],
    youtubeQuery: "plank proper form core bracing",
  },

  "dead bug": {
    name: "Dead Bug",
    aliases: ["deadbugs"],
    muscles: ["Core", "Hip flexors"],
    feel: [
      "Abs keeping low back down.",
      "Controlled arm and leg movement.",
    ],
    contractionTips: [
      "Press low back into the floor.",
      "Move slow.",
      "Exhale as the leg extends.",
    ],
    mistakes: ["Low back arching.", "Moving too fast.", "Losing rib position."],
    failureCue:
      "Stop when low back pops off the floor.",
    swaps: ["Plank", "Bird Dog", "Hollow Hold"],
    youtubeQuery: "dead bug exercise proper form core",
  },

  "walking lunges": {
    name: "Walking Lunges",
    aliases: ["lunge", "lunges"],
    muscles: ["Quads", "Glutes", "Hamstrings"],
    feel: [
      "Front leg driving the movement.",
      "Glute and quad working together.",
    ],
    contractionTips: [
      "Step long enough to stay balanced.",
      "Push through the front foot.",
      "Keep torso tall.",
    ],
    mistakes: ["Knee collapsing inward.", "Pushing off back leg too much.", "Wobbling."],
    failureCue:
      "Stop when balance or knee tracking breaks.",
    swaps: ["Step-Ups", "Split Squat", "Leg Press"],
    youtubeQuery: "walking lunge proper form glutes quads",
  },

  "step-ups": {
    name: "Step-Ups",
    aliases: ["step up", "box step up"],
    muscles: ["Glutes", "Quads", "Hamstrings"],
    feel: [
      "Front leg doing most of the work.",
      "Glute driving you up.",
    ],
    contractionTips: [
      "Plant full foot on the box.",
      "Lean slightly forward.",
      "Do not bounce off the back leg.",
    ],
    mistakes: ["Pushing off the floor leg.", "Box too high.", "Knee collapsing."],
    failureCue:
      "Stop when you cannot control the step or knee position.",
    swaps: ["Split Squat", "Leg Press", "Walking Lunges"],
    youtubeQuery: "step up exercise proper form glutes",
  },
};

const DEFAULT_GUIDE = {
  name: "Exercise",
  aliases: [],
  muscles: ["Target muscle group"],
  feel: [
    "You should feel the target muscle working, not joint pain.",
    "Use controlled reps and stop if form breaks.",
  ],
  contractionTips: [
    "Control the lowering phase.",
    "Pause briefly where the muscle is most contracted.",
    "Keep tension on the target muscle instead of rushing reps.",
  ],
  mistakes: [
    "Using momentum.",
    "Cutting range of motion short.",
    "Ignoring pain or unstable form.",
  ],
  failureCue:
    "Push to failure means you cannot complete another clean rep with safe form. Most users should stop 1-2 reps before true failure.",
  swaps: ["Bodyweight version", "Machine version", "Cable version"],
  youtubeQuery: "proper exercise form muscle contraction",
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getExerciseGuide(exerciseName = "") {
  const cleanName = normalize(exerciseName);

  if (!cleanName) return DEFAULT_GUIDE;

  for (const guide of Object.values(EXERCISE_KNOWLEDGE)) {
    const names = [guide.name, ...(guide.aliases || [])].map(normalize);

    if (names.includes(cleanName)) return guide;

    if (names.some((name) => cleanName.includes(name) || name.includes(cleanName))) {
      return guide;
    }
  }

  return {
    ...DEFAULT_GUIDE,
    name: exerciseName || DEFAULT_GUIDE.name,
    youtubeQuery: `${exerciseName || "exercise"} proper form`,
  };
}

export function buildYouTubeSearchUrl(exerciseName = "") {
  const guide = getExerciseGuide(exerciseName);
  const query = encodeURIComponent(
    guide.youtubeQuery || `${guide.name} proper form`
  );

  return `https://www.youtube.com/results?search_query=${query}`;
}

export function getExerciseSwapOptions(exerciseName = "") {
  return getExerciseGuide(exerciseName).swaps || DEFAULT_GUIDE.swaps;
}

export function buildExercisesForWorkoutName(workoutName = "") {
  const clean = normalize(workoutName);

  if (
    clean.includes("chest") ||
    clean.includes("push") ||
    clean.includes("upper")
  ) {
    return [
      {
        name: "Bench Press",
        sets: "4",
        reps: "8-10",
        weight: "",
        rest: "90 sec",
        notes: "Primary strength movement. Stop 1-2 reps before form breaks.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Incline Dumbbell Press",
        sets: "3",
        reps: "10-12",
        weight: "",
        rest: "75 sec",
        notes: "Upper chest focus. Control the bottom stretch.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Chest Fly",
        sets: "3",
        reps: "12-15",
        weight: "",
        rest: "60 sec",
        notes: "Squeeze chest, do not turn it into a press.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Triceps Pressdown",
        sets: "3",
        reps: "10-15",
        weight: "",
        rest: "60 sec",
        notes: "Elbows pinned. Full squeeze at bottom.",
        difficulty: "Medium",
        pain: "0",
      },
    ];
  }

  if (
    clean.includes("arms") ||
    clean.includes("bicep") ||
    clean.includes("biceps")
  ) {
    return [
      {
        name: "Biceps Curls",
        sets: "4",
        reps: "8-12",
        weight: "",
        rest: "60 sec",
        notes: "Strict reps. No swinging.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Hammer Curls",
        sets: "3",
        reps: "10-12",
        weight: "",
        rest: "60 sec",
        notes: "Thumbs up. Control the lower.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Triceps Pressdown",
        sets: "4",
        reps: "10-15",
        weight: "",
        rest: "60 sec",
        notes: "Hard squeeze at lockout.",
        difficulty: "Medium",
        pain: "0",
      },
    ];
  }

  if (clean.includes("back") || clean.includes("pull")) {
    return [
      {
        name: "Lat Pulldown",
        sets: "4",
        reps: "8-12",
        weight: "",
        rest: "90 sec",
        notes: "Lead with elbows. Feel lats, not just biceps.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Rows",
        sets: "4",
        reps: "8-12",
        weight: "",
        rest: "90 sec",
        notes: "Squeeze shoulder blades. Control the stretch.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Biceps Curls",
        sets: "3",
        reps: "10-12",
        weight: "",
        rest: "60 sec",
        notes: "Finish with strict arm work.",
        difficulty: "Medium",
        pain: "0",
      },
    ];
  }

  if (
    clean.includes("leg") ||
    clean.includes("lower") ||
    clean.includes("glute")
  ) {
    return [
      {
        name: "Leg Press",
        sets: "4",
        reps: "10-12",
        weight: "",
        rest: "90 sec",
        notes: "Controlled depth. Do not let hips roll.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Romanian Deadlift",
        sets: "3",
        reps: "8-10",
        weight: "",
        rest: "90 sec",
        notes: "Hips back. Hamstring stretch. Flat back.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Step-Ups",
        sets: "3",
        reps: "8-10 each leg",
        weight: "",
        rest: "75 sec",
        notes: "Front leg does the work. Control knee tracking.",
        difficulty: "Medium",
        pain: "0",
      },
    ];
  }

  if (
    clean.includes("shoulder") ||
    clean.includes("delts") ||
    clean.includes("athletic")
  ) {
    return [
      {
        name: "Shoulder Press",
        sets: "4",
        reps: "8-10",
        weight: "",
        rest: "90 sec",
        notes: "Brace core. Press clean.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Lateral Raises",
        sets: "4",
        reps: "12-15",
        weight: "",
        rest: "45 sec",
        notes: "Side delts. No swinging.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Rows",
        sets: "3",
        reps: "10-12",
        weight: "",
        rest: "75 sec",
        notes: "Balance shoulders with upper back work.",
        difficulty: "Medium",
        pain: "0",
      },
    ];
  }

  if (
    clean.includes("core") ||
    clean.includes("abs") ||
    clean.includes("mobility")
  ) {
    return [
      {
        name: "Plank",
        sets: "3",
        reps: "30-60 sec",
        weight: "",
        rest: "45 sec",
        notes: "Ribs down. Glutes tight. Breathe.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Dead Bug",
        sets: "3",
        reps: "8-10 each side",
        weight: "",
        rest: "45 sec",
        notes: "Low back stays down.",
        difficulty: "Medium",
        pain: "0",
      },
      {
        name: "Step-Ups",
        sets: "3",
        reps: "8 each leg",
        weight: "",
        rest: "60 sec",
        notes: "Athletic control and hip-friendly movement.",
        difficulty: "Medium",
        pain: "0",
      },
    ];
  }

  return [
    {
      name: "Bench Press",
      sets: "3",
      reps: "8-10",
      weight: "",
      rest: "90 sec",
      notes: "Main strength movement.",
      difficulty: "Medium",
      pain: "0",
    },
    {
      name: "Rows",
      sets: "3",
      reps: "10-12",
      weight: "",
      rest: "75 sec",
      notes: "Balance pressing with back work.",
      difficulty: "Medium",
      pain: "0",
    },
    {
      name: "Biceps Curls",
      sets: "3",
      reps: "10-12",
      weight: "",
      rest: "60 sec",
      notes: "Strict arm work.",
      difficulty: "Medium",
      pain: "0",
    },
    {
      name: "Plank",
      sets: "3",
      reps: "30-45 sec",
      weight: "",
      rest: "45 sec",
      notes: "Core stability finisher.",
      difficulty: "Medium",
      pain: "0",
    },
  ];
}
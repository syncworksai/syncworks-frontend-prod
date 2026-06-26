// src/components/customer-health/healthCoachChat.js

const NOW = () => new Date().toISOString();

export const COACH_CHAT_STORAGE_KEYS = {
  CHAT: "coach_chat",
  PLAN_PROPOSAL: "coach_plan_proposal",
  LAST_SUMMARY: "last_coach_summary",
};

export function createCoachMessage(content, extra = {}) {
  return {
    id: extra.id || `coach_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role: "coach",
    content,
    created_at: extra.created_at || NOW(),
    ...extra,
  };
}

export function createUserMessage(content, extra = {}) {
  return {
    id: extra.id || `user_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role: "user",
    content,
    created_at: extra.created_at || NOW(),
    ...extra,
  };
}

export function getInitialCoachMessage() {
  return createCoachMessage(
    "I'm your SyncWorks AI Fitness Coach. Before I build your plan, I need to know what you're chasing, where you're training, how many days this week, any pain or limits, and whether you want me to push hard or keep it balanced."
  );
}

export function normalizeCoachChat(snapshot = {}) {
  const existing = Array.isArray(snapshot.coach_chat) ? snapshot.coach_chat : [];

  if (existing.length > 0) {
    return existing;
  }

  return [getInitialCoachMessage()];
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function matchNumberBefore(text, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`(\\d+)\\s*${keyword}`, "i");
    const match = text.match(regex);
    if (match?.[1]) return Number(match[1]);
  }

  return null;
}

function inferDaysPerWeek(text) {
  const direct = matchNumberBefore(text, [
    "day",
    "days",
    "x",
    "times",
    "workouts",
    "sessions",
  ]);

  if (direct && direct >= 1 && direct <= 7) return direct;

  if (includesAny(text, ["every day", "daily"])) return 6;
  if (includesAny(text, ["weekend only"])) return 2;
  if (includesAny(text, ["three days", "3 days"])) return 3;
  if (includesAny(text, ["four days", "4 days"])) return 4;
  if (includesAny(text, ["five days", "5 days"])) return 5;

  return null;
}

function inferTimeAvailable(text) {
  const minutes = matchNumberBefore(text, ["minute", "minutes", "min", "mins"]);
  if (minutes && minutes >= 10 && minutes <= 180) return minutes;

  const hours = matchNumberBefore(text, ["hour", "hours", "hr", "hrs"]);
  if (hours && hours >= 1 && hours <= 4) return hours * 60;

  if (includesAny(text, ["quick", "short", "busy"])) return 30;
  if (includesAny(text, ["lunch break"])) return 35;
  if (includesAny(text, ["long workout"])) return 75;

  return null;
}

function inferGoal(text) {
  if (
    includesAny(text, [
      "strength",
      "strong",
      "bench",
      "squat",
      "deadlift",
      "press",
      "power",
    ])
  ) {
    return "strength";
  }

  if (
    includesAny(text, [
      "fitness model",
      "model",
      "abs",
      "chest",
      "aesthetic",
      "lean",
      "tone",
      "toned",
      "shredded",
      "muscle",
      "body",
    ])
  ) {
    return "fitness_model";
  }

  if (
    includesAny(text, [
      "lose weight",
      "weight loss",
      "fat loss",
      "cut",
      "slim",
      "belly",
    ])
  ) {
    return "weight_loss";
  }

  if (
    includesAny(text, [
      "athletic",
      "softball",
      "speed",
      "explosive",
      "agility",
      "power athlete",
      "sport",
      "sports",
    ])
  ) {
    return "athletic";
  }

  if (
    includesAny(text, [
      "recovery",
      "rehab",
      "pain",
      "hip",
      "back",
      "knee",
      "shoulder",
      "mobility",
      "limited",
    ])
  ) {
    return "recovery";
  }

  if (
    includesAny(text, [
      "health",
      "general",
      "better shape",
      "fit",
      "fitness",
      "energy",
    ])
  ) {
    return "general";
  }

  return null;
}

function inferLocation(text) {
  if (
    includesAny(text, [
      "gym",
      "planet fitness",
      "ymca",
      "commercial gym",
      "bench press",
      "cable",
      "machine",
      "barbell",
      "dumbbell",
    ])
  ) {
    return "gym";
  }

  if (
    includesAny(text, [
      "home",
      "house",
      "garage",
      "living room",
      "bodyweight",
      "bands",
    ])
  ) {
    return "home";
  }

  if (
    includesAny(text, [
      "outside",
      "outdoors",
      "field",
      "park",
      "track",
      "walk",
      "run",
      "sprints",
    ])
  ) {
    return "outside";
  }

  if (
    includesAny(text, [
      "no equipment",
      "limited equipment",
      "hotel",
      "travel",
      "minimal equipment",
    ])
  ) {
    return "limited_equipment";
  }

  return null;
}

function inferIntensity(text) {
  if (
    includesAny(text, [
      "push me",
      "push hard",
      "hard",
      "aggressive",
      "intense",
      "be tough",
      "trainer",
      "no excuses",
    ])
  ) {
    return "push";
  }

  if (
    includesAny(text, [
      "balanced",
      "steady",
      "manageable",
      "moderate",
      "smart",
      "sustainable",
    ])
  ) {
    return "balanced";
  }

  if (
    includesAny(text, [
      "easy",
      "light",
      "careful",
      "recover",
      "gentle",
      "low impact",
    ])
  ) {
    return "careful";
  }

  return null;
}

function inferPainLimits(text) {
  const painWords = [
    "pain",
    "hurt",
    "hurts",
    "sore",
    "tight",
    "limited",
    "bad",
    "injury",
    "injured",
    "surgery",
    "hip",
    "knee",
    "back",
    "shoulder",
    "ankle",
    "neck",
    "elbow",
    "wrist",
  ];

  if (!includesAny(text, painWords)) return "";

  const sentences = text
    .split(/[.!?]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const relevant = sentences.filter((sentence) =>
    includesAny(sentence.toLowerCase(), painWords)
  );

  return relevant.slice(0, 2).join(". ");
}

function inferPreferredExercises(text) {
  const exerciseMap = [
    ["bench press", "Bench Press"],
    ["incline bench", "Incline Bench Press"],
    ["chest fly", "Chest Fly"],
    ["chest flys", "Chest Fly"],
    ["flys", "Chest Fly"],
    ["push up", "Push-Ups"],
    ["pushup", "Push-Ups"],
    ["squat", "Squat"],
    ["leg press", "Leg Press"],
    ["deadlift", "Deadlift"],
    ["rdl", "Romanian Deadlift"],
    ["row", "Rows"],
    ["lat pulldown", "Lat Pulldown"],
    ["pull up", "Pull-Ups"],
    ["curl", "Biceps Curls"],
    ["tricep", "Triceps Pressdown"],
    ["shoulder press", "Shoulder Press"],
    ["lateral raise", "Lateral Raises"],
    ["plank", "Plank"],
    ["abs", "Core Work"],
    ["walk", "Walking"],
    ["run", "Running"],
    ["sprint", "Sprints"],
    ["mobility", "Mobility"],
  ];

  const found = [];

  exerciseMap.forEach(([needle, label]) => {
    if (text.includes(needle) && !found.includes(label)) {
      found.push(label);
    }
  });

  return found;
}

export function inferCoachProfileFromText(input, previousProfile = {}) {
  const text = String(input || "").toLowerCase();

  const inferred = {
    goal: inferGoal(text),
    location: inferLocation(text),
    days_per_week: inferDaysPerWeek(text),
    time_available_minutes: inferTimeAvailable(text),
    intensity: inferIntensity(text),
    pain_limits: inferPainLimits(text),
    preferred_exercises: inferPreferredExercises(text),
  };

  return {
    goal: inferred.goal || previousProfile.goal || "",
    location: inferred.location || previousProfile.location || "",
    days_per_week:
      inferred.days_per_week || previousProfile.days_per_week || null,
    time_available_minutes:
      inferred.time_available_minutes ||
      previousProfile.time_available_minutes ||
      null,
    intensity: inferred.intensity || previousProfile.intensity || "",
    pain_limits: inferred.pain_limits || previousProfile.pain_limits || "",
    preferred_exercises: [
      ...new Set([
        ...(Array.isArray(previousProfile.preferred_exercises)
          ? previousProfile.preferred_exercises
          : []),
        ...(Array.isArray(inferred.preferred_exercises)
          ? inferred.preferred_exercises
          : []),
      ]),
    ],
  };
}

export function buildCoachProfileFromSnapshot(snapshot = {}) {
  const questionnaire =
    snapshot.profile ||
    snapshot.questionnaire ||
    snapshot.health_profile ||
    snapshot.customer_health_profile ||
    {};

  return {
    goal:
      snapshot.coach_profile?.goal ||
      questionnaire.goal ||
      questionnaire.primary_goal ||
      snapshot.goal ||
      "",
    location:
      snapshot.coach_profile?.location ||
      questionnaire.training_location ||
      questionnaire.location ||
      "",
    days_per_week:
      snapshot.coach_profile?.days_per_week ||
      questionnaire.days_per_week ||
      questionnaire.training_days ||
      null,
    time_available_minutes:
      snapshot.coach_profile?.time_available_minutes ||
      questionnaire.time_available_minutes ||
      questionnaire.minutes_per_workout ||
      null,
    intensity:
      snapshot.coach_profile?.intensity ||
      questionnaire.intensity ||
      questionnaire.preferred_intensity ||
      "",
    pain_limits:
      snapshot.coach_profile?.pain_limits ||
      questionnaire.pain_limits ||
      questionnaire.limitations ||
      questionnaire.injuries ||
      "",
    preferred_exercises: Array.isArray(snapshot.coach_profile?.preferred_exercises)
      ? snapshot.coach_profile.preferred_exercises
      : [],
  };
}

function labelGoal(goal) {
  const labels = {
    strength: "strength",
    fitness_model: "fitness model / lean muscle",
    weight_loss: "weight loss",
    athletic: "athletic performance",
    recovery: "recovery and mobility",
    general: "general fitness",
  };

  return labels[goal] || "general fitness";
}

function labelLocation(location) {
  const labels = {
    gym: "gym",
    home: "home",
    outside: "outside",
    limited_equipment: "limited equipment",
  };

  return labels[location] || "your available setup";
}

function labelIntensity(intensity) {
  const labels = {
    push: "push hard",
    balanced: "balanced",
    careful: "careful and joint-smart",
  };

  return labels[intensity] || "balanced";
}

export function getMissingCoachProfileFields(profile = {}) {
  const missing = [];

  if (!profile.goal) missing.push("goal");
  if (!profile.location) missing.push("training location");
  if (!profile.days_per_week) missing.push("days this week");
  if (!profile.time_available_minutes) missing.push("time per workout");
  if (!profile.intensity) missing.push("intensity");

  return missing;
}

function buildExercise(name, sets, reps, extra = {}) {
  return {
    id: `ex_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name,
    sets,
    reps,
    rest_seconds: extra.rest_seconds || 75,
    notes: extra.notes || "",
    target: extra.target || "",
    equipment: extra.equipment || "",
  };
}

function getPlanTemplates(profile = {}) {
  const goal = profile.goal || "general";
  const location = profile.location || "gym";
  const careful = profile.intensity === "careful" || goal === "recovery";
  const preferred = Array.isArray(profile.preferred_exercises)
    ? profile.preferred_exercises
    : [];

  const hasGym = location === "gym";
  const hasLimited = location === "home" || location === "limited_equipment";

  const warmup = [
    buildExercise("Dynamic Warm-Up", 1, "5-8 min", {
      rest_seconds: 30,
      notes: "Move slow at first, then build heat. Hips, shoulders, ankles, and core.",
      target: "prep",
    }),
  ];

  const cooldown = [
    buildExercise("Cooldown Mobility", 1, "5 min", {
      rest_seconds: 30,
      notes: "Breathing down, hips loose, chest open, no rushing out.",
      target: "recovery",
    }),
  ];

  if (goal === "strength") {
    return {
      day1: {
        title: "Upper Strength",
        focus: "Chest, shoulders, triceps",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Bench Press" : "Push-Ups", 4, "5-8", {
            rest_seconds: 120,
            notes: "Controlled reps. Leave 1-2 reps in the tank unless pain-free and strong.",
            target: "strength",
          }),
          buildExercise(
            hasGym ? "Incline Dumbbell Press" : "Elevated Push-Ups",
            3,
            "8-10",
            {
              rest_seconds: 90,
              target: "upper chest",
            }
          ),
          buildExercise(hasGym ? "Chest Fly" : "Band Chest Fly", 3, "10-12", {
            rest_seconds: 75,
            target: "chest",
          }),
          buildExercise(hasGym ? "Seated Row" : "Band Row", 3, "10-12", {
            rest_seconds: 75,
            target: "back balance",
          }),
          buildExercise("Plank", 3, "30-45 sec", {
            rest_seconds: 60,
            target: "core",
          }),
          ...cooldown,
        ],
      },
      day2: {
        title: "Lower Strength + Athletic Base",
        focus: "Legs, hips, core",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Leg Press" : "Box Squat", 4, "8-10", {
            rest_seconds: 120,
            notes: careful
              ? "Pain-free range only. Control the bottom."
              : "Strong drive, controlled bottom.",
            target: "legs",
          }),
          buildExercise(
            hasGym ? "Romanian Deadlift" : "Dumbbell Romanian Deadlift",
            3,
            "8-10",
            {
              rest_seconds: 90,
              target: "hamstrings",
            }
          ),
          buildExercise("Step-Ups", 3, "8 each leg", {
            rest_seconds: 75,
            notes: "Own the balance. No hip collapse.",
            target: "glutes",
          }),
          buildExercise("Dead Bug", 3, "10 each side", {
            rest_seconds: 45,
            target: "core control",
          }),
          ...cooldown,
        ],
      },
      day3: {
        title: "Full Body Strength",
        focus: "Total body",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Dumbbell Bench Press" : "Push-Ups", 3, "8-10", {
            rest_seconds: 90,
            target: "chest",
          }),
          buildExercise(hasGym ? "Lat Pulldown" : "Band Pulldown", 3, "10-12", {
            rest_seconds: 75,
            target: "back",
          }),
          buildExercise(hasGym ? "Goblet Squat" : "Bodyweight Squat", 3, "10", {
            rest_seconds: 90,
            target: "legs",
          }),
          buildExercise("Farmer Carry", 4, "30-40 sec", {
            rest_seconds: 60,
            notes: hasLimited
              ? "Use dumbbells, kettlebells, loaded bags, or anything safe to carry."
              : "Tall posture, tight core.",
            target: "core",
          }),
          ...cooldown,
        ],
      },
    };
  }

  if (goal === "fitness_model") {
    return {
      day1: {
        title: "Chest + Abs Detail",
        focus: "Chest, shoulders, abs",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Incline Dumbbell Press" : "Incline Push-Ups", 4, "8-12", {
            rest_seconds: 90,
            target: "upper chest",
          }),
          buildExercise(hasGym ? "Bench Press" : "Push-Ups", 3, "8-12", {
            rest_seconds: 90,
            target: "chest",
          }),
          buildExercise(hasGym ? "Cable Chest Fly" : "Band Chest Fly", 3, "12-15", {
            rest_seconds: 60,
            target: "chest shape",
          }),
          buildExercise("Lateral Raises", 3, "12-15", {
            rest_seconds: 60,
            target: "shoulders",
          }),
          buildExercise("Hanging Knee Raise", 3, "10-15", {
            rest_seconds: 60,
            notes: hasGym ? "" : "Swap for reverse crunches if training at home.",
            target: "abs",
          }),
          ...cooldown,
        ],
      },
      day2: {
        title: "Back + Athletic Core",
        focus: "Back, posture, core",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Lat Pulldown" : "Band Pulldown", 4, "10-12", {
            rest_seconds: 75,
            target: "lats",
          }),
          buildExercise(hasGym ? "Seated Row" : "Band Row", 4, "10-12", {
            rest_seconds: 75,
            target: "back thickness",
          }),
          buildExercise("Rear Delt Fly", 3, "12-15", {
            rest_seconds: 60,
            target: "rear delts",
          }),
          buildExercise("Pallof Press", 3, "10 each side", {
            rest_seconds: 45,
            target: "core stability",
          }),
          buildExercise("Incline Walk", 1, "12-20 min", {
            rest_seconds: 30,
            target: "conditioning",
          }),
          ...cooldown,
        ],
      },
      day3: {
        title: "Legs + Conditioning",
        focus: "Legs, glutes, calorie burn",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Leg Press" : "Goblet Squat", 4, "10-12", {
            rest_seconds: 90,
            target: "quads",
          }),
          buildExercise("Romanian Deadlift", 3, "10-12", {
            rest_seconds: 90,
            target: "hamstrings",
          }),
          buildExercise("Walking Lunges", 3, "10 each leg", {
            rest_seconds: 75,
            notes: careful ? "Swap for step-ups if hips complain." : "",
            target: "legs",
          }),
          buildExercise("Calf Raises", 3, "15-20", {
            rest_seconds: 45,
            target: "calves",
          }),
          buildExercise("Bike or Walk Finisher", 1, "10-15 min", {
            rest_seconds: 30,
            target: "conditioning",
          }),
          ...cooldown,
        ],
      },
    };
  }

  if (goal === "athletic") {
    return {
      day1: {
        title: "Athletic Power Upper",
        focus: "Upper power, core, shoulder health",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Bench Press" : "Explosive Push-Ups", 4, "5-8", {
            rest_seconds: 120,
            target: "upper power",
          }),
          buildExercise(hasGym ? "Single-Arm Dumbbell Row" : "Band Row", 3, "8 each side", {
            rest_seconds: 75,
            target: "back",
          }),
          buildExercise("Medicine Ball Slam", 4, "6-8", {
            rest_seconds: 60,
            notes: "Explosive reps. Swap for fast band rows if no med ball.",
            target: "power",
          }),
          buildExercise("Pallof Press", 3, "10 each side", {
            rest_seconds: 45,
            target: "rotational control",
          }),
          ...cooldown,
        ],
      },
      day2: {
        title: "Hips + Lower Body Engine",
        focus: "Lower strength, hips, field durability",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Trap Bar Deadlift" : "Goblet Squat", 4, "5-8", {
            rest_seconds: 120,
            notes: careful ? "Pain-free range. No ego reps." : "Explode up, control down.",
            target: "lower power",
          }),
          buildExercise("Step-Ups", 3, "8 each leg", {
            rest_seconds: 75,
            target: "single-leg strength",
          }),
          buildExercise("Lateral Band Walk", 3, "12 each way", {
            rest_seconds: 45,
            target: "hip stability",
          }),
          buildExercise("Dead Bug", 3, "10 each side", {
            rest_seconds: 45,
            target: "core",
          }),
          ...cooldown,
        ],
      },
      day3: {
        title: "Conditioning + Mobility",
        focus: "Movement quality, stamina, recovery",
        exercises: [
          ...warmup,
          buildExercise("Tempo Walk or Bike", 1, "20-30 min", {
            rest_seconds: 30,
            target: "conditioning",
          }),
          buildExercise("Hip Mobility Flow", 2, "6-8 min", {
            rest_seconds: 30,
            target: "mobility",
          }),
          buildExercise("Core Circuit", 3, "8-12 reps each", {
            rest_seconds: 60,
            notes: "Plank, side plank, dead bug.",
            target: "core",
          }),
          ...cooldown,
        ],
      },
    };
  }

  if (goal === "weight_loss") {
    return {
      day1: {
        title: "Full Body Burn",
        focus: "Strength plus calorie burn",
        exercises: [
          ...warmup,
          buildExercise(hasGym ? "Goblet Squat" : "Bodyweight Squat", 3, "12", {
            rest_seconds: 60,
            target: "legs",
          }),
          buildExercise(hasGym ? "Dumbbell Bench Press" : "Push-Ups", 3, "10-12", {
            rest_seconds: 60,
            target: "chest",
          }),
          buildExercise(hasGym ? "Seated Row" : "Band Row", 3, "12", {
            rest_seconds: 60,
            target: "back",
          }),
          buildExercise("Incline Walk", 1, "15-25 min", {
            rest_seconds: 30,
            target: "conditioning",
          }),
          ...cooldown,
        ],
      },
      day2: {
        title: "Low Impact Conditioning",
        focus: "Fat loss, joint-friendly movement",
        exercises: [
          ...warmup,
          buildExercise("Bike, Walk, or Elliptical", 1, "25-35 min", {
            rest_seconds: 30,
            target: "conditioning",
          }),
          buildExercise("Core Stability", 3, "10 each", {
            rest_seconds: 45,
            notes: "Dead bug, plank, side plank.",
            target: "core",
          }),
          ...cooldown,
        ],
      },
      day3: {
        title: "Upper + Lower Circuit",
        focus: "Muscle retention and sweat",
        exercises: [
          ...warmup,
          buildExercise("Circuit Round", 4, "8-12 reps", {
            rest_seconds: 90,
            notes:
              "Squat, press, row, carry. Move with control and keep rest honest.",
            target: "full body",
          }),
          buildExercise("Finisher Walk", 1, "10-15 min", {
            rest_seconds: 30,
            target: "conditioning",
          }),
          ...cooldown,
        ],
      },
    };
  }

  if (goal === "recovery") {
    return {
      day1: {
        title: "Recovery Strength",
        focus: "Joint-friendly strength",
        exercises: [
          ...warmup,
          buildExercise("Box Squat", 3, "8-10", {
            rest_seconds: 90,
            notes: "Pain-free range only.",
            target: "legs",
          }),
          buildExercise("Incline Push-Ups", 3, "8-12", {
            rest_seconds: 75,
            target: "upper body",
          }),
          buildExercise("Band Row", 3, "10-12", {
            rest_seconds: 60,
            target: "back",
          }),
          buildExercise("Dead Bug", 3, "8 each side", {
            rest_seconds: 45,
            target: "core",
          }),
          ...cooldown,
        ],
      },
      day2: {
        title: "Mobility + Conditioning",
        focus: "Move better, recover faster",
        exercises: [
          ...warmup,
          buildExercise("Easy Walk or Bike", 1, "20-30 min", {
            rest_seconds: 30,
            target: "conditioning",
          }),
          buildExercise("Hip Mobility Flow", 2, "8 min", {
            rest_seconds: 30,
            target: "hips",
          }),
          buildExercise("Glute Bridge", 3, "10-12", {
            rest_seconds: 45,
            target: "glutes",
          }),
          ...cooldown,
        ],
      },
      day3: {
        title: "Controlled Full Body",
        focus: "Strength without flare-ups",
        exercises: [
          ...warmup,
          buildExercise("Step-Ups", 3, "8 each side", {
            rest_seconds: 75,
            target: "single-leg control",
          }),
          buildExercise("Dumbbell Floor Press", 3, "10", {
            rest_seconds: 75,
            target: "chest",
          }),
          buildExercise("Supported Row", 3, "10-12", {
            rest_seconds: 60,
            target: "back",
          }),
          buildExercise("Pallof Press", 3, "10 each side", {
            rest_seconds: 45,
            target: "core",
          }),
          ...cooldown,
        ],
      },
    };
  }

  return {
    day1: {
      title: "Full Body Foundation",
      focus: "Strength and consistency",
      exercises: [
        ...warmup,
        buildExercise(hasGym ? "Goblet Squat" : "Bodyweight Squat", 3, "10-12", {
          rest_seconds: 75,
          target: "legs",
        }),
        buildExercise(hasGym ? "Dumbbell Press" : "Push-Ups", 3, "8-12", {
          rest_seconds: 75,
          target: "chest",
        }),
        buildExercise(hasGym ? "Seated Row" : "Band Row", 3, "10-12", {
          rest_seconds: 75,
          target: "back",
        }),
        buildExercise("Plank", 3, "30-45 sec", {
          rest_seconds: 45,
          target: "core",
        }),
        ...cooldown,
      ],
    },
    day2: {
      title: "Conditioning + Core",
      focus: "Heart, steps, core",
      exercises: [
        ...warmup,
        buildExercise("Walk, Bike, or Elliptical", 1, "20-30 min", {
          rest_seconds: 30,
          target: "conditioning",
        }),
        buildExercise("Core Circuit", 3, "8-12 reps", {
          rest_seconds: 60,
          notes: "Dead bug, plank, side plank.",
          target: "core",
        }),
        ...cooldown,
      ],
    },
    day3: {
      title: "Upper + Lower Builder",
      focus: "Total body progress",
      exercises: [
        ...warmup,
        buildExercise(hasGym ? "Leg Press" : "Step-Ups", 3, "10", {
          rest_seconds: 75,
          target: "legs",
        }),
        buildExercise(hasGym ? "Lat Pulldown" : "Band Pulldown", 3, "10-12", {
          rest_seconds: 75,
          target: "back",
        }),
        buildExercise(hasGym ? "Chest Fly" : "Band Chest Fly", 3, "12", {
          rest_seconds: 60,
          target: "chest",
        }),
        ...cooldown,
      ],
    },
  };
}

function chooseDays(daysPerWeek) {
  const count = Math.max(1, Math.min(Number(daysPerWeek || 3), 6));

  if (count === 1) return ["Day 1"];
  if (count === 2) return ["Day 1", "Day 2"];
  if (count === 3) return ["Day 1", "Day 2", "Day 3"];
  if (count === 4) return ["Day 1", "Day 2", "Day 3", "Day 4"];
  if (count === 5) return ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

  return ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"];
}

function cloneWorkoutFromTemplate(template, index, profile) {
  const duration =
    Number(profile.time_available_minutes) > 0
      ? Number(profile.time_available_minutes)
      : 45;

  return {
    id: `coach_workout_${Date.now()}_${index + 1}`,
    day_label: `Day ${index + 1}`,
    title: template.title,
    focus: template.focus,
    duration_minutes: duration,
    intensity: profile.intensity || "balanced",
    location: profile.location || "gym",
    status: "planned",
    source: "coach_chat",
    created_at: NOW(),
    exercises: template.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      id: `${exercise.id}_${index + 1}_${exerciseIndex + 1}`,
      completed: false,
      skipped: false,
      substituted: false,
      planned_sets: exercise.sets,
      planned_reps: exercise.reps,
    })),
  };
}

export function buildPlanProposal(profile = {}, options = {}) {
  const templates = getPlanTemplates(profile);
  const dayLabels = chooseDays(profile.days_per_week || 3);
  const templateValues = Object.values(templates);

  const workouts = dayLabels.map((label, index) => {
    const template = templateValues[index % templateValues.length];
    return {
      ...cloneWorkoutFromTemplate(template, index, profile),
      day_label: label,
    };
  });

  const proposal = {
    id: `coach_plan_${Date.now()}`,
    status: "proposed",
    created_at: NOW(),
    updated_at: NOW(),
    source: "coach_chat",
    summary: `A ${workouts.length}-day ${labelGoal(profile.goal)} plan built for ${labelLocation(
      profile.location
    )}, ${profile.time_available_minutes || 45} minutes per workout, with a ${labelIntensity(
      profile.intensity
    )} coaching style.`,
    coach_note: buildCoachPlanNote(profile, workouts),
    profile_used: {
      goal: profile.goal || "general",
      location: profile.location || "gym",
      days_per_week: Number(profile.days_per_week || workouts.length),
      time_available_minutes: Number(profile.time_available_minutes || 45),
      intensity: profile.intensity || "balanced",
      pain_limits: profile.pain_limits || "",
      preferred_exercises: Array.isArray(profile.preferred_exercises)
        ? profile.preferred_exercises
        : [],
    },
    workouts,
    version: options.version || "7A-local-smart-coach",
  };

  return proposal;
}

function buildCoachPlanNote(profile, workouts) {
  const pain = profile.pain_limits
    ? ` I also caught this limitation: "${profile.pain_limits}". Keep anything painful out of the workout and substitute early.`
    : "";

  const preferred =
    Array.isArray(profile.preferred_exercises) &&
    profile.preferred_exercises.length > 0
      ? ` I included your preferred movement style where it fits: ${profile.preferred_exercises.join(
          ", "
        )}.`
      : "";

  return `Here's the plan I'd put you on this week. It is built to get you moving, not sitting around thinking about it. Start controlled, track your effort, and we will adjust after the workout data comes in.${pain}${preferred}`;
}

export function buildCoachReplyAfterUserMessage(profile = {}, proposal = null) {
  const missing = getMissingCoachProfileFields(profile);

  if (missing.length > 0) {
    return createCoachMessage(
      `Good. I'm building the picture, but I still need: ${missing.join(
        ", "
      )}. Send that in one message and I'll build the plan.`
    );
  }

  if (proposal) {
    return createCoachMessage(
      `I built your plan. Do you agree and are you ready to start? If yes, hit Add to Planner. If not, hit Redo Plan or open the questionnaire so we can tighten it up.`
    );
  }

  return createCoachMessage(
    "I have enough to build your plan. Give me one more sentence with anything specific you want included or avoided, or tell me to build it now."
  );
}

export function shouldGeneratePlanFromInput(input, profile = {}) {
  const text = String(input || "").toLowerCase();
  const missing = getMissingCoachProfileFields(profile);

  if (missing.length > 0) return false;

  return (
    includesAny(text, [
      "build",
      "make",
      "create",
      "plan",
      "start",
      "ready",
      "go",
      "yes",
      "do it",
      "let's go",
      "lets go",
    ]) || text.length > 18
  );
}

export function runLocalCoachTurn({ snapshot = {}, userText = "" }) {
  const cleanText = String(userText || "").trim();

  if (!cleanText) {
    return {
      snapshot,
      userMessage: null,
      coachMessage: createCoachMessage("Send me what you're chasing first."),
      proposal: snapshot.coach_plan_proposal || null,
    };
  }

  const currentChat = normalizeCoachChat(snapshot);
  const baseProfile = buildCoachProfileFromSnapshot(snapshot);
  const previousCoachProfile = snapshot.coach_profile || {};
  const mergedBaseProfile = {
    ...baseProfile,
    ...previousCoachProfile,
  };

  const nextCoachProfile = inferCoachProfileFromText(cleanText, mergedBaseProfile);
  const userMessage = createUserMessage(cleanText);

  let proposal = snapshot.coach_plan_proposal || null;

  if (shouldGeneratePlanFromInput(cleanText, nextCoachProfile)) {
    proposal = buildPlanProposal(nextCoachProfile);
  }

  const coachMessage = buildCoachReplyAfterUserMessage(nextCoachProfile, proposal);

  const nextChat = [...currentChat, userMessage, coachMessage];

  const nextSnapshot = {
    ...snapshot,
    coach_profile: nextCoachProfile,
    coach_chat: nextChat,
    coach_plan_proposal: proposal,
    last_coach_summary: proposal?.summary || snapshot.last_coach_summary || "",
    updated_at: NOW(),
  };

  return {
    snapshot: nextSnapshot,
    userMessage,
    coachMessage,
    proposal,
  };
}

export function clearCoachPlanProposal(snapshot = {}) {
  return {
    ...snapshot,
    coach_plan_proposal: null,
    last_coach_summary:
      snapshot.last_coach_summary ||
      "Coach plan proposal cleared. Ready for a new plan.",
    updated_at: NOW(),
  };
}

export function resetCoachChat(snapshot = {}) {
  return {
    ...snapshot,
    coach_chat: [getInitialCoachMessage()],
    coach_plan_proposal: null,
    last_coach_summary: "",
    updated_at: NOW(),
  };
}

export function addCoachProposalToPlanner(snapshot = {}, proposal = null) {
  const safeProposal = proposal || snapshot.coach_plan_proposal;

  if (!safeProposal || !Array.isArray(safeProposal.workouts)) {
    return {
      snapshot,
      added: false,
      message: "No coach plan proposal was found.",
    };
  }

  const existingWeekPlan = snapshot.week_plan || {};
  const existingWorkouts = Array.isArray(existingWeekPlan.workouts)
    ? existingWeekPlan.workouts
    : Array.isArray(existingWeekPlan.days)
      ? existingWeekPlan.days
      : [];

  const plannedWorkouts = safeProposal.workouts.map((workout, index) => ({
    ...workout,
    id: workout.id || `planned_coach_workout_${Date.now()}_${index + 1}`,
    status: "planned",
    added_to_planner_at: NOW(),
    source: "coach_chat",
  }));

  const nextWeekPlan = {
    ...existingWeekPlan,
    id: existingWeekPlan.id || `week_plan_${Date.now()}`,
    source: "coach_chat",
    updated_at: NOW(),
    coach_plan_id: safeProposal.id,
    summary: safeProposal.summary,
    workouts: [...existingWorkouts, ...plannedWorkouts],
    days: [...existingWorkouts, ...plannedWorkouts],
  };

  const confirmation = createCoachMessage(
    "Done. I added this plan to your weekly planner. Next step is starting the workout and tracking sets, reps, weight, rest time, pain score, and difficulty so I can adjust the next plan like a real trainer."
  );

  const nextChat = [...normalizeCoachChat(snapshot), confirmation];

  return {
    added: true,
    message: "Plan added to planner.",
    snapshot: {
      ...snapshot,
      week_plan: nextWeekPlan,
      coach_chat: nextChat,
      coach_plan_proposal: {
        ...safeProposal,
        status: "added_to_planner",
        added_to_planner_at: NOW(),
        updated_at: NOW(),
      },
      last_coach_summary: safeProposal.summary,
      updated_at: NOW(),
    },
  };
}

export function formatCoachPlanForDisplay(proposal = null) {
  if (!proposal || !Array.isArray(proposal.workouts)) {
    return [];
  }

  return proposal.workouts.map((workout) => ({
    id: workout.id,
    title: workout.title,
    day_label: workout.day_label,
    focus: workout.focus,
    duration_minutes: workout.duration_minutes,
    exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
  }));
}
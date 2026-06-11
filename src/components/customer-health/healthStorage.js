// src/components/customer-health/healthStorage.js

export const STRIPE_HEALTH_CHECKOUT_URL = "https://buy.stripe.com/4gMfZh0Y2ar5aT70Kn2Nq0b";
export const HEALTH_LOGO_URL = "/brands/health.jpg";

export const SNAPSHOT_KEY = "sw_customer_health_snapshot_v1";
export const WORKOUTS_KEY = "sw_customer_health_workouts_v1";
export const PROFILE_KEY = "sw_customer_health_profile_v1";
export const HISTORY_KEY = "sw_customer_health_history_v1";
export const PROGRESS_KEY = "sw_customer_health_progress_v1";
export const DEVICE_KEY = "sw_customer_health_devices_v1";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function safeNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function clampPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

export function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export function prettyDate(value) {
  if (!value) return "Today";

  try {
    const d = new Date(`${value}T00:00:00`);

    if (!Number.isFinite(d.getTime())) {
      return String(value);
    }

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

export function readinessTone(readiness = "") {
  const r = String(readiness || "").toLowerCase();

  if (r.includes("ready")) return "emerald";
  if (r.includes("moderate")) return "cyan";
  if (r.includes("recovery")) return "amber";
  if (r.includes("pain") || r.includes("limit")) return "rose";

  return "slate";
}

export function readinessSuggestion(readiness = "") {
  const r = String(readiness || "").toLowerCase();

  if (r.includes("ready")) {
    return "Ready to train. Push the planned workout, but keep form clean and log difficulty.";
  }

  if (r.includes("moderate")) {
    return "Train normally, but avoid forcing max effort. Progress only if reps feel clean.";
  }

  if (r.includes("recovery")) {
    return "Lower the volume. Use walking, mobility, light strength, and recovery work.";
  }

  if (r.includes("pain") || r.includes("limit")) {
    return "Protect the body today. Avoid painful ranges and reduce load or intensity.";
  }

  return "Log readiness so the coach can adjust the day.";
}

export function defaultProfile() {
  return {
    primary_goal: "General fitness",
    goal_detail: "",
    inspiration_goal: "Best version of me",
    body_goal: "Lean and healthy",
    sport: "",
    training_identity: "Everyday athlete",

    age: "",
    height_ft: "",
    height_in: "",
    weight: "",
    target_weight: "",
    sex: "",
    activity_level: "Moderate",

    experience: "Beginner",
    training_days: "3",
    preferred_time: "30 minutes",
    preferred_equipment: "Bodyweight",
    training_location: "Home",
    schedule_style: "Flexible",

    coaching_intensity: "Balanced",
    accountability_level: "Normal",
    progression_preference: "Auto",
    nutrition_focus: "Protein and consistency",

    weak_areas: [],
    limitations: "",
    avoid_movements: "",
    medical_clearance: "Not needed",
    notes: "",
  };
}

export function defaultSnapshot() {
  return {
    workout: "",
    today_workout_id: "",
    readiness: "Moderate",
    time_available: "30 minutes",
    equipment: "Bodyweight",
    goal: "General fitness",

    steps: "",
    step_goal: "8000",
    calories: "",
    calorie_goal: "2200",
    protein_today: "",
    protein_goal: "150",
    water: "",
    water_goal: "100",
    weight: "",

    completed_workouts: 0,
    planned_workouts: 0,
    weekly_completed: 0,
    progress_count: 0,

    user_path: "",
    progression_cadence: "",
    next_session_note: "",
    last_completed_workout: "",
    last_completed_at: "",

    notes: "",
  };
}

export function defaultDevices() {
  return [
    {
      id: "apple-health",
      name: "Apple Health",
      status: "Manual tracking active",
      description: "Future connection for steps, workouts, heart rate, sleep, and calories.",
    },
    {
      id: "google-fit",
      name: "Google Fit",
      status: "Manual tracking active",
      description: "Future connection for Android health and activity data.",
    },
    {
      id: "fitbit",
      name: "Fitbit",
      status: "Manual tracking active",
      description: "Future connection for steps, workouts, recovery, and sleep.",
    },
    {
      id: "garmin",
      name: "Garmin",
      status: "Manual tracking active",
      description: "Future connection for performance, recovery, and endurance data.",
    },
  ];
}

export const EXERCISE_LIBRARY = [
  {
    group: "Chest",
    items: [
      {
        name: "Push-Up",
        feel: "Chest, shoulders, triceps, and core tension.",
        mistake: "Letting hips sag or elbows flare too wide.",
        equipment: "Bodyweight",
        sets: "3",
        reps: "8-15",
      },
      {
        name: "Incline Push-Up",
        feel: "Chest and shoulders with less bodyweight load.",
        mistake: "Rushing reps or losing a straight body line.",
        equipment: "Bench / counter",
        sets: "3",
        reps: "8-15",
      },
      {
        name: "Dumbbell Bench Press",
        feel: "Chest pressing with shoulder control.",
        mistake: "Bouncing the weight or letting shoulders roll forward.",
        equipment: "Dumbbells",
        sets: "3",
        reps: "8-12",
      },
      {
        name: "Cable Chest Fly",
        feel: "Chest squeeze with controlled shoulder position.",
        mistake: "Overstretching shoulders or bending elbows too much.",
        equipment: "Cable",
        sets: "3",
        reps: "10-15",
      },
    ],
  },
  {
    group: "Back",
    items: [
      {
        name: "One Arm Row",
        feel: "Lat, upper back, and shoulder blade pulling back.",
        mistake: "Twisting the torso instead of rowing with the back.",
        equipment: "Dumbbell",
        sets: "3",
        reps: "8-12 each",
      },
      {
        name: "Band Row",
        feel: "Upper back squeeze and posture control.",
        mistake: "Shrugging shoulders up toward ears.",
        equipment: "Band",
        sets: "3",
        reps: "12-15",
      },
      {
        name: "Lat Pulldown",
        feel: "Lats pulling elbows down toward ribs.",
        mistake: "Leaning too far back or using momentum.",
        equipment: "Machine",
        sets: "3",
        reps: "8-12",
      },
      {
        name: "Chest Supported Row",
        feel: "Upper back and lats without low-back stress.",
        mistake: "Jerking the weight instead of squeezing.",
        equipment: "Machine / dumbbells",
        sets: "3",
        reps: "8-12",
      },
    ],
  },
  {
    group: "Shoulders",
    items: [
      {
        name: "Lateral Raise",
        feel: "Side delts lifting the arms.",
        mistake: "Swinging the weights or shrugging.",
        equipment: "Dumbbells",
        sets: "3",
        reps: "10-15",
      },
      {
        name: "Shoulder Press",
        feel: "Shoulders and triceps pressing overhead.",
        mistake: "Arching low back or forcing painful range.",
        equipment: "Dumbbells",
        sets: "3",
        reps: "8-12",
      },
      {
        name: "Face Pull / Band Pull-Apart",
        feel: "Rear delts, upper back, and shoulder blade control.",
        mistake: "Pulling with traps instead of rear shoulders.",
        equipment: "Band / cable",
        sets: "3",
        reps: "12-15",
      },
      {
        name: "Rear Delt Fly",
        feel: "Back of shoulders and upper back.",
        mistake: "Swinging arms instead of controlling the raise.",
        equipment: "Dumbbells / machine",
        sets: "3",
        reps: "12-15",
      },
    ],
  },
  {
    group: "Legs",
    items: [
      {
        name: "Bodyweight Squat",
        feel: "Quads, glutes, and full foot pressure.",
        mistake: "Knees collapsing inward or rushing depth.",
        equipment: "Bodyweight",
        sets: "3",
        reps: "8-15",
      },
      {
        name: "Goblet Squat",
        feel: "Quads, glutes, core brace, and controlled depth.",
        mistake: "Losing brace or letting chest collapse.",
        equipment: "Dumbbell / kettlebell",
        sets: "3",
        reps: "8-12",
      },
      {
        name: "Reverse Lunge",
        feel: "Glutes, quads, balance, and hip control.",
        mistake: "Pushing off the back leg too much.",
        equipment: "Bodyweight / dumbbells",
        sets: "3",
        reps: "8-10 each",
      },
      {
        name: "Romanian Deadlift",
        feel: "Hamstrings, glutes, and hip hinge.",
        mistake: "Rounding the back or turning it into a squat.",
        equipment: "Dumbbells / barbell",
        sets: "3",
        reps: "8-12",
      },
      {
        name: "Step-Up",
        feel: "Glutes, quads, balance, and single-leg control.",
        mistake: "Pushing too much from the trailing leg.",
        equipment: "Box / bench",
        sets: "3",
        reps: "8-10 each",
      },
    ],
  },
  {
    group: "Arms",
    items: [
      {
        name: "Biceps Curl",
        feel: "Biceps working without shoulder swing.",
        mistake: "Using momentum instead of controlled reps.",
        equipment: "Dumbbells / band",
        sets: "3",
        reps: "10-12",
      },
      {
        name: "Triceps Pressdown",
        feel: "Triceps locking elbows down and back.",
        mistake: "Moving the shoulders instead of elbows.",
        equipment: "Cable / band",
        sets: "3",
        reps: "10-15",
      },
      {
        name: "Hammer Curl",
        feel: "Biceps, forearms, and grip.",
        mistake: "Swinging or shortening the range.",
        equipment: "Dumbbells",
        sets: "3",
        reps: "10-12",
      },
      {
        name: "Overhead Triceps Extension",
        feel: "Long head of triceps with shoulder control.",
        mistake: "Flaring ribs or forcing shoulder range.",
        equipment: "Dumbbell / cable",
        sets: "3",
        reps: "10-15",
      },
    ],
  },
  {
    group: "Core",
    items: [
      {
        name: "Dead Bug",
        feel: "Deep core brace while limbs move.",
        mistake: "Low back arching off the floor.",
        equipment: "Bodyweight",
        sets: "3",
        reps: "8-10 each",
      },
      {
        name: "Plank",
        feel: "Core, glutes, and full-body tension.",
        mistake: "Sagging hips or holding breath.",
        equipment: "Bodyweight",
        sets: "3",
        reps: "20-45 sec",
      },
      {
        name: "Farmer Carry",
        feel: "Grip, core, posture, and breathing control.",
        mistake: "Leaning or rushing steps.",
        equipment: "Dumbbells / kettlebells",
        sets: "4",
        reps: "30 sec",
      },
      {
        name: "Pallof Press",
        feel: "Core resisting rotation.",
        mistake: "Letting the band twist the body.",
        equipment: "Band / cable",
        sets: "3",
        reps: "10-12 each",
      },
    ],
  },
  {
    group: "Cardio",
    items: [
      {
        name: "Walk",
        feel: "Easy conditioning, steps, and recovery.",
        mistake: "Going too hard on a recovery day.",
        equipment: "None",
        sets: "1",
        reps: "10-30 min",
      },
      {
        name: "Bike Intervals",
        feel: "Leg drive and controlled conditioning.",
        mistake: "Starting too fast and fading early.",
        equipment: "Bike",
        sets: "6",
        reps: "20-30 sec",
      },
      {
        name: "Sprint / Bike Intervals",
        feel: "Explosive effort with controlled recovery.",
        mistake: "Doing max effort without warm-up.",
        equipment: "Track / bike",
        sets: "6",
        reps: "20 sec",
      },
      {
        name: "Zone 2 Cardio",
        feel: "Steady breathing and sustainable pace.",
        mistake: "Turning an easy conditioning day into a hard workout.",
        equipment: "Walk / bike / rower",
        sets: "1",
        reps: "20-45 min",
      },
    ],
  },
  {
    group: "Mobility",
    items: [
      {
        name: "Hip Mobility Flow",
        feel: "Hips opening without pain.",
        mistake: "Forcing range instead of controlling it.",
        equipment: "Bodyweight",
        sets: "2",
        reps: "60 sec",
      },
      {
        name: "Glute Bridge",
        feel: "Glutes lifting hips, not low back.",
        mistake: "Overarching the lower back.",
        equipment: "Bodyweight",
        sets: "3",
        reps: "10-15",
      },
      {
        name: "Child's Pose Breathing",
        feel: "Back, hips, ribs, and breathing reset.",
        mistake: "Holding tension instead of relaxing.",
        equipment: "Bodyweight",
        sets: "2",
        reps: "60 sec",
      },
      {
        name: "World's Greatest Stretch",
        feel: "Hips, hamstrings, upper back, and rotation.",
        mistake: "Rushing through without controlling position.",
        equipment: "Bodyweight",
        sets: "2",
        reps: "5 each",
      },
    ],
  },
];

export const PROGRAM_TEMPLATES = [
  {
    id: "beginner-general",
    name: "Beginner 3-Day Foundation",
    description: "Simple strength, walking, and mobility for new users or people restarting.",
    workouts: [
      {
        name: "Foundation Day A",
        duration: "30",
        focus: "Full Body",
        status: "Planned",
        exercises: [
          {
            name: "Bodyweight Squat",
            sets: "3",
            reps: "8",
            weight: "",
            rest: "60 sec",
            notes: "Smooth reps",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Incline Push-Up",
            sets: "3",
            reps: "8",
            weight: "",
            rest: "60 sec",
            notes: "Control shoulders",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Glute Bridge",
            sets: "3",
            reps: "10",
            weight: "",
            rest: "45 sec",
            notes: "Feel glutes",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Walk",
            sets: "1",
            reps: "10 min",
            weight: "",
            rest: "",
            notes: "Easy pace",
            difficulty: "Easy",
            pain: "0",
          },
        ],
      },
    ],
  },
  {
    id: "fitness-model",
    name: "Fitness Model Lean Build",
    description: "Lean muscle, conditioning, protein consistency, and visible progress.",
    workouts: [
      {
        name: "Lean Upper Body",
        duration: "45",
        focus: "Hypertrophy",
        status: "Planned",
        exercises: [
          {
            name: "Dumbbell Bench Press",
            sets: "3",
            reps: "10",
            weight: "",
            rest: "75 sec",
            notes: "Controlled tempo",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "One Arm Row",
            sets: "3",
            reps: "10",
            weight: "",
            rest: "75 sec",
            notes: "Squeeze back",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Lateral Raise",
            sets: "3",
            reps: "12",
            weight: "",
            rest: "45 sec",
            notes: "Shoulders",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Plank",
            sets: "3",
            reps: "30 sec",
            weight: "",
            rest: "45 sec",
            notes: "Brace",
            difficulty: "Medium",
            pain: "0",
          },
        ],
      },
    ],
  },
  {
    id: "athlete-polamalu",
    name: "Athletic Performance",
    description: "Explosive movement, hips, core, conditioning, and body control.",
    workouts: [
      {
        name: "Athletic Movement Day",
        duration: "40",
        focus: "Sport Performance",
        status: "Planned",
        exercises: [
          {
            name: "Goblet Squat",
            sets: "3",
            reps: "8",
            weight: "",
            rest: "90 sec",
            notes: "Powerful but controlled",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Reverse Lunge",
            sets: "3",
            reps: "8 each",
            weight: "",
            rest: "75 sec",
            notes: "Balance and hips",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Dead Bug",
            sets: "3",
            reps: "10 each",
            weight: "",
            rest: "45 sec",
            notes: "Core control",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Sprint / Bike Intervals",
            sets: "6",
            reps: "20 sec",
            weight: "",
            rest: "70 sec",
            notes: "Explosive",
            difficulty: "Hard",
            pain: "0",
          },
        ],
      },
    ],
  },
  {
    id: "strong-harrison",
    name: "Strength Build",
    description: "Strength-first training with controlled overload and recovery checks.",
    workouts: [
      {
        name: "Strength Day A",
        duration: "50",
        focus: "Strength",
        status: "Planned",
        exercises: [
          {
            name: "Squat Pattern",
            sets: "4",
            reps: "5",
            weight: "",
            rest: "2 min",
            notes: "Strong form",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Bench Press Pattern",
            sets: "4",
            reps: "5",
            weight: "",
            rest: "2 min",
            notes: "Controlled press",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Row Pattern",
            sets: "4",
            reps: "6",
            weight: "",
            rest: "90 sec",
            notes: "Upper back",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Farmer Carry",
            sets: "4",
            reps: "30 sec",
            weight: "",
            rest: "60 sec",
            notes: "Grip and core",
            difficulty: "Medium",
            pain: "0",
          },
        ],
      },
    ],
  },
  {
    id: "recovery-mobility",
    name: "Recovery / Weak Area Reset",
    description: "For pain, tightness, surgery history, mobility, or low-readiness days.",
    workouts: [
      {
        name: "Recovery Reset",
        duration: "25",
        focus: "Mobility",
        status: "Planned",
        exercises: [
          {
            name: "Walk",
            sets: "1",
            reps: "10 min",
            weight: "",
            rest: "",
            notes: "Easy pace",
            difficulty: "Easy",
            pain: "0",
          },
          {
            name: "Dead Bug",
            sets: "3",
            reps: "8 each",
            weight: "",
            rest: "45 sec",
            notes: "Brace",
            difficulty: "Easy",
            pain: "0",
          },
          {
            name: "Glute Bridge",
            sets: "3",
            reps: "10",
            weight: "",
            rest: "45 sec",
            notes: "Glutes not low back",
            difficulty: "Easy",
            pain: "0",
          },
          {
            name: "Hip Mobility Flow",
            sets: "2",
            reps: "60 sec",
            weight: "",
            rest: "30 sec",
            notes: "Pain-free range",
            difficulty: "Easy",
            pain: "0",
          },
        ],
      },
    ],
  },
];

export function defaultWorkouts() {
  return [
    {
      id: uid("w"),
      name: "Starter Full Body",
      duration: "30",
      focus: "Full Body",
      status: "Planned",
      exercises: [
        {
          name: "Bodyweight Squat",
          sets: "3",
          reps: "8",
          weight: "",
          rest: "60 sec",
          notes: "Smooth reps",
          difficulty: "Medium",
          pain: "0",
        },
        {
          name: "Push-Up / Incline Push-Up",
          sets: "3",
          reps: "8",
          weight: "",
          rest: "60 sec",
          notes: "Control shoulders",
          difficulty: "Medium",
          pain: "0",
        },
        {
          name: "Glute Bridge",
          sets: "3",
          reps: "10",
          weight: "",
          rest: "45 sec",
          notes: "Feel glutes",
          difficulty: "Medium",
          pain: "0",
        },
      ],
    },
    {
      id: uid("w"),
      name: "Walk / Steps",
      duration: "20",
      focus: "Cardio",
      status: "Planned",
      exercises: [
        {
          name: "Walk",
          sets: "1",
          reps: "20 min",
          weight: "",
          rest: "",
          notes: "Easy pace",
          difficulty: "Easy",
          pain: "0",
        },
      ],
    },
  ];
}
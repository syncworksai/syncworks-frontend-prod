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
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, safeNumber(value)));
}

export function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function prettyDate(value) {
  if (!value) return "Not set";

  const d = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return value;

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isWithinDays(dateStr, days) {
  if (!dateStr) return false;

  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diff = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= days;
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

export function readinessTone(readiness) {
  if (readiness === "Pain / Limit") return "rose";
  if (readiness === "Need Recovery") return "amber";
  if (readiness === "Moderate") return "cyan";
  return "emerald";
}

export function readinessSuggestion(readiness) {
  if (readiness === "Pain / Limit") {
    return "Keep it conservative today. Focus on rest, walking, mobility, or light recovery work.";
  }

  if (readiness === "Need Recovery") {
    return "Reduce intensity today. Aim for steps, mobility, and controlled movement.";
  }

  if (readiness === "Moderate") {
    return "Train with control. Keep form clean and reduce volume if needed.";
  }

  return "You look ready for a normal session. Hit the planned workout and track completion.";
}

export const EXERCISE_LIBRARY = [
  {
    id: "bench_press",
    name: "Bench Press",
    group: "Chest",
    equipment: "Barbell / Dumbbells",
    trains: "Chest, front shoulders, triceps",
    feel: "Chest stretch on the way down and a strong press through the chest.",
    avoid: "Bouncing, elbows flaring too wide, losing shoulder blade control.",
    sportBenefit: "Upper-body power and pressing strength.",
    suggestion: "3–4 sets of 6–10 reps",
  },
  {
    id: "push_up",
    name: "Push-Up",
    group: "Chest",
    equipment: "Bodyweight",
    trains: "Chest, shoulders, triceps, core",
    feel: "Chest and triceps working while the core stays braced.",
    avoid: "Sagging hips, half reps, flared elbows.",
    sportBenefit: "Body control and upper-body endurance.",
    suggestion: "3 sets of 8–15 reps",
  },
  {
    id: "row",
    name: "Row",
    group: "Back",
    equipment: "Cable / Dumbbell / Band",
    trains: "Lats, mid-back, rear delts, biceps",
    feel: "Elbows driving back and shoulder blades squeezing.",
    avoid: "Shrugging, yanking with the arms, rounding the back.",
    sportBenefit: "Posture, pulling strength, shoulder balance.",
    suggestion: "3–4 sets of 8–12 reps",
  },
  {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    group: "Back",
    equipment: "Cable machine / Band",
    trains: "Lats, upper back, biceps",
    feel: "Elbows pulling down toward the ribs.",
    avoid: "Leaning too far back, pulling behind the neck, shrugging.",
    sportBenefit: "Back strength and shoulder stability.",
    suggestion: "3 sets of 10–12 reps",
  },
  {
    id: "squat",
    name: "Squat",
    group: "Legs",
    equipment: "Bodyweight / Dumbbell / Barbell",
    trains: "Quads, glutes, core",
    feel: "Leg drive through the floor with a braced core.",
    avoid: "Knees collapsing, heels lifting, painful depth.",
    sportBenefit: "Lower-body strength and force production.",
    suggestion: "3–4 sets of 6–10 reps",
  },
  {
    id: "rdl",
    name: "Romanian Deadlift",
    group: "Legs",
    equipment: "Dumbbells / Barbell",
    trains: "Hamstrings, glutes, low back control",
    feel: "Hamstring stretch with hips pushing back.",
    avoid: "Rounding the back, squatting the movement, rushing reps.",
    sportBenefit: "Posterior-chain strength and hip power.",
    suggestion: "3 sets of 8–10 reps",
  },
  {
    id: "lateral_raise",
    name: "Lateral Raise",
    group: "Shoulders",
    equipment: "Dumbbells / Bands",
    trains: "Side delts",
    feel: "Shoulders lifting the arms, not traps shrugging.",
    avoid: "Swinging, shrugging, going too heavy.",
    sportBenefit: "Shoulder strength and control.",
    suggestion: "3 sets of 12–15 reps",
  },
  {
    id: "dead_bug",
    name: "Dead Bug",
    group: "Core",
    equipment: "Bodyweight",
    trains: "Deep core, trunk control",
    feel: "Core braced while arms and legs move slowly.",
    avoid: "Low back arching, rushing, holding breath.",
    sportBenefit: "Core stability and lower-back protection.",
    suggestion: "2–3 sets of 8 reps each side",
  },
  {
    id: "glute_bridge",
    name: "Glute Bridge",
    group: "Mobility / Rehab",
    equipment: "Bodyweight / Band",
    trains: "Glutes, hips, posterior chain",
    feel: "Glutes squeezing at the top without low-back takeover.",
    avoid: "Overarching the back, pushing through toes only.",
    sportBenefit: "Hip strength and glute activation.",
    suggestion: "2–3 sets of 10–15 reps",
  },
  {
    id: "walk",
    name: "Walk",
    group: "Cardio",
    equipment: "None",
    trains: "Heart health, recovery, calorie burn",
    feel: "Easy to moderate pace you can sustain.",
    avoid: "Turning recovery work into max effort.",
    sportBenefit: "Conditioning and recovery capacity.",
    suggestion: "10–45 minutes",
  },
];

export const PROGRAM_TEMPLATES = [
  {
    id: "fat_loss_full_body",
    name: "Fat Loss Full Body",
    label: "Fat Loss",
    description: "Full-body strength plus steps and calorie consistency.",
    workouts: [
      {
        name: "Full Body Burn",
        duration: "35",
        focus: "Legs • Push • Pull • Core",
        status: "Planned",
        exercises: [
          { name: "Squat", sets: "3", reps: "10", weight: "", rest: "75 sec", notes: "" },
          { name: "Push-Up", sets: "3", reps: "8-12", weight: "", rest: "75 sec", notes: "" },
          { name: "Row", sets: "3", reps: "10-12", weight: "", rest: "75 sec", notes: "" },
          { name: "Walk", sets: "1", reps: "15 min", weight: "", rest: "", notes: "" },
        ],
      },
    ],
  },
  {
    id: "muscle_gain_split",
    name: "Muscle Gain Split",
    label: "Muscle",
    description: "Hypertrophy-focused workouts with progressive overload.",
    workouts: [
      {
        name: "Upper Muscle",
        duration: "45",
        focus: "Chest • Back • Shoulders • Arms",
        status: "Planned",
        exercises: [
          { name: "Bench Press", sets: "4", reps: "8-10", weight: "", rest: "90 sec", notes: "" },
          { name: "Row", sets: "4", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Lateral Raise", sets: "3", reps: "12-15", weight: "", rest: "60 sec", notes: "" },
        ],
      },
      {
        name: "Lower Muscle",
        duration: "45",
        focus: "Quads • Glutes • Hamstrings",
        status: "Planned",
        exercises: [
          { name: "Squat", sets: "4", reps: "8-10", weight: "", rest: "2 min", notes: "" },
          { name: "Romanian Deadlift", sets: "3", reps: "8-10", weight: "", rest: "2 min", notes: "" },
          { name: "Glute Bridge", sets: "3", reps: "12", weight: "", rest: "75 sec", notes: "" },
        ],
      },
    ],
  },
  {
    id: "sport_performance",
    name: "Sport Performance",
    label: "Sport",
    description: "Strength, core, hips, conditioning, and athletic movement.",
    workouts: [
      {
        name: "Athletic Base",
        duration: "40",
        focus: "Hips • Core • Strength • Conditioning",
        status: "Planned",
        exercises: [
          { name: "Squat", sets: "3", reps: "6-8", weight: "", rest: "2 min", notes: "" },
          { name: "Romanian Deadlift", sets: "3", reps: "8", weight: "", rest: "90 sec", notes: "" },
          { name: "Dead Bug", sets: "3", reps: "8 each", weight: "", rest: "45 sec", notes: "" },
          { name: "Walk", sets: "1", reps: "12 min", weight: "", rest: "", notes: "" },
        ],
      },
    ],
  },
  {
    id: "mobility_rebuild",
    name: "Mobility / Rebuild",
    label: "Mobility",
    description: "Recovery, strength balance, mobility, and weak-area support.",
    workouts: [
      {
        name: "Mobility Reset",
        duration: "25",
        focus: "Hips • Core • Mobility",
        status: "Planned",
        exercises: [
          { name: "Walk", sets: "1", reps: "10 min", weight: "", rest: "", notes: "" },
          { name: "Glute Bridge", sets: "3", reps: "12", weight: "", rest: "60 sec", notes: "" },
          { name: "Dead Bug", sets: "3", reps: "8 each", weight: "", rest: "45 sec", notes: "" },
        ],
      },
    ],
  },
];

export function defaultProfile() {
  return {
    primary_goal: "General fitness",
    sport: "",
    experience: "Beginner",
    training_days: "3",
    preferred_time: "Morning",
    preferred_equipment: "Bodyweight",
    limitations: "",
    weak_areas: [],
    motivation: "",
  };
}

export function defaultSnapshot() {
  return {
    workout: "",
    today_workout_id: "",
    steps: "",
    step_goal: 8000,
    calories: "",
    calorie_goal: 2200,
    protein_goal: "",
    protein_today: "",
    water: "",
    water_goal: 100,
    weight: "",
    readiness: "Ready",
    soreness: "Low",
    pain_level: "0",
    time_available: "30 minutes",
    equipment: "Bodyweight",
    goal: "General fitness",
    notes: "",
  };
}

export function defaultWorkouts() {
  return [
    {
      id: "w-push",
      name: "Push Day",
      duration: "35",
      focus: "Chest • Shoulders • Triceps",
      status: "Planned",
      exercises: [
        { name: "Push-Up", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
        { name: "Bench Press", sets: "3", reps: "8-10", weight: "", rest: "90 sec", notes: "" },
        { name: "Lateral Raise", sets: "3", reps: "12-15", weight: "", rest: "60 sec", notes: "" },
      ],
    },
    {
      id: "w-recovery",
      name: "Recovery Walk",
      duration: "25",
      focus: "Steps • Recovery • Cardio",
      status: "Optional",
      exercises: [{ name: "Walk", sets: "1", reps: "25 min", weight: "", rest: "", notes: "" }],
    },
  ];
}

export function defaultDevices() {
  return [
    { id: "apple_health", name: "Apple Health", status: "Manual Tracking Active", provider: "Apple" },
    { id: "google_fit", name: "Google Fit", status: "Manual Tracking Active", provider: "Google" },
    { id: "fitbit", name: "Fitbit", status: "Manual Tracking Active", provider: "Fitbit" },
    { id: "garmin", name: "Garmin", status: "Manual Tracking Active", provider: "Garmin" },
  ];
}
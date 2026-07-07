// src/components/customer-health/healthStorage.js

export const STRIPE_HEALTH_CHECKOUT_URL = "https://buy.stripe.com/4gMfZh0Y2ar5aT70Kn2Nq0b";
export const HEALTH_LOGO_URL = "/brands/health.jpg";

export const SNAPSHOT_KEY = "sw_customer_health_snapshot_v1";
export const WORKOUTS_KEY = "sw_customer_health_workouts_v1";
export const PROFILE_KEY = "sw_customer_health_profile_v1";
export const HISTORY_KEY = "sw_customer_health_history_v1";
export const PROGRESS_KEY = "sw_customer_health_progress_v1";
export const DEVICE_KEY = "sw_customer_health_devices_v1";
export const HEALTH_BETA_FEEDBACK_KEY = "sw_customer_health_beta_feedback_v1";

export const HEALTH_STORAGE_KEYS = {
  snapshot: SNAPSHOT_KEY,
  workouts: WORKOUTS_KEY,
  profile: PROFILE_KEY,
  history: HISTORY_KEY,
  progress: PROGRESS_KEY,
  devices: DEVICE_KEY,
  beta_feedback: HEALTH_BETA_FEEDBACK_KEY,
};


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

export function readHealthBetaFeedback() {
  return readJson(HEALTH_BETA_FEEDBACK_KEY, []);
}

export function writeHealthBetaFeedback(items = []) {
  writeJson(HEALTH_BETA_FEEDBACK_KEY, Array.isArray(items) ? items : []);
}

export function appendHealthBetaFeedback(entry = {}) {
  const existing = readHealthBetaFeedback();
  const next = [
    {
      id: uid("health-feedback"),
      created_at: new Date().toISOString(),
      status: "OPEN",
      area: "General",
      severity: "Medium",
      message: "",
      page_path:
        typeof window !== "undefined"
          ? `${window.location?.pathname || ""}${window.location?.search || ""}`
          : "",
      runtime: {},
      ...entry,
    },
    ...existing,
  ].slice(0, 100);

  writeHealthBetaFeedback(next);
  return next;
}

export function clearHealthBetaFeedback() {
  writeHealthBetaFeedback([]);
}
export function safeJsonMeta(key) {
  const meta = {
    key,
    exists: false,
    readable: false,
    validJson: false,
    bytes: 0,
    itemCount: 0,
    type: "missing",
    error: "",
  };

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return {
        ...meta,
        error: "localStorage unavailable",
      };
    }

    const raw = window.localStorage.getItem(key);
    meta.exists = raw !== null;
    meta.bytes = raw ? raw.length : 0;

    if (!raw) {
      return meta;
    }

    meta.readable = true;

    const parsed = JSON.parse(raw);
    meta.validJson = true;
    meta.type = Array.isArray(parsed) ? "array" : typeof parsed;

    if (Array.isArray(parsed)) {
      meta.itemCount = parsed.length;
    } else if (parsed && typeof parsed === "object") {
      meta.itemCount = Object.keys(parsed).length;
    }

    return meta;
  } catch (error) {
    return {
      ...meta,
      exists: true,
      readable: true,
      error: error?.message || "Unable to read storage item",
    };
  }
}

export function runHealthStorageDiagnostics() {
  const result = {
    ok: false,
    canWrite: false,
    checkedAt: new Date().toISOString(),
    keys: [],
    totalBytes: 0,
    badKeys: [],
    missingKeys: [],
    error: "",
  };

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      result.badKeys.push("localStorage");
      result.error = "localStorage unavailable";
      return result;
    }

    const probeKey = "sw_health_storage_probe_v1";
    window.localStorage.setItem(probeKey, "ok");
    result.canWrite = window.localStorage.getItem(probeKey) === "ok";
    window.localStorage.removeItem(probeKey);

    result.keys = Object.entries(HEALTH_STORAGE_KEYS).map(([name, key]) => ({
      name,
      ...safeJsonMeta(key),
    }));

    result.totalBytes = result.keys.reduce(
      (sum, item) => sum + safeNumber(item.bytes),
      0
    );

    result.badKeys = result.keys
      .filter((item) => item.exists && !item.validJson)
      .map((item) => item.name);

    result.missingKeys = result.keys
      .filter((item) => !item.exists)
      .map((item) => item.name);

    result.ok = result.canWrite && result.badKeys.length === 0;

    return result;
  } catch (error) {
    return {
      ...result,
      badKeys: ["diagnostics"],
      error: error?.message || "Storage diagnostics failed",
    };
  }
}
export function runHealthWebRuntimeDiagnostics() {
  const result = {
    ok: false,
    checkedAt: new Date().toISOString(),
    online: true,
    visibility: "visible",
    secureContext: false,
    protocol: "",
    host: "",
    path: "",
    isLocalhost: false,
    isProductionHost: false,
    userAgent: "",
    language: "",
    timezone: "",
    viewport: {
      width: 0,
      height: 0,
    },
    issues: [],
  };

  try {
    if (typeof window === "undefined") {
      return {
        ...result,
        online: false,
        issues: ["Window unavailable"],
      };
    }

    const location = window.location || {};
    const navigatorInfo = window.navigator || {};
    const documentInfo = window.document || {};

    result.online = navigatorInfo.onLine !== false;
    result.visibility = documentInfo.visibilityState || "visible";
    result.secureContext =
      window.isSecureContext === true ||
      location.protocol === "https:" ||
      location.hostname === "localhost";
    result.protocol = location.protocol || "";
    result.host = location.host || "";
    result.path = `${location.pathname || ""}${location.search || ""}`;
    result.isLocalhost =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";
    result.isProductionHost =
      String(location.hostname || "").includes("syncworks") ||
      String(location.hostname || "").includes("vercel.app");
    result.userAgent = navigatorInfo.userAgent || "";
    result.language = navigatorInfo.language || "";
    result.timezone =
      Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "";
    result.viewport = {
      width: window.innerWidth || 0,
      height: window.innerHeight || 0,
    };

    if (!result.online) {
      result.issues.push("Browser reports offline");
    }

    if (!result.secureContext) {
      result.issues.push("Not running in a secure HTTPS context");
    }

    if (!result.host) {
      result.issues.push("Host unavailable");
    }

    result.ok =
      result.online &&
      result.secureContext &&
      !!result.host &&
      result.issues.length === 0;

    return result;
  } catch (error) {
    return {
      ...result,
      issues: [error?.message || "Runtime diagnostics failed"],
    };
  }
}
export function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function prettyDate(ymd) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
    week_plan: [],
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function asYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildStarterWeekPlan(workouts = []) {
  const now = new Date();
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const primaryWorkout = workouts?.[0];
  const walkWorkout = workouts?.find((w) =>
    String(w?.name || "").toLowerCase().includes("walk")
  );

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(now, index);
    const dayLabel = names[date.getDay()];

    let workout = null;
    let time = "";

    if (index === 0) {
      workout = primaryWorkout || null;
      time = "06:00";
    } else if (index === 1) {
      workout = walkWorkout || null;
      time = "18:00";
    } else if (index === 2) {
      workout = primaryWorkout || null;
      time = "06:00";
    } else if (index === 4) {
      workout = primaryWorkout || null;
      time = "06:00";
    } else if (index === 5) {
      workout = walkWorkout || null;
      time = "09:00";
    }

    return {
      id: uid("plan"),
      ymd: asYmd(date),
      day_label: dayLabel,
      workout_id: workout?.id || "",
      workout_name: workout?.name || "",
      time,
      status: workout ? "Planned" : "Rest Day",
      note: workout ? "Planned session" : "Recovery / open day",
    };
  });
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
        name: "Romanian Deadlift",
        feel: "Hamstrings, glutes, and hip hinge.",
        mistake: "Rounding the back or turning it into a squat.",
        equipment: "Dumbbells / barbell",
        sets: "3",
        reps: "8-12",
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
        name: "Zone 2 Cardio",
        feel: "Steady breathing and sustainable pace.",
        mistake: "Turning an easy conditioning day into a hard workout.",
        equipment: "Walk / bike / rower",
        sets: "1",
        reps: "20-45 min",
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
        ],
      },
    ],
  },
  {
    id: "fitness-model",
    name: "Fitness Model Lean Build",
    description: "Lean muscle, conditioning, and consistent protein support.",
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
            name: "Bike Intervals",
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
            name: "Bodyweight Squat",
            sets: "4",
            reps: "5",
            weight: "",
            rest: "2 min",
            notes: "Strong form",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "Push-Up",
            sets: "4",
            reps: "8",
            weight: "",
            rest: "90 sec",
            notes: "Controlled press",
            difficulty: "Medium",
            pain: "0",
          },
          {
            name: "One Arm Row",
            sets: "4",
            reps: "6",
            weight: "",
            rest: "90 sec",
            notes: "Upper back",
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
    description: "For pain, tightness, mobility, or low-readiness days.",
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
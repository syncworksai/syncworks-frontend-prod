// src/components/customer-health/healthAthleteProfile.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clean(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export const SPORT_OPTIONS = [
  "General Fitness",
  "Baseball / Softball",
  "Basketball",
  "Football",
  "Soccer",
  "Running",
  "Cycling",
  "Swimming",
  "Tennis / Racquet",
  "Golf",
  "Combat Sports",
  "Powerlifting",
  "Bodybuilding",
  "Cross Training",
  "Youth Athletics",
  "Other",
];

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0;

  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

export function resolveTrainingAgeGroup(age) {
  const value = safeNumber(age, 0);

  if (!value) return "unknown";
  if (value < 13) return "child";
  if (value < 18) return "teen";
  if (value < 30) return "young_adult";
  if (value < 50) return "adult";
  if (value < 65) return "masters";
  return "older_adult";
}

export function buildAgeAwareGuidance({
  age,
  trainingExperience = "beginner",
  sport = "General Fitness",
} = {}) {
  const group = resolveTrainingAgeGroup(age);
  const experience = clean(trainingExperience, "beginner").toLowerCase();
  const selectedSport = clean(sport, "General Fitness");

  const base = {
    group,
    headline: "General adult programming",
    volumeGuidance:
      "Progress gradually and adjust weekly volume using performance, soreness, sleep, and recovery.",
    intensityGuidance:
      "Use controlled repetitions and avoid unnecessary max-effort testing.",
    recoveryGuidance:
      "Use at least one lower-stress day when fatigue or soreness accumulates.",
    supervisionNote: "",
  };

  if (group === "child") {
    return {
      ...base,
      headline: "Child athlete foundation",
      volumeGuidance:
        "Prioritize movement skill, coordination, balance, speed mechanics, and short enjoyable sessions.",
      intensityGuidance:
        "Use bodyweight, light resistance, and technique-first coaching. Do not prescribe unsupervised maximal lifting.",
      recoveryGuidance:
        "Keep sessions age-appropriate, varied, and separated by adequate recovery.",
      supervisionNote:
        "A parent, guardian, coach, or qualified professional should supervise youth training.",
    };
  }

  if (group === "teen") {
    return {
      ...base,
      headline: "Teen athlete development",
      volumeGuidance:
        "Build consistency, movement competency, and sport-relevant strength before adding large training volumes.",
      intensityGuidance:
        "Progress resistance only when technique is stable. Avoid frequent one-repetition maximum testing.",
      recoveryGuidance:
        "Account for school, practices, games, growth, and sleep before adding extra sessions.",
      supervisionNote:
        "Qualified supervision is recommended for loaded strength training and return-to-play decisions.",
    };
  }

  if (group === "masters") {
    return {
      ...base,
      headline: "Masters athlete programming",
      volumeGuidance:
        "Use moderate weekly progression with extra attention to joint tolerance and total recovery demand.",
      intensityGuidance:
        "Keep strength work challenging but controlled, with more warm-up sets and fewer unnecessary grinders.",
      recoveryGuidance:
        "Plan recovery days proactively and adapt volume when sleep, soreness, or joint irritation worsens.",
    };
  }

  if (group === "older_adult") {
    return {
      ...base,
      headline: "Older adult performance and independence",
      volumeGuidance:
        "Prioritize strength, balance, mobility, power at safe loads, and functional capacity.",
      intensityGuidance:
        "Use stable exercise choices, controlled tempo, and conservative load increases.",
      recoveryGuidance:
        "Allow more recovery between demanding sessions and monitor pain, dizziness, balance, and unusual fatigue.",
      supervisionNote:
        "Medical clearance or professional guidance may be appropriate when health conditions, falls, or new symptoms are present.",
    };
  }

  if (experience === "advanced") {
    base.intensityGuidance =
      "Advanced loading can be used, but only with exercise-specific history, stable technique, and recovery data.";
  }

  if (selectedSport !== "General Fitness") {
    base.volumeGuidance +=
      " Strength work should support, not compete with, practices, games, and sport-specific skill work.";
  }

  return base;
}

export function buildSportProfile(sport = "General Fitness") {
  const key = clean(sport, "General Fitness").toLowerCase();

  const profiles = {
    "baseball / softball": {
      priorities: [
        "Rotational power",
        "Acceleration and lateral movement",
        "Shoulder and scapular control",
        "Hip mobility and single-leg strength",
      ],
      cautions: [
        "Manage throwing volume",
        "Avoid excessive pressing near high-volume throwing days",
      ],
    },
    basketball: {
      priorities: [
        "Jump and landing mechanics",
        "Single-leg strength",
        "Deceleration",
        "Ankle and knee resilience",
      ],
      cautions: [
        "Manage impact volume",
        "Reduce lower-body fatigue before games",
      ],
    },
    football: {
      priorities: [
        "Strength and power",
        "Acceleration",
        "Position-specific conditioning",
        "Neck, trunk, and joint resilience",
      ],
      cautions: [
        "Separate high-impact work",
        "Coordinate lifting with practice contact load",
      ],
    },
    soccer: {
      priorities: [
        "Repeated sprint ability",
        "Hamstring and adductor strength",
        "Single-leg control",
        "Aerobic conditioning",
      ],
      cautions: [
        "Avoid excessive lower-body volume near matches",
        "Monitor groin and hamstring soreness",
      ],
    },
    running: {
      priorities: [
        "Calf and soleus capacity",
        "Hip stability",
        "Posterior-chain strength",
        "Running-volume tolerance",
      ],
      cautions: [
        "Increase mileage gradually",
        "Do not stack hard runs and hard leg sessions unnecessarily",
      ],
    },
    "youth athletics": {
      priorities: [
        "Coordination",
        "Fundamental movement skills",
        "Speed mechanics",
        "Enjoyment and confidence",
      ],
      cautions: [
        "No unsupervised maximal loading",
        "Avoid early specialization overload",
      ],
    },
  };

  return (
    profiles[key] || {
      priorities: [
        "General strength",
        "Cardiorespiratory fitness",
        "Mobility",
        "Movement quality",
      ],
      cautions: [
        "Progress one variable at a time",
        "Adjust for pain, fatigue, and recovery",
      ],
    }
  );
}

export function normalizeMeasurements(input = {}) {
  return {
    height:
      safeNumber(input.height || input.height_value, 0),
    heightUnit: clean(
      input.height_unit || input.heightUnit,
      "in"
    ),
    weight:
      safeNumber(input.weight || input.weight_value, 0),
    weightUnit: clean(
      input.weight_unit || input.weightUnit,
      "lb"
    ),
    waist:
      safeNumber(input.waist || input.waist_value, 0),
    hips:
      safeNumber(input.hips || input.hip_value, 0),
    chest:
      safeNumber(input.chest || input.chest_value, 0),
    arm:
      safeNumber(input.arm || input.arm_value, 0),
    thigh:
      safeNumber(input.thigh || input.thigh_value, 0),
    measurementUnit: clean(
      input.measurement_unit || input.measurementUnit,
      "in"
    ),
  };
}

export function buildAthleteProfilePatch({
  dateOfBirth,
  sport,
  trainingExperience,
  measurements,
} = {}) {
  const age = calculateAge(dateOfBirth);
  const normalizedMeasurements = normalizeMeasurements(measurements);

  return {
    date_of_birth: dateOfBirth || "",
    age,
    age_group: resolveTrainingAgeGroup(age),
    primary_sport: clean(sport, "General Fitness"),
    training_experience: clean(
      trainingExperience,
      "beginner"
    ),
    measurements: normalizedMeasurements,
    athlete_profile_updated_at: new Date().toISOString(),
    requires_plan_review: true,
  };
}

// src/components/customer-health/healthWarmupCooldown.js

function text(value) {
  return String(value || "").toLowerCase();
}

function unique(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function detectFocus(session = {}) {
  const haystack = [
    session.workout_name,
    ...(Array.isArray(session.exercises)
      ? session.exercises.flatMap((exercise) => [
          exercise.name,
          exercise.target,
          exercise.category,
          exercise.movement_pattern,
          ...(exercise.primary_muscles || []),
          ...(exercise.secondary_muscles || []),
        ])
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/chest|shoulder|triceps|press|push/.test(haystack)) {
    return "push";
  }

  if (/back|lat|biceps|row|pull/.test(haystack)) {
    return "pull";
  }

  if (/quad|glute|hamstring|calf|squat|hinge|deadlift|leg|lunge/.test(haystack)) {
    return "legs";
  }

  if (/cardio|hiit|run|walk|bike|elliptical|stair|rower/.test(haystack)) {
    return "cardio";
  }

  if (/core|abs|oblique|plank|rotation/.test(haystack)) {
    return "core";
  }

  return "full-body";
}

function readinessFlags(snapshot = {}) {
  const soreness = text(
    snapshot.soreness_score || snapshot.soreness
  );

  const readiness = text(snapshot.readiness);
  const pain = Number(
    snapshot.pain_score ||
      snapshot.readiness_pain_score ||
      0
  );

  return {
    caution:
      pain >= 2 ||
      /pain|high|poor|low|recovery/.test(
        `${soreness} ${readiness}`
      ),
    pain,
    soreness,
  };
}

function item(id, label, detail, seconds, type = "mobility") {
  return {
    id,
    label,
    detail,
    seconds,
    type,
    completed: false,
  };
}

export function buildDynamicWarmupPlan({
  session = {},
  snapshot = {},
} = {}) {
  const focus = detectFocus(session);
  const flags = readinessFlags(snapshot);

  const base = [
    item(
      "raise-temp",
      "Raise body temperature",
      focus === "cardio"
        ? "Begin at an easy pace and gradually increase."
        : "Walk, bike, row, or use an elliptical at an easy pace.",
      flags.caution ? 180 : 120,
      "cardio"
    ),
    item(
      "breathing-brace",
      "Breathing and brace",
      "Take controlled breaths, stack the ribs over the hips, and gently brace the trunk.",
      45,
      "activation"
    ),
  ];

  const focusPlans = {
    push: [
      item(
        "push-shoulders",
        "Shoulder and upper-back mobility",
        "Use arm circles, wall slides, or band pass-throughs without forcing range.",
        60
      ),
      item(
        "push-scap",
        "Scapular activation",
        "Perform band pull-aparts or controlled scapular push-ups.",
        60,
        "activation"
      ),
      item(
        "push-ramp",
        "Ramp-up press sets",
        "Complete one or two lighter practice sets before the first working load.",
        120,
        "ramp"
      ),
    ],
    pull: [
      item(
        "pull-thoracic",
        "Thoracic and shoulder mobility",
        "Use gentle rotations and overhead reaches while keeping the ribs controlled.",
        60
      ),
      item(
        "pull-scap",
        "Scapular pull and lat activation",
        "Use light band rows, straight-arm pulldowns, or controlled hangs.",
        60,
        "activation"
      ),
      item(
        "pull-ramp",
        "Ramp-up pulling sets",
        "Practice the first pull with lighter resistance and clean shoulder-blade control.",
        120,
        "ramp"
      ),
    ],
    legs: [
      item(
        "legs-hips",
        "Hip and ankle mobility",
        "Use supported hip circles, ankle rocks, and a comfortable squat pattern.",
        flags.caution ? 120 : 75
      ),
      item(
        "legs-glutes",
        "Glute and core activation",
        "Use bridges, lateral steps, or bodyweight hinges with controlled tension.",
        75,
        "activation"
      ),
      item(
        "legs-ramp",
        "Ramp-up lower-body sets",
        "Complete lighter practice sets and increase load only when the movement feels smooth.",
        150,
        "ramp"
      ),
    ],
    cardio: [
      item(
        "cardio-mobility",
        "Dynamic joint preparation",
        "Move the ankles, hips, shoulders, and trunk through comfortable ranges.",
        60
      ),
      item(
        "cardio-build",
        "Progressive pace build",
        "Increase pace gradually instead of starting at interval speed.",
        180,
        "ramp"
      ),
    ],
    core: [
      item(
        "core-spine",
        "Spine and hip mobility",
        "Use gentle rotations, cat-cow, and hip movement without forcing end range.",
        60
      ),
      item(
        "core-brace",
        "Core activation",
        "Use dead bugs, bird dogs, or short plank holds with steady breathing.",
        75,
        "activation"
      ),
    ],
    "full-body": [
      item(
        "full-mobility",
        "Full-body dynamic mobility",
        "Move the shoulders, trunk, hips, knees, and ankles through comfortable ranges.",
        90
      ),
      item(
        "full-activation",
        "Movement activation",
        "Use bodyweight squats, hinges, rows, and presses at low effort.",
        90,
        "activation"
      ),
      item(
        "full-ramp",
        "Practice the first exercise",
        "Complete one or two lighter sets before beginning the working sets.",
        120,
        "ramp"
      ),
    ],
  };

  const caution = flags.caution
    ? [
        item(
          "readiness-check",
          "Pain-free readiness check",
          "Test the first movement with reduced range and load. Stop if symptoms increase.",
          60,
          "safety"
        ),
      ]
    : [];

  const items = unique([
    ...base,
    ...caution,
    ...(focusPlans[focus] || focusPlans["full-body"]),
  ]);

  return {
    id: `warmup-${focus}`,
    focus,
    title: `${focus === "full-body" ? "Full-body" : focus} warm-up`,
    reason: flags.caution
      ? "Adjusted for soreness, pain, or lower readiness."
      : "Matched to the movements in this workout.",
    caution: flags.caution,
    estimated_seconds: items.reduce(
      (sum, entry) => sum + Number(entry.seconds || 0),
      0
    ),
    completed: false,
    skipped: false,
    completed_at: "",
    items,
  };
}

export function buildDynamicCooldownPlan({
  session = {},
  snapshot = {},
} = {}) {
  const focus = detectFocus(session);
  const flags = readinessFlags(snapshot);

  const focusItems = {
    push: [
      item(
        "cool-push-walk",
        "Easy walk and breathing",
        "Lower your breathing rate before stretching.",
        90,
        "recovery"
      ),
      item(
        "cool-push-chest",
        "Chest and shoulder reset",
        "Use a gentle doorway stretch and relaxed shoulder circles.",
        60,
        "mobility"
      ),
    ],
    pull: [
      item(
        "cool-pull-walk",
        "Easy walk and breathing",
        "Let your grip and breathing settle.",
        90,
        "recovery"
      ),
      item(
        "cool-pull-lats",
        "Lat and upper-back reset",
        "Use a supported reach and gentle upper-back rotation.",
        60,
        "mobility"
      ),
    ],
    legs: [
      item(
        "cool-legs-walk",
        "Slow walk",
        "Keep moving gently to bring the heart rate down.",
        120,
        "recovery"
      ),
      item(
        "cool-legs-hips",
        "Hip and lower-body reset",
        "Use comfortable hip-flexor, glute, hamstring, and calf mobility.",
        90,
        "mobility"
      ),
    ],
    cardio: [
      item(
        "cool-cardio-pace",
        "Gradual pace reduction",
        "Reduce speed and resistance over several minutes instead of stopping abruptly.",
        180,
        "recovery"
      ),
      item(
        "cool-cardio-breathe",
        "Breathing reset",
        "Take slow breaths until speaking feels comfortable.",
        60,
        "recovery"
      ),
    ],
    core: [
      item(
        "cool-core-breathe",
        "Relaxed breathing",
        "Release the brace and take slow nasal breaths.",
        60,
        "recovery"
      ),
      item(
        "cool-core-mobility",
        "Gentle trunk and hip mobility",
        "Use comfortable rotations and hip stretches without forcing range.",
        60,
        "mobility"
      ),
    ],
    "full-body": [
      item(
        "cool-full-walk",
        "Easy walk and breathing",
        "Lower your heart rate gradually.",
        120,
        "recovery"
      ),
      item(
        "cool-full-mobility",
        "Full-body reset",
        "Use gentle mobility for the muscles trained today.",
        90,
        "mobility"
      ),
    ],
  };

  const safetyItems = flags.caution
    ? [
        item(
          "cool-symptom-note",
          "Recheck symptoms",
          "Notice whether pain or soreness improved, stayed the same, or increased.",
          45,
          "safety"
        ),
      ]
    : [];

  const items = unique([
    ...(focusItems[focus] || focusItems["full-body"]),
    ...safetyItems,
  ]);

  return {
    id: `cooldown-${focus}`,
    focus,
    title: `${focus === "full-body" ? "Full-body" : focus} cooldown`,
    reason: flags.caution
      ? "Includes a symptom recheck because readiness was limited."
      : "Matched to the muscles and movement pattern trained.",
    estimated_seconds: items.reduce(
      (sum, entry) => sum + Number(entry.seconds || 0),
      0
    ),
    items,
  };
}

export function ensureDynamicPreparation(
  session = {},
  snapshot = {}
) {
  if (!session || typeof session !== "object") {
    return session;
  }

  return {
    ...session,
    warmup_plan:
      session.warmup_plan ||
      buildDynamicWarmupPlan({
        session,
        snapshot,
      }),
    cooldown_plan:
      session.cooldown_plan ||
      buildDynamicCooldownPlan({
        session,
        snapshot,
      }),
  };
}

export function toggleWarmupItem(
  session = {},
  itemId
) {
  const plan = session.warmup_plan;

  if (!plan || !itemId) return session;

  const items = (plan.items || []).map((entry) =>
    entry.id === itemId
      ? {
          ...entry,
          completed: !entry.completed,
        }
      : entry
  );

  const completed =
    items.length > 0 &&
    items.every((entry) => entry.completed);

  return {
    ...session,
    warmup_plan: {
      ...plan,
      items,
      completed,
      skipped: false,
      completed_at:
        completed && !plan.completed_at
          ? new Date().toISOString()
          : completed
          ? plan.completed_at
          : "",
    },
  };
}

export function skipWarmup(
  session = {}
) {
  if (!session.warmup_plan) return session;

  return {
    ...session,
    warmup_plan: {
      ...session.warmup_plan,
      completed: false,
      skipped: true,
      completed_at: new Date().toISOString(),
    },
  };
}

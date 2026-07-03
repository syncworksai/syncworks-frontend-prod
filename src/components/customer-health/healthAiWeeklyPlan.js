// src/components/customer-health/healthAiWeeklyPlan.js
import { HEALTH_EXERCISE_CATALOG } from "./healthExerciseCatalog";
import { uid } from "./healthStorage";

const DAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function text(value) {
  return String(value || "").toLowerCase();
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanTime(value) {
  const raw = String(value || "08:00").trim();
  return /^\d{2}:\d{2}$/.test(raw) ? raw : "08:00";
}

function futureTrainingDates(days, time, count) {
  const preferred = (Array.isArray(days) ? days : [])
    .map((day) => DAY_INDEX[day])
    .filter((day) => Number.isInteger(day));

  const selected =
    preferred.length > 0
      ? preferred
      : [1, 3, 5];

  const now = new Date();
  const results = [];

  for (let offset = 0; offset < 21 && results.length < count; offset += 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset
    );

    if (!selected.includes(date.getDay())) continue;

    const [hour, minute] = cleanTime(time)
      .split(":")
      .map(Number);

    const scheduled = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
      0,
      0
    );

    if (scheduled.getTime() <= now.getTime()) continue;

    results.push(date);
  }

  return results;
}

function exerciseText(exercise) {
  return [
    exercise?.name,
    exercise?.category,
    exercise?.movement_pattern,
    exercise?.equipment,
    exercise?.location,
    ...(exercise?.primary_muscles || []),
    ...(exercise?.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesEquipment(exercise, profile) {
  const selected = Array.isArray(profile.available_equipment)
    ? profile.available_equipment.map(text)
    : [];

  const location = text(profile.training_location);
  const haystack = exerciseText(exercise);

  if (
    location.includes("home") &&
    !location.includes("both") &&
    !selected.some((item) => item.includes("full gym"))
  ) {
    const homeFriendly =
      /bodyweight|dumbbell|band|mat|no equipment|home|outdoor/.test(
        haystack
      );

    if (!homeFriendly) return false;
  }

  if (!selected.length) return true;

  return selected.some((item) => {
    if (item.includes("full gym")) return true;
    if (item.includes("bodyweight")) {
      return /bodyweight|no equipment|mat/.test(haystack);
    }
    if (item.includes("dumbbell")) return /dumbbell/.test(haystack);
    if (item.includes("band")) return /band/.test(haystack);
    if (item.includes("barbell")) return /barbell/.test(haystack);
    if (item.includes("machine")) return /machine|cable/.test(haystack);
    if (item.includes("cardio")) {
      return /cardio|treadmill|bike|row|elliptical|stair|walk|run/.test(
        haystack
      );
    }
    return haystack.includes(item);
  });
}

function excludedByLimitations(exercise, profile) {
  const blocked = text(
    `${profile.limitations || ""} ${profile.avoid_movements || ""}`
  );

  if (!blocked) return false;

  const haystack = exerciseText(exercise);

  const rules = [
    [/no running|avoid running/, /run|sprint|treadmill/],
    [/no jumping|avoid jumping/, /jump|plyometric|box jump/],
    [/no overhead|avoid overhead/, /overhead|shoulder press/],
    [/no squat|avoid squat|deep squat/, /squat/],
    [/no deadlift|avoid deadlift/, /deadlift/],
    [/knee pain/, /jump|sprint|deep squat|lunge/],
    [/shoulder pain/, /overhead|bench press|dip|shoulder press/],
    [/back pain|low back/, /deadlift|good morning|bent-over/],
  ];

  return rules.some(
    ([limitation, exercisePattern]) =>
      limitation.test(blocked) && exercisePattern.test(haystack)
  );
}

function selectExercises(profile, pattern, count) {
  const pool = HEALTH_EXERCISE_CATALOG.filter(
    (exercise) =>
      pattern.test(exerciseText(exercise)) &&
      matchesEquipment(exercise, profile) &&
      !excludedByLimitations(exercise, profile)
  );

  const fallback = HEALTH_EXERCISE_CATALOG.filter(
    (exercise) =>
      matchesEquipment(exercise, profile) &&
      !excludedByLimitations(exercise, profile) &&
      !/cardio|mobility|stretch|warm-up|recovery/.test(
        exerciseText(exercise)
      )
  );

  const selected = [];
  const used = new Set();

  for (const exercise of [...pool, ...fallback]) {
    const key = exercise.id || exercise.name;
    if (!key || used.has(key)) continue;
    used.add(key);
    selected.push(exercise);
    if (selected.length >= count) break;
  }

  return selected;
}

function normalizeStrengthExercise(exercise, index, profile) {
  const beginner = /beginner|restarting/i.test(profile.experience || "");
  const advanced = /advanced|competitive/i.test(profile.experience || "");
  const hard = /train hard|competitive performance/i.test(
    profile.coaching_intensity || ""
  );

  const defaultSets = beginner ? 2 : advanced || hard ? 4 : 3;
  const sourceSets = numberValue(exercise.sets, defaultSets);

  return {
    ...exercise,
    id: exercise.id || uid(`ai-exercise-${index + 1}`),
    name: exercise.name || `Exercise ${index + 1}`,
    sets: String(
      Math.max(2, Math.min(5, sourceSets || defaultSets))
    ),
    reps:
      exercise.reps ||
      (advanced && hard ? "6-10" : "8-12"),
    weight: "",
    rest: advanced || hard ? "90 sec" : "75 sec",
    rest_seconds: advanced || hard ? 90 : 75,
    planned_sets: String(
      Math.max(2, Math.min(5, sourceSets || defaultSets))
    ),
    planned_reps:
      exercise.reps ||
      (advanced && hard ? "6-10" : "8-12"),
    notes:
      exercise.feel ||
      "Use controlled form and leave room for coach-guided progression.",
    order: index + 1,
    source: "ai_weekly_plan",
  };
}

function cardioExercise(profile) {
  const preferred = Array.isArray(profile.preferred_cardio)
    ? profile.preferred_cardio[0]
    : "";

  const name = preferred || "Brisk walking";
  const duration = Math.max(
    15,
    Math.min(
      45,
      numberValue(profile.session_length_minutes, 30)
    )
  );

  return {
    id: uid("ai-cardio"),
    name,
    category: "Cardio",
    movement_pattern: "Conditioning",
    equipment: "Cardio",
    sets: "1",
    reps: `${duration} min`,
    weight: "",
    rest: "0 sec",
    rest_seconds: 0,
    planned_sets: "1",
    planned_reps: `${duration} min`,
    timed: true,
    notes:
      "Coach adjusts pace and duration from conditioning, recovery, and goal progress.",
    source: "ai_weekly_plan",
  };
}

function mobilityExercises(profile) {
  const selected = HEALTH_EXERCISE_CATALOG.filter(
    (exercise) =>
      /mobility|stretch|warm-up|recovery/.test(
        exerciseText(exercise)
      ) &&
      matchesEquipment(exercise, profile) &&
      !excludedByLimitations(exercise, profile)
  ).slice(0, 5);

  return selected.map((exercise, index) => ({
    ...exercise,
    id: exercise.id || uid(`ai-mobility-${index + 1}`),
    sets: String(exercise.sets || 2),
    reps: exercise.reps || "30-45 sec",
    planned_sets: String(exercise.sets || 2),
    planned_reps: exercise.reps || "30-45 sec",
    rest: "30 sec",
    rest_seconds: 30,
    order: index + 1,
    source: "ai_weekly_plan",
  }));
}

function strengthDefinition(index, total, profile) {
  const goal = text(profile.primary_goal);
  const athletic = goal.includes("athletic") || !!profile.sport;
  const bodybuilding =
    goal.includes("bodybuild") || goal.includes("muscle");

  if (total <= 2) {
    return {
      title:
        index === 0
          ? athletic
            ? "Full Body Strength + Power"
            : "Full Body Strength A"
          : athletic
          ? "Full Body Athletic Strength"
          : "Full Body Strength B",
      focus: "Full body",
      pattern:
        index === 0
          ? /squat|press|row|push|pull|hinge|core/
          : /lunge|deadlift|pulldown|shoulder|glute|core/,
    };
  }

  if (bodybuilding) {
    const split = [
      ["Push Hypertrophy", "Push", /chest|shoulder|tricep|press|push/],
      ["Pull Hypertrophy", "Pull", /back|lat|bicep|row|pull|curl/],
      ["Leg Hypertrophy", "Legs", /leg|quad|hamstring|glute|calf|squat|lunge|hinge/],
      ["Upper Body Volume", "Upper body", /chest|back|shoulder|arm|press|row|pull/],
      ["Lower Body Volume", "Lower body", /leg|quad|hamstring|glute|calf|squat|lunge|hinge/],
    ];

    const [title, focus, pattern] =
      split[index % split.length];

    return { title, focus, pattern };
  }

  const split = [
    ["Upper Body Strength", "Upper body", /chest|back|shoulder|arm|press|row|pull/],
    ["Lower Body Strength", "Lower body", /leg|quad|hamstring|glute|calf|squat|lunge|hinge/],
    [
      athletic ? "Power + Plyometrics" : "Full Body Strength",
      athletic ? "Power" : "Full body",
      athletic
        ? /jump|plyometric|power|sprint|squat|hinge|core/
        : /squat|press|row|pull|hinge|core/,
    ],
    ["Push Strength", "Push", /chest|shoulder|tricep|press|push/],
    ["Pull Strength", "Pull", /back|lat|bicep|row|pull|curl/],
  ];

  const [title, focus, pattern] =
    split[index % split.length];

  return { title, focus, pattern };
}

function buildSessionQueue(profile, availableCount) {
  const strengthDays = Math.max(
    0,
    Math.min(
      6,
      numberValue(profile.strength_days_per_week, 3)
    )
  );

  const cardioDays = Math.max(
    0,
    Math.min(
      7,
      numberValue(profile.cardio_days_per_week, 2)
    )
  );

  const focuses = Array.isArray(profile.training_focuses)
    ? profile.training_focuses
    : [];

  const wantsMobility = focuses.some((item) =>
    /mobility|stretching|recovery/i.test(item)
  );

  const queue = [];

  for (let index = 0; index < strengthDays; index += 1) {
    queue.push({ type: "strength", strengthIndex: index });
  }

  for (let index = 0; index < cardioDays; index += 1) {
    queue.splice(
      Math.min(queue.length, index * 2 + 1),
      0,
      { type: "cardio", cardioIndex: index }
    );
  }

  if (wantsMobility) {
    queue.push({ type: "mobility" });
  }

  if (!queue.length) {
    queue.push(
      { type: "strength", strengthIndex: 0 },
      { type: "cardio", cardioIndex: 0 }
    );
  }

  if (availableCount > 0 && queue.length > availableCount) {
    const trimmed = queue.slice(0, availableCount);

    if (
      cardioDays > 0 &&
      !trimmed.some((item) => item.type === "cardio")
    ) {
      trimmed[trimmed.length - 1] = {
        type: "cardio",
        cardioIndex: 0,
      };
    }

    return trimmed;
  }

  return queue;
}

export function buildAiWeeklyPlan({
  profile = {},
  snapshot = {},
} = {}) {
  const preferredTime = cleanTime(
    profile.preferred_start_time ||
      profile.preferred_time ||
      snapshot.preferred_workout_time ||
      "08:00"
  );

  const selectedDays = Array.isArray(
    profile.preferred_training_days
  )
    ? profile.preferred_training_days
    : [];

  const availableCount =
    selectedDays.length || Math.max(
      2,
      numberValue(profile.strength_days_per_week, 3) +
        numberValue(profile.cardio_days_per_week, 2)
    );

  const queue = buildSessionQueue(
    profile,
    availableCount
  );

  const dates = futureTrainingDates(
    selectedDays,
    preferredTime,
    queue.length
  );

  const generatedAt = new Date().toISOString();
  const planId = uid("ai-weekly-plan");
  const strengthTotal = queue.filter(
    (item) => item.type === "strength"
  ).length;

  const templates = [];
  const weekPlan = [];

  queue.forEach((item, index) => {
    const date =
      dates[index] ||
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate() + index + 1
      );

    let title = "Coach Planned Workout";
    let focus = "General fitness";
    let exercises = [];

    if (item.type === "cardio") {
      title =
        item.cardioIndex > 0
          ? "Cardio + Conditioning"
          : "Cardio Base";
      focus = "Cardio";
      exercises = [cardioExercise(profile)];
    } else if (item.type === "mobility") {
      title = "Mobility + Recovery";
      focus = "Mobility";
      exercises = mobilityExercises(profile);
    } else {
      const definition = strengthDefinition(
        item.strengthIndex || 0,
        strengthTotal,
        profile
      );

      title = definition.title;
      focus = definition.focus;
      exercises = selectExercises(
        profile,
        definition.pattern,
        /beginner|restarting/i.test(profile.experience || "")
          ? 4
          : 5
      ).map((exercise, exerciseIndex) =>
        normalizeStrengthExercise(
          exercise,
          exerciseIndex,
          profile
        )
      );
    }

    const workoutId = uid("ai-workout");
    const plannerId = uid("ai-session");
    const dayLabel = DAY_LABELS[date.getDay()];

    const template = {
      id: workoutId,
      name: title,
      workout_name: title,
      focus,
      duration:
        profile.session_length_minutes || "45",
      status: "Saved",
      source: "ai_weekly_plan",
      ai_plan_id: planId,
      training_location:
        profile.training_location || "Mixed",
      exercises,
      saved_at: generatedAt,
      reusable: true,
      duplicate_allowed: true,
    };

    const plannerItem = {
      ...template,
      id: plannerId,
      workout_id: workoutId,
      ymd: asYmd(date),
      day_label: dayLabel,
      time: preferredTime,
      status: "Planned",
      note: `AI-designed ${focus.toLowerCase()} session for ${profile.primary_goal || "your goal"}.`,
      plan_control: "adaptive",
      source: "ai_weekly_plan",
      ai_plan_id: planId,
      recurrence: "weekly",
      recurrence_day: dayLabel,
      scheduled_at: generatedAt,
    };

    templates.push(template);
    weekPlan.push(plannerItem);
  });

  return {
    id: planId,
    generated_at: generatedAt,
    preferred_time: preferredTime,
    primary_goal:
      profile.primary_goal || "General health",
    experience:
      profile.experience || "Beginner",
    templates,
    week_plan: weekPlan,
    first_session: weekPlan[0] || null,
    summary: {
      strength_sessions: weekPlan.filter(
        (item) => item.focus !== "Cardio" && item.focus !== "Mobility"
      ).length,
      cardio_sessions: weekPlan.filter(
        (item) => item.focus === "Cardio"
      ).length,
      mobility_sessions: weekPlan.filter(
        (item) => item.focus === "Mobility"
      ).length,
      total_sessions: weekPlan.length,
    },
  };
}
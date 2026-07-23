// src/components/customer-health/healthExerciseEducation.js

function clean(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function list(value) {
  return Array.isArray(value)
    ? value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function stepText(step = {}, index = 0) {
  return {
    id: step.id || `step-${index + 1}`,
    title: clean(step.title, `Step ${index + 1}`),
    cue: clean(step.cue || step.detail, "Move with control."),
  };
}

export function buildExerciseEducation({
  knowledge = {},
  exercise = {},
} = {}) {
  const name = clean(
    exercise.substitute_name || exercise.name || knowledge.name,
    "Exercise"
  );

  const primaryMuscles = list(
    knowledge.primary_muscles || exercise.primary_muscles
  );
  const secondaryMuscles = list(
    knowledge.secondary_muscles || exercise.secondary_muscles
  );

  const rawSteps = Array.isArray(knowledge.steps)
    ? knowledge.steps
    : [];

  const steps = rawSteps.map(stepText).slice(0, 5);
  const setup = steps.slice(0, 2);
  const execution = steps.slice(2);

  return {
    name,
    movementPattern: clean(
      knowledge.movement_pattern || exercise.movement_pattern,
      "General movement"
    ),
    purpose: clean(
      exercise.exercise_purpose ||
        exercise.purpose ||
        knowledge.purpose ||
        knowledge.short_cue,
      "Build movement quality, strength, and control."
    ),
    feel: clean(
      knowledge.feel_cue,
      primaryMuscles.length
        ? `You should mainly feel ${primaryMuscles.join(", ")}.`
        : "You should feel controlled muscular effort, not joint pain."
    ),
    setup:
      setup.length > 0
        ? setup
        : [
            {
              id: "setup-1",
              title: "Set your position",
              cue: clean(
                knowledge.setup_cue,
                "Create a stable starting position before adding speed or load."
              ),
            },
          ],
    execution:
      execution.length > 0
        ? execution
        : [
            {
              id: "execution-1",
              title: "Move with control",
              cue: clean(
                knowledge.short_cue,
                "Use a smooth range of motion and keep the target muscles engaged."
              ),
            },
          ],
    primaryMuscles,
    secondaryMuscles,
    commonMistake: clean(
      knowledge.correction_cue || knowledge.coach_warning,
      "Do not trade range of motion or position for more weight."
    ),
    safety: clean(
      knowledge.safety_note,
      "Stop or modify the movement if pain increases, position breaks down, or control is lost."
    ),
    regression: clean(
      knowledge.regression ||
        knowledge.beginner_option ||
        exercise.regression,
      "Reduce load, shorten range of motion, or use a supported variation."
    ),
    progression: clean(
      knowledge.progression ||
        knowledge.advanced_option ||
        exercise.progression,
      "Progress one variable at a time: repetitions, load, tempo, or range."
    ),
    demoUrl: clean(
      knowledge.demo_url || knowledge.youtube_url,
      ""
    ),
  };
}

function roundToIncrement(value, increment = 5) {
  const number = Number(value || 0);
  if (!(number > 0)) return 0;
  return Math.ceil(number / increment) * increment;
}

export function buildNextRecordTargets(result = {}) {
  const previous = result.previous || {};
  const current = result.current || {};

  const bestWeight = Math.max(
    Number(previous.maxWeight || 0),
    Number(current.maxWeight || 0)
  );
  const bestReps = Math.max(
    Number(previous.maxReps || 0),
    Number(current.maxReps || 0)
  );
  const bestOneRepMax = Math.max(
    Number(previous.maxEstimatedOneRepMax || 0),
    Number(current.maxEstimatedOneRepMax || 0)
  );
  const bestVolume = Math.max(
    Number(previous.bestSessionVolume || 0),
    Number(current.sessionVolume || 0)
  );

  return [
    {
      id: "next-weight",
      label: "Next Weight Target",
      value:
        bestWeight > 0
          ? `${roundToIncrement(bestWeight + 5)} lb`
          : "Set baseline",
      detail:
        bestWeight > 0
          ? "Use only when form and target reps remain controlled."
          : "Complete a clean weighted working set first.",
    },
    {
      id: "next-reps",
      label: "Next Rep Target",
      value:
        bestReps > 0
          ? `${bestReps + 1} reps`
          : "Set baseline",
      detail:
        bestReps > 0
          ? "Add one quality rep before making a larger jump."
          : "Log a complete working set first.",
    },
    {
      id: "next-1rm",
      label: "Estimated 1RM Target",
      value:
        bestOneRepMax > 0
          ? `${roundToIncrement(bestOneRepMax + 5)} lb`
          : "Set baseline",
      detail:
        "This is an estimate from submaximal work, not a requirement to test a true max.",
    },
    {
      id: "next-volume",
      label: "Session Volume Target",
      value:
        bestVolume > 0
          ? `${Math.round(bestVolume * 1.03).toLocaleString()} lb`
          : "Set baseline",
      detail:
        "A small volume increase is safer than chasing every metric at once.",
    },
  ];
}

// src/components/customer-health/healthWorkoutExperience.js

function lower(value) {
  return String(value || "").toLowerCase();
}

function slug(value) {
  return lower(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeWorkoutFocus(value) {
  const raw = lower(value);

  if (/pull|back|lat|bicep|row/.test(raw)) return "Pull";
  if (/push|chest|tricep|press|shoulder/.test(raw)) return "Push";
  if (/leg|lower|quad|hamstring|glute|calf|squat/.test(raw)) {
    return "Legs";
  }
  if (/core|ab|oblique/.test(raw)) return "Core";
  if (/cardio|hiit|run|walk|bike|rower|stair/.test(raw)) {
    return "Cardio";
  }
  if (/mobility|stretch/.test(raw)) return "Mobility";
  if (/recovery/.test(raw)) return "Recovery";
  if (/full body|total body/.test(raw)) return "Full body";

  return "";
}

function warmupItem({
  focus,
  name,
  reps,
  seconds = 0,
  cue,
  order,
}) {
  return {
    id: `warmup-${slug(focus)}-${order}`,
    name,
    category: "Warm-up",
    movement_pattern: "Dynamic warm-up",
    equipment: "Bodyweight / light equipment",
    primary_muscles: [focus],
    secondary_muscles: [],
    coach_reason: `Prepares you for today's ${focus.toLowerCase()} session.`,
    available_today: true,
    planned_sets: "1",
    planned_reps: seconds > 0 ? `${seconds} sec` : reps,
    rest_seconds: 15,
    order,
    is_warmup: true,
    variation_label: "Controlled warm-up",
    grip_instruction: "",
    tempo_instruction: "Move smoothly and stay below fatigue.",
    form_cue: cue,
  };
}

export function buildWorkoutWarmup({
  focus,
  experienceLevel = "Beginner",
} = {}) {
  const normalized = normalizeWorkoutFocus(focus) || "Full body";
  const isBeginner = lower(experienceLevel).includes("beginner");
  const prepSeconds = isBeginner ? 75 : 45;

  const templates = {
    Pull: [
      ["Easy rower or bike", "", prepSeconds, "Raise body temperature without tiring your back or arms."],
      ["Band pull-aparts", "12-15 reps", 0, "Keep ribs down and squeeze between the shoulder blades."],
      ["Scapular pulldowns", "10-12 reps", 0, "Use straight arms and pull the shoulders away from the ears."],
      ["Light cable or machine row", "10 reps", 0, "Use a very light load and pause at the contraction."],
    ],
    Push: [
      ["Easy bike or treadmill", "", prepSeconds, "Raise body temperature while keeping the shoulders relaxed."],
      ["Shoulder circles", "8 each direction", 0, "Use controlled circles without forcing range."],
      ["Band external rotations", "10-12 reps", 0, "Keep elbows close to your sides."],
      ["Scapular push-ups", "8-10 reps", 0, "Keep the elbows straight and move through the shoulder blades."],
    ],
    Legs: [
      ["Easy bike or treadmill", "", prepSeconds, "Increase temperature without creating leg fatigue."],
      ["Ankle rocks", "10 each side", 0, "Drive the knee forward while keeping the heel down."],
      ["Bodyweight squats", "10 reps", 0, "Use a comfortable depth and keep the feet planted."],
      ["Glute bridges", "10-12 reps", 0, "Brace the core and squeeze the glutes at the top."],
    ],
    Core: [
      ["Easy walk or bike", "", prepSeconds, "Raise body temperature gradually."],
      ["Cat-cow", "8 reps", 0, "Move slowly through a comfortable spinal range."],
      ["Dead bug", "6 each side", 0, "Keep the lower back gently braced."],
      ["Bird dog", "6 each side", 0, "Reach long without rotating the hips."],
    ],
    Cardio: [
      ["Easy pace", "", isBeginner ? 180 : 120, "Begin below your working pace and build gradually."],
      ["Dynamic leg swings", "8 each direction", 0, "Use a controlled range and stable posture."],
      ["March or light skips", "30 sec", 0, "Stay relaxed and prepare for faster movement."],
    ],
    Mobility: [
      ["Easy walk", "", 60, "Move gently and breathe normally."],
      ["Cat-cow", "8 reps", 0, "Use a pain-free range."],
      ["World's greatest stretch", "4 each side", 0, "Move slowly and do not force depth."],
    ],
    Recovery: [
      ["Easy walk", "", 120, "Keep the pace conversational."],
      ["Breathing reset", "5 slow breaths", 0, "Use a long, relaxed exhale."],
      ["Gentle mobility flow", "3-5 min", 0, "Stay inside a comfortable range."],
    ],
    "Full body": [
      ["Easy bike or treadmill", "", prepSeconds, "Raise body temperature gradually."],
      ["Bodyweight squat", "8 reps", 0, "Use a comfortable depth."],
      ["Band pull-apart", "10 reps", 0, "Squeeze the upper back."],
      ["Scapular push-up", "8 reps", 0, "Move through the shoulder blades."],
    ],
  };

  return (templates[normalized] || templates["Full body"]).map(
    ([name, reps, seconds, cue], index) =>
      warmupItem({
        focus: normalized,
        name,
        reps,
        seconds,
        cue,
        order: index + 1,
      })
  );
}

export function buildExerciseVariation({
  exercise,
  focus,
  experienceLevel = "Beginner",
  coachingStyle = "Beginner Friendly",
} = {}) {
  const name = lower(exercise?.name);
  const advanced =
    lower(experienceLevel).includes("advanced") ||
    lower(experienceLevel).includes("competitive");
  const hardcore = lower(coachingStyle).includes("hardcore");

  let variationLabel = "Standard setup";
  let gripInstruction = "";
  let tempoInstruction = advanced
    ? "Use a controlled 2-second eccentric."
    : "Use a smooth, controlled tempo.";
  let formCue = exercise?.form_cue || "";

  if (/lat pulldown|pull-up|chin-up/.test(name)) {
    if (/chin-up/.test(name)) {
      variationLabel = "Supinated grip";
      gripInstruction =
        "Use a supinated grip: palms facing you, about shoulder width.";
    } else if (advanced) {
      variationLabel = "Neutral or rotating grip";
      gripInstruction =
        "Use a neutral grip when available: palms facing each other. Rotate to pronated on the next exposure.";
    } else {
      variationLabel = "Shoulder-width pronated grip";
      gripInstruction =
        "Use a pronated grip: palms facing away, approximately shoulder width.";
    }
    formCue = "Keep the chest tall and drive the elbows toward the ribs.";
  } else if (/row/.test(name)) {
    variationLabel = advanced ? "Neutral grip with pause" : "Neutral grip";
    gripInstruction =
      "Use a neutral grip when available: palms facing each other.";
    tempoInstruction = advanced
      ? "Pause for 1 second at the contraction, then return under control."
      : "Pull smoothly and return under control.";
    formCue = "Keep the torso stable and finish by moving the elbows back.";
  } else if (/curl/.test(name)) {
    variationLabel = advanced ? "Supinated curl with slow eccentric" : "Supinated curl";
    gripInstruction =
      "Use a supinated grip: turn the palms up as you curl.";
    formCue = "Keep the elbows close to the body and avoid swinging.";
  } else if (/bench press|chest press|push-up/.test(name)) {
    variationLabel = "Pronated pressing grip";
    gripInstruction =
      "Use a pronated grip: palms facing away, with wrists stacked over the forearms.";
    formCue = "Keep the shoulder blades stable and lower under control.";
  } else if (/shoulder press|overhead press/.test(name)) {
    variationLabel = "Neutral grip when available";
    gripInstruction =
      "Use a neutral grip with dumbbells when available; otherwise use a comfortable pronated grip.";
    formCue = "Brace the torso and keep the forearms vertical.";
  } else if (/deadlift|romanian/.test(name)) {
    variationLabel = advanced && hardcore ? "Controlled hinge with pause" : "Standard hip hinge";
    gripInstruction =
      "Use a double-overhand pronated grip for warm-up sets. Use straps or mixed grip only when needed for heavy work.";
    formCue = "Push the hips back, brace the torso, and keep the load close.";
  } else if (/squat|leg press/.test(name)) {
    variationLabel = "Controlled full-foot stance";
    formCue = "Keep pressure through the whole foot and track the knees with the toes.";
  }

  return {
    variation_label: variationLabel,
    grip_instruction: gripInstruction,
    tempo_instruction: tempoInstruction,
    form_cue: formCue,
    expertise_level: experienceLevel,
    coaching_style: coachingStyle,
  };
}

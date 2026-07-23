// src/components/customer-health/healthPremiumAudio.js

export const AUDIO_MODE_PROFILES = {
  off: {
    id: "off",
    label: "Off",
    description: "All workout voice cues are muted.",
    allows_music: true,
    focus_mode: false,
    detail_level: "none",
  },
  basic: {
    id: "basic",
    label: "Basic Audio",
    description:
      "Short operational cues for set starts, rest, transitions, and safety. Designed to coexist with music.",
    allows_music: true,
    focus_mode: false,
    detail_level: "essential",
  },
  trainer: {
    id: "trainer",
    label: "Full Trainer",
    description:
      "Detailed setup, movement, muscle, pacing, and rationale coaching with high-priority interruptions.",
    allows_music: false,
    focus_mode: true,
    detail_level: "detailed",
  },
};

const BASIC_ALLOWED_EVENTS = new Set([
  "workout_welcome",
  "preworkout_briefing",
  "warmup_complete",
  "exercise_intro",
  "set_start",
  "rest_start",
  "rest_cue",
  "exercise_swap",
  "exercise_added",
  "pain_warning",
  "safety_warning",
  "workout_completed",
  "workout_debrief",
]);

const TRAINER_ONLY_EVENTS = new Set([
  "trainer_detail",
  "movement_setup",
  "muscle_focus",
  "form_correction",
  "effort_coaching",
  "workout_rationale",
  "mid_set_motivation",
]);

export function normalizeWorkoutAudioMode(value) {
  const mode = String(value || "basic").toLowerCase();

  if (mode === "off") return "off";
  if (mode === "trainer" || mode === "full" || mode === "aggressive") {
    return "trainer";
  }
  if (mode === "basic" || mode === "essential" || mode === "robotic") {
    return "basic";
  }

  return "basic";
}

export function getWorkoutAudioProfile(value) {
  return AUDIO_MODE_PROFILES[normalizeWorkoutAudioMode(value)];
}

export function shouldPlayCoachEvent({
  audioMode,
  eventType = "coach_message",
  priority = "normal",
} = {}) {
  const mode = normalizeWorkoutAudioMode(audioMode);

  if (mode === "off") return false;
  if (mode === "trainer") return true;

  if (String(priority).toLowerCase() === "critical") return true;
  if (TRAINER_ONLY_EVENTS.has(eventType)) return false;

  return (
    BASIC_ALLOWED_EVENTS.has(eventType) ||
    eventType === "coach_message"
  );
}

export function buildPremiumCoachDelivery({
  audioMode,
  eventType = "coach_message",
  priority = "normal",
} = {}) {
  const profile = getWorkoutAudioProfile(audioMode);
  const trainerMode = profile.id === "trainer";

  return {
    audioMode: profile.id,
    eventType,
    priority,
    energy: trainerMode ? "high_energy" : "controlled",
    rate: trainerMode ? 1.02 : 1,
    pitch: trainerMode ? 0.98 : 1,
    volume: 1,
    focusMode: trainerMode,
    musicCompatible: profile.allows_music,
    detailed: trainerMode,
  };
}

export function announceCoachAudioState(detail = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("syncworks:coach-audio-state", {
      detail,
    })
  );
}

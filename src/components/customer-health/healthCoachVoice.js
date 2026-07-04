// src/components/customer-health/healthCoachVoice.js
import {
  createHealthCoachSpeech,
  getHealthVoiceOptions,
} from "../../api/customerHealth";

const VOICE_PREFERENCE_KEY =
  "sw_health_voice_preferences_v1";

const DEFAULT_VOICE_PREFERENCES = {
  provider: "elevenlabs",
  voiceKey: "sync_fitness_coach",
  energy: "high_energy",
  browserFallback: true,
};

const FEMALE_HINTS = [
  "female",
  "woman",
  "samantha",
  "victoria",
  "zira",
  "karen",
  "moira",
  "susan",
  "aria",
  "jenny",
  "siri female",
];

const MALE_HINTS = [
  "male",
  "man",
  "david",
  "mark",
  "alex",
  "fred",
  "daniel",
  "jorge",
  "lee",
  "tom",
  "siri male",
];

let activeAudio = null;
let activeAudioUrl = "";
let activeVoiceRequest = null;
let voiceOptionsPromise = null;

function getSynth() {
  if (typeof window === "undefined") return null;
  if (!("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function readStoredPreferences() {
  if (typeof window === "undefined") {
    return DEFAULT_VOICE_PREFERENCES;
  }

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(
        VOICE_PREFERENCE_KEY
      ) || "{}"
    );

    return {
      ...DEFAULT_VOICE_PREFERENCES,
      ...(saved && typeof saved === "object"
        ? saved
        : {}),
    };
  } catch {
    return DEFAULT_VOICE_PREFERENCES;
  }
}

export function getHealthVoicePreferences() {
  return readStoredPreferences();
}

export function saveHealthVoicePreferences(next = {}) {
  const preferences = {
    ...readStoredPreferences(),
    ...(next && typeof next === "object"
      ? next
      : {}),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      VOICE_PREFERENCE_KEY,
      JSON.stringify(preferences)
    );
  }

  return preferences;
}

export async function loadHealthVoiceOptions({
  force = false,
} = {}) {
  if (!force && voiceOptionsPromise) {
    return voiceOptionsPromise;
  }

  voiceOptionsPromise = getHealthVoiceOptions()
    .catch((error) => {
      voiceOptionsPromise = null;
      throw error;
    });

  return voiceOptionsPromise;
}

export function canUseSpeechSynthesis() {
  return !!getSynth();
}

function releaseActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }

  if (
    activeAudioUrl &&
    typeof URL !== "undefined"
  ) {
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = "";
  }
}

export function stopCoachVoice() {
  if (activeVoiceRequest) {
    activeVoiceRequest.abort();
    activeVoiceRequest = null;
  }

  releaseActiveAudio();

  const synth = getSynth();
  if (synth) synth.cancel();
}

export function getAvailableCoachVoices() {
  const synth = getSynth();
  if (!synth) return [];
  return synth.getVoices() || [];
}

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function scoreVoice(voice, preference = "auto") {
  const haystack =
    `${voice?.name || ""} ${voice?.lang || ""}`
      .toLowerCase();
  let score = 0;

  if (haystack.includes("en-us")) score += 8;
  if (haystack.includes("en-gb")) score += 5;
  if (haystack.includes("english")) score += 4;
  if (voice?.localService) score += 2;

  if (preference === "female") {
    if (
      FEMALE_HINTS.some((hint) =>
        haystack.includes(hint)
      )
    ) {
      score += 20;
    }

    if (
      MALE_HINTS.some((hint) =>
        haystack.includes(hint)
      )
    ) {
      score -= 8;
    }
  }

  if (preference === "male") {
    if (
      MALE_HINTS.some((hint) =>
        haystack.includes(hint)
      )
    ) {
      score += 20;
    }

    if (
      FEMALE_HINTS.some((hint) =>
        haystack.includes(hint)
      )
    ) {
      score -= 8;
    }
  }

  return score;
}

export function pickCoachVoice(
  preference = "auto"
) {
  const voices = getAvailableCoachVoices();
  if (!voices.length) return null;

  const wanted = normalize(
    preference || "auto"
  );

  if (wanted === "auto") {
    return (
      voices.find((voice) =>
        String(voice?.lang || "")
          .toLowerCase()
          .includes("en-us")
      ) ||
      voices.find((voice) =>
        String(voice?.lang || "")
          .toLowerCase()
          .includes("en")
      ) ||
      voices[0]
    );
  }

  const ranked = [...voices].sort(
    (a, b) =>
      scoreVoice(b, wanted) -
      scoreVoice(a, wanted)
  );

  return ranked[0] || voices[0];
}

function speakWithBrowser({
  text,
  voicePreference = "auto",
  rate = 1,
  pitch = 1,
  volume = 1,
  cancelFirst = true,
}) {
  const synth = getSynth();
  const cleanText = String(text || "").trim();

  if (!synth || !cleanText) return false;

  try {
    if (cancelFirst) synth.cancel();

    const utterance =
      new SpeechSynthesisUtterance(cleanText);
    const selectedVoice =
      pickCoachVoice(voicePreference);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    synth.speak(utterance);
    return true;
  } catch (error) {
    console.error(
      "Browser coach voice error:",
      error
    );
    return false;
  }
}

async function playElevenLabsSpeech({
  text,
  eventType,
  energy,
  voiceKey,
  volume,
  cancelFirst,
}) {
  if (cancelFirst) stopCoachVoice();

  activeVoiceRequest = new AbortController();

  try {
    const result = await createHealthCoachSpeech({
      text,
      eventType,
      energy,
      voiceKey,
      signal: activeVoiceRequest.signal,
    });

    activeVoiceRequest = null;
    releaseActiveAudio();

    activeAudioUrl = URL.createObjectURL(
      result.blob
    );

    activeAudio = new Audio(activeAudioUrl);
    activeAudio.volume = Math.max(
      0,
      Math.min(1, Number(volume) || 1)
    );

    activeAudio.addEventListener(
      "ended",
      releaseActiveAudio,
      { once: true }
    );

    activeAudio.addEventListener(
      "error",
      releaseActiveAudio,
      { once: true }
    );

    await activeAudio.play();
    return true;
  } catch (error) {
    activeVoiceRequest = null;

    if (error?.name === "CanceledError") {
      return false;
    }

    throw error;
  }
}

export function speakCoachText({
  text,
  audioMode = "essential",
  voicePreference = "auto",
  rate = 1,
  pitch = 1,
  volume = 1,
  cancelFirst = true,
  eventType = "voice_preview",
  provider,
  voiceKey,
  energy,
  browserFallback,
}) {
  const cleanText = String(text || "").trim();

  if (!cleanText || audioMode === "off") {
    return false;
  }

  const preferences =
    getHealthVoicePreferences();

  const selectedProvider =
    provider || preferences.provider;
  const selectedVoiceKey =
    voiceKey || preferences.voiceKey;
  const selectedEnergy =
    energy || preferences.energy;
  const allowBrowserFallback =
    browserFallback ??
    preferences.browserFallback;

  if (selectedProvider !== "elevenlabs") {
    return speakWithBrowser({
      text: cleanText,
      voicePreference,
      rate,
      pitch,
      volume,
      cancelFirst,
    });
  }

  playElevenLabsSpeech({
    text: cleanText,
    eventType,
    energy: selectedEnergy,
    voiceKey: selectedVoiceKey,
    volume,
    cancelFirst,
  }).catch((error) => {
    console.warn(
      "ElevenLabs coach voice unavailable; " +
        "using browser fallback.",
      error
    );

    if (allowBrowserFallback) {
      speakWithBrowser({
        text: cleanText,
        voicePreference,
        rate,
        pitch,
        volume,
        cancelFirst: false,
      });
    }
  });

  return true;
}

export function previewHealthCoachVoice({
  energy = "high_energy",
  voiceKey = "sync_fitness_coach",
} = {}) {
  return speakCoachText({
    text:
      "There it is. Stay controlled, keep your form strong, " +
      "and finish this set with confidence.",
    eventType: "voice_preview",
    energy,
    voiceKey,
    cancelFirst: true,
  });
}

export function buildExerciseIntroSpeech(
  knowledge = {}
) {
  const name = knowledge?.name || "Exercise";
  const shortCue = knowledge?.short_cue || "";
  const feelCue = knowledge?.feel_cue || "";
  const warning =
    knowledge?.correction_cue ||
    knowledge?.coach_warning ||
    "";

  return [
    name,
    shortCue,
    feelCue,
    warning,
  ]
    .filter(Boolean)
    .join(". ");
}
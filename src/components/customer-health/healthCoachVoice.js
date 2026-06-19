// src/components/customer-health/healthCoachVoice.js

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

function getSynth() {
  if (typeof window === "undefined") return null;
  if (!("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

export function canUseSpeechSynthesis() {
  return !!getSynth();
}

export function stopCoachVoice() {
  const synth = getSynth();
  if (!synth) return;
  synth.cancel();
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
  const haystack = `${voice?.name || ""} ${voice?.lang || ""}`.toLowerCase();
  let score = 0;

  if (haystack.includes("en-us")) score += 8;
  if (haystack.includes("en-gb")) score += 5;
  if (haystack.includes("english")) score += 4;
  if (voice?.localService) score += 2;

  if (preference === "female") {
    if (FEMALE_HINTS.some((hint) => haystack.includes(hint))) score += 20;
    if (MALE_HINTS.some((hint) => haystack.includes(hint))) score -= 8;
  }

  if (preference === "male") {
    if (MALE_HINTS.some((hint) => haystack.includes(hint))) score += 20;
    if (FEMALE_HINTS.some((hint) => haystack.includes(hint))) score -= 8;
  }

  return score;
}

export function pickCoachVoice(preference = "auto") {
  const voices = getAvailableCoachVoices();
  if (!voices.length) return null;

  const wanted = normalize(preference || "auto");

  if (wanted === "auto") {
    return (
      voices.find((voice) =>
        String(voice?.lang || "").toLowerCase().includes("en-us")
      ) ||
      voices.find((voice) =>
        String(voice?.lang || "").toLowerCase().includes("en")
      ) ||
      voices[0]
    );
  }

  const ranked = [...voices].sort(
    (a, b) => scoreVoice(b, wanted) - scoreVoice(a, wanted)
  );

  return ranked[0] || voices[0];
}

export function speakCoachText({
  text,
  audioMode = "essential",
  voicePreference = "auto",
  rate = 1,
  pitch = 1,
  volume = 1,
  cancelFirst = true,
}) {
  const synth = getSynth();
  const cleanText = String(text || "").trim();

  if (!synth || !cleanText || audioMode === "off") return false;

  try {
    if (cancelFirst) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const selectedVoice = pickCoachVoice(voicePreference);

    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    synth.speak(utterance);
    return true;
  } catch (error) {
    console.error("Coach voice error:", error);
    return false;
  }
}

export function buildExerciseIntroSpeech(knowledge = {}) {
  const name = knowledge?.name || "Exercise";
  const shortCue = knowledge?.short_cue || "";
  const feelCue = knowledge?.feel_cue || "";
  const warning = knowledge?.correction_cue || knowledge?.coach_warning || "";

  return [name, shortCue, feelCue, warning].filter(Boolean).join(". ");
}
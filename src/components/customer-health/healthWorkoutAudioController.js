// src/components/customer-health/healthWorkoutAudioController.js
import {
  speakCoachText,
  stopCoachVoice,
} from "./healthCoachVoice";
import {
  announceCoachAudioState,
  buildPremiumCoachDelivery,
  normalizeWorkoutAudioMode,
  shouldPlayCoachEvent,
} from "./healthPremiumAudio";

const PRIORITY = { low: 1, normal: 2, high: 3, critical: 4 };
const PLAY_ONCE_EVENTS = new Set([
  "preworkout_briefing",
  "workout_completed",
  "workout_debrief",
]);

let currentMessage = null;
let currentTimer = null;
let queue = [];
let audioUnlocked = false;
let sequence = 0;

const playedCoachMessageIds = new Set();
const recentlyRequested = new Map();

function cleanText(value) {
  return String(value || "").trim();
}

function normalizePriority(value) {
  const key = String(value || "normal").toLowerCase();
  return PRIORITY[key] ? key : "normal";
}

function hashText(value) {
  const text = cleanText(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function estimateDurationMs(text) {
  const words = cleanText(text).split(/\s+/).filter(Boolean).length;
  return Math.max(900, Math.min(18000, 650 + words * 360));
}

function clearCurrentTimer() {
  if (currentTimer) {
    window.clearTimeout(currentTimer);
    currentTimer = null;
  }
}

function markRecent(id) {
  const now = Date.now();
  recentlyRequested.set(id, now);
  for (const [key, time] of recentlyRequested.entries()) {
    if (now - time > 15000) recentlyRequested.delete(key);
  }
}

function wasRecentlyRequested(id) {
  const time = recentlyRequested.get(id);
  return Boolean(time && Date.now() - time < 1800);
}

function finishCurrent() {
  clearCurrentTimer();
  const finishedId = currentMessage?.id || "";
  currentMessage = null;
  announceCoachAudioState({
    status: "idle",
    id: finishedId,
  });
  playNext();
}

function playNext() {
  if (currentMessage || !queue.length) return;

  queue.sort((left, right) => {
    const priorityDifference =
      PRIORITY[right.priority] - PRIORITY[left.priority];
    return priorityDifference || left.sequence - right.sequence;
  });

  const next = queue.shift();
  if (!next) return;

  if (next.playOnce && playedCoachMessageIds.has(next.id)) {
    playNext();
    return;
  }

  currentMessage = next;
  markRecent(next.id);

  announceCoachAudioState({
    status: "speaking",
    id: next.id,
    eventType: next.options.eventType || "coach_message",
    audioMode: next.options.audioMode || "basic",
    focusMode: Boolean(next.options.focusMode),
    musicCompatible: next.options.musicCompatible !== false,
  });

  const started = speakCoachText({
    ...next.options,
    text: next.text,
    cancelFirst: true,
  });

  if (!started) {
    currentMessage = null;
    playNext();
    return;
  }

  if (next.playOnce) {
    playedCoachMessageIds.add(next.id);
  }

  currentTimer = window.setTimeout(
    finishCurrent,
    estimateDurationMs(next.text)
  );
}

export function unlockWorkoutCoachAudio() {
  if (typeof window === "undefined") return false;
  audioUnlocked = true;

  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const context = new AudioContext();
      context.resume?.();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.00001;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.01);
      window.setTimeout(() => context.close?.(), 50);
    }
  } catch {
    // Real playback still receives the user gesture.
  }

  return true;
}

export function playWorkoutCoachMessage({
  id,
  text,
  priority = "normal",
  playOnce,
  replace = false,
  ...options
} = {}) {
  const clean = cleanText(text);
  const eventType = options.eventType || "coach_message";
  const normalizedAudioMode = normalizeWorkoutAudioMode(
    options.audioMode
  );

  if (
    !clean ||
    !shouldPlayCoachEvent({
      audioMode: normalizedAudioMode,
      eventType,
      priority,
    })
  ) {
    return false;
  }

  const premiumDelivery = buildPremiumCoachDelivery({
    audioMode: normalizedAudioMode,
    eventType,
    priority,
  });
  const messageId =
    cleanText(id) || `${eventType}:${hashText(clean)}`;
  const shouldPlayOnce =
    playOnce ?? PLAY_ONCE_EVENTS.has(eventType);

  if (
    (shouldPlayOnce && playedCoachMessageIds.has(messageId)) ||
    wasRecentlyRequested(messageId) ||
    queue.some((message) => message.id === messageId) ||
    currentMessage?.id === messageId
  ) {
    return false;
  }

  const normalizedPriority = normalizePriority(priority);
  const message = {
    id: messageId,
    text: clean,
    priority: normalizedPriority,
    playOnce: shouldPlayOnce,
    sequence: sequence += 1,
    options: {
      ...options,
      ...premiumDelivery,
      audioMode: normalizedAudioMode,
      eventType,
    },
  };

  const shouldInterrupt =
    replace ||
    (currentMessage &&
      PRIORITY[normalizedPriority] >
        PRIORITY[currentMessage.priority]);

  if (shouldInterrupt) {
    clearCurrentTimer();
    stopCoachVoice();
    currentMessage = null;
  }

  queue.push(message);
  playNext();
  return true;
}

export function stopWorkoutCoachAudio({
  clearPlayed = false,
} = {}) {
  clearCurrentTimer();
  queue = [];
  currentMessage = null;
  stopCoachVoice();
  announceCoachAudioState({ status: "idle", id: "" });

  if (clearPlayed) {
    playedCoachMessageIds.clear();
    recentlyRequested.clear();
  }
}

export function getWorkoutCoachAudioState() {
  return {
    currentCoachMessageId: currentMessage?.id || "",
    playedCoachMessageIds: [...playedCoachMessageIds],
    queuedCoachMessages: queue.map((message) => ({
      id: message.id,
      priority: message.priority,
    })),
    audioUnlocked,
    isSpeaking: Boolean(currentMessage),
  };
}

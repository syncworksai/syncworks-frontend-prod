export const SYNC_VOICE_STATES = {
  idle: {
    label: "Ready",
    supportingText: "Tap the microphone and speak naturally.",
    ringDuration: 28,
    glow: 0.46,
    color: "cyan",
  },
  listening: {
    label: "Listening…",
    supportingText: "SYNC is listening for your request.",
    ringDuration: 10,
    glow: 0.88,
    color: "cyan",
  },
  thinking: {
    label: "Thinking…",
    supportingText: "Reviewing your workspace and preparing the next step.",
    ringDuration: 5.5,
    glow: 0.78,
    color: "violet",
  },
  speaking: {
    label: "Speaking…",
    supportingText: "SYNC is responding.",
    ringDuration: 8,
    glow: 0.96,
    color: "magenta",
  },
  success: {
    label: "Complete",
    supportingText: "The requested step is ready.",
    ringDuration: 12,
    glow: 1,
    color: "success",
  },
  error: {
    label: "Something went wrong",
    supportingText: "Check the connection or try again.",
    ringDuration: 18,
    glow: 0.82,
    color: "error",
  },
};

export const SYNC_VOICE_STATUS_VALUES = Object.keys(SYNC_VOICE_STATES);

export function normalizeSyncVoiceStatus(value) {
  return SYNC_VOICE_STATES[value] ? value : "idle";
}

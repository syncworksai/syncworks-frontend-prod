import api from "./client";

export async function getCustomerHealthProfile() {
  const response = await api.get(
    "/customer-health/me/"
  );

  return response.data;
}

export async function patchCustomerHealthProfile(
  payload
) {
  const response = await api.patch(
    "/customer-health/me/",
    payload
  );

  return response.data;
}

export async function redeemHealthAccessCode(code) {
  const response = await api.post(
    "/customer-health/redeem-access-code/",
    {
      code: String(code || "")
        .trim()
        .toUpperCase(),
    }
  );

  return response.data;
}

export async function getHealthVoiceOptions() {
  const response = await api.get(
    "/customer-health/voice/options/"
  );

  return response.data;
}

export async function createHealthCoachSpeech({
  text,
  eventType = "voice_preview",
  energy = "high_energy",
  voiceKey = "sync_fitness_coach",
  signal,
}) {
  const response = await api.post(
    "/customer-health/voice/speak/",
    {
      text,
      event_type: eventType,
      energy,
      voice_key: voiceKey,
    },
    {
      responseType: "blob",
      signal,
    }
  );

  return {
    blob: response.data,
    contentType:
      response.headers?.["content-type"] ||
      "audio/mpeg",
    voiceName:
      response.headers?.["x-syncworks-voice-name"] ||
      "SYNC Fitness Coach",
  };
}
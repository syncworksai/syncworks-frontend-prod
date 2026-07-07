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

export async function getHealthAiStatus() {
  const response = await api.get(
    "/customer-health/ai/status/"
  );

  return response.data;
}

export async function redeemHealthAiPromo(code) {
  const response = await api.post(
    "/customer-health/ai/redeem-promo/",
    {
      code: String(code || "")
        .trim()
        .toUpperCase(),
    }
  );

  return response.data;
}


export async function createHealthCoachTurn({
  userText,
  profile,
  snapshot,
  history,
}) {
  const response = await api.post(
    "/customer-health/coach/chat/",
    {
      user_text: String(userText || "").trim(),
      profile: profile || {},
      snapshot: snapshot || {},
      history: Array.isArray(history)
        ? history.slice(-12)
        : [],
    }
  );

  return response.data;
}

export async function submitHealthBetaFeedback(payload = {}) {
  const response = await api.post(
    "/customer-health/beta-feedback/",
    {
      client_feedback_id: payload.id || payload.client_feedback_id || "",
      area: payload.area || "General",
      severity: payload.severity || "Medium",
      message: String(payload.message || "").trim(),
      source: payload.source || "health_web_beta",
      page_path: payload.page_path || "",
      runtime_json: payload.runtime || payload.runtime_json || {},
      extra_json: payload.extra_json || {},
    }
  );

  return response.data;
}

export async function getHealthGodModeBetaFeedback() {
  const response = await api.get(
    "/customer-health/god-mode/beta-feedback/"
  );

  return response.data;
}

export async function updateHealthGodModeFeedbackStatus(
  feedbackId,
  status
) {
  const response = await api.patch(
    `/customer-health/god-mode/beta-feedback/${feedbackId}/`,
    {
      status: String(status || "").trim().toUpperCase(),
    }
  );

  return response.data;
}

// src/api/healthProfiles.js
import api, {
  getApiErrorStatus,
  isNetworkLikeError,
} from "./client";

function responseData(response) {
  return response?.data ?? response ?? null;
}

function normalizedError(error, fallbackMessage) {
  const status = getApiErrorStatus(error);
  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage;

  const normalized = new Error(String(detail || fallbackMessage));
  normalized.status = status;
  normalized.networkLike = isNetworkLikeError(error);
  normalized.payload = error?.response?.data || null;
  normalized.original = error;
  return normalized;
}

export async function getHealthAthleteProfile() {
  try {
    const response = await api.get("/health/profile/");
    return responseData(response);
  } catch (error) {
    throw normalizedError(
      error,
      "Unable to load the athlete profile."
    );
  }
}

export async function updateHealthAthleteProfile(patch) {
  try {
    const response = await api.patch(
      "/health/profile/",
      patch
    );
    return responseData(response);
  } catch (error) {
    throw normalizedError(
      error,
      "Unable to save the athlete profile."
    );
  }
}

export async function runHealthPlanControl({
  action,
  confirmed = false,
} = {}) {
  try {
    const response = await api.post(
      "/health/plan-control/",
      { action, confirmed }
    );
    return responseData(response);
  } catch (error) {
    throw normalizedError(
      error,
      "Unable to update the training plan."
    );
  }
}

export async function updateHealthSimulationPreferences(
  simulationPreferences
) {
  try {
    const response = await api.patch(
      "/health/simulation-preferences/",
      {
        simulation_preferences: simulationPreferences,
      }
    );
    return responseData(response);
  } catch (error) {
    throw normalizedError(
      error,
      "Unable to save simulation preferences."
    );
  }
}

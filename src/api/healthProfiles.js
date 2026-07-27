// src/api/healthProfiles.js
import api, {
  getApiErrorStatus,
  isNetworkLikeError,
} from "./client";
import {
  enqueueHealthProfileSync,
  getPendingHealthProfileSyncs,
  removeHealthProfileSync,
  updateHealthProfileSync,
} from "./healthProfileSyncQueue";

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

export async function updateHealthAthleteProfile(patch, { queueOnFailure = true } = {}) {
  try {
    const response = await api.patch(
      "/health/profile/",
      patch
    );
    return responseData(response);
  } catch (error) {
    const normalized = normalizedError(
      error,
      "Unable to save the athlete profile."
    );
    if (queueOnFailure && normalized.networkLike) {
      enqueueHealthProfileSync("profile", patch);
      normalized.queued = true;
    }
    throw normalized;
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
  simulationPreferences,
  { queueOnFailure = true } = {}
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
    const normalized = normalizedError(
      error,
      "Unable to save simulation preferences."
    );
    if (queueOnFailure && normalized.networkLike) {
      enqueueHealthProfileSync(
        "simulation",
        simulationPreferences
      );
      normalized.queued = true;
    }
    throw normalized;
  }
}


export async function flushHealthProfileSyncQueue() {
  const results = [];

  for (const item of getPendingHealthProfileSyncs()) {
    try {
      if (item.type === "profile") {
        await updateHealthAthleteProfile(item.payload, {
          queueOnFailure: false,
        });
      } else if (item.type === "simulation") {
        await updateHealthSimulationPreferences(
          item.payload,
          { queueOnFailure: false }
        );
      }

      removeHealthProfileSync(item.id);
      results.push({ id: item.id, status: "synced" });
    } catch (error) {
      updateHealthProfileSync({
        ...item,
        attempts: Number(item.attempts || 0) + 1,
        lastAttemptAt: new Date().toISOString(),
        lastError: error?.message || "Sync failed.",
      });
      results.push({ id: item.id, status: "failed" });
      if (error?.networkLike) break;
    }
  }

  return results;
}

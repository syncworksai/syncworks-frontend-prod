import api from "./client";

export async function trackSyncUsage(area, action, metadata = {}) {
  try {
    await api.post("/sync-ai/usage/track/", { area, action, metadata });
  } catch {
    // Usage telemetry must never block the user's task.
  }
}

export async function getSyncUsageSummary() {
  const response = await api.get("/sync-ai/usage/summary/");
  return response?.data || null;
}

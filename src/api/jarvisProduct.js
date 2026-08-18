import api from "./client";

export async function getJarvisProduct() {
  const response = await api.get("/sync-ai/assistant/profile/");
  return response?.data || {};
}

export async function updateJarvisProduct(payload) {
  const response = await api.patch("/sync-ai/assistant/profile/", payload);
  return response?.data || {};
}

export async function checkInJarvis() {
  const response = await api.post("/sync-ai/assistant/check-in/", {});
  return response?.data || {};
}

export async function checkOutJarvis(reason = "MANUAL") {
  const response = await api.post("/sync-ai/assistant/check-out/", { reason });
  return response?.data || {};
}

export async function startJarvisCheckout(plan) {
  const response = await api.post("/sync-ai/assistant/billing/checkout/", { plan });
  return response?.data || {};
}

export async function startSyncAssistantLiveCheckout() {
  const response = await api.post("/sync-ai/assistant/billing/live/checkout/", {});
  return response?.data || {};
}

export async function openJarvisBillingPortal() {
  const response = await api.post("/sync-ai/assistant/billing/portal/", {});
  return response?.data || {};
}

export async function getSyncAssistantDailyState() {
  const response = await api.get("/sync-ai/assistant/daily-state/");
  return response?.data || {};
}

export async function setSyncDepartureReminder(eventId, payload) {
  const response = await api.post(`/sync-ai/assistant/calendar/${eventId}/departure-reminder/`, payload);
  return response?.data || {};
}

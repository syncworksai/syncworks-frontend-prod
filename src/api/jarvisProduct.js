import api from "./client";

export async function getJarvisProduct() {
  const response = await api.get("/sync-ai/jarvis/profile/");
  return response?.data || {};
}

export async function updateJarvisProduct(payload) {
  const response = await api.patch("/sync-ai/jarvis/profile/", payload);
  return response?.data || {};
}

export async function checkInJarvis() {
  const response = await api.post("/sync-ai/jarvis/check-in/", {});
  return response?.data || {};
}

export async function checkOutJarvis(reason = "MANUAL") {
  const response = await api.post("/sync-ai/jarvis/check-out/", { reason });
  return response?.data || {};
}

export async function startJarvisCheckout(plan) {
  const response = await api.post("/sync-ai/jarvis/billing/checkout/", { plan });
  return response?.data || {};
}

export async function openJarvisBillingPortal() {
  const response = await api.post("/sync-ai/jarvis/billing/portal/", {});
  return response?.data || {};
}

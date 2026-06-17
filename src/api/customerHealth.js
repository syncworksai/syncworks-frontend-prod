// src/api/customerHealth.js
import api from "./client";

export async function getCustomerHealthProfile() {
  const res = await api.get("/customer-health/me/");
  return res.data;
}

export async function patchCustomerHealthProfile(payload) {
  const res = await api.patch("/customer-health/me/", payload);
  return res.data;
}
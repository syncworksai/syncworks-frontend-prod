import api, { getActiveBusinessId } from "./client";

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

export async function getPracticeSettings() {
  const businessId = getActiveBusinessId();
  const response = await api.get("/sync-ai/professional/business/practice/", {
    params: businessId ? { business_id: businessId } : {},
  });
  return response?.data || {};
}

export async function savePracticeSettings(payload = {}) {
  const businessId = getActiveBusinessId();
  const response = await api.patch("/sync-ai/professional/business/practice/", {
    ...payload,
    ...(businessId ? { business_id: businessId } : {}),
  });
  return response?.data || {};
}

export async function listBusinessAppointments() {
  const businessId = getActiveBusinessId();
  const response = await api.get("/sync-ai/professional/business/appointments/", {
    params: businessId ? { business_id: businessId } : {},
  });
  return rowsOf(response?.data);
}

export async function proposeBusinessAppointment(payload = {}) {
  const businessId = getActiveBusinessId();
  const response = await api.post("/sync-ai/professional/business/appointments/", {
    ...payload,
    ...(businessId ? { business_id: businessId } : {}),
  });
  return response?.data || {};
}

export async function listCustomerAppointments() {
  const response = await api.get("/sync-ai/professional/customer/appointments/");
  return rowsOf(response?.data);
}

export async function respondToCustomerAppointment(appointmentId, payload = {}) {
  const response = await api.post(
    `/sync-ai/professional/customer/appointments/${appointmentId}/respond/`,
    payload
  );
  return response?.data || {};
}

export async function discoverProfessionalPractices(filters = {}) {
  const params = {};
  for (const [key, value] of Object.entries(filters)) {
    if (String(value || "").trim()) params[key] = String(value).trim();
  }
  const response = await api.get("/sync-ai/professional/discover/", { params });
  return rowsOf(response?.data);
}

import api, { getActiveBusinessId } from "./client";

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function businessParams(extra = {}) {
  const businessId = getActiveBusinessId();
  return { ...extra, ...(businessId ? { business_id: businessId } : {}) };
}

export async function getPracticeSettings() {
  const response = await api.get("/sync-ai/professional/business/practice/", { params: businessParams() });
  return response?.data || {};
}

export async function savePracticeSettings(payload = {}) {
  const response = await api.patch("/sync-ai/professional/business/practice/", businessParams(payload));
  return response?.data || {};
}

export async function listProfessionalProviders() {
  const response = await api.get("/sync-ai/professional/business/providers/", { params: businessParams() });
  return rowsOf(response?.data);
}

export async function createProfessionalProvider(payload = {}) {
  const response = await api.post("/sync-ai/professional/business/providers/", businessParams(payload));
  return response?.data || {};
}

export async function updateProfessionalProvider(providerId, payload = {}) {
  const response = await api.patch(`/sync-ai/professional/business/providers/${providerId}/`, businessParams(payload));
  return response?.data || {};
}

export async function deleteProfessionalProvider(providerId) {
  await api.delete(`/sync-ai/professional/business/providers/${providerId}/`, { data: businessParams() });
}

export async function listProfessionalResources() {
  const response = await api.get("/sync-ai/professional/business/resources/", { params: businessParams() });
  return rowsOf(response?.data);
}

export async function createProfessionalResource(payload = {}) {
  const response = await api.post("/sync-ai/professional/business/resources/", businessParams(payload));
  return response?.data || {};
}

export async function updateProfessionalResource(resourceId, payload = {}) {
  const response = await api.patch(`/sync-ai/professional/business/resources/${resourceId}/`, businessParams(payload));
  return response?.data || {};
}

export async function deleteProfessionalResource(resourceId) {
  await api.delete(`/sync-ai/professional/business/resources/${resourceId}/`, { data: businessParams() });
}

export async function getProfessionalAvailability(filters = {}) {
  const response = await api.get("/sync-ai/professional/business/availability/", { params: businessParams(filters) });
  return rowsOf(response?.data);
}

export async function listBusinessAppointments() {
  const response = await api.get("/sync-ai/professional/business/appointments/", { params: businessParams() });
  return rowsOf(response?.data);
}

export async function proposeBusinessAppointment(payload = {}) {
  const response = await api.post("/sync-ai/professional/business/appointments/", businessParams(payload));
  return response?.data || {};
}

export async function listCustomerAppointments() {
  const response = await api.get("/sync-ai/professional/customer/appointments/");
  return rowsOf(response?.data);
}

export async function respondToCustomerAppointment(appointmentId, payload = {}) {
  const response = await api.post(`/sync-ai/professional/customer/appointments/${appointmentId}/respond/`, payload);
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

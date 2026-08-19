import api from "./client";

export async function getIdentityProfile() {
  const response = await api.get("/identity/profile/");
  return response?.data || {};
}

export async function patchIdentityProfile(payload = {}) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const response = await api.patch("/identity/profile/", payload, config);
  return response?.data || {};
}

export async function listIdentityLocations() {
  const response = await api.get("/identity/locations/");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createIdentityLocation(payload = {}) {
  const response = await api.post("/identity/locations/", payload);
  return response?.data || {};
}

export async function patchIdentityLocation(id, payload = {}) {
  const response = await api.patch(`/identity/locations/${id}/`, payload);
  return response?.data || {};
}

export async function deleteIdentityLocation(id) {
  await api.delete(`/identity/locations/${id}/`);
}

export async function validateCurrentLocation(latitude, longitude) {
  const response = await api.post("/identity/current-location/", { latitude, longitude });
  return response?.data || {};
}

export async function resolveCurrentLocation(latitude, longitude) {
  const response = await api.post("/identity/current-location/resolve/", { latitude, longitude });
  return response?.data || {};
}

export async function getBusinessTrust(businessId) {
  const response = await api.get(`/identity/businesses/${businessId}/trust/`);
  return response?.data || {};
}

export async function submitBusinessVerification(businessId) {
  const response = await api.patch(`/identity/businesses/${businessId}/trust/`, { action: "SUBMIT" });
  return response?.data || {};
}

export function getBrowserPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error("Geolocation is not supported by this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000, ...options }
    );
  });
}

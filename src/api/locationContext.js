import api from "./client";

export async function resolveLocationContext(feature, current = null) {
  const payload = { feature: String(feature || "").toUpperCase() };
  if (current?.latitude != null && current?.longitude != null) {
    payload.latitude = current.latitude;
    payload.longitude = current.longitude;
    payload.current_label = current.label || "Current location";
  }
  const response = await api.post("/identity/context-location/", payload);
  return response?.data || null;
}

export async function getBrowserCurrentLocation(options = {}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Current location is not supported on this device.");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        label: "Current location",
      }),
      reject,
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000, ...options },
    );
  });
}

export async function resolveFeatureLocation(feature, { useBrowserLocation = true } = {}) {
  let current = null;
  if (useBrowserLocation) {
    try { current = await getBrowserCurrentLocation(); } catch { current = null; }
  }
  return resolveLocationContext(feature, current);
}

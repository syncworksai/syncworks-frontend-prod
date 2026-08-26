import api from "./client";
import { getBrowserCurrentLocation } from "./locationContext";

export async function getLiveWeather() {
  const current = await getBrowserCurrentLocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  const response = await api.post("/identity/live-weather/", {
    latitude: current.latitude,
    longitude: current.longitude,
  });
  return response?.data || {};
}

export async function getLiveTraffic(destination) {
  const clean = String(destination || "").trim();
  if (!clean) throw new Error("Enter a destination first.");
  const current = await getBrowserCurrentLocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  const response = await api.post("/identity/live-traffic/", {
    latitude: current.latitude,
    longitude: current.longitude,
    destination: clean,
  });
  return response?.data || {};
}

export function liveContextError(error, fallback) {
  const apiDetail = error?.response?.data?.detail;
  if (apiDetail) return apiDetail;
  if (error?.code === 1) return "Location permission is required. Allow location for SyncWorks in iPhone Settings and try again.";
  if (error?.code === 2) return "Your current location could not be determined. Try again in a moment.";
  if (error?.code === 3) return "Location took too long to respond. Try again.";
  return error?.message || fallback;
}

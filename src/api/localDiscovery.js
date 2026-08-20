import api from "./client";
import { getBrowserCurrentLocation } from "./locationContext";

export async function searchLocalDiscovery({ category = "NEARBY", query = "", radiusMeters = 12000, useCurrentLocation = true } = {}) {
  const payload = {
    category: String(category || "NEARBY").toUpperCase(),
    query: String(query || "").trim(),
    radius_meters: radiusMeters,
  };

  if (useCurrentLocation) {
    try {
      const point = await getBrowserCurrentLocation();
      payload.latitude = point.latitude;
      payload.longitude = point.longitude;
      payload.current_label = "Current location";
    } catch {
      // Backend context router safely falls back to Home when current location
      // is unavailable, denied, or disabled in the user's settings.
    }
  }

  const response = await api.post("/identity/discover/", payload);
  return response?.data || {};
}

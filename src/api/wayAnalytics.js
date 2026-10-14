import api from "./client";

export async function getWayAnalytics(teamId) {
  const { data } = await api.get(`/sports/way-analytics/${teamId}/`, { timeout: 45000 });
  return data;
}

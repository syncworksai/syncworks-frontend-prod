import api from "./client";

export async function getWayAnalytics(teamId) {
  const { data } = await api.get(`/sports/way-analytics/${teamId}/`, { timeout: 45000 });
  return data;
}

export async function getWayTrend(teamId) {
  const { data } = await api.get(`/sports/way-analytics/${teamId}/trend/`, { timeout: 45000 });
  return data;
}

export async function getWayRatings(teamId) {
  const { data } = await api.get(`/sports/way-analytics/${teamId}/ratings/`, { timeout: 45000 });
  return data;
}

export async function rateWayPlayer(teamId, payload) {
  const { data } = await api.post(`/sports/way-analytics/${teamId}/rate-player/`, payload, { timeout: 45000 });
  return data;
}

export async function saveWayWeekTarget(teamId, payload) {
  const { data } = await api.post(`/sports/way-analytics/${teamId}/week-target/`, payload, { timeout: 45000 });
  return data;
}

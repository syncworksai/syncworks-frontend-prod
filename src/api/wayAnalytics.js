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

export async function getExecutionTotals(teamId) {
  const { data } = await api.get(`/sports/way-analytics/${teamId}/execution-totals/`, { timeout: 45000 });
  return data;
}

export async function saveExecutionTotal(teamId, payload) {
  const { data } = await api.post(`/sports/way-analytics/${teamId}/execution-totals/`, payload, { timeout: 45000 });
  return data;
}

export async function getQABTotals(teamId) {
  const { data } = await api.get(`/sports/way-qab/${teamId}/`, { timeout: 45000 });
  return data;
}

export async function saveQABTotal(teamId, payload) {
  const { data } = await api.post(`/sports/way-qab/`, { team: teamId, ...payload }, { timeout: 45000 });
  return data;
}

export async function saveQABBands(teamId, payload) {
  const { data } = await api.patch(`/sports/way-qab/${teamId}/`, payload, { timeout: 45000 });
  return data;
}

export async function saveWayWeekTarget(teamId, payload) {
  const { data } = await api.post(`/sports/way-analytics/${teamId}/week-target/`, payload, { timeout: 45000 });
  return data;
}

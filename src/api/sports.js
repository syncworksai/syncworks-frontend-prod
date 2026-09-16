import api from "./client";

function list(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export async function getSportsTeams() {
  const { data } = await api.get("/sports/teams/");
  return list(data);
}

export async function ensureSportsTeam(group, sport = "SOFTBALL") {
  const { data } = await api.post("/sports/teams/ensure/", { group, sport });
  return data;
}

export async function updateSportsTeam(id, payload) {
  const { data } = await api.patch(`/sports/teams/${id}/`, payload);
  return data;
}

export async function getTeamDashboard(id) {
  const { data } = await api.get(`/sports/teams/${id}/dashboard/`);
  return data;
}

export async function getTeamStats(id) {
  const { data } = await api.get(`/sports/teams/${id}/stats/`);
  return list(data);
}

export async function getAdvancedTeamStats(id) {
  const { data } = await api.get(`/sports/advanced/teams/${id}/stats/`);
  return data;
}

export async function getPlayerSpray(id) {
  const { data } = await api.get(`/sports/advanced/players/${id}/spray/`);
  return data;
}

export async function getSportsPlayers(team) {
  const { data } = await api.get("/sports/players/", { params: { team } });
  return list(data);
}

export async function createSportsPlayer(payload) {
  const { data } = await api.post("/sports/players/", payload);
  return data;
}

export async function updateSportsPlayer(id, payload) {
  const { data } = await api.patch(`/sports/players/${id}/`, payload);
  return data;
}

export async function removeSportsPlayer(id) {
  await api.delete(`/sports/players/${id}/`);
}

export async function getSportsGames(team) {
  const { data } = await api.get("/sports/games/", { params: { team } });
  return list(data);
}

export async function getSportsGame(id) {
  const { data } = await api.get(`/sports/games/${id}/`);
  return data;
}

export async function createSportsGame(payload) {
  const { data } = await api.post("/sports/games/", payload);
  return data;
}

export async function updateSportsGame(id, payload) {
  const { data } = await api.patch(`/sports/games/${id}/`, payload);
  return data;
}

export async function cancelSportsGame(id) {
  await api.delete(`/sports/games/${id}/`);
}

export async function setSportsLineup(id, spots) {
  const { data } = await api.post(`/sports/games/${id}/set-lineup/`, { spots });
  return data;
}

export async function startSportsGame(id) {
  const { data } = await api.post(`/sports/games/${id}/start/`);
  return data;
}

export async function recordSoftballPlay(id, payload) {
  const { data } = await api.post(`/sports/games/${id}/play/`, payload);
  return data;
}

export async function saveSoftballPlayContext(payload) {
  const { data } = await api.post("/sports/advanced/play-context/", payload);
  return data;
}

export async function undoSoftballPlay(id) {
  const { data } = await api.post(`/sports/games/${id}/undo/`);
  return data;
}

export async function setOpponentScore(id, runsAgainst) {
  const { data } = await api.post(`/sports/games/${id}/opponent-score/`, { runs_against: runsAgainst });
  return data;
}

export async function finishSportsGame(id, payload = {}) {
  const { data } = await api.post(`/sports/games/${id}/finish/`, payload);
  return data;
}

export async function getPlateAppearances(game) {
  const { data } = await api.get("/sports/plate-appearances/", { params: { game } });
  return list(data);
}

export async function getGameCastSettings(gameId) {
  const { data } = await api.get(`/sports/advanced/games/${gameId}/gamecast/`);
  return data;
}

export async function updateGameCastSettings(gameId, payload) {
  const { data } = await api.post(`/sports/advanced/games/${gameId}/gamecast/`, payload);
  return data;
}

export async function getPublicGameCast(token) {
  const { data } = await api.get(`/sports/gamecast/${token}/`);
  return data;
}

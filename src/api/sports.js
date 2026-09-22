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

export async function getPlayerCenter(id) {
  const { data } = await api.get(`/sports/teams/${id}/player-center/`);
  return data;
}

export async function getTeamDashboard(id) {
  const [dashboardResponse, gamesResponse] = await Promise.all([
    api.get(`/sports/teams/${id}/dashboard/`),
    api.get("/sports/games/", { params: { team: id } }),
  ]);
  const data = dashboardResponse.data;
  const allGames = list(gamesResponse.data);
  const now = Date.now();
  data.upcoming_games = allGames
    .filter((game) => game.status === "SCHEDULED" && new Date(game.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  data.needs_completion_games = allGames
    .filter((game) => game.status === "SCHEDULED" && new Date(game.start_at).getTime() < now)
    .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
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

export async function getPlayerCard(id) {
  const { data } = await api.get(`/sports/advanced/players/${id}/card/`);
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

export async function joinMySportsTeamRoster(team) {
  const { data } = await api.post("/sports/players/join-mine/", { team });
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
  const { data } = await api.get(`/sports/games/${id}/`, { timeout: 45000 });
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

export async function substituteSportsGame(id, payload) {
  const { data } = await api.post(`/sports/games/${id}/substitute/`, payload);
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

export async function deleteSportsGameBook(id) {
  const { data } = await api.post(`/sports/games/${id}/delete-book/`, {});
  return data;
}

export async function reopenSportsGame(id) {
  const { data } = await api.post(`/sports/games/${id}/reopen/`, {});
  return data;
}

export async function getPlateAppearances(game) {
  const { data } = await api.get("/sports/plate-appearances/", { params: { game }, timeout: 45000 });
  return list(data);
}

export async function correctSoftballPlay(id, payload) {
  const { data } = await api.patch(`/sports/plate-appearances/${id}/correct/`, payload);
  return data;
}

export async function getGameCastSettings(gameId) {
  const { data } = await api.get(`/sports/games/${gameId}/gamecast/`, { timeout: 45000 });
  return data;
}

export async function updateGameCastSettings(gameId, payload) {
  const { data } = await api.post(`/sports/games/${gameId}/gamecast/`, payload);
  return data;
}

export async function getPublicGameCast(token) {
  const { data } = await api.get(`/sports/games/gamecast-public/`, { params: { token } });
  return data;
}

export async function getPlayerProfiles(team) {
  const { data } = await api.get("/sports/player-profiles/", { params: { team } });
  return list(data);
}

export async function createPlayerProfile(payload) {
  const { data } = await api.post("/sports/player-profiles/", payload);
  return data;
}

export async function updatePlayerProfile(id, payload) {
  const { data } = await api.patch(`/sports/player-profiles/${id}/`, payload);
  return data;
}

export async function getTeamPaymentSettings(team) {
  const { data } = await api.get("/sports/payment-settings/", { params: { team } });
  return list(data)[0] || null;
}

export async function ensureTeamPaymentSettings(team) {
  const { data } = await api.post("/sports/payment-settings/ensure/", { team });
  return data;
}

export async function updateTeamPaymentSettings(id, payload) {
  const { data } = await api.patch(`/sports/payment-settings/${id}/`, payload);
  return data;
}

export async function getTeamFees(team) {
  const { data } = await api.get("/sports/team-fees/", { params: { team } });
  return list(data);
}

export async function createTeamFee(payload) {
  const { data } = await api.post("/sports/team-fees/", payload);
  return data;
}

export async function updateTeamFee(id, payload) {
  const { data } = await api.patch(`/sports/team-fees/${id}/`, payload);
  return data;
}

export async function assignTeamFeeRoster(id) {
  const { data } = await api.post(`/sports/team-fees/${id}/assign-roster/`, {});
  return data;
}

export async function getFeeAssignments(team) {
  const { data } = await api.get("/sports/fee-assignments/", { params: { team } });
  return list(data);
}

export async function updateFeeAssignment(id, payload) {
  const { data } = await api.patch(`/sports/fee-assignments/${id}/`, payload);
  return data;
}

export async function getStatLedger(team, scope) {
  const { data } = await api.get("/sports/stat-ledger/", { params: { team, scope } });
  return list(data);
}

export async function createStatLedgerEntry(payload) {
  const { data } = await api.post("/sports/stat-ledger/", payload);
  return data;
}

export async function updateStatLedgerEntry(id, payload) {
  const { data } = await api.patch(`/sports/stat-ledger/${id}/`, payload);
  return data;
}

export async function removeStatLedgerEntry(id) {
  await api.delete(`/sports/stat-ledger/${id}/`);
}

export async function getScopedTeamStats(team, scope = "ALL") {
  const { data } = await api.get("/sports/stat-ledger/summary/", { params: { team, scope } });
  return data;
}

export async function getSportsOrganizations() {
  const { data } = await api.get("/sports/organizations/");
  return list(data);
}

export async function createSportsOrganization(payload) {
  const { data } = await api.post("/sports/organizations/", payload);
  return data;
}

export async function getSportsOrganizationDashboard(id) {
  const { data } = await api.get(`/sports/organizations/${id}/dashboard/`);
  return data;
}

export async function getLeagueSeasons(organization) {
  const { data } = await api.get("/sports/seasons/", { params: { organization } });
  return list(data);
}

export async function createLeagueSeason(payload) {
  const { data } = await api.post("/sports/seasons/", payload);
  return data;
}

export async function getLeagueDivisions(season) {
  const { data } = await api.get("/sports/divisions/", { params: { season } });
  return list(data);
}

export async function createLeagueDivision(payload) {
  const { data } = await api.post("/sports/divisions/", payload);
  return data;
}

export async function getLeagueTeams(division) {
  const { data } = await api.get("/sports/league-teams/", { params: { division } });
  return list(data);
}

export async function addLeagueTeam(payload) {
  const { data } = await api.post("/sports/league-teams/", payload);
  return data;
}

export async function getLeagueRoster({ division, team } = {}) {
  const { data } = await api.get("/sports/league-rosters/", { params: { division, team } });
  return list(data);
}

export async function inviteLeaguePlayer(payload) {
  const { data } = await api.post("/sports/league-rosters/invite-email/", payload);
  return data;
}

export async function claimMyLeagueRosters() {
  const { data } = await api.post("/sports/league-rosters/claim-mine/");
  return data;
}


export async function inviteSportsPlayer(id, email = "") {
  const { data } = await api.post(`/sports/players/${id}/invite/`, email ? { email } : {});
  return data;
}

export async function remindSportsPlayer(id, kind = "GENERAL", body = "") {
  const { data } = await api.post(`/sports/players/${id}/remind/`, { kind, body });
  return data;
}

export async function remindTeamDues(id) {
  const { data } = await api.post(`/sports/teams/${id}/remind-dues/`, {});
  return data;
}


export async function setOpponentHomeRuns(id, homeRunsAgainst) {
  const { data } = await api.post(`/sports/games/${id}/opponent-home-runs/`, { home_runs_against: homeRunsAgainst });
  return data;
}

export async function updateDefensivePosition(id, player, defensivePosition) {
  const { data } = await api.post(`/sports/games/${id}/defensive-position/`, {
    player,
    defensive_position: defensivePosition,
  });
  return data;
}

export async function getSoftballRuleSets(params = {}) {
  const { data } = await api.get("/sports/rule-sets/", { params });
  return list(data);
}

export async function createSoftballRuleSet(payload) {
  const { data } = await api.post("/sports/rule-sets/", payload);
  return data;
}

export async function updateSoftballRuleSet(id, payload) {
  const { data } = await api.patch(`/sports/rule-sets/${id}/`, payload);
  return data;
}


export async function getTeamInningStats(id) {
  const { data } = await api.get(`/sports/teams/${id}/inning-stats/`);
  return data;
}

export async function updateGameInningLine(id, payload) {
  const { data } = await api.post(`/sports/games/${id}/inning-line/`, payload);
  return data;
}


export async function getSportsOrganizationMemberships() {
  const { data } = await api.get("/sports/organization-memberships/");
  return list(data);
}

export async function getAvailableLeagueTeams(organization) {
  const { data } = await api.get(`/sports/organizations/${organization}/available-teams/`);
  return list(data);
}

export async function getDivisionStandings(division) {
  const { data } = await api.get(`/sports/divisions/${division}/standings/`);
  return data;
}

export async function getDivisionLeagueStats(division) {
  const { data } = await api.get(`/sports/divisions/${division}/league-stats/`);
  return data;
}

export async function buildDivisionSchedule(division, payload) {
  const { data } = await api.post(`/sports/divisions/${division}/build-schedule/`, payload);
  return data;
}

export async function getLeagueGames(params = {}) {
  const { data } = await api.get("/sports/league-games/", { params });
  return list(data);
}

export async function updateLeagueGame(id, payload) {
  const { data } = await api.patch(`/sports/league-games/${id}/`, payload);
  return data;
}

export async function getLeagueTournaments(params = {}) {
  const { data } = await api.get("/sports/tournaments/", { params });
  return list(data);
}

export async function createLeagueTournament(payload) {
  const { data } = await api.post("/sports/tournaments/", payload);
  return data;
}

export async function addTournamentTeam(id, payload) {
  const { data } = await api.post(`/sports/tournaments/${id}/add-team/`, payload);
  return data;
}

export async function getTournamentBracket(id) {
  const { data } = await api.get(`/sports/tournaments/${id}/bracket/`);
  return data;
}

export async function buildTournament(id, payload) {
  const { data } = await api.post(`/sports/tournaments/${id}/build/`, payload);
  return data;
}

export async function advanceTournament(id, payload = {}) {
  const { data } = await api.post(`/sports/tournaments/${id}/advance/`, payload);
  return data;
}

export async function previewSportsInvite(token, roster) {
  const { data } = await api.get("/sports/league-rosters/invite-preview/", { params: { token, roster } });
  return data;
}

export async function claimSportsInvite(token, roster) {
  const { data } = await api.post("/sports/league-rosters/claim-token/", { token, roster });
  return data;
}


export async function previewTeamPlayerInvite(token) {
  const { data } = await api.get("/sports/players/invite-preview/", { params: { token } });
  return data;
}

export async function claimTeamPlayerInvite(token) {
  const { data } = await api.post("/sports/players/claim-invite/", { token });
  return data;
}

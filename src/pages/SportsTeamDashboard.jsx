import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import { getGroups, getMemberships } from "../api/social";
import {
  createSportsGame,
  createSportsPlayer,
  ensureSportsTeam,
  getSportsTeams,
  getTeamDashboard,
  setSportsLineup,
  updateSportsPlayer,
  updateSportsTeam,
} from "../api/sports";

const TABS = ["Overview", "Roster", "Lineup", "Schedule", "Stats"];
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "LC", "RC", "RF", "OF", "EH", "DH"];
const cx = (...values) => values.filter(Boolean).join(" ");
const list = (value) => (Array.isArray(value) ? value : []);
const number = (value) => Number(value || 0);
const pct = (value) => number(value).toFixed(3).replace(/^0(?=\.)/, "");
const nameOf = (person) => person?.display_name || [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "Player";
const errorText = (error) => error?.response?.data?.detail || Object.values(error?.response?.data || {})?.flat?.()?.[0] || error?.message || "Something went wrong.";

function Card({ title, body, action, children, className = "" }) {
  return (
    <section className={cx("rounded-[1.65rem] border border-white/10 bg-[#07111f]/95 p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-black text-white">{title}</h2>
          {body ? <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Btn({ children, onClick, primary, danger, disabled, className = "" }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "min-h-11 rounded-2xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40",
        primary
          ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
          : danger
            ? "border border-rose-400/25 bg-rose-400/10 text-rose-100"
            : "border border-white/10 bg-white/[.04] text-slate-100 hover:bg-white/[.08]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-cyan-400/40"
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-[#050b14] px-4 text-sm text-white outline-none focus:border-cyan-400/40"
      >
        {children}
      </select>
    </label>
  );
}

function Stat({ label, value, sub, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-400/[.06] text-cyan-100",
    green: "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-100",
    purple: "border-violet-400/20 bg-violet-400/[.06] text-violet-100",
    amber: "border-amber-400/20 bg-amber-400/[.06] text-amber-100",
  };
  return (
    <div className={cx("rounded-2xl border p-3", tones[tone])}>
      <div className="text-[10px] font-black uppercase tracking-[.14em] opacity-60">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
      {sub ? <div className="mt-1 text-[11px] opacity-65">{sub}</div> : null}
    </div>
  );
}

function GameCard({ game, teamName, onOpen }) {
  const live = game.status === "LIVE";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "w-full rounded-2xl border p-4 text-left",
        live ? "border-emerald-400/30 bg-emerald-400/[.07]" : "border-white/10 bg-white/[.025]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-white">{teamName} vs {game.opponent_name}</b>
            {live ? <span className="rounded-full bg-emerald-300 px-2 py-1 text-[9px] font-black uppercase text-slate-950">Live</span> : null}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {new Date(game.start_at).toLocaleString()} · {game.venue_name || "Location TBD"}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            {game.game_type}{game.tournament_name ? ` · ${game.tournament_name}` : ""}{game.round_label ? ` · ${game.round_label}` : ""}
          </div>
        </div>
        <div className="text-right">
          {(game.status === "LIVE" || game.status === "FINAL") ? (
            <div className="text-xl font-black text-white">{game.runs_for}–{game.runs_against}</div>
          ) : null}
          <ChevronRight className="ml-auto mt-1 h-4 w-4 text-slate-500" />
        </div>
      </div>
    </button>
  );
}

export default function SportsTeamDashboard() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = Number(user?.id || 0);

  const [tab, setTab] = useState("Overview");
  const [group, setGroup] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [team, setTeam] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [meta, setMeta] = useState({ season_name: "", league_name: "", division_name: "" });
  const [playerForm, setPlayerForm] = useState({ display_name: "", jersey_number: "", primary_position: "", bats: "R", throws: "R" });
  const [gameForm, setGameForm] = useState({
    game_type: "LEAGUE",
    opponent_name: "",
    tournament_name: "",
    round_label: "",
    home_away: "NEUTRAL",
    date: "",
    time: "18:30",
    venue_name: "",
    city: "",
    state: "",
  });
  const [lineupGameId, setLineupGameId] = useState("");
  const [lineup, setLineup] = useState([]);
  const [lineupPlayerId, setLineupPlayerId] = useState("");

  const managed = useMemo(
    () => memberships.some(
      (membership) => Number(membership.group) === Number(groupId)
        && Number(membership.user) === userId
        && membership.status === "ACTIVE"
        && ["OWNER", "DIRECTOR", "MANAGER"].includes(membership.role),
    ),
    [memberships, groupId, userId],
  );

  const socialRoster = useMemo(
    () => memberships.filter(
      (membership) => Number(membership.group) === Number(groupId)
        && membership.status === "ACTIVE",
    ),
    [memberships, groupId],
  );

  const players = list(dashboard?.players).filter((player) => player.is_active !== false);
  const games = useMemo(
    () => [...list(dashboard?.live_games), ...list(dashboard?.upcoming_games), ...list(dashboard?.recent_games)],
    [dashboard],
  );
  const uniqueGames = useMemo(() => {
    const map = new Map();
    games.forEach((game) => map.set(Number(game.id), game));
    return [...map.values()].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  }, [games]);

  async function refresh({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [groups, membershipRows, sportsTeams] = await Promise.all([
        getGroups(),
        getMemberships(),
        getSportsTeams(),
      ]);
      const foundGroup = list(groups).find((row) => Number(row.id) === Number(groupId));
      setGroup(foundGroup || null);
      setMemberships(list(membershipRows));
      const foundTeam = list(sportsTeams).find((row) => Number(row.group) === Number(groupId));
      setTeam(foundTeam || null);
      if (foundTeam) {
        const data = await getTeamDashboard(foundTeam.id);
        setDashboard(data);
        setMeta({
          season_name: data.team?.season_name || "",
          league_name: data.team?.league_name || "",
          division_name: data.team?.division_name || "",
        });
        if (!lineupGameId) {
          const preferred = list(data.live_games)[0] || list(data.upcoming_games)[0] || list(data.recent_games)[0];
          if (preferred) {
            setLineupGameId(String(preferred.id));
            setLineup(list(preferred.lineup_spots).map((spot) => ({
              player: Number(spot.player),
              defensive_position: spot.defensive_position || "",
            })));
          }
        }
      } else {
        setDashboard(null);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // groupId is the route identity; lineup selection is intentionally preserved across refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function run(fn, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      if (message) setNotice(message);
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function setupSoftball() {
    await run(async () => {
      const created = await ensureSportsTeam(Number(groupId), "SOFTBALL");
      setTeam(created);
    }, "Softball tools are ready for this team.");
  }

  async function saveTeamMeta() {
    if (!team) return;
    await run(() => updateSportsTeam(team.id, meta), "Team season details saved.");
  }

  async function addPlayer() {
    if (!team || !playerForm.display_name.trim()) return;
    await run(
      () => createSportsPlayer({
        team: team.id,
        display_name: playerForm.display_name.trim(),
        jersey_number: playerForm.jersey_number.trim(),
        primary_position: playerForm.primary_position,
        bats: playerForm.bats,
        throws: playerForm.throws,
      }),
      "Player added to the softball roster.",
    );
    setPlayerForm({ display_name: "", jersey_number: "", primary_position: "", bats: "R", throws: "R" });
  }

  async function importSocialRoster() {
    if (!team) return;
    const linkedIds = new Set(players.map((player) => Number(player.user)).filter(Boolean));
    const missing = socialRoster.filter((membership) => !linkedIds.has(Number(membership.user)));
    if (!missing.length) {
      setNotice("Every active Social member is already represented on the sports roster.");
      return;
    }
    await run(async () => {
      for (const membership of missing) {
        await createSportsPlayer({
          team: team.id,
          user: Number(membership.user),
          display_name: nameOf(membership.user_detail),
          jersey_number: "",
          primary_position: "",
        });
      }
    }, `${missing.length} Social member${missing.length === 1 ? "" : "s"} added to the sports roster.`);
  }

  async function createGame() {
    if (!team || !gameForm.opponent_name.trim() || !gameForm.date) return;
    const startAt = new Date(`${gameForm.date}T${gameForm.time || "18:30"}:00`);
    await run(
      () => createSportsGame({
        team: team.id,
        game_type: gameForm.game_type,
        opponent_name: gameForm.opponent_name.trim(),
        tournament_name: gameForm.game_type === "TOURNAMENT" ? gameForm.tournament_name.trim() : "",
        round_label: gameForm.game_type === "TOURNAMENT" ? gameForm.round_label.trim() : "",
        home_away: gameForm.home_away,
        start_at: startAt.toISOString(),
        venue_name: gameForm.venue_name.trim(),
        city: gameForm.city.trim(),
        state: gameForm.state.trim(),
        innings_scheduled: 7,
      }),
      "Game scheduled and synced to the team calendar.",
    );
    setGameForm((current) => ({ ...current, opponent_name: "", tournament_name: "", round_label: "" }));
  }

  function chooseLineupGame(value) {
    setLineupGameId(value);
    const game = uniqueGames.find((row) => Number(row.id) === Number(value));
    setLineup(list(game?.lineup_spots).map((spot) => ({
      player: Number(spot.player),
      defensive_position: spot.defensive_position || "",
    })));
    setLineupPlayerId("");
  }

  function addLineupPlayer() {
    const playerId = Number(lineupPlayerId);
    if (!playerId || lineup.some((spot) => Number(spot.player) === playerId)) return;
    const player = players.find((row) => Number(row.id) === playerId);
    setLineup((current) => [...current, { player: playerId, defensive_position: player?.primary_position || "" }]);
    setLineupPlayerId("");
  }

  function moveLineup(index, direction) {
    const next = [...lineup];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLineup(next);
  }

  function updateLineupPosition(index, value) {
    setLineup((current) => current.map((spot, rowIndex) => (
      rowIndex === index ? { ...spot, defensive_position: value } : spot
    )));
  }

  async function saveLineup() {
    if (!lineupGameId || !lineup.length) return;
    await run(
      () => setSportsLineup(Number(lineupGameId), lineup.map((spot, index) => ({
        player: Number(spot.player),
        batting_order: index + 1,
        defensive_position: spot.defensive_position || "",
        is_starter: true,
      }))),
      "Batting order saved for this game.",
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02060c] text-white">
        <ModeBar title="Team Sports" subtitle="SyncWorks Social" />
        <div className="grid min-h-[65vh] place-items-center"><Loader2 className="h-9 w-9 animate-spin text-cyan-300" /></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#02060c] p-4 text-white">
        <ModeBar title="Team Sports" subtitle="SyncWorks Social" />
        <Card title="Team unavailable" body="This Social group is not available to your account.">
          <Btn onClick={() => navigate("/connect")}><ArrowLeft className="mr-2 inline h-4 w-4" />Back to Social</Btn>
        </Card>
      </div>
    );
  }

  if (group.kind !== "TEAM") {
    return (
      <div className="min-h-screen bg-[#02060c] p-4 text-white">
        <ModeBar title={group.name} subtitle="Team Sports" />
        <Card title="Sports requires a Team group" body="Create or use a Social group with the Team type, then open Sports from that group." />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#02060c] pb-28 text-white">
        <ModeBar title={group.name} subtitle="SyncWorks Sports" />
        <main className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-5">
          <Btn onClick={() => navigate("/connect")}><ArrowLeft className="mr-2 inline h-4 w-4" />Social groups</Btn>
          {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
          <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,.2),transparent_35%),radial-gradient(circle_at_15%_100%,rgba(139,92,246,.14),transparent_34%),#07111f] p-5 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-cyan-100"><Trophy className="h-4 w-4" />Sports Team</div>
            <h1 className="mt-4 max-w-3xl text-3xl font-black sm:text-5xl">Turn {group.name} into a live softball command center.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Roster, batting order, league and tournament schedule, live game entry and season statistics stay attached to this existing Social team.</p>
            {managed ? (
              <Btn primary className="mt-6" disabled={busy} onClick={setupSoftball}><Sparkles className="mr-2 inline h-4 w-4" />Set up Softball</Btn>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100">A team owner, director or manager can turn on Sports for this group.</div>
            )}
          </section>
        </main>
      </div>
    );
  }

  const record = dashboard?.record || {};
  const teamStats = dashboard?.team_stats || {};
  const selectedLineupGame = uniqueGames.find((game) => Number(game.id) === Number(lineupGameId));
  const lineupPlayerIds = new Set(lineup.map((spot) => Number(spot.player)));
  const availablePlayers = players.filter((player) => !lineupPlayerIds.has(Number(player.id)));

  return (
    <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
      <ModeBar title={group.name} subtitle="Softball • SyncWorks Sports" />
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <Btn onClick={() => navigate("/connect")}><ArrowLeft className="mr-2 inline h-4 w-4" />Social</Btn>
          <button type="button" onClick={() => refresh()} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10"><RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} /></button>
        </div>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{notice}</div> : null}

        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_86%_12%,rgba(34,211,238,.18),transparent_33%),radial-gradient(circle_at_15%_105%,rgba(139,92,246,.16),transparent_34%),#07111f] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-cyan-100">Softball</span>
                {team.season_name ? <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{team.season_name}</span> : null}
              </div>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">{group.name}</h1>
              <p className="mt-2 text-sm text-slate-300">{[team.league_name, team.division_name].filter(Boolean).join(" · ") || "Team operations, live scoring and season stats"}</p>
            </div>
            {list(dashboard?.live_games).length ? (
              <Btn primary onClick={() => navigate(`/connect/groups/${group.id}/sports/games/${dashboard.live_games[0].id}`)}><CircleDot className="mr-2 inline h-4 w-4" />Open Live Game</Btn>
            ) : null}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Record" value={`${number(record.wins)}-${number(record.losses)}${number(record.ties) ? `-${number(record.ties)}` : ""}`} sub={`${number(record.games)} final games`} tone="cyan" />
            <Stat label="Team AVG" value={pct(teamStats.avg)} sub={`${number(teamStats.hits)} hits`} tone="green" />
            <Stat label="Home Runs" value={number(teamStats.home_runs)} sub={`${number(teamStats.rbi)} RBI`} tone="purple" />
            <Stat label="Run Diff" value={number(teamStats.runs_for) - number(teamStats.runs_against) >= 0 ? `+${number(teamStats.runs_for) - number(teamStats.runs_against)}` : number(teamStats.runs_for) - number(teamStats.runs_against)} sub={`${number(teamStats.runs_for)} for · ${number(teamStats.runs_against)} against`} tone="amber" />
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={cx("min-h-10 shrink-0 rounded-full px-4 text-xs font-black", tab === item ? "bg-white text-slate-950" : "border border-white/10 text-slate-400")}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Overview" ? (
          <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
            <Card title="Next games" body="League and tournament games stay tied to Social attendance and SyncWorks Calendar." action={<CalendarDays className="h-5 w-5 text-cyan-300" />}>
              <div className="space-y-2">
                {list(dashboard?.live_games).map((game) => <GameCard key={`live-${game.id}`} game={game} teamName={group.name} onOpen={() => navigate(`/connect/groups/${group.id}/sports/games/${game.id}`)} />)}
                {list(dashboard?.upcoming_games).slice(0, 5).map((game) => <GameCard key={game.id} game={game} teamName={group.name} onOpen={() => navigate(`/connect/groups/${group.id}/sports/games/${game.id}`)} />)}
                {!list(dashboard?.live_games).length && !list(dashboard?.upcoming_games).length ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No games scheduled yet. Open Schedule to add the first one.</div> : null}
              </div>
            </Card>
            <div className="space-y-4">
              <Card title="Team setup" body="Season labels help keep future years and divisions separate.">
                <div className="space-y-3">
                  <Input label="Season" value={meta.season_name} onChange={(value) => setMeta((current) => ({ ...current, season_name: value }))} placeholder="Fall 2026" />
                  <Input label="League" value={meta.league_name} onChange={(value) => setMeta((current) => ({ ...current, league_name: value }))} placeholder="Church League" />
                  <Input label="Division" value={meta.division_name} onChange={(value) => setMeta((current) => ({ ...current, division_name: value }))} placeholder="Men's Open" />
                  {managed ? <Btn primary className="w-full" disabled={busy} onClick={saveTeamMeta}><Save className="mr-2 inline h-4 w-4" />Save team details</Btn> : null}
                </div>
              </Card>
              <Card title="Quick operations" body="The common game-day jobs are one tap away.">
                <div className="grid gap-2">
                  <Btn onClick={() => setTab("Lineup")}><Swords className="mr-2 inline h-4 w-4" />Build lineup</Btn>
                  <Btn onClick={() => setTab("Schedule")}><Plus className="mr-2 inline h-4 w-4" />Schedule game</Btn>
                  <Btn onClick={() => setTab("Stats")}><Trophy className="mr-2 inline h-4 w-4" />Season statistics</Btn>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "Roster" ? (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <Card title="Sports roster" body="Players can be linked to their SyncWorks account or added manually for scorekeeping." action={<Users className="h-5 w-5 text-cyan-300" />}>
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-xs font-black text-cyan-100">{player.jersey_number || "—"}</span><b className="truncate text-white">{player.display_name}</b></div>
                      <div className="mt-1 pl-10 text-xs text-slate-500">{player.primary_position || "Position TBD"}{player.user_detail ? ` · linked to ${player.user_detail.email}` : " · manual player"}</div>
                    </div>
                    {managed ? (
                      <select
                        value={player.primary_position || ""}
                        onChange={(event) => run(() => updateSportsPlayer(player.id, { primary_position: event.target.value }), "Position updated.")}
                        className="h-10 rounded-xl border border-white/10 bg-[#050b14] px-2 text-xs text-white"
                      >
                        <option value="">Position</option>
                        {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
                      </select>
                    ) : null}
                  </div>
                ))}
                {!players.length ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No sports players yet.</div> : null}
              </div>
            </Card>
            {managed ? (
              <div className="space-y-4">
                <Card title="Import team members" body="Pull active members of this Social team into the softball roster without re-inviting them.">
                  <Btn primary className="w-full" disabled={busy} onClick={importSocialRoster}><UserPlus className="mr-2 inline h-4 w-4" />Import Social members</Btn>
                </Card>
                <Card title="Add player manually" body="Useful for a guest, substitute or player who has not joined SyncWorks yet.">
                  <div className="space-y-3">
                    <Input label="Player name" value={playerForm.display_name} onChange={(value) => setPlayerForm((current) => ({ ...current, display_name: value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Jersey #" value={playerForm.jersey_number} onChange={(value) => setPlayerForm((current) => ({ ...current, jersey_number: value }))} />
                      <Select label="Primary position" value={playerForm.primary_position} onChange={(value) => setPlayerForm((current) => ({ ...current, primary_position: value }))}>
                        <option value="">Choose</option>
                        {POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select label="Bats" value={playerForm.bats} onChange={(value) => setPlayerForm((current) => ({ ...current, bats: value }))}><option value="R">Right</option><option value="L">Left</option><option value="S">Switch</option></Select>
                      <Select label="Throws" value={playerForm.throws} onChange={(value) => setPlayerForm((current) => ({ ...current, throws: value }))}><option value="R">Right</option><option value="L">Left</option></Select>
                    </div>
                    <Btn primary className="w-full" disabled={busy || !playerForm.display_name.trim()} onClick={addPlayer}><Plus className="mr-2 inline h-4 w-4" />Add player</Btn>
                  </div>
                </Card>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "Lineup" ? (
          <Card title="Lineup card" body="Build the batting order for a specific game. The live scorer automatically advances to the next batter." action={<Swords className="h-5 w-5 text-violet-300" />}>
            <div className="grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
              <div className="space-y-3">
                <Select label="Game" value={lineupGameId} onChange={chooseLineupGame}>
                  <option value="">Choose a game</option>
                  {uniqueGames.filter((game) => game.status !== "CANCELLED").map((game) => <option key={game.id} value={game.id}>{new Date(game.start_at).toLocaleDateString()} · vs {game.opponent_name} · {game.status}</option>)}
                </Select>
                {selectedLineupGame ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-sm">
                    <b className="text-white">vs {selectedLineupGame.opponent_name}</b>
                    <div className="mt-1 text-xs text-slate-500">{new Date(selectedLineupGame.start_at).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{selectedLineupGame.game_type}{selectedLineupGame.tournament_name ? ` · ${selectedLineupGame.tournament_name}` : ""}</div>
                  </div>
                ) : null}
                {managed && lineupGameId ? (
                  <div className="flex gap-2">
                    <select value={lineupPlayerId} onChange={(event) => setLineupPlayerId(event.target.value)} className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#050b14] px-3 text-sm text-white">
                      <option value="">Add batter…</option>
                      {availablePlayers.map((player) => <option key={player.id} value={player.id}>#{player.jersey_number || "—"} {player.display_name}</option>)}
                    </select>
                    <Btn primary disabled={!lineupPlayerId} onClick={addLineupPlayer}><Plus className="h-4 w-4" /></Btn>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                {lineup.map((spot, index) => {
                  const player = players.find((row) => Number(row.id) === Number(spot.player));
                  return (
                    <div key={`${spot.player}-${index}`} className="grid grid-cols-[2.6rem_minmax(0,1fr)_5.4rem] items-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-2 sm:grid-cols-[2.6rem_minmax(0,1fr)_7rem_5.5rem]">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-400/10 text-sm font-black text-violet-100">{index + 1}</div>
                      <div className="min-w-0"><b className="block truncate text-sm text-white">#{player?.jersey_number || "—"} {player?.display_name || "Player"}</b><span className="text-[10px] text-slate-500">{player?.primary_position || "No primary position"}</span></div>
                      <select value={spot.defensive_position || ""} onChange={(event) => updateLineupPosition(index, event.target.value)} disabled={!managed} className="h-10 rounded-xl border border-white/10 bg-[#050b14] px-2 text-xs text-white"><option value="">POS</option>{POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}</select>
                      {managed ? <div className="flex justify-end gap-1"><button type="button" onClick={() => moveLineup(index, -1)} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={() => moveLineup(index, 1)} disabled={index === lineup.length - 1} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button></div> : null}
                    </div>
                  );
                })}
                {!lineup.length ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Choose a game, then add players in batting order.</div> : null}
                {managed && lineup.length ? <Btn primary className="w-full" disabled={busy || !lineupGameId} onClick={saveLineup}><Save className="mr-2 inline h-4 w-4" />Save lineup</Btn> : null}
                {selectedLineupGame?.lineup_spots?.length ? <Btn className="w-full" onClick={() => navigate(`/connect/groups/${group.id}/sports/games/${selectedLineupGame.id}`)}><CircleDot className="mr-2 inline h-4 w-4" />Open Game Day</Btn> : null}
              </div>
            </div>
          </Card>
        ) : null}

        {tab === "Schedule" ? (
          <div className="grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
            {managed ? (
              <Card title="Schedule a game" body="League and tournament games also become Social events for RSVP and Calendar sync." action={<Plus className="h-5 w-5 text-cyan-300" />}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Select label="Type" value={gameForm.game_type} onChange={(value) => setGameForm((current) => ({ ...current, game_type: value }))}><option value="LEAGUE">League</option><option value="TOURNAMENT">Tournament</option><option value="PRACTICE">Practice</option><option value="EXHIBITION">Exhibition</option></Select>
                    <Select label="Home / away" value={gameForm.home_away} onChange={(value) => setGameForm((current) => ({ ...current, home_away: value }))}><option value="HOME">Home</option><option value="AWAY">Away</option><option value="NEUTRAL">Neutral</option></Select>
                  </div>
                  <Input label="Opponent" value={gameForm.opponent_name} onChange={(value) => setGameForm((current) => ({ ...current, opponent_name: value }))} placeholder="Opponent team" />
                  {gameForm.game_type === "TOURNAMENT" ? <div className="grid grid-cols-2 gap-2"><Input label="Tournament" value={gameForm.tournament_name} onChange={(value) => setGameForm((current) => ({ ...current, tournament_name: value }))} placeholder="State Championship" /><Input label="Round / pool" value={gameForm.round_label} onChange={(value) => setGameForm((current) => ({ ...current, round_label: value }))} placeholder="Pool A / Bracket" /></div> : null}
                  <div className="grid grid-cols-2 gap-2"><Input label="Date" type="date" value={gameForm.date} onChange={(value) => setGameForm((current) => ({ ...current, date: value }))} /><Input label="Time" type="time" value={gameForm.time} onChange={(value) => setGameForm((current) => ({ ...current, time: value }))} /></div>
                  <Input label="Venue / field" value={gameForm.venue_name} onChange={(value) => setGameForm((current) => ({ ...current, venue_name: value }))} placeholder="Field 3" />
                  <div className="grid grid-cols-[1fr_5rem] gap-2"><Input label="City" value={gameForm.city} onChange={(value) => setGameForm((current) => ({ ...current, city: value }))} /><Input label="State" value={gameForm.state} onChange={(value) => setGameForm((current) => ({ ...current, state: value }))} /></div>
                  <Btn primary className="w-full" disabled={busy || !gameForm.opponent_name.trim() || !gameForm.date} onClick={createGame}><CalendarDays className="mr-2 inline h-4 w-4" />Add to schedule</Btn>
                </div>
              </Card>
            ) : null}
            <Card title="Team schedule" body="Open any game to view the lineup, score it live or review the final result." action={<CalendarDays className="h-5 w-5 text-emerald-300" />}>
              <div className="space-y-2">
                {uniqueGames.map((game) => <GameCard key={game.id} game={game} teamName={group.name} onOpen={() => navigate(`/connect/groups/${group.id}/sports/games/${game.id}`)} />)}
                {!uniqueGames.length ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500">No games yet.</div> : null}
              </div>
            </Card>
          </div>
        ) : null}

        {tab === "Stats" ? (
          <Card title="Season batting dashboard" body="Stats are calculated from the plays entered in Game Day. AVG, OBP, SLG and OPS update automatically." action={<Trophy className="h-5 w-5 text-amber-300" />}>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-[930px] w-full text-left text-xs">
                <thead className="bg-white/[.04] text-[10px] uppercase tracking-[.12em] text-slate-500"><tr><th className="px-3 py-3">Player</th><th>G</th><th>PA</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>BB</th><th>RBI</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th></tr></thead>
                <tbody>
                  {list(dashboard?.player_stats).map((row) => (
                    <tr key={row.player?.id} className="border-t border-white/[.06] text-slate-300">
                      <td className="px-3 py-3"><b className="text-white">#{row.player?.jersey_number || "—"} {row.player?.display_name}</b></td>
                      <td>{row.g}</td><td>{row.pa}</td><td>{row.ab}</td><td>{row.h}</td><td>{row.double}</td><td>{row.triple}</td><td>{row.hr}</td><td>{row.bb}</td><td>{row.rbi}</td><td className="font-black text-cyan-200">{pct(row.avg)}</td><td>{pct(row.obp)}</td><td>{pct(row.slg)}</td><td className="font-black text-violet-200">{pct(row.ops)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!list(dashboard?.player_stats).length ? <div className="p-6 text-sm text-slate-500">Player statistics will appear after Game Day entries are recorded.</div> : null}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 p-3 text-xs text-slate-400"><Shield className="mb-2 h-4 w-4 text-cyan-300" /><b className="text-white">Stat integrity</b><br />Stats come from saved plate appearances, not manual season totals.</div>
              <div className="rounded-2xl border border-white/10 p-3 text-xs text-slate-400"><Swords className="mb-2 h-4 w-4 text-violet-300" /><b className="text-white">Lineup aware</b><br />Game Day advances through the saved batting order automatically.</div>
              <div className="rounded-2xl border border-white/10 p-3 text-xs text-slate-400"><CalendarDays className="mb-2 h-4 w-4 text-emerald-300" /><b className="text-white">One schedule</b><br />Games reuse Social events so availability and calendar updates stay together.</div>
            </div>
          </Card>
        ) : null}
      </main>
    </div>
  );
}

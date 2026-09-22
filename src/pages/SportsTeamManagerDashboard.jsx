import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Camera,
  Check,
  CircleDollarSign,
  CircleDot,
  Copy,
  GripVertical,
  ImageDown,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import ModeBar from "../components/ModeBar";
import TeamChatPanel from "../components/sports/TeamChatPanel";
import GameAvailabilityCard, { availabilityStatus } from "../components/sports/GameAvailabilityCard";
import InteractiveStatsBoard from "../components/sports/InteractiveStatsBoard";
import SoftballDefenseField from "../components/sports/SoftballDefenseField";
import SportsTeamMobileNav from "../components/sports/SportsTeamMobileNav";
import PlayerCollectibleCard, { SportsPlayerPhoto } from "../components/sports/PlayerCollectibleCard";
import PlayerStatSplits from "../components/sports/PlayerStatSplits";
import { useAuth } from "../auth/AuthContext";
import { acceptMembership, createEventResponse, createGroupInviteLink, getEventResponses, getGroups, getMemberships, inviteMember, setMembershipRole, uploadGroupLogo, updateEventResponse } from "../api/social";
import {
  assignTeamFeeRoster,
  createPlayerProfile,
  createSportsGame,
  createSportsPlayer,
  createStatLedgerEntry,
  createTeamFee,
  finishSportsGame,
  ensureTeamPaymentSettings,
  getAdvancedTeamStats,
  getFeeAssignments,
  getPlayerProfiles,
  getPlayerBadgeCard,
  getScopedTeamStats,
  getSportsTeams,
  getTeamDashboard,
  getTeamFees,
  getTeamPaymentSettings,
  inviteSportsPlayer,
  joinMySportsTeamRoster,
  linkSportsPlayerMember,
  mergeSportsPlayer,
  verifyPlayerMoment,
  removePlayerMoment,
  deleteEmptySportsPlayer,
  remindSportsPlayer,
  remindTeamDues,
  removeSportsPlayer,
  setSportsLineup,
  updateFeeAssignment,
  updateTeamFee,
  updatePlayerProfile,
  updateSportsGame,
  updateSportsPlayer,
  updateSportsTeam,
  updateTeamPaymentSettings,
} from "../api/sports";

const TABS = ["Overview", "Roster", "Lineup", "Schedule", "Stats", "Dues"];
const ROLE_OPTIONS = [
  ["MEMBER", "Member / Player"],
  ["SCOREKEEPER", "Scorekeeper"],
  ["MANAGER", "Manager / Coach"],
  ["DIRECTOR", "Director"],
];
const ROLE_HELP = {
  OWNER: "Full group and team control.",
  DIRECTOR: "Full team administration, roster, games, stats and dues.",
  MANAGER: "Coach/manager access to roster, games, stats, dues and Game Book.",
  SCOREKEEPER: "Can run and correct the live Game Book without full manager access.",
  MEMBER: "Standard member/player view.",
};
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "MM", "LF", "LC", "CF", "RC", "RF", "OF", "EH1", "EH2", "EH", "DH"];
const cx = (...values) => values.filter(Boolean).join(" ");
const list = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const pct = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");
const money = (cents) => (num(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const nameOf = (person) => person?.display_name || [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "Player";
const errorText = (error) => error?.response?.data?.detail || Object.values(error?.response?.data || {})?.flat?.()?.[0] || error?.message || "Something went wrong.";

function Btn({ children, onClick, primary, danger, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "min-h-10 rounded-xl px-3 text-xs font-black transition disabled:opacity-40",
        primary ? "bg-cyan-300 text-slate-950" : danger ? "border border-rose-400/25 bg-rose-400/10 text-rose-100" : "border border-white/10 bg-white/[.035] text-slate-200",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Card({ title, body, action, children, className = "" }) {
  return (
    <section className={cx("rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-3.5 sm:p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-sm font-black text-white">{title}</h2>{body ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{body}</p> : null}</div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", className = "" }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-[9px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
      <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-cyan-400/40" />
    </label>
  );
}

function Select({ label, value, onChange, children, className = "" }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-[9px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2.5 text-xs text-white outline-none focus:border-cyan-400/40">{children}</select>
    </label>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-white/[.04] text-slate-300",
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    green: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  };
  return <span className={cx("inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide", tones[tone])}>{children}</span>;
}

function Stat({ label, value, sub }) {
  return <div className="rounded-xl border border-white/10 bg-black/15 p-2.5"><div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-white">{value}</div>{sub ? <div className="text-[9px] text-slate-500">{sub}</div> : null}</div>;
}

function Drawer({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center" onMouseDown={onClose}>
      <section onMouseDown={(event) => event.stopPropagation()} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.7rem] border border-white/10 bg-[#06101d] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-xl sm:rounded-[1.7rem]">
        <div className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-[#06101d]/95 pb-2"><div><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">Team workspace</div><h2 className="mt-1 text-lg font-black text-white">{title}</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10"><X className="h-4 w-4" /></button></div>
        {children}
      </section>
    </div>
  );
}

function TeamLogo({ group }) {
  const source = group?.logo_image_url || group?.logo_url;
  if (source) return <img src={source} alt="" className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 object-cover shadow-xl" />;
  const initials = String(group?.name || "T").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-base font-black text-cyan-100">{initials}</div>;
}

function Avatar({ player, profile, size = "md" }) {
  return <SportsPlayerPhoto player={player} profile={profile} size={size === "lg" ? "md" : "sm"}/>;
}


export default function SportsTeamManagerDashboard() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const userId = Number(user?.id || 0);

  const [tab, setTab] = useState(() => {
    const requested = searchParams.get("tab");
    return TABS.includes(requested) ? requested : "Overview";
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [group, setGroup] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [team, setTeam] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [fees, setFees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statsScope, setStatsScope] = useState("ALL");
  const [scopedStats, setScopedStats] = useState([]);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);
  const [previewPlayerView, setPreviewPlayerView] = useState(false);
  const [eventResponses, setEventResponses] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState({});
  const [teamInviteOpen, setTeamInviteOpen] = useState(false);
  const [teamInviteUrl, setTeamInviteUrl] = useState("");
  const [teamInviteLoading, setTeamInviteLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [playerInviteEmails, setPlayerInviteEmails] = useState({});
  const [playerInviteUrls, setPlayerInviteUrls] = useState({});
  const [selectedMemberByPlayer, setSelectedMemberByPlayer] = useState({});
  const [mergeSourcePlayer, setMergeSourcePlayer] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  const [playerDrawer, setPlayerDrawer] = useState(null);
  const [playerEdit, setPlayerEdit] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [drawerBadgeCard, setDrawerBadgeCard] = useState(null);
  const [drawerBadgeLoading, setDrawerBadgeLoading] = useState(false);
  const [momentGameId, setMomentGameId] = useState("");
  const [momentKind, setMomentKind] = useState("");
  const [momentBusy, setMomentBusy] = useState(false);
  const [statDrawer, setStatDrawer] = useState(false);
  const [statForm, setStatForm] = useState({ player: "", scope: "LEAGUE", games: "", pa: "", ab: "", hits: "", doubles: "", triples: "", home_runs: "", walks: "", sac_flies: "", rbi: "", runs: "", note: "" });

  const [meta, setMeta] = useState({ season_name: "", league_name: "", division_name: "" });
  const [newPlayer, setNewPlayer] = useState({ display_name: "", jersey_number: "", primary_position: "", bats: "R", throws: "R", email: "", phone: "" });
  const [gameForm, setGameForm] = useState({ game_type: "LEAGUE", opponent_name: "", home_away: "NEUTRAL", date: "", time: "18:30", venue_name: "", address_line1: "", city: "", state: "AL" });
  const [lineupGameId, setLineupGameId] = useState("");
  const [lineup, setLineup] = useState([]);
  const [lineupPlayerId, setLineupPlayerId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [liftedPlayerId, setLiftedPlayerId] = useState(null);
  const dragRef = useRef({ timer: null, active: false, index: null, playerId: null, pointerId: null, target: null });

  const [feeForm, setFeeForm] = useState({ title: "League fee", amount: "", due_date: "", description: "" });
  const [feeEdit, setFeeEdit] = useState(null);
  const [payForm, setPayForm] = useState({ cash_app_url: "", venmo_url: "", stripe_url: "", payment_note: "" });

  const myMembership = useMemo(() => memberships.find((membership) => Number(membership.group) === Number(groupId) && Number(membership.user) === userId && membership.status === "ACTIVE") || null, [memberships, groupId, userId]);
  const managed = useMemo(() => ["OWNER", "DIRECTOR", "MANAGER"].includes(myMembership?.role), [myMembership?.role]);
  const canScore = managed || myMembership?.role === "SCOREKEEPER";
  const managerView = managed && !previewPlayerView;
  const socialRoster = useMemo(() => memberships.filter((membership) => Number(membership.group) === Number(groupId) && membership.status === "ACTIVE"), [memberships, groupId]);
  const pendingTeamRequests = useMemo(() => memberships.filter((membership) => Number(membership.group) === Number(groupId) && membership.status === "REQUESTED"), [memberships, groupId]);
  const players = list(dashboard?.players).filter((player) => player.is_active !== false);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [Number(profile.player), profile])), [profiles]);
  const myPlayer = players.find((player) => Number(player.user) === userId);
  const visibleAssignments = managerView ? assignments : assignments.filter((row) => Number(row.player_detail?.user) === userId || Number(row.player) === Number(myPlayer?.id));

  const games = useMemo(() => {
    const map = new Map();
    [...list(dashboard?.live_games), ...list(dashboard?.upcoming_games), ...list(dashboard?.needs_completion_games), ...list(dashboard?.recent_games)].forEach((game) => map.set(Number(game.id), game));
    return [...map.values()].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  }, [dashboard]);

  const selectedGame = games.find((game) => Number(game.id) === Number(lineupGameId));
  const liveGame = games.find((game) => game.status === "LIVE") || null;
  const lineupIds = new Set(lineup.map((spot) => Number(spot.player)));
  const nextGame = games.find((game) => game.status === "LIVE") || games.find((game) => game.status === "SCHEDULED" && new Date(game.start_at) >= new Date());
  const needsCompletionGames = list(dashboard?.needs_completion_games);
  const statusForSelected = (player) => availabilityStatus(player, selectedGame, eventResponses);
  const benchPlayers = players.filter((player) => !lineupIds.has(Number(player.id)) && statusForSelected(player) !== "NO");
  const outPlayers = players.filter((player) => statusForSelected(player) === "NO");
  const waitingPlayers = benchPlayers.filter((player) => statusForSelected(player) === "PENDING");
  const confirmedSubPlayers = benchPlayers.filter((player) => statusForSelected(player) === "MAYBE");
  const statsByPlayerId = useMemo(() => {
    const map = new Map();
    const source = scopedStats.length ? scopedStats : list(dashboard?.player_stats);
    source.forEach((row) => {
      const playerId = Number(row?.player?.id || row?.player);
      if (playerId) map.set(playerId, row);
    });
    return map;
  }, [scopedStats, dashboard]);
  const playerStat = (player) => statsByPlayerId.get(Number(player?.id)) || null;
  const fieldLineup = lineup.map((spot) => ({ ...spot, player_detail: players.find((player) => Number(player.id) === Number(spot.player)) }));

  function profileFor(player) {
    if (!player) return null;
    if (!managerView && Number(player.user) !== userId) return null;
    return profileMap.get(Number(player.id)) || null;
  }

  async function refresh({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [groupRows, membershipRows, teamRows, responseRows] = await Promise.all([getGroups(), getMemberships(), getSportsTeams(), getEventResponses()]);
      const foundGroup = list(groupRows).find((row) => Number(row.id) === Number(groupId));
      const foundTeam = list(teamRows).find((row) => Number(row.group) === Number(groupId));
      setGroup(foundGroup || null);
      setMemberships(list(membershipRows));
      setEventResponses(list(responseRows));
      setTeam(foundTeam || null);
      if (!foundTeam) {
        setDashboard(null);
        return;
      }
      const data = await getTeamDashboard(foundTeam.id);
      setDashboard(data);
      setMeta({ season_name: data.team?.season_name || "", league_name: data.team?.league_name || "", division_name: data.team?.division_name || "" });

      const extras = await Promise.allSettled([
        getPlayerProfiles(foundTeam.id),
        getTeamPaymentSettings(foundTeam.id),
        getTeamFees(foundTeam.id),
        getFeeAssignments(foundTeam.id),
        getScopedTeamStats(foundTeam.id, statsScope),
      ]);
      if (extras[0].status === "fulfilled") setProfiles(list(extras[0].value));
      if (extras[1].status === "fulfilled") {
        setPaymentSettings(extras[1].value || null);
        const p = extras[1].value || {};
        setPayForm({ cash_app_url: p.cash_app_url || "", venmo_url: p.venmo_url || "", stripe_url: p.stripe_url || "", payment_note: p.payment_note || "" });
      }
      if (extras[2].status === "fulfilled") setFees(list(extras[2].value));
      if (extras[3].status === "fulfilled") setAssignments(list(extras[3].value));
      if (extras[4].status === "fulfilled") setScopedStats(list(extras[4].value?.rows));

      if (!lineupGameId) {
        const preferred = list(data.live_games)[0] || list(data.upcoming_games)[0] || list(data.needs_completion_games)[0] || list(data.recent_games)[0];
        if (preferred) chooseLineupGame(String(preferred.id), data, list(responseRows));
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!liveGame) return;
    try {
      localStorage.setItem("sw_live_sports_game_v1", JSON.stringify({
        groupId: Number(groupId),
        gameId: Number(liveGame.id),
        teamName: group?.name || "",
        opponentName: liveGame.opponent_name || "",
      }));
      window.dispatchEvent(new CustomEvent("sw:liveSportsGameChanged"));
    } catch {
      // no-op
    }
  }, [liveGame?.id, groupId, group?.name]);

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [groupId]);

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (TABS.includes(requested)) setTab((current) => current === requested ? current : requested);
  }, [searchParams]);


  useEffect(() => {
    if (!team) return;
    getScopedTeamStats(team.id, statsScope).then((data) => setScopedStats(list(data?.rows))).catch(() => {});
  }, [team, statsScope]);

  useEffect(() => {
    if (!team) return;
    getAdvancedTeamStats(team.id).then(setAdvancedAnalytics).catch(() => setAdvancedAnalytics(null));
  }, [team?.id]);

  async function run(fn, message, { closePlayer = false } = {}) {
    setBusy(true); setError(""); setNotice("");
    try {
      await fn();
      if (message) setNotice(message);
      if (closePlayer) { setPlayerDrawer(null); setPlayerEdit(null); setPhotoFile(null); }
      await refresh({ quiet: true });
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  async function quickFinal(game) {
    if (!managerView) return;
    const ours = window.prompt(`Final score — ${group?.name || "Team"} runs`, String(game.runs_for || 0));
    if (ours === null) return;
    const theirs = window.prompt(`Final score — ${game.opponent_name} runs`, String(game.runs_against || 0));
    if (theirs === null) return;
    const runsFor = Number.parseInt(ours, 10);
    const runsAgainst = Number.parseInt(theirs, 10);
    if (!Number.isFinite(runsFor) || !Number.isFinite(runsAgainst) || runsFor < 0 || runsAgainst < 0) {
      setError("Enter valid whole-number final scores.");
      return;
    }
    await run(() => finishSportsGame(game.id, { runs_for: runsFor, runs_against: runsAgainst }), "Final score saved.");
  }

  async function quickEditGame(game) {
    if (!managerView) return;
    const opponent = window.prompt("Opponent", game.opponent_name || "");
    if (opponent === null) return;
    const dateText = window.prompt("Game date/time (YYYY-MM-DD HH:MM)", new Date(game.start_at).toLocaleString());
    if (dateText === null) return;
    const parsed = new Date(dateText);
    const payload = { opponent_name: opponent.trim() || game.opponent_name };
    if (!Number.isNaN(parsed.getTime())) payload.start_at = parsed.toISOString();
    await run(() => updateSportsGame(game.id, payload), "Game updated.");
  }

  async function changeTeamLogo(file) {
    if (!managerView || !file) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await uploadGroupLogo(groupId, file);
      setNotice("Team logo updated.");
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function openTeamInvites() {
    if (!managerView) return;
    setTeamInviteOpen(true);
    setShareStatus("");
    if (teamInviteUrl) return;
    setTeamInviteLoading(true);
    try {
      const link = await createGroupInviteLink(Number(groupId), "MEMBER");
      setTeamInviteUrl(window.location.origin + "/social/invite/" + link.token);
    } catch (err) {
      setShareStatus(errorText(err));
    } finally {
      setTeamInviteLoading(false);
    }
  }

  async function copyInviteUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Invite link copied — paste it into your team group chat.");
      setNotice("Invite link copied.");
    } catch {
      setShareStatus("Select the link above to copy it manually.");
      setNotice("Select and copy the invitation URL displayed on the page.");
    }
  }

  async function shareInviteUrl(url, name) {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join " + name + " on SyncWorks", text: "Join our team on SyncWorks.", url });
        setShareStatus("Invite shared.");
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    await copyInviteUrl(url);
  }

  async function approveTeamRequest(membership) {
    const key = "approve-" + membership.id;
    setQuickSaving((current) => ({ ...current, [key]: true }));
    setError("");
    try {
      await acceptMembership(membership.id);
      setNotice("Approved " + (membership.user_detail?.display_name || "new member") + ". They can now add themselves to the roster.");
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, [key]: false }));
    }
  }

  async function selfJoinRoster() {
    if (!myMembership || !team) return;
    setQuickSaving((current) => ({ ...current, "self-join": true }));
    setError(""); setNotice("");
    try {
      const result = await joinMySportsTeamRoster(team.id);
      setNotice(result.matched_existing
        ? "Your account is linked to your existing player card and stats."
        : "You are on the team roster. Your manager can now assign your jersey and position.");
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, "self-join": false }));
    }
  }

  async function addLinkedPlayerToGroup(player) {
    if (!managerView || !player?.user) return;
    const key = `group-${player.id}`;
    setQuickSaving((current) => ({ ...current, [key]: true }));
    setError(""); setNotice("");
    try {
      await inviteMember({ group: Number(groupId), user: Number(player.user), role: "MEMBER" });
      setNotice(`Group invitation created for ${player.display_name}. Role assignment will be available when they accept.`);
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, [key]: false }));
    }
  }

  async function changeMemberRole(membership, role) {
    if (!managerView || membership.role === "OWNER" || membership.role === role) return;
    if (myMembership?.role === "MANAGER" && (role === "DIRECTOR" || membership.role === "DIRECTOR")) return;
    const key = `role-${membership.id}`;
    setQuickSaving((current) => ({ ...current, [key]: true }));
    setError(""); setNotice("");
    try {
      await setMembershipRole(membership.id, role);
      setNotice(`${membership.user_detail?.display_name || "Member"} is now ${ROLE_OPTIONS.find(([value]) => value === role)?.[1] || role}.`);
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, [key]: false }));
    }
  }

  async function respondToGame(game, responseValue) {
    if (!game?.social_event) return;
    const existing = eventResponses.find(
      (row) => Number(row.event) === Number(game.social_event) && Number(row.user) === userId,
    );
    await run(
      () => existing
        ? updateEventResponse(existing.id, responseValue)
        : createEventResponse({ event: Number(game.social_event), group: Number(groupId), response: responseValue }),
      responseValue === "YES" ? "You are IN." : responseValue === "NO" ? "You are OUT." : "You are marked as a SUB.",
    );
  }

  function chooseLineupGame(value, data = dashboard, responses = eventResponses) {
    setLineupGameId(value);
    setLiftedPlayerId(null);
    const sourceGames = (() => {
      const map = new Map();
      [...list(data?.live_games), ...list(data?.upcoming_games), ...list(data?.needs_completion_games), ...list(data?.recent_games)].forEach((game) => map.set(Number(game.id), game));
      return [...map.values()];
    })();
    const game = sourceGames.find((row) => Number(row.id) === Number(value));
    const saved = list(game?.lineup_spots).map((spot) => ({
      player: Number(spot.player),
      defensive_position: spot.defensive_position || "",
    }));
    if (saved.length) {
      setLineup(saved);
      return;
    }
    const roster = list(data?.players).length ? list(data?.players).filter((player) => player.is_active !== false) : players;
    const defaultStarters = roster
      .filter((player) => ["YES", "UNLINKED"].includes(availabilityStatus(player, game, responses)))
      .map((player) => ({
        player: Number(player.id),
        defensive_position: player.primary_position || "",
      }));
    setLineup(defaultStarters);
  }

  function restoreFromBench(playerId) {
    const id = Number(playerId);
    if (!id || lineupIds.has(id)) return;
    const player = players.find((row) => Number(row.id) === id);
    if (statusForSelected(player) === "NO") return;
    setLineup((current) => [...current, {
      player: id,
      defensive_position: player?.primary_position || "",
    }]);
    setLiftedPlayerId(null);
    navigator.vibrate?.(10);
  }

  function removeLineupPlayer(playerId) {
    setLineup((current) => current.filter((spot) => Number(spot.player) !== Number(playerId)));
    setLiftedPlayerId((current) => Number(current) === Number(playerId) ? null : current);
    navigator.vibrate?.(10);
  }

  function reorderLineup(from, to) {
    if (from === to || from == null || to == null) return;
    setLineup((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
      return next;
    });
  }

  function dropLiftedAt(index) {
    if (!liftedPlayerId) return;
    const from = lineup.findIndex((spot) => Number(spot.player) === Number(liftedPlayerId));
    if (from < 0) {
      setLiftedPlayerId(null);
      return;
    }
    reorderLineup(from, index);
    setLiftedPlayerId(null);
    navigator.vibrate?.(12);
  }

  function toggleLift(playerId, index) {
    if (!managerView) return;
    if (liftedPlayerId && Number(liftedPlayerId) !== Number(playerId)) {
      dropLiftedAt(index);
      return;
    }
    const next = Number(liftedPlayerId) === Number(playerId) ? null : Number(playerId);
    setLiftedPlayerId(next);
    if (next) navigator.vibrate?.(12);
  }

  function dragStart(event, index, playerId) {
    if (!managerView) return;
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    clearTimeout(dragRef.current.timer);
    dragRef.current = {
      timer: setTimeout(() => {
        dragRef.current.active = true;
        setDragging(true);
        setLiftedPlayerId(Number(playerId));
        navigator.vibrate?.(15);
      }, 170),
      active: false,
      index,
      playerId: Number(playerId),
      pointerId: event.pointerId,
      target,
    };
  }

  function dragMove(event) {
    if (!dragRef.current.active) return;
    event.preventDefault();
    const nodes = [...document.querySelectorAll("[data-lineup-index]")];
    if (!nodes.length) return;
    let to = Number(nodes[nodes.length - 1].dataset.lineupIndex);
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const index = Number(node.dataset.lineupIndex);
      if (event.clientY < rect.top + (rect.height / 2)) {
        to = index;
        break;
      }
    }
    const from = Number(dragRef.current.index);
    if (Number.isNaN(to) || to === from) return;
    reorderLineup(from, to);
    dragRef.current.index = to;
  }

  function dragEnd(event, index, playerId) {
    event?.stopPropagation?.();
    clearTimeout(dragRef.current.timer);
    const wasActive = dragRef.current.active;
    dragRef.current.active = false;
    dragRef.current.index = null;
    dragRef.current.playerId = null;
    setDragging(false);
    if (wasActive) {
      setLiftedPlayerId(null);
      navigator.vibrate?.(8);
    } else {
      toggleLift(playerId, index);
    }
  }

  function dragCancel() {
    clearTimeout(dragRef.current.timer);
    dragRef.current.active = false;
    dragRef.current.index = null;
    dragRef.current.playerId = null;
    setDragging(false);
  }


  async function saveLineup() {
    if (!lineupGameId || !lineup.length) return;
    await run(() => setSportsLineup(Number(lineupGameId), lineup.map((spot, index) => ({ player: Number(spot.player), batting_order: index + 1, defensive_position: spot.defensive_position || "", is_starter: true }))), "Lineup saved.");
  }

  async function saveLineupImage() {
    if (!lineup.length) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 300 + lineup.length * 86;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#030712"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#34dfff"; ctx.font = "700 26px sans-serif"; ctx.fillText("SYNCWORKS TEAM LINEUP", 70, 70);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 48px sans-serif"; ctx.fillText(group?.name || "Team", 70, 130);
    ctx.fillStyle = "#94a3b8"; ctx.font = "26px sans-serif";
    const gameText = selectedGame ? `${new Date(selectedGame.start_at).toLocaleString()}  •  vs ${selectedGame.opponent_name}` : "Lineup";
    ctx.fillText(gameText, 70, 178);
    lineup.forEach((spot, index) => {
      const player = players.find((row) => Number(row.id) === Number(spot.player));
      const y = 250 + index * 86;
      ctx.fillStyle = index % 2 ? "#0b1324" : "#101b30"; ctx.fillRect(55, y - 48, 970, 68);
      ctx.fillStyle = "#8b5cff"; ctx.font = "800 30px sans-serif"; ctx.fillText(String(index + 1), 80, y - 3);
      ctx.fillStyle = "#ffffff"; ctx.font = "700 30px sans-serif"; ctx.fillText(`#${player?.jersey_number || "—"} ${player?.display_name || "Player"}`, 145, y - 3);
      ctx.fillStyle = "#70ff3d"; ctx.font = "700 26px sans-serif"; ctx.fillText(spot.defensive_position || "—", 900, y - 3);
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], `${(group?.name || "team").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-lineup.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `${group?.name || "Team"} lineup`, files: [file] });
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openPlayer(player) {
    const profile = profileFor(player);
    setPlayerDrawer(player);
    setDrawerBadgeCard(null);
    setDrawerBadgeLoading(true);
    getPlayerBadgeCard(player.id).then(setDrawerBadgeCard).catch(()=>setDrawerBadgeCard(null)).finally(()=>setDrawerBadgeLoading(false));
    setMomentGameId(""); setMomentKind("");
    setPlayerEdit({
      display_name: player.display_name || "", jersey_number: player.jersey_number || "", primary_position: player.primary_position || "", bats: player.bats || "R", throws: player.throws || "R",
      email: profile?.email || player.user_detail?.email || "", phone: profile?.phone || "", emergency_contact_name: profile?.emergency_contact_name || "", emergency_contact_phone: profile?.emergency_contact_phone || "", notes: profile?.notes || "",
    });
    setPhotoFile(null);
  }

  async function savePlayer() {
    if (!playerDrawer || !playerEdit) return;
    const profile = profileMap.get(Number(playerDrawer.id));
    await run(async () => {
      await updateSportsPlayer(playerDrawer.id, {
        display_name: playerEdit.display_name.trim(), jersey_number: playerEdit.jersey_number.trim(), primary_position: playerEdit.primary_position, bats: playerEdit.bats, throws: playerEdit.throws,
      });
      const form = new FormData();
      form.append("player", String(playerDrawer.id));
      form.append("email", playerEdit.email || "");
      form.append("phone", playerEdit.phone || "");
      form.append("emergency_contact_name", playerEdit.emergency_contact_name || "");
      form.append("emergency_contact_phone", playerEdit.emergency_contact_phone || "");
      form.append("notes", playerEdit.notes || "");
      if (photoFile) form.append("profile_photo", photoFile);
      if (profile) await updatePlayerProfile(profile.id, form); else await createPlayerProfile(form);
    }, "Player updated.", { closePlayer: true });
  }

  async function verifyDrawerMoment() {
    if (!playerDrawer || !momentGameId || !momentKind || momentBusy) return;
    if ((momentKind === "TYING_HIT" || momentKind === "GO_AHEAD_HIT") &&
        !window.confirm("Does the official Game Book contain a late RBI-producing hit that really tied or took the lead? Clutch cannot be awarded for an ordinary RBI.")) return;
    setMomentBusy(true); setError(""); setNotice("");
    try {
      const result = await verifyPlayerMoment(playerDrawer.id, { game: Number(momentGameId), kind: momentKind });
      setDrawerBadgeCard(result.card);
      setNotice("Verified achievement recorded. Earned badge borders updated.");
      setMomentGameId(""); setMomentKind("");
    } catch(err) { setError(errorText(err)); }
    finally { setMomentBusy(false); }
  }

  async function removeDrawerMoment(moment) {
    if (!playerDrawer || momentBusy || !window.confirm("Remove this verified moment and recalculate the player's badges?")) return;
    setMomentBusy(true); setError(""); setNotice("");
    try {
      const result = await removePlayerMoment(playerDrawer.id, moment.id);
      setDrawerBadgeCard(result.card);
      setNotice("Moment removed. Badges recalculated.");
    } catch(err) { setError(errorText(err)); }
    finally { setMomentBusy(false); }
  }

  async function linkSelectedMember(player) {
    const userIdToLink = Number(selectedMemberByPlayer[player.id]);
    const member = socialRoster.find((row)=>Number(row.user)===userIdToLink);
    if (!member || !player || player.user) return;
    if (players.some((row)=>row.id !== player.id && Number(row.user) === userIdToLink)) {
      setError("That account already has a roster entry. Use Merge instead.");
      return;
    }
    const savedEmail = String(profileFor(player)?.email || "").trim().toLowerCase();
    const memberEmail = String(member.user_detail?.email || "").trim().toLowerCase();
    if (savedEmail && memberEmail && savedEmail !== memberEmail &&
      !window.confirm("This roster card has a different email than the selected member. Confirm that this is the correct player before linking.")) return;
    await run(
      ()=>linkSportsPlayerMember(player.id, userIdToLink),
      `${player.display_name} is now linked to ${member.user_detail?.display_name || memberEmail || "this member"}.`
    );
    setSelectedMemberByPlayer((current)=>({...current,[player.id]:""}));
  }

  async function mergeDuplicatePlayer() {
    if (!mergeSourcePlayer || !mergeTargetId || busy) return;
    const target = players.find((row)=>Number(row.id)===Number(mergeTargetId));
    if (!target) return;
    if (!window.confirm(`Merge ${mergeSourcePlayer.display_name} into ${target.display_name}? Stats and payment records will move to the surviving player. The original card is archived for historical reference.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await mergeSportsPlayer(mergeSourcePlayer.id, target.id);
      setMergeSourcePlayer(null); setMergeTargetId("");
      setNotice(`Merged into ${target.display_name}. ${data.plate_appearances_moved || 0} game plays and ${data.stat_entries_moved || 0} historical stat entries preserved.`);
      await refresh({quiet:true});
    } catch(err) {setError(errorText(err));}
    finally {setBusy(false);}
  }

  async function deleteEmptyPlayer() {
    if (!playerDrawer || busy) return;
    if (!window.confirm(`Permanently delete ${playerDrawer.display_name}? Only an empty card with no game, stats or payment history can be deleted. Use Archive or Merge for players with history.`)) return;
    await run(()=>deleteEmptySportsPlayer(playerDrawer.id), "Empty roster entry deleted.", {closePlayer:true});
  }

  async function archivePlayer() {
    if (!playerDrawer) return;
    if (!window.confirm(`Remove ${playerDrawer.display_name} from the active roster? Historical game data will be kept.`)) return;
    await run(() => removeSportsPlayer(playerDrawer.id), "Player removed from active roster.", { closePlayer: true });
  }

  async function addPlayer() {
    if (!newPlayer.display_name.trim()) return;
    await run(async () => {
      const player = await createSportsPlayer({ team: team.id, display_name: newPlayer.display_name.trim(), jersey_number: newPlayer.jersey_number.trim(), primary_position: newPlayer.primary_position, bats: newPlayer.bats, throws: newPlayer.throws });
      if (newPlayer.email || newPlayer.phone) await createPlayerProfile({ player: player.id, email: newPlayer.email, phone: newPlayer.phone });
    }, "Player added.");
    setNewPlayer({ display_name: "", jersey_number: "", primary_position: "", bats: "R", throws: "R", email: "", phone: "" });
    setAddPlayerOpen(false);
  }

  async function importSocialRoster() {
    const linkedIds = new Set(players.map((player) => Number(player.user)).filter(Boolean));
    const missing = socialRoster.filter((membership) => !linkedIds.has(Number(membership.user)));
    if (!missing.length) return setNotice("Every active Social member is already linked to a roster entry.");
    await run(async () => {
      const currentProfiles = list(await getPlayerProfiles(team.id));
      let linked = 0;
      let added = 0;
      let skipped = 0;
      for (const membership of missing) {
        const email = String(membership.user_detail?.email || "").trim().toLowerCase();
        const matchedPlayers = email ? players.filter((player) =>
          !player.user && currentProfiles.some((profile) => Number(profile.player) === Number(player.id) && String(profile.email || "").trim().toLowerCase() === email)
        ) : [];
        if (matchedPlayers.length === 1) {
          await updateSportsPlayer(matchedPlayers[0].id, { user: Number(membership.user) });
          linked += 1;
        } else if (matchedPlayers.length > 1) {
          skipped += 1;
        } else if (membership.role === "MEMBER") {
          await createSportsPlayer({ team: team.id, user: Number(membership.user), display_name: nameOf(membership.user_detail), jersey_number: "", primary_position: "" });
          added += 1;
        } else {
          skipped += 1; // Staff/scorekeepers stay off the player roster unless they join explicitly.
        }
      }
      return { linked, added, skipped };
    }, "Social members imported. Existing email matches are linked to their roster records; staff are left off the player roster.");
  }

  async function saveTeamMeta() {
    await run(() => updateSportsTeam(team.id, meta), "Team details saved.");
  }

  async function addGame() {
    if (!gameForm.opponent_name.trim() || !gameForm.date) return;
    const startAt = new Date(`${gameForm.date}T${gameForm.time || "18:30"}:00`);
    await run(() => createSportsGame({ team: team.id, game_type: gameForm.game_type, opponent_name: gameForm.opponent_name.trim(), home_away: gameForm.home_away, start_at: startAt.toISOString(), venue_name: gameForm.venue_name.trim(), address_line1: gameForm.address_line1.trim(), city: gameForm.city.trim(), state: gameForm.state.trim(), innings_scheduled: 7 }), "Game added and synced to Social/Calendar.");
    setGameForm((current) => ({ ...current, opponent_name: "", date: "" }));
  }

  async function inviteRosterPlayer(player, suppliedEmail = "") {
    const profile = profileMap.get(Number(player.id));
    const email = (suppliedEmail || profile?.email || player.user_detail?.email || "").trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Enter the email address this player uses for SyncWorks.");
      return;
    }
    setQuickSaving((current) => ({ ...current, [`invite-${player.id}`]: true }));
    setError(""); setNotice("");
    try {
      const invite = await inviteSportsPlayer(player.id, email);
      if (invite.invite_url) setPlayerInviteUrls((current) => ({ ...current, [player.id]: invite.invite_url }));
      setNotice(`Personal invite sent to ${player.display_name}. Use Copy or Share below to send it in a text too.`);
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, [`invite-${player.id}`]: false }));
    }
  }

  async function remindRosterPlayer(player, kind = "GENERAL") {
    if (!player.user) {
      setError("This player needs a linked SyncWorks account before reminders can be sent.");
      return;
    }
    setQuickSaving((current) => ({ ...current, [`remind-${player.id}`]: true }));
    setError(""); setNotice("");
    try {
      await remindSportsPlayer(player.id, kind);
      setNotice(`Reminder sent to ${player.display_name}.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, [`remind-${player.id}`]: false }));
    }
  }

  async function sendUnpaidReminders() {
    setQuickSaving((current) => ({ ...current, dues: true }));
    setError(""); setNotice("");
    try {
      const result = await remindTeamDues(team.id);
      setNotice(`${result.sent || 0} unpaid reminder${Number(result.sent || 0) === 1 ? "" : "s"} sent.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, dues: false }));
    }
  }

  async function quickUpdateAssignment(row, patch) {
    const previous = { ...row };
    const payload = { ...patch };
    if (patch.status === "PAID") payload.amount_paid_cents = num(row.amount_cents);
    if (patch.status === "DUE" || patch.status === "WAIVED") payload.amount_paid_cents = 0;
    const optimistic = { ...row, ...payload };
    setAssignments((current) => current.map((item) => Number(item.id) === Number(row.id) ? optimistic : item));
    setQuickSaving((current) => ({ ...current, [row.id]: true }));
    setError("");
    try {
      const saved = await updateFeeAssignment(row.id, payload);
      setAssignments((current) => current.map((item) => Number(item.id) === Number(row.id) ? saved : item));
    } catch (err) {
      setAssignments((current) => current.map((item) => Number(item.id) === Number(row.id) ? previous : item));
      setError(errorText(err));
    } finally {
      setQuickSaving((current) => ({ ...current, [row.id]: false }));
    }
  }

  async function savePayments() {
    await run(async () => {
      const current = paymentSettings || await ensureTeamPaymentSettings(team.id);
      await updateTeamPaymentSettings(current.id, payForm);
    }, "Payment links saved.");
  }

  async function addFee() {
    if (!feeForm.title.trim() || !feeForm.amount) return;
    await run(async () => {
      const fee = await createTeamFee({ team: team.id, title: feeForm.title.trim(), description: feeForm.description.trim(), amount_cents: Math.round(Number(feeForm.amount) * 100), due_date: feeForm.due_date || null });
      await assignTeamFeeRoster(fee.id);
    }, "Fee created and assigned to the active roster.");
    setFeeForm({ title: "League fee", amount: "", due_date: "", description: "" });
  }

  function openFeeEditor(fee) {
    setFeeEdit({
      id: fee.id,
      title: fee.title || "",
      amount: (num(fee.amount_cents) / 100).toFixed(2),
      due_date: fee.due_date || "",
      description: fee.description || "",
    });
  }

  async function saveFeeEdit() {
    if (!feeEdit?.id || !feeEdit.title.trim()) return;
    const amount = Number(feeEdit.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid per-player amount.");
      return;
    }
    await run(
      () => updateTeamFee(feeEdit.id, {
        title: feeEdit.title.trim(),
        description: feeEdit.description.trim(),
        amount_cents: Math.round(amount * 100),
        due_date: feeEdit.due_date || null,
      }),
      "Team fee updated.",
    );
    setFeeEdit(null);
  }

  async function saveStatEntry() {
    if (!statForm.player) return;
    const integerFields = ["games", "pa", "ab", "hits", "doubles", "triples", "home_runs", "walks", "sac_flies", "rbi", "runs"];
    const payload = { team: team.id, player: Number(statForm.player), season_name: team.season_name || "", scope: statForm.scope, source: "MANUAL", note: statForm.note || "" };
    integerFields.forEach((field) => { payload[field] = Math.max(0, Number.parseInt(statForm[field] || "0", 10) || 0); });
    await run(() => createStatLedgerEntry(payload), "Historical stats added.");
    setStatDrawer(false);
    setStatForm({ player: "", scope: "LEAGUE", games: "", pa: "", ab: "", hits: "", doubles: "", triples: "", home_runs: "", walks: "", sac_flies: "", rbi: "", runs: "", note: "" });
  }

  if (loading) return <div className="min-h-screen bg-[#02060c] text-white"><ModeBar sportsCompact title="Team" subtitle="SyncWorks Social" /><div className="grid min-h-[65vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div></div>;
  if (!group || !team) return <div className="min-h-screen bg-[#02060c] p-4 text-white"><ModeBar sportsCompact title="Team" subtitle="SyncWorks Social" /><Card title="Team workspace unavailable" body="Open this from an enabled Team group in SyncWorks Social."><Btn onClick={() => navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4" />Social</Btn></Card></div>;

  const record = dashboard?.record || {};
  const ownDue = visibleAssignments.filter((row) => ["DUE", "PARTIAL"].includes(row.status)).reduce((sum, row) => sum + Math.max(0, num(row.amount_cents) - num(row.amount_paid_cents)), 0);
  const managerOpenAssignments = assignments.filter((row) => ["DUE", "PARTIAL"].includes(row.status));
  const managerDueCount = managerOpenAssignments.length;
  const managerOutstanding = managerOpenAssignments.reduce((sum, row) => sum + Math.max(0, num(row.amount_cents) - num(row.amount_paid_cents)), 0);

  return (
    <div className="min-h-screen bg-[#02060c] pb-24 text-slate-100">
      <ModeBar sportsCompact title={group.name} subtitle="Team • SyncWorks Social" />
      <main className="mx-auto max-w-7xl space-y-3 px-3 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <Btn onClick={() => navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4" />Social</Btn>
          <div className="flex items-center gap-2"><button type="button" onClick={() => setChatOpen(true)} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-cyan-100">Chat</button>{managed ? <button type="button" onClick={() => setPreviewPlayerView((value) => !value)} className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-violet-100">{previewPlayerView ? "Back to manager" : "Preview player"}</button> : null}<button type="button" onClick={() => refresh()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><RefreshCw className="h-4 w-4" /></button></div>
        </div>

        {error ? <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-100">{notice}</div> : null}

        {liveGame ? (
          <button type="button" onClick={() => navigate(`/connect/groups/${group.id}/sports/games/${liveGame.id}`)} className="sticky top-[5.2rem] z-30 flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-300/30 bg-[#04150f]/95 px-3 py-2.5 text-left shadow-lg backdrop-blur">
            <span><span className="block text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">● Live now</span><b className="mt-0.5 block text-xs text-white">vs {liveGame.opponent_name}</b></span>
            <span className="rounded-lg bg-emerald-300 px-3 py-2 text-[9px] font-black text-slate-950">Resume live Game Book</span>
          </button>
        ) : null}

        <section className="rounded-[1.55rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.16),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.13),transparent_35%),#07111f] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">{managerView ? <label className="group relative shrink-0 cursor-pointer" title="Change team logo"><TeamLogo group={group}/><span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-cyan-200/35 bg-cyan-300 text-slate-950 shadow-lg"><Camera className="h-3.5 w-3.5"/></span><input type="file" accept="image/*" className="hidden" onChange={(event)=>changeTeamLogo(event.target.files?.[0] || null)}/></label> : <TeamLogo group={group}/>}<div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Pill tone="cyan">Softball</Pill><Pill tone={managerView ? "violet" : canScore ? "amber" : "green"}>{managerView ? "Manager view" : canScore ? "Scorekeeper view" : "Player view"}</Pill><Pill>{team.season_name || "Season"}</Pill><Pill tone="green">Free team tools</Pill></div><h1 className="mt-2 truncate text-2xl font-black text-white">{group.name}</h1><p className="mt-1 text-[11px] text-slate-400">{[team.league_name, team.division_name].filter(Boolean).join(" · ") || "Team workspace"}</p></div></div>
            {list(dashboard?.live_games).length ? <Btn primary onClick={() => navigate(`/connect/groups/${group.id}/sports/games/${dashboard.live_games[0].id}`)}><CircleDot className="mr-1 inline h-4 w-4" />Live</Btn> : null}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5"><Stat label="Record" value={`${num(record.wins)}-${num(record.losses)}`} /><Stat label="Roster" value={players.length} /><Stat label="Games" value={games.length} /><Stat label={managerView ? "Outstanding" : "My due"} value={managerView ? money(managerOutstanding) : money(ownDue)} sub={managerView ? `${managerDueCount} open charge${managerDueCount === 1 ? "" : "s"}` : undefined} /></div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <Stat label="Runs for" value={num(dashboard?.team_stats?.runs_for)} sub="Scored" />
            <Stat label="Runs against" value={num(dashboard?.team_stats?.runs_against)} sub="Allowed" />
            <Stat label="Run differential" value={`${(num(dashboard?.team_stats?.runs_for)-num(dashboard?.team_stats?.runs_against))>=0?"+":""}${num(dashboard?.team_stats?.runs_for)-num(dashboard?.team_stats?.runs_against)}`} />
          </div>
          {nextGame ? <button type="button" onClick={() => setTab("Schedule")} className="mt-3 flex w-full items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/[.05] p-2.5 text-left"><span><span className="block text-[9px] font-black uppercase tracking-wide text-emerald-300">Next game</span><b className="text-xs text-white">{new Date(nextGame.start_at).toLocaleDateString()} · {new Date(nextGame.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · vs {nextGame.opponent_name}</b><span className="block text-[10px] text-slate-500">{nextGame.venue_name || "Field TBD"}</span></span><CalendarDays className="h-4 w-4 text-emerald-300" /></button> : null}
        </section>

        <div className="flex gap-1.5 overflow-x-auto pb-1">{TABS.map((name) => <button key={name} type="button" onClick={() => setTab(name)} className={cx("min-h-9 shrink-0 rounded-full px-3 text-[10px] font-black", tab === name ? "bg-white text-slate-950" : "border border-white/10 text-slate-400")}>{name}</button>)}</div>

        {tab === "Overview" ? <div className="grid gap-3 lg:grid-cols-[1fr_1fr_.92fr]">
          <Card title="Season command" body={managerView ? "Manager controls. Players see the same team data without edit access." : "Your team, schedule, lineup, stats and dues in one place."}>
            <div className="grid grid-cols-3 gap-2">
  <Stat label="AVG" value={pct(dashboard?.team_stats?.avg)} sub={`${num(dashboard?.team_stats?.hits)} H`} />
  <Stat label="OBP" value={pct(dashboard?.team_stats?.obp)} sub={`${num(dashboard?.team_stats?.walks)} BB`} />
  <Stat label="OPS" value={pct(dashboard?.team_stats?.ops)} sub={`${num(dashboard?.team_stats?.doubles)} 2B · ${num(dashboard?.team_stats?.home_runs)} HR`} />
</div>
<div className="mt-2 grid grid-cols-3 gap-2">
  <Stat label="Runs" value={num(dashboard?.team_stats?.runs_for)} />
  <Stat label="RBI" value={num(dashboard?.team_stats?.rbi)} />
  <Stat label="Run diff" value={num(dashboard?.team_stats?.runs_for) - num(dashboard?.team_stats?.runs_against)} sub={`${num(dashboard?.team_stats?.runs_for)}-${num(dashboard?.team_stats?.runs_against)}`} />
</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5"><Btn onClick={() => setTab("Lineup")}>Lineup</Btn><Btn onClick={() => setTab("Stats")}>Stats</Btn><Btn onClick={() => setTab("Dues")}>Dues</Btn></div>
          </Card>
          <GameAvailabilityCard game={nextGame} players={players} responses={eventResponses} userId={userId} managerView={managerView} onRespond={respondToGame} />
          <div className="hidden lg:block lg:row-span-2"><TeamChatPanel groupId={group.id} userId={userId} canManage={managed} /></div>
          {managerView ? <Card title="Team details" body="These labels carry with the team if it later joins an association or league." className="lg:col-span-2"><div className="grid gap-2 sm:grid-cols-3"><Input label="Season" value={meta.season_name} onChange={(value) => setMeta((current) => ({ ...current, season_name: value }))} /><Input label="League" value={meta.league_name} onChange={(value) => setMeta((current) => ({ ...current, league_name: value }))} /><Input label="Division" value={meta.division_name} onChange={(value) => setMeta((current) => ({ ...current, division_name: value }))} /></div><Btn primary className="mt-2 w-full" onClick={saveTeamMeta} disabled={busy}><Save className="mr-1 inline h-4 w-4" />Save</Btn></Card> : <Card title="Your access" body="Players can view team information and only their own payment status." className="lg:col-span-2"><div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3"><div className="rounded-xl border border-white/10 p-3"><b>Roster:</b> shared team information</div><div className="rounded-xl border border-white/10 p-3"><b>Dues:</b> only your own amount/status</div><div className="rounded-xl border border-white/10 p-3"><b>Game Book:</b> managers keep the official book</div></div></Card>}
        </div> : null}

        {tab === "Roster" ? <div className="space-y-3">
          {managerView ? <Card title="Invite your team" body="One link, two options: players sign in with the team password; fans can follow and opt in to GameCast email alerts without a password." action={<Link2 className="h-5 w-5 text-emerald-300" />}>
            <Btn primary className="w-full" onClick={openTeamInvites}><Share2 className="mr-2 inline h-4 w-4" />Share team invite link</Btn>
            <p className="mt-2 text-[10px] leading-5 text-slate-400">Already entered a player and their stats? Use their personal email invitation below to link that exact roster card instead.</p>
          </Card> : myMembership && !myPlayer ? <Card title="Add yourself to the team roster" body="After your group request is approved, claim your existing player card by account email or create your own. Existing jersey numbers and stats are preserved when your email matches." action={<UserPlus className="h-5 w-5 text-cyan-300" />}><Btn primary className="w-full" disabled={!!quickSaving["self-join"]} onClick={selfJoinRoster}>{quickSaving["self-join"] ? "Connecting…" : "Add me to roster"}</Btn></Card> : null}
          {managerView && pendingTeamRequests.length ? <Card title="Team join requests" body="Review any pending manual membership requests. Players who enter the correct group password join immediately."><div className="space-y-2">{pendingTeamRequests.map((membership)=><div key={membership.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3"><span className="min-w-0"><b className="block truncate text-xs text-white">{membership.user_detail?.display_name || membership.user_detail?.email || "SyncWorks member"}</b><span className="block truncate text-[10px] text-slate-400">{membership.user_detail?.email || "Request to join"}</span></span><Btn primary disabled={!!quickSaving["approve-"+membership.id]} onClick={()=>approveTeamRequest(membership)}>{quickSaving["approve-"+membership.id] ? "…" : "Approve"}</Btn></div>)}</div></Card> : null}
          <Card
            title="Team access & roles"
            body="Assign access here or on each linked roster player below. Unlinked players must accept a SyncWorks invite before they can receive scoring permissions. Staff can join without taking a roster spot."
            action={<Users className="h-4 w-4 text-violet-300" />}
          >
            <div className="space-y-2">
              {socialRoster.map((membership) => {
                const linkedPlayer = players.find((player) => Number(player.user) === Number(membership.user));
                const roleLabel = membership.role === "OWNER" ? "Owner" : ROLE_OPTIONS.find(([value]) => value === membership.role)?.[1] || membership.role;
                return <div key={membership.id} className="rounded-xl border border-white/10 bg-black/15 p-2.5">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5"><b className="truncate text-[11px] text-white">{membership.user_detail?.display_name || membership.user_detail?.email || "Team member"}</b>{linkedPlayer ? <Pill tone="cyan">Player #{linkedPlayer.jersey_number || "—"}</Pill> : <Pill>Staff / member</Pill>}</div>
                      <div className="mt-1 text-[9px] leading-4 text-slate-500">{ROLE_HELP[membership.role] || ROLE_HELP.MEMBER}</div>
                    </div>
                    {managerView && membership.role !== "OWNER" && (myMembership?.role !== "MANAGER" || membership.role !== "DIRECTOR") ? <select disabled={!!quickSaving[`role-${membership.id}`]} value={membership.role} onChange={(event)=>changeMemberRole(membership,event.target.value)} className="h-10 w-full rounded-xl border border-violet-300/20 bg-[#050b14] px-2 text-[10px] font-black text-violet-100 disabled:opacity-50">{ROLE_OPTIONS.filter(([value]) => myMembership?.role !== "MANAGER" || value !== "DIRECTOR").map(([value,label])=><option key={value} value={value}>{label}</option>)}</select> : <div className="rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-center text-[9px] font-black text-slate-300">{roleLabel}</div>}
                  </div>
                </div>;
              })}
              {!socialRoster.length ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-slate-500">No linked SyncWorks group members yet.</div> : null}
            </div>
            {managerView ? <Btn className="mt-3 w-full" onClick={()=>navigate(`/connect/groups/${groupId}`)}><UserPlus className="mr-1 inline h-4 w-4"/>Invite or add group member</Btn> : null}
          </Card>

          <Card
          title="Roster"
          body={managerView ? "Manager directory: contacts, account status, invites and reminders." : "Active team roster."}
          action={managerView ? <button type="button" onClick={() => setAddPlayerOpen(true)} className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-cyan-300 px-3 text-[9px] font-black text-slate-950"><Plus className="h-3.5 w-3.5" />Add player</button> : <Users className="h-4 w-4 text-cyan-300" />}
        >
          {managerView ? <div className="mb-3 grid grid-cols-3 gap-1.5">
            <Stat label="Players" value={players.length} />
            <Stat label="Linked" value={players.filter((player) => player.user).length} />
            <Stat label="Need link" value={players.filter((player) => !player.user).length} />
          </div> : null}
          {managerView ? <div className="mb-3 flex gap-2"><Btn onClick={importSocialRoster} disabled={busy}><UserPlus className="mr-1 inline h-4 w-4" />Import Social members</Btn><Btn primary onClick={() => setAddPlayerOpen(true)}><Plus className="mr-1 inline h-4 w-4" />Quick add</Btn></div> : null}
          <div className="space-y-1.5">
            {players.map((player) => {
              const profile = profileFor(player);
              const email = profile?.email || player.user_detail?.email || "";
              const phone = profile?.phone || "";
              const linkedMembership = memberships.find((membership) => Number(membership.group) === Number(groupId) && Number(membership.user) === Number(player.user) && membership.status === "ACTIVE");
              const pendingMembership = memberships.find((membership) => Number(membership.group) === Number(groupId) && Number(membership.user) === Number(player.user) && membership.status === "INVITED");
              const personalInviteUrl = playerInviteUrls[player.id];
              return <div key={player.id} className="rounded-xl border border-white/10 bg-white/[.025] p-2.5">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openPlayer(player)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Avatar player={player} profile={profile} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-xs text-white">#{player.jersey_number || "—"} {player.display_name}</b>
                      <span className="block text-[9px] text-slate-500">{player.primary_position || "Position TBD"} · {player.user ? "SyncWorks linked" : "not linked"}</span>
                      {playerStat(player) ? <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] font-black text-cyan-100"><span>AVG {pct(playerStat(player).avg)}</span><span>OBP {pct(playerStat(player).obp)}</span><span>SLG {pct(playerStat(player).slg)}</span><span>OPS {pct(playerStat(player).ops)}</span><span className="text-slate-500">{num(playerStat(player).h)} H · {num(playerStat(player).double)} 2B · {num(playerStat(player).rbi)} RBI</span></span> : null}
                    </span>
                  </button>
                  {managerView ? <button type="button" onClick={() => openPlayer(player)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300"><Pencil className="h-3.5 w-3.5" /></button> : null}
                </div>
                {managerView ? <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5">
                  <div className="min-w-0">
                    {email ? <a href={`mailto:${email}`} className="flex items-center gap-1 truncate text-[9px] text-cyan-200"><Mail className="h-3 w-3 shrink-0" />{email}</a> : <div className="text-[9px] text-slate-600">No email</div>}
                    {phone ? <a href={`tel:${phone}`} className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-slate-400"><Phone className="h-3 w-3 shrink-0" />{phone}</a> : null}
                  </div>
                  {!player.user ? <button type="button" disabled={quickSaving[`invite-${player.id}`]} onClick={() => inviteRosterPlayer(player)} className="min-h-8 rounded-lg border border-violet-300/20 bg-violet-300/10 px-2 text-[8px] font-black text-violet-100">{quickSaving[`invite-${player.id}`] ? "..." : "Invite"}</button> : <Pill tone="green">Linked</Pill>}
                  <button type="button" disabled={!player.user || quickSaving[`remind-${player.id}`]} onClick={() => remindRosterPlayer(player, "GENERAL")} className="grid h-8 w-8 place-items-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-100 disabled:opacity-30" aria-label="Send reminder"><Bell className="h-3.5 w-3.5" /></button>
                </div> : null}
                {managerView ? <div className="mt-2 rounded-xl border border-violet-300/15 bg-violet-300/[.035] p-2.5">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-wide text-violet-200">Team role / Game Book access</div>
                  {linkedMembership ? linkedMembership.role === "OWNER" || (myMembership?.role === "MANAGER" && linkedMembership.role === "DIRECTOR") ?
                    <div className="text-[11px] text-slate-200">{ROLE_HELP[linkedMembership.role] || linkedMembership.role}</div>
                    : <select aria-label={`Role for ${player.display_name}`} disabled={!!quickSaving[`role-${linkedMembership.id}`]} value={linkedMembership.role} onChange={(event)=>changeMemberRole(linkedMembership,event.target.value)} className="min-h-11 w-full rounded-xl border border-violet-300/25 bg-[#050b14] px-3 text-xs font-bold text-white disabled:opacity-50">
                        {ROLE_OPTIONS.filter(([value]) => myMembership?.role !== "MANAGER" || value !== "DIRECTOR").map(([value,label])=><option key={value} value={value}>{label}</option>)}
                      </select>
                  : !player.user ?
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-amber-200">Not linked to SyncWorks. Add an email, then invite this player.</span><button type="button" onClick={()=>openPlayer(player)} className="min-h-10 rounded-lg border border-amber-300/30 px-3 text-[10px] font-bold text-amber-100">Edit / invite</button></div>
                  : pendingMembership ?
                    <span className="text-[10px] text-amber-200">Group invitation pending. Assign a role after acceptance.</span>
                  : <button type="button" disabled={!!quickSaving[`group-${player.id}`]} onClick={()=>addLinkedPlayerToGroup(player)} className="min-h-11 w-full rounded-xl border border-violet-300/30 bg-violet-300/10 px-3 text-xs font-bold text-violet-100 disabled:opacity-50">Invite linked player to group</button>}
                </div> : null}
                {managerView && !linkedMembership ? <div className="mt-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-2.5">
                  <b className="block text-[10px] text-cyan-100">Link this player to SyncWorks</b>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">Enter the email they use for SyncWorks. The personal invite claims this exact roster entry and keeps their stats.</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input aria-label={`SyncWorks email for ${player.display_name}`} type="email" placeholder="player@example.com" value={playerInviteEmails[player.id] ?? email} onChange={(event)=>setPlayerInviteEmails((current)=>({ ...current, [player.id]: event.target.value }))} className="min-h-11 min-w-0 flex-1 rounded-xl border border-cyan-300/20 bg-[#050b14] px-3 text-xs text-white" />
                    <Btn primary disabled={!!quickSaving[`invite-${player.id}`]} onClick={()=>inviteRosterPlayer(player, playerInviteEmails[player.id] ?? email)}>{quickSaving[`invite-${player.id}`] ? "Sending…" : player.user ? "Resend invite" : "Send player invite"}</Btn>
                  </div>
                  {!player.user && socialRoster.some((membership)=>!players.some((other)=>other.id !== player.id && Number(other.user)===Number(membership.user))) ? <div className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[.035] p-2.5">
                    <b className="block text-[10px] font-black text-violet-200">Already in the team? Link their account now</b>
                    <select aria-label={`Link an approved group member to ${player.display_name}`} value={selectedMemberByPlayer[player.id] || ""} onChange={(event)=>setSelectedMemberByPlayer((current)=>({...current,[player.id]:event.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border border-violet-300/25 bg-[#050b14] px-3 text-xs text-white">
                      <option value="">Select approved SyncWorks member</option>
                      {socialRoster.filter((membership)=>!players.some((other)=>other.id !== player.id && Number(other.user)===Number(membership.user))).map((membership)=><option key={membership.id} value={membership.user}>{membership.user_detail?.display_name || membership.user_detail?.email || "Team member"}{membership.user_detail?.email ? " · "+membership.user_detail.email : ""}</option>)}
                    </select>
                    <Btn primary disabled={!selectedMemberByPlayer[player.id] || busy} className="mt-2 w-full" onClick={()=>linkSelectedMember(player)}><Link2 className="mr-1 inline h-4 w-4" />Link existing member</Btn>
                  </div> : null}
                  {personalInviteUrl ? <div className="mt-3 rounded-xl border border-emerald-300/15 bg-black/20 p-2">
                    <input aria-label={`Personal invite URL for ${player.display_name}`} readOnly value={personalInviteUrl} onFocus={(event)=>event.target.select()} onClick={(event)=>event.currentTarget.select()} className="min-h-11 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] text-cyan-100" />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Btn onClick={()=>copyInviteUrl(personalInviteUrl)}><Copy className="mr-1 inline h-4 w-4" />Copy link</Btn>
                      <Btn primary onClick={()=>shareInviteUrl(personalInviteUrl, group?.name || "our team")}><Share2 className="mr-1 inline h-4 w-4" />Share link</Btn>
                    </div>
                  </div> : null}
                </div> : null}
              </div>;
            })}
          </div>
        </Card></div> : null}

        {tab === "Lineup" ? <div className="space-y-3">
          <Card
            title="Game lineup"
            body={managerView ? "Every rostered player stays visible here: Batting Order, SUB / Bench, or OUT. Tap a grip to lift a player, then tap where you want him dropped — or press/hold and drag." : "Official batting order, bench and availability."}
            action={<GripVertical className="h-4 w-4 text-violet-300" />}
          >
            <div className="grid gap-3 lg:grid-cols-[.68fr_1.32fr]">
              <div className="space-y-2">
                <Select label="Game" value={lineupGameId} onChange={(value) => chooseLineupGame(value)}>
                  <option value="">Choose game</option>
                  {games.filter((game) => game.status !== "CANCELLED").map((game) => (
                    <option key={game.id} value={game.id}>{new Date(game.start_at).toLocaleDateString()} · {new Date(game.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {game.opponent_name}</option>
                  ))}
                </Select>

                {selectedGame ? <div className="rounded-xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.06] via-violet-300/[.04] to-transparent p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><b className="text-xs text-white">vs {selectedGame.opponent_name}</b><div className="mt-0.5 text-[9px] text-slate-500">{selectedGame.venue_name || "Field TBD"}</div></div>
                    <Pill tone={selectedGame.status === "LIVE" ? "green" : "cyan"}>{selectedGame.status}</Pill>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[.05] p-2 text-center"><div className="text-base font-black text-emerald-100">{lineup.length}</div><div className="text-[7px] font-black uppercase text-emerald-300">Batting</div></div>
                    <div className="rounded-lg border border-amber-300/15 bg-amber-300/[.05] p-2 text-center"><div className="text-base font-black text-amber-100">{benchPlayers.length}</div><div className="text-[7px] font-black uppercase text-amber-300">Subs</div></div>
                    <div className="rounded-lg border border-rose-300/15 bg-rose-300/[.05] p-2 text-center"><div className="text-base font-black text-rose-100">{outPlayers.length}</div><div className="text-[7px] font-black uppercase text-rose-300">Out</div></div>
                  </div>
                </div> : null}

                {liftedPlayerId ? <div className="rounded-xl border border-violet-300/30 bg-violet-300/10 p-2.5 text-[9px] font-black text-violet-100">Player lifted. Tap another batting-order row to drop him there.</div> : null}

                {selectedGame ? <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                  <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.03] p-2"><b className="text-amber-200">Confirmed SUB</b><div className="mt-1 leading-4 text-slate-400">{confirmedSubPlayers.length ? confirmedSubPlayers.map((p) => p.display_name).join(" · ") : "None"}</div></div>
                  <div className="rounded-xl border border-white/10 bg-white/[.025] p-2"><b className="text-slate-300">Waiting</b><div className="mt-1 leading-4 text-slate-500">{waitingPlayers.length ? waitingPlayers.map((p) => p.display_name).join(" · ") : "None"}</div></div>
                </div> : null}
              </div>

              <div className={cx("space-y-2", dragging && "select-none")}>
                <div className="flex items-center justify-between px-1">
                  <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-300">Batting order</div>
                  <div className="text-[8px] text-slate-600">AVG · OPS · RBI</div>
                </div>

                {lineup.map((spot, index) => {
                  const player = players.find((row) => Number(row.id) === Number(spot.player));
                  const status = statusForSelected(player);
                  const stat = playerStat(player);
                  const lifted = Number(liftedPlayerId) === Number(spot.player);
                  return <div
                    key={spot.player}
                    data-lineup-index={index}
                    onClick={() => { if (managerView && liftedPlayerId && !lifted) dropLiftedAt(index); }}
                    className={cx(
                      "relative overflow-hidden rounded-2xl border p-2.5 transition-all duration-150",
                      lifted ? "z-10 scale-[1.025] border-violet-300/60 bg-violet-300/15 shadow-[0_12px_36px_rgba(139,92,255,.22)]" :
                      status === "MAYBE" ? "border-amber-300/20 bg-gradient-to-r from-amber-300/[.06] to-transparent" :
                      status === "PENDING" ? "border-white/10 bg-white/[.025]" :
                      "border-emerald-300/15 bg-gradient-to-r from-emerald-300/[.055] via-cyan-300/[.025] to-transparent"
                    )}
                  >
                    <div className="grid grid-cols-[1.7rem_2.6rem_minmax(0,1fr)_3.8rem_2.2rem] items-center gap-1.5">
                      <div className="grid h-8 place-items-center rounded-lg bg-black/20 text-sm font-black text-cyan-200">{index + 1}</div>
                      {managerView ? <button
                        type="button"
                        onPointerDown={(event) => dragStart(event, index, spot.player)}
                        onPointerMove={dragMove}
                        onPointerUp={(event) => dragEnd(event, index, spot.player)}
                        onPointerCancel={dragCancel}
                        style={{ touchAction: "none" }}
                        className={cx("grid h-10 w-10 place-items-center rounded-xl border transition", lifted ? "border-violet-200/50 bg-violet-200/15 text-violet-100" : "border-violet-300/20 bg-violet-300/[.06] text-violet-200")}
                        aria-label={lifted ? "Drop player" : "Lift or drag player"}
                      ><GripVertical className="h-5 w-5" /></button> : <div />}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <b className="truncate text-[11px] text-white">#{player?.jersey_number || "—"} {player?.display_name}</b>
                          <Pill tone={status === "YES" ? "green" : status === "MAYBE" ? "amber" : status === "NO" ? "rose" : status === "PENDING" ? "slate" : "violet"}>
                            {status === "YES" ? "IN" : status === "MAYBE" ? "SUB" : status === "PENDING" ? "WAIT" : status === "UNLINKED" ? "MANUAL" : status}
                          </Pill>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[8px]">
                          <span className="text-cyan-200">AVG <b>{pct(stat?.avg)}</b></span>
                          <span className="text-violet-200">OPS <b>{pct(stat?.ops)}</b></span>
                          <span className="text-amber-200">RBI <b>{num(stat?.rbi)}</b></span>
                        </div>
                      </div>

                      <select
                        disabled={!managerView}
                        value={spot.defensive_position || ""}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setLineup((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, defensive_position: event.target.value } : row))}
                        className="h-9 rounded-lg border border-cyan-300/15 bg-[#050b14] px-1 text-[9px] font-black text-cyan-100"
                      ><option value="">POS</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</select>

                      {managerView ? <button type="button" onClick={(event) => { event.stopPropagation(); removeLineupPlayer(spot.player); }} className="grid h-8 w-8 place-items-center rounded-lg border border-amber-300/20 bg-amber-300/[.06] text-amber-200" aria-label="Move to sub list"><X className="h-3.5 w-3.5" /></button> : <div />}
                    </div>
                  </div>;
                })}

                {!lineup.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No starters yet. Tap a player in SUB / Bench to move him into the batting order.</div> : null}

                {lineup.length ? <div className="grid grid-cols-2 gap-2"><Btn onClick={saveLineupImage}><ImageDown className="mr-1 inline h-4 w-4" />Save image</Btn>{managerView ? <Btn primary onClick={saveLineup} disabled={busy}><Save className="mr-1 inline h-4 w-4" />Save lineup</Btn> : null}</div> : null}
                {selectedGame?.lineup_spots?.length ? <Btn className="w-full" onClick={() => navigate(`/connect/groups/${group.id}/sports/games/${selectedGame.id}`)}><CircleDot className="mr-1 inline h-4 w-4" />{managerView ? "Open Game Book" : "View game"}</Btn> : null}
              </div>
            </div>
          </Card>

          {selectedGame && lineup.length ? <SoftballDefenseField lineup={fieldLineup} title="Defensive field" /> : null}

          {selectedGame ? <div className="grid gap-3 lg:grid-cols-[1fr_.55fr]">
            <Card title="SUB / Bench" body="Everyone not in the batting order stays here. Tap a player to return him to the bottom of the lineup." action={<Users className="h-4 w-4 text-amber-300" />}>
              <div className="grid gap-2 sm:grid-cols-2">
                {benchPlayers.map((player) => {
                  const status = statusForSelected(player);
                  const stat = playerStat(player);
                  return <button
                    key={player.id}
                    type="button"
                    disabled={!managerView}
                    onClick={() => restoreFromBench(player.id)}
                    className={cx("rounded-xl border p-2.5 text-left transition", status === "MAYBE" ? "border-amber-300/25 bg-amber-300/[.07]" : status === "PENDING" ? "border-white/10 bg-white/[.025]" : "border-cyan-300/15 bg-cyan-300/[.04]", managerView && "active:scale-[.98]")}
                  >
                    <div className="flex items-center justify-between gap-2"><b className="truncate text-[11px] text-white">#{player.jersey_number || "—"} {player.display_name}</b><Pill tone={status === "MAYBE" ? "amber" : status === "YES" ? "green" : status === "PENDING" ? "slate" : "violet"}>{status === "MAYBE" ? "SUB" : status === "PENDING" ? "WAIT" : status === "UNLINKED" ? "MANUAL" : status}</Pill></div>
                    <div className="mt-1.5 flex items-center gap-3 text-[8px]"><span className="text-cyan-200">AVG <b>{pct(stat?.avg)}</b></span><span className="text-violet-200">OPS <b>{pct(stat?.ops)}</b></span><span className="text-amber-200">RBI <b>{num(stat?.rbi)}</b></span></div>
                    {managerView ? <div className="mt-2 text-[8px] font-black uppercase tracking-wide text-cyan-300">Tap to lineup</div> : null}
                  </button>;
                })}
                {!benchPlayers.length ? <div className="rounded-xl border border-dashed border-amber-300/15 p-4 text-[10px] text-slate-500 sm:col-span-2">No bench players. Everyone available is currently in the batting order.</div> : null}
              </div>
            </Card>

            <Card title="OUT" body="These players stay visible but cannot be placed into this game lineup." action={<X className="h-4 w-4 text-rose-300" />}>
              <div className="space-y-1.5">
                {outPlayers.map((player) => <div key={player.id} className="rounded-xl border border-rose-300/15 bg-rose-300/[.05] p-2.5"><div className="flex items-center justify-between gap-2"><b className="truncate text-[10px] text-slate-300">#{player.jersey_number || "—"} {player.display_name}</b><Pill tone="rose">OUT</Pill></div></div>)}
                {!outPlayers.length ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-[10px] text-slate-600">Nobody is marked OUT.</div> : null}
              </div>
            </Card>
          </div> : null}
        </div> : null}

        {tab === "Schedule" ? <div className="grid gap-3 lg:grid-cols-[1.3fr_.7fr]">
          <div className="space-y-3">
            {needsCompletionGames.length ? <Card title="Needs completion" body="Past games stay out of Upcoming until you enter the final result or finish the Game Book." action={<Pill tone="amber">{needsCompletionGames.length} OPEN</Pill>}>
              <div className="space-y-2">{needsCompletionGames.map((game)=><div key={game.id} className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3"><div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-wide text-amber-300">{new Date(game.start_at).toLocaleDateString()}</div><b className="block truncate text-xs text-white">vs {game.opponent_name}</b><span className="text-[9px] text-slate-500">{game.venue_name || "Field TBD"} · final score/stat entry needed</span></div><div className="grid shrink-0 gap-1"><Btn primary onClick={()=>navigate(`/connect/groups/${group.id}/sports/games/${game.id}`)}>Game Book</Btn>{managerView?<Btn onClick={()=>quickFinal(game)}>Quick final</Btn>:null}</div></div>)}</div>
            </Card> : null}
          <Card title="Team schedule" body="Completed games show the official final score and result. Upcoming and live games stay distinct." action={<CalendarDays className="h-4 w-4 text-emerald-300" />}>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              <Stat label="Record" value={`${num(record.wins)}-${num(record.losses)}`} sub={num(record.ties) ? `${num(record.ties)} ties` : "Season"} />
              <Stat label="RF" value={num(dashboard?.team_stats?.runs_for)} />
              <Stat label="RA" value={num(dashboard?.team_stats?.runs_against)} />
              <Stat label="Diff" value={`${(num(dashboard?.team_stats?.runs_for)-num(dashboard?.team_stats?.runs_against))>=0?"+":""}${num(dashboard?.team_stats?.runs_for)-num(dashboard?.team_stats?.runs_against)}`} />
            </div>
            <div className="space-y-2">{games.map((game)=>{
              const final = game.status === "FINAL";
              const live = game.status === "LIVE";
              const win = final && num(game.runs_for) > num(game.runs_against);
              const loss = final && num(game.runs_for) < num(game.runs_against);
              const result = win ? "W" : loss ? "L" : "T";
              const tone = win ? "border-emerald-300/35 bg-emerald-300/[.06]" : loss ? "border-rose-300/35 bg-rose-300/[.06]" : final ? "border-amber-300/35 bg-amber-300/[.05]" : live ? "border-cyan-300/35 bg-cyan-300/[.05]" : "border-white/10 bg-white/[.025]";
              const badgeTone = win ? "bg-emerald-400 text-[#03100b]" : loss ? "bg-rose-400 text-slate-950" : "bg-amber-300 text-slate-950";
              return <div key={game.id} className={`rounded-xl border p-3 ${tone}`}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <b className="text-xs text-white">{new Date(game.start_at).toLocaleDateString()} · {new Date(game.start_at).toLocaleTimeString([], { hour:"numeric",minute:"2-digit" })}</b>
                      <Pill tone={game.home_away==="HOME"?"green":game.home_away==="AWAY"?"amber":"slate"}>{game.home_away}</Pill>
                    </div>
                    <div className="mt-1 text-[12px] font-black text-white">vs {game.opponent_name}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="h-3 w-3 shrink-0"/>{game.venue_name || "Field TBD"}</div>
                    {game.address_line1 ? <div className="pl-4 text-[9px] leading-4 text-slate-500">{game.address_line1}, {game.city}, {game.state}</div> : null}
                    {final ? <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                      <span className={`grid h-10 w-10 place-items-center rounded-lg text-lg font-black ${badgeTone}`}>{result}</span>
                      <span><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Final score</span>
                        <span className={`block text-lg font-black ${win?"text-emerald-200":loss?"text-rose-200":"text-amber-200"}`}>{num(game.runs_for)} – {num(game.runs_against)}</span>
                      </span>
                    </div> : live ? <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300"/>LIVE · {num(game.runs_for)} – {num(game.runs_against)}</div> : game.status==="CANCELLED" ? <div className="mt-2 text-[10px] font-black text-slate-500">CANCELLED</div> : <div className="mt-2 text-[10px] font-bold text-cyan-200">UPCOMING</div>}
                  </div>
                  <div className="grid content-start gap-1.5">
                    <Btn onClick={()=>navigate(`/connect/groups/${group.id}/sports/games/${game.id}`)}>{canScore ? "Game Book" : "Open"}</Btn>
                    {managerView ? <Btn onClick={()=>quickEditGame(game)}><Pencil className="mr-1 inline h-3 w-3"/>Edit game</Btn> : null}
                    {managerView && final ? <Btn onClick={()=>quickFinal(game)}>Edit final</Btn> : null}
                  </div>
                </div>
              </div>;
            })}
            {!games.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-xs text-slate-500">No games scheduled.</div>:null}</div>
          </Card>
          </div>
          {managerView ? <Card title="Add game" body="Manual additions use the same calendar sync."><div className="grid grid-cols-2 gap-2"><Select label="Type" value={gameForm.game_type} onChange={(value) => setGameForm((v) => ({ ...v, game_type: value }))}><option value="LEAGUE">League</option><option value="TOURNAMENT">Tournament</option><option value="PRACTICE">Practice</option><option value="EXHIBITION">Exhibition</option></Select><Select label="Home/Away" value={gameForm.home_away} onChange={(value) => setGameForm((v) => ({ ...v, home_away: value }))}><option value="HOME">Home</option><option value="AWAY">Away</option><option value="NEUTRAL">Neutral</option></Select><Input label="Opponent" value={gameForm.opponent_name} onChange={(value) => setGameForm((v) => ({ ...v, opponent_name: value }))} className="col-span-2" /><Input label="Date" type="date" value={gameForm.date} onChange={(value) => setGameForm((v) => ({ ...v, date: value }))} /><Input label="Time" type="time" value={gameForm.time} onChange={(value) => setGameForm((v) => ({ ...v, time: value }))} /><Input label="Venue / field" value={gameForm.venue_name} onChange={(value) => setGameForm((v) => ({ ...v, venue_name: value }))} className="col-span-2" /><Input label="Address" value={gameForm.address_line1} onChange={(value) => setGameForm((v) => ({ ...v, address_line1: value }))} className="col-span-2" /><Input label="City" value={gameForm.city} onChange={(value) => setGameForm((v) => ({ ...v, city: value }))} /><Input label="State" value={gameForm.state} onChange={(value) => setGameForm((v) => ({ ...v, state: value }))} /></div><Btn primary className="mt-2 w-full" onClick={addGame} disabled={!gameForm.opponent_name.trim() || !gameForm.date || busy}><Plus className="mr-1 inline h-4 w-4" />Add game</Btn></Card> : <Card title="Tournament week" body="League or tournament games will appear here once published by a manager or association."><div className="text-xs text-slate-400">Your Fall 2026 league sheet lists tournament week beginning October 27.</div></Card>}
        </div> : null}

        {tab === "Stats" ? <div className="space-y-3">
          {advancedAnalytics?.inning_analytics ? <Card title="Team scoring pace" body="Live Game Book data rolled into team averages by game and inning." action={<Trophy className="h-4 w-4 text-amber-300" />}>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Avg runs / game" value={num(advancedAnalytics.inning_analytics.avg_runs_per_game).toFixed(2)} sub={`${num(advancedAnalytics.inning_analytics.runs)} total runs`} />
              <Stat label="Avg hits / game" value={num(advancedAnalytics.inning_analytics.avg_hits_per_game).toFixed(2)} sub={`${num(advancedAnalytics.inning_analytics.hits)} total hits`} />
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="flex min-w-max gap-1.5">
                {list(advancedAnalytics.inning_analytics.innings).map((row) => <div key={row.inning} className="w-[5.3rem] rounded-xl border border-white/10 bg-black/15 p-2 text-center">
                  <div className="text-[8px] font-black uppercase text-cyan-300">Inn {row.inning}</div>
                  <div className="mt-1 text-[10px] font-black text-white">{num(row.avg_runs).toFixed(2)} R</div>
                  <div className="text-[9px] text-slate-500">{num(row.avg_hits).toFixed(2)} H</div>
                </div>)}
                {!list(advancedAnalytics.inning_analytics.innings).length ? <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-[10px] text-slate-500">Inning averages appear after Game Book data is recorded.</div> : null}
              </div>
            </div>
          </Card> : null}
          <InteractiveStatsBoard rows={scopedStats} scope={statsScope} onScope={setStatsScope} managerView={managerView} onAdd={() => setStatDrawer(true)} />
        </div> : null}

        {tab === "Dues" ? <div className="grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
          <Card
            title={managerView ? "Team collections" : "My dues"}
            body={managerView ? "Managers see team totals and can edit charges. Players only see their own balance." : "Your private team balance and payment status."}
            action={managerView ? <button type="button" disabled={quickSaving.dues} onClick={sendUnpaidReminders} className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-amber-300/20 bg-amber-300/10 px-2.5 text-[8px] font-black text-amber-100"><Bell className="h-3.5 w-3.5" />{quickSaving.dues ? "Sending…" : "Remind unpaid"}</button> : <CircleDollarSign className="h-4 w-4 text-amber-300" />}
          >
            {managerView ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Team outstanding" value={money(managerOutstanding)} sub={`${managerDueCount} open charge${managerDueCount === 1 ? "" : "s"}`} />
                  <Stat label="Per player now" value={money(fees.filter((fee) => fee.is_active !== false).reduce((sum, fee) => sum + num(fee.amount_cents), 0))} sub="Active fees combined" />
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/15">
                  <table className="min-w-[720px] w-full border-collapse text-[9px]">
                    <thead><tr className="border-b border-white/10 text-slate-500">
                      <th className="sticky left-0 z-10 bg-[#07111f] px-3 py-2 text-left">PLAYER</th>
                      {fees.filter((fee)=>fee.is_active!==false).map((fee)=><th key={fee.id} className="min-w-[8rem] px-2 py-2 text-center"><button type="button" onClick={()=>openFeeEditor(fee)} className="font-black text-cyan-200">{fee.title}</button><div className="font-normal text-slate-600">{money(fee.amount_cents)}</div></th>)}
                      <th className="min-w-[7rem] px-2 py-2 text-right">DUE</th>
                    </tr></thead>
                    <tbody>
                      {players.map((player)=>{
                        const playerRows=assignments.filter((row)=>Number(row.player)===Number(player.id));
                        const totalDue=playerRows.reduce((sum,row)=>sum+Math.max(0,num(row.amount_cents)-num(row.amount_paid_cents)),0);
                        return <tr key={player.id} className="border-b border-white/5 last:border-0">
                          <td className="sticky left-0 z-10 bg-[#07111f] px-3 py-2 font-black text-white">#{player.jersey_number || "—"} {player.display_name}</td>
                          {fees.filter((fee)=>fee.is_active!==false).map((fee)=>{
                            const row=playerRows.find((item)=>Number(item.fee)===Number(fee.id));
                            if(!row)return <td key={fee.id} className="px-2 py-2 text-center text-slate-700">—</td>;
                            const settled=["PAID","WAIVED"].includes(row.status);
                            const partial=row.status==="PARTIAL";
                            return <td key={fee.id} className="px-1.5 py-1.5 text-center">
                              <select value={row.status} onChange={(event)=>quickUpdateAssignment(row,{status:event.target.value})} className={cx("h-8 w-full rounded-lg border px-1 text-[8px] font-black", settled ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : partial ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-rose-300/25 bg-rose-300/10 text-rose-100")}>
                                <option value="DUE">UNPAID</option><option value="PARTIAL">PARTIAL</option><option value="PAID">PAID</option><option value="WAIVED">WAIVED</option>
                              </select>
                            </td>;
                          })}
                          <td className={cx("px-3 py-2 text-right font-black",totalDue>0?"text-rose-200":"text-emerald-200")}>{money(totalDue)}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                {fees.filter((fee) => fee.is_active !== false).map((fee) => {
                  const rows = assignments.filter((row) => Number(row.fee) === Number(fee.id));
                  const paid = rows.filter((row) => ["PAID", "WAIVED"].includes(row.status)).length;
                  const feeOutstanding = rows.reduce((sum, row) => sum + Math.max(0, num(row.amount_cents) - num(row.amount_paid_cents)), 0);
                  return (
                    <section key={fee.id} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <b className="block truncate text-xs text-white">{fee.title}</b>
                          <div className="mt-0.5 text-[9px] text-slate-500">
                            {money(fee.amount_cents)} per player · {rows.length} assigned{fee.due_date ? ` · due ${new Date(`${fee.due_date}T12:00:00`).toLocaleDateString()}` : ""}
                          </div>
                          <div className="mt-1 text-[11px] font-black text-amber-100">Team due: {money(feeOutstanding)}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Pill tone={paid === rows.length && rows.length ? "green" : "amber"}>{paid}/{rows.length} settled</Pill>
                          <button
                            type="button"
                            onClick={() => openFeeEditor(fee)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                            aria-label={`Edit ${fee.title}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        {rows.map((row) => (
                          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_6rem_5.6rem] items-center gap-1.5 rounded-lg bg-black/15 p-2">
                            <span className="truncate text-[10px] text-slate-300">{row.player_detail?.display_name}</span>
                            <select value={row.status} onChange={(event) => quickUpdateAssignment(row, { status: event.target.value })} className="h-8 rounded-lg border border-white/10 bg-[#050b14] px-1 text-[9px]">
                              <option value="DUE">Due</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option><option value="WAIVED">Waived</option>
                            </select>
                            <select value={row.payment_method || ""} onChange={(event) => quickUpdateAssignment(row, { payment_method: event.target.value })} className="h-8 rounded-lg border border-white/10 bg-[#050b14] px-1 text-[9px]">
                              <option value="">Method</option><option>Cash</option><option>Cash App</option><option>Venmo</option><option>Stripe</option><option>Other</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
                {!fees.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-xs text-slate-500">No team fees yet.</div> : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3">
                  <div className="text-[8px] font-black uppercase tracking-[.14em] text-amber-300">Total amount due</div>
                  <div className="mt-1 text-2xl font-black text-white">{money(ownDue)}</div>
                </div>
                {visibleAssignments.map((row) => (
                  <section key={row.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                    <div className="flex justify-between gap-2">
                      <div><b className="text-xs text-white">{row.fee_detail?.title}</b><div className="text-[9px] text-slate-500">{row.fee_detail?.description}</div></div>
                      <Pill tone={row.status === "PAID" || row.status === "WAIVED" ? "green" : "amber"}>{row.status}</Pill>
                    </div>
                    <div className="mt-2 text-lg font-black text-white">{money(Math.max(0, num(row.amount_cents) - num(row.amount_paid_cents)))}</div>
                    {["DUE", "PARTIAL"].includes(row.status) ? <div className="mt-2 grid grid-cols-3 gap-1.5">{paymentSettings?.cash_app_url ? <a href={paymentSettings.cash_app_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-center text-[9px] font-black">Cash App</a> : null}{paymentSettings?.venmo_url ? <a href={paymentSettings.venmo_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-center text-[9px] font-black">Venmo</a> : null}{paymentSettings?.stripe_url ? <a href={paymentSettings.stripe_url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-center text-[9px] font-black">Stripe</a> : null}</div> : null}
                  </section>
                ))}
                {!visibleAssignments.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-xs text-slate-500">No dues assigned to your linked player account.</div> : null}
              </div>
            )}
          </Card>
          {managerView ? (
            <div className="space-y-3">
              <Card title="Add fee" body="Creates a private per-player charge for every active roster player.">
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Name" value={feeForm.title} onChange={(value) => setFeeForm((v) => ({ ...v, title: value }))} />
                  <Input label="Per player $" value={feeForm.amount} onChange={(value) => setFeeForm((v) => ({ ...v, amount: value }))} />
                  <Input label="Due date" type="date" value={feeForm.due_date} onChange={(value) => setFeeForm((v) => ({ ...v, due_date: value }))} className="col-span-2" />
                  <Input label="Note" value={feeForm.description} onChange={(value) => setFeeForm((v) => ({ ...v, description: value }))} className="col-span-2" />
                </div>
                <Btn primary className="mt-2 w-full" onClick={addFee} disabled={!feeForm.title.trim() || !feeForm.amount || busy}><Plus className="mr-1 inline h-4 w-4" />Create & assign</Btn>
              </Card>
              <Card title="Payment links" body="Paste the team's Cash App, Venmo or Stripe payment link. No SyncWorks checkout is turned on yet.">
                <div className="space-y-2"><Input label="Cash App URL" value={payForm.cash_app_url} onChange={(value) => setPayForm((v) => ({ ...v, cash_app_url: value }))} /><Input label="Venmo URL" value={payForm.venmo_url} onChange={(value) => setPayForm((v) => ({ ...v, venmo_url: value }))} /><Input label="Stripe URL" value={payForm.stripe_url} onChange={(value) => setPayForm((v) => ({ ...v, stripe_url: value }))} /><Input label="Payment note" value={payForm.payment_note} onChange={(value) => setPayForm((v) => ({ ...v, payment_note: value }))} /></div>
                <Btn primary className="mt-2 w-full" onClick={savePayments}><WalletCards className="mr-1 inline h-4 w-4" />Save links</Btn>
              </Card>
            </div>
          ) : null}
        </div> : null}
      </main>

      <SportsTeamMobileNav
        groupId={groupId}
        nextGameId={liveGame?.id || nextGame?.id || null}
        activeTab={tab}
      />

      {teamInviteOpen && managerView ? <Drawer title="Invite players to the team" onClose={()=>setTeamInviteOpen(false)}><div className="space-y-3"><p className="text-sm text-slate-300">Share this one link with players and fans. Players enter the team password; fans follow live scores and opt into GameCast emails without a password.</p>{teamInviteLoading ? <div className="flex items-center gap-2 text-xs text-cyan-200"><Loader2 className="h-4 w-4 animate-spin" />Creating invite link…</div> : teamInviteUrl ? <><input aria-label="Shared team invite URL" readOnly value={teamInviteUrl} onClick={(event)=>event.currentTarget.select()} onFocus={(event)=>event.currentTarget.select()} className="min-h-12 w-full rounded-xl border border-cyan-300/25 bg-black/20 px-3 text-xs text-cyan-100" /><div className="grid grid-cols-2 gap-2"><Btn onClick={()=>copyInviteUrl(teamInviteUrl)}><Copy className="mr-1 inline h-4 w-4" />Copy link</Btn><Btn primary onClick={()=>shareInviteUrl(teamInviteUrl, group.name)}><Share2 className="mr-1 inline h-4 w-4" />Share invite</Btn></div></> : <Btn onClick={()=>{setTeamInviteOpen(false);openTeamInvites();}}>Retry</Btn>}{shareStatus ? <p className="rounded-xl border border-cyan-300/15 bg-cyan-300/10 p-3 text-xs text-cyan-100">{shareStatus}</p> : null}<p className="text-xs leading-5 text-slate-400">Already on the paper roster? Send that player a personal invite using their account email to connect the existing record without duplicating it.</p></div></Drawer> : null}

      {addPlayerOpen && managerView ? (
        <Drawer title="Add player" onClose={() => setAddPlayerOpen(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input label="Name" value={newPlayer.display_name} onChange={(value) => setNewPlayer((v) => ({ ...v, display_name: value }))} className="col-span-2" />
              <Input label="Jersey #" value={newPlayer.jersey_number} onChange={(value) => setNewPlayer((v) => ({ ...v, jersey_number: value }))} />
              <Select label="Position" value={newPlayer.primary_position} onChange={(value) => setNewPlayer((v) => ({ ...v, primary_position: value }))}><option value="">Choose</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</Select>
              <Input label="Email" value={newPlayer.email} onChange={(value) => setNewPlayer((v) => ({ ...v, email: value }))} />
              <Input label="Phone" value={newPlayer.phone} onChange={(value) => setNewPlayer((v) => ({ ...v, phone: value }))} />
            </div>
            <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-3 text-[9px] text-violet-100">Add an email now so you can link the player to an existing SyncWorks account and send an invite from the roster.</div>
            <Btn primary className="w-full" onClick={addPlayer} disabled={!newPlayer.display_name.trim() || busy}><Plus className="mr-1 inline h-4 w-4" />Add player</Btn>
          </div>
        </Drawer>
      ) : null}

      {feeEdit && managerView ? (
        <Drawer title="Edit team fee" onClose={() => setFeeEdit(null)}>
          <div className="space-y-3">
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-3 text-[10px] text-cyan-100">
              This changes the per-player charge for unpaid roster assignments. Paid or waived history is preserved.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Fee name" value={feeEdit.title} onChange={(value) => setFeeEdit((v) => ({ ...v, title: value }))} />
              <Input label="Per player $" value={feeEdit.amount} onChange={(value) => setFeeEdit((v) => ({ ...v, amount: value }))} />
              <Input label="Due date" type="date" value={feeEdit.due_date} onChange={(value) => setFeeEdit((v) => ({ ...v, due_date: value }))} className="col-span-2" />
              <Input label="Note" value={feeEdit.description} onChange={(value) => setFeeEdit((v) => ({ ...v, description: value }))} className="col-span-2" />
            </div>
            <Btn primary className="w-full" onClick={saveFeeEdit} disabled={busy || !feeEdit.title.trim()}><Save className="mr-1 inline h-4 w-4" />Save fee</Btn>
          </div>
        </Drawer>
      ) : null}

      {chatOpen ? <Drawer title="Team chat" onClose={() => setChatOpen(false)}><TeamChatPanel groupId={group.id} userId={userId} canManage={managed} bare /></Drawer> : null}

      {playerDrawer && playerEdit ? <Drawer title={playerDrawer.display_name} onClose={() => { setPlayerDrawer(null); setPlayerEdit(null); setPhotoFile(null); }}><div className="space-y-3">{drawerBadgeLoading ? <div className="flex items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-3 text-xs text-cyan-100"><Loader2 className="h-4 w-4 animate-spin"/>Loading player achievement card…</div> : drawerBadgeCard ? <><PlayerCollectibleCard player={playerDrawer} profile={profileFor(playerDrawer)} progress={drawerBadgeCard} teamName={group?.name} /><details className="rounded-xl border border-white/10 bg-white/[.02] p-2"><summary className="cursor-pointer px-2 py-2 text-xs font-black text-slate-200">Year, month and league stats</summary><PlayerStatSplits progress={drawerBadgeCard}/></details></> : null}<div className="flex items-center gap-3"><Avatar player={playerDrawer} profile={profileFor(playerDrawer)} size="lg" /><div><b className="text-white">#{playerDrawer.jersey_number || "—"} {playerDrawer.display_name}</b><div className="mt-1 text-[10px] text-slate-500">{playerDrawer.primary_position || "Position TBD"}{playerDrawer.user ? " · linked SyncWorks account" : " · manual roster entry"}</div></div></div>{managerView ? <><div className="grid grid-cols-2 gap-2"><Input label="Name" value={playerEdit.display_name} onChange={(value) => setPlayerEdit((v) => ({ ...v, display_name: value }))} className="col-span-2" /><Input label="Jersey #" value={playerEdit.jersey_number} onChange={(value) => setPlayerEdit((v) => ({ ...v, jersey_number: value }))} /><Select label="Position" value={playerEdit.primary_position} onChange={(value) => setPlayerEdit((v) => ({ ...v, primary_position: value }))}><option value="">Choose</option>{POSITIONS.map((position) => <option key={position}>{position}</option>)}</Select><Input label="Email" value={playerEdit.email} onChange={(value) => setPlayerEdit((v) => ({ ...v, email: value }))} /><Input label="Phone" value={playerEdit.phone} onChange={(value) => setPlayerEdit((v) => ({ ...v, phone: value }))} /><Input label="Emergency contact" value={playerEdit.emergency_contact_name} onChange={(value) => setPlayerEdit((v) => ({ ...v, emergency_contact_name: value }))} /><Input label="Emergency phone" value={playerEdit.emergency_contact_phone} onChange={(value) => setPlayerEdit((v) => ({ ...v, emergency_contact_phone: value }))} /></div><label className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-xs font-black text-slate-300"><Camera className="h-4 w-4" />{photoFile ? photoFile.name : "Choose profile photo"}<input type="file" accept="image/*" className="hidden" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} /></label><label className="block"><span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-500">Manager notes</span><textarea rows={3} value={playerEdit.notes} onChange={(event) => setPlayerEdit((v) => ({ ...v, notes: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs" /></label><div className="grid grid-cols-2 gap-2"><Btn primary onClick={savePlayer} disabled={busy}><Save className="mr-1 inline h-4 w-4" />Save player</Btn><Btn danger onClick={archivePlayer}><Trash2 className="mr-1 inline h-4 w-4" />Archive player</Btn></div>
        {managerView && drawerBadgeCard ? <section className="space-y-3 rounded-xl border border-violet-300/20 bg-violet-300/[.04] p-3">
          <div><b className="text-xs font-black text-violet-100">Verified Speed & Clutch moments</b><p className="mt-1 text-[10px] leading-4 text-slate-400">Scorekeeper or manager can record a real baserunning moment or late tying/go-ahead RBI hit after the official Game Book is final. The system validates the game and play, and badges unlock automatically.</p></div>
          <Select label="Finalized game" value={momentGameId} onChange={setMomentGameId}><option value="">Select completed game</option>{games.filter((game)=>game.status==="FINAL").map((game)=><option key={game.id} value={game.id}>{new Date(game.start_at).toLocaleDateString()} · vs {game.opponent_name}</option>)}</Select>
          <Select label="Verified moment" value={momentKind} onChange={setMomentKind}>
            <option value="">Choose achievement</option>
            <option value="EXTRA_BASE">Speed · Took an extra base</option>
            <option value="STEAL">Speed · Successful steal (where allowed)</option>
            <option value="TYING_HIT">Clutch · Late tying RBI hit</option>
            <option value="GO_AHEAD_HIT">Clutch · Late go-ahead RBI hit</option>
          </Select>
          <Btn primary className="w-full" disabled={!momentGameId || !momentKind || momentBusy} onClick={verifyDrawerMoment}>{momentBusy ? "Saving…" : "Verify earned achievement"}</Btn>
          {error ? <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-100">{error}</div> : null}
          {notice ? <div role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-xs text-emerald-100">{notice}</div> : null}
          {(drawerBadgeCard.verified_moments||[]).length ? <div className="space-y-1"><b className="block text-[10px] font-black text-slate-200">Recent verified moments</b>{drawerBadgeCard.verified_moments.map((item)=><div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 p-2"><span className="text-[10px] text-slate-300">{item.kind.replaceAll("_"," ")} · {item.date} vs {item.opponent_name}</span><Btn danger disabled={momentBusy} onClick={()=>removeDrawerMoment(item)}>Undo</Btn></div>)}</div> : null}
        </section> : null}
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.035] p-3">
          <b className="block text-xs text-amber-100">Duplicate or incorrect player?</b>
          <p className="mt-1 text-[10px] leading-5 text-slate-400">Merge moves scores, historical statistics and non-conflicting dues to another player. An archived copy is retained for historical game lineups.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn onClick={()=>{setMergeSourcePlayer(playerDrawer);setMergeTargetId("");setPlayerDrawer(null);setPlayerEdit(null);}}>Merge into…</Btn>
            <Btn danger disabled={busy} onClick={deleteEmptyPlayer}>Delete empty card</Btn>
          </div>
        </div></> : <div className="space-y-2">{profileFor(playerDrawer)?.email ? <div className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-xs"><Mail className="h-4 w-4 text-cyan-300" />{profileFor(playerDrawer).email}</div> : null}{profileFor(playerDrawer)?.phone ? <div className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-xs"><Phone className="h-4 w-4 text-cyan-300" />{profileFor(playerDrawer).phone}</div> : null}<div className="rounded-xl border border-white/10 p-3 text-xs text-slate-400">Player contact information is private unless this is your own linked profile.</div></div>}</div></Drawer> : null}

      {mergeSourcePlayer && managerView ? <Drawer title={`Merge ${mergeSourcePlayer.display_name}`} onClose={()=>{setMergeSourcePlayer(null);setMergeTargetId("");}}>
        <div className="space-y-3">
          <p className="text-xs leading-5 text-slate-300">Select the player record to keep. Game plays and manually entered statistics will move to that player; the duplicate card will be archived with an audit trail.</p>
          <label className="block text-xs font-black text-white">Surviving player
            <select value={mergeTargetId} onChange={(event)=>setMergeTargetId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#050b14] px-3 text-xs text-white">
              <option value="">Select the player to keep</option>
              {players.filter((row)=>row.id !== mergeSourcePlayer.id).map((row)=><option key={row.id} value={row.id}>#{row.jersey_number || "—"} {row.display_name}{row.user ? " · linked" : ""}</option>)}
            </select>
          </label>
          <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-[11px] leading-5 text-amber-100">If both records have the same fee with payments, the system stops the merge so those payments can be reconciled. Historical lineup conflicts remain archived instead of silently disappearing.</p>
          <Btn primary className="w-full" disabled={!mergeTargetId || busy} onClick={mergeDuplicatePlayer}>Merge player records</Btn>
        </div>
      </Drawer> : null}

      {statDrawer ? <Drawer title="Add historical stats" onClose={() => setStatDrawer(false)}><div className="space-y-3"><div className="grid grid-cols-2 gap-2"><Select label="Player" value={statForm.player} onChange={(value) => setStatForm((v) => ({ ...v, player: value }))} className="col-span-2"><option value="">Choose player</option>{players.map((player) => <option key={player.id} value={player.id}>#{player.jersey_number || "—"} {player.display_name}</option>)}</Select><Select label="Bucket" value={statForm.scope} onChange={(value) => setStatForm((v) => ({ ...v, scope: value }))}><option value="LEAGUE">League</option><option value="TOURNAMENT">Tournament</option><option value="OTHER">Other</option></Select><Input label="Games" value={statForm.games} onChange={(value) => setStatForm((v) => ({ ...v, games: value }))} />{[["pa","PA"],["ab","AB"],["hits","H"],["doubles","2B"],["triples","3B"],["home_runs","HR"],["walks","BB"],["sac_flies","SF"],["rbi","RBI"],["runs","R"]].map(([key, label]) => <Input key={key} label={label} value={statForm[key]} onChange={(value) => setStatForm((v) => ({ ...v, [key]: value }))} />)}<Input label="Note" value={statForm.note} onChange={(value) => setStatForm((v) => ({ ...v, note: value }))} className="col-span-2" /></div><div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-[9px] text-amber-100">Manual history stays auditable and is added to Game Book statistics. It is never rewritten as if SyncWorks scored those games live.</div><Btn primary className="w-full" onClick={saveStatEntry} disabled={!statForm.player || busy}><Check className="mr-1 inline h-4 w-4" />Add to stats</Btn></div></Drawer> : null}
    </div>
  );
}

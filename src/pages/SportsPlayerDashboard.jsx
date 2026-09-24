import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, Camera, Check, CircleDollarSign, Edit3, ExternalLink,
  Loader2, MapPin, MessageCircle, Save, Trophy, WalletCards, X,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import TeamChatPanel from "../components/sports/TeamChatPanel";
import SportsTeamMobileNav from "../components/sports/SportsTeamMobileNav";
import PlayerCollectibleCard, { SportsPlayerPhoto } from "../components/sports/PlayerCollectibleCard";
import PlayerStatSplits from "../components/sports/PlayerStatSplits";
import WeeklyAvailabilityCard from "../components/sports/WeeklyAvailabilityCard";
import UpcomingGameDayCard, { firstUpcomingGameDay } from "../components/sports/UpcomingGameDayCard";
import PracticeModeCard from "../components/sports/PracticeModeCard";
import PlayerBookAuditCard from "../components/sports/PlayerBookAuditCard";
import { useAuth } from "../auth/AuthContext";
import { createEventResponse, updateEventResponse } from "../api/social";
import {
  createPlayerProfile, getPlayerCard, getPlayerBadgeCard, getPlayerBookAudit, getPlayerCenter, getSportsTeams, joinMySportsTeamRoster,
  updatePlayerProfile, updateSportsPlayer,
} from "../api/sports";

const TABS = ["Home", "My Player", "Practice", "Team", "League", "Dues"];
const TEAM_TAB_ALIAS = { Schedule: "Home", Stats: "My Player", Roster: "Team" };
const cx = (...v) => v.filter(Boolean).join(" ");
const num = (v) => Number(v || 0);
const money = (v) => (num(v) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (v) => num(v).toFixed(3).replace(/^0(?=\.)/, "");
const errText = (e) => e?.response?.data?.detail || Object.values(e?.response?.data || {})?.flat?.()?.[0] || e?.message || "Something went wrong.";

function Btn({ children, onClick, primary, disabled, className = "" }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={cx(
    "min-h-10 rounded-xl px-3 text-[10px] font-black transition active:scale-[.98] disabled:opacity-40",
    primary ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[.035] text-slate-200",
    className,
  )}>{children}</button>;
}

function Card({ title, body, action, children, className = "" }) {
  return <section className={cx("rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-3.5", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="text-sm font-black text-white">{title}</h2>{body ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{body}</p> : null}</div>
      {action}
    </div>
    <div className="mt-3">{children}</div>
  </section>;
}

function Metric({ label, value, tone = "cyan", sub }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[.045]",
    green: "border-emerald-300/15 bg-emerald-300/[.045]",
    violet: "border-violet-300/15 bg-violet-300/[.045]",
    amber: "border-amber-300/15 bg-amber-300/[.045]",
  };
  return <div className={cx("rounded-xl border p-2.5", tones[tone] || "border-white/10")}>
    <div className="text-[7px] font-black uppercase tracking-[.13em] text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-black text-white">{value}</div>
    {sub ? <div className="text-[8px] text-slate-500">{sub}</div> : null}
  </div>;
}

function Drawer({ title, onClose, children }) {
  return <div className="fixed inset-0 z-[120] flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center" onMouseDown={onClose}>
    <section onMouseDown={(e)=>e.stopPropagation()} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.7rem] border border-white/10 bg-[#06101d] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-xl sm:rounded-[1.7rem]">
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-[#06101d]/95 pb-2">
        <div><div className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">Player center</div><h2 className="mt-1 text-lg font-black text-white">{title}</h2></div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10"><X className="h-4 w-4"/></button>
      </div>
      {children}
    </section>
  </div>;
}

function RateLine({ row }) {
  return <div className="grid grid-cols-4 gap-1.5">
    <Metric label="AVG" value={pct(row?.avg)} />
    <Metric label="OBP" value={pct(row?.obp)} tone="green" />
    <Metric label="SLG" value={pct(row?.slg)} tone="violet" />
    <Metric label="OPS" value={pct(row?.ops)} tone="amber" />
  </div>;
}

export default function SportsPlayerDashboard() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState(() => TEAM_TAB_ALIAS[searchParams.get("tab")] || "Home");
  const [team, setTeam] = useState(null);
  const [center, setCenter] = useState(null);
  const [playerCard, setPlayerCard] = useState(null);
  const [badgeCard, setBadgeCard] = useState(null);
  const [bookAudit, setBookAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [joiningRoster, setJoiningRoster] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [form, setForm] = useState({
    display_name:"", primary_position:"", bats:"", throws:"",
    email:"", phone:"", date_of_birth:"", show_age_to_team:false, emergency_contact_name:"", emergency_contact_phone:"",
    card_style:"CLASSIC", card_nickname:"", card_photo_position:50,
  });

  const player = center?.player;
  const profile = center?.profile;
  const stats = center?.player_stats?.all || {};
  const leagueStats = center?.player_stats?.league || {};
  const tournamentStats = center?.player_stats?.tournament || {};
  const nextGame = center?.next_game;
  const response = center?.next_game_response?.response || "PENDING";
  const teamRows = Array.isArray(center?.team_player_stats) ? center.team_player_stats : [];
  const leagueRows = Array.isArray(center?.league?.standings) ? center.league.standings : [];
  const dues = Array.isArray(center?.dues) ? center.dues : [];
  const dueCount = dues.filter((row)=>["DUE","PARTIAL"].includes(row.status)).length;
  const lineupSpot = nextGame?.lineup_spots?.find((spot)=>Number(spot.player)===Number(player?.id));
  const weeklyGameRows = Array.isArray(center?.weekly_availability?.games) ? center.weekly_availability.games : [];
  const nextGameDayRows = Array.isArray(center?.next_game_day) && center.next_game_day.length ? center.next_game_day : weeklyGameRows;
  const nextDayGames = firstUpcomingGameDay(nextGameDayRows.map((row)=>row.game).filter((game)=>game?.status==="SCHEDULED"||game?.status==="LIVE"));
  const weeklyResponseMap = Object.fromEntries(nextGameDayRows.map((row)=>[String(row.game?.id), row.my_response?.response || "PENDING"]));

  const teamOpsRank = useMemo(() => {
    if (!player) return null;
    const rows = [...teamRows].sort((a,b)=>num(b.ops)-num(a.ops)||num(b.avg)-num(a.avg));
    const index = rows.findIndex((row)=>Number(row.player?.id)===Number(player.id));
    return index >= 0 ? index + 1 : null;
  }, [teamRows, player?.id]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const teams = await getSportsTeams();
      const found = teams.find((row)=>Number(row.group)===Number(groupId));
      if (!found) throw new Error("This group does not have Sports enabled.");
      setTeam(found);
      const data = await getPlayerCenter(found.id);
      setCenter(data);
      if (data.player?.id) {
        const [oldCard, newCard, audit] = await Promise.allSettled([getPlayerCard(data.player.id), getPlayerBadgeCard(data.player.id), getPlayerBookAudit(data.player.id)]);
        setPlayerCard(oldCard.status === "fulfilled" ? oldCard.value : null);
        setBadgeCard(newCard.status === "fulfilled" ? newCard.value : null);
        setBookAudit(audit.status === "fulfilled" ? audit.value : null);
      } else {
        setPlayerCard(null);
        setBadgeCard(null);
        setBookAudit(null);
      }
      const p = data.player || {};
      const pr = data.profile || {};
      setForm({
        display_name:p.display_name || "",
        primary_position:p.primary_position || "",
        bats:p.bats || "",
        throws:p.throws || "",
        email:pr.email || user?.email || "",
        phone:pr.phone || "",
        date_of_birth:pr.date_of_birth || "",
        show_age_to_team:pr.show_age_to_team === true,
        emergency_contact_name:pr.emergency_contact_name || "",
        emergency_contact_phone:pr.emergency_contact_phone || "",
        card_style:pr.card_style || "CLASSIC",
        card_nickname:pr.card_nickname || "",
        card_photo_position:pr.card_photo_position ?? 50,
      });
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [groupId]);

  useEffect(() => {
    const requested = TEAM_TAB_ALIAS[searchParams.get("tab")];
    if (requested) setTab((current) => current === requested ? current : requested);
  }, [searchParams]);


  async function addMyselfToRoster() {
    if (!team?.id || joiningRoster) return;
    setJoiningRoster(true);
    setError("");
    setNotice("");
    try {
      const result = await joinMySportsTeamRoster(team.id);
      setNotice(result.matched_existing
        ? "Your existing player card and stats are now linked to your account."
        : "Your player card has been created. Your coach can now set your jersey and position.");
      setTab("My Player");
      await refresh();
    } catch (e) {
      setError(errText(e));
    } finally {
      setJoiningRoster(false);
    }
  }

  async function respondGame(game, value) {
    if (!game?.social_event) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const weeklyRow = nextGameDayRows.find((row)=>Number(row.game?.id)===Number(game.id));
      if (weeklyRow?.my_response?.id) await updateEventResponse(weeklyRow.my_response.id, value);
      else await createEventResponse({ event:Number(game.social_event), group:Number(groupId), response:value });
      setNotice(value==="YES" ? "You’re IN for this game." : value==="NO" ? "You’re OUT for this game." : "You’re marked as a SUB for this game.");
      await refresh();
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }

  async function respond(value) {
    if (!nextGame?.social_event) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (center?.next_game_response?.id) await updateEventResponse(center.next_game_response.id, value);
      else await createEventResponse({ event:Number(nextGame.social_event), group:Number(groupId), response:value });
      setNotice(value==="YES" ? "You’re IN." : value==="NO" ? "You’re OUT." : "You’re marked as a SUB.");
      await refresh();
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }

  async function saveProfile() {
    if (!player) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await updateSportsPlayer(player.id, {
        display_name:form.display_name,
        primary_position:form.primary_position,
        bats:form.bats,
        throws:form.throws,
      });
      const data = new FormData();
      data.append("player", String(player.id));
      data.append("email", form.email || "");
      data.append("phone", form.phone || "");
      data.append("date_of_birth", form.date_of_birth || "");
      data.append("show_age_to_team", form.show_age_to_team ? "true" : "false");
      data.append("emergency_contact_name", form.emergency_contact_name || "");
      data.append("emergency_contact_phone", form.emergency_contact_phone || "");
      data.append("card_style", form.card_style || "CLASSIC");
      data.append("card_nickname", form.card_nickname || "");
      data.append("card_photo_position", String(form.card_photo_position ?? 50));
      if (photoFile) data.append("profile_photo", photoFile);
      if (profile?.id) await updatePlayerProfile(profile.id, data);
      else await createPlayerProfile(data);
      setPhotoFile(null);
      setProfileOpen(false);
      setNotice("Player profile updated.");
      await refresh();
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  }

  function directionsUrl() {
    const q = [nextGame?.venue_name,nextGame?.address_line1,nextGame?.city,nextGame?.state].filter(Boolean).join(", ");
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(q);
  }

  function openCalendar() {
    const date = nextGame?.start_at ? String(nextGame.start_at).slice(0,10) : "";
    navigate(date ? "/calendar?date=" + date : "/calendar");
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#02060c] text-white" aria-label="Loading player dashboard"><Loader2 className="h-7 w-7 animate-spin text-cyan-300"/></div>;

  if (!team || !center) return <div className="min-h-screen bg-[#02060c] p-3 text-white"><ModeBar sportsCompact title="Player" subtitle="SyncWorks Social"/><Card title="Team unavailable"><div className="text-xs text-slate-500">{error || "This team could not be loaded."}</div><Btn className="mt-3" onClick={()=>navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4"/>Back to Social</Btn></Card></div>;

  if (!player) return <div className="min-h-screen bg-[#02060c] pb-28 text-white">
    <ModeBar sportsCompact title={team.group_name || "Team"} subtitle="SyncWorks Sports" />
    <main className="mx-auto max-w-xl space-y-3 px-3 py-4">
      <Btn onClick={()=>navigate("/connect/groups/"+groupId)}><ArrowLeft className="mr-1 inline h-4 w-4"/>Back to my group</Btn>
      {error ? <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-100">{error}</div> : null}
      <section className="rounded-[1.6rem] border border-cyan-300/25 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,.16),transparent_60%),#07111f] p-5">
        <div className="mb-3 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-100">Team membership active</div>
        <h1 className="text-xl font-black text-white">Welcome to {team.group_name || "your team"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Your group invitation is accepted. Connect your player profile to unlock your card, earned badges, team schedule, availability, lineup and stats.</p>
        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3 text-xs leading-5 text-amber-100">
          <b>Already on the roster?</b> We match your SyncWorks account email to the player card your coach entered, keeping its jersey and stats. If it uses a different email, ask your coach to use Link account first to avoid a duplicate player.
        </div>
        <button type="button" disabled={joiningRoster} onClick={addMyselfToRoster} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950 disabled:opacity-50">{joiningRoster ? <><Loader2 className="h-4 w-4 animate-spin"/>Connecting your card…</> : "Connect my player card"}</button>
        <Btn className="mt-2 w-full" onClick={()=>navigate("/connect/groups/"+groupId)}>View group updates &amp; chat</Btn>
      </section>
    </main>
  </div>;

  return <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
    <ModeBar sportsCompact title="Player" subtitle="SyncWorks Social"/>
    <main className="mx-auto max-w-6xl space-y-3 px-3 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-2"><Btn onClick={()=>navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4"/>Groups</Btn><Btn onClick={()=>setChatOpen(true)}><MessageCircle className="mr-1 inline h-4 w-4"/>Team chat</Btn></div>
      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2.5 text-[10px] text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2.5 text-[10px] text-emerald-100">{notice}</div> : null}

      <section className="relative overflow-hidden rounded-[1.8rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_84%_0%,rgba(34,211,238,.19),transparent_31%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.17),transparent_35%),linear-gradient(145deg,#07111f,#081321_60%,#0d1020)] p-4" style={badgeCard?.achieved_count ? { borderColor: badgeCard.card_border, boxShadow: `0 0 18px ${badgeCard.card_border}38` } : {}}>
        <div className="absolute -right-8 top-5 text-[7rem] font-black leading-none text-white/[.025]">#{player.jersey_number || "—"}</div>
        <div className="relative flex items-start gap-3">
          <button type="button" onClick={()=>setProfileOpen(true)} className="relative shrink-0"><SportsPlayerPhoto player={player} profile={profile} size="lg"/><span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-cyan-200/30 bg-cyan-300 text-slate-950"><Camera className="h-3.5 w-3.5"/></span></button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[8px] font-black uppercase text-cyan-100">{team.sport}</span><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[8px] font-black uppercase text-emerald-100">SyncWorks linked</span></div>
            <h1 className="mt-2 truncate text-xl font-black text-white">{player.display_name}</h1>
            <div className="mt-1 text-[10px] text-slate-400">#{player.jersey_number || "—"} · {player.primary_position || "Position TBD"} · {team.group_name}</div>
            <div className="mt-1 text-[9px] text-slate-500">{[team.league_name,team.division_name,team.season_name].filter(Boolean).join(" · ")}</div>
            {teamOpsRank ? <div className="mt-2 inline-flex rounded-lg border border-violet-300/15 bg-violet-300/[.06] px-2 py-1 text-[8px] font-black text-violet-100">Team OPS rank #{teamOpsRank}</div> : null}
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-4 gap-1.5"><Metric label="AVG" value={pct(stats.avg)}/><Metric label="HR" value={num(stats.hr)} tone="violet"/><Metric label="RBI" value={num(stats.rbi)} tone="green"/><Metric label="OPS" value={pct(stats.ops)} tone="amber"/></div>
        <button type="button" onClick={()=>setTab("My Player")} className="relative mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/[.07] px-3 text-left text-xs font-bold text-amber-100"><span>View my collectible player card</span><span>{badgeCard?.achieved_count || 0}/4 badges earned →</span></button>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">{TABS.map((name)=><button key={name} type="button" onClick={()=>setTab(name)} className={cx("min-h-9 shrink-0 rounded-full px-3 text-[9px] font-black",tab===name?"bg-white text-slate-950":"border border-white/10 text-slate-400")}>{name}{name==="Dues"&&dueCount?<span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[7px] text-white">{dueCount}</span>:null}</button>)}</div>

      {tab==="Home" ? <div className="space-y-3">
        <UpcomingGameDayCard games={nextDayGames} responses={weeklyResponseMap} onRespond={respondGame} onOpen={(game)=>navigate(`/connect/groups/${groupId}/sports/games/${game.id}`)} />
        <WeeklyAvailabilityCard teamId={team.id} initialWeekStart={center?.weekly_availability?.week_start || ""} />
        <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-3">
          <Card title={nextGame?"First game details":"Schedule"} body={nextGame?"Lineup, route and calendar details for the first game on your next game day.":"No upcoming game has been published yet."} action={<CalendarDays className="h-4 w-4 text-emerald-300"/>}>
            {nextGame ? <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-300">{nextGame.status==="LIVE"?"LIVE NOW":new Date(nextGame.start_at).toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"})}</div><div className="mt-1 text-xl font-black text-white">vs {nextGame.opponent_name}</div><div className="mt-1 text-[10px] text-slate-400">{new Date(nextGame.start_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} · {nextGame.venue_name || "Field TBD"}</div><div className="mt-1 text-[9px] text-slate-500">{[nextGame.address_line1,nextGame.city,nextGame.state].filter(Boolean).join(", ")}</div></div>{lineupSpot?<div className="rounded-xl border border-violet-300/15 bg-violet-300/[.05] p-2 text-center"><div className="text-[7px] font-black uppercase text-violet-300">Lineup</div><div className="mt-1 text-lg font-black text-white">#{lineupSpot.batting_order}</div><div className="text-[8px] text-slate-500">{lineupSpot.defensive_position || "EH"}</div></div>:null}</div>
              {(nextGame.social_event_detail?.flyer_image_url || nextGame.social_event_detail?.flyer_url) ? <img src={nextGame.social_event_detail?.flyer_image_url || nextGame.social_event_detail?.flyer_url} alt="Game flyer" className="max-h-64 w-full rounded-2xl border border-white/10 object-cover"/> : null}
              
              <div className="grid grid-cols-2 gap-2"><a href={directionsUrl()} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/10 text-[9px] font-black text-slate-200"><MapPin className="h-3.5 w-3.5"/>Route</a><Btn onClick={openCalendar}><CalendarDays className="mr-1 inline h-3.5 w-3.5"/>Open calendar</Btn></div>
              <div className="text-[8px] leading-4 text-slate-600">Team games sync to your SyncWorks calendar while you’re IN, SUB or pending. Marking OUT removes the game from your active calendar.</div>
            </div> : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">Your manager or league will publish the next game here.</div>}
          </Card>
          <Card title="My season" body="Official Game Book statistics plus approved historical stats."><RateLine row={stats}/><div className="mt-2 grid grid-cols-4 gap-1.5"><Metric label="G" value={num(stats.g)}/><Metric label="H" value={num(stats.h)}/><Metric label="R" value={num(stats.runs)}/><Metric label="TB" value={num(stats.tb)}/></div></Card>
        </div>
        <div className="space-y-3"><button type="button" onClick={()=>setTab("Practice")} className="min-h-12 w-full rounded-xl border border-emerald-300/20 bg-emerald-300/[.07] px-3 text-left text-xs font-black text-emerald-100">Practice mode · Log BP & situations →</button><Card title="Team pulse" body={(center.record?.wins||0)+"-"+(center.record?.losses||0)+"-"+(center.record?.ties||0)+" record"}><div className="grid grid-cols-2 gap-2"><Metric label="Team AVG" value={pct(center.team_stats?.avg)}/><Metric label="Run diff" value={num(center.team_stats?.runs_for)-num(center.team_stats?.runs_against)} tone="green"/></div><div className="mt-2 grid grid-cols-2 gap-2"><Metric label="Runs" value={num(center.team_stats?.runs_for)}/><Metric label="Team HR" value={num(center.team_stats?.home_runs)} tone="violet"/></div></Card><Card title="My balance" body="Only your own team charges are visible here." action={<CircleDollarSign className="h-4 w-4 text-amber-300"/>}><div className="text-2xl font-black text-white">{money(center.balance_cents)}</div><div className="mt-1 text-[9px] text-slate-500">{dueCount?dueCount+" open item"+(dueCount===1?"":"s"):"Nothing due"}</div><Btn className="mt-3 w-full" onClick={()=>setTab("Dues")}>View dues</Btn></Card></div>
      </div></div> : null}

      {tab==="My Player" ? <div className="space-y-3">
        <div className="sticky top-[5.15rem] z-40 -mx-1 flex items-center justify-between gap-2 rounded-xl border border-cyan-300/25 bg-[#06101d]/95 p-2 shadow-xl backdrop-blur">
          <button type="button" onClick={()=>setTab("Home")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-cyan-100"><ArrowLeft className="h-4 w-4"/>Back to team</button>
          <button type="button" aria-label="Close player profile" onClick={()=>setTab("Home")} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100"><X className="h-5 w-5"/></button>
        </div>
        <div className="grid gap-3 lg:grid-cols-[.85fr_1.15fr]">
          <div className="space-y-3">
            <PlayerCollectibleCard player={player} profile={profile} progress={badgeCard} teamName={team.group_name} onEdit={()=>setProfileOpen(true)} />
            <Btn primary className="w-full" onClick={()=>setProfileOpen(true)}><Edit3 className="mr-1 inline h-4 w-4" />Customize my card</Btn>
          </div>
          <Card title="Stat profile" body="League, tournament and combined totals."><div className="space-y-3"><div><div className="mb-1 text-[8px] font-black uppercase tracking-[.13em] text-cyan-300">All games</div><RateLine row={stats}/></div><div><div className="mb-1 text-[8px] font-black uppercase tracking-[.13em] text-emerald-300">League</div><RateLine row={leagueStats}/></div><div><div className="mb-1 text-[8px] font-black uppercase tracking-[.13em] text-violet-300">Tournament</div><RateLine row={tournamentStats}/></div></div></Card>
        </div>
        <PlayerStatSplits progress={badgeCard} />
        <PlayerBookAuditCard audit={bookAudit} onOpenGame={(gameId)=>navigate(`/connect/groups/${groupId}/sports/games/${gameId}`)} />
        {(badgeCard?.milestones||[]).length ? <Card title="Career milestones" body="Automatically calculated from verified Game Books and approved historical stats.">
          <div className="grid gap-2 sm:grid-cols-3">{badgeCard.milestones.map((item)=><div key={item.key} className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3"><div className="text-[9px] font-black uppercase tracking-wide text-amber-200">{item.title}</div><div className="mt-1 text-xl font-black text-white">{item.value}</div><div className="text-[9px] text-slate-500">{item.unit}{item.next_goal ? ` · next ${item.next_goal}` : " · max tier reached"}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-amber-300" style={{width:`${item.progress}%`}}/></div></div>)}</div>
        </Card> : null}
        {(center?.awards||[]).length ? <Card title="Coach awards" body="Recognition given by your team staff.">
          <div className="grid gap-2 sm:grid-cols-2">{center.awards.map((award)=><div key={award.id} className="rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-3"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-300"/><b className="text-xs text-white">{award.title}</b></div><div className="mt-1 text-[9px] text-slate-500">{award.season_name || team.season_name || "Team award"}{award.week_of ? " · week of "+new Date(award.week_of+"T12:00:00").toLocaleDateString() : ""}</div>{award.note ? <p className="mt-2 text-[10px] leading-4 text-slate-300">{award.note}</p> : null}<div className="mt-2 text-[8px] text-slate-600">Awarded by {award.awarded_by_name}</div></div>)}</div>
        </Card> : null}
        {(badgeCard?.age_performance||[]).length ? <Card title="Performance by age" body="Your own historical performance grouped by season age. This is context, not a claim that age caused the result.">
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-center text-[9px]"><thead className="text-slate-500"><tr><th className="p-2 text-left">AGE</th><th>YEAR</th><th>G</th><th>AVG</th><th>OPS</th><th>H</th><th>HR</th></tr></thead><tbody>{badgeCard.age_performance.map((row)=><tr key={row.year} className="border-t border-white/10"><td className="p-2 text-left font-black text-white">{row.age}</td><td>{row.year}</td><td>{row.g}</td><td>{pct(row.avg)}</td><td>{pct(row.ops)}</td><td>{row.h}</td><td>{row.hr}</td></tr>)}</tbody></table></div>
        </Card> : null}
        {(playerCard?.tendencies?.spray_field||[]).length ? <Card title="Hitting spray map" body="Based only on at-bats with a logged spray location.">
          <div className="grid grid-cols-5 gap-1.5">{(playerCard.tendencies.spray_field||[]).map((row)=><div key={row.zone} className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.035] p-2 text-center"><div className="text-[7px] font-black text-emerald-200">{row.zone.replace("_"," ")}</div><div className="mt-1 text-lg font-black text-white">{Math.round(num(row.pct)*100)}%</div></div>)}</div>
        </Card> : null}
      </div> : null}

      {tab==="Practice" ? <PracticeModeCard teamId={team.id} playerId={player.id} /> : null}

      {tab==="Team" ? <div className="space-y-3"><Card title="Team statistics" body="Current team leaderboard."><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-center text-[9px]"><thead className="text-slate-500"><tr><th className="p-1 text-left">PLAYER</th><th>G</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>H</th><th>HR</th><th>RBI</th></tr></thead><tbody>{[...teamRows].sort((a,b)=>num(b.ops)-num(a.ops)).map((row,index)=><tr key={row.player?.id} className={cx("border-t border-white/10",Number(row.player?.id)===Number(player.id)&&"bg-cyan-300/[.04]")}><td className="p-2 text-left"><span className="mr-2 text-slate-600">{index+1}</span><b className="text-white">#{row.player?.jersey_number||"—"} {row.player?.display_name}</b></td><td>{num(row.g)}</td><td>{pct(row.avg)}</td><td>{pct(row.obp)}</td><td>{pct(row.slg)}</td><td className="font-black text-cyan-200">{pct(row.ops)}</td><td>{num(row.h)}</td><td>{num(row.hr)}</td><td>{num(row.rbi)}</td></tr>)}</tbody></table></div></Card>{nextGame?.lineup_spots?.length?<Card title="Next lineup" body="Published lineup for the next game."><div className="grid gap-1.5 sm:grid-cols-2">{nextGame.lineup_spots.map((spot)=><div key={spot.id} className={cx("grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-xl border p-2",Number(spot.player)===Number(player.id)?"border-cyan-300/30 bg-cyan-300/[.07]":"border-white/10 bg-white/[.02]")}><div className="text-center text-base font-black text-cyan-200">{spot.batting_order}</div><div className="truncate text-[10px] font-black text-white">{spot.player_detail?.display_name}</div><div className="rounded-lg bg-black/20 px-2 py-1 text-[8px] font-black text-slate-300">{spot.defensive_position||"EH"}</div></div>)}</div></Card>:null}</div> : null}

      {tab==="League" ? <div className="space-y-3">{center.league?<><Card title={(center.league.organization?.name||"League")+" standings"} body={[center.league.season?.name,center.league.division?.name].filter(Boolean).join(" · ")} action={<Trophy className="h-4 w-4 text-amber-300"/>}><div className="overflow-x-auto"><table className="w-full min-w-[540px] text-center text-[9px]"><thead className="text-slate-500"><tr><th className="p-1 text-left">TEAM</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>DIFF</th></tr></thead><tbody>{leagueRows.map((row)=><tr key={row.team.id} className={cx("border-t border-white/10",Number(row.team.id)===Number(team.id)&&"bg-amber-300/[.04]")}><td className="p-2 text-left font-black text-white">{row.standing_rank}. {row.team.group_name}</td><td>{row.wins}</td><td>{row.losses}</td><td>{row.ties}</td><td>{Number(row.pct||0).toFixed(3)}</td><td>{row.run_diff}</td></tr>)}</tbody></table></div></Card><Card title="League leaders" body="Top current division stats."><div className="grid gap-3 md:grid-cols-2">{["avg","ops","hr","rbi"].map((metric)=><div key={metric} className="rounded-xl border border-white/10 bg-black/15 p-2"><div className="mb-1 text-[8px] font-black uppercase text-violet-300">{metric.toUpperCase()}</div>{(center.league.leaders?.[metric]||[]).slice(0,5).map((row,index)=><div key={String(row.player?.id)+"-"+metric} className="grid grid-cols-[1.2rem_1fr_auto] gap-1 border-t border-white/5 py-1.5 text-[8px]"><b className="text-slate-600">{index+1}</b><span className="truncate text-slate-300">{row.player?.display_name}<span className="ml-1 text-slate-600">{row.team_name}</span></span><b className="text-white">{["avg","ops"].includes(metric)?Number(row[metric]||0).toFixed(3):row[metric]}</b></div>)}</div>)}</div></Card></>:<Card title="League data" body="This team is not attached to a SyncWorks league/division yet."><div className="text-xs text-slate-500">Standings and league leaderboards appear automatically when a commissioner adds the team to a division.</div></Card>}</div> : null}

      {tab==="Dues" ? <div className="grid gap-3 lg:grid-cols-[1fr_.8fr]"><Card title="My team fees" body="Your balance is private. Other players cannot see whether you have paid." action={<WalletCards className="h-4 w-4 text-amber-300"/>}><div className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3"><div className="text-[8px] font-black uppercase tracking-wide text-amber-300">Total due</div><div className="mt-1 text-3xl font-black text-white">{money(center.balance_cents)}</div></div><div className="space-y-2">{dues.map((row)=><section key={row.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex justify-between gap-2"><div><b className="text-xs text-white">{row.fee_detail?.title}</b><div className="mt-0.5 text-[9px] text-slate-500">{row.fee_detail?.description}</div></div><span className={cx("rounded-full px-2 py-1 text-[7px] font-black",["PAID","WAIVED"].includes(row.status)?"bg-emerald-300/10 text-emerald-200":"bg-amber-300/10 text-amber-200")}>{row.status}</span></div><div className="mt-2 text-lg font-black text-white">{money(Math.max(0,num(row.amount_cents)-num(row.amount_paid_cents)))}</div></section>)}{!dues.length?<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No team fees are assigned to your player profile.</div>:null}</div></Card><Card title="Payment options" body="Saved by your team manager."><div className="grid gap-2">{center.payment_settings?.cash_app_url?<a href={center.payment_settings.cash_app_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 px-3 text-xs font-black text-white"><span>Cash App</span><ExternalLink className="h-4 w-4"/></a>:null}{center.payment_settings?.venmo_url?<a href={center.payment_settings.venmo_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 px-3 text-xs font-black text-white"><span>Venmo</span><ExternalLink className="h-4 w-4"/></a>:null}{center.payment_settings?.stripe_url?<a href={center.payment_settings.stripe_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] px-3 text-xs font-black text-cyan-100"><span>Stripe</span><ExternalLink className="h-4 w-4"/></a>:null}{center.payment_settings?.payment_note?<div className="rounded-xl border border-white/10 bg-black/15 p-3 text-[10px] leading-5 text-slate-400">{center.payment_settings.payment_note}</div>:null}</div></Card></div> : null}
    </main>

    <SportsTeamMobileNav
      groupId={groupId}
      nextGameId={nextGame?.id || null}
      activeTab={tab === "Home" ? "Schedule" : tab === "My Player" ? "Stats" : tab === "Team" ? "Roster" : ""}
    />

    {profileOpen ? <Drawer title="Edit my player profile" onClose={()=>{setProfileOpen(false);setPhotoFile(null);}}><div className="space-y-3">
      <div className="flex items-center gap-3"><SportsPlayerPhoto player={player} profile={profile}/><label className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-xs font-black text-slate-300"><Camera className="h-4 w-4"/>{photoFile?photoFile.name:"Choose profile photo"}<input type="file" accept="image/*" className="hidden" onChange={(e)=>setPhotoFile(e.target.files?.[0]||null)}/></label></div>
      <div className="grid grid-cols-2 gap-2">
        {[["Name","display_name"],["Primary position","primary_position"],["Contact email","email"],["Phone","phone"],["Emergency contact","emergency_contact_name"],["Emergency phone","emergency_contact_phone"]].map(([label,key])=><label key={key} className={cx("block",key==="display_name"&&"col-span-2")}><span className="mb-1 block text-[8px] font-black uppercase text-slate-500">{label}</span><input value={form[key]} onChange={(e)=>setForm({...form,[key]:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-[16px] text-white sm:text-xs"/></label>)}
        <label className="block"><span className="mb-1 block text-[8px] font-black uppercase text-slate-500">Date of birth</span><input type="date" value={form.date_of_birth} onChange={(e)=>setForm({...form,date_of_birth:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-[16px] text-white sm:text-xs"/></label>
        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 text-[9px] font-bold text-slate-300"><input type="checkbox" checked={form.show_age_to_team} onChange={(e)=>setForm({...form,show_age_to_team:e.target.checked})} className="h-4 w-4 accent-cyan-300"/>Show my age to teammates</label>
        {profile?.age != null ? <div className="col-span-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-2 text-[9px] text-cyan-100">Current age: <b>{profile.age}</b>. Exact DOB remains in your private profile and coach directory.</div> : null}
        <label className="block"><span className="mb-1 block text-[8px] font-black uppercase text-slate-500">Bats</span><select value={form.bats} onChange={(e)=>setForm({...form,bats:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-xs text-white"><option value="">—</option><option value="R">Right</option><option value="L">Left</option><option value="S">Switch</option></select></label>
        <label className="block"><span className="mb-1 block text-[8px] font-black uppercase text-slate-500">Throws</span><select value={form.throws} onChange={(e)=>setForm({...form,throws:e.target.value})} className="h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-xs text-white"><option value="">—</option><option value="R">Right</option><option value="L">Left</option></select></label>
      </div>
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/[.035] p-3">
        <div className="text-xs font-black text-amber-100">Customize your player card</div>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">Choose your card look and photo framing. Earned badges and glowing borders cannot be assigned manually.</p>
        <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold text-slate-300">Card nickname (optional)</span><input value={form.card_nickname} maxLength={48} onChange={(e)=>setForm((v)=>({...v,card_nickname:e.target.value}))} placeholder="Your nickname" className="min-h-11 w-full rounded-xl border border-white/10 bg-[#050b14] px-3 text-base text-white"/></label>
        <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold text-slate-300">Card design</span><select value={form.card_style} onChange={(e)=>setForm((v)=>({...v,card_style:e.target.value}))} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#050b14] px-3 text-sm text-white"><option value="CLASSIC">Classic Gold</option><option value="NEON">Neon Night</option><option value="DIAMOND">Diamond</option><option value="MIDNIGHT">Midnight</option></select></label>
        <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold text-slate-300">Photo vertical position · {form.card_photo_position}%</span><input type="range" min="0" max="100" step="5" value={form.card_photo_position} onChange={(e)=>setForm((v)=>({...v,card_photo_position:Number(e.target.value)}))} className="min-h-11 w-full accent-amber-300"/></label>
        <p className="mt-2 text-[9px] text-amber-200">Please re-upload any portrait that previously showed a broken image. New uploads are kept in durable storage, so photos persist after deployments.</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[.025] p-2 text-[9px] leading-4 text-slate-500">Your manager controls jersey number and roster assignment. Your profile photo, contact information and public player details stay attached to your SyncWorks player identity.</div>
      <Btn primary className="w-full" disabled={busy} onClick={saveProfile}><Save className="mr-1 inline h-4 w-4"/>{busy?"Saving…":"Save player profile"}</Btn>
    </div></Drawer> : null}

    {chatOpen ? <Drawer title={team.group_name+" chat"} onClose={()=>setChatOpen(false)}><TeamChatPanel groupId={Number(groupId)} teamId={team.id} userId={Number(user?.id||0)} canManage={false} bare/></Drawer> : null}
  </div>;
}

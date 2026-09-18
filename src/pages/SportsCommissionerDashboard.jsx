import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Copy,
  Loader2,
  MailPlus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import {
  addLeagueTeam,
  addTournamentTeam,
  advanceTournament,
  buildDivisionSchedule,
  buildTournament,
  createLeagueTournament,
  getAvailableLeagueTeams,
  getDivisionLeagueStats,
  getDivisionStandings,
  getLeagueDivisions,
  getLeagueGames,
  getLeagueRoster,
  getLeagueSeasons,
  getLeagueTeams,
  getLeagueTournaments,
  getSoftballRuleSets,
  getSportsOrganizationDashboard,
  getSportsOrganizationMemberships,
  getSportsOrganizations,
  getTournamentBracket,
  inviteLeaguePlayer,
  updateLeagueGame,
} from "../api/sports";

const list = (value) => Array.isArray(value) ? value : [];
const n = (value) => Number(value || 0);
const cx = (...values) => values.filter(Boolean).join(" ");
const errText = (error) => error?.response?.data?.detail || Object.values(error?.response?.data || {})?.flat?.()?.[0] || error?.message || "Something went wrong.";
const fmt = (value) => value ? new Date(value).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }) : "TBD";

function Card({ title, children, action, className = "" }) {
  return <section className={cx("rounded-2xl border border-white/10 bg-[#07111f] p-3", className)}>
    <div className="flex items-center justify-between gap-2"><h2 className="text-[11px] font-black text-white">{title}</h2>{action}</div>
    <div className="mt-2">{children}</div>
  </section>;
}

function Stat({ label, value, sub }) {
  return <div className="rounded-xl border border-white/10 bg-black/15 p-2">
    <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-black text-white">{value}</div>
    {sub ? <div className="text-[8px] text-slate-500">{sub}</div> : null}
  </div>;
}

function Btn({ children, onClick, primary, disabled, className = "", type = "button" }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={cx(
    "min-h-9 rounded-xl px-3 text-[9px] font-black transition active:scale-[.98] disabled:opacity-40",
    primary ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[.035] text-slate-200",
    className,
  )}>{children}</button>;
}

function Input({ value, onChange, placeholder, type = "text", className = "" }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx("h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2.5 text-[16px] text-white outline-none focus:border-cyan-300/35 sm:text-xs", className)} />;
}

function Select({ value, onChange, children, className = "" }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className={cx("h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-xs text-white", className)}>{children}</select>;
}

const TABS = ["Overview", "Standings", "Schedule", "Teams", "Stats", "Tournament", "Players"];

export default function SportsCommissionerDashboard() {
  const navigate = useNavigate();
  const { organizationId } = useParams();

  const [organizations, setOrganizations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [orgId, setOrgId] = useState(organizationId || "");
  const [dashboard, setDashboard] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [seasonId, setSeasonId] = useState("");
  const [divisions, setDivisions] = useState([]);
  const [divisionId, setDivisionId] = useState("");
  const [teams, setTeams] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [roster, setRoster] = useState([]);
  const [standings, setStandings] = useState(null);
  const [leagueStats, setLeagueStats] = useState(null);
  const [games, setGames] = useState([]);
  const [ruleSets, setRuleSets] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [bracket, setBracket] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState("");

  const [scheduleForm, setScheduleForm] = useState({
    start_at: "",
    fields: "Field 1, Field 2, Field 3",
    games_per_matchup: "1",
    days_between_rounds: "7",
    slot_minutes: "60",
    venue_name: "",
    address_line1: "",
    city: "",
    state: "AL",
    rule_set: "",
  });
  const [teamToAdd, setTeamToAdd] = useState("");
  const [invite, setInvite] = useState({ team:"", email:"", display_name:"", jersey_number:"" });
  const [tournamentForm, setTournamentForm] = useState({ name:"", format:"SINGLE_ELIM", starts_on:"", rule_set:"" });
  const [tournamentTeam, setTournamentTeam] = useState("");
  const [tournamentStart, setTournamentStart] = useState("");
  const [scoreDrafts, setScoreDrafts] = useState({});

  const managedOrgIds = useMemo(() => new Set(
    memberships
      .filter((m) => m.status === "ACTIVE" && ["COMMISSIONER","ADMIN"].includes(m.role))
      .map((m) => Number(m.organization)),
  ), [memberships]);

  const managedOrganizations = organizations.filter((org) => managedOrgIds.has(Number(org.id)));
  const selectedOrg = organizations.find((org) => String(org.id) === String(orgId));
  const selectedDivision = divisions.find((division) => String(division.id) === String(divisionId));
  const selectedTournament = tournaments.find((row) => String(row.id) === String(selectedTournamentId));
  const addedTeamIds = new Set(teams.map((row) => Number(row.team)));

  async function boot() {
    setLoading(true); setError("");
    try {
      const [orgRows, memberRows] = await Promise.all([getSportsOrganizations(), getSportsOrganizationMemberships()]);
      setOrganizations(list(orgRows));
      setMemberships(list(memberRows));
      const allowed = new Set(list(memberRows).filter((m)=>m.status==="ACTIVE"&&["COMMISSIONER","ADMIN"].includes(m.role)).map((m)=>Number(m.organization)));
      const preferred = organizationId && allowed.has(Number(organizationId))
        ? String(organizationId)
        : String(list(orgRows).find((org)=>allowed.has(Number(org.id)))?.id || "");
      setOrgId(preferred);
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }

  useEffect(() => { boot(); }, []);

  useEffect(() => {
    if (!orgId) { setDashboard(null); setSeasons([]); return; }
    let alive = true;
    (async () => {
      setBusy(true); setError("");
      try {
        const [dash, seasonRows, available, tournamentRows] = await Promise.all([
          getSportsOrganizationDashboard(orgId),
          getLeagueSeasons(orgId),
          getAvailableLeagueTeams(orgId),
          getLeagueTournaments({ organization: orgId }),
        ]);
        if (!alive) return;
        setDashboard(dash);
        setSeasons(list(seasonRows));
        setAvailableTeams(list(available));
        setTournaments(list(tournamentRows));
        const preferredSeason = dash?.current_season?.id || seasonRows.find((row)=>row.is_current)?.id || seasonRows[0]?.id || "";
        setSeasonId(preferredSeason ? String(preferredSeason) : "");
        setSelectedTournamentId((current) => current || (tournamentRows[0]?.id ? String(tournamentRows[0].id) : ""));
      } catch (e) { if (alive) setError(errText(e)); } finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, [orgId]);

  useEffect(() => {
    if (!seasonId) { setDivisions([]); setDivisionId(""); return; }
    getLeagueDivisions(seasonId)
      .then((rows) => { setDivisions(list(rows)); setDivisionId((current)=>current || (rows[0]?.id ? String(rows[0].id) : "")); })
      .catch((e)=>setError(errText(e)));
  }, [seasonId]);

  async function loadDivision() {
    if (!divisionId) return;
    const [teamRows, rosterRows, stand, stats, gameRows, rules] = await Promise.all([
      getLeagueTeams(divisionId),
      getLeagueRoster({ division: divisionId }),
      getDivisionStandings(divisionId),
      getDivisionLeagueStats(divisionId),
      getLeagueGames({ division: divisionId }),
      getSoftballRuleSets({ organization: orgId, season: seasonId, division: divisionId }),
    ]);
    setTeams(list(teamRows)); setRoster(list(rosterRows)); setStandings(stand); setLeagueStats(stats); setGames(list(gameRows)); setRuleSets(list(rules));
    setInvite((current)=>({ ...current, team: current.team || (teamRows[0]?.team ? String(teamRows[0].team) : "") }));
  }

  useEffect(() => { loadDivision().catch((e)=>setError(errText(e))); }, [divisionId]);

  useEffect(() => {
    if (!selectedTournamentId) { setBracket(null); return; }
    getTournamentBracket(selectedTournamentId).then(setBracket).catch(()=>setBracket(null));
  }, [selectedTournamentId]);

  async function run(fn, message, reload = true) {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await fn();
      if (message) setNotice(message);
      if (reload) {
        await loadDivision();
        if (selectedTournamentId) setBracket(await getTournamentBracket(selectedTournamentId).catch(()=>null));
      }
      return result;
    } catch (e) { setError(errText(e)); return null; } finally { setBusy(false); }
  }

  async function addTeam() {
    if (!divisionId || !teamToAdd) return;
    await run(
      () => addLeagueTeam({ division:Number(divisionId), team:Number(teamToAdd), status:"ACTIVE" }),
      "Team added to division.",
    );
    setTeamToAdd("");
  }

  async function generateSchedule() {
    if (!divisionId || !scheduleForm.start_at) return;
    const payload = {
      ...scheduleForm,
      fields: scheduleForm.fields.split(",").map((v)=>v.trim()).filter(Boolean),
      games_per_matchup:Number(scheduleForm.games_per_matchup)||1,
      days_between_rounds:Number(scheduleForm.days_between_rounds)||7,
      slot_minutes:Number(scheduleForm.slot_minutes)||60,
      rule_set:scheduleForm.rule_set ? Number(scheduleForm.rule_set) : null,
      start_at:new Date(scheduleForm.start_at).toISOString(),
    };
    await run(()=>buildDivisionSchedule(divisionId,payload),"League schedule generated.");
  }

  async function saveScore(game) {
    const draft = scoreDrafts[game.id] || { home:game.home_score, away:game.away_score };
    await run(
      ()=>updateLeagueGame(game.id,{ home_score:Number(draft.home)||0, away_score:Number(draft.away)||0, status:"FINAL" }),
      "Official result saved.",
    );
  }

  async function sendInvite() {
    if (!invite.team || !invite.email.trim()) return;
    const result = await run(
      ()=>inviteLeaguePlayer({
        division:Number(divisionId),
        team:Number(invite.team),
        email:invite.email.trim(),
        display_name:invite.display_name.trim(),
        jersey_number:invite.jersey_number.trim(),
      }),
      "Player invitation emailed.",
    );
    if (result?.invite_url) setLastInviteUrl(result.invite_url);
    setInvite((current)=>({ ...current, email:"", display_name:"", jersey_number:"" }));
  }

  async function createTournament() {
    if (!tournamentForm.name.trim()) return;
    const created = await run(
      ()=>createLeagueTournament({
        organization:Number(orgId),
        season:seasonId ? Number(seasonId) : null,
        division:divisionId ? Number(divisionId) : null,
        rule_set:tournamentForm.rule_set ? Number(tournamentForm.rule_set) : null,
        name:tournamentForm.name.trim(),
        format:tournamentForm.format,
        starts_on:tournamentForm.starts_on || null,
        status:"DRAFT",
        venue_name:scheduleForm.venue_name,
        address_line1:scheduleForm.address_line1,
        city:scheduleForm.city,
        state:scheduleForm.state,
      }),
      "Tournament created.",
      false,
    );
    if (created) {
      const rows = await getLeagueTournaments({ organization:orgId });
      setTournaments(rows);
      setSelectedTournamentId(String(created.id));
      setTournamentForm((v)=>({ ...v, name:"" }));
    }
  }

  async function addTeamToTournament() {
    if (!selectedTournamentId || !tournamentTeam) return;
    await run(()=>addTournamentTeam(selectedTournamentId,{ team:Number(tournamentTeam) }),"Team added to tournament.",false);
    setBracket(await getTournamentBracket(selectedTournamentId));
    setTournamentTeam("");
  }

  async function buildSelectedTournament() {
    if (!selectedTournamentId || !tournamentStart) return;
    const result = await run(
      ()=>buildTournament(selectedTournamentId,{
        start_at:new Date(tournamentStart).toISOString(),
        fields:scheduleForm.fields.split(",").map((v)=>v.trim()).filter(Boolean),
        slot_minutes:Number(scheduleForm.slot_minutes)||60,
        venue_name:scheduleForm.venue_name,
        address_line1:scheduleForm.address_line1,
        city:scheduleForm.city,
        state:scheduleForm.state,
      }),
      "Tournament bracket built.",
      false,
    );
    if (result?.bracket) setBracket(result.bracket);
    await loadDivision();
  }

  async function advanceSelectedTournament() {
    if (!selectedTournamentId) return;
    const result = await run(
      ()=>advanceTournament(selectedTournamentId,{
        fields:scheduleForm.fields.split(",").map((v)=>v.trim()).filter(Boolean),
        slot_minutes:Number(scheduleForm.slot_minutes)||60,
      }),
      "Tournament advanced.",
      false,
    );
    if (result?.bracket) setBracket(result.bracket);
    await loadDivision();
  }

  if (loading) return <div className="min-h-screen bg-[#02060c] text-white"><ModeBar title="Commissioner" subtitle="SyncWorks Social" /><div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div></div>;

  if (!managedOrganizations.length) return <div className="min-h-screen bg-[#02060c] p-3 text-white"><ModeBar title="Commissioner" subtitle="SyncWorks Social" /><Card title="No commissioner access"><p className="text-xs text-slate-400">Create or join a league as Commissioner/Admin first.</p><Btn className="mt-3" onClick={()=>navigate("/connect/sports")}><ArrowLeft className="mr-1 inline h-3 w-3" />Teams & Clubs</Btn></Card></div>;

  const standingsRows = list(standings?.standings);
  const powerRows = [...standingsRows].sort((a,b)=>n(a.power_rank)-n(b.power_rank));
  const nextGames = games.filter((g)=>g.status==="SCHEDULED").slice(0,5);

  return <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
    <ModeBar title="Commissioner" subtitle="League Command Center" />
    <main className="mx-auto max-w-7xl space-y-3 px-3 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <Btn onClick={()=>navigate("/connect/sports")}><ArrowLeft className="mr-1 inline h-3.5 w-3.5" />Teams</Btn>
        <Btn onClick={()=>loadDivision()}><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Refresh</Btn>
      </div>

      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2.5 text-[10px] text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2.5 text-[10px] text-emerald-100">{notice}</div> : null}

      <section className="rounded-[1.6rem] border border-amber-300/20 bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.16),transparent_36%),radial-gradient(circle_at_0%_100%,rgba(34,211,238,.13),transparent_38%),#07111f] p-4">
        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.16em] text-amber-300"><ShieldCheck className="h-3.5 w-3.5" />Commissioner access</div><h1 className="mt-1 text-xl font-black text-white">{selectedOrg?.name || "League"}</h1><div className="text-[9px] text-slate-500">{selectedDivision?.name || "Choose division"} · {dashboard?.current_season?.name || "Season"}</div></div><Trophy className="h-5 w-5 text-amber-300" /></div>
        <div className="mt-3 grid grid-cols-4 gap-1.5"><Stat label="Teams" value={dashboard?.team_count||0}/><Stat label="Players" value={dashboard?.active_roster_count||0}/><Stat label="Games" value={dashboard?.scheduled_game_count||0}/><Stat label="Events" value={dashboard?.tournament_count||0}/></div>
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={orgId} onChange={(v)=>{setOrgId(v);setSeasonId("");setDivisionId("");}}>{managedOrganizations.map((org)=><option key={org.id} value={org.id}>{org.name}</option>)}</Select>
        <Select value={seasonId} onChange={(v)=>{setSeasonId(v);setDivisionId("");}}><option value="">Season</option>{seasons.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select value={divisionId} onChange={setDivisionId}><option value="">Division</option>{divisions.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</Select>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">{TABS.map((name)=><button key={name} onClick={()=>setTab(name)} className={cx("min-h-9 shrink-0 rounded-full px-3 text-[9px] font-black",tab===name?"bg-white text-slate-950":"border border-white/10 text-slate-400")}>{name}</button>)}</div>

      {tab==="Overview" ? <div className="grid gap-3 lg:grid-cols-3">
        <Card title="League snapshot" action={<BarChart3 className="h-4 w-4 text-cyan-300" />}><div className="grid grid-cols-2 gap-2"><Stat label="Final games" value={standingsRows.reduce((m,r)=>Math.max(m,n(r.games)),0)}/><Stat label="Rostered" value={roster.filter((r)=>r.status==="ACTIVE").length}/><Stat label="Pending invites" value={roster.filter((r)=>r.status==="INVITED").length}/><Stat label="Power tracked" value={powerRows.length}/></div></Card>
        <Card title="Top standings"><div className="space-y-1">{standingsRows.slice(0,4).map((row)=><div key={row.team.id} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg bg-black/15 p-2 text-[9px]"><b className="text-cyan-300">{row.standing_rank}</b><span className="truncate font-black text-white">{row.team.group_name}</span><span>{row.wins}-{row.losses}-{row.ties}</span></div>)}</div></Card>
        <Card title="Next league games" action={<CalendarDays className="h-4 w-4 text-emerald-300" />}><div className="space-y-1">{nextGames.map((g)=><div key={g.id} className="rounded-lg border border-white/8 p-2"><div className="text-[9px] font-black text-white">{g.home_team_detail?.group_name} vs {g.away_team_detail?.group_name}</div><div className="text-[8px] text-slate-500">{fmt(g.start_at)} · {g.field_name||g.venue_name||"Field TBD"}</div></div>)}</div></Card>
      </div> : null}

      {tab==="Standings" ? <div className="space-y-3">
        <Card title="Official standings" action={<Trophy className="h-4 w-4 text-amber-300" />}><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-center text-[9px]"><thead className="text-slate-500"><tr><th className="p-1 text-left">TEAM</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>RF</th><th>RA</th><th>DIFF</th></tr></thead><tbody>{standingsRows.map((r)=><tr key={r.team.id} className="border-t border-white/10"><td className="p-2 text-left font-black text-white">{r.standing_rank}. {r.team.group_name}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.ties}</td><td>{Number(r.pct||0).toFixed(3)}</td><td>{r.runs_for}</td><td>{r.runs_against}</td><td className={r.run_diff>=0?"text-emerald-300":"text-rose-300"}>{r.run_diff}</td></tr>)}</tbody></table></div></Card>
        <Card title="Power ranking" action={<Sparkles className="h-4 w-4 text-violet-300" />}><div className="mb-2 text-[8px] text-slate-500">{standings?.power_formula}</div><div className="grid gap-1.5 sm:grid-cols-2">{powerRows.map((r)=><div key={r.team.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-xl border border-violet-300/10 bg-violet-300/[.035] p-2"><div className="text-center text-sm font-black text-violet-200">#{r.power_rank}</div><div><b className="text-[10px] text-white">{r.team.group_name}</b><div className="text-[7px] text-slate-500">SOS {Number(r.strength_of_schedule||0).toFixed(3)} · Diff/G {r.run_diff_per_game}</div></div><b className="text-sm text-violet-100">{r.power_score}</b></div>)}</div></Card>
      </div> : null}

      {tab==="Schedule" ? <div className="grid gap-3 lg:grid-cols-[.8fr_1.2fr]">
        <Card title="Schedule builder"><div className="grid grid-cols-2 gap-2"><Input type="datetime-local" value={scheduleForm.start_at} onChange={(v)=>setScheduleForm({...scheduleForm,start_at:v})}/><Input value={scheduleForm.fields} onChange={(v)=>setScheduleForm({...scheduleForm,fields:v})} placeholder="Field 1, Field 2"/><Input value={scheduleForm.games_per_matchup} onChange={(v)=>setScheduleForm({...scheduleForm,games_per_matchup:v})} placeholder="Games per matchup"/><Input value={scheduleForm.days_between_rounds} onChange={(v)=>setScheduleForm({...scheduleForm,days_between_rounds:v})} placeholder="Days between rounds"/><Input value={scheduleForm.venue_name} onChange={(v)=>setScheduleForm({...scheduleForm,venue_name:v})} placeholder="Venue"/><Input value={scheduleForm.address_line1} onChange={(v)=>setScheduleForm({...scheduleForm,address_line1:v})} placeholder="Address"/><Input value={scheduleForm.city} onChange={(v)=>setScheduleForm({...scheduleForm,city:v})} placeholder="City"/><Input value={scheduleForm.state} onChange={(v)=>setScheduleForm({...scheduleForm,state:v})} placeholder="State"/></div><Select value={scheduleForm.rule_set} onChange={(v)=>setScheduleForm({...scheduleForm,rule_set:v})} className="mt-2"><option value="">No attached rule set</option>{ruleSets.map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</Select><Btn primary className="mt-2 w-full" disabled={busy||!scheduleForm.start_at} onClick={generateSchedule}>Generate round-robin schedule</Btn></Card>
        <Card title="League schedule"><div className="space-y-1.5">{games.filter((g)=>g.source==="LEAGUE").map((g)=>{const draft=scoreDrafts[g.id]||{home:g.home_score,away:g.away_score};return <div key={g.id} className="rounded-xl border border-white/10 p-2"><div className="flex items-start justify-between gap-2"><div><b className="text-[10px] text-white">{g.home_team_detail?.group_name} vs {g.away_team_detail?.group_name}</b><div className="text-[8px] text-slate-500">{fmt(g.start_at)} · {g.field_name||g.venue_name||"Field TBD"}</div></div><span className="text-[8px] font-black text-cyan-200">{g.status}</span></div><div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-1.5"><Input type="number" value={draft.home} onChange={(v)=>setScoreDrafts({...scoreDrafts,[g.id]:{...draft,home:v}})} /><Input type="number" value={draft.away} onChange={(v)=>setScoreDrafts({...scoreDrafts,[g.id]:{...draft,away:v}})} /><Btn onClick={()=>saveScore(g)}>Save result</Btn></div></div>})}</div></Card>
      </div> : null}

      {tab==="Teams" ? <div className="grid gap-3 lg:grid-cols-[.75fr_1.25fr]">
        <Card title="Add Social team/group"><div className="flex gap-2"><Select value={teamToAdd} onChange={setTeamToAdd}><option value="">Choose team</option>{availableTeams.filter((t)=>!addedTeamIds.has(Number(t.id))).map((t)=><option key={t.id} value={t.id}>{t.group_name}</option>)}</Select><Btn primary disabled={!teamToAdd||busy} onClick={addTeam}><Plus className="h-3.5 w-3.5"/></Btn></div><p className="mt-2 text-[8px] leading-4 text-slate-500">Teams are existing SyncWorks Social TEAM groups. Their roster, chat, lineup and stats stay intact when added to a league.</p></Card>
        <Card title="Division teams"><div className="grid gap-2 sm:grid-cols-2">{teams.map((row)=><div key={row.id} className="rounded-xl border border-cyan-300/10 bg-cyan-300/[.03] p-2"><b className="text-[10px] text-white">{row.team_detail?.group_name}</b><div className="mt-1 text-[8px] text-slate-500">Seed {row.seed||"—"} · {row.status}</div></div>)}</div></Card>
      </div> : null}

      {tab==="Stats" ? <div className="space-y-3">
        <Card title="League team statistics"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-center text-[9px]"><thead className="text-slate-500"><tr><th className="p-1 text-left">TEAM</th><th>G</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>H</th><th>HR</th><th>RBI</th><th>R/G</th></tr></thead><tbody>{list(leagueStats?.teams).map((r)=><tr key={r.team.id} className="border-t border-white/10"><td className="p-2 text-left font-black text-white">{r.team.group_name}</td><td>{r.g}</td><td>{Number(r.avg).toFixed(3)}</td><td>{Number(r.obp).toFixed(3)}</td><td>{Number(r.slg).toFixed(3)}</td><td className="text-cyan-200">{Number(r.ops).toFixed(3)}</td><td>{r.h}</td><td>{r.hr}</td><td>{r.rbi}</td><td>{r.runs_per_game}</td></tr>)}</tbody></table></div></Card>
        <div className="grid gap-3 md:grid-cols-2">{["ops","avg","hr","rbi"].map((metric)=><Card key={metric} title={"League leaders · "+metric.toUpperCase()}><div className="space-y-1">{list(leagueStats?.leaders?.[metric]).slice(0,5).map((r,i)=><div key={r.player.id} className="grid grid-cols-[1.5rem_1fr_auto] gap-2 rounded-lg bg-black/15 p-2 text-[9px]"><b className="text-cyan-300">{i+1}</b><span className="truncate"><b>{r.player.display_name}</b><span className="ml-1 text-slate-500">{r.team_name}</span></span><b>{metric==="avg"||metric==="ops"?Number(r[metric]).toFixed(3):r[metric]}</b></div>)}</div></Card>)}</div>
      </div> : null}

      {tab==="Tournament" ? <div className="grid gap-3 lg:grid-cols-[.7fr_1.3fr]">
        <div className="space-y-3"><Card title="Create tournament"><div className="space-y-2"><Input value={tournamentForm.name} onChange={(v)=>setTournamentForm({...tournamentForm,name:v})} placeholder="Tournament name"/><div className="grid grid-cols-2 gap-2"><Select value={tournamentForm.format} onChange={(v)=>setTournamentForm({...tournamentForm,format:v})}><option value="SINGLE_ELIM">Single elimination</option><option value="ROUND_ROBIN">Round robin</option></Select><Input type="date" value={tournamentForm.starts_on} onChange={(v)=>setTournamentForm({...tournamentForm,starts_on:v})}/></div><Select value={tournamentForm.rule_set} onChange={(v)=>setTournamentForm({...tournamentForm,rule_set:v})}><option value="">Rules</option>{ruleSets.map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</Select><Btn primary className="w-full" onClick={createTournament} disabled={!tournamentForm.name.trim()||busy}>Create</Btn></div></Card>
        <Card title="Tournament"><Select value={selectedTournamentId} onChange={setSelectedTournamentId}><option value="">Choose tournament</option>{tournaments.map((t)=><option key={t.id} value={t.id}>{t.name}</option>)}</Select>{selectedTournament?<div className="mt-2 text-[8px] text-slate-500">{selectedTournament.format} · {selectedTournament.status}</div>:null}</Card>
        {selectedTournament?<Card title="Add teams / build"><div className="flex gap-2"><Select value={tournamentTeam} onChange={setTournamentTeam}><option value="">Add division team</option>{teams.filter((row)=>!list(bracket?.entries).some((e)=>Number(e.team)===Number(row.team))).map((row)=><option key={row.id} value={row.team}>{row.team_detail?.group_name}</option>)}</Select><Btn onClick={addTeamToTournament} disabled={!tournamentTeam}>Add</Btn></div><Input type="datetime-local" value={tournamentStart} onChange={setTournamentStart} className="mt-2"/><div className="mt-2 grid grid-cols-2 gap-2"><Btn primary onClick={buildSelectedTournament} disabled={!tournamentStart||busy}>Build bracket</Btn><Btn onClick={advanceSelectedTournament} disabled={busy||!bracket?.games?.length}>Advance round</Btn></div></Card>:null}</div>
        <Card title="Tournament bracket / schedule" action={<Trophy className="h-4 w-4 text-amber-300" />}><div className="mb-2 flex flex-wrap gap-1">{list(bracket?.entries).map((e)=><span key={e.id} className="rounded-full border border-white/10 px-2 py-1 text-[8px]">#{e.seed||"—"} {e.team_detail?.group_name}</span>)}</div><div className="space-y-2">{list(bracket?.games).map((g)=><div key={g.id} className="rounded-xl border border-white/10 p-2"><div className="text-[8px] font-black uppercase text-violet-300">Round {g.round_number||"—"} · Game {g.bracket_slot||"—"}</div><div className="mt-1 text-[10px] font-black text-white">{g.home_team_detail?.group_name} {g.status==="FINAL"?g.home_score:""} vs {g.away_team_detail?.group_name} {g.status==="FINAL"?g.away_score:""}</div><div className="text-[8px] text-slate-500">{fmt(g.start_at)} · {g.field_name||"Field TBD"}</div></div>)}{list(bracket?.byes).map((b)=><div key={b.id} className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-2 text-[9px]"><b className="text-amber-200">Round {b.round_number} bye:</b> {b.team_detail?.group_name}</div>)}</div></Card>
      </div> : null}

      {tab==="Players" ? <div className="grid gap-3 lg:grid-cols-[.75fr_1.25fr]">
        <Card title="Invite player by email" action={<MailPlus className="h-4 w-4 text-cyan-300" />}><div className="space-y-2"><Select value={invite.team} onChange={(v)=>setInvite({...invite,team:v})}><option value="">Choose team</option>{teams.map((row)=><option key={row.id} value={row.team}>{row.team_detail?.group_name}</option>)}</Select><Input value={invite.email} onChange={(v)=>setInvite({...invite,email:v})} placeholder="player@email.com"/><Input value={invite.display_name} onChange={(v)=>setInvite({...invite,display_name:v})} placeholder="Player name"/><Input value={invite.jersey_number} onChange={(v)=>setInvite({...invite,jersey_number:v})} placeholder="Jersey #"/><Btn primary className="w-full" onClick={sendInvite} disabled={!invite.team||!invite.email.trim()||busy}>Send signup + team invite</Btn></div>{lastInviteUrl?<button onClick={()=>navigator.clipboard?.writeText(lastInviteUrl)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-cyan-300/15 p-2 text-[8px] text-cyan-100"><Copy className="h-3 w-3"/>Copy last invite link</button>:null}</Card>
        <Card title="League roster"><div className="space-y-1">{roster.map((r)=><div key={r.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-white/8 p-2"><div className="min-w-0"><b className="block truncate text-[9px] text-white">{r.identity_detail?.display_name||r.identity_detail?.email}</b><div className="truncate text-[8px] text-slate-500">{r.team_detail?.group_name} · {r.identity_detail?.email}</div></div><span className={cx("rounded-full px-2 py-1 text-[7px] font-black",r.status==="ACTIVE"?"bg-emerald-300/10 text-emerald-200":"bg-amber-300/10 text-amber-200")}>{r.status}</span></div>)}</div></Card>
      </div> : null}
    </main>
  </div>;
}

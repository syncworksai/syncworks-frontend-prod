import React, { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Loader2, MailPlus, Plus, ShieldCheck, Trophy, Users } from "lucide-react";

import {
  addLeagueTeam,
  createLeagueDivision,
  createLeagueSeason,
  createSoftballRuleSet,
  createSportsOrganization,
  getLeagueDivisions,
  getLeagueRoster,
  getLeagueSeasons,
  getLeagueTeams,
  getSoftballRuleSets,
  getSportsOrganizationDashboard,
  getSportsOrganizations,
  inviteLeaguePlayer,
} from "../../api/sports";

const list = (value) => (Array.isArray(value) ? value : []);
const errorText = (error) => error?.response?.data?.detail || error?.response?.data?.email || error?.message || "Something went wrong.";
const field = "min-h-11 w-full rounded-xl border border-white/10 bg-[#050b14] px-3 text-sm text-white outline-none focus:border-cyan-300/40";
const button = "min-h-11 rounded-xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50";

export default function SportsLeagueManager({ sportsTeams = [] }) {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [roster, setRoster] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: "", sport: "SOFTBALL", city: "", state: "AL" });
  const [seasonName, setSeasonName] = useState("");
  const [divisionName, setDivisionName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [invite, setInvite] = useState({ team: "", email: "", display_name: "", jersey_number: "" });
  const [ruleSets, setRuleSets] = useState([]);
  const [ruleForm, setRuleForm] = useState({ name: "League rules", competition_type: "LEAGUE", innings: "7", home_run_rule: "UNLIMITED", home_run_limit: "3", home_run_max_ahead: "1", notes: "" });

  const selectedOrg = organizations.find((row) => String(row.id) === String(selectedOrgId));
  const selectedDivision = divisions.find((row) => String(row.id) === String(selectedDivisionId));
  const assignedTeamIds = useMemo(() => new Set(leagueTeams.map((row) => Number(row.team))), [leagueTeams]);
  const eligibleTeams = sportsTeams.filter((team) => !selectedOrg || team.sport === selectedOrg.sport);

  async function loadOrganizations(preferredId) {
    const rows = list(await getSportsOrganizations());
    setOrganizations(rows);
    const next = preferredId || selectedOrgId || rows[0]?.id || "";
    setSelectedOrgId(next ? String(next) : "");
  }

  useEffect(() => {
    loadOrganizations().catch((err) => setError(errorText(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedOrgId) {
      setDashboard(null); setSeasons([]); setRuleSets([]); setSelectedSeasonId(""); return;
    }
    let alive = true;
    (async () => {
      setBusy(true); setError("");
      try {
        const [dash, seasonRows, rules] = await Promise.all([
          getSportsOrganizationDashboard(selectedOrgId),
          getLeagueSeasons(selectedOrgId),
          getSoftballRuleSets({ organization: selectedOrgId }).catch(() => []),
        ]);
        if (!alive) return;
        setDashboard(dash);
        setSeasons(list(seasonRows));
        setRuleSets(list(rules));
        const preferred = dash?.current_season?.id || seasonRows.find((row) => row.is_current)?.id || seasonRows[0]?.id || "";
        setSelectedSeasonId(preferred ? String(preferred) : "");
      } catch (err) {
        if (alive) setError(errorText(err));
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedOrgId]);

  useEffect(() => {
    if (!selectedSeasonId) {
      setDivisions([]); setSelectedDivisionId(""); return;
    }
    getLeagueDivisions(selectedSeasonId)
      .then((rows) => {
        setDivisions(list(rows));
        setSelectedDivisionId((current) => current || (rows[0]?.id ? String(rows[0].id) : ""));
      })
      .catch((err) => setError(errorText(err)));
  }, [selectedSeasonId]);

  useEffect(() => {
    if (!selectedDivisionId) {
      setLeagueTeams([]); setRoster([]); return;
    }
    Promise.all([getLeagueTeams(selectedDivisionId), getLeagueRoster({ division: selectedDivisionId })])
      .then(([teams, rosterRows]) => {
        setLeagueTeams(list(teams));
        setRoster(list(rosterRows));
      })
      .catch((err) => setError(errorText(err)));
  }, [selectedDivisionId]);

  async function createOrganization(event) {
    event.preventDefault();
    if (!orgForm.name.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await createSportsOrganization({
        ...orgForm,
        name: orgForm.name.trim(),
        slug: orgForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        kind: "LEAGUE",
      });
      await loadOrganizations(created.id);
      setShowCreate(false);
      setOrgForm({ name: "", sport: "SOFTBALL", city: "", state: "AL" });
      setNotice("League created. You are the commissioner.");
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  async function createSeason(event) {
    event.preventDefault();
    if (!seasonName.trim() || !selectedOrgId) return;
    setBusy(true); setError("");
    try {
      const created = await createLeagueSeason({ organization: Number(selectedOrgId), name: seasonName.trim(), status: "ACTIVE", is_current: true });
      const rows = await getLeagueSeasons(selectedOrgId);
      setSeasons(list(rows)); setSelectedSeasonId(String(created.id)); setSeasonName("");
      setNotice("Season created and set as current.");
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  async function createDivision(event) {
    event.preventDefault();
    if (!divisionName.trim() || !selectedSeasonId) return;
    setBusy(true); setError("");
    try {
      const created = await createLeagueDivision({ season: Number(selectedSeasonId), name: divisionName.trim(), is_active: true });
      const rows = await getLeagueDivisions(selectedSeasonId);
      setDivisions(list(rows)); setSelectedDivisionId(String(created.id)); setDivisionName("");
      setNotice("Division created.");
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  async function addTeam(event) {
    event.preventDefault();
    if (!selectedDivisionId || !teamId) return;
    setBusy(true); setError("");
    try {
      await addLeagueTeam({ division: Number(selectedDivisionId), team: Number(teamId), status: "ACTIVE" });
      setLeagueTeams(await getLeagueTeams(selectedDivisionId)); setTeamId("");
      setNotice("Team added to division.");
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  async function createRuleSet(event) {
    event.preventDefault();
    if (!selectedOrgId || !ruleForm.name.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await createSoftballRuleSet({
        organization: Number(selectedOrgId),
        season: selectedSeasonId ? Number(selectedSeasonId) : null,
        division: selectedDivisionId ? Number(selectedDivisionId) : null,
        name: ruleForm.name.trim(),
        competition_type: ruleForm.competition_type,
        innings: Math.max(1, Number(ruleForm.innings) || 7),
        home_run_rule: ruleForm.home_run_rule,
        home_run_limit: ruleForm.home_run_rule === "FIXED" ? Math.max(0, Number(ruleForm.home_run_limit) || 0) : null,
        home_run_max_ahead: ruleForm.home_run_rule === "ONE_UP" ? Math.max(0, Number(ruleForm.home_run_max_ahead) || 1) : 1,
        notes: ruleForm.notes.trim(),
        is_active: true,
      });
      setRuleSets(await getSoftballRuleSets({ organization: selectedOrgId }));
      setNotice(`${ruleForm.competition_type === "TOURNAMENT" ? "Tournament" : "League"} rules saved.`);
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  async function invitePlayer(event) {
    event.preventDefault();
    if (!selectedDivisionId || !invite.team || !invite.email.trim()) return;
    setBusy(true); setError("");
    try {
      await inviteLeaguePlayer({ division: Number(selectedDivisionId), team: Number(invite.team), email: invite.email.trim(), display_name: invite.display_name.trim(), jersey_number: invite.jersey_number.trim() });
      setRoster(await getLeagueRoster({ division: selectedDivisionId }));
      setInvite({ team: invite.team, email: "", display_name: "", jersey_number: "" });
      setNotice("Player roster identity created. Existing SyncWorks accounts link automatically; new accounts can claim by matching email.");
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }

  return (
    <section className="rounded-[1.65rem] border border-amber-300/15 bg-[linear-gradient(145deg,rgba(251,191,36,.06),rgba(34,211,238,.03)),#07111f] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-amber-200"><ShieldCheck className="h-4 w-4" />League operations</div>
          <h2 className="mt-2 text-xl font-black text-white">Commissioner workspace</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">League → season → division → teams → verified email roster. Team game/stats data stays underneath this structure.</p>
        </div>
        <button type="button" onClick={() => setShowCreate((value) => !value)} className={`${button} bg-amber-300 text-slate-950`}><Plus className="mr-1 inline h-4 w-4" />New league</button>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</div> : null}

      {showCreate ? (
        <form onSubmit={createOrganization} className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className={field} placeholder="League name" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
          <select className={field} value={orgForm.sport} onChange={(e) => setOrgForm({ ...orgForm, sport: e.target.value })}><option value="SOFTBALL">Softball</option><option value="BASEBALL">Baseball</option><option value="BASKETBALL">Basketball</option><option value="SOCCER">Soccer</option><option value="FOOTBALL">Football</option><option value="VOLLEYBALL">Volleyball</option></select>
          <input className={field} placeholder="City" value={orgForm.city} onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })} />
          <input className={field} placeholder="State" value={orgForm.state} onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })} />
          <button disabled={busy} className={`${button} bg-cyan-300 text-slate-950`}>{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Create league"}</button>
        </form>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-3">
          <label className="block text-xs font-black uppercase tracking-wide text-slate-500">League</label>
          <div className="relative"><select className={`${field} appearance-none pr-10`} value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}><option value="">Choose league</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-500" /></div>
          {dashboard ? (
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={Trophy} label="Teams" value={dashboard.team_count || 0} />
              <Stat icon={Users} label="Roster" value={dashboard.active_roster_count || 0} />
              <Stat icon={Building2} label="Divisions" value={dashboard.divisions?.length || 0} />
            </div>
          ) : null}

          {selectedOrgId ? <form onSubmit={createSeason} className="flex gap-2"><input className={field} placeholder="2027 Spring" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} /><button className={`${button} bg-white/10 text-white`}>Add season</button></form> : null}
          {seasons.length ? <select className={field} value={selectedSeasonId} onChange={(e) => { setSelectedSeasonId(e.target.value); setSelectedDivisionId(""); }}><option value="">Choose season</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.is_current ? " · Current" : ""}</option>)}</select> : null}

          {selectedSeasonId ? <form onSubmit={createDivision} className="flex gap-2"><input className={field} placeholder="Men's D/E" value={divisionName} onChange={(e) => setDivisionName(e.target.value)} /><button className={`${button} bg-white/10 text-white`}>Add division</button></form> : null}
          {divisions.length ? <select className={field} value={selectedDivisionId} onChange={(e) => setSelectedDivisionId(e.target.value)}><option value="">Choose division</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select> : null}

          {selectedOrgId && selectedOrg?.sport === "SOFTBALL" ? <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-3">
            <div className="flex items-center justify-between gap-2"><div><b className="text-sm text-white">Competition rules</b><p className="text-[10px] text-slate-500">Save league or tournament rules and attach them to Game Book games.</p></div><ShieldCheck className="h-4 w-4 text-amber-200" /></div>
            <div className="mt-2 flex flex-wrap gap-1">{ruleSets.map((rule) => <span key={rule.id} className="rounded-full border border-white/10 bg-white/[.035] px-2 py-1 text-[8px] font-black text-slate-300">{rule.competition_type} · {rule.name} · {rule.home_run_rule === "FIXED" ? `${rule.home_run_limit} HR` : rule.home_run_rule === "ONE_UP" ? `1-up +${rule.home_run_max_ahead}` : "Unlimited"}</span>)}</div>
            <form onSubmit={createRuleSet} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input className={field} placeholder="Rule-set name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
              <select className={field} value={ruleForm.competition_type} onChange={(e) => setRuleForm({ ...ruleForm, competition_type: e.target.value })}><option value="LEAGUE">League</option><option value="TOURNAMENT">Tournament</option><option value="OTHER">Other</option></select>
              <input className={field} inputMode="numeric" placeholder="Innings" value={ruleForm.innings} onChange={(e) => setRuleForm({ ...ruleForm, innings: e.target.value })} />
              <select className={field} value={ruleForm.home_run_rule} onChange={(e) => setRuleForm({ ...ruleForm, home_run_rule: e.target.value })}><option value="UNLIMITED">Unlimited HR</option><option value="FIXED">Fixed HR cap</option><option value="ONE_UP">One-Up / San Diego</option></select>
              {ruleForm.home_run_rule === "FIXED" ? <input className={field} inputMode="numeric" placeholder="HR cap (ex. 3)" value={ruleForm.home_run_limit} onChange={(e) => setRuleForm({ ...ruleForm, home_run_limit: e.target.value })} /> : null}
              {ruleForm.home_run_rule === "ONE_UP" ? <input className={field} inputMode="numeric" placeholder="Max HR ahead (ex. 1)" value={ruleForm.home_run_max_ahead} onChange={(e) => setRuleForm({ ...ruleForm, home_run_max_ahead: e.target.value })} /> : null}
              <input className={`${field} sm:col-span-2`} placeholder="Rule notes / tournament exceptions" value={ruleForm.notes} onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })} />
              <button disabled={busy} className={`${button} bg-amber-300 text-slate-950 sm:col-span-2`}>Save rule set</button>
            </form>
          </div> : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between"><div><b className="text-white">Division teams</b><p className="text-xs text-slate-500">{selectedDivision?.name || "Choose a division"}</p></div><span className="text-xs font-black text-cyan-200">{leagueTeams.length}</span></div>
            {selectedDivisionId ? <form onSubmit={addTeam} className="mt-3 flex gap-2"><select className={field} value={teamId} onChange={(e) => setTeamId(e.target.value)}><option value="">Add a SyncWorks team</option>{eligibleTeams.filter((team) => !assignedTeamIds.has(Number(team.id))).map((team) => <option key={team.id} value={team.id}>{team.group_name}</option>)}</select><button className={`${button} bg-cyan-300 text-slate-950`}>Add</button></form> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{leagueTeams.map((entry) => <div key={entry.id} className="rounded-xl border border-white/8 bg-white/[.03] p-3"><b className="text-sm text-white">{entry.team_detail?.group_name}</b><div className="mt-1 text-[10px] font-black uppercase text-emerald-200">{entry.status}</div></div>)}</div>
          </div>

          {leagueTeams.length ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2"><MailPlus className="h-4 w-4 text-amber-200" /><b className="text-white">Email-first roster</b></div>
              <form onSubmit={invitePlayer} className="mt-3 grid gap-2 sm:grid-cols-2">
                <select className={field} value={invite.team} onChange={(e) => setInvite({ ...invite, team: e.target.value })}><option value="">Choose team</option>{leagueTeams.map((entry) => <option key={entry.id} value={entry.team}>{entry.team_detail?.group_name}</option>)}</select>
                <input className={field} type="email" placeholder="player@email.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
                <input className={field} placeholder="Player name" value={invite.display_name} onChange={(e) => setInvite({ ...invite, display_name: e.target.value })} />
                <div className="flex gap-2"><input className={field} placeholder="#" value={invite.jersey_number} onChange={(e) => setInvite({ ...invite, jersey_number: e.target.value })} /><button className={`${button} whitespace-nowrap bg-amber-300 text-slate-950`}>Add player</button></div>
              </form>
              <div className="mt-3 max-h-56 space-y-2 overflow-auto">{roster.map((row) => <div key={row.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[.03] px-3 py-2 text-sm"><div><b className="text-white">{row.identity_detail?.display_name || row.identity_detail?.email}</b><div className="text-xs text-slate-500">{row.team_detail?.group_name} · {row.identity_detail?.email}</div></div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${row.status === "ACTIVE" ? "bg-emerald-300/15 text-emerald-100" : "bg-amber-300/15 text-amber-100"}`}>{row.status}</span></div>)}</div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.03] p-3"><Icon className="h-4 w-4 text-amber-200" /><div className="mt-2 text-xl font-black text-white">{value}</div><div className="text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</div></div>;
}

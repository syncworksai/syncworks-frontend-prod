import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, Loader2, Lock, Pencil, Save, Users, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { getGroups, getMemberships, updateGroup } from "../api/social";
import { getSportsTeams } from "../api/sports";
import CoachWorkspace from "../components/sports/CoachWorkspace";
import PlayerDevelopmentCard from "../components/sports/PlayerDevelopmentCard";
import TeamExecutionTrend from "../components/sports/TeamExecutionTrend";
import WayAnalyticsPanel from "../components/sports/WayAnalyticsPanel";
import SportsPlayerDashboard from "./SportsPlayerDashboard";
import SportsPlaybook from "./SportsPlaybook";
import SportsTeamManagerDashboard from "./SportsTeamManagerDashboard";

const MANAGEMENT_ROLES = new Set(["OWNER", "DIRECTOR", "MANAGER", "SCOREKEEPER"]);
const COACH_ROLES = new Set(["OWNER", "DIRECTOR", "MANAGER"]);
const RENAME_ROLES = COACH_ROLES;
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const legacyWayWePlayGroup = (group) => normalize(group?.name).includes("bed springs baptist");

function PlaybookEntry({ group, onOpen, onAnalytics, canRename, onRename }) {
  return (
    <div className="bg-[#02060c] px-3 pt-3 text-slate-100 sm:px-5">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-[1.45rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,.13),transparent_30%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.12),transparent_34%),linear-gradient(145deg,#07111f,#07101c)] shadow-[0_16px_50px_rgba(0,0,0,.35)]">
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3.5 text-left sm:p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[.08] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.09)]"><BookOpen className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300">Team standard</span><span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[.035] px-2 py-0.5 text-[7px] font-black uppercase tracking-[.11em] text-slate-400"><Lock className="h-2.5 w-2.5" />Team only</span></div>
            <div className="mt-1 truncate text-base font-black tracking-tight text-white">The Way We Play</div>
            <div className="mt-0.5 text-[9px] leading-4 text-slate-500">Trust · Execution · Accountability · Team</div>
          </div>
          <div className="hidden shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-[.12em] text-cyan-200 sm:flex">Open playbook<ArrowRight className="h-3.5 w-3.5" /></div>
          <ArrowRight className="h-4 w-4 shrink-0 text-cyan-200 sm:hidden" />
        </button>
        <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-white/8 px-3 py-2 sm:grid-cols-[1fr_auto_auto] sm:px-4">
          <div className="self-center text-[8px] leading-4 text-slate-600">Private to active {group?.name || "team"} members. Team identity stays attached even if the name changes.</div>
          <button type="button" onClick={onAnalytics} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-violet-300/20 bg-violet-300/[.06] px-3 text-[8px] font-black uppercase tracking-wide text-violet-100"><BarChart3 className="h-3.5 w-3.5" />Execution</button>
          {canRename ? <button type="button" onClick={onRename} className="hidden min-h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-[8px] font-black uppercase tracking-wide text-slate-400 sm:inline-flex"><Pencil className="h-3 w-3" />Edit team name</button> : null}
        </div>
      </section>
    </div>
  );
}

function TeamNameEditor({ group, onClose, onSaved }) {
  const [name, setName] = useState(group?.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const clean = name.trim();
    if (!clean || clean === group?.name) return onClose();
    setBusy(true);
    setError("");
    try {
      const updated = await updateGroup(group.id, { name: clean });
      onSaved(updated);
    } catch (err) {
      setError(err?.response?.data?.detail || Object.values(err?.response?.data || {})?.flat?.()?.[0] || err?.message || "Team name could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-md rounded-[1.4rem] border border-cyan-300/20 bg-[#07111f] p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">Team identity</div><h2 className="mt-1 text-lg font-black">Edit team / group name</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X className="h-4 w-4" /></button></div>
        <p className="mt-2 text-[10px] leading-5 text-slate-400">Renaming changes the display name only. Current members, Game Books, stats, playbook access and Way Analytics stay attached to this same team.</p>
        <label className="mt-4 block"><span className="mb-1 block text-[8px] font-black uppercase tracking-wide text-slate-500">Team name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/40" /></label>
        {error ? <div className="mt-2 rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[9px] text-rose-100">{error}</div> : null}
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/10 text-xs font-black text-slate-300">Cancel</button><button type="button" disabled={busy || !name.trim()} onClick={save} className="min-h-11 rounded-xl bg-cyan-300 text-xs font-black text-slate-950 disabled:opacity-40"><Save className="mr-1 inline h-4 w-4" />{busy ? "Saving…" : "Save name"}</button></div>
      </section>
    </div>
  );
}

function CoachBoxButton({ onOpen }) {
  return <button type="button" onClick={onOpen} className="mx-auto flex w-full max-w-6xl items-center gap-3 rounded-[1.1rem] border border-violet-300/18 bg-[linear-gradient(135deg,rgba(139,92,246,.09),rgba(34,211,238,.035))] p-3 text-left text-white transition hover:border-violet-300/30 hover:bg-violet-300/[.08]">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-violet-300/20 bg-violet-300/10 text-violet-200"><Users className="h-5 w-5" /></div>
    <div className="min-w-0 flex-1"><div className="text-[8px] font-black uppercase tracking-[.16em] text-violet-300">Coach only</div><div className="mt-0.5 text-sm font-black">Open Coaching Dashboard</div><div className="mt-0.5 text-[8px] leading-4 text-slate-500">Lineups, practice reps, coverages, private ratings, and coaching results.</div></div>
    <ArrowRight className="h-4 w-4 shrink-0 text-violet-200" />
  </button>;
}

function TeamResourceDenied({ onBack, wrongTeam = false }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#02060c] px-4 text-white">
      <section className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#07111f] p-5 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/[.06] text-amber-200"><Lock className="h-5 w-5" /></div>
        <h1 className="mt-4 text-xl font-black">Private team standard</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{wrongTeam ? "The Way We Play is not assigned to this team workspace." : "This is a private team resource. Sign in with an active membership to open it."}</p>
        <button type="button" onClick={onBack} className="mt-5 min-h-11 w-full rounded-xl bg-cyan-300 px-4 text-xs font-black text-slate-950">Back to team</button>
      </section>
    </div>
  );
}

export default function SportsTeamDashboard() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [group, setGroup] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [coachBoxOpen, setCoachBoxOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([getMemberships(), getGroups(), getSportsTeams()])
      .then(([membershipResult, groupResult, teamResult]) => {
        if (!alive) return;
        if (membershipResult.status === "fulfilled") setMemberships(Array.isArray(membershipResult.value) ? membershipResult.value : []);
        if (groupResult.status === "fulfilled") {
          const groups = Array.isArray(groupResult.value) ? groupResult.value : [];
          setGroup(groups.find((row) => Number(row.id) === Number(groupId)) || null);
        }
        if (teamResult.status === "fulfilled") {
          const teams = Array.isArray(teamResult.value) ? teamResult.value : [];
          setTeam(teams.find((row) => Number(row.group) === Number(groupId)) || null);
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [groupId, user?.id]);

  useEffect(() => {
    if (!coachBoxOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => { if (event.key === "Escape") setCoachBoxOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [coachBoxOpen]);

  const membership = useMemo(
    () => memberships.find((row) => Number(row.group) === Number(groupId) && Number(row.user) === Number(user?.id) && row.status === "ACTIVE"),
    [memberships, groupId, user?.id],
  );

  const playbookEnabled = Boolean(team?.badge_rules?.way_we_play_enabled) || legacyWayWePlayGroup(group);
  const readingPlaybook = searchParams.get("playbook") === "1";
  const readingAnalytics = searchParams.get("analytics") === "1";
  const teamPath = `/connect/groups/${groupId}/sports`;
  const canRename = RENAME_ROLES.has(membership?.role);
  const isCoach = COACH_ROLES.has(membership?.role);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  if (readingPlaybook || readingAnalytics) {
    if (!membership || !playbookEnabled) {
      return <TeamResourceDenied wrongTeam={!playbookEnabled} onBack={() => navigate(teamPath, { replace: true })} />;
    }
    if (readingAnalytics) {
      return <WayAnalyticsPanel team={team} group={group} onClose={() => navigate(teamPath, { replace: true })} />;
    }
    return <SportsPlaybook group={group} groupId={groupId} canCoach={isCoach} coachId={user?.id} onClose={() => navigate(teamPath, { replace: true })} />;
  }

  const dashboard = MANAGEMENT_ROLES.has(membership?.role)
    ? <SportsTeamManagerDashboard initialMemberships={memberships} />
    : <SportsPlayerDashboard />;

  if (!playbookEnabled || !membership) return dashboard;

  return (
    <>
      <PlaybookEntry
        group={group}
        onOpen={() => navigate(`${teamPath}?playbook=1`)}
        onAnalytics={() => navigate(`${teamPath}?analytics=1`)}
        canRename={canRename}
        onRename={() => setRenameOpen(true)}
      />
      <div className="bg-[#02060c] px-3 pt-3 sm:px-5">
        <TeamExecutionTrend
          team={team}
          canManage={isCoach}
          onOpenAnalytics={() => navigate(`${teamPath}?analytics=1`)}
        />
      </div>
      <div className="bg-[#02060c] px-3 pt-3 sm:px-5">
        {isCoach ? <CoachBoxButton onOpen={() => setCoachBoxOpen(true)} /> : <PlayerDevelopmentCard team={team} />}
      </div>
      {dashboard}

      {coachBoxOpen && isCoach ? <div className="fixed inset-0 z-[700] bg-black/75 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setCoachBoxOpen(false); }}>
        <aside className="absolute inset-y-0 right-0 w-full overflow-y-auto border-l border-violet-300/20 bg-[#02060c] shadow-[-24px_0_70px_rgba(0,0,0,.5)] sm:max-w-[1100px]">
          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#02060c]/95 px-3 pb-2.5 pt-[max(3.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-4 sm:pt-3">
            <div className="flex min-w-0 items-center gap-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-300/20 bg-violet-300/10 text-violet-200"><Users className="h-4 w-4" /></div><div className="min-w-0"><div className="text-[7px] font-black uppercase tracking-[.16em] text-violet-300">Coach only</div><div className="truncate text-sm font-black text-white">Coaching Dashboard · {group?.name || "Team"}</div></div></div>
            <button type="button" onClick={() => setCoachBoxOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-slate-300" aria-label="Close Coach Box"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-2.5 sm:p-4"><CoachWorkspace team={team} groupId={groupId} coachId={user?.id} /></div>
        </aside>
      </div> : null}

      {renameOpen ? <TeamNameEditor group={group} onClose={() => setRenameOpen(false)} onSaved={(updated) => { setGroup(updated); setRenameOpen(false); }} /> : null}
    </>
  );
}

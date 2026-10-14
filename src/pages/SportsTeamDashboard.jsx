import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Loader2, Lock } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { getGroups, getMemberships } from "../api/social";
import SportsPlayerDashboard from "./SportsPlayerDashboard";
import SportsPlaybook from "./SportsPlaybook";
import SportsTeamManagerDashboard from "./SportsTeamManagerDashboard";

const MANAGEMENT_ROLES = new Set(["OWNER", "DIRECTOR", "MANAGER", "SCOREKEEPER"]);
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const isWayWePlayGroup = (group) => normalize(group?.name).includes("bed springs baptist");

function PlaybookEntry({ group, onOpen }) {
  return (
    <div className="bg-[#02060c] px-3 pt-3 text-slate-100 sm:px-5">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-[1.45rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,.13),transparent_30%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.12),transparent_34%),linear-gradient(145deg,#07111f,#07101c)] shadow-[0_16px_50px_rgba(0,0,0,.35)]">
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3.5 text-left sm:p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[.08] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.09)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300">Team standard</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[.035] px-2 py-0.5 text-[7px] font-black uppercase tracking-[.11em] text-slate-400"><Lock className="h-2.5 w-2.5" />Team only</span>
            </div>
            <div className="mt-1 truncate text-base font-black tracking-tight text-white">The Way We Play</div>
            <div className="mt-0.5 text-[9px] leading-4 text-slate-500">Trust · Execution · Accountability · Team</div>
          </div>
          <div className="hidden shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-[.12em] text-cyan-200 sm:flex">Open playbook<ArrowRight className="h-3.5 w-3.5" /></div>
          <ArrowRight className="h-4 w-4 shrink-0 text-cyan-200 sm:hidden" />
        </button>
        <div className="border-t border-white/8 px-4 py-2 text-[8px] leading-4 text-slate-600">Private to active {group?.name || "team"} members. Built to read page-by-page on mobile.</div>
      </section>
    </div>
  );
}

function PlaybookDenied({ onBack, wrongTeam = false }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#02060c] px-4 text-white">
      <section className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-[#07111f] p-5 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/[.06] text-amber-200"><Lock className="h-5 w-5" /></div>
        <h1 className="mt-4 text-xl font-black">Team playbook</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{wrongTeam ? "The Way We Play is currently assigned only to the Bed Springs Baptist team workspace." : "This is a private team resource. Sign in with an active team membership to read it."}</p>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([getMemberships(), getGroups()])
      .then(([membershipResult, groupResult]) => {
        if (!alive) return;
        if (membershipResult.status === "fulfilled") setMemberships(Array.isArray(membershipResult.value) ? membershipResult.value : []);
        if (groupResult.status === "fulfilled") {
          const groups = Array.isArray(groupResult.value) ? groupResult.value : [];
          setGroup(groups.find((row) => Number(row.id) === Number(groupId)) || null);
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [groupId, user?.id]);

  const membership = useMemo(
    () => memberships.find((row) =>
      Number(row.group) === Number(groupId)
      && Number(row.user) === Number(user?.id)
      && row.status === "ACTIVE"
    ),
    [memberships, groupId, user?.id],
  );

  const playbookEnabled = isWayWePlayGroup(group);
  const readingPlaybook = searchParams.get("playbook") === "1";
  const teamPath = `/connect/groups/${groupId}/sports`;

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  if (readingPlaybook) {
    if (!membership || !playbookEnabled) {
      return <PlaybookDenied wrongTeam={!playbookEnabled} onBack={() => navigate(teamPath, { replace: true })} />;
    }
    return <SportsPlaybook group={group} groupId={groupId} onClose={() => navigate(teamPath, { replace: true })} />;
  }

  const dashboard = MANAGEMENT_ROLES.has(membership?.role)
    ? <SportsTeamManagerDashboard initialMemberships={memberships} />
    : <SportsPlayerDashboard />;

  if (!playbookEnabled || !membership) return dashboard;

  return (
    <>
      <PlaybookEntry group={group} onOpen={() => navigate(`${teamPath}?playbook=1`)} />
      {dashboard}
    </>
  );
}

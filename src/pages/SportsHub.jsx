import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2, Plus, Trophy, Users } from "lucide-react";

import ModeBar from "../components/ModeBar";
import SportsLeagueManager from "../components/sports/SportsLeagueManager";
import { useAuth } from "../auth/AuthContext";
import { getGroups, getMemberships } from "../api/social";
import { getSportsTeams } from "../api/sports";

const list = (value) => (Array.isArray(value) ? value : []);
const cx = (...values) => values.filter(Boolean).join(" ");
const errorText = (error) => error?.response?.data?.detail || error?.message || "Something went wrong.";

export default function SportsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = Number(user?.id || 0);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [sportsTeams, setSportsTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [groupRows, membershipRows, teamRows] = await Promise.all([
          getGroups(),
          getMemberships(),
          getSportsTeams(),
        ]);
        if (!alive) return;
        setGroups(list(groupRows));
        setMemberships(list(membershipRows));
        setSportsTeams(list(teamRows));
      } catch (err) {
        if (alive) setError(errorText(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const activeGroupIds = useMemo(
    () => new Set(memberships.filter((row) => Number(row.user) === userId && row.status === "ACTIVE").map((row) => Number(row.group))),
    [memberships, userId],
  );
  const teamGroups = groups.filter((group) => group.kind === "TEAM" && (activeGroupIds.has(Number(group.id)) || Number(group.created_by) === userId));
  const sportsByGroup = new Map(sportsTeams.map((team) => [Number(team.group), team]));

  return (
    <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
      <ModeBar title="Teams & Clubs" subtitle="SyncWorks Social" />
      <main className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-5">
        <button type="button" onClick={() => navigate("/connect")} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black"><ArrowLeft className="mr-2 inline h-4 w-4" />Back to Social</button>

        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_5%,rgba(34,211,238,.18),transparent_34%),radial-gradient(circle_at_10%_105%,rgba(139,92,246,.16),transparent_35%),#07111f] p-5 sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.15em] text-cyan-100"><Trophy className="h-4 w-4 text-amber-300" />Competition tools inside Social</div>
          <h1 className="mt-4 max-w-3xl text-3xl font-black sm:text-5xl">Softball clubs, leagues, game day and stats.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Your club starts as a SyncWorks Social group. Team tools add lineups, schedules, live scoring, leagues and analytics without creating a separate sports identity.</p>
        </section>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}

        {loading ? (
          <div className="grid min-h-56 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>
        ) : (
          <>
            <SportsLeagueManager sportsTeams={sportsTeams} />

            <section className="rounded-[1.65rem] border border-white/10 bg-[#07111f] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-black text-white">Teams & clubs in Social</h2><p className="mt-1 text-sm text-slate-400">Choose one of your Social Team groups to open or set up its softball club tools.</p></div>
                <Users className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {teamGroups.map((group) => {
                  const sports = sportsByGroup.get(Number(group.id));
                  return (
                    <button
                      type="button"
                      key={group.id}
                      onClick={() => navigate(`/connect/groups/${group.id}/sports`)}
                      className={cx("rounded-2xl border p-4 text-left transition", sports ? "border-cyan-400/20 bg-cyan-400/[.05]" : "border-white/10 bg-white/[.025]")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div><b className="text-white">{group.name}</b><div className="mt-1 text-xs text-slate-500">{group.member_count || 0} Social members</div></div>
                        <span className={cx("rounded-full px-2 py-1 text-[9px] font-black uppercase", sports ? "bg-emerald-300/15 text-emerald-100" : "bg-white/[.06] text-slate-400")}>{sports ? sports.sport : "Set up"}</span>
                      </div>
                      <div className="mt-5 flex items-center justify-between text-xs font-black text-cyan-100"><span>{sports ? "Open club dashboard" : "Set up softball club"}</span><ChevronRight className="h-4 w-4" /></div>
                    </button>
                  );
                })}
              </div>
              {!teamGroups.length ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center">
                  <Plus className="mx-auto h-6 w-6 text-slate-500" />
                  <b className="mt-3 block text-white">Create a Team group first</b>
                  <p className="mt-1 text-sm text-slate-500">Go back to Social → Groups → Create and choose Team. Then you can add softball club tools to that Social group.</p>
                  <button type="button" onClick={() => navigate("/connect")} className="mt-4 min-h-11 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950">Open Social Groups</button>
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

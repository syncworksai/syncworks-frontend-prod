import React, { useEffect, useMemo, useState } from "react";
import { CircleDot, LogIn, Radio, Share2, UserPlus, Users } from "lucide-react";
import { useParams } from "react-router-dom";

import { followGroup, unfollowGroup } from "../api/social";
import { getGameCastPreview, getPublicGameCast } from "../api/sports";
import { useAuth } from "../auth/AuthContext";

const list = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0);
const rate = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function LivePill({ status }) {
  const live = status === "LIVE";
  return <span className={cx(
    "inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.13em]",
    live ? "bg-emerald-300 text-slate-950" : "border border-white/10 bg-white/[.04] text-slate-300",
  )}>{live ? "● Live" : status || "GameCast"}</span>;
}

function BaseDiamond({ first, second, third }) {
  const base = "absolute h-7 w-7 rotate-45 rounded-[3px] border";
  return (
    <div className="relative mx-auto h-32 w-44">
      <div className="absolute left-1/2 top-[60%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/10 bg-emerald-300/[.025]" />
      <div className={cx(base, "left-[70%] top-[53%]", first ? "border-amber-200 bg-amber-300/80 shadow-[0_0_18px_rgba(252,211,77,.28)]" : "border-white/25 bg-white/[.04]")} />
      <div className={cx(base, "left-[42%] top-[25%]", second ? "border-amber-200 bg-amber-300/80 shadow-[0_0_18px_rgba(252,211,77,.28)]" : "border-white/25 bg-white/[.04]")} />
      <div className={cx(base, "left-[14%] top-[53%]", third ? "border-amber-200 bg-amber-300/80 shadow-[0_0_18px_rgba(252,211,77,.28)]" : "border-white/25 bg-white/[.04]")} />
      <div className="absolute bottom-1 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border border-white/35 bg-white/15" />
      <div className="absolute inset-x-0 bottom-0 text-center text-[7px] font-black uppercase tracking-[.12em] text-slate-600">Live bases</div>
    </div>
  );
}

function AnonymousGameCast({ preview, token, loading, error }) {
  const next = encodeURIComponent(`/gamecast/${token}`);
  const game = preview?.game || {};
  const hasScore = game.runs_for !== null && game.runs_for !== undefined;

  return (
    <div className="min-h-screen bg-[#02060c] px-3 py-5 text-slate-100 sm:px-5 sm:py-10">
      <main className="mx-auto max-w-xl space-y-3">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,.17),transparent_35%),#07111f] p-4 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.17em] text-cyan-300"><Radio className="h-4 w-4" />SyncWorks GameCast</div>
            {preview ? <LivePill status={game.status} /> : null}
          </div>

          {loading ? <div className="grid min-h-44 place-items-center text-sm font-black text-cyan-100">Loading GameCast…</div> : null}
          {error ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}

          {preview ? (
            <>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                <div><div className="truncate text-[10px] font-black uppercase text-cyan-200">{game.team_name}</div><div className="mt-1 text-5xl font-black text-white">{hasScore ? game.runs_for : "—"}</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-[8px] font-black uppercase tracking-wide text-slate-500">{game.current_inning ? `Inn ${game.current_inning}` : "Live game"}</div>
                  <div className="mt-1 text-[10px] font-black text-white">{game.outs !== null && game.outs !== undefined ? `${game.outs} OUT${game.outs === 1 ? "" : "S"}` : "GameCast"}</div>
                </div>
                <div><div className="truncate text-[10px] font-black uppercase text-slate-400">{game.opponent_name}</div><div className="mt-1 text-5xl font-black text-white">{hasScore ? game.runs_against : "—"}</div></div>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-300/15 bg-violet-300/[.04] p-4 text-center">
                <div className="text-sm font-black text-white">Create a free SyncWorks account to watch live</div>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">Your account returns you directly to this GameCast so you can follow the live score, current batter, plays and team updates.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a href={`/register?next=${next}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950"><UserPlus className="h-4 w-4" />Create free account</a>
                  <a href={`/login?next=${next}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-white"><LogIn className="h-4 w-4" />Sign in</a>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default function PublicGameCast() {
  const { token } = useParams();
  const { user, booting } = useAuth();
  const [data, setData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (booting || user?.id) return undefined;
    let alive = true;
    setLoadingPreview(true);
    getGameCastPreview(token)
      .then((row) => { if (alive) { setPreview(row); setError(""); } })
      .catch(() => { if (alive) setError("This GameCast is unavailable or sharing has been turned off."); })
      .finally(() => { if (alive) setLoadingPreview(false); });
    return () => { alive = false; };
  }, [token, user?.id, booting]);

  async function load() {
    try {
      setData(await getPublicGameCast(token));
      setError("");
    } catch {
      setError("This GameCast is unavailable or sharing has been turned off.");
    }
  }

  useEffect(() => {
    if (!user?.id) return undefined;
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [token, user?.id]);

  const innings = useMemo(() => {
    const map = new Map(list(data?.game?.inning_grid).map((row) => [num(row.inning), row]));
    const max = Math.max(7, num(data?.game?.current_inning), ...map.keys());
    return Array.from({ length: max }, (_, index) => ({ inning: index + 1, ...(map.get(index + 1) || {}) }));
  }, [data]);

  const currentBatterStats = useMemo(() => {
    const playerId = num(data?.game?.current_batter?.id);
    return list(data?.player_stats).find((row) => num(row?.player?.id) === playerId) || null;
  }, [data]);

  async function share() {
    const shareData = { title: `${data?.game?.team_name || "SyncWorks"} GameCast`, text: "Follow the live game on SyncWorks.", url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch {}
    }
    await navigator.clipboard?.writeText?.(window.location.href);
  }

  function facebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank", "noopener,noreferrer");
  }

  async function toggleFollow() {
    const groupId = data?.game?.group_id;
    if (!groupId || followBusy || data?.gamecast?.allow_follow === false) return;
    setFollowBusy(true);
    try {
      const group = data?.game?.is_following ? await unfollowGroup(groupId) : await followGroup(groupId);
      setData((current) => ({
        ...current,
        game: {
          ...current.game,
          follower_count: group?.follower_count ?? current.game.follower_count,
          is_following: !!group?.is_following,
        },
      }));
    } catch {
      setError("We could not update your follow status. Please try again.");
    } finally {
      setFollowBusy(false);
    }
  }

  if (booting) return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200">Loading SyncWorks…</div>;
  if (!user?.id) return <AnonymousGameCast preview={preview} token={token} loading={loadingPreview} error={error} />;

  if (error && !data) return <div className="min-h-screen bg-[#02060c] p-5 text-white"><div className="mx-auto max-w-xl rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4">{error}</div></div>;
  if (!data) return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200">Loading GameCast…</div>;

  const game = data.game || {};
  const settings = data.gamecast || {};
  const plays = list(data.plays).slice().reverse();
  const lineup = list(data.lineup);

  return (
    <div className="min-h-screen bg-[#02060c] pb-20 text-slate-100">
      <main className="mx-auto max-w-7xl space-y-3 px-2.5 py-3 sm:px-4">
        <header className="sticky top-0 z-30 rounded-2xl border border-cyan-300/20 bg-[#07111f]/95 p-3 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.15em] text-cyan-300"><Radio className="h-4 w-4" />SyncWorks GameCast</div>
            <div className="flex items-center gap-2"><span className="text-[8px] text-slate-600">Updates every 3 sec</span><LivePill status={game.status} /></div>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div><div className="truncate text-[9px] font-black uppercase text-cyan-200">{game.team_name}</div><div className="text-4xl font-black text-white sm:text-5xl">{game.runs_for ?? "—"}</div></div>
            <div className="min-w-[6.8rem] rounded-xl border border-white/10 bg-black/20 px-2 py-2">
              <div className="text-[8px] font-black uppercase text-slate-500">Inning {game.current_inning ?? "—"}</div>
              <div className="mt-1 text-[10px] font-black text-white">{game.outs ?? "—"} OUT{num(game.outs) === 1 ? "" : "S"}</div>
              <div className="mt-1.5 flex justify-center gap-1">{[0,1,2].map((row) => <span key={row} className={cx("h-2.5 w-2.5 rounded-full border", row < num(game.outs) ? "border-rose-200 bg-rose-300" : "border-white/15")} />)}</div>
            </div>
            <div><div className="truncate text-[9px] font-black uppercase text-slate-400">{game.opponent_name}</div><div className="text-4xl font-black text-white sm:text-5xl">{game.runs_against ?? "—"}</div></div>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-100">{error}</div> : null}

        <div className="grid gap-3 lg:grid-cols-[.85fr_1.3fr_1fr]">
          <div className="space-y-3">
            <section className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
              <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-500">Live situation</div>
              <BaseDiamond first={game.runner_on_first} second={game.runner_on_second} third={game.runner_on_third} />
              <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-3">
                <div className="text-[8px] font-black uppercase text-cyan-300">At bat</div>
                {game.current_batter ? (
                  <>
                    <div className="mt-1 text-lg font-black text-white">#{game.current_batter.jersey_number || "—"} {game.current_batter.display_name}</div>
                    <div className="text-[9px] text-slate-500">{game.current_batter.primary_position || "Player"} · spot {game.current_batter_order}</div>
                    {currentBatterStats ? <div className="mt-2 grid grid-cols-4 gap-1">{[["AVG",rate(currentBatterStats.avg)],["OBP",rate(currentBatterStats.obp)],["OPS",rate(currentBatterStats.ops)],["RBI",num(currentBatterStats.rbi)]].map(([label,value]) => <div key={label} className="rounded-lg border border-white/8 bg-black/15 p-1.5 text-center"><div className="text-[6px] font-black text-slate-600">{label}</div><b className="text-[10px] text-white">{value}</b></div>)}</div> : null}
                  </>
                ) : <div className="mt-1 text-xs text-slate-500">Waiting for the next batter.</div>}
              </div>
            </section>

            {settings.allow_follow !== false ? <section className="rounded-2xl border border-violet-300/15 bg-[#07111f] p-3 text-center">
              <Users className="mx-auto h-5 w-5 text-violet-300" />
              <div className="mt-1 text-xl font-black text-white">{num(game.follower_count)}</div>
              <div className="text-[8px] font-black uppercase tracking-wide text-slate-500">Team followers</div>
              <button type="button" disabled={followBusy} onClick={toggleFollow} className={cx("mt-2 min-h-10 w-full rounded-xl border px-3 text-[9px] font-black uppercase", game.is_following ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-violet-300/25 bg-violet-300/10 text-violet-100")}>{followBusy ? "Saving…" : game.is_following ? "Following" : "+ Follow team"}</button>
            </section> : null}
          </div>

          <div className="space-y-3">
            <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f] p-2.5">
              <div className="mb-2 text-[8px] font-black uppercase tracking-[.14em] text-slate-500">Live line score</div>
              <table className="min-w-full border-collapse text-center text-[9px]">
                <thead><tr><th className="sticky left-0 bg-[#07111f] px-2 py-1 text-left text-slate-500">TEAM</th>{innings.map((row) => <th key={row.inning} className="min-w-8 px-1 py-1 text-slate-500">{row.inning}</th>)}<th className="px-2 text-cyan-200">R</th><th className="px-2 text-cyan-200">H</th></tr></thead>
                <tbody>
                  <tr className="border-t border-white/10"><td className="sticky left-0 bg-[#07111f] px-2 py-2 text-left font-black text-white">{game.team_name}</td>{innings.map((row) => <td key={row.inning} className="border-l border-white/5 px-1">{row.runs ?? "—"}</td>)}<td className="font-black text-cyan-100">{game.runs_for}</td><td className="font-black text-cyan-100">{innings.reduce((sum,row)=>sum+num(row.hits),0)}</td></tr>
                  <tr className="border-t border-white/10"><td className="sticky left-0 bg-[#07111f] px-2 py-2 text-left font-black text-slate-300">{game.opponent_name}</td>{innings.map((row) => <td key={row.inning} className="border-l border-white/5 px-1">{row.opponent_runs ?? "—"}</td>)}<td className="font-black text-white">{game.runs_against}</td><td className="font-black text-white">{innings.reduce((sum,row)=>sum+num(row.opponent_hits),0)}</td></tr>
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
              <div className="mb-2 flex items-center justify-between"><div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-500">Live play feed</div><CircleDot className="h-4 w-4 text-emerald-300" /></div>
              <div className="space-y-1.5">
                {plays.map((play) => <div key={play.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[.025] px-2.5 py-2">
                  <div className="min-w-0"><b className="block truncate text-[10px] text-white">{play.player}</b><div className="text-[8px] text-slate-500">Inning {play.inning}{play.spray_zone ? ` · ${play.spray_zone.replaceAll("_"," ")}` : ""}</div></div>
                  <div className="text-right"><b className="text-[10px] text-cyan-200">{play.result_label || play.result}</b>{num(play.runs_scored) ? <div className="text-[7px] text-emerald-300">+{num(play.runs_scored)} run{num(play.runs_scored) === 1 ? "" : "s"}</div> : null}</div>
                </div>)}
                {!plays.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[10px] text-slate-600">Live plays will appear here as the scorekeeper records the Game Book.</div> : null}
              </div>
            </section>
          </div>

          <div className="space-y-3">
            {lineup.length ? <section className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
              <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-500">Lineup</div>
              <div className="mt-2 space-y-1">
                {lineup.map((spot) => {
                  const stats = list(data.player_stats).find((row) => num(row?.player?.id) === num(spot?.player?.id));
                  const active = num(spot.batting_order) === num(game.current_batter_order);
                  return <div key={spot.batting_order} className={cx("grid grid-cols-[1.8rem_1fr_auto] items-center gap-2 rounded-xl border px-2 py-2", active ? "border-cyan-300/25 bg-cyan-300/[.06]" : "border-white/8 bg-black/10")}>
                    <div className="text-center text-[9px] font-black text-cyan-200">{spot.batting_order}</div>
                    <div className="min-w-0"><b className="block truncate text-[10px] text-white">#{spot.player?.jersey_number || "—"} {spot.player?.display_name}</b><span className="text-[8px] text-slate-500">{spot.defensive_position || spot.player?.primary_position || "—"}</span></div>
                    {stats ? <div className="text-right"><b className="block text-[9px] text-white">{rate(stats.avg)}</b><span className="text-[7px] text-slate-600">AVG</span></div> : null}
                  </div>;
                })}
              </div>
            </section> : null}

            <section className="rounded-2xl border border-cyan-300/15 bg-[#07111f] p-3">
              <div className="text-[8px] font-black uppercase tracking-[.14em] text-cyan-300">Share this GameCast</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={share} className="min-h-11 rounded-xl bg-cyan-300 text-[10px] font-black text-slate-950"><Share2 className="mr-1 inline h-4 w-4" />Share / Copy</button>
                <button type="button" onClick={facebook} className="min-h-11 rounded-xl border border-white/10 bg-white/[.04] text-[10px] font-black text-white">Facebook</button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

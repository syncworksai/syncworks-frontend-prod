import React, { useEffect, useMemo, useState } from "react";
import { Download, Radio, Share2 } from "lucide-react";
import { useParams } from "react-router-dom";

import { followGroup, unfollowGroup } from "../api/social";
import { getPublicGameCast } from "../api/sports";
import { useAuth } from "../auth/AuthContext";
import SoftballDefenseField from "../components/sports/SoftballDefenseField";
import { saveGameBookImage } from "../utils/sportsGameBookImage";

const list = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0);
const cx = (...values) => values.filter(Boolean).join(" ");

function resultTone(result) {
  if (["1B", "2B", "3B", "HR"].includes(result)) return "bg-emerald-300/15 text-emerald-100";
  if (result === "BB") return "bg-violet-300/15 text-violet-100";
  if (["OUT", "K"].includes(result)) return "bg-white/[.045] text-slate-300";
  return "bg-amber-300/10 text-amber-100";
}

function PlayCell({ play }) {
  return (
    <div className={cx("min-w-[3.4rem] rounded-lg px-1.5 py-1 text-center", resultTone(play.result))}>
      <div className="text-[8px] font-black">{play.result}</div>
      <div className="mt-0.5 text-[6px] font-black opacity-80">
        {num(play.rbi) ? `${num(play.rbi)} RBI` : ""}
        {num(play.rbi) && num(play.runs_scored) ? " · " : ""}
        {num(play.runs_scored) ? `+${num(play.runs_scored)} R` : ""}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
      <div className="text-[7px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-base font-black text-white">{value}</div>
    </div>
  );
}

export default function PublicGameCast() {
  const { token } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [tab, setTab] = useState("GAME");
  const [error, setError] = useState("");

  async function load() {
    try {
      setData(await getPublicGameCast(token));
      setError("");
    } catch {
      setError("This GameCast is unavailable or sharing has been turned off.");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  const game = data?.game || {};
  const plays = list(data?.book);
  const bookPlayers = list(data?.book_players);
  const lineup = list(data?.lineup);
  const bench = list(data?.bench);
  const recent = list(data?.plays);

  const innings = useMemo(() => {
    const map = new Map(list(game?.inning_grid).map((row) => [num(row.inning), row]));
    const max = Math.max(7, num(game?.current_inning), ...map.keys());
    return Array.from({ length: max }, (_, index) => ({ inning: index + 1, ...(map.get(index + 1) || {}) }));
  }, [game?.inning_grid, game?.current_inning]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const play of plays) {
      const key = `${num(play.player)}-${num(play.inning)}`;
      const rows = map.get(key) || [];
      rows.push(play);
      map.set(key, rows);
    }
    return map;
  }, [plays]);

  async function share() {
    const shareData = { title: `${game?.team_name || "SyncWorks"} GameCast`, text: "Follow the game on SyncWorks.", url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch {}
    }
    await navigator.clipboard?.writeText?.(window.location.href);
  }

  function facebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank", "noopener,noreferrer");
  }

  async function saveImage() {
    if (exportBusy) return;
    setExportBusy(true);
    setError("");
    try {
      await saveGameBookImage({
        game,
        bookPlayers,
        plays,
        innings,
        gameTotals: data?.game_totals,
      });
    } catch (err) {
      setError(err?.message || "We could not create the Game Book image.");
    } finally {
      setExportBusy(false);
    }
  }

  async function toggleFollow() {
    if (!user?.id) {
      window.location.assign("/register?next="+encodeURIComponent("/gamecast/"+token));
      return;
    }
    const groupId = game?.group_id;
    if (!groupId || followBusy) return;
    setFollowBusy(true);
    try {
      const group = game?.is_following
        ? await unfollowGroup(groupId)
        : await followGroup(groupId);
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

  if (error && !data) return <div className="min-h-screen bg-[#02060c] p-5 text-white"><div className="mx-auto max-w-xl rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4">{error}</div></div>;
  if (!data) return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200">Loading GameCast…</div>;

  const rule = game.rule_set;
  const live = game.status === "LIVE";
  const final = game.status === "FINAL";
  const recentThree = recent.slice(-3).reverse();

  return (
    <div className="min-h-screen bg-[#02060c] pb-10 text-slate-100">
      <main className="mx-auto max-w-4xl space-y-3 px-3 py-4">
        {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2.5 text-[10px] text-rose-100">{error}</div> : null}

        {game.status === "SCHEDULED" ? (
          <section role="status" className="rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-300/10 to-cyan-300/[.04] p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">Pregame · Watch link active</span>
            <h1 className="mt-2 text-xl font-black text-white">{game.team_name} vs {game.opponent_name}</h1>
            <p className="mt-2 text-sm text-amber-100">{game.start_at ? new Date(game.start_at).toLocaleString([], {dateStyle:"full",timeStyle:"short"}) : "Game time will be announced"}{game.venue_name ? " · "+game.venue_name : ""}</p>
            <p className="mt-2 text-[11px] leading-5 text-slate-300">This same link becomes the live Game Center when the scorekeeper starts the game.</p>
            <button type="button" onClick={share} className="mt-3 min-h-11 w-full rounded-xl bg-amber-300 text-xs font-black text-slate-950"><Share2 className="mr-1 inline h-4 w-4"/>Share the pregame watch link</button>
          </section>
        ) : null}

        <header className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(34,211,238,.08),rgba(168,85,247,.06)),#07111f] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.15em] text-emerald-300"><Radio className="h-4 w-4" />SyncWorks GameCast</div>
            <span className={cx("rounded-full px-2 py-1 text-[8px] font-black", game.status==="SCHEDULED" ? "bg-amber-300/10 text-amber-200" : final ? "bg-emerald-300/10 text-emerald-100" : "bg-rose-300/10 text-rose-100")}>{game.status==="SCHEDULED"?"UPCOMING":game.status}</span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div><div className="truncate text-[10px] text-slate-400">{game.team_name}</div><div className="text-4xl font-black text-cyan-100">{game.runs_for}</div></div>
            <div className="text-[9px] font-black text-slate-500">{final ? "FINAL" : `INN ${game.current_inning}`}<br />{final ? "" : `${game.outs} OUT`}</div>
            <div><div className="truncate text-[10px] text-slate-400">{game.opponent_name}</div><div className="text-4xl font-black text-white">{game.runs_against}</div></div>
          </div>
          <div className="mt-2 text-center text-[10px] text-slate-500">
            {game.status==="SCHEDULED"
              ? "Awaiting first pitch"
              : live && game.current_batter
                ? `At bat: ${game.current_batter.display_name}`
                : final
                  ? "Completed game · full book and game stats available below"
                  : "Game updates automatically"}
          </div>
          {game.group_id ? <div className="mt-3 flex items-center justify-center gap-2">
            <button type="button" disabled={followBusy} onClick={toggleFollow} className={cx("min-h-9 rounded-full border px-4 text-[9px] font-black uppercase tracking-wide", game.is_following ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100")}>
              {followBusy ? "Saving…" : game.is_following ? "Following" : user?.id ? "+ Follow team" : "+ Join free to follow"}
            </button>
            <span className="text-[9px] text-slate-500">{num(game.follower_count)} follower{num(game.follower_count) === 1 ? "" : "s"}</span>
          </div> : null}
        </header>

        <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#07111f] p-1">
          {["GAME","FIELD","BOOK","STATS"].map((name) => (
            <button key={name} type="button" onClick={()=>setTab(name)} className={cx("min-h-10 rounded-lg text-[9px] font-black", tab===name ? "bg-cyan-300 text-slate-950" : "text-slate-400")}>{name}</button>
          ))}
        </div>

        {!user?.id ? <section className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.04] p-3">
          <b className="text-xs font-black text-cyan-100">You&apos;re watching as a guest</b>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">GameCast is free to watch. Create an optional account to follow the team and receive game alerts.</p>
        </section> : null}

        {tab === "GAME" ? (
          <div className="space-y-3">
            <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f] p-2.5">
              <table className="min-w-full border-collapse text-center text-[9px]">
                <thead><tr><th className="sticky left-0 bg-[#07111f] px-2 py-1 text-left text-slate-500">TEAM</th>{innings.map((row) => <th key={row.inning} className="min-w-8 px-1 py-1 text-slate-500">{row.inning}</th>)}<th className="px-2 text-cyan-200">R</th><th className="px-2 text-cyan-200">H</th></tr></thead>
                <tbody>
                  <tr className="border-t border-white/10"><td className="sticky left-0 bg-[#07111f] px-2 py-2 text-left font-black text-white">{game.team_name}</td>{innings.map((row) => <td key={row.inning} className="border-l border-white/5 px-1">{num(row.runs)}</td>)}<td className="font-black text-cyan-100">{game.runs_for}</td><td className="font-black text-cyan-100">{innings.reduce((sum,row)=>sum+num(row.hits),0)}</td></tr>
                  <tr className="border-t border-white/10"><td className="sticky left-0 bg-[#07111f] px-2 py-2 text-left font-black text-slate-300">{game.opponent_name}</td>{innings.map((row) => <td key={row.inning} className="border-l border-white/5 px-1">{num(row.opponent_runs)}</td>)}<td className="font-black text-white">{game.runs_against}</td><td className="font-black text-white">{innings.reduce((sum,row)=>sum+num(row.opponent_hits),0)}</td></tr>
                </tbody>
              </table>
            </section>

            {lineup.length ? <SoftballDefenseField lineup={lineup} bench={bench} title="Defense on the field" compact /> : null}

            <section className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[9px] font-black uppercase tracking-wide text-slate-500">Latest plays</div><button type="button" onClick={()=>setTab("BOOK")} className="text-[9px] font-black text-cyan-200">Full Game Book →</button></div>
              <div className="space-y-1.5">
                {recentThree.map((play) => <div key={play.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[.025] px-2.5 py-2"><div><b className="text-[10px] text-white">{play.player}</b><div className="text-[8px] text-slate-500">Inning {play.inning}</div></div><b className="text-[10px] text-cyan-200">{play.result_label || play.result}</b></div>)}
                {!recentThree.length ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-slate-500">No plays recorded yet.</div> : null}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "FIELD" ? (
          <div className="space-y-3">
            <SoftballDefenseField lineup={lineup} bench={bench} title={final ? "Final defensive alignment" : "Defense on the field"} />
            <section className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
              <div className="text-[9px] font-black uppercase tracking-wide text-cyan-300">Batting lineup</div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {lineup.map((spot) => <div key={spot.id || spot.player} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2"><div className="text-center text-lg font-black text-cyan-200">{spot.batting_order}</div><div className="min-w-0"><b className="block truncate text-[10px] text-white">#{spot.player_detail?.jersey_number || "—"} {spot.player_detail?.display_name}</b><span className="text-[8px] text-slate-500">{spot.player_detail?.primary_position || "Utility"}</span></div><span className="rounded-lg border border-white/10 px-2 py-1 text-[8px] font-black text-slate-300">{spot.defensive_position || "EH"}</span></div>)}
                {!lineup.length ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-slate-500 sm:col-span-2">Lineup has not been published yet.</div> : null}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "BOOK" ? (
          <section className="rounded-2xl border border-white/10 bg-[#07111f] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div><div className="text-[9px] font-black uppercase tracking-wide text-cyan-300">Digital Game Book</div><div className="mt-0.5 text-[8px] text-slate-500">Swipe innings left/right. Player names stay pinned.</div></div>
              <button type="button" disabled={exportBusy || !bookPlayers.length} onClick={saveImage} className="min-h-9 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-2.5 text-[9px] font-black text-cyan-100 disabled:opacity-40"><Download className="mr-1 inline h-3.5 w-3.5"/>{exportBusy ? "Creating…" : "Save image"}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-max border-collapse text-center text-[8px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 min-w-32 bg-[#07111f] px-2 py-2 text-left text-slate-500">PLAYER</th>
                    {innings.map((row)=><th key={row.inning} className="min-w-16 border-l border-white/5 px-1 py-2 text-slate-500">{row.inning}</th>)}
                    <th className="border-l border-cyan-300/10 px-2 text-cyan-200">H/AB</th>
                    <th className="border-l border-cyan-300/10 px-2 text-cyan-200">R</th>
                    <th className="border-l border-cyan-300/10 px-2 text-cyan-200">RBI</th>
                    <th className="border-l border-cyan-300/10 px-2 text-cyan-200">HR</th>
                  </tr>
                </thead>
                <tbody>
                  {bookPlayers.map((row) => (
                    <tr key={row.player} className="border-t border-white/5">
                      <td className="sticky left-0 z-10 max-w-32 bg-[#07111f] px-2 py-2 text-left">
                        <b className="block truncate text-[9px] text-white">{row.batting_order ? `${row.batting_order}. ` : ""}{row.player_detail?.display_name}</b>
                        <span className="text-[7px] text-slate-500">#{row.player_detail?.jersey_number || "—"} · {row.player_detail?.primary_position || "—"}</span>
                      </td>
                      {innings.map((inning) => {
                        const rows = cellMap.get(`${num(row.player)}-${num(inning.inning)}`) || [];
                        return <td key={inning.inning} className="border-l border-white/5 px-1 py-1"><div className="flex justify-center gap-1">{rows.map((play)=><PlayCell key={play.id} play={play}/>)}</div></td>;
                      })}
                      <td className="border-l border-cyan-300/10 px-2 font-black text-cyan-100">{num(row.stats?.h)}/{num(row.stats?.ab)}</td>
                      <td className="border-l border-white/5 px-2 font-black text-slate-200">{num(row.stats?.runs)}</td>
                      <td className="border-l border-white/5 px-2 font-black text-slate-200">{num(row.stats?.rbi)}</td>
                      <td className="border-l border-white/5 px-2 font-black text-slate-200">{num(row.stats?.hr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!bookPlayers.length ? <div className="p-6 text-center text-[10px] text-slate-500">The digital book will appear as plays are recorded.</div> : null}
            </div>
          </section>
        ) : null}

        {tab === "STATS" ? (
          <div className="space-y-3">
            <section className="grid grid-cols-5 gap-1.5">
              <Metric label="H" value={num(data?.game_totals?.h)} />
              <Metric label="R" value={num(game.runs_for)} />
              <Metric label="RBI" value={num(data?.game_totals?.rbi)} />
              <Metric label="HR" value={num(data?.game_totals?.hr)} />
              <Metric label="PA" value={num(data?.game_totals?.pa)} />
            </section>
            <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f]">
              <table className="min-w-[680px] w-full text-center text-[9px]">
                <thead className="bg-[#091421] text-slate-500"><tr><th className="sticky left-0 bg-[#091421] p-2 text-left">PLAYER</th><th>PA</th><th>AB</th><th>H</th><th>R</th><th>RBI</th><th>HR</th></tr></thead>
                <tbody>{bookPlayers.map((row)=><tr key={row.player} className="border-t border-white/5"><td className="sticky left-0 bg-[#07111f] p-2 text-left font-black text-white">{row.player_detail?.display_name}</td><td>{num(row.stats?.pa)}</td><td>{num(row.stats?.ab)}</td><td className="font-black text-cyan-100">{num(row.stats?.h)}</td><td>{num(row.stats?.runs)}</td><td>{num(row.stats?.rbi)}</td><td>{num(row.stats?.hr)}</td></tr>)}</tbody>
              </table>
            </section>
          </div>
        ) : null}

        {rule ? <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-3"><div className="text-[8px] font-black uppercase text-amber-300">Game rules · {rule.name}</div><div className="mt-1 text-[10px] text-slate-300">{rule.home_run_rule === "FIXED" ? `${rule.home_run_limit} HR cap` : rule.home_run_rule === "ONE_UP" ? `One-up · max +${rule.home_run_max_ahead}` : "Unlimited HR"} · HR {game.home_runs_for}-{game.home_runs_against}</div></section> : null}

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={share} className="min-h-10 rounded-xl bg-cyan-300 text-[10px] font-black text-slate-950"><Share2 className="mr-1 inline h-4 w-4" />Share</button>
          <button type="button" onClick={facebook} className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] text-[10px] font-black text-white">Facebook</button>
          <button type="button" disabled={exportBusy || !bookPlayers.length} onClick={saveImage} className="min-h-10 rounded-xl border border-violet-300/20 bg-violet-300/[.05] text-[10px] font-black text-violet-100 disabled:opacity-40"><Download className="mr-1 inline h-4 w-4"/>{exportBusy ? "Creating…" : "Save book"}</button>
        </div>
      </main>
    </div>
  );
}

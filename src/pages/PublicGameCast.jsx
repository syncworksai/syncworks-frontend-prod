import React, { useEffect, useMemo, useState } from "react";
import { Radio, Share2 } from "lucide-react";
import { useParams } from "react-router-dom";

import { getPublicGameCast } from "../api/sports";

const list = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0);

export default function PublicGameCast() {
  const { token } = useParams();
  const [data, setData] = useState(null);
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
  }, [token]);

  const innings = useMemo(() => {
    const map = new Map(list(data?.game?.inning_grid).map((row) => [num(row.inning), row]));
    const max = Math.max(7, num(data?.game?.current_inning), ...map.keys());
    return Array.from({ length: max }, (_, index) => ({ inning: index + 1, ...(map.get(index + 1) || {}) }));
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

  if (error) return <div className="min-h-screen bg-[#02060c] p-5 text-white"><div className="mx-auto max-w-xl rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4">{error}</div></div>;
  if (!data) return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200">Loading GameCast…</div>;

  const game = data.game || {};
  const rule = game.rule_set;

  return (
    <div className="min-h-screen bg-[#02060c] pb-10 text-slate-100">
      <main className="mx-auto max-w-3xl space-y-3 px-3 py-4">
        <header className="rounded-2xl border border-cyan-300/20 bg-[#07111f] p-3">
          <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.15em] text-emerald-300"><Radio className="h-4 w-4" />SyncWorks GameCast</div><span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[8px] font-black text-emerald-200">{game.status}</span></div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div><div className="truncate text-[10px] text-slate-400">{game.team_name}</div><div className="text-4xl font-black text-cyan-100">{game.runs_for}</div></div>
            <div className="text-[9px] font-black text-slate-500">INN {game.current_inning}<br />{game.outs} OUT</div>
            <div><div className="truncate text-[10px] text-slate-400">{game.opponent_name}</div><div className="text-4xl font-black text-white">{game.runs_against}</div></div>
          </div>
          <div className="mt-2 text-center text-[10px] text-slate-500">{game.current_batter ? `At bat: ${game.current_batter.display_name}` : "Game updates automatically"}</div>
        </header>

        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f] p-2.5">
          <table className="min-w-full border-collapse text-center text-[9px]">
            <thead><tr><th className="sticky left-0 bg-[#07111f] px-2 py-1 text-left text-slate-500">TEAM</th>{innings.map((row) => <th key={row.inning} className="min-w-8 px-1 py-1 text-slate-500">{row.inning}</th>)}<th className="px-2 text-cyan-200">R</th><th className="px-2 text-cyan-200">H</th></tr></thead>
            <tbody>
              <tr className="border-t border-white/10"><td className="sticky left-0 bg-[#07111f] px-2 py-2 text-left font-black text-white">{game.team_name}</td>{innings.map((row) => <td key={row.inning} className="border-l border-white/5 px-1">{row.runs ?? "—"}</td>)}<td className="font-black text-cyan-100">{game.runs_for}</td><td className="font-black text-cyan-100">{innings.reduce((sum,row)=>sum+num(row.hits),0)}</td></tr>
              <tr className="border-t border-white/10"><td className="sticky left-0 bg-[#07111f] px-2 py-2 text-left font-black text-slate-300">{game.opponent_name}</td>{innings.map((row) => <td key={row.inning} className="border-l border-white/5 px-1">{row.opponent_runs ?? "—"}</td>)}<td className="font-black text-white">{game.runs_against}</td><td className="font-black text-white">{innings.reduce((sum,row)=>sum+num(row.opponent_hits),0)}</td></tr>
            </tbody>
          </table>
        </section>

        {rule ? <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-3"><div className="text-[8px] font-black uppercase text-amber-300">Game rules · {rule.name}</div><div className="mt-1 text-[10px] text-slate-300">{rule.home_run_rule === "FIXED" ? `${rule.home_run_limit} HR cap` : rule.home_run_rule === "ONE_UP" ? `One-up · max +${rule.home_run_max_ahead}` : "Unlimited HR"} · HR {game.home_runs_for}-{game.home_runs_against}</div></section> : null}

        <section className="rounded-2xl border border-white/10 bg-[#07111f] p-3">
          <div className="mb-2 text-[9px] font-black uppercase tracking-wide text-slate-500">Recent plays</div>
          <div className="space-y-1.5">{list(data.plays).slice(-12).reverse().map((play) => <div key={play.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[.025] px-2.5 py-2"><div><b className="text-[10px] text-white">{play.player}</b><div className="text-[8px] text-slate-500">Inning {play.inning}</div></div><b className="text-[10px] text-cyan-200">{play.result_label || play.result}</b></div>)}</div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={share} className="min-h-10 rounded-xl bg-cyan-300 text-[10px] font-black text-slate-950"><Share2 className="mr-1 inline h-4 w-4" />Share</button>
          <button type="button" onClick={facebook} className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] text-[10px] font-black text-white">Share to Facebook</button>
        </div>
      </main>
    </div>
  );
}

import React, { useState } from "react";
import api from "../api/client";

export default function EdgeResearchLab() {
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/edge/research/mlb/backtest/?days=${days}&max_games=100`);
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Backtest could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">EDGE Research Lab</div>
          <h2 className="mt-1 text-2xl font-black text-white">Test the comeback theory</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Replays completed MLB game states and compares the experimental model probability with what actually happened. This is calibration research, not a live-money result.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-black text-white">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
          </select>
          <button type="button" onClick={run} disabled={loading} className="min-h-10 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100 disabled:opacity-50">{loading ? "Running…" : "Run test"}</button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div> : null}
      {data ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Games</div><div className="mt-2 text-2xl font-black text-white">{data.games}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Game states</div><div className="mt-2 text-2xl font-black text-white">{data.states}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Brier score</div><div className="mt-2 text-2xl font-black text-white">{data.brier_score ?? "—"}</div></div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-white/[.03] text-[10px] uppercase tracking-[.12em] text-slate-500"><tr><th className="p-3">Situation</th><th className="p-3">Samples</th><th className="p-3">Model</th><th className="p-3">Actual</th><th className="p-3">Gap</th></tr></thead>
              <tbody>{data.buckets?.map((row) => <tr key={row.bucket} className="border-t border-white/5"><td className="p-3 font-bold text-white">{row.bucket}</td><td className="p-3 text-slate-300">{row.samples}</td><td className="p-3 text-cyan-200">{row.predicted_away_win_pct}%</td><td className="p-3 text-emerald-200">{row.actual_away_win_pct}%</td><td className={`p-3 font-black ${row.calibration_gap_pct >= 0 ? "text-emerald-300" : "text-amber-300"}`}>{row.calibration_gap_pct > 0 ? "+" : ""}{row.calibration_gap_pct}%</td></tr>)}</tbody>
            </table>
          </div>
          <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[.04] p-3 text-xs leading-5 text-amber-100">Important: this first test uses historical MLB game states, not historical Kalshi prices. It can tell us whether the win-probability model is calibrated; it cannot yet prove a profitable market strategy after fees, spreads, slippage, and entry timing.</div>
        </div>
      ) : null}
    </section>
  );
}

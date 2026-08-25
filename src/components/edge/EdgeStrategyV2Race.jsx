import React, { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, ShieldCheck, Trophy, Zap } from "lucide-react";

import api from "../../api/client";

const REFRESH_MS = 15000;

function money(cents) {
  const value = Number(cents || 0) / 100;
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function pct(value) {
  if (value === null || value === undefined) return "—";
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function stamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function StrategyCard({ item, leader }) {
  const isLeader = leader === item.code;
  const positive = Number(item.realized_pnl_cents || 0) >= 0;
  return (
    <article className={`rounded-2xl border p-3 sm:p-4 ${isLeader ? "border-emerald-300/40 bg-emerald-500/[.07] shadow-[0_0_28px_rgba(52,211,153,.08)]" : "border-white/10 bg-black/20"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2"><h3 className="text-sm font-black text-white sm:text-base">{item.name}</h3>{isLeader ? <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[.12em] text-emerald-200">Leader</span> : null}</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">{item.short}</p>
        </div>
        {item.rank ? <span className="text-xs font-black text-slate-500">#{item.rank}</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-2.5"><div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">Equity</div><div className={`mt-1 text-lg font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>{money(item.paper_equity_cents)}</div></div>
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-2.5"><div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">ROI</div><div className={`mt-1 text-lg font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>{pct(item.roi_pct)}</div></div>
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-2.5"><div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">P/L</div><div className="mt-1 font-black text-white">{money(item.realized_pnl_cents)}</div></div>
        <div className="rounded-xl border border-white/10 bg-white/[.025] p-2.5"><div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">Closed / Open</div><div className="mt-1 font-black text-white">{item.closed_trades} / {item.open_trades}</div></div>
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2.5 text-[10px] leading-4 text-slate-400"><span className="font-black text-slate-200">Exit:</span> {item.exit_plan}</div>
    </article>
  );
}

export default function EdgeStrategyV2Race() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/edge/portfolio/strategy-v2/scoreboard/");
      setData(response.data);
      setError("");
    } catch {
      setError("Strategy Engine v2 paper results are temporarily unavailable.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      await api.post("/edge/portfolio/strategy-v2/tick/", {});
      await load(true);
    } catch {
      setError("Could not run the v2 paper pass right now.");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const strategies = data?.strategies || [];
  const totalStart = strategies.length * Number(data?.paper_bankroll_per_strategy_cents || 5000);
  const totalEquity = strategies.reduce((sum, item) => sum + Number(item.paper_equity_cents || 0), 0);
  const totalPnl = strategies.reduce((sum, item) => sum + Number(item.realized_pnl_cents || 0), 0);
  const recent = useMemo(() => strategies.flatMap((item) => (item.recent_trades || []).map((trade) => ({ ...trade, strategyName: item.name, strategyCode: item.code }))).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10), [strategies]);

  return (
    <section className="space-y-3">
      <section className="rounded-2xl border border-emerald-400/25 bg-slate-950/70 p-3 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-emerald-200"><Activity className="h-3.5 w-3.5" /> Strategy Engine v2</div><h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Same PRIME entries. Different exits.</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Six independent $50 paper accounts receive the same qualifying PRIME feed and fixed $1 unit. The race changes exit and re-entry behavior only.</p></div>
          <div className="flex gap-2"><span className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-100">PAPER ONLY</span><button type="button" disabled={running} onClick={runNow} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 text-[10px] font-black text-cyan-100 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} /> Run paper pass</button></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="text-[8px] font-black uppercase text-slate-600">Starting capital</div><div className="mt-1 text-lg font-black text-white">{money(totalStart)}</div><div className="text-[9px] text-slate-500">{strategies.length || 6} × $50</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="text-[8px] font-black uppercase text-slate-600">Combined equity</div><div className={`mt-1 text-lg font-black ${totalPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(totalEquity)}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="text-[8px] font-black uppercase text-slate-600">Combined P/L</div><div className={`mt-1 text-lg font-black ${totalPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(totalPnl)}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="text-[8px] font-black uppercase text-slate-600">Unit</div><div className="mt-1 text-lg font-black text-white">{money(data?.unit_risk_cents || 100)}</div><div className="text-[9px] text-slate-500">fixed per entry</div></div>
          <div className="col-span-2 rounded-xl border border-white/10 bg-black/20 p-2.5 sm:col-span-1"><div className="text-[8px] font-black uppercase text-slate-600">Leader</div><div className="mt-1 text-lg font-black text-emerald-300">{data?.leader || "Waiting"}</div></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500"><span>Started: <b className="text-slate-300">{stamp(data?.experiment_start_at)}</b></span><span>As of: <b className="text-slate-300">{stamp(data?.as_of)}</b></span><span>Background tick: <b className="text-slate-300">{stamp(data?.last_background_tick_at)}</b></span></div>
        {error ? <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[.06] p-2.5 text-xs text-rose-100">{error}</div> : null}
      </section>

      {loading && !data ? <div className="rounded-2xl border border-white/10 p-4 text-sm text-slate-500">Loading strategy race…</div> : null}
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{strategies.map((item) => <StrategyCard key={item.code} item={item} leader={data?.leader} />)}</div>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.15em] text-cyan-200"><Trophy className="h-3.5 w-3.5" /> Recent v2 trades</div><h3 className="mt-1 font-black text-white">Entry → exit audit trail</h3></div><div className="flex items-center gap-1 text-[9px] font-black text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> No exchange orders</div></div>
        <div className="mt-3 space-y-1.5">{recent.length ? recent.map((trade) => <div key={`${trade.strategyCode}-${trade.id}`} className="rounded-xl border border-white/10 bg-white/[.025] p-2.5 text-[10px] sm:grid sm:grid-cols-[110px_1fr_90px_90px] sm:items-center sm:gap-3"><div className="font-black text-cyan-200">{trade.strategyName}</div><div className="mt-1 sm:mt-0"><div className="font-black text-white">{trade.matchup} • {trade.side}</div><div className="text-slate-500">Opened {stamp(trade.created_at)}{trade.closed_at ? ` • Closed ${stamp(trade.closed_at)}` : " • OPEN"}</div>{trade.principal_recovered ? <div className="font-black text-emerald-300">Principal recovery hit at {trade.recover_price_cents}¢ • {stamp(trade.principal_recovered_at)}</div> : null}</div><div className="mt-1 text-slate-400 sm:mt-0">{trade.entry_price_cents}¢ → {trade.exit_price_cents ?? "—"}¢</div><div className={`mt-1 font-black sm:mt-0 ${Number(trade.pnl_cents || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{trade.status === "OPEN" ? "OPEN" : money(trade.pnl_cents)}</div></div>) : <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">No v2 entries yet. The engine waits for the same PRIME conditions rather than forcing paper trades.</div>}</div>
      </section>

      <div className="rounded-xl border border-amber-400/15 bg-amber-500/[.04] p-3 text-[10px] leading-5 text-amber-100"><span className="font-black">Validation rule:</span> the six accounts use fixed $1 paper units and do not increase sizing after wins. That keeps the race comparable while we learn which exit method has the best realized expectancy. Compounding-size mode stays off until the exit race has enough forward data.</div>
    </section>
  );
}

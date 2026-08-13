import React, { useEffect, useMemo, useState } from "react";
import { Activity, CircleDollarSign, RefreshCw, ShieldCheck, Trophy, Zap } from "lucide-react";

import api from "../../api/client";

const BANKROLL_CENTS = 10000;
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

function PaperMetric({ label, value, detail, valueClass = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-400">{detail}</div> : null}
    </div>
  );
}

function formatTime(value) {
  if (!value) return "Waiting for first server check";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Waiting for first server check" : date.toLocaleString();
}

function historicalHoldout(item) {
  const result = item?.historical?.historical_result || {};
  return {
    roi: result.final_holdout_roi_pct ?? result.holdout_roi_pct ?? null,
    trades: result.final_holdout_trades ?? result.holdout_trades ?? null,
  };
}

function ruleText(item) {
  const rule = item?.historical?.rule || {};
  if (item.code === "E1" || item.code === "E2") {
    return `${rule.pregame_min_pct ?? "—"}–${rule.pregame_max_pct ?? "—"}% pregame favorite • trigger ${rule.leader_trigger_cents ?? "—"}¢ • hedge ${Math.round(Number(rule.hedge_multiple || 0) * 100)}% • +${rule.hedge_rebound_target_cents ?? "—"}¢ exit • through inning ${rule.max_trigger_inning ?? "—"}`;
  }
  if (item.code === "A") return "55–65% pregame • down 1–2 • innings 4–6 • ≥18pt drop • ≥5pt edge • 20m exit";
  if (item.code === "B") return "45–55% pregame • down 1 • innings 4–6 • ≥10pt drop • ≥3pt edge • batting • 30m exit";
  return item.note;
}

function StrategyCard({ item, leader }) {
  const profitable = Number(item.realized_pnl_cents || 0) >= 0;
  const holdout = historicalHoldout(item);
  return (
    <div className={`rounded-[1.5rem] border p-4 ${leader === item.code ? "border-emerald-300/35 bg-emerald-500/[.06]" : "border-white/10 bg-black/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white">{item.name}</span>
            {leader === item.code ? <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-emerald-200">Leader</span> : null}
          </div>
          <div className="mt-1 text-xs text-slate-400">{item.family}</div>
        </div>
        <span className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-cyan-200">Frozen • Live paper</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <PaperMetric label="Equity" value={money(item.paper_equity_cents)} detail="$100 shadow account" valueClass={profitable ? "text-emerald-300" : "text-rose-300"} />
        <PaperMetric label="ROI" value={pct(item.roi_pct)} detail={`${item.closed_trades} closed leg${item.closed_trades === 1 ? "" : "s"}`} valueClass={item.roi_pct === null ? "text-slate-300" : profitable ? "text-emerald-300" : "text-rose-300"} />
        <PaperMetric label="Positive" value={pct(item.positive_trade_rate_pct)} detail={`${item.wins} up • ${item.losses} down`} />
        <PaperMetric label="P/L" value={money(item.realized_pnl_cents)} detail={`${item.open_trades} open`} valueClass={profitable ? "text-emerald-300" : "text-rose-300"} />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-xs leading-5 text-slate-400">
        <div><span className="font-black text-slate-200">Frozen rule:</span> {ruleText(item)}</div>
        {holdout.roi !== null ? <div className="mt-1">Historical holdout: <span className="font-black text-slate-200">{pct(holdout.roi)}</span>{holdout.trades !== null ? ` across ${holdout.trades} trades` : ""}.</div> : null}
      </div>
    </div>
  );
}

export default function EdgeLivePaperPortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function refreshAll(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const [portfolioResponse, statusResponse, scoreboardResponse] = await Promise.all([
        api.get(`/edge/portfolio/live/?bankroll_cents=${BANKROLL_CENTS}`),
        api.get("/edge/portfolio/server/status/"),
        api.get("/edge/portfolio/strategies/scoreboard/"),
      ]);
      setPortfolio(portfolioResponse.data);
      setServerStatus(statusResponse.data);
      setScoreboard(scoreboardResponse.data);
      setError("");
    } catch {
      setError("Live EDGE forward-test data is temporarily unavailable.");
    } finally {
      if (manual) setRefreshing(false);
    }
  }

  useEffect(() => {
    refreshAll();
    const timer = window.setInterval(() => refreshAll(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const trades = portfolio?.paper_trades || [];
  const candidates = portfolio?.candidates || [];
  const hedges = serverStatus?.current_hedges || [];
  const hedgeHistory = serverStatus?.hedge_history || [];
  const bestHedge = hedges[0] || hedgeHistory[0] || null;
  const strategies = scoreboard?.strategies || [];
  const totalRealized = strategies.reduce((sum, item) => sum + Number(item.realized_pnl_cents || 0), 0);
  const totalOpenRisk = strategies.reduce((sum, item) => sum + Number(item.open_risk_cents || 0), 0);
  const totalClosed = strategies.reduce((sum, item) => sum + Number(item.closed_trades || 0), 0);
  const combinedEquity = strategies.length * BANKROLL_CENTS + totalRealized;
  const serverTick = serverStatus?.last_server_tick || {};
  const strongest = useMemo(() => [...candidates].sort((a, b) => Number(b.model_edge_pct || 0) - Number(a.model_edge_pct || 0))[0], [candidates]);

  const actionSummary = serverStatus?.last_server_tick_at
    ? `${serverTick.opened_count || 0} opened • ${serverTick.closed_count || 0} closed on the last background pass.`
    : "Waiting for the first frozen-strategy background pass.";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-emerald-400/25 bg-slate-950/70">
      <div className="border-b border-white/10 bg-emerald-500/[.055] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-200"><Activity className="h-4 w-4" /> Live Forward Test</div>
            <h2 className="mt-2 text-2xl font-black text-white">Four frozen strategies. Four $100 shadow accounts.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">A, B, E1 and E2 PRIME now run independently. Rules are frozen; new live data can change the scoreboard, but it cannot change the rules.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100">● BACKGROUND RUNNER ON</span>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100">RULES FROZEN</span>
            <button type="button" disabled={refreshing} onClick={() => refreshAll(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh data</button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-black/20 p-3 text-xs text-slate-300">Last background server check: <span className="font-black text-emerald-200">{formatTime(serverStatus?.last_server_tick_at)}</span>. Closing SyncWorks does not stop the experiment.</div>
        {error ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/[.06] p-3 text-xs text-rose-100">{error}</div> : null}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PaperMetric label="Shadow capital" value={`$${(strategies.length * 100).toFixed(2)}`} detail={`${strategies.length || 4} × $100 independent tests`} />
          <PaperMetric label="Combined equity" value={money(combinedEquity)} detail="Research summary only" valueClass={totalRealized >= 0 ? "text-emerald-300" : "text-rose-300"} />
          <PaperMetric label="Realized P/L" value={money(totalRealized)} detail={`${totalClosed} closed legs`} valueClass={totalRealized >= 0 ? "text-emerald-300" : "text-rose-300"} />
          <PaperMetric label="Open risk" value={money(totalOpenRisk)} detail="Across all four shadow accounts" />
          <PaperMetric label="Risk rule" value="1% / day" detail="Independent cap per strategy" />
        </div>

        <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-500/[.035] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-200"><Trophy className="h-4 w-4" /> Strategy Race</div><h3 className="mt-1 text-xl font-black text-white">Let the forward data choose the winner.</h3><p className="mt-2 text-xs leading-5 text-slate-400">No strategy can consume another strategy's risk budget. That lets us measure opportunity frequency, ROI and consistency without cross-strategy interference.</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black text-slate-300">Leader: {scoreboard?.leader || "No closed trades yet"}</div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">{strategies.map((item) => <StrategyCard key={item.code} item={item} leader={scoreboard?.leader} />)}</div>
          <div className="mt-3 text-xs leading-5 text-slate-500">Freeze version: {scoreboard?.freeze_version || serverStatus?.freeze_version || "2026-08-10-v1.5"}. Forward results are measurement only; they do not re-optimize these rules.</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5"><div className="flex items-start gap-3"><Zap className="mt-0.5 h-5 w-5 text-emerald-300" /><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">Background activity</div><div className="mt-2 text-lg font-black text-white">{actionSummary}</div><p className="mt-2 text-xs leading-5 text-slate-400">The server is authoritative. This page only refreshes the results, so leaving it open cannot create duplicate trades or change the experiment.</p></div></div></div>
          <div className={`rounded-[1.5rem] border p-4 sm:p-5 ${strongest?.can_enter ? "border-emerald-400/30 bg-emerald-500/[.07]" : "border-white/10 bg-black/20"}`}><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400"><CircleDollarSign className="h-4 w-4" /> A/B scanner right now</div>{strongest ? <><div className={`mt-2 text-xl font-black ${strongest.can_enter ? "text-emerald-300" : "text-slate-300"}`}>{strongest.can_enter && Number(strongest.model_edge_pct || 0) >= 10 ? "TAKE STRONG SIGNAL" : strongest.can_enter ? "TAKE SIGNAL" : "DO NOT ENTER"}</div><div className="mt-2 text-sm font-black text-white">{strongest.matchup} • {strongest.side}</div><div className="mt-1 text-xs leading-5 text-slate-400">Strategy {strongest.strategy_code} • ask {strongest.current_ask_cents}¢ • model edge {pct(strongest.model_edge_pct)}</div>{!strongest.can_enter && strongest.blocked_reason ? <div className="mt-2 text-xs font-black text-amber-200">Why pass: {String(strongest.blocked_reason).replaceAll("_", " ")}</div> : null}</> : <div className="mt-2 text-sm text-slate-400">No A/B setup currently qualifies. Staying out is a valid result.</div>}</div>
        </div>

        <div className={`rounded-[1.5rem] border p-4 sm:p-5 ${bestHedge?.state === "LOCK_PROFIT" ? "border-emerald-300/30 bg-emerald-500/[.06]" : "border-violet-300/20 bg-violet-500/[.04]"}`}>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200">Hedge Lab • observational layer</div><h3 className="mt-1 text-lg font-black text-white">Does the opposite side create a better outcome?</h3>
          {bestHedge ? <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]"><div><div className={`text-xl font-black ${bestHedge.state === "LOCK_PROFIT" ? "text-emerald-300" : "text-amber-200"}`}>{bestHedge.state === "LOCK_PROFIT" ? "LOCK PROFIT FOUND" : "NEAR HEDGE"}</div><div className="mt-2 text-sm font-black text-white">{bestHedge.matchup} • Strategy {bestHedge.strategy_code || "—"} • add {bestHedge.opposite_side}</div><div className="mt-1 text-xs leading-5 text-slate-400">Primary {bestHedge.primary_entry_cents}¢ + opposite {bestHedge.opposite_entry_cents}¢ = {bestHedge.pair_cost_cents_per_contract}¢ per matched pair.</div><p className="mt-2 text-xs leading-5 text-slate-400">{bestHedge.why}</p></div><div className="grid grid-cols-2 gap-3"><PaperMetric label="Opposite cost" value={money(bestHedge.hedge_cost_cents)} detail={`Match ${bestHedge.contracts} contracts`} /><PaperMetric label="Locked P/L" value={money(bestHedge.locked_profit_cents)} detail={`${pct(bestHedge.locked_roi_pct)} on paired cost`} valueClass={Number(bestHedge.locked_profit_cents) > 0 ? "text-emerald-300" : "text-amber-200"} /></div></div> : <p className="mt-3 text-sm leading-6 text-slate-400">No matched-contract hedge window has qualified yet. E1/E2 have their own frozen dynamic-hedge rules; Hedge Lab remains a separate observation so we can compare the concepts later without changing those rules.</p>}
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Live paper ledger</div><h3 className="mt-1 text-lg font-black text-white">Every simulated decision</h3></div><div className="flex items-center gap-2 text-xs font-black text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Paper only • no exchange orders</div></div>
          <div className="mt-4 space-y-2">{trades.length ? trades.slice(0, 16).map((trade) => <div key={trade.id} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[.025] px-3 py-3 text-xs sm:grid-cols-[90px_1fr_90px_90px_90px] sm:items-center"><span className={`font-black ${trade.status === "OPEN" ? "text-cyan-200" : Number(trade.pnl_cents) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{trade.status}</span><span className="font-black text-white">{trade.strategy || "EDGE"} • {trade.side}</span><span className="text-slate-400">Risk {money(trade.risk_cents)}</span><span className="text-slate-400">{trade.entry_price_cents}¢ → {trade.exit_price_cents ?? "—"}¢</span><span className={`font-black ${Number(trade.pnl_cents) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(trade.pnl_cents)}</span></div>) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">No paper trades yet. Frozen strategies wait for their exact conditions rather than manufacturing activity.</div>}</div>
        </div>

        <div className="text-xs leading-5 text-slate-500">This is a forward paper experiment, not a profit guarantee. The purpose of freezing the rules is to learn whether the historical behavior survives live, unseen markets without changing the test after seeing results.</div>
      </div>
    </section>
  );
}

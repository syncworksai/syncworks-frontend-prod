import React, { useEffect, useMemo, useState } from "react";
import { Activity, CircleDollarSign, Play, RefreshCw, ShieldCheck, Square, Zap } from "lucide-react";

import api from "../../api/client";

const BANKROLL_CENTS = 10000;
const POLL_MS = 15000;

function money(cents) {
  const value = Number(cents || 0) / 100;
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function pct(value) {
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

function actionLabel(candidate) {
  if (!candidate?.can_enter) return "DO NOT ENTER";
  const edge = Number(candidate.model_edge_pct || 0);
  if (edge >= 10) return "TAKE STRONG SIGNAL";
  return "TAKE SIGNAL";
}

export default function EdgeLivePaperPortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [running, setRunning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastTick, setLastTick] = useState(null);
  const [lastAction, setLastAction] = useState("Watching live markets for a qualified setup.");

  async function refresh() {
    try {
      const response = await api.get(`/edge/portfolio/live/?bankroll_cents=${BANKROLL_CENTS}`);
      setPortfolio(response.data);
      setError("");
      return response.data;
    } catch {
      setError("Live paper portfolio is temporarily unavailable.");
      return null;
    }
  }

  async function paperTick(silent = false) {
    if (busy) return;
    if (!silent) setBusy(true);
    try {
      const response = await api.post("/edge/portfolio/paper/tick/", { bankroll_cents: BANKROLL_CENTS });
      const data = response.data;
      setPortfolio((previous) => ({ ...(previous || {}), portfolio: data.portfolio, paper_trades: data.paper_trades }));
      setLastTick(new Date());
      setError("");
      if (data.opened?.length) {
        const trade = data.opened[0];
        setLastAction(`PAPER ENTRY: ${trade.strategy || "EDGE"} • ${trade.side} at ${trade.entry_price_cents}¢ • risk ${money(trade.risk_cents)}.`);
      } else if (data.closed?.length) {
        const trade = data.closed[0];
        setLastAction(`PAPER EXIT: ${trade.side} • ${money(trade.pnl_cents)} realized P/L.`);
      } else if (data.skipped?.length) {
        setLastAction(`PASS: ${String(data.skipped[0].reason || "risk/entry rule").replaceAll("_", " ")}.`);
      } else {
        setLastAction("No qualified entry this tick. EDGE stayed out.");
      }
      await refresh();
    } catch {
      setError("Paper tick failed. No simulated trade was placed.");
    } finally {
      if (!silent) setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    paperTick(true);
    const timer = window.setInterval(() => paperTick(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const risk = portfolio?.portfolio || {};
  const trades = portfolio?.paper_trades || [];
  const candidates = portfolio?.candidates || [];
  const openTrades = trades.filter((trade) => trade.status === "OPEN");
  const realizedCents = Number(risk.realized_pnl_cents || 0);
  const equityCents = BANKROLL_CENTS + realizedCents;
  const returnPct = (realizedCents / BANKROLL_CENTS) * 100;
  const strongest = useMemo(
    () => [...candidates].sort((a, b) => Number(b.model_edge_pct || 0) - Number(a.model_edge_pct || 0))[0],
    [candidates],
  );

  return (
    <section className="overflow-hidden rounded-[2rem] border border-emerald-400/25 bg-slate-950/70">
      <div className="border-b border-white/10 bg-emerald-500/[.055] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-200">
              <Activity className="h-4 w-4" /> Live $100 Backtester
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">Watch EDGE prove itself in real time.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Paper money only. EDGE scans the live board, enters only when a strategy qualifies, records why it acted, and tracks the result against a fixed $100 test bankroll.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-2 text-xs font-black ${running ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[.04] text-slate-400"}`}>
              {running ? "● LIVE SIM RUNNING" : "SIM PAUSED"}
            </span>
            <button type="button" onClick={() => setRunning((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-200">
              {running ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {running ? "Pause" : "Start"}
            </button>
            <button type="button" disabled={busy} onClick={() => paperTick(false)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Run now
            </button>
          </div>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/[.06] p-3 text-xs text-rose-100">{error}</div> : null}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PaperMetric label="Starting bankroll" value="$100.00" detail="Fixed paper test" />
          <PaperMetric label="Paper equity" value={money(equityCents)} detail={`${pct(returnPct)} realized return`} valueClass={equityCents >= BANKROLL_CENTS ? "text-emerald-300" : "text-rose-300"} />
          <PaperMetric label="Realized P/L" value={money(realizedCents)} detail="Closed paper trades" valueClass={realizedCents >= 0 ? "text-emerald-300" : "text-rose-300"} />
          <PaperMetric label="Open risk" value={money(risk.open_risk_cents)} detail={`${openTrades.length} open position${openTrades.length === 1 ? "" : "s"}`} />
          <PaperMetric label="Risk available" value={money(risk.daily_remaining_cents)} detail={`${risk.daily_risk_pct || 1}% paper risk cap`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-5 w-5 text-emerald-300" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">What EDGE is doing</div>
                <div className="mt-2 text-lg font-black text-white">{lastAction}</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {lastTick ? `Last simulation check ${lastTick.toLocaleTimeString()}.` : "Waiting for the first simulation check."} The simulator cannot send a live-money order.
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-[1.5rem] border p-4 sm:p-5 ${strongest?.can_enter ? "border-emerald-400/30 bg-emerald-500/[.07]" : "border-white/10 bg-black/20"}`}>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400"><CircleDollarSign className="h-4 w-4" /> Best live action</div>
            {strongest ? (
              <>
                <div className={`mt-2 text-xl font-black ${strongest.can_enter ? "text-emerald-300" : "text-slate-300"}`}>{actionLabel(strongest)}</div>
                <div className="mt-2 text-sm font-black text-white">{strongest.matchup} • {strongest.side}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">Strategy {strongest.strategy_code} • ask {strongest.current_ask_cents}¢ • model edge {pct(strongest.model_edge_pct)}</div>
                {!strongest.can_enter && strongest.blocked_reason ? <div className="mt-2 text-xs font-black text-amber-200">Why pass: {String(strongest.blocked_reason).replaceAll("_", " ")}</div> : null}
              </>
            ) : <div className="mt-2 text-sm text-slate-400">No qualifying A/B portfolio candidate right now. Staying out is a valid action.</div>}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Live paper ledger</div>
              <h3 className="mt-1 text-lg font-black text-white">Every simulated decision</h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-300" /> No exchange account required</div>
          </div>
          <div className="mt-4 space-y-2">
            {trades.length ? trades.slice(0, 12).map((trade) => (
              <div key={trade.id} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[.025] px-3 py-3 text-xs sm:grid-cols-[90px_1fr_90px_90px_90px] sm:items-center">
                <span className={`font-black ${trade.status === "OPEN" ? "text-cyan-200" : Number(trade.pnl_cents) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{trade.status}</span>
                <span className="font-black text-white">{trade.strategy || "EDGE"} • {trade.side}</span>
                <span className="text-slate-400">Risk {money(trade.risk_cents)}</span>
                <span className="text-slate-400">{trade.entry_price_cents}¢ → {trade.exit_price_cents ?? "—"}¢</span>
                <span className={`font-black ${Number(trade.pnl_cents) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(trade.pnl_cents)}</span>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">No paper trades yet. The simulator will wait rather than manufacture an entry.</div>}
          </div>
        </div>

        <div className="text-xs leading-5 text-slate-500">
          Current portfolio automation uses the live Strategy A/B engine already in EDGE. This is intentionally a forward paper test; stronger E-family rules can be added to the same ledger as their live adapter is finalized.
        </div>
      </div>
    </section>
  );
}

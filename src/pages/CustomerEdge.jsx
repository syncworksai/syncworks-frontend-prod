import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Baseball,
  Bot,
  CircleDollarSign,
  Gauge,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Wifi,
  Zap,
} from "lucide-react";

import DashboardShell from "../components/dashboard/DashboardShell";

const DEMO_SIGNALS = [
  {
    id: 1,
    sport: "MLB",
    matchup: "ATL @ MIA",
    gameState: "Top 5 • 0 outs • MIA leads 3–1",
    side: "ATL YES",
    market: 30,
    model: 43,
    edge: 13,
    score: 92,
    signal: "GREEN",
    action: "STRONG ENTRY",
    maxEntry: 33,
    why: ["4+ offensive innings remain", "Pregame favorite now discounted", "Live market moved faster than model fair value"],
  },
  {
    id: 2,
    sport: "NFL",
    matchup: "BUF @ MIA",
    gameState: "Pregame",
    side: "BUF YES",
    market: 58,
    model: 62,
    edge: 4,
    score: 64,
    signal: "YELLOW",
    action: "WATCH",
    maxEntry: 56,
    why: ["Positive edge remains", "Current ask is above preferred entry", "Wait for a better price"],
  },
  {
    id: 3,
    sport: "NCAAF",
    matchup: "AUB @ UGA",
    gameState: "Pregame",
    side: "AUB YES",
    market: 24,
    model: 35,
    edge: 11,
    score: 89,
    signal: "GREEN",
    action: "FADE FAVORITE",
    maxEntry: 27,
    why: ["Opponent price below modeled probability", "Large brand favorite premium", "Asymmetric payout at current ask"],
  },
  {
    id: 4,
    sport: "MLB",
    matchup: "LAD @ SF",
    gameState: "Bottom 7 • LAD leads 4–2",
    side: "LAD YES",
    market: 72,
    model: 63,
    edge: -9,
    score: 28,
    signal: "RED",
    action: "TOO LATE",
    maxEntry: 61,
    why: ["Current price exceeds model fair value", "Do not chase favorite", "Check opposite side before entering"],
  },
];

const signalTone = {
  GREEN: "border-emerald-400/30 bg-emerald-500/[.07]",
  YELLOW: "border-amber-400/30 bg-amber-500/[.07]",
  RED: "border-rose-400/30 bg-rose-500/[.07]",
};

const signalText = {
  GREEN: "text-emerald-300",
  YELLOW: "text-amber-300",
  RED: "text-rose-300",
};

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-400">{detail}</div> : null}
    </div>
  );
}

function SignalCard({ item }) {
  const positive = item.edge >= 0;
  return (
    <article className={`overflow-hidden rounded-[1.75rem] border ${signalTone[item.signal]}`}>
      <div className="flex items-stretch">
        <div className={`w-1.5 shrink-0 ${item.signal === "GREEN" ? "bg-emerald-400" : item.signal === "YELLOW" ? "bg-amber-400" : "bg-rose-400"}`} />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
                <span>{item.sport}</span>
                <span>•</span>
                <span className={signalText[item.signal]}>{item.action}</span>
              </div>
              <h3 className="mt-2 text-xl font-black text-white">{item.matchup}</h3>
              <p className="mt-1 text-xs text-slate-400">{item.gameState}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-right">
              <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">Opportunity</div>
              <div className={`mt-1 text-xl font-black ${signalText[item.signal]}`}>{item.score}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Trade" value={item.side} />
            <Metric label="Market" value={`${item.market}¢`} />
            <Metric label="Model" value={`${item.model}%`} />
            <Metric label="Edge" value={`${positive ? "+" : ""}${item.edge}%`} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black ${signalText[item.signal]}`}>{item.signal}</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-slate-300">Max entry {item.maxEntry}¢</span>
            {item.signal === "GREEN" ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200">Never chase above {item.maxEntry}¢</span> : null}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {item.why.map((reason) => (
              <div key={reason} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-xs leading-5 text-slate-300">{reason}</div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CustomerEdge() {
  const [sport, setSport] = useState("ALL");
  const [mode, setMode] = useState("PAPER");
  const [execution, setExecution] = useState("MANUAL");
  const [dailyRisk, setDailyRisk] = useState(30);
  const [perTrade, setPerTrade] = useState(5);
  const [minEdge, setMinEdge] = useState(8);

  const signals = useMemo(() => {
    const filtered = sport === "ALL" ? DEMO_SIGNALS : DEMO_SIGNALS.filter((item) => item.sport === sport);
    return [...filtered].sort((a, b) => b.score - a.score);
  }, [sport]);

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_15%,rgba(16,185,129,.14),transparent_28%),radial-gradient(circle_at_20%_0%,rgba(34,211,238,.12),transparent_30%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 sm:p-7">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Zap className="h-4 w-4" /> EDGE • Sports Market Intelligence</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find the price, not the pick.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Live-value workspace for MLB, NFL and college football. Green means the current executable price is materially below model fair value. Yellow means wait or size down. Red means the edge is gone or the market already ran.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-80">
              <button type="button" onClick={() => setMode("PAPER")} className={`min-h-12 rounded-2xl border px-4 text-sm font-black ${mode === "PAPER" ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Paper</button>
              <button type="button" onClick={() => setMode("LIVE")} className={`min-h-12 rounded-2xl border px-4 text-sm font-black ${mode === "LIVE" ? "border-rose-300/40 bg-rose-500/15 text-rose-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Live locked</button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Paper bankroll" value="$1,000" detail="Simulation only" />
          <Metric label="Daily risk" value={`$${dailyRisk}`} detail={`$${perTrade} max per position`} />
          <Metric label="Green threshold" value={`+${minEdge}%`} detail="Minimum model-vs-market edge" />
          <Metric label="Exchange" value="Not connected" detail="Kalshi connection required for live" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.55fr_.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Live board</div>
                <h2 className="mt-1 text-xl font-black text-white">Best opportunities first</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {["ALL", "MLB", "NFL", "NCAAF"].map((value) => (
                  <button key={value} type="button" onClick={() => setSport(value)} className={`min-h-10 rounded-xl border px-3 text-xs font-black ${sport === value ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{value}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {signals.map((item) => <SignalCard key={item.id} item={item} />)}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3"><SlidersHorizontal className="h-5 w-5 text-cyan-300" /><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Execution</div><h2 className="mt-1 text-lg font-black text-white">Trading mode</h2></div></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setExecution("MANUAL")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "MANUAL" ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Manual</button>
                <button type="button" onClick={() => setExecution("AUTO")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "AUTO" ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Pre-approved</button>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">Manual will surface the signal and let you approve an order. Pre-approved will only act inside the limits below once live execution is connected.</p>

              <div className="mt-4 space-y-4">
                <label className="block text-xs font-black text-slate-300">Daily max risk
                  <input type="number" min="1" value={dailyRisk} onChange={(event) => setDailyRisk(Number(event.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" />
                </label>
                <label className="block text-xs font-black text-slate-300">Max per trade
                  <input type="number" min="1" value={perTrade} onChange={(event) => setPerTrade(Number(event.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" />
                </label>
                <label className="block text-xs font-black text-slate-300">Minimum green edge (%)
                  <input type="number" min="1" value={minEdge} onChange={(event) => setMinEdge(Number(event.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] p-4">
                <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" /><div><div className="font-black text-white">Never chase is always on</div><p className="mt-1 text-xs leading-5 text-slate-400">If the ask moves above the signal's max-entry price before execution, EDGE skips the trade rather than paying up.</p></div></div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-violet-300" /><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200">Account</div><h2 className="mt-1 text-lg font-black text-white">Connect Kalshi</h2></div></div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"><div><div className="font-black text-white">Kalshi</div><div className="mt-1 text-xs text-slate-500">API key connection</div></div><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-black text-slate-400">Not connected</span></div>
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/[.05] p-4 text-xs leading-5 text-slate-300">Credentials will be stored server-side only. The browser should never hold your Kalshi private key. Live trading stays locked until the backend connection and risk controls are verified.</div>
              <button type="button" disabled className="mt-4 min-h-12 w-full rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-500">Connection setup coming next</button>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5">
              <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-black text-white">What live mode will monitor</h2></div>
              <div className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
                <div className="flex gap-3"><Wifi className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span>Exchange bid/ask and order-book changes.</span></div>
                <div className="flex gap-3"><Baseball className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>Score, inning, outs, runners and live game state.</span></div>
                <div className="flex gap-3"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><span>Model fair value and remaining edge after each state change.</span></div>
                <div className="flex gap-3"><RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>Entry and exit rules without requiring the phone to stay open.</span></div>
              </div>
            </section>
          </aside>
        </section>

        <section className="rounded-[1.75rem] border border-rose-400/15 bg-rose-500/[.04] p-5">
          <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div><div className="font-black text-white">Paper mode first</div><p className="mt-1 text-sm leading-6 text-slate-400">This first build intentionally does not place real-money orders. We will wire live exchange credentials, order validation, kill switches and transaction logging on the backend before enabling live execution.</p></div></div>
        </section>
      </main>
    </DashboardShell>
  );
}

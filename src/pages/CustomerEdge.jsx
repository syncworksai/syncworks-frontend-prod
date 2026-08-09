import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  Zap,
} from "lucide-react";

import api from "../api/client";
import DashboardShell from "../components/dashboard/DashboardShell";

const DEMO_SIGNALS = [
  { id: 1, sport: "MLB", matchup: "ATL @ MIA", gameState: "Top 5 • 0 outs • MIA leads 3–1", side: "ATL YES", market: 30, model: 43, edge: 13, score: 92, signal: "GREEN", action: "STRONG ENTRY", maxEntry: 33, why: ["4+ offensive innings remain", "Pregame favorite now discounted", "Live market moved faster than model fair value"] },
  { id: 2, sport: "NFL", matchup: "BUF @ MIA", gameState: "Pregame", side: "BUF YES", market: 58, model: 62, edge: 4, score: 64, signal: "YELLOW", action: "WATCH", maxEntry: 56, why: ["Positive edge remains", "Current ask is above preferred entry", "Wait for a better price"] },
  { id: 3, sport: "NCAAF", matchup: "AUB @ UGA", gameState: "Pregame", side: "AUB YES", market: 24, model: 35, edge: 11, score: 89, signal: "GREEN", action: "FADE FAVORITE", maxEntry: 27, why: ["Opponent price below modeled probability", "Large brand favorite premium", "Asymmetric payout at current ask"] },
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

function priceText(value) {
  return value === null || value === undefined ? "—" : `${value}¢`;
}

function LivePrice({ label, score, market, connected }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-white">{label}</div>
          <div className="mt-1 text-2xl font-black text-white">{score}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Kalshi ask</div>
          <div className={`mt-1 text-xl font-black ${connected ? "text-cyan-200" : "text-slate-500"}`}>{priceText(market?.yes_ask_cents)}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Bid {priceText(market?.yes_bid_cents)}</span>
        <span>Last {priceText(market?.last_price_cents)}</span>
      </div>
    </div>
  );
}

function LiveGameCard({ game }) {
  const connected = Boolean(game.market_connected);
  const live = Boolean(game.is_live);
  return (
    <article className={`rounded-[1.5rem] border p-4 ${live ? "border-emerald-400/25 bg-emerald-500/[.045]" : "border-white/10 bg-slate-950/55"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-slate-400">
            <span className={live ? "text-emerald-300" : "text-slate-400"}>{live ? "LIVE" : game.status}</span>
            <span>•</span>
            <span>{game.game_state}</span>
          </div>
          <h3 className="mt-2 text-lg font-black text-white">{game.away?.code || game.away?.name} @ {game.home?.code || game.home?.name}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${connected ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-500"}`}>
          {connected ? "KALSHI LINKED" : "NO MONEYLINE MATCH"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <LivePrice label={game.away?.code || game.away?.name} score={game.away?.score ?? 0} market={game.away_market} connected={connected} />
        <LivePrice label={game.home?.code || game.home?.name} score={game.home?.score ?? 0} market={game.home_market} connected={connected} />
      </div>
      {(game.away?.probable_pitcher || game.home?.probable_pitcher) ? (
        <div className="mt-3 text-[11px] leading-5 text-slate-500">
          Probables: {game.away?.probable_pitcher || "TBD"} vs {game.home?.probable_pitcher || "TBD"}
        </div>
      ) : null}
    </article>
  );
}

function normalizeSignal(item) {
  if (item.market !== undefined) return item;
  const edge = Number(item.edge_bps || 0) / 100;
  const market = Number(item.market_price_cents || 0);
  const model = Number(item.model_probability_bps || 0) / 100;
  return {
    id: item.id,
    sport: item.sport,
    matchup: item.matchup,
    gameState: item.game_state || "Live state pending",
    side: item.side,
    market,
    model,
    edge,
    score: item.opportunity_score || 0,
    signal: item.signal || (edge >= 8 ? "GREEN" : edge >= 3 ? "YELLOW" : "RED"),
    action: edge >= 8 ? "ENTRY" : edge >= 3 ? "WATCH" : "PASS",
    maxEntry: item.max_entry_cents || market,
    why: ["EDGE signal", "Model probability compared with executable market price", "Never-chase ceiling enforced"],
  };
}

function SignalCard({ item }) {
  const positive = item.edge >= 0;
  return (
    <article className={`overflow-hidden rounded-[1.75rem] border ${signalTone[item.signal] || signalTone.RED}`}>
      <div className="flex items-stretch">
        <div className={`w-1.5 shrink-0 ${item.signal === "GREEN" ? "bg-emerald-400" : item.signal === "YELLOW" ? "bg-amber-400" : "bg-rose-400"}`} />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{item.sport} • <span className={signalText[item.signal]}>{item.action}</span></div>
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
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black ${signalText[item.signal]}`}>{item.signal}</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-slate-300">Max entry {item.maxEntry}¢</span>
            {item.signal === "GREEN" ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200">Never chase above {item.maxEntry}¢</span> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CustomerEdge() {
  const [sport, setSport] = useState("ALL");
  const [execution, setExecution] = useState("MANUAL");
  const [dailyRisk, setDailyRisk] = useState(15);
  const [perTrade, setPerTrade] = useState(1);
  const [minEdge, setMinEdge] = useState(8);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [environment, setEnvironment] = useState("DEMO");
  const [apiKeyId, setApiKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [savingConnection, setSavingConnection] = useState(false);
  const [liveBoard, setLiveBoard] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [lastLiveRefresh, setLastLiveRefresh] = useState(null);

  async function loadDashboard() {
    try {
      const response = await api.get("/edge/dashboard/");
      setDashboard(response.data);
      const strategy = response.data?.strategy;
      if (strategy) {
        setExecution(strategy.execution_mode === "AUTO" ? "AUTO" : "MANUAL");
        setDailyRisk(Number(strategy.daily_risk_limit_cents || 1500) / 100);
        setPerTrade(Number(strategy.per_trade_limit_cents || 100) / 100);
        setMinEdge(Number(strategy.minimum_edge_bps || 800) / 100);
      }
    } catch {
      setMessage("EDGE backend is not deployed yet. Signal cards remain in paper preview mode.");
    } finally {
      setLoading(false);
    }
  }

  async function loadLiveBoard(silent = false) {
    if (!silent) setLiveLoading(true);
    try {
      const response = await api.get("/edge/live/mlb/");
      setLiveBoard(response.data);
      setLastLiveRefresh(new Date());
    } catch {
      if (!silent) setLiveBoard(null);
    } finally {
      if (!silent) setLiveLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    loadLiveBoard();
    const timer = window.setInterval(() => loadLiveBoard(true), 10000);
    return () => window.clearInterval(timer);
  }, []);

  async function saveStrategy() {
    const id = dashboard?.strategy?.id;
    if (!id) return setMessage("Backend strategy will be available after the EDGE backend deploys.");
    try {
      await api.patch(`/edge/strategies/${id}/`, {
        execution_mode: execution,
        daily_risk_limit_cents: Math.round(dailyRisk * 100),
        per_trade_limit_cents: Math.round(perTrade * 100),
        minimum_edge_bps: Math.round(minEdge * 100),
        never_chase: true,
      });
      setMessage(execution === "AUTO" ? "Pre-approved rules saved, but automation remains DISARMED until live verification is complete." : "Manual EDGE rules saved.");
      await loadDashboard();
    } catch {
      setMessage("Could not save EDGE settings yet.");
    }
  }

  async function handleKeyFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPrivateKey(await file.text());
  }

  async function connectKalshi() {
    if (!apiKeyId.trim() || !privateKey.includes("PRIVATE KEY")) {
      setMessage("Add the Kalshi Key ID and choose the downloaded private-key file.");
      return;
    }
    setSavingConnection(true);
    try {
      const response = await api.post("/edge/exchanges/kalshi/", { environment, api_key_id: apiKeyId.trim(), private_key: privateKey });
      setPrivateKey("");
      setApiKeyId("");
      setConnectOpen(false);
      setMessage(response.data?.message || "Kalshi connected.");
      await loadDashboard();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Kalshi connection could not be verified.");
    } finally {
      setSavingConnection(false);
    }
  }

  const connection = dashboard?.connections?.find((item) => item.exchange === "KALSHI");
  const sourceSignals = dashboard?.signals?.length ? dashboard.signals.map(normalizeSignal) : DEMO_SIGNALS;
  const signals = useMemo(() => {
    const filtered = sport === "ALL" ? sourceSignals : sourceSignals.filter((item) => item.sport === sport);
    return [...filtered].sort((a, b) => b.score - a.score);
  }, [sport, sourceSignals]);

  const liveGames = liveBoard?.games || [];
  const liveCount = liveGames.filter((game) => game.is_live).length;
  const linkedCount = liveGames.filter((game) => game.market_connected).length;

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Zap className="h-4 w-4" /> EDGE • Sports Market Intelligence</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find the price, not the pick.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Live game state and Kalshi moneyline prices now sit above the model layer. Real-money execution remains locked.</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">LIVE DATA • PAPER EXECUTION</div>
          </div>
          {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">{message}</div> : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Live MLB" value={liveLoading ? "…" : String(liveCount)} detail={`${liveGames.length} games on today's slate`} />
          <Metric label="Kalshi linked" value={liveLoading ? "…" : String(linkedCount)} detail="Moneyline markets matched" />
          <Metric label="Daily risk" value={`$${dailyRisk}`} detail={`$${perTrade} max per trade`} />
          <Metric label="Green threshold" value={`+${minEdge}%`} detail="Model layer comes next" />
        </section>

        <section className="rounded-[1.75rem] border border-emerald-400/15 bg-slate-950/55 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-emerald-200"><Wifi className="h-4 w-4" /> Live MLB + Kalshi</div>
              <h2 className="mt-1 text-xl font-black text-white">Today's real-time board</h2>
              <p className="mt-1 text-xs text-slate-400">Auto-refreshes every 10 seconds. These are raw game and exchange values; green/yellow/red model decisions are not yet generated from this feed.</p>
            </div>
            <button type="button" onClick={() => loadLiveBoard()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-200"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>
          {lastLiveRefresh ? <div className="mt-3 text-[10px] font-black uppercase tracking-[.12em] text-slate-500">Updated {lastLiveRefresh.toLocaleTimeString()}</div> : null}
          {liveLoading ? <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">Loading live MLB and Kalshi data…</div> : null}
          {!liveLoading && !liveGames.length ? <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">Live feed unavailable or the backend live-data stage has not deployed yet.</div> : null}
          {liveGames.length ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{liveGames.map((game) => <LiveGameCard key={game.game_pk} game={game} />)}</div> : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.55fr_.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">EDGE model</div><h2 className="mt-1 text-xl font-black text-white">Signal board</h2></div>
              <div className="flex flex-wrap gap-2">{["ALL", "MLB", "NFL", "NCAAF"].map((value) => <button key={value} type="button" onClick={() => setSport(value)} className={`min-h-10 rounded-xl border px-3 text-xs font-black ${sport === value ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{value}</button>)}</div>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[.045] p-3 text-xs leading-5 text-amber-100">Model signals below remain paper/demo until the live probability engine is connected to the real game feed above.</div>
            <div className="space-y-3">{signals.map((item) => <SignalCard key={item.id} item={item} />)}</div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3"><SlidersHorizontal className="h-5 w-5 text-cyan-300" /><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Execution</div><h2 className="mt-1 text-lg font-black text-white">Trading rules</h2></div></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setExecution("MANUAL")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "MANUAL" ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Manual</button>
                <button type="button" onClick={() => setExecution("AUTO")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "AUTO" ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Pre-approved</button>
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-xs font-black text-slate-300">Daily max risk<input type="number" min="1" value={dailyRisk} onChange={(e) => setDailyRisk(Number(e.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" /></label>
                <label className="block text-xs font-black text-slate-300">Max per trade<input type="number" min="1" value={perTrade} onChange={(e) => setPerTrade(Number(e.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" /></label>
                <label className="block text-xs font-black text-slate-300">Minimum green edge (%)<input type="number" min="1" value={minEdge} onChange={(e) => setMinEdge(Number(e.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" /></label>
              </div>
              <button type="button" onClick={saveStrategy} className="mt-4 min-h-12 w-full rounded-2xl border border-cyan-300/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">Save rules</button>
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" /><div><div className="font-black text-white">Never chase: ON</div><p className="mt-1 text-xs leading-5 text-slate-400">If price moves above the signal's maximum entry, EDGE skips it.</p></div></div></div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-violet-300" /><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200">Account</div><h2 className="mt-1 text-lg font-black text-white">Connect Kalshi</h2></div></div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"><div><div className="font-black text-white">Kalshi</div><div className="mt-1 text-xs text-slate-500">API connection</div></div><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-black text-slate-300">{connection?.connected ? "Connected" : "Not connected"}</span></div>
              {!connectOpen ? <button type="button" onClick={() => setConnectOpen(true)} className="mt-4 min-h-12 w-full rounded-2xl border border-violet-300/30 bg-violet-500/10 px-4 text-sm font-black text-violet-100">Connect Kalshi</button> : (
                <div className="mt-4 space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/[.05] p-4">
                  <div className="text-sm font-black text-white">1. Create a Kalshi API key</div>
                  <p className="text-xs leading-5 text-slate-400">Open Kalshi Account Settings → API Keys → Create Key. Save the Key ID and downloaded private-key file.</p>
                  <a href="https://kalshi.com/account/profile" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-200">Open Kalshi settings</a>
                  <div className="pt-2 text-sm font-black text-white">2. Finish connection</div>
                  <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"><option value="DEMO">Demo / test</option><option value="LIVE">Live account</option></select>
                  <input value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)} placeholder="Kalshi API Key ID" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white" />
                  <label className="block text-xs font-black text-slate-300">Downloaded private-key file<input type="file" accept=".key,.txt,text/plain" onChange={handleKeyFile} className="mt-2 block w-full text-xs text-slate-400" /></label>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setConnectOpen(false)} className="min-h-11 rounded-xl border border-white/10 text-xs font-black text-slate-300">Cancel</button><button type="button" disabled={savingConnection} onClick={connectKalshi} className="min-h-11 rounded-xl border border-violet-300/30 bg-violet-500/10 text-xs font-black text-violet-100">{savingConnection ? "Verifying…" : "Connect"}</button></div>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5">
              <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-black text-white">Next live layer</h2></div>
              <div className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
                <div className="flex gap-3"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>Convert score, inning, outs, bases, pregame strength and pitchers into live fair probability.</span></div>
                <div className="flex gap-3"><RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>Compare fair probability to current executable Kalshi ask and create green/yellow/red decisions.</span></div>
              </div>
            </section>
          </aside>
        </section>

        <section className="rounded-[1.75rem] border border-rose-400/15 bg-rose-500/[.04] p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div><div className="font-black text-white">Live money stays locked</div><p className="mt-1 text-sm leading-6 text-slate-400">This stage exposes real sports and exchange data only. It does not place live orders. The model, paper execution, demo execution and risk engine must pass before live trading is enabled.</p></div></div></section>
      </main>
    </DashboardShell>
  );
}

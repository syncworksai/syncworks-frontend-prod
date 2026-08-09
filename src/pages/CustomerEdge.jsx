import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  Zap,
} from "lucide-react";

import api from "../api/client";
import DashboardShell from "../components/dashboard/DashboardShell";

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

function TickerItem({ game }) {
  const away = game.away?.code || game.away?.name;
  const home = game.home?.code || game.home?.name;
  const live = Boolean(game.is_live);
  return (
    <div className="min-w-[230px] rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black text-white">{away} {game.away?.score ?? 0} <span className="text-slate-600">@</span> {home} {game.home?.score ?? 0}</div>
        <span className={`text-[9px] font-black uppercase tracking-[.12em] ${live ? "text-emerald-300" : "text-slate-500"}`}>{live ? "LIVE" : game.status}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-slate-400">
        <span>{game.game_state}</span>
        <span className="font-black text-cyan-200">{away} {priceText(game.away_market?.yes_ask_cents)} · {home} {priceText(game.home_market?.yes_ask_cents)}</span>
      </div>
    </div>
  );
}

function adaptSignal(item, minEdge) {
  const edge = Number(item.edge_pct || 0);
  const yellowFloor = Math.max(3, Math.min(6, minEdge / 2));
  let signal = "RED";
  let action = edge < 0 ? "TOO LATE" : "PASS";
  if (edge >= minEdge) {
    signal = "GREEN";
    action = edge >= Math.max(10, minEdge + 2) ? "STRONG ENTRY" : "ENTRY";
  } else if (edge >= yellowFloor) {
    signal = "YELLOW";
    action = "WATCH";
  }
  return {
    ...item,
    signal,
    action,
    market: item.market_price_cents,
    model: item.model_probability_pct,
    edge,
    score: item.opportunity_score,
    maxEntry: item.max_entry_cents,
    gameState: item.game_state,
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
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">MLB • <span className={signalText[item.signal]}>{item.action}</span></div>
              <h3 className="mt-2 text-xl font-black text-white">{item.matchup}</h3>
              <p className="mt-1 text-xs text-slate-400">{item.gameState} • {item.model_version}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-right">
              <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">Opportunity</div>
              <div className={`mt-1 text-xl font-black ${signalText[item.signal]}`}>{item.score}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Trade" value={item.side} />
            <Metric label="Kalshi ask" value={`${item.market}¢`} detail={`Bid ${priceText(item.market_bid_cents)}`} />
            <Metric label="EDGE fair" value={`${item.model}%`} detail="Experimental fair value" />
            <Metric label="Live edge" value={`${positive ? "+" : ""}${item.edge}%`} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black ${signalText[item.signal]}`}>{item.signal}</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-slate-300">Max entry {item.maxEntry}¢</span>
            {item.signal === "GREEN" ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-200">Never chase above {item.maxEntry}¢</span> : null}
          </div>

          {item.why?.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {item.why.slice(0, 3).map((reason) => <div key={reason} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-xs leading-5 text-slate-300">{reason}</div>)}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function CustomerEdge() {
  const [sport, setSport] = useState("MLB");
  const [execution, setExecution] = useState("MANUAL");
  const [dailyRisk, setDailyRisk] = useState(15);
  const [perTrade, setPerTrade] = useState(1);
  const [minEdge, setMinEdge] = useState(8);
  const [dashboard, setDashboard] = useState(null);
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
      setMessage("EDGE account settings are temporarily unavailable.");
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
    if (!id) return setMessage("EDGE strategy settings are not available yet.");
    try {
      await api.patch(`/edge/strategies/${id}/`, {
        execution_mode: execution,
        daily_risk_limit_cents: Math.round(dailyRisk * 100),
        per_trade_limit_cents: Math.round(perTrade * 100),
        minimum_edge_bps: Math.round(minEdge * 100),
        never_chase: true,
      });
      setMessage(execution === "AUTO" ? "Pre-approved rules saved. Automation remains DISARMED while EDGE is experimental." : "Manual EDGE rules saved.");
      await loadDashboard();
    } catch {
      setMessage("Could not save EDGE settings.");
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
  const liveGames = liveBoard?.games || [];
  const liveSignals = useMemo(() => (liveBoard?.signals || []).map((item) => adaptSignal(item, minEdge)).sort((a, b) => b.edge - a.edge), [liveBoard, minEdge]);
  const signals = sport === "MLB" || sport === "ALL" ? liveSignals : [];
  const greenCount = liveSignals.filter((item) => item.signal === "GREEN").length;
  const liveCount = liveGames.filter((game) => game.is_live).length;

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Zap className="h-4 w-4" /> EDGE • Sports Market Intelligence</div>
              <h1 className="mt-2 text-3xl font-black text-white">Live value, not market chasing.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">The MLB board now converts live score, inning/outs, baserunners, season strength and Kalshi ask prices into an experimental fair value and live edge.</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">EDGE v0.1 LIVE • PAPER ONLY</div>
          </div>
          {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">{message}</div> : null}
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-3">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-200"><Wifi className="h-3.5 w-3.5" /> Live ticker</div>
            <div className="flex items-center gap-3">
              {lastLiveRefresh ? <span className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">{lastLiveRefresh.toLocaleTimeString()}</span> : null}
              <button type="button" onClick={() => loadLiveBoard()} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.04] px-2.5 text-[10px] font-black text-slate-300"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
            </div>
          </div>
          {liveLoading ? <div className="p-3 text-xs text-slate-500">Loading MLB + Kalshi…</div> : null}
          {!liveLoading && liveGames.length ? <div className="flex gap-2 overflow-x-auto pb-1">{liveGames.map((game) => <TickerItem key={game.game_pk} game={game} />)}</div> : null}
          {!liveLoading && !liveGames.length ? <div className="p-3 text-xs text-slate-500">Live MLB feed unavailable.</div> : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Green now" value={String(greenCount)} detail={`Requires +${minEdge}% edge`} />
          <Metric label="Live MLB" value={String(liveCount)} detail={`${liveGames.length} total games`} />
          <Metric label="Daily risk" value={`$${dailyRisk}`} detail={`$${perTrade} max per trade`} />
          <Metric label="Model" value="v0.1" detail="Experimental / calibration next" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.6fr_.85fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Live EDGE</div><h2 className="mt-1 text-xl font-black text-white">Best entries first</h2></div>
              <div className="flex flex-wrap gap-2">{["ALL", "MLB", "NFL", "NCAAF"].map((value) => <button key={value} type="button" onClick={() => setSport(value)} className={`min-h-10 rounded-xl border px-3 text-xs font-black ${sport === value ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{value}</button>)}</div>
            </div>

            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[.045] p-3 text-xs leading-5 text-amber-100">EDGE v0.1 is now driven by live data, but its probability coefficients are not yet backtested. Treat green/yellow/red as experimental paper signals until calibration is complete.</div>

            {signals.length ? <div className="space-y-3">{signals.map((item) => <SignalCard key={item.id} item={item} />)}</div> : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">{sport === "NFL" || sport === "NCAAF" ? `${sport} live model is the next sport adapter. MLB is active now.` : "No matched live MLB/Kalshi signals are available right now."}</div>
            )}
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
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" /><div><div className="font-black text-white">Never chase: ON</div><p className="mt-1 text-xs leading-5 text-slate-400">EDGE computes a max entry below model fair value. If the ask runs past it, the signal is no longer an entry.</p></div></div></div>
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
              <div className="flex items-center gap-3"><Activity className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-black text-white">Next build</h2></div>
              <div className="mt-3 text-xs leading-5 text-slate-400">Backtest and calibrate MLB live win expectancy, persist every signal/price snapshot, then add Kalshi WebSocket updates and paper auto-entry/exit. NFL and NCAAF adapters follow the same signal interface.</div>
            </section>
          </aside>
        </section>

        <section className="rounded-[1.75rem] border border-rose-400/15 bg-rose-500/[.04] p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div><div className="font-black text-white">Experimental model — live money stays locked</div><p className="mt-1 text-sm leading-6 text-slate-400">The screen now produces live model-vs-market signals, but v0.1 is a heuristic model. We need calibration and paper results before any automated or real-money execution is enabled.</p></div></div></section>
      </main>
    </DashboardShell>
  );
}

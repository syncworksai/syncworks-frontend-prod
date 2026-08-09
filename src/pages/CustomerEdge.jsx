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
  { id: 4, sport: "MLB", matchup: "LAD @ SF", gameState: "Bottom 7 • LAD leads 4–2", side: "LAD YES", market: 72, model: 63, edge: -9, score: 28, signal: "RED", action: "TOO LATE", maxEntry: 61, why: ["Current price exceeds model fair value", "Do not chase favorite", "Check opposite side before entering"] },
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
    why: ["Live EDGE signal", "Model probability compared with executable market price", "Never-chase ceiling enforced"],
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
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(item.why || []).map((reason) => <div key={reason} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-xs leading-5 text-slate-300">{reason}</div>)}
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
      setMessage("EDGE backend is not deployed yet. Showing the built-in paper preview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

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
    const text = await file.text();
    setPrivateKey(text);
  }

  async function connectKalshi() {
    if (!apiKeyId.trim() || !privateKey.includes("PRIVATE KEY")) {
      setMessage("Add the Kalshi Key ID and choose the downloaded private-key file.");
      return;
    }
    setSavingConnection(true);
    try {
      await api.post("/edge/exchanges/kalshi/", { environment, api_key_id: apiKeyId.trim(), private_key: privateKey });
      setPrivateKey("");
      setApiKeyId("");
      setConnectOpen(false);
      setMessage("Kalshi credentials saved securely. Verification/live trading remains locked for the next stage.");
      await loadDashboard();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Kalshi connection could not be saved.");
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

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Zap className="h-4 w-4" /> EDGE • Sports Market Intelligence</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find the price, not the pick.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">MLB, NFL and college-football value board. Green is a favorable entry, yellow is marginal/watch, and red means pass or too late.</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100">PAPER MODE • LIVE LOCKED</div>
          </div>
          {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">{message}</div> : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Paper trades" value={loading ? "…" : String(dashboard?.paper?.trades || 0)} detail="No real money" />
          <Metric label="Daily risk" value={`$${dailyRisk}`} detail={`$${perTrade} max per trade`} />
          <Metric label="Green threshold" value={`+${minEdge}%`} detail="Minimum model-market edge" />
          <Metric label="Kalshi" value={connection?.connected ? "Saved" : "Not connected"} detail={connection?.can_read ? "Verified read access" : connection?.connected ? "Verification pending" : "Connect when ready"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.55fr_.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Opportunity board</div><h2 className="mt-1 text-xl font-black text-white">Best opportunities first</h2></div>
              <div className="flex flex-wrap gap-2">{["ALL", "MLB", "NFL", "NCAAF"].map((value) => <button key={value} type="button" onClick={() => setSport(value)} className={`min-h-10 rounded-xl border px-3 text-xs font-black ${sport === value ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{value}</button>)}</div>
            </div>
            <div className="space-y-3">{signals.map((item) => <SignalCard key={item.id} item={item} />)}</div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3"><SlidersHorizontal className="h-5 w-5 text-cyan-300" /><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Execution</div><h2 className="mt-1 text-lg font-black text-white">Trading rules</h2></div></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setExecution("MANUAL")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "MANUAL" ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Manual</button>
                <button type="button" onClick={() => setExecution("AUTO")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "AUTO" ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Pre-approved</button>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">Pre-approved settings can be saved now, but cannot arm or place live trades until the exchange-verification and execution stage is complete.</p>
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
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"><div><div className="font-black text-white">Kalshi</div><div className="mt-1 text-xs text-slate-500">API connection</div></div><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-black text-slate-300">{connection?.connected ? "Saved" : "Not connected"}</span></div>
              {!connectOpen ? <button type="button" onClick={() => setConnectOpen(true)} className="mt-4 min-h-12 w-full rounded-2xl border border-violet-300/30 bg-violet-500/10 px-4 text-sm font-black text-violet-100">Connect Kalshi</button> : (
                <div className="mt-4 space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/[.05] p-4">
                  <div className="text-sm font-black text-white">1. Create a Kalshi API key</div>
                  <p className="text-xs leading-5 text-slate-400">Open Kalshi Account Settings → API Keys → Create Key. Save the Key ID and downloaded private-key file.</p>
                  <a href="https://kalshi.com/account/profile" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-200">Open Kalshi settings</a>
                  <div className="pt-2 text-sm font-black text-white">2. Finish connection</div>
                  <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"><option value="DEMO">Demo / test</option><option value="LIVE">Live account</option></select>
                  <input value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)} placeholder="Kalshi API Key ID" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white" />
                  <label className="block text-xs font-black text-slate-300">Downloaded private-key file<input type="file" accept=".key,.txt,text/plain" onChange={handleKeyFile} className="mt-2 block w-full text-xs text-slate-400" /></label>
                  <p className="text-[11px] leading-5 text-slate-500">The key is sent directly to the SyncWorks backend and encrypted there. EDGE never displays it again.</p>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setConnectOpen(false)} className="min-h-11 rounded-xl border border-white/10 text-xs font-black text-slate-300">Cancel</button><button type="button" disabled={savingConnection} onClick={connectKalshi} className="min-h-11 rounded-xl border border-violet-300/30 bg-violet-500/10 text-xs font-black text-violet-100">{savingConnection ? "Saving…" : "Save connection"}</button></div>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5">
              <div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-black text-white">Live engine stages</h2></div>
              <div className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
                <div className="flex gap-3"><Wifi className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span>Exchange bid/ask and order-book stream.</span></div>
                <div className="flex gap-3"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>Score, inning/clock, outs/possession and game state.</span></div>
                <div className="flex gap-3"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><span>Recalculate fair value and remaining edge after every material change.</span></div>
                <div className="flex gap-3"><RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>Paper entry/exit automation first, then verified live execution.</span></div>
              </div>
            </section>
          </aside>
        </section>

        <section className="rounded-[1.75rem] border border-rose-400/15 bg-rose-500/[.04] p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div><div className="font-black text-white">Live money stays locked</div><p className="mt-1 text-sm leading-6 text-slate-400">This build can save strategy settings and securely stage a Kalshi connection, but it cannot place a real-money order. We verify demo authentication, live feeds, execution safeguards, audit logs and kill-switch behavior before enabling that.</p></div></div></section>
      </main>
    </DashboardShell>
  );
}

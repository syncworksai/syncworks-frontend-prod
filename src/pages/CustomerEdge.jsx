import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  LockKeyhole,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  Wifi,
  X,
  Zap,
} from "lucide-react";

import api from "../api/client";
import DashboardShell from "../components/dashboard/DashboardShell";
import EdgeLivePaperPortfolio from "../components/edge/EdgeLivePaperPortfolio";
import EdgeResearchLab from "../components/edge/EdgeResearchLab";

const signalTone = {
  GREEN: "border-emerald-400/30 bg-emerald-500/[.08]",
  YELLOW: "border-amber-400/25 bg-amber-500/[.06]",
  RED: "border-white/10 bg-white/[.025]",
};
const signalText = { GREEN: "text-emerald-300", YELLOW: "text-amber-300", RED: "text-slate-400" };
const views = [
  ["LIVE", "Live", Activity],
  ["PORTFOLIO", "Portfolio", WalletCards],
  ["RESEARCH", "Research", BarChart3],
  ["SETTINGS", "Settings", Settings2],
];

function Metric({ label, value, detail, compact = false }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[.035] ${compact ? "p-3" : "p-4"}`}><div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</div><div className={`${compact ? "mt-1 text-xl" : "mt-2 text-2xl"} font-black text-white`}>{value}</div>{detail ? <div className="mt-1 text-xs text-slate-400">{detail}</div> : null}</div>;
}
function priceText(value) { return value === null || value === undefined ? "—" : `${value}¢`; }
function TickerItem({ game }) { const away = game.away?.code || game.away?.name; const home = game.home?.code || game.home?.name; const live = Boolean(game.is_live); return <div className="min-w-[215px] rounded-xl border border-white/10 bg-black/20 px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="text-xs font-black text-white">{away} {game.away?.score ?? 0} <span className="text-slate-600">@</span> {home} {game.home?.score ?? 0}</div><span className={`text-[9px] font-black uppercase tracking-[.12em] ${live ? "text-emerald-300" : "text-slate-500"}`}>{live ? "LIVE" : game.status}</span></div><div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-slate-400"><span>{game.game_state}</span><span className="font-black text-cyan-200">{away} {priceText(game.away_market?.yes_ask_cents)} · {home} {priceText(game.home_market?.yes_ask_cents)}</span></div></div>; }
function adaptSignal(item, minEdge) { const edge = Number(item.edge_pct || 0); const yellowFloor = Math.max(3, Math.min(6, minEdge / 2)); let signal = "RED"; let action = edge < 0 ? "TOO LATE" : "PASS"; if (edge >= minEdge) { signal = "GREEN"; action = edge >= Math.max(10, minEdge + 2) ? "PRIME" : "ENTRY"; } else if (edge >= yellowFloor) { signal = "YELLOW"; action = "WATCH"; } return { ...item, signal, action, market: item.market_price_cents, model: item.model_probability_pct, edge, score: item.opportunity_score, maxEntry: item.max_entry_cents, gameState: item.game_state }; }

function SignalRow({ item, onOpen }) {
  const positive = item.edge >= 0;
  return <button type="button" onClick={() => onOpen(item)} className={`w-full rounded-2xl border p-3 text-left transition hover:border-cyan-300/25 ${signalTone[item.signal] || signalTone.RED}`}>
    <div className="grid items-center gap-3 lg:grid-cols-[1.45fr_.8fr_.8fr_.8fr_.65fr_auto]">
      <div className="min-w-0"><div className={`text-[9px] font-black uppercase tracking-[.15em] ${signalText[item.signal]}`}>MLB • {item.action}</div><div className="mt-1 truncate text-sm font-black text-white">{item.matchup} • {item.side}</div><div className="mt-1 truncate text-[11px] text-slate-500">{item.gameState}</div></div>
      <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">Market</div><div className="mt-1 text-sm font-black text-white">{item.market}¢</div></div>
      <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">EDGE fair</div><div className="mt-1 text-sm font-black text-cyan-200">{item.model}%</div></div>
      <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">Live edge</div><div className={`mt-1 text-sm font-black ${signalText[item.signal]}`}>{positive ? "+" : ""}{item.edge}%</div></div>
      <div><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">Score</div><div className="mt-1 text-sm font-black text-white">{item.score}</div></div>
      <ChevronRight className="h-4 w-4 text-slate-500" />
    </div>
  </button>;
}

function SignalDrawer({ item, onClose }) {
  if (!item) return null;
  return <div className="fixed inset-0 z-[80] flex justify-end bg-black/55 backdrop-blur-sm" onMouseDown={onClose}><aside className="h-full w-full max-w-lg overflow-y-auto border-l border-cyan-300/20 bg-slate-950 p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
    <div className="flex items-start justify-between gap-4"><div><div className={`text-[10px] font-black uppercase tracking-[.18em] ${signalText[item.signal]}`}>MLB • {item.action}</div><h2 className="mt-2 text-2xl font-black text-white">{item.matchup}</h2><div className="mt-1 text-sm text-slate-400">{item.gameState} • {item.model_version}</div></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300"><X className="h-4 w-4" /></button></div>
    {item.signal === "GREEN" ? <div className="mt-5 rounded-2xl border border-emerald-300/35 bg-emerald-500/10 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">THIS IS A PRIME ENTRY • PAPER SIGNAL</div><div className="mt-1 text-sm text-emerald-100">The current state meets your configured minimum-edge threshold. This is not a guaranteed outcome.</div></div> : null}
    <div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Trade" value={item.side} compact /><Metric label="Kalshi ask" value={`${item.market}¢`} detail={`Bid ${priceText(item.market_bid_cents)}`} compact /><Metric label="EDGE fair" value={`${item.model}%`} detail="Experimental fair value" compact /><Metric label="Live edge" value={`${item.edge >= 0 ? "+" : ""}${item.edge}%`} compact /><Metric label="Max entry" value={`${item.maxEntry}¢`} compact /><Metric label="Opportunity" value={item.score} compact /></div>
    <div className="mt-5"><div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Why EDGE sees it</div><div className="mt-3 space-y-2">{item.why?.length ? item.why.map((reason) => <div key={reason} className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-sm leading-5 text-slate-300">{reason}</div>) : <div className="text-sm text-slate-500">No detailed factors were returned for this signal.</div>}</div></div>
    <div className="mt-5 rounded-2xl border border-rose-400/15 bg-rose-500/[.04] p-4 text-xs leading-5 text-slate-400"><span className="font-black text-rose-200">Risk:</span> PRIME means the model sees a favorable entry relative to its estimate. Market prices can move against the position immediately, liquidity can change, and the full amount risked may be lost.</div>
  </aside></div>;
}

export default function CustomerEdge() {
  const [view, setView] = useState("LIVE");
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
  const [selectedSignal, setSelectedSignal] = useState(null);

  async function loadDashboard() { try { const response = await api.get("/edge/dashboard/"); setDashboard(response.data); const strategy = response.data?.strategy; if (strategy) { setExecution(strategy.execution_mode === "AUTO" ? "AUTO" : "MANUAL"); setDailyRisk(Number(strategy.daily_risk_limit_cents || 1500) / 100); setPerTrade(Number(strategy.per_trade_limit_cents || 100) / 100); setMinEdge(Number(strategy.minimum_edge_bps || 800) / 100); } } catch { setMessage("EDGE account settings are temporarily unavailable."); } }
  async function loadLiveBoard(silent = false) { if (!silent) setLiveLoading(true); try { const response = await api.get("/edge/live/mlb/"); setLiveBoard(response.data); setLastLiveRefresh(new Date()); } catch { if (!silent) setLiveBoard(null); } finally { if (!silent) setLiveLoading(false); } }
  useEffect(() => { loadDashboard(); loadLiveBoard(); const timer = window.setInterval(() => loadLiveBoard(true), 10000); return () => window.clearInterval(timer); }, []);
  async function saveStrategy() { const id = dashboard?.strategy?.id; if (!id) return setMessage("EDGE strategy settings are not available yet."); try { await api.patch(`/edge/strategies/${id}/`, { execution_mode: execution, daily_risk_limit_cents: Math.round(dailyRisk * 100), per_trade_limit_cents: Math.round(perTrade * 100), minimum_edge_bps: Math.round(minEdge * 100), never_chase: true }); setMessage(execution === "AUTO" ? "Pre-approved rules saved. Automation remains DISARMED while EDGE is experimental." : "Manual EDGE rules saved."); await loadDashboard(); } catch { setMessage("Could not save EDGE settings."); } }
  async function handleKeyFile(event) { const file = event.target.files?.[0]; if (!file) return; setPrivateKey(await file.text()); }
  async function connectKalshi() { if (!apiKeyId.trim() || !privateKey.includes("PRIVATE KEY")) { setMessage("Add the Kalshi Key ID and choose the downloaded private-key file."); return; } setSavingConnection(true); try { const response = await api.post("/edge/exchanges/kalshi/", { environment, api_key_id: apiKeyId.trim(), private_key: privateKey }); setPrivateKey(""); setApiKeyId(""); setConnectOpen(false); setMessage(response.data?.message || "Kalshi connected."); await loadDashboard(); } catch (error) { setMessage(error?.response?.data?.detail || "Kalshi connection could not be verified."); } finally { setSavingConnection(false); } }

  const connection = dashboard?.connections?.find((item) => item.exchange === "KALSHI");
  const liveGames = liveBoard?.games || [];
  const liveSignals = useMemo(() => (liveBoard?.signals || []).map((item) => adaptSignal(item, minEdge)).sort((a, b) => { const rank = { GREEN: 3, YELLOW: 2, RED: 1 }; return (rank[b.signal] - rank[a.signal]) || (b.edge - a.edge); }), [liveBoard, minEdge]);
  const signals = sport === "MLB" || sport === "ALL" ? liveSignals : [];
  const greenSignals = liveSignals.filter((item) => item.signal === "GREEN");
  const watchSignals = liveSignals.filter((item) => item.signal === "YELLOW");
  const liveCount = liveGames.filter((game) => game.is_live).length;
  const visibleSignals = signals.slice(0, 12);

  return <DashboardShell><main className="mx-auto w-full max-w-[1500px] space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
    <section className="rounded-[1.75rem] border border-cyan-400/20 bg-slate-950/70 p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Zap className="h-4 w-4" /> EDGE • Sports Market Intelligence</div><h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Find the entry. Trade the repricing.</h1><p className="mt-1 max-w-3xl text-sm text-slate-400">Compact command center for live signals, paper performance, research, and risk settings.</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100">EDGE v0.5 • PAPER ONLY</span><button type="button" onClick={() => loadLiveBoard()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-300"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button></div></div>{message ? <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">{message}</div> : null}</section>

    <nav className="sticky top-0 z-30 rounded-2xl border border-white/10 bg-slate-950/90 p-1.5 backdrop-blur-xl"><div className="flex gap-1 overflow-x-auto">{views.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setView(key)} className={`inline-flex min-h-11 min-w-[118px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition ${view === key ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-300/25" : "text-slate-400 hover:bg-white/[.04] hover:text-white"}`}><Icon className="h-4 w-4" /> {label}</button>)}</div></nav>

    {view === "LIVE" ? <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="PRIME now" value={String(greenSignals.length)} detail={`Requires +${minEdge}% edge`} /><Metric label="Watch list" value={String(watchSignals.length)} detail="Near entry threshold" /><Metric label="Live MLB" value={String(liveCount)} detail={`${liveGames.length} total games`} /><Metric label="Per trade" value={`$${perTrade}`} detail={`$${dailyRisk} daily max`} /><Metric label="Last refresh" value={lastLiveRefresh ? lastLiveRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} detail="Auto refresh every 10 sec" /></section>

      {greenSignals.length ? <section className="rounded-[1.5rem] border border-emerald-300/30 bg-emerald-500/[.07] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200">PRIME ALERT</div><div className="mt-1 text-lg font-black text-white">{greenSignals.length} qualifying entr{greenSignals.length === 1 ? "y" : "ies"} right now</div></div><button type="button" onClick={() => setSelectedSignal(greenSignals[0])} className="min-h-10 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 text-xs font-black text-emerald-100">Open best PRIME</button></div></section> : <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4"><div className="text-sm font-black text-white">No PRIME entry right now.</div><div className="mt-1 text-xs text-slate-500">Staying out is part of the strategy. EDGE will keep scanning.</div></section>}

      <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-3"><div className="mb-2 flex items-center justify-between gap-3 px-1"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-200"><Wifi className="h-3.5 w-3.5" /> Live ticker</div><div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">MLB + Kalshi</div></div>{liveLoading ? <div className="p-3 text-xs text-slate-500">Loading live board…</div> : null}{!liveLoading && liveGames.length ? <div className="flex gap-2 overflow-x-auto pb-1">{liveGames.map((game) => <TickerItem key={game.game_pk} game={game} />)}</div> : null}{!liveLoading && !liveGames.length ? <div className="p-3 text-xs text-slate-500">Live MLB feed unavailable.</div> : null}</section>

      <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Market Scanner</div><h2 className="mt-1 text-xl font-black text-white">Best opportunities first</h2><p className="mt-1 text-xs text-slate-500">Tap any row for the full game-intelligence drawer.</p></div><div className="flex flex-wrap gap-2">{["ALL", "MLB", "NFL", "NCAAF"].map((value) => <button key={value} type="button" onClick={() => setSport(value)} className={`min-h-9 rounded-xl border px-3 text-[11px] font-black ${sport === value ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{value}</button>)}</div></div>
        {sport === "NFL" || sport === "NCAAF" ? <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-500/[.045] p-3 text-xs text-amber-100">{sport} heat-map research is available under Research. The live adapter is not yet connected, so no live football signal is presented here.</div> : null}
        <div className="mt-4 space-y-2">{visibleSignals.length ? visibleSignals.map((item) => <SignalRow key={item.id} item={item} onOpen={setSelectedSignal} />) : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500">No matched live signals are available right now.</div>}</div>
        {signals.length > visibleSignals.length ? <button type="button" onClick={() => setView("RESEARCH")} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[.025] px-3 py-3 text-xs font-black text-slate-300">{signals.length - visibleSignals.length} more signals available • Open Research</button> : null}
      </section>

      <section className="grid gap-3 lg:grid-cols-3"><button type="button" onClick={() => setView("PORTFOLIO")} className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[.035] p-4 text-left"><div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-200">Paper portfolio</div><div className="mt-1 text-lg font-black text-white">Open the $50 testing studio</div><div className="mt-1 text-xs text-slate-500">Equity, P/L, strategy race, trades, and full ledger.</div></button><button type="button" onClick={() => setView("RESEARCH")} className="rounded-2xl border border-cyan-300/15 bg-cyan-500/[.035] p-4 text-left"><div className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-200">Research</div><div className="mt-1 text-lg font-black text-white">Heat maps + backtests</div><div className="mt-1 text-xs text-slate-500">MLB, NFL, NCAAF setup research and frozen strategy validation.</div></button><button type="button" onClick={() => setView("SETTINGS")} className="rounded-2xl border border-violet-300/15 bg-violet-500/[.035] p-4 text-left"><div className="text-[10px] font-black uppercase tracking-[.14em] text-violet-200">Risk + account</div><div className="mt-1 text-lg font-black text-white">Execution settings</div><div className="mt-1 text-xs text-slate-500">Risk caps, minimum edge, Kalshi connection, and disclosures.</div></button></section>
    </> : null}

    {view === "PORTFOLIO" ? <section><div className="mb-3"><div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">Portfolio</div><h2 className="mt-1 text-2xl font-black text-white">Live paper testing studio</h2><p className="mt-1 text-sm text-slate-400">Performance and trade history are isolated here so the live scanner stays fast and readable.</p></div><EdgeLivePaperPortfolio /></section> : null}

    {view === "RESEARCH" ? <section><div className="mb-3"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Research</div><h2 className="mt-1 text-2xl font-black text-white">Strategy lab, heat maps, and validation</h2><p className="mt-1 text-sm text-slate-400">Deep research lives here instead of competing with live decisions.</p></div><EdgeResearchLab /></section> : null}

    {view === "SETTINGS" ? <section className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5"><div className="flex items-center gap-3"><SlidersHorizontal className="h-5 w-5 text-cyan-300" /><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Execution</div><h2 className="mt-1 text-lg font-black text-white">Trading rules</h2></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setExecution("MANUAL")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "MANUAL" ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Manual</button><button type="button" onClick={() => setExecution("AUTO")} className={`min-h-12 rounded-2xl border px-3 text-sm font-black ${execution === "AUTO" ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>Pre-approved</button></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="block text-xs font-black text-slate-300">Daily max risk<input type="number" min="1" value={dailyRisk} onChange={(e) => setDailyRisk(Number(e.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" /></label><label className="block text-xs font-black text-slate-300">Max per trade<input type="number" min="1" value={perTrade} onChange={(e) => setPerTrade(Number(e.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" /></label><label className="block text-xs font-black text-slate-300">Minimum edge (%)<input type="number" min="1" value={minEdge} onChange={(e) => setMinEdge(Number(e.target.value || 0))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white" /></label></div><button type="button" onClick={saveStrategy} className="mt-4 min-h-12 w-full rounded-2xl border border-cyan-300/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">Save rules</button><div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" /><div><div className="font-black text-white">Never chase: ON</div><p className="mt-1 text-xs leading-5 text-slate-400">Research thresholds remain separate from live-money execution.</p></div></div></div></section>

      <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-violet-300" /><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200">Account</div><h2 className="mt-1 text-lg font-black text-white">Connect Kalshi</h2></div></div><div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"><div><div className="font-black text-white">Kalshi</div><div className="mt-1 text-xs text-slate-500">API connection</div></div><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-black text-slate-300">{connection?.connected ? "Connected" : "Not connected"}</span></div>{!connectOpen ? <button type="button" onClick={() => setConnectOpen(true)} className="mt-4 min-h-12 w-full rounded-2xl border border-violet-300/30 bg-violet-500/10 px-4 text-sm font-black text-violet-100">Connect Kalshi</button> : <div className="mt-4 space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/[.05] p-4"><div className="text-sm font-black text-white">Create or use a Kalshi API key</div><p className="text-xs leading-5 text-slate-400">Save the Key ID and downloaded private-key file. Never paste the private key into chat.</p><a href="https://kalshi.com/account/profile" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-slate-200">Open Kalshi settings</a><select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"><option value="DEMO">Demo / test</option><option value="LIVE">Live account</option></select><input value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)} placeholder="Kalshi API Key ID" className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white" /><label className="block text-xs font-black text-slate-300">Downloaded private-key file<input type="file" accept=".key,.txt,text/plain" onChange={handleKeyFile} className="mt-2 block w-full text-xs text-slate-400" /></label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setConnectOpen(false)} className="min-h-11 rounded-xl border border-white/10 text-xs font-black text-slate-300">Cancel</button><button type="button" disabled={savingConnection} onClick={connectKalshi} className="min-h-11 rounded-xl border border-violet-300/30 bg-violet-500/10 text-xs font-black text-violet-100">{savingConnection ? "Verifying…" : "Connect"}</button></div></div>}</section>

      <section className="xl:col-span-2 rounded-[1.75rem] border border-rose-400/15 bg-rose-500/[.04] p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" /><div><div className="font-black text-white">Risk & important disclosures</div><div className="mt-3 grid gap-3 text-xs leading-5 text-slate-400 md:grid-cols-2"><p><span className="font-black text-slate-200">Loss of capital.</span> Prediction-market and sports-event positions are speculative. You can lose some or all of the money committed to a position.</p><p><span className="font-black text-slate-200">PRIME is not a guarantee.</span> A PRIME label means the experimental model sees a qualifying setup relative to its estimate. It does not guarantee a win, profitable exit, or 2× repricing.</p><p><span className="font-black text-slate-200">Paper results differ from live trading.</span> Forward tests and backtests can omit or underestimate latency, spread, slippage, fees, liquidity constraints, partial fills, outages, and behavioral differences.</p><p><span className="font-black text-slate-200">Past performance is not predictive.</span> Historical and simulated results do not ensure future returns. Models can fail when market behavior, team conditions, pricing, or data quality changes.</p><p><span className="font-black text-slate-200">Eligibility and platform rules matter.</span> Users are responsible for complying with applicable law, location restrictions, age requirements, exchange terms, funding rules, and tax obligations.</p><p><span className="font-black text-slate-200">Research status.</span> EDGE remains experimental and live-money automation is not represented as proven or guaranteed. Only risk money you can afford to lose.</p></div></div></div></section>
    </section> : null}

    <SignalDrawer item={selectedSignal} onClose={() => setSelectedSignal(null)} />
  </main></DashboardShell>;
}

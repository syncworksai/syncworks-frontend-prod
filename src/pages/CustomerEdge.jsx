import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, ChevronRight, LockKeyhole, RefreshCw, Settings2, SlidersHorizontal, Target, TrendingUp, Trophy, WalletCards, Wifi, X, Zap } from "lucide-react";

import api from "../api/client";
import DashboardShell from "../components/dashboard/DashboardShell";
import EdgeLivePaperPortfolio from "../components/edge/EdgeLivePaperPortfolio";
import EdgeResearchLab from "../components/edge/EdgeResearchLab";
import EdgeStrategyV2Race from "../components/edge/EdgeStrategyV2Race";

const views = [["LIVE", "Live", Activity], ["PORTFOLIO", "Portfolio", WalletCards], ["RESEARCH", "Research", BarChart3], ["SETTINGS", "Settings", Settings2]];
const sports = ["NFL", "NCAAF", "MLB"];
const endpoints = { NFL: "/edge/live/nfl/", NCAAF: "/edge/live/ncaaf/", MLB: "/edge/live/mlb/" };
const signalTone = {
  GREEN: "border-emerald-400/35 bg-emerald-500/[.08]",
  YELLOW: "border-amber-400/25 bg-amber-500/[.05]",
  RED: "border-white/10 bg-white/[.02]",
};
const signalText = { GREEN: "text-emerald-300", YELLOW: "text-amber-300", RED: "text-slate-400" };

function formatDateTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function money(cents) {
  const value = Number(cents || 0) / 100;
  return value ? `$${value.toFixed(value % 1 ? 2 : 0)}` : "$0";
}

function signedMoney(cents) {
  const value = Number(cents || 0);
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

function Metric({ label, value, detail, tone = "text-white" }) {
  return <div className="min-w-0 rounded-lg border border-white/10 bg-white/[.03] px-2 py-2">
    <div className="truncate text-[8px] font-black uppercase tracking-[.11em] text-slate-500">{label}</div>
    <div className={`mt-0.5 truncate text-base font-black leading-none sm:text-lg ${tone}`}>{value}</div>
    {detail ? <div className="mt-1 truncate text-[8px] text-slate-500">{detail}</div> : null}
  </div>;
}

function priceText(value) {
  return value === null || value === undefined ? "—" : `${value}¢`;
}

function estimatedFeeCents(contracts, priceCents) {
  const count = Number(contracts || 0);
  const price = Number(priceCents || 0);
  if (!count || price <= 0 || price >= 100) return 0;
  const p = price / 100;
  return Math.ceil(0.07 * count * p * (1 - p) * 100 - 1e-9);
}

function TickerItem({ game, sport }) {
  const away = game.away?.code || game.away?.name;
  const home = game.home?.code || game.home?.name;
  const live = Boolean(game.is_live);
  return <div className="min-w-[168px] rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
    <div className="flex items-center justify-between gap-2">
      <div className="truncate text-[10px] font-black text-white">{away} <span className="text-slate-600">@</span> {home}</div>
      <span className={`text-[7px] font-black uppercase ${live ? "text-emerald-300" : "text-slate-500"}`}>{live ? "LIVE" : sport}</span>
    </div>
    <div className="mt-1 flex items-center justify-between gap-2 text-[8px] text-slate-500">
      <span className="truncate">{game.game_state || game.status}</span>
      <span className="shrink-0 font-black text-cyan-200">{priceText(game.away_market?.yes_ask_cents)} / {priceText(game.home_market?.yes_ask_cents)}</span>
    </div>
  </div>;
}

function adaptSignal(item, minEdge, observedAt) {
  const edge = Number(item.edge_pct || 0);
  const market = Number(item.market_price_cents || 0);
  const model = Number(item.model_probability_pct || 0);
  const yellowFloor = Math.max(3, Math.min(6, minEdge / 2));
  let signal = item.signal || "RED";
  if (!item.signal) signal = edge >= minEdge ? "GREEN" : edge >= yellowFloor ? "YELLOW" : "RED";
  const action = signal === "GREEN" ? (edge >= Math.max(10, minEdge + 2) ? "STRONG BUY" : "BUY") : signal === "YELLOW" ? "WATCH" : "PASS";
  const oneContractFee = estimatedFeeCents(1, market);
  const netEdge = Number((model - market - oneContractFee).toFixed(1));
  const plan = item.stake_plan || {};
  const planCost = Number(plan.estimated_cost_cents || 0);
  const planPayout = Number(plan.gross_payout_cents || 0);
  const planEv = planCost > 0 ? Math.round((model / 100) * planPayout - planCost) : 0;
  return {
    ...item,
    id: item.id || item.market_ticker || `${item.sport || "EDGE"}-${item.event_key || item.matchup}-${item.team_code || item.side}`,
    signal,
    action,
    market,
    model,
    edge,
    netEdge,
    planEv,
    score: Number(item.opportunity_score || 0),
    maxEntry: item.max_entry_cents,
    gameState: item.game_state,
    observedAt,
  };
}

function SignalRow({ item, onOpen, priority = false, rank }) {
  const plan = item.stake_plan || {};
  const hasPlan = Number(plan.contracts || 0) > 0;
  const tone = priority ? "border-emerald-300/60 bg-emerald-500/[.11] shadow-[0_0_18px_rgba(57,255,136,0.12)]" : signalTone[item.signal] || signalTone.RED;
  return <button type="button" onClick={() => onOpen(item)} className={`w-full rounded-xl border px-2.5 py-2.5 text-left transition active:scale-[.995] ${tone}`}>
    <div className="flex items-start gap-2">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black ${priority ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-black/20 text-slate-400"}`}>#{rank}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={`flex flex-wrap items-center gap-1 text-[8px] font-black uppercase tracking-[.11em] ${signalText[item.signal]}`}>
              <span>{item.action}</span>
              {item.primary_price_band ? <span className="rounded border border-cyan-300/20 bg-cyan-500/10 px-1 py-0.5 text-[7px] text-cyan-100">VALUE BAND</span> : null}
              {priority ? <span className="rounded border border-emerald-300/25 bg-emerald-500/10 px-1 py-0.5 text-[7px] text-emerald-100">BEST VALUE</span> : null}
            </div>
            <div className="mt-0.5 truncate text-[12px] font-black text-white sm:text-sm">{item.side} <span className="font-medium text-slate-500">• {item.matchup}</span></div>
          </div>
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
        </div>

        <div className="mt-1.5 grid grid-cols-4 gap-1 border-t border-white/[.06] pt-1.5">
          <div><div className="text-[7px] font-black uppercase text-slate-600">Buy now</div><div className="text-[11px] font-black text-white">{item.market}¢</div></div>
          <div><div className="text-[7px] font-black uppercase text-slate-600">Our fair</div><div className="text-[11px] font-black text-cyan-200">{item.model}%</div></div>
          <div><div className="text-[7px] font-black uppercase text-slate-600">Gap</div><div className={`text-[11px] font-black ${signalText[item.signal]}`}>{item.edge >= 0 ? "+" : ""}{item.edge} pts</div></div>
          <div><div className="text-[7px] font-black uppercase text-slate-600">Plan</div><div className="text-[11px] font-black text-white">{hasPlan ? money(plan.estimated_cost_cents) : "—"}</div></div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[8px] text-slate-500">
          <span className="truncate">{item.gameState}</span>
          <span className={`shrink-0 font-black ${item.planEv > 0 ? "text-emerald-300" : "text-slate-500"}`}>{hasPlan ? `Model EV ${signedMoney(item.planEv)}` : `Max buy ${priceText(item.maxEntry)}`}</span>
        </div>
      </div>
    </div>
  </button>;
}

function BestPickCard({ item, onOpen }) {
  if (!item) return null;
  const plan = item.stake_plan || {};
  const hasPlan = Number(plan.contracts || 0) > 0;
  return <button type="button" onClick={() => onOpen(item)} className="w-full rounded-2xl border border-emerald-300/35 bg-gradient-to-br from-emerald-500/[.13] via-cyan-500/[.06] to-transparent p-3 text-left shadow-[0_0_28px_rgba(16,185,129,0.08)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.14em] text-emerald-200"><Trophy className="h-3 w-3" /> Best EDGE value right now</div>
        <div className="mt-1 truncate text-lg font-black text-white sm:text-xl">{item.side}</div>
        <div className="truncate text-[10px] text-slate-400">{item.matchup} • {item.gameState}</div>
      </div>
      <div className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-100">{item.action}</div>
    </div>

    <div className="mt-3 grid grid-cols-4 gap-1.5">
      <Metric label="Market asks" value={`${item.market}¢`} />
      <Metric label="Our fair" value={`${item.model}%`} tone="text-cyan-200" />
      <Metric label="Price gap" value={`${item.edge >= 0 ? "+" : ""}${item.edge}`} detail="percentage pts" tone="text-emerald-300" />
      <Metric label="Max buy" value={priceText(item.maxEntry)} detail="do not chase" />
    </div>

    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[.07] bg-black/20 px-2.5 py-2 text-[9px]">
      <span className="text-slate-400">Market is <span className="font-black text-white">{Math.abs(item.edge).toFixed(1)} points {item.edge >= 0 ? "below" : "above"}</span> our no-vig fair estimate.</span>
      <span className={`font-black ${item.planEv > 0 ? "text-emerald-300" : "text-slate-400"}`}>{hasPlan ? `${money(plan.estimated_cost_cents)} risk • model EV ${signedMoney(item.planEv)}` : "Watch only"}</span>
    </div>
  </button>;
}

function SignalDrawer({ item, onClose, priority = false }) {
  if (!item) return null;
  const plan = item.stake_plan || {};
  const hasPlan = Number(plan.contracts || 0) > 0;
  return <div className="fixed inset-0 z-[90] flex items-end justify-end bg-black/60 backdrop-blur-sm sm:items-stretch" onMouseDown={onClose}>
    <aside className="max-h-[80vh] w-full overflow-y-auto rounded-t-[1.4rem] border-t border-cyan-300/20 bg-slate-950 p-3.5 shadow-2xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0 sm:p-5" onMouseDown={(e) => e.stopPropagation()}>
      <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-white/20 sm:hidden" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[8px] font-black uppercase tracking-[.14em] ${signalText[item.signal]}`}>{item.sport || "MLB"} • {item.action}{priority ? " • BEST VALUE" : ""}</div>
          <h2 className="mt-1 text-lg font-black text-white">{item.side}</h2>
          <div className="mt-0.5 text-[10px] text-slate-400">{item.matchup} • {item.gameState}</div>
        </div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.04] text-slate-300"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Metric label="Ask" value={`${item.market}¢`} />
        <Metric label="Fair" value={`${item.model}%`} />
        <Metric label="Gap" value={`${item.edge >= 0 ? "+" : ""}${item.edge}`} detail="pts" />
        <Metric label="Max buy" value={priceText(item.maxEntry)} />
      </div>

      <section className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-500/[.04] p-3">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.13em] text-cyan-200"><Target className="h-3 w-3" /> What the strategy sees</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Metric label="Raw edge" value={`${item.edge >= 0 ? "+" : ""}${item.edge} pts`} />
          <Metric label="After 1-contract fee" value={`${item.netEdge >= 0 ? "+" : ""}${item.netEdge} pts`} />
        </div>
        <div className="mt-2 text-[9px] leading-4 text-slate-400">We compare the Kalshi YES ask with the no-vig reference win probability. Lower market price + higher fair probability = a larger value gap. Do not chase above the max-buy price.</div>
      </section>

      {hasPlan ? <section className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-500/[.06] p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[.13em] text-emerald-200">$100 pool • 4 × $25</div>
            <div className="mt-0.5 text-sm font-black text-white">{plan.contracts} contracts • {money(plan.estimated_cost_cents)} total risk</div>
          </div>
          {item.primary_price_band ? <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[8px] font-black text-cyan-100">VALUE BAND</div> : null}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <Metric label="Pays" value={money(plan.gross_payout_cents)} />
          <Metric label="Profit if win" value={`+${money(plan.profit_if_correct_cents)}`} />
          <Metric label="Model EV" value={signedMoney(item.planEv)} tone={item.planEv > 0 ? "text-emerald-300" : "text-slate-300"} />
          <Metric label="Each risks" value={money(plan.per_person_cost_cents)} />
        </div>
        <div className="mt-2 text-[9px] leading-4 text-slate-500">{plan.fee_note}</div>
      </section> : <div className="mt-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-[10px] text-slate-400">This price does not clear the configured edge threshold, so the pool model assigns no stake.</div>}

      <div className="mt-3">
        <div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-500">Why it ranks here</div>
        <div className="mt-1.5 space-y-1.5">{item.why?.length ? item.why.map((reason) => <div key={reason} className="rounded-lg border border-white/10 bg-white/[.025] px-2.5 py-2 text-[10px] leading-4 text-slate-300">{reason}</div>) : <div className="text-[10px] text-slate-500">No detailed factors returned.</div>}</div>
      </div>

      <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-500/[.04] p-2.5 text-[9px] leading-4 text-slate-400"><span className="font-black text-rose-200">Risk:</span> this is a model-derived value ranking, not a guaranteed winner. Prices and reference odds can change before execution and the full amount risked can be lost.</div>
    </aside>
  </div>;
}

export default function CustomerEdge() {
  const [view, setView] = useState("LIVE");
  const [sport, setSport] = useState("NFL");
  const [execution, setExecution] = useState("MANUAL");
  const [dailyRisk, setDailyRisk] = useState(30);
  const [perTrade, setPerTrade] = useState(5);
  const [minEdge, setMinEdge] = useState(5);
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

  async function loadDashboard() {
    try {
      const response = await api.get("/edge/dashboard/");
      setDashboard(response.data);
      const strategy = response.data?.strategy;
      if (strategy) {
        setExecution(strategy.execution_mode === "AUTO" ? "AUTO" : "MANUAL");
        setDailyRisk(Number(strategy.daily_risk_limit_cents || 3000) / 100);
        setPerTrade(Number(strategy.per_trade_limit_cents || 500) / 100);
        setMinEdge(Number(strategy.minimum_edge_bps || 500) / 100);
      }
    } catch {
      setMessage("EDGE account settings are temporarily unavailable.");
    }
  }

  async function loadLiveBoard(silent = false, requestedSport = sport) {
    if (!silent) setLiveLoading(true);
    try {
      const response = await api.get(endpoints[requestedSport], { params: { minimum_edge: minEdge } });
      setLiveBoard(response.data);
      setLastLiveRefresh(new Date());
      if (!silent) setMessage("");
    } catch (error) {
      if (!silent) {
        setLiveBoard(null);
        setMessage(error?.response?.data?.detail || `${requestedSport} feed could not load. Tap refresh to retry.`);
      }
    } finally {
      if (!silent) setLiveLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => {
    setSelectedSignal(null);
    loadLiveBoard(false, sport);
    const seconds = sport === "MLB" ? 10 : 30;
    const timer = window.setInterval(() => loadLiveBoard(true, sport), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [sport, minEdge]);

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
      setMessage("EDGE rules saved.");
      await loadDashboard();
      await loadLiveBoard();
    } catch {
      setMessage("Could not save EDGE settings.");
    }
  }

  async function handleKeyFile(event) {
    const file = event.target.files?.[0];
    if (file) setPrivateKey(await file.text());
  }

  async function connectKalshi() {
    if (!apiKeyId.trim() || !privateKey.includes("PRIVATE KEY")) return setMessage("Add the Kalshi Key ID and private-key file.");
    setSavingConnection(true);
    try {
      const response = await api.post("/edge/exchanges/kalshi/", { environment, api_key_id: apiKeyId.trim(), private_key: privateKey });
      setMessage(response.data?.message || "Kalshi connected.");
      setConnectOpen(false);
      setPrivateKey("");
      setApiKeyId("");
      await loadDashboard();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Kalshi connection could not be verified.");
    } finally {
      setSavingConnection(false);
    }
  }

  const connection = dashboard?.connections?.find((item) => item.exchange === "KALSHI");
  const liveGames = liveBoard?.games || [];
  const observedAt = lastLiveRefresh?.toISOString?.() || null;
  const liveSignals = useMemo(() => (liveBoard?.signals || []).map((item) => adaptSignal(item, minEdge, observedAt)).sort((a, b) => {
    const rank = { GREEN: 3, YELLOW: 2, RED: 1 };
    return (rank[b.signal] - rank[a.signal]) || (Number(b.primary_price_band) - Number(a.primary_price_band)) || (b.netEdge - a.netEdge) || (b.edge - a.edge) || (b.score - a.score);
  }), [liveBoard, minEdge, observedAt]);

  const greenSignals = liveSignals.filter((item) => item.signal === "GREEN");
  const watchSignals = liveSignals.filter((item) => item.signal === "YELLOW");
  const valueBandSignals = liveSignals.filter((item) => item.primary_price_band && item.signal !== "RED");
  const actionableSignals = liveSignals.filter((item) => item.signal !== "RED");
  const visibleSignals = (actionableSignals.length ? actionableSignals : liveSignals).slice(0, 16);
  const bestSignal = greenSignals[0] || watchSignals[0] || liveSignals[0] || null;
  const topEdgeId = bestSignal?.id ?? null;
  const slateDate = liveBoard?.slate_date;

  return <DashboardShell><main className="mx-auto w-full max-w-[1320px] space-y-2 px-2 pb-28 pt-2 sm:space-y-3 sm:px-4 lg:px-6">
    <section className="rounded-xl border border-cyan-400/20 bg-slate-950/70 p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.16em] text-cyan-200"><Zap className="h-3 w-3" /> EDGE Sports</div>
          <h1 className="mt-0.5 truncate text-lg font-black text-white sm:text-2xl">Best value picks, ranked.</h1>
          <div className="mt-0.5 text-[9px] text-slate-500">Market price vs no-vig fair probability • 25–45¢ value band • never chase above max buy</div>
        </div>
        <button type="button" onClick={() => loadLiveBoard()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[.04] text-slate-300"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>
      {message ? <div className="mt-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[9px] text-slate-300">{message}</div> : null}
    </section>

    <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1">
      {sports.map((value) => <button key={value} type="button" onClick={() => setSport(value)} className={`min-h-8 rounded-lg px-2 text-[9px] font-black ${sport === value ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-300/25" : "text-slate-500"}`}>{value === "NCAAF" ? "COLLEGE" : value}</button>)}
    </div>

    <nav className="sticky top-0 z-30 rounded-xl border border-white/10 bg-slate-950/90 p-1 backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-1">{views.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setView(key)} className={`inline-flex min-h-8 items-center justify-center gap-1 rounded-lg px-1.5 text-[8px] font-black ${view === key ? "bg-white/[.07] text-white" : "text-slate-500"}`}><Icon className="h-3 w-3" /><span>{label}</span></button>)}</div>
    </nav>

    {view === "LIVE" ? <>
      {slateDate ? <div className="flex items-center justify-between rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 py-1.5 text-[8px] text-slate-500">
        <span>{liveBoard?.slate_is_upcoming ? "Next available slate" : "Current slate"}: <span className="font-black text-slate-300">{formatDate(slateDate)}</span></span>
        <span>{formatDateTime(observedAt)}</span>
      </div> : null}

      {bestSignal ? <BestPickCard item={bestSignal} onOpen={setSelectedSignal} /> : null}

      <section className="grid grid-cols-4 gap-1">
        <Metric label="Best pick" value={bestSignal?.team_code || "—"} detail={bestSignal?.action || "scanning"} tone={bestSignal?.signal === "GREEN" ? "text-emerald-300" : "text-white"} />
        <Metric label="Buy price" value={bestSignal ? `${bestSignal.market}¢` : "—"} detail={bestSignal ? `max ${priceText(bestSignal.maxEntry)}` : ""} />
        <Metric label="Our fair" value={bestSignal ? `${bestSignal.model}%` : "—"} detail="no-vig estimate" tone="text-cyan-200" />
        <Metric label="Price gap" value={bestSignal ? `${bestSignal.edge >= 0 ? "+" : ""}${bestSignal.edge}` : "—"} detail={bestSignal ? "percentage pts" : `${liveGames.length} games`} tone={bestSignal?.edge > 0 ? "text-emerald-300" : "text-white"} />
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-950/55 p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.13em] text-emerald-200"><Wifi className="h-3 w-3" /> {sport} slate • {liveGames.length} games</div>
          <div className="flex items-center gap-2 text-[8px] text-slate-600"><span>{greenSignals.length} buy</span><span>{watchSignals.length} watch</span><span>{valueBandSignals.length} value band</span></div>
        </div>
        {liveLoading ? <div className="p-2 text-[10px] text-slate-500">Loading {sport}…</div> : liveGames.length ? <div className="flex gap-1.5 overflow-x-auto pb-1">{liveGames.slice(0, 20).map((game) => <TickerItem key={game.game_pk} game={game} sport={sport} />)}</div> : <div className="p-2 text-[10px] text-slate-500">No games found in the current or next slate window.</div>}
      </section>

      <section className="space-y-1.5">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <div>
            <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.13em] text-cyan-200"><TrendingUp className="h-3 w-3" /> Ranked value scanner</div>
            <h2 className="text-sm font-black text-white">Best choices first</h2>
          </div>
          <div className="text-right text-[8px] leading-3 text-slate-600">{liveBoard?.source || "Kalshi"}<br />{liveBoard?.model?.version || ""}</div>
        </div>

        {visibleSignals.length ? <div className="space-y-1">{visibleSignals.map((item, index) => <SignalRow key={item.id} item={item} rank={index + 1} priority={item.id === topEdgeId} onOpen={setSelectedSignal} />)}</div> : <div className="rounded-xl border border-dashed border-white/10 p-4 text-[10px] text-slate-500">{liveLoading ? "Scanning…" : liveGames.length ? `Games loaded, but no ${sport} contracts currently have both a matched Kalshi market and usable reference moneyline. Keep this screen open; it refreshes automatically.` : `No ${sport} slate is available in the current window.`}</div>}
      </section>
    </> : null}

    {view === "PORTFOLIO" ? <div className="space-y-3"><EdgeStrategyV2Race /><details className="rounded-xl border border-white/10 bg-slate-950/50"><summary className="cursor-pointer px-3 py-2.5 text-[10px] font-black text-slate-300">Legacy frozen A/B/E strategy lab</summary><div className="border-t border-white/10 p-2"><EdgeLivePaperPortfolio /></div></details></div> : null}
    {view === "RESEARCH" ? <EdgeResearchLab /> : null}

    {view === "SETTINGS" ? <div className="grid gap-2 lg:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
        <div className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5 text-cyan-300" /><h2 className="text-sm font-black text-white">Risk rules</h2></div>
        <div className="mt-2 grid grid-cols-2 gap-1.5"><button onClick={() => setExecution("MANUAL")} className={`rounded-lg border p-2 text-[9px] font-black ${execution === "MANUAL" ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 text-slate-400"}`}>Manual</button><button onClick={() => setExecution("AUTO")} className={`rounded-lg border p-2 text-[9px] font-black ${execution === "AUTO" ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 text-slate-400"}`}>Pre-approved</button></div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <label className="text-[9px] font-black text-slate-400">Daily max<input type="number" value={dailyRisk} onChange={(e) => setDailyRisk(Number(e.target.value || 0))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white" /></label>
          <label className="text-[9px] font-black text-slate-400">Per trade<input type="number" value={perTrade} onChange={(e) => setPerTrade(Number(e.target.value || 0))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white" /></label>
          <label className="text-[9px] font-black text-slate-400">Min edge %<input type="number" value={minEdge} onChange={(e) => setMinEdge(Number(e.target.value || 0))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-white" /></label>
        </div>
        <button onClick={saveStrategy} className="mt-2 w-full rounded-lg border border-cyan-300/30 bg-cyan-500/10 p-2 text-[9px] font-black text-cyan-100">Save rules</button>
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
        <div className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-violet-300" /><h2 className="text-sm font-black text-white">Kalshi connection</h2></div>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2.5 py-2"><span className="text-xs font-black text-white">Kalshi</span><span className="text-[9px] text-slate-400">{connection?.connected ? "Connected" : "Not connected"}</span></div>
        {!connectOpen ? <button onClick={() => setConnectOpen(true)} className="mt-2 w-full rounded-lg border border-violet-300/30 bg-violet-500/10 p-2 text-[9px] font-black text-violet-100">Connect Kalshi</button> : <div className="mt-2 space-y-1.5"><select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-xs text-white"><option value="DEMO">Demo / test</option><option value="LIVE">Live account</option></select><input value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)} placeholder="Kalshi API Key ID" className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-xs text-white" /><input type="file" accept=".key,.txt,text/plain" onChange={handleKeyFile} className="w-full text-[9px] text-slate-400" /><button disabled={savingConnection} onClick={connectKalshi} className="w-full rounded-lg border border-violet-300/30 bg-violet-500/10 p-2 text-[9px] font-black text-violet-100">{savingConnection ? "Verifying…" : "Connect"}</button></div>}
      </section>

      <section className="lg:col-span-2 rounded-xl border border-rose-400/15 bg-rose-500/[.04] p-3">
        <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" /><p className="text-[9px] leading-4 text-slate-400"><span className="font-black text-white">Risk:</span> EDGE ranks estimated value, not certainty. Reference odds, Kalshi prices, spreads, liquidity and fees can change. Paper results can differ from live execution. Only risk capital you can afford to lose.</p></div>
      </section>
    </div> : null}

    <SignalDrawer item={selectedSignal} priority={selectedSignal?.id === topEdgeId} onClose={() => setSelectedSignal(null)} />
  </main></DashboardShell>;
}

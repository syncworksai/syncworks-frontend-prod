import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowLeft, ArrowUpRight, Gauge, Radio, RefreshCw, ShieldAlert, Signal, TimerReset, Waves } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const ALLOWED_EMAIL = "jacoblord7@outlook.com";
const SIGNAL_URL = String(import.meta.env.VITE_FUTURES_SIGNAL_URL || "").trim();

const EMPTY = {
  symbol: "MNQ",
  timeframe: "1m",
  state: "OFFLINE",
  setup: "ANALYSIS ONLY",
  action: "WAIT",
  price: null,
  candle_seconds_remaining: null,
  updated_at: null,
  indicators: {
    pressure: { state: "WAIT", detail: "EMA 7/9 waiting for live data" },
    location: { state: "WAIT", detail: "Session VWAP waiting for live data" },
    momentum: { state: "WAIT", detail: "KST waiting for live data" },
    control: { state: "WAIT", detail: "DMI waiting for live data" },
    strength: { state: "WAIT", detail: "ADX waiting for live data" },
    condition: { state: "WAIT", detail: "RSI 14 waiting for live data" },
    volatility: { state: "WAIT", detail: "ATR 14 waiting for live data" },
  },
};

function normalize(value) {
  const text = String(value || "WAIT").toUpperCase();
  if (["LONG", "BULLISH", "GREEN", "GO", "READY", "UP"].includes(text)) return "LONG";
  if (["SHORT", "BEARISH", "RED", "DOWN"].includes(text)) return "SHORT";
  if (["PROTECT", "CAUTION", "AMBER"].includes(text)) return "PROTECT";
  if (["HOLD", "ACTIVE", "POSITION"].includes(text)) return "HOLD";
  return "WAIT";
}

function tone(value) {
  const state = normalize(value);
  if (state === "LONG") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (state === "SHORT") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (state === "PROTECT") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if (state === "HOLD") return "border-violet-400/30 bg-violet-500/10 text-violet-200";
  return "border-slate-700 bg-slate-900/70 text-slate-300";
}

function stateLabel(value) {
  const state = normalize(value);
  if (state === "LONG") return "GREEN";
  if (state === "SHORT") return "RED";
  if (state === "PROTECT") return "PROTECT";
  if (state === "HOLD") return "HOLD";
  return "WAIT";
}

function IndicatorCard({ label, icon: Icon, value }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone(value?.state)}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em]"><Icon className="h-4 w-4" />{label}</div>
        <span className="rounded-full border border-current/20 px-2 py-1 text-[9px] font-black">{stateLabel(value?.state)}</span>
      </div>
      <div className="mt-2 text-xs leading-5 opacity-80">{value?.detail || "Waiting for data"}</div>
    </div>
  );
}

export default function DayTradingFutures() {
  const nav = useNavigate();
  const { user } = useAuth();
  const email = String(user?.email || "").trim().toLowerCase();
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [status, setStatus] = useState(SIGNAL_URL ? "connecting" : "offline");
  const [error, setError] = useState("");

  const allowed = email === ALLOWED_EMAIL;

  useEffect(() => {
    if (!allowed || !SIGNAL_URL) return undefined;
    let active = true;
    let timer;

    async function poll() {
      try {
        const response = await fetch(SIGNAL_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`Signal feed ${response.status}`);
        const data = await response.json();
        if (!active) return;
        setSnapshot((previous) => ({ ...EMPTY, ...previous, ...data, indicators: { ...EMPTY.indicators, ...(data?.indicators || {}) } }));
        setStatus("live");
        setError("");
      } catch (nextError) {
        if (!active) return;
        setStatus("offline");
        setError(nextError?.message || "Signal feed unavailable");
      } finally {
        if (active) timer = window.setTimeout(poll, 750);
      }
    }

    poll();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [allowed]);

  const action = normalize(snapshot?.action || snapshot?.state);
  const actionStyle = tone(action);
  const actionTitle = action === "LONG" ? "LONG READY" : action === "SHORT" ? "SHORT READY" : action === "HOLD" ? "HOLD" : action === "PROTECT" ? "PROTECT PROFIT" : "WAIT";
  const price = Number(snapshot?.price);
  const readablePrice = Number.isFinite(price) ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  const lastUpdate = useMemo(() => {
    if (!snapshot?.updated_at) return "No live update yet";
    const date = new Date(snapshot.updated_at);
    return Number.isNaN(date.getTime()) ? String(snapshot.updated_at) : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
  }, [snapshot?.updated_at]);

  if (!allowed) return <Navigate to="/customer" replace />;

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-3 pb-24 pt-3 sm:px-5 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => nav("/customer")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs font-black text-slate-300"><ArrowLeft className="h-4 w-4" />Personal</button>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] ${status === "live" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : status === "connecting" ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-slate-700 bg-slate-900/70 text-slate-400"}`}><Radio className="h-3.5 w-3.5" />{status === "live" ? "Live feed" : status === "connecting" ? "Connecting" : "Feed offline"}</div>
        </div>

        <section className="mt-3 rounded-[1.75rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,.12),transparent_34%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Day Trading Futures · Analysis Only</div>
              <h1 className="mt-1 text-2xl font-black text-white">{snapshot?.symbol || "MNQ"} signal cockpit</h1>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">One-minute candle-close decision support. No brokerage connection, no account access, and no order execution.</p>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Current price</div>
              <div className="mt-1 text-2xl font-black tabular-nums text-white">{readablePrice}</div>
              <div className="mt-1 text-[10px] text-slate-500">Updated {lastUpdate}</div>
            </div>
          </div>

          <div className={`mt-5 rounded-[1.5rem] border p-5 text-center ${actionStyle}`}>
            <div className="text-[10px] font-black uppercase tracking-[.22em] opacity-75">{snapshot?.setup || "Waiting for market data"}</div>
            <div className="mt-2 flex items-center justify-center gap-3 text-3xl font-black sm:text-4xl">
              {action === "LONG" ? <ArrowUpRight className="h-8 w-8" /> : action === "SHORT" ? <ArrowDownRight className="h-8 w-8" /> : <Signal className="h-8 w-8" />}
              {actionTitle}
            </div>
            <div className="mt-2 text-xs opacity-80">{snapshot?.reason || (SIGNAL_URL ? "Waiting for the next confirmed one-minute close." : "Connect a market-data feed to activate live signals.")}</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Timeframe</div><div className="mt-1 text-sm font-black text-white">{snapshot?.timeframe || "1m"}</div></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Candle close</div><div className="mt-1 text-sm font-black text-white">{Number.isFinite(Number(snapshot?.candle_seconds_remaining)) ? `${snapshot.candle_seconds_remaining}s` : "—"}</div></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Mode</div><div className="mt-1 text-sm font-black text-white">Signal only</div></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Execution</div><div className="mt-1 text-sm font-black text-white">Manual</div></div>
          </div>
        </section>

        <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <IndicatorCard label="Pressure" icon={Waves} value={snapshot?.indicators?.pressure} />
          <IndicatorCard label="Location / VWAP" icon={Activity} value={snapshot?.indicators?.location} />
          <IndicatorCard label="KST momentum" icon={RefreshCw} value={snapshot?.indicators?.momentum} />
          <IndicatorCard label="DMI control" icon={Signal} value={snapshot?.indicators?.control} />
          <IndicatorCard label="ADX strength" icon={Gauge} value={snapshot?.indicators?.strength} />
          <IndicatorCard label="RSI condition" icon={TimerReset} value={snapshot?.indicators?.condition} />
          <IndicatorCard label="ATR volatility" icon={ShieldAlert} value={snapshot?.indicators?.volatility} />
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-3 text-cyan-100">
            <div className="text-[10px] font-black uppercase tracking-[.16em]">Toddler rule</div>
            <div className="mt-2 text-xs leading-5 text-cyan-100/75">Candle + pressure trigger first. Then location, momentum, control and strength decide GO, WAIT, HOLD or PROTECT.</div>
          </div>
        </section>

        {!SIGNAL_URL ? <section className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/[.05] p-4"><div className="text-sm font-black text-amber-100">Live market data is the only missing piece.</div><p className="mt-1 text-xs leading-5 text-amber-100/65">The UI is intentionally disconnected from brokerage accounts. When the local market-data agent is ready, point <code className="rounded bg-black/30 px-1.5 py-0.5">VITE_FUTURES_SIGNAL_URL</code> at its read-only signal endpoint. No Render trade execution is required.</p></section> : null}
        {error ? <div className="mt-3 text-xs text-rose-300">{error}</div> : null}

        <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">V1 rules loaded</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
            <div>EMA 7 / EMA 9 pressure + matching candle close creates the trigger.</div>
            <div>VWAP classifies location and continuation vs reversal context.</div>
            <div>KST green-line direction and green/red relationship measure momentum.</div>
            <div>DMI identifies buyer vs seller directional control.</div>
            <div>ADX measures whether trend strength is expanding or fading.</div>
            <div>RSI and ATR provide condition, stretch and volatility context.</div>
          </div>
        </section>
      </div>
    </div>
  );
}

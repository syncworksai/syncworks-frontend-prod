import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, FileUp, ShieldAlert, Waves } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";
import { useAuth } from "../auth/AuthContext";
import TradingJarvisPanel from "../components/trading/TradingJarvisPanel";
import { requestStockCandles, stockFeedConfigured } from "../api/stockMarketFeed";

const ACCOUNT = "jacoblord7@outlook.com";
const COLORS = { price: "#38bdf8", fast: "#34d399", slow: "#fbbf24", upper: "#c084fc", lower: "#fb7185" };
const WINDOW = [10, 20, 50, 200];
const fmt = (v, digits = 2) => Number.isFinite(v) ? Number(v).toFixed(digits) : "—";
const avg = (items) => items.reduce((n, v) => n + v, 0) / (items.length || 1);

function parseCandles(content) {
  const lines = content.replace(/\r/g, "").trim().split("\n").filter(Boolean);
  if (lines.length < 22) throw new Error("Include a CSV header and at least 20 price candles.");
  const header = lines.shift().split(",").map((x) => x.trim().toLowerCase().replace(/[\s_-]/g, ""));
  const pick = (...names) => names.map((name) => header.indexOf(name)).find((index) => index >= 0) ?? -1;
  const columns = { time: pick("date", "datetime", "timestamp", "time"), open: pick("open"), high: pick("high"), low: pick("low"), close: pick("close", "adjclose"), volume: pick("volume", "vol") };
  if (Object.values(columns).some((i) => i < 0)) throw new Error("CSV must contain date/time, open, high, low, close and volume columns.");
  const records = lines.map((line) => {
    const fields = line.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    const candle = { time: fields[columns.time], open: Number(fields[columns.open]), high: Number(fields[columns.high]), low: Number(fields[columns.low]), close: Number(fields[columns.close]), volume: Number(fields[columns.volume]) };
    if (!candle.time || [candle.open, candle.high, candle.low, candle.close, candle.volume].some((n) => !Number.isFinite(n)) || candle.low > candle.high || candle.volume < 0 || candle.close < candle.low || candle.close > candle.high || candle.open < candle.low || candle.open > candle.high) throw new Error("Invalid OHLCV value; check the source CSV and its order.");
    return candle;
  });
  if (records.length < 20) throw new Error("At least 20 candles are needed.");
  const stamps = records.map((r) => Date.parse(r.time));
  if (stamps.every(Number.isFinite)) {
    if (stamps.some((stamp, i) => i > 0 && stamp <= stamps[i - 1])) throw new Error("Dates must be ascending with no duplicates.");
  } else if (stamps.some(Number.isFinite)) throw new Error("Dates are inconsistent. Use ISO date/time values.");
  return records.slice(-1500);
}

function enrich(candles, length) {
  return candles.map((item, index) => {
    const history = candles.slice(Math.max(0, index - length + 1), index + 1);
    const volumePeriod = candles.slice(Math.max(0, index - 19), index + 1);
    const prior = candles.slice(Math.max(0, index - length), index);
    return {
      ...item,
      sma20: index >= 19 ? avg(candles.slice(index - 19, index + 1).map((r) => r.close)) : null,
      sma50: index >= 49 ? avg(candles.slice(index - 49, index + 1).map((r) => r.close)) : null,
      sma200: index >= 199 ? avg(candles.slice(index - 199, index + 1).map((r) => r.close)) : null,
      upper: prior.length === length ? Math.max(...prior.map((r) => r.high)) : null,
      lower: prior.length === length ? Math.min(...prior.map((r) => r.low)) : null,
      volumeRatio: volumePeriod.length === 20 && avg(volumePeriod.map((r) => r.volume)) > 0 ? item.volume / avg(volumePeriod.map((r) => r.volume)) : null,
      barRange: Math.max(...history.map((r) => r.high)) - Math.min(...history.map((r) => r.low)),
    };
  });
}

function analyze(candles, channel) {
  if (!candles?.length) return null;
  const rows = enrich(candles, channel);
  const last = rows[rows.length - 1];
  const prior = rows[rows.length - 2];
  const trend = last.sma20 !== null && last.sma50 !== null ? (last.close > last.sma20 && last.sma20 > last.sma50 ? "UP" : last.close < last.sma20 && last.sma20 < last.sma50 ? "DOWN" : "MIXED") : "INSUFFICIENT HISTORY";
  const breakout = last.upper !== null && last.close > last.upper ? "UPPER BREAKOUT" : last.lower !== null && last.close < last.lower ? "LOWER BREAKDOWN" : "INSIDE CHANNEL";
  const volume = last.volumeRatio == null ? "UNAVAILABLE" : last.volumeRatio >= 1.5 ? "HIGH" : last.volumeRatio < 0.8 ? "LOW" : "NORMAL";
  const swing = candles.slice(-Math.min(100, candles.length));
  const high = Math.max(...swing.map((r) => r.high));
  const low = Math.min(...swing.map((r) => r.low));
  const upSwing = swing.findIndex((r) => r.low === low) < swing.findIndex((r) => r.high === high);
  const fib = [0.236, 0.382, 0.5, 0.618, 0.786].map((ratio) => ({ ratio, price: upSwing ? high - (high - low) * ratio : low + (high - low) * ratio }));
  const bullish = trend === "UP" && breakout === "UPPER BREAKOUT" && volume !== "LOW";
  const bearish = trend === "DOWN" && breakout === "LOWER BREAKDOWN" && volume !== "LOW";
  const stop = bullish ? prior?.low : bearish ? prior?.high : null;
  const risk = stop == null ? null : Math.abs(last.close - stop);
  const validRisk = risk > 0 && (bullish ? stop < last.close : stop > last.close);
  return {
    rows, last, trend, breakout, volume, fib,
    status: bullish ? "BULLISH WATCH" : bearish ? "BEARISH WATCH" : "WAIT",
    rationale: bullish ? "Uptrend + confirmed upper-channel close; inspect next candle and liquidity before any entry." : bearish ? "Downtrend + confirmed lower-channel close; inspect next candle and liquidity before any entry." : "No aligned trend, channel-break and volume setup; do not force a trade.",
    plan: validRisk ? { entry: last.close, stop, target: bullish ? last.close + risk * 2 : last.close - risk * 2, risk } : null,
    bullish, bearish,
  };
}

function Panel({ title, children }) {
  return <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"><h2 className="mb-3 text-xs font-black uppercase tracking-widest text-cyan-200">{title}</h2>{children}</section>;
}

export default function DayTradingStocks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowed = String(user?.email || "").trim().toLowerCase() === ACCOUNT;
  const [symbol, setSymbol] = useState("SPY");
  const [feedEnabled, setFeedEnabled] = useState(false);
  const [feedStatus, setFeedStatus] = useState("not connected");
  const [marketDatasets, setMarketDatasets] = useState({});
  const [channel, setChannel] = useState(20);
  const [datasets, setDatasets] = useState({});
  const [message, setMessage] = useState("");
  const [riskDollars, setRiskDollars] = useState(25);
  const [journal, setJournal] = useState([]);
  const data = feedEnabled ? marketDatasets[symbol] : datasets[symbol];
  const result = useMemo(() => analyze(data?.candles, channel), [data, channel]);
  const spyData = feedEnabled ? marketDatasets : datasets;
  const spy = useMemo(() => analyze(spyData.SPY?.candles, channel), [spyData.SPY, channel]);
  const rsp = useMemo(() => analyze(spyData.RSP?.candles, channel), [spyData.RSP, channel]);
  const breadth = spy && rsp ? (spy.trend === "UP" && rsp.trend === "UP" ? "BROAD PARTICIPATION" : spy.trend === "UP" && rsp.trend !== "UP" ? "NARROW / MEGACAP-LED" : spy.trend === "DOWN" && rsp.trend === "DOWN" ? "BROAD WEAKNESS" : "DIVERGENT / MIXED") : "UPLOAD SPY + RSP";
  const datesMatch = spy && rsp && spy.last.time === rsp.last.time;

  useEffect(() => {
    if (!feedEnabled || !stockFeedConfigured) return undefined;
    let cancelled = false;
    let timer;
    let controller;
    async function poll() {
      controller = new AbortController();
      try {
        const symbols = [...new Set(["SPY", "RSP", symbol])];
        const results = await Promise.all(symbols.map((name) => requestStockCandles(name, controller.signal)));
        if (cancelled) return;
        const map = Object.fromEntries(results.map((value) => [value.symbol, {...value, filename: "Verified endpoint: " + value.timeframe}]));
        setMarketDatasets(map);
        setFeedStatus("connected");
      } catch (error) {
        if (cancelled) return;
        setFeedStatus(error?.message || "Feed disconnected");
        setMarketDatasets({});
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, 15000);
      }
    }
    poll();
    return () => { cancelled = true; controller?.abort(); if (timer) window.clearTimeout(timer); };
  }, [feedEnabled, symbol]);

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const candles = parseCandles(await file.text());
      setDatasets((old) => ({ ...old, [symbol]: { candles, filename: file.name } }));
      setMessage(symbol + ": " + candles.length + " historical candles imported from " + file.name + ". This is uploaded data, not a live feed.");
    } catch (e) { setMessage(e.message || "Could not parse CSV."); }
  }

  function logPaperPlan() {
    if (!result?.plan) return;
    const size = Math.floor(Number(riskDollars) / result.plan.risk);
    if (!Number.isFinite(size) || size < 1) { setMessage("Risk budget is too small for one share at this stop distance."); return; }
    const item = { symbol, side: result.bullish ? "LONG" : "SHORT (simulation only)", shares: size, ...result.plan, time: new Date().toISOString() };
    setJournal((old) => [item, ...old].slice(0, 25));
    setMessage("Paper-trade plan recorded locally in this session. No orders placed.");
  }

  if (!allowed) return <Navigate to="/customer" replace />;
  return <main className="min-h-dvh bg-[#020617] px-3 pb-24 pt-4 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate("/customer")} className="flex items-center gap-2 rounded-xl border border-white/10 p-2 text-sm"><ArrowLeft size={16}/>Personal</button>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">Historical CSV / paper mode</span>
      </header>
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Sync Assist • Market Intelligence</p><h1 className="text-3xl font-black">Stock Trading Command Center</h1><p className="mt-1 text-sm text-slate-400">SPY / RSP breadth • Donchian channels • volume • SMA • Fibonacci • trade planning</p></div>
        <button onClick={() => navigate("/customer/day-trading-futures")} className="rounded-xl border border-cyan-400/25 px-4 py-3 text-xs font-black text-cyan-200">Open MNQ Futures →</button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["SPY","RSP","QQQ","AAPL"].map((name) => <button key={name} onClick={() => setSymbol(name)} className={"rounded-xl border px-3 py-3 text-sm font-black " + (symbol === name ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300")}>{name}</button>)}
      </div>
      <Panel title="Import candles • current symbol">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-bold text-cyan-200"><FileUp size={16}/> Upload {symbol} CSV<input type="file" accept=".csv,text/csv" onChange={importFile} className="hidden" /></label>
          <label className="text-xs text-slate-400">Donchian lookback <select value={channel} onChange={(e)=>setChannel(Number(e.target.value))} className="ml-2 rounded-lg border border-white/20 bg-slate-950 p-2 text-white">{[10,20,55].map((n)=><option key={n} value={n}>{n} candles</option>)}</select></label>
          <span className="text-xs text-slate-400">{data ? data.filename + " • " + data.candles.length + " candles" : "No market data loaded"}</span>
          {stockFeedConfigured && <button type="button" onClick={() => setFeedEnabled((v)=>!v)} className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200">{feedEnabled ? "Use imported CSV" : "Connect read-only feed"}</button>}
          <span className="text-xs text-slate-500">Market feed: {feedEnabled ? feedStatus : "off"}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">Expected CSV: date,open,high,low,close,volume (ascending chronological order). Use completed candles, the same timeframe for comparisons, and a licensed/trusted source. Dates and prices are not independently verified.</p>
        {message && <p role="status" className="mt-2 text-xs text-amber-200">{message}</p>}
      </Panel>
      <TradingJarvisPanel symbol={symbol} mode={feedEnabled ? "stock-feed" : "historical"} signal={result?.status || "WAIT"} reason={result?.rationale || "Upload verified candles to begin analysis."} timestamp={result?.last?.time} identity={data?.timeframe || "CSV"} live={feedEnabled && feedStatus === "connected" && Boolean(data?.updated_at) && Boolean(result?.last?.time)} details={[{label:"Market participation",value:datesMatch ? breadth : "SPY/RSP not aligned"},{label:"Donchian",value:result?.breakout},{label:"Relative volume",value:result?.last?.volumeRatio != null ? fmt(result.last.volumeRatio)+"×" : "No data"}]}/>
      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Signal"><strong className={"text-2xl " + (result?.bullish ? "text-emerald-300" : result?.bearish ? "text-rose-300" : "text-amber-200")}>{result?.status || "NO DATA"}</strong><p className="mt-2 text-sm text-slate-400">{result?.rationale || "Upload candles to generate an evidence-based analysis."}</p></Panel>
        <Panel title="SPY vs RSP market breadth"><strong className="text-lg">{datesMatch ? breadth : "NEEDS MATCHING DATA"}</strong><p className="mt-2 text-xs text-slate-400">SPY: {spy?.trend || "—"} • RSP: {rsp?.trend || "—"}. Compare aligned timestamps and intervals. Breadth alone does not forecast returns.</p></Panel>
        <Panel title="Risk guardrail"><strong className="text-lg">WAIT is a valid trade decision</strong><p className="mt-2 text-xs text-slate-400">No automatic orders. Stop placement is illustrative; execution gaps, fees and slippage can exceed planned risk. Avoid trading on incomplete/stale candles.</p></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Panel title={symbol + " closing price / channel / SMA"}>
          {result ? <>
            <div className="mb-2 flex flex-wrap gap-4 text-xs"><span>Close: {fmt(result.last.close)}</span><span>Channel: {result.breakout}</span><span>Vol/20: {fmt(result.last.volumeRatio)}×</span></div>
            <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.rows.slice(-120)} margin={{top:8,right:8,bottom:8,left:0}}><CartesianGrid stroke="#273449" strokeDasharray="3 4"/><XAxis dataKey="time" hide/><YAxis domain={["auto","auto"]} width={52} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}}/>{[["close","price"],["sma20","fast"],["sma50","slow"],["upper","upper"],["lower","lower"]].map(([key,color])=><Line key={key} dataKey={key} name={key} type="monotone" stroke={COLORS[color]} dot={false} strokeWidth={key==="close"?2:1} connectNulls={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>
            <div className="mt-2 text-xs text-slate-400">Price cyan • SMA20 green • SMA50 amber • Donchian upper purple / lower rose. Breakout uses the previous {channel} completed candles (current bar excluded).</div>
          </> : <div className="grid h-80 place-items-center text-sm text-slate-500">Upload historical candles to show a real chart.</div>}
        </Panel>
        <div className="space-y-4">
          <Panel title="Indicator readout">{result ? <div className="space-y-2 text-sm">{[["SMA20",fmt(result.last.sma20)],["SMA50",fmt(result.last.sma50)],["SMA200",fmt(result.last.sma200)],["Trend",result.trend],["Donchian upper",fmt(result.last.upper)],["Donchian lower",fmt(result.last.lower)],["Relative volume",fmt(result.last.volumeRatio)+"×"],["Volume state",result.volume]].map(([k,v])=><div key={k} className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-400">{k}</span><strong>{v}</strong></div>)}</div> : <p className="text-sm text-slate-500">Waiting for candles.</p>}</Panel>
          <Panel title="Fibonacci • last 100 candles">{result ? <div className="space-y-1 text-xs"><p className="mb-2 text-slate-400">Swing orientation is estimated from extrema, not hand-validated.</p>{result.fib.map((x)=><div key={x.ratio} className="flex justify-between"><span>{fmt(x.ratio*100,1)}%</span><strong>{fmt(x.price)}</strong></div>)}</div> : <p className="text-sm text-slate-500">Waiting for candles.</p>}</Panel>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Jarvis entry / exit planner"><div className="flex items-center gap-2 text-xs text-slate-400"><Waves size={16}/>Rules-based draft, not personalized financial advice or a prediction.</div>{result?.plan ? <div className="mt-3 space-y-2 text-sm">{[["Direction",result.bullish?"Potential long":"Potential short"],["Illustrative entry",fmt(result.plan.entry)],["Stop / invalidation",fmt(result.plan.stop)],["2R objective",fmt(result.plan.target)],["Risk per share",fmt(result.plan.risk)]].map(([k,v])=><div key={k} className="flex justify-between"><span className="text-slate-400">{k}</span><strong>{v}</strong></div>)}<div className="mt-4 flex items-center gap-2"><label className="text-xs text-slate-400">Paper risk budget ($) <input type="number" min="1" step="1" value={riskDollars} onChange={(e)=>setRiskDollars(e.target.value)} className="ml-2 w-20 rounded-lg border border-white/20 bg-slate-950 p-2 text-white"/></label><button onClick={logPaperPlan} className="rounded-lg bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-100">Log paper plan</button></div></div> : <p className="mt-3 text-sm text-slate-400">No eligible setup. Wait for aligned trend + channel break + acceptable volume; stop and targets require a valid structure.</p>}</Panel>
        <Panel title="Paper trade journal"><div className="flex items-start gap-2 text-xs text-slate-400"><ShieldAlert size={16} className="shrink-0"/>Session-only notes; refreshing the page clears them. No brokerage orders, no auto-trades.</div>{journal.length ? <div className="mt-3 space-y-2">{journal.map((item,i)=><div key={item.time+i} className="rounded-lg bg-white/5 p-2 text-xs"><strong>{item.symbol} {item.side} · {item.shares} shares</strong><div className="mt-1 text-slate-400">Entry {fmt(item.entry)} • Stop {fmt(item.stop)} • Target {fmt(item.target)}</div></div>)}</div> : <p className="mt-3 text-xs text-slate-500">No paper trades logged.</p>}</Panel>
      </div>
      <p className="pb-4 text-center text-xs text-slate-500">Research prototype · CSV import or optional strict read-only endpoint · For live operation configure a licensed market-data service, timestamp validation, backtests and alerting. No brokerage credentials or live order execution.</p>
    </div>
  </main>;
}

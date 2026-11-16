import React, { useMemo, useState } from "react";
import { FlaskConical, FileUp, ShieldAlert } from "lucide-react";
import { backtestDonchian, parseResearchCsv } from "../../utils/tradingBacktest.mjs";

const number = (n, digits=2) => Number(n).toFixed(digits);
export default function TradingStrategyLab({initialSymbol="MNQ"}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [candles, setCandles] = useState(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [lookback,setLookback] = useState(20);
  const [volumeMinimum,setVolumeMinimum] = useState(1.2);
  const [costR,setCostR] = useState(0.05);
  const [maxHold,setMaxHold] = useState(20);
  const report = useMemo(() => candles ? backtestDonchian(candles,{lookback,volumeMinimum,costR,maxHold}) : null,[candles,lookback,volumeMinimum,costR,maxHold]);
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error("Upload a CSV smaller than 8MB.");
      const data = parseResearchCsv(await file.text());
      setCandles(data); setFilename(file.name); setError("");
    } catch (e) {setCandles(null);setError(e.message || "Cannot parse this file.");}
  }
  return <section className="rounded-2xl border border-violet-400/25 bg-slate-900/60 p-4 text-slate-100">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2"><FlaskConical size={19} className="text-violet-300"/><div><h2 className="text-sm font-black uppercase tracking-widest text-violet-200">Jarvis Strategy Lab</h2><p className="mt-1 text-xs text-slate-400">Offline historical backtest · works before broker connections</p></div></div>
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-100"><FileUp size={15}/> Import OHLCV CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={upload}/></label>
    </div>
    <p className="mt-3 text-xs text-slate-400">Load historical candles for MES/MNQ, SPY, EUR/USD or another instrument. CSV columns: date,open,high,low,close,volume. Use ascending ISO timestamps and candles of one consistent timeframe. This lab does not acquire market data or connect to a broker.</p>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <label className="text-xs text-slate-400">Instrument <input value={symbol} maxLength={18} onChange={e=>setSymbol(e.target.value.toUpperCase())} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm text-white"/></label>
      <label className="text-xs text-slate-400">Channel length <select value={lookback} onChange={e=>setLookback(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm text-white">{[10,20,55].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <label className="text-xs text-slate-400">Min rel. volume <input type="number" min="0" max="10" step="0.1" value={volumeMinimum} onChange={e=>setVolumeMinimum(Math.max(0,Math.min(10,Number(e.target.value))))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm text-white"/></label>
      <label className="text-xs text-slate-400">Max hold (bars) <input type="number" min="1" max="500" value={maxHold} onChange={e=>setMaxHold(Math.max(1,Math.min(500,Number(e.target.value)||1)))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm text-white"/></label>
      <label className="text-xs text-slate-400">Est. cost (R/trade) <input type="number" min="0" max="5" step="0.01" value={costR} onChange={e=>setCostR(Math.max(0,Math.min(5,Number(e.target.value))))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm text-white"/></label>
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    {!report ? <div className="mt-4 grid min-h-24 place-items-center rounded-xl border border-dashed border-white/15 text-sm text-slate-500">Import a historical CSV to evaluate the strategy.</div> : <>
      <p className="mt-3 text-xs text-slate-400">{symbol} · {filename} · {candles.length} candles · {candles[0]?.time} to {candles.at(-1)?.time}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[["Trades",report.count],["Win rate",number(report.winRate*100,1)+"%"],["Expectancy",number(report.expectancyR)+"R"],["Total",number(report.totalR)+"R"],["Max drawdown",number(report.maxDrawdownR)+"R"]].map(([title,value])=><div key={title} className="rounded-lg border border-white/10 bg-slate-950/70 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{title}</p><strong className="mt-1 block text-xl">{value}</strong></div>)}
      </div>
      <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-950 text-slate-400"><tr>{["Entry","Side","Entry price","Exit price","Outcome","Result"].map(k=><th className="p-2" key={k}>{k}</th>)}</tr></thead><tbody>{report.trades.slice(-50).reverse().map((t,i)=><tr className="border-t border-white/10" key={t.entryTime+i}><td className="p-2">{t.entryTime}</td><td className="p-2">{t.side}</td><td className="p-2">{number(t.entry,4)}</td><td className="p-2">{number(t.exit,4)}</td><td className="p-2">{t.reason}</td><td className={"p-2 font-bold "+(t.resultR>=0?"text-emerald-300":"text-rose-300")}>{number(t.resultR)}R</td></tr>)}</tbody></table>
      </div>
      {!report.count && <p className="mt-2 text-xs text-amber-200">No qualifying setups found in these candles.</p>}
    </>}
    <p className="mt-3 flex items-start gap-2 text-xs text-amber-200/80"><ShieldAlert size={15} className="mt-0.5 shrink-0"/>Research only. Signals use past closed candles and enter at the next bar open. Ambiguous stop/target bars count as stopped, but overnight gaps, real spread, variable fees, market impact, rollover and bid/ask execution are not modeled. Cost is a rough R-per-trade input. Forex tick volume may not reflect centralized participation. Historical performance does not predict live results.</p>
  </section>;
}

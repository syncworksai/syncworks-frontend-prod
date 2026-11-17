import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Play, Pause, RotateCcw, StepForward, ShieldAlert, Target, Volume2, Maximize2, Minimize2, Trash2 } from "lucide-react";
import TrainingCandlestickChart from "./TrainingCandlestickChart";
import TradingCoursePanel from "./TradingCoursePanel";
import { useAuth } from "../../auth/AuthContext";
import { equitySeries, readPracticeJournal, writePracticeJournal, unrealizedPracticePnl, reviewPracticeTrade } from "../../utils/tradingPracticeJournal.mjs";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { buildTrainingRows, TRAINING_CANDLES, resolvePracticeTrade, explainTrainingSignal, closePracticeTrade, practiceStats, SIM_MNQ_POINT_VALUE, SIM_ROUND_TRIP_FEE, SIM_MNQ_TICK_VALUE, SIM_MNQ_TICK_SIZE, paperOrderEstimate } from "../../utils/tradingTutorial.mjs";

const ROWS = buildTrainingRows(TRAINING_CANDLES);
const LESSONS = [
  {title:"The candle",detail:"Wait for the candle to close. A temporary spike through a level is not the same as a completed breakout. This chart uses fabricated candles for teaching."},
  {title:"EMA 7 / EMA 9",detail:"EMA 7 above EMA 9 suggests short-term upward pressure; below suggests downward pressure. Crossovers can whipsaw in sideways markets."},
  {title:"Location / VWAP",detail:"Price above VWAP can support a bullish interpretation; below can support bearish context. VWAP reflects this simulated session only."},
  {title:"Donchian 20",detail:"The upper and lower lines show the previous 20 candles' highest high and lowest low, excluding the current candle. A breakout requires a close outside the channel."},
  {title:"Volume",detail:"Volume ratio compares the latest candle to a 20-bar average. Larger participation can support a move, but does not guarantee continuation."},
  {title:"RSI 14 and ATR 14",detail:"RSI measures recent relative upward/downward closes; ATR estimates recent candle range and informs stop spacing. Neither predicts the next move."},
  {title:"DMI / ADX / KST",detail:"These live-cockpit indicators assess directional control, trend strength and momentum. They are teaching topics here, not calculated or required by this simulator's signals."},
  {title:"Plan the trade",detail:"A setup is not an order. Practice choosing entry, stop and 2R target. Stop hits are counted first if a candle touches both levels; actual fills can be worse."},
];
const money=(v)=>Number.isFinite(v)?Number(v).toFixed(2):"—";
export default function FuturesTradingTutorial() {
  const {user}=useAuth();
  const userId=user?.id;
  const [step,setStep]=useState(23);
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1100);
  const [lesson,setLesson]=useState(0);
  const [trade,setTrade]=useState(null);
  const [completed,setCompleted]=useState([]);
  const [journal,setJournal]=useState(()=>readPracticeJournal(userId));
  const [journalOwner,setJournalOwner]=useState(userId);
  const [selectedTrade,setSelectedTrade]=useState(null);
  const [expanded,setExpanded]=useState(false);
  const [contracts,setContracts]=useState(1);
  const [stopTicks,setStopTicks]=useState(20);
  const [rewardRatio,setRewardRatio]=useState(2);
  const [chartView,setChartView]=useState("candles");
  const [detailPanel,setDetailPanel]=useState(null);
  const [journalNote,setJournalNote]=useState("");
  const [coachQuestion,setCoachQuestion]=useState("why");
  const [feedback,setFeedback]=useState("Advance candles to find an aligned setup, or select a lesson.");
  const stats=useMemo(()=>practiceStats(journal),[journal]);
  const equity=useMemo(()=>equitySeries(journal),[journal]);
  const unrealized=unrealizedPracticePnl(trade,ROWS[step].close);
  const selectedJournalTrade=selectedTrade || journal.at(-1);
  const review=reviewPracticeTrade(selectedJournalTrade || completed.at(-1));
  useEffect(()=>{setJournal(readPracticeJournal(userId));setJournalOwner(userId);},[userId]);
  useEffect(()=>{if(userId&&journalOwner===userId)writePracticeJournal(userId,journal);},[userId,journal,journalOwner]);
  function recordClosed(closed){setCompleted(old=>[...old,closed]);setJournal(old=>[...old,closed].slice(-300));setSelectedTrade(closed);setJournalNote("");}
  function editJournalNote(value){setJournalNote(value);if(!selectedJournalTrade)return;setJournal(old=>old.map(t=>t.entryTime===selectedJournalTrade.entryTime&&t.exitTime===selectedJournalTrade.exitTime?{...t,note:value.slice(0,3000)}:t));setSelectedTrade(t=>t?{...t,note:value.slice(0,3000)}:t);}

  const orderEstimate=paperOrderEstimate({quantity:contracts,stopPoints:stopTicks*SIM_MNQ_TICK_SIZE,rewardRatio});
  const current=ROWS[step];
  const explanation=explainTrainingSignal(current);
  const next=step+1 < ROWS.length;
  const visible=useMemo(()=>ROWS.slice(Math.max(0,step-54),step+1),[step]);
  useEffect(()=>{
    if(!playing||!next)return undefined;
    const timer=window.setInterval(()=>setStep(s=>Math.min(ROWS.length-1,s+1)),speed);
    return ()=>window.clearInterval(timer);
  },[playing,speed,next]);
  useEffect(()=>{if(!next)setPlaying(false);},[next]);
  function advance(){
    if(next)setStep(s=>Math.min(ROWS.length-1,s+1));
  }
  // Resolve open positions on animation ticks, not just the Step button.
  useEffect(()=>{
    if(!trade||trade.closed||step<trade.entryIndex)return;
    const updated=resolvePracticeTrade(trade,ROWS[step]);
    if(updated.closed){recordClosed({...updated,exitTime:ROWS[step].time,exitIndex:step});setTrade(null);setFeedback("Practice position closed: "+updated.outcome+" ("+money(updated.resultR)+"R).");}
  },[step,trade]);
  function enterPractice(side){
    if(trade){setFeedback("Close your current paper position first.");return;}
    if(!next){setFeedback("Replay completed. Restart to practice another trade.");return;}
    if(!orderEstimate){setFeedback("Choose a valid contract count and stop distance.");return;}
    const entry=ROWS[step+1].open;
    const risk=orderEstimate.stopPoints;
    const stop=side==="LONG"?entry-risk:entry+risk;
    if(!(risk>0)){setFeedback("Stop is on the wrong side of the entry. Wait for a valid practice setup.");return;}
    const newTrade={side,entry,stop,target:entry+(side==="LONG"?rewardRatio:-rewardRatio)*risk,risk,quantity:contracts,entryIndex:step+1,entryTime:ROWS[step+1].time,signalAtEntry:current.signal};
    setPlaying(false);setTrade(newTrade);
    setFeedback("Paper "+(side==="LONG"?"BUY":"SELL")+" filled at next simulated candle open. "+(current.signal==="WAIT"?"There was no aligned setup; evaluate the risk of ignoring WAIT.":"Compare this entry with Jarvis's teaching signal."));
    setStep(step+1);
  }
  function closeManual(){
    if(!trade)return;
    const closed=closePracticeTrade(trade,current.close);
    recordClosed({...closed,exitTime:current.time,exitIndex:step});
    setTrade(null);setPlaying(false);
    setFeedback("Paper position manually closed: "+(closed.netPnl>=0?"+":"")+"$"+money(closed.netPnl)+" net including illustrative cost.");
  }
  function reset(){setStep(23);setPlaying(false);setTrade(null);setCompleted([]);setSelectedTrade(null);setExpanded(false);setFeedback("Replay restarted. Your device-local trade journal has been preserved.");}
  function clearHistory(){if(typeof window!=="undefined"&&!window.confirm("Clear all saved practice trades on this device? This cannot be undone."))return;setJournal([]);setCompleted([]);setSelectedTrade(null);setFeedback("Device-local paper trade history cleared.");}
  return <section className="flex h-auto flex-col gap-2 rounded-2xl border border-violet-400/25 bg-[#080e20] p-2 text-slate-100 lg:h-full lg:min-h-0 lg:overflow-hidden" aria-label="Interactive practice trading tutorial">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2"><BookOpen size={15} className="text-violet-300"/><h2 className="text-sm font-black">MNQ Practice Simulator</h2><span className="text-[10px] font-bold text-amber-200">SIMULATION ONLY</span></div>
      <div className="flex gap-1.5"><button type="button" onClick={()=>setDetailPanel("journal")} className="rounded-lg border border-cyan-400/25 px-3 py-1.5 text-xs text-cyan-200">Journal & Stats</button><button type="button" onClick={()=>setDetailPanel("lessons")} className="rounded-lg border border-violet-400/25 px-3 py-1.5 text-xs text-violet-200">Lessons</button><button type="button" onClick={()=>setDetailPanel("review")} className="rounded-lg border border-emerald-400/25 px-3 py-1.5 text-xs text-emerald-200">Trade Review</button><button type="button" onClick={()=>setDetailPanel("course")} className="rounded-lg border border-amber-400/25 px-3 py-1.5 text-xs text-amber-200">30-Day Course</button></div>
    </div>
    <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1.9fr)_minmax(250px,0.75fr)]">
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div><span className="text-[10px] uppercase text-slate-500">Simulated candle</span><div className="text-sm font-bold">{step+1} / {ROWS.length} · Close {money(current.close)}</div></div>
          <div className={"rounded-lg border px-3 py-2 text-xs font-black "+(current.signal==="WAIT"?"border-slate-500/30 text-slate-300":current.signal.startsWith("LONG")?"border-emerald-400/40 bg-emerald-400/10 text-emerald-200":"border-rose-400/40 bg-rose-400/10 text-rose-200")}>{current.signal}</div>
        </div>
        <div className="min-h-[270px] min-w-0 flex-1 overflow-hidden lg:min-h-0">
          <div className="flex items-center justify-end gap-2 pb-1">
            <div className="inline-flex rounded border border-white/15 p-0.5">
              <button type="button" aria-pressed={chartView==="candles"} onClick={()=>setChartView("candles")} className={chartView==="candles"?"rounded bg-cyan-500/20 px-2 py-1 text-[10px] text-cyan-200":"px-2 py-1 text-[10px] text-slate-400"}>Candles</button>
              <button type="button" aria-pressed={chartView==="line"} onClick={()=>setChartView("line")} className={chartView==="line"?"rounded bg-cyan-500/20 px-2 py-1 text-[10px] text-cyan-200":"px-2 py-1 text-[10px] text-slate-400"}>Line</button>
            </div><button type="button" onClick={()=>setExpanded(true)} className="rounded border border-cyan-400/25 px-2 py-1 text-[10px] text-cyan-200">Expand chart</button></div>
          <div className="h-[calc(100%-24px)] min-h-0"><TrainingCandlestickChart bars={visible} trade={trade} lastClosedTrade={completed.at(-1)} completed={completed} compact view={chartView}/></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={()=>setPlaying(x=>!x)} disabled={!next} className="flex items-center gap-2 rounded-xl bg-violet-500/20 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-40">{playing?<Pause size={15}/>:<Play size={15}/>} {playing?"Pause":"Play"}</button>
          <button type="button" onClick={()=>{setPlaying(false);advance();}} disabled={!next} className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold disabled:opacity-40"><StepForward size={15}/> Next candle</button>
          <button type="button" onClick={reset} className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold"><RotateCcw size={15}/> Restart</button>
          <label className="text-xs text-slate-400">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="ml-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white"><option value={2000}>Slow</option><option value={1100}>Normal</option><option value={350}>Fast</option></select></label>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-1 sm:grid-cols-4">{[
          ["EMA 7 / 9",money(current.ema7)+" / "+money(current.ema9)],
          ["VWAP",money(current.vwap)],
          ["Volume / avg",current.volRatio ? current.volRatio.toFixed(2)+"×":"—"],
          ["RSI / ATR",(current.rsi==null?"—":current.rsi.toFixed(1))+" / "+money(current.atr)]
        ].map(([label,value])=><div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xs font-bold">{value}</div></div>)}</div>
      </div>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto lg:overflow-y-auto">
        <div className="shrink-0 rounded-xl border border-cyan-400/30 bg-[#08172a] p-3">
          <div className="flex items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-widest text-cyan-200">Paper order ticket</div><span className="rounded border border-amber-400/30 px-2 py-0.5 text-[9px] text-amber-200">NO BROKER</span></div>
          <div className="mt-2 flex items-end justify-between"><div><div className="text-[10px] text-slate-500">MNQ · simulated last close</div><div className="text-xl font-black tabular-nums">{money(current.close)}</div></div><span className="text-xs font-bold text-slate-300">{trade?trade.side+" OPEN":"FLAT"}</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="text-[10px] text-slate-400">Contracts<select disabled={!!trade} value={contracts} onChange={e=>setContracts(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm font-bold text-white">{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
            <label className="text-[10px] text-slate-400">Stop · ticks<input disabled={!!trade} type="number" min="1" max="400" step="1" value={stopTicks} onChange={e=>setStopTicks(Math.min(400,Math.max(1,Math.trunc(Number(e.target.value)||1))))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm font-bold text-white"/></label>
            <label className="text-[10px] text-slate-400">Target · R<select disabled={!!trade} value={rewardRatio} onChange={e=>setRewardRatio(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2 text-sm font-bold text-white">{[1,1.5,2,3].map(n=><option key={n} value={n}>{n}R</option>)}</select></label>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="text-[10px] text-slate-500">Stop distance</div><div className="text-sm font-bold">{orderEstimate?money(orderEstimate.stopPoints)+" points":"—"}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="text-[10px] text-slate-500">Est. total risk</div><div className="text-sm font-bold text-rose-200">{orderEstimate?"$"+money(orderEstimate.riskDollars):"—"}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="text-[10px] text-slate-500">Target gain, net est.</div><div className="text-sm font-bold text-emerald-200">{orderEstimate?"$"+money(orderEstimate.estimatedNetTarget):"—"}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="text-[10px] text-slate-500">MNQ tick</div><div className="text-sm font-bold">{SIM_MNQ_TICK_SIZE}pt / $ {money(SIM_MNQ_TICK_VALUE)}</div></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={!!trade||!next||!orderEstimate} onClick={()=>enterPractice("LONG")} className="min-h-11 rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-sm font-black text-emerald-100 disabled:opacity-30">BUY / LONG</button>
            <button type="button" disabled={!!trade||!next||!orderEstimate} onClick={()=>enterPractice("SHORT")} className="min-h-11 rounded-lg border border-rose-400/40 bg-rose-500/20 text-sm font-black text-rose-100 disabled:opacity-30">SELL / SHORT</button>
            <button type="button" disabled={!trade} onClick={closeManual} className="col-span-2 min-h-10 rounded-lg border border-amber-400/40 bg-amber-500/10 text-xs font-black text-amber-100 disabled:opacity-30">CLOSE POSITION</button>
          </div>
          {trade&&<div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2 text-xs"><div className="font-black">{trade.quantity||1} contract(s) · {trade.side}</div><div className="mt-1">Entry {money(trade.entry)} · Stop {money(trade.stop)} · Target {money(trade.target)}</div><div className="mt-1">Unrealized net est. <strong>{(unrealized?.estimatedNet>=0?"+":"")+"$"+money(unrealized?.estimatedNet)}</strong> · {money(unrealized?.r)}R</div></div>}
          <p role="status" className="mt-2 text-[11px] leading-4 text-amber-200">{feedback}</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Order fills at the next synthetic candle open; shown close is a reference, not a quote or guaranteed fill. Fabricated prices are not exchange tick-rounded.</p>
        </div>
        <div className="shrink-0 rounded-xl border border-cyan-400/20 bg-black/20 p-3">
          <div className="text-[10px] font-black text-cyan-200">PAPER PERFORMANCE</div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs"><span>Balance</span><strong>{"$"+money(stats.balance)}</strong><span>Realized P&L</span><strong>{money(stats.netPnl)}</strong><span>Win rate</span><strong>{stats.count?stats.winRate.toFixed(1)+"%":"—"}</strong><span>Closed trades</span><strong>{stats.count}</strong></div>
          <button type="button" className="mt-2 text-xs text-cyan-300 underline" onClick={()=>setDetailPanel("journal")}>Full results & equity curve</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs font-black"><Volume2 size={15}/> What Jarvis is reading</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[["why","Why WAIT?"],["setup","What confirms?"],["risk","What is my risk?"]].map(([id,label])=><button key={id} type="button" aria-pressed={coachQuestion===id} onClick={()=>setCoachQuestion(id)} className={coachQuestion===id?"rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-[10px] text-cyan-100":"rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-400"}>{label}</button>)}
          </div>
          <p role="status" className="mt-2 rounded-lg border border-white/10 bg-slate-950 p-2 text-xs leading-5 text-cyan-100">{coachQuestion==="why"?explanation.summary:coachQuestion==="setup"?"Long setup: "+explanation.longChecks.map(x=>(x.passed?"✓ ":"○ ")+x.label).join(" · ")+"; short setup: "+explanation.shortChecks.map(x=>(x.passed?"✓ ":"○ ")+x.label).join(" · "):trade?"Current simulated stop: "+money(trade.risk)+" points per contract; "+(trade.quantity||1)+" contract(s). Estimated net stop loss uses the simulated fee assumptions.":"Choose contracts and a stop in the paper order ticket; dollar risk is estimated there before entering. A missing setup is a reason to wait."}</p>
          <div className="mt-3 space-y-3 text-xs text-slate-300">
            <p><strong>Pressure:</strong> EMA 7 is {current.ema7>current.ema9?"above":"at or below"} EMA 9.</p>
            <p><strong>Location:</strong> Price is {current.close>current.vwap?"above":"at or below"} simulated VWAP.</p>
            <p><strong>Breakout:</strong> {current.upper===null?"Channel needs 20 historical candles.":current.close>current.upper?"Close above previous 20-bar high.":current.close<current.lower?"Close below previous 20-bar low.":"Inside the previous channel."}</p>
            <p><strong>Volume:</strong> {current.volRatio===null?"Not enough bars.":current.volRatio.toFixed(2)+"× recent average."}</p>
            <p><strong>Decision:</strong> <span className="font-black text-cyan-200">{current.signal}</span> is a teaching classification, not a trading recommendation.</p>
            <div className="space-y-2 border-t border-white/10 pt-3">{explanation.checks.map(check=><div key={check.label} className="flex gap-2"><span className={check.passed?"text-emerald-300":"text-amber-300"}>{check.passed?"✓":"○"}</span><span><strong>{check.label}:</strong> {check.detail}</span></div>)}</div>
          </div>
        </div>
      </div>
    </div>
    {expanded&&<div className="fixed inset-0 z-[260] flex flex-col bg-[#020617] p-3"><button type="button" onClick={()=>setExpanded(false)} className="mb-2 self-end rounded-lg border border-white/20 px-4 py-2 text-xs text-white">Close expanded chart</button><div className="min-h-0 flex-1"><TrainingCandlestickChart bars={visible} trade={trade} lastClosedTrade={completed.at(-1)} completed={completed} compact/></div></div>}
    {detailPanel&&<div className="fixed inset-0 z-[255] flex justify-end bg-black/70 p-2" onMouseDown={()=>setDetailPanel(null)}><div role="dialog" aria-modal="true" aria-label="Trading Academy details" onMouseDown={e=>e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col gap-3 overflow-hidden rounded-xl border border-cyan-400/30 bg-[#071126] p-4">
      <div className="flex shrink-0 items-center justify-between"><h3 className="font-black">{detailPanel==="journal"?"Trade journal & equity":detailPanel==="lessons"?"Guided lessons":detailPanel==="course"?"30-Day Trading Course":"Jarvis trade review"}</h3><button type="button" onClick={()=>setDetailPanel(null)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Close</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {detailPanel==="journal"&&<div className="space-y-3">        <div className="rounded-xl border border-cyan-400/20 bg-slate-950/60 p-3">
          <div className="text-xs font-black uppercase tracking-widest text-cyan-200">Paper account / Performance</div>
          <p className="mt-1 text-[11px] text-slate-400">Fabricated prices · $10,000 initial balance · One simulated MNQ contract. Realized results are saved in this browser only; Restart preserves your journal. Unrealized P&L is separate.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["Paper balance","$"+money(stats.balance)],
              ["Realized net P&L",(stats.netPnl>=0?"+":"")+"$"+money(stats.netPnl)],
              ["Win rate",stats.count?stats.winRate.toFixed(1)+"%":"—"],
              ["Trades / wins",stats.count+" / "+stats.wins],
              ["Average trade","$"+money(stats.avgTrade)],
              ["Max drawdown","$"+money(stats.maxDrawdown)]
            ].map(([title,value])=><div key={title} className="rounded-lg border border-white/10 bg-black/30 p-2"><div className="text-[10px] text-slate-500">{title}</div><div className="mt-1 text-sm font-black">{value}</div></div>)}
          </div>
          <div className="mt-3 text-xs font-bold text-slate-300">Simulated trade history</div>
          {journal.length?<div className="mt-2 max-h-52 overflow-x-auto overflow-y-auto"><table className="w-full min-w-[490px] text-left text-xs">
            <thead className="text-slate-500"><tr><th className="p-2">Side</th><th className="p-2">Entry</th><th className="p-2">Exit</th><th className="p-2">Outcome</th><th className="p-2">Net P&L</th></tr></thead>
            <tbody>{journal.slice().reverse().map((item,index)=><tr key={item.entryTime+index} onClick={()=>{setSelectedTrade(item);setJournalNote(item.note||"");setDetailPanel("review");}} title="View journal entry and trade review" className="cursor-pointer border-t border-white/10 hover:bg-white/5"><td className="p-2">{item.side}</td><td className="p-2">{money(item.entry)}</td><td className="p-2">{money(item.exit)}</td><td className="p-2">{item.outcome}</td><td className={"p-2 font-bold "+(item.netPnl>0?"text-emerald-300":"text-rose-300")}>{(item.netPnl>=0?"+":"")+"$"+money(item.netPnl)}</td></tr>)}</tbody>
          </table></div>:<p className="mt-2 text-xs text-slate-500">No closed paper trades. Buy or Sell, then Close or let the stop/target close the trade.</p>}
          <div className="mt-3 flex justify-end"><button type="button" onClick={clearHistory} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200"><Trash2 size={14}/> Clear saved journal</button></div>
          <p className="mt-2 text-[11px] text-slate-500">Assumptions: $ {SIM_MNQ_POINT_VALUE} per MNQ index point and $ {money(SIM_ROUND_TRIP_FEE)} fixed round-trip cost per trade. No slippage, real broker fees, gaps or actual execution constraints. Simulated P&L is not evidence of real profitability.</p>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-slate-950/60 p-3">
          <div className="text-xs font-black uppercase tracking-widest text-cyan-200">Paper equity curve · closed trades</div>
          <div className="mt-3 h-40 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={equity} margin={{top:8,right:12,bottom:4,left:0}}><CartesianGrid stroke="#243044" strokeDasharray="3 3"/><XAxis dataKey="index" tick={{fill:"#94a3b8",fontSize:10}}/><YAxis domain={["auto","auto"]} width={66} tick={{fill:"#94a3b8",fontSize:10}}/><Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155"}}/><Line dataKey="equity" name="Account equity (simulated $)" stroke="#38bdf8" strokeWidth={2} dot={equity.length<30} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>
          <p className="mt-1 text-xs text-slate-500">Closed-trade equity only. No intratrade drawdown or real-world slippage modeled.</p>
        </div>
</div>}
        {detailPanel==="lessons"&&<div className="space-y-3">        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-200">Jarvis · Practice trade review</div>
          {review ? <div className="mt-3 space-y-2 text-xs leading-5 text-slate-300">
            <div className="text-sm font-bold">{review.aligned?"Strategy-aligned entry":"Entry needs review"} · {review.outcome}</div>
            <p>{review.summary}</p>
            {review.details.map((line,i)=><p key={i}>{line}</p>)}
          </div>:<p className="mt-2 text-xs text-slate-400">Close a paper trade to see a rules-based review. Click an older journal row to review it again.</p>}
          <p className="mt-2 text-[11px] text-slate-500">This is rule-based feedback, not an AI model evaluating market profit potential.</p>
        </div>
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-violet-200">Jarvis • Guided lessons</div>
          <div className="mt-2 text-xs text-slate-500">Lesson {lesson+1} of {LESSONS.length}</div>
          <h3 className="mt-2 text-lg font-black">{LESSONS[lesson].title}</h3>
          <p className="mt-2 min-h-24 text-sm leading-6 text-slate-300">{LESSONS[lesson].detail}</p>
          <div className="flex items-center justify-between gap-2">
            <button type="button" disabled={lesson===0} onClick={()=>setLesson(i=>Math.max(0,i-1))} className="rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-30">Previous</button>
            <button type="button" onClick={()=>setLesson(i=>(i+1)%LESSONS.length)} className="rounded-lg bg-violet-500/20 px-3 py-2 text-xs font-black text-violet-100">{lesson===LESSONS.length-1?"Restart lessons":"Next lesson"}</button>
          </div>
        </div>
</div>}
        {detailPanel==="review"&&<div className="space-y-3 text-sm">{review?<><p className="font-black">{review.aligned?"Strategy-aligned entry":"Entry needs review"} · {review.outcome}</p><p>{review.summary}</p>{review.details.map((line,i)=><p key={i}>{line}</p>)}</>:<p>Complete a practice trade first.</p>}</div>}
      </div>
    </div></div>}
  </section>;
}

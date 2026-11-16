import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Play, Pause, RotateCcw, StepForward, ShieldAlert, Target, Volume2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { buildTrainingRows, TRAINING_CANDLES, resolvePracticeTrade } from "../../utils/tradingTutorial.mjs";

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
  const [step,setStep]=useState(23);
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1100);
  const [lesson,setLesson]=useState(0);
  const [trade,setTrade]=useState(null);
  const [completed,setCompleted]=useState([]);
  const [feedback,setFeedback]=useState("Advance candles to find an aligned setup, or select a lesson.");
  const current=ROWS[step];
  const next=step+1 < ROWS.length;
  const visible=useMemo(()=>ROWS.slice(Math.max(0,step-54),step+1),[step]);
  useEffect(()=>{
    if(!playing||!next)return undefined;
    const timer=window.setInterval(()=>setStep(s=>Math.min(ROWS.length-1,s+1)),speed);
    return ()=>window.clearInterval(timer);
  },[playing,speed,next]);
  useEffect(()=>{if(!next)setPlaying(false);},[next]);
  function advance(){
    if(!next)return;
    const nextRow=ROWS[step+1];
    if(trade&&!trade.closed){
      const updated=resolvePracticeTrade(trade,nextRow);
      if(updated.closed){setCompleted(old=>[...old,updated]);setTrade(null);setFeedback("Practice position closed: "+updated.outcome+" ("+money(updated.resultR)+"R). This is synthetic data.");}
    }
    setStep(s=>s+1);
  }
  // Resolve open positions on animation ticks, not just the Step button.
  useEffect(()=>{
    if(!trade||trade.closed||step<=trade.entryIndex)return;
    const updated=resolvePracticeTrade(trade,ROWS[step]);
    if(updated.closed){setCompleted(old=>[...old,updated]);setTrade(null);setFeedback("Practice position closed: "+updated.outcome+" ("+money(updated.resultR)+"R).");}
  },[step,trade]);
  function enterPractice(){
    if(trade){setFeedback("Close the existing practice position before entering another.");return;}
    if(!next){setFeedback("End of demonstration. Restart to practice.");return;}
    if(current.signal==="WAIT"){setFeedback("WAIT is correct: no qualified simulated setup on this candle.");return;}
    const side=current.signal.startsWith("LONG")?"LONG":"SHORT";
    const entry=ROWS[step+1].open; // demo uses known next open only when entered, no future price presented as live quote
    const stop=side==="LONG" ? current.low : current.high;
    const risk=side==="LONG" ? entry-stop : stop-entry;
    if(!(risk>0)){setFeedback("The next-open price invalidates this practice stop. Do not enter.");return;}
    const newTrade={side,entry,stop,target:entry+(side==="LONG"?2:-2)*risk,risk,entryIndex:step+1};
    setTrade(newTrade);setFeedback("Simulated "+side+" entered at next candle open. Stop and 2R target are now tracked. No real trade placed.");
    setStep(step+1);
  }
  function reset(){setStep(23);setPlaying(false);setTrade(null);setCompleted([]);setFeedback("Simulation restarted. No broker account or live market prices are involved.");}
  return <section className="mt-4 rounded-3xl border border-violet-400/25 bg-gradient-to-br from-[#101329] via-[#080f22] to-[#070a18] p-4 text-slate-100 sm:p-5" aria-label="Interactive practice trading tutorial">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-violet-300"><BookOpen size={16}/> How to trade this • Interactive academy</div><h2 className="mt-1 text-xl font-black">Guided MNQ practice simulator</h2><p className="mt-1 max-w-2xl text-xs text-slate-400">Fabricated market scenario. Watch a setup form, learn every indicator, then practice your entry and exits.</p></div>
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100">SIMULATION ONLY · NOT LIVE</div>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(245px,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div><span className="text-[10px] uppercase text-slate-500">Simulated candle</span><div className="text-sm font-bold">{step+1} / {ROWS.length} · Close {money(current.close)}</div></div>
          <div className={"rounded-lg border px-3 py-2 text-xs font-black "+(current.signal==="WAIT"?"border-slate-500/30 text-slate-300":current.signal.startsWith("LONG")?"border-emerald-400/40 bg-emerald-400/10 text-emerald-200":"border-rose-400/40 bg-rose-400/10 text-rose-200")}>{current.signal}</div>
        </div>
        <div className="h-72 w-full rounded-xl border border-white/10 bg-[#050c1a] p-2 sm:h-80" aria-label="Simulated price chart with EMA, VWAP and Donchian channels">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={visible} margin={{top:10,right:12,left:0,bottom:8}}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 4"/>
            <XAxis dataKey="time" tick={{fontSize:10,fill:"#94a3b8"}} interval="preserveStartEnd"/>
            <YAxis domain={["auto","auto"]} tick={{fontSize:10,fill:"#94a3b8"}} width={60}/>
            <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",fontSize:12}} formatter={(v)=>money(v)} />
            <Line dataKey="close" name="Close (simulated)" type="linear" stroke="#38bdf8" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
            <Line dataKey="ema7" name="EMA 7" stroke="#34d399" dot={false} isAnimationActive={false}/>
            <Line dataKey="ema9" name="EMA 9" stroke="#fbbf24" dot={false} isAnimationActive={false}/>
            <Line dataKey="vwap" name="Session VWAP" stroke="#a78bfa" dot={false} isAnimationActive={false}/>
            <Line dataKey="upper" name="Prior channel high" stroke="#f472b6" strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false}/>
            <Line dataKey="lower" name="Prior channel low" stroke="#fb7185" strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false}/>
            {trade&&<><ReferenceLine y={trade.entry} stroke="#93c5fd" strokeDasharray="3 3" label={{value:"Entry",fill:"#93c5fd",fontSize:10}}/><ReferenceLine y={trade.stop} stroke="#f87171" label={{value:"Stop",fill:"#f87171",fontSize:10}}/><ReferenceLine y={trade.target} stroke="#4ade80" label={{value:"Target",fill:"#4ade80",fontSize:10}}/></>}
          </LineChart></ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={()=>setPlaying(x=>!x)} disabled={!next} className="flex items-center gap-2 rounded-xl bg-violet-500/20 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-40">{playing?<Pause size={15}/>:<Play size={15}/>} {playing?"Pause":"Play"}</button>
          <button type="button" onClick={()=>{setPlaying(false);advance();}} disabled={!next} className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold disabled:opacity-40"><StepForward size={15}/> Next candle</button>
          <button type="button" onClick={reset} className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold"><RotateCcw size={15}/> Restart</button>
          <label className="text-xs text-slate-400">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="ml-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white"><option value={2000}>Slow</option><option value={1100}>Normal</option><option value={350}>Fast</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
          ["EMA 7 / 9",money(current.ema7)+" / "+money(current.ema9)],
          ["VWAP",money(current.vwap)],
          ["Volume / avg",current.volRatio ? current.volRatio.toFixed(2)+"×":"—"],
          ["RSI / ATR",(current.rsi==null?"—":current.rsi.toFixed(1))+" / "+money(current.atr)]
        ].map(([label,value])=><div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xs font-bold">{value}</div></div>)}</div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-2 text-xs font-black text-cyan-200"><Target size={15}/> Practice entry / stop / exit</div>
          <p className="mt-2 text-xs text-slate-300">{current.signal==="WAIT"?"No aligned breakout on the current closed candle. Watch and wait.":"Simulated "+current.signal+". You may practice a next-bar-open entry with signal-candle stop and 2R objective."}</p>
          <button type="button" onClick={()=>{setPlaying(false);enterPractice();}} disabled={current.signal==="WAIT"||!!trade||!next} className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-black text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30">Enter paper trade on next bar</button>
          {trade&&<p className="mt-2 text-xs text-slate-300">{trade.side} · Entry {money(trade.entry)} · Stop {money(trade.stop)} · Target {money(trade.target)} · Risk {money(trade.risk)} points</p>}
          <p role="status" className="mt-2 text-xs text-amber-200">{feedback}</p>
          {completed.length>0&&<div className="mt-2 text-xs text-slate-300">{completed.length} practice trade(s) closed · Last result: {money(completed.at(-1).resultR)}R ({completed.at(-1).outcome})</div>}
        </div>
      </div>
      <div className="min-w-0 space-y-3">
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
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs font-black"><Volume2 size={15}/> What Jarvis is reading</div>
          <div className="mt-3 space-y-3 text-xs text-slate-300">
            <p><strong>Pressure:</strong> EMA 7 is {current.ema7>current.ema9?"above":"at or below"} EMA 9.</p>
            <p><strong>Location:</strong> Price is {current.close>current.vwap?"above":"at or below"} simulated VWAP.</p>
            <p><strong>Breakout:</strong> {current.upper===null?"Channel needs 20 historical candles.":current.close>current.upper?"Close above previous 20-bar high.":current.close<current.lower?"Close below previous 20-bar low.":"Inside the previous channel."}</p>
            <p><strong>Volume:</strong> {current.volRatio===null?"Not enough bars.":current.volRatio.toFixed(2)+"× recent average."}</p>
            <p><strong>Decision:</strong> <span className="font-black text-cyan-200">{current.signal}</span> is a teaching classification, not a trading recommendation.</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100/80"><ShieldAlert size={16} className="mt-0.5 shrink-0"/>This is deliberately synthetic, not historical MNQ data. Replay reveals price one bar at a time, but the predefined scenario and simplified fills cannot establish a profitable strategy. Browser animation is not market connectivity or autonomous trading.</div>
      </div>
    </div>
  </section>;
}

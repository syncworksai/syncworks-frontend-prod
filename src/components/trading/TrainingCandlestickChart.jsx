import React from "react";
import { explainTrainingSignal } from "../../utils/tradingTutorial.mjs";

const COLORS={up:"#34d399",down:"#fb7185",ema7:"#38bdf8",ema9:"#eab308",vwap:"#a78bfa",upper:"#e879f9",lower:"#f87171"};
const W=780,H=380,L=56,R=18,T=18,PB=278,VT=303,VB=349;
const fmt=v=>Number(v).toFixed(1);

export default function TrainingCandlestickChart({bars,trade,lastClosedTrade}) {
  if (!bars?.length) return null;
  const values=bars.flatMap(b=>[b.high,b.low,b.ema7,b.ema9,b.vwap,b.upper,b.lower].filter(Number.isFinite));
  if(trade)values.push(trade.entry,trade.stop,trade.target);
  const min=Math.min(...values),max=Math.max(...values),padding=Math.max((max-min)*.075,2);
  const lo=min-padding,hi=max+padding;
  const y=v=>T+(hi-v)/(hi-lo)*(PB-T);
  const slot=(W-L-R)/bars.length,x=i=>L+slot*(i+.5),bw=Math.max(2,Math.min(12,slot*.68));
  const maxVol=Math.max(1,...bars.map(b=>b.volume));
  const last=bars[bars.length-1],review=explainTrainingSignal(last);
  const lines=[["ema7","EMA7",COLORS.ema7],["ema9","EMA9",COLORS.ema9],["vwap","VWAP",COLORS.vwap],["upper","DC High",COLORS.upper],["lower","DC Low",COLORS.lower]];
  const paths=(key)=>{let parts=[],current=[];bars.forEach((b,i)=>{if(Number.isFinite(b[key]))current.push(x(i)+","+y(b[key]));else if(current.length){parts.push(current.join(" "));current=[];}});if(current.length)parts.push(current.join(" "));return parts;};
  return <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#050c1a] p-2">
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] text-slate-400">
      <strong className="text-white">SIMULATED CANDLES + VOLUME</strong>
      <span>O {fmt(last.open)} · H {fmt(last.high)} · L {fmt(last.low)} · C {fmt(last.close)}</span>
    </div>
    <svg viewBox={"0 0 "+W+" "+H} width="100%" role="img" aria-label={"Simulated green and red candlestick chart with volume and indicators. Last close "+fmt(last.close)}>
      <defs><clipPath id="sw-practice-price"><rect x={L} y={T} width={W-L-R} height={PB-T}/></clipPath></defs>
      {Array.from({length:5},(_,i)=>{const value=lo+(hi-lo)*(i/4),yy=y(value);return <g key={i}><line x1={L} x2={W-R} y1={yy} y2={yy} stroke="#203047" strokeDasharray="3 5"/><text x={L-7} y={yy+4} textAnchor="end" fontSize="10" fill="#94a3b8">{fmt(value)}</text></g>;})}
      <g clipPath="url(#sw-practice-price)">
        {bars.map((bar,i)=>{const color=bar.close>=bar.open?COLORS.up:COLORS.down,cx=x(i),top=Math.min(y(bar.open),y(bar.close)),bottom=Math.max(y(bar.open),y(bar.close));return <g key={bar.time} className={i===bars.length-1?"sw-training-new-bar":""}><line x1={cx} y1={y(bar.high)} x2={cx} y2={y(bar.low)} stroke={color} strokeWidth="1.5"/><rect x={cx-bw/2} y={top} width={bw} height={Math.max(1.6,bottom-top)} rx=".7" fill={color}/></g>;})}
        {lines.map(([key,,color])=>paths(key).map((p,i)=><polyline key={key+i} points={p} fill="none" stroke={color} strokeWidth={key==="ema7"?2:1.4} strokeDasharray={key==="upper"||key==="lower"?"5 4":undefined} opacity=".95"/>))}
        {trade&&[["ENTRY",trade.entry,"#93c5fd"],["STOP",trade.stop,"#fb7185"],["2R",trade.target,"#4ade80"]].map(([name,value,color])=><g key={name}><line x1={L} x2={W-R} y1={y(value)} y2={y(value)} stroke={color} strokeDasharray="7 4"/><text x={W-R-6} y={y(value)-4} textAnchor="end" fontSize="10" fontWeight="700" fill={color}>{name} {fmt(value)}</text></g>)}
        {last.signal!=="WAIT"&&!trade&&<g><circle cx={x(bars.length-1)} cy={y(last.close)} r="10" fill={last.signal.startsWith("LONG")?COLORS.up:COLORS.down} fillOpacity=".25"/><circle cx={x(bars.length-1)} cy={y(last.close)} r="3" fill={last.signal.startsWith("LONG")?COLORS.up:COLORS.down}/></g>}
      </g>
      <line x1={L} x2={W-R} y1={VT-6} y2={VT-6} stroke="#334155"/><text x="7" y={VT+11} fontSize="10" fill="#94a3b8">VOL</text>
      {bars.map((b,i)=>{const h=b.volume/maxVol*(VB-VT);return <rect key={b.time} x={x(i)-bw/2} y={VB-h} width={bw} height={h} fill={b.close>=b.open?COLORS.up:COLORS.down} opacity=".7"/>;})}
      {bars.map((bar,i)=>i%Math.max(1,Math.ceil(bars.length/8))===0?<text key={bar.time} x={x(i)} y="367" fontSize="10" textAnchor="middle" fill="#94a3b8">{bar.time}</text>:null)}
      {lastClosedTrade&&<text x={W-R-7} y={VT+10} textAnchor="end" fontSize="11" fill={lastClosedTrade.resultR>=0?"#4ade80":"#fb7185"}>{lastClosedTrade.outcome}: {Number(lastClosedTrade.resultR).toFixed(2)}R</text>}
    </svg>
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[10px]">{[["Up",COLORS.up],["Down",COLORS.down],...lines.map(([,label,color])=>[label,color])].map(([name,color])=><span key={name} className="flex items-center gap-1 text-slate-300"><span style={{background:color}} className="inline-block h-2 w-2 rounded-sm"/>{name}</span>)}</div>
    <p className="px-1 pt-2 text-xs text-amber-200">{review.summary}</p>
    <style>{'@keyframes sw-candle-grow{from{opacity:.15;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}.sw-training-new-bar{animation:sw-candle-grow .3s ease-out}@media(prefers-reduced-motion:reduce){.sw-training-new-bar{animation:none}}'}</style>
  </div>;
}
import React, { useEffect, useState } from "react";

const FOCUS = [
  ["Purpose and schedule","Define why time, independence and disciplined routines matter. Choose a repeatable study window."],
  ["Risk before reward","Write a maximum paper loss per day and a stop rule. A planned no-trade day counts."],
  ["Candles and structure","Identify candle bodies, wicks, highs/lows, market structure and false breaks."],
  ["EMA / VWAP","Practice reading trend pressure and price location without predicting the next candle."],
  ["Donchian / volume","Compare breakouts and failed breakouts; explain what confirmation is missing."],
  ["Execution and journaling","Simulate entries, stops, targets and trade reviews. Record reasons, not just results."],
];
export const THIRTY_DAY_COURSE = Array.from({length:30},(_,i)=>{
  const phase=Math.floor(i/6),section=FOCUS[i%6];
  return {day:i+1,title:section[0],description:section[1],phase:["Foundation","Replay practice","Consistency","Risk discipline","Review and readiness"][phase]};
});
const key=id=>"sw:trading-course:30-day:v1:"+String(id).replace(/[^a-zA-Z0-9_-]/g,"_");
function load(id) {
  if(!id||typeof window==="undefined")return {};
  try {const o=JSON.parse(window.localStorage.getItem(key(id))||"{}");return typeof o==="object"&&o?o:{};}catch{return {};}
}
export default function TradingCoursePanel({userId}) {
  const [progress,setProgress]=useState(()=>load(userId));
  const [day,setDay]=useState(1);
  useEffect(()=>{setProgress(load(userId));},[userId]);
  function update(next) {setProgress(next);try{if(userId)window.localStorage.setItem(key(userId),JSON.stringify(next));}catch{/* storage unavailable */}}
  const current=THIRTY_DAY_COURSE[day-1];
  const done=THIRTY_DAY_COURSE.filter(x=>progress[x.day]?.completed).length;
  return <div className="space-y-4 text-sm text-slate-200">
    <div className="rounded-xl border border-violet-400/25 bg-violet-500/5 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-violet-200">The Freedom Project · Trading Academy</p>
      <blockquote className="mt-2 text-lg font-semibold leading-7">“It’s never really about the money. It’s about freedom, time, and the ability to do things on your own.”</blockquote>
      <p className="mt-2 text-xs text-slate-400">Course-origin note from trading class, saved here as the opening theme. Becoming funded in 30 days is a goal, not a promised outcome. Eligibility, required trading days, rules and evaluations depend on the provider.</p>
    </div>
    <div className="flex items-center justify-between gap-2"><strong>{done} of 30 practice days completed</strong><span className="text-xs text-slate-400">Saved on this browser</span></div>
    <div className="grid grid-cols-6 gap-1">{THIRTY_DAY_COURSE.map(x=><button key={x.day} type="button" onClick={()=>setDay(x.day)} aria-label={"Open course day "+x.day} aria-pressed={day===x.day} className={"rounded-md border py-2 text-xs font-bold "+(day===x.day?"border-violet-400 bg-violet-500/20 text-white":progress[x.day]?.completed?"border-emerald-500/30 text-emerald-300":"border-white/10 text-slate-400")}>{x.day}</button>)}</div>
    <div className="rounded-xl border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wider text-cyan-300">{current.phase} · Day {current.day}</p>
      <h3 className="mt-1 text-xl font-black">{current.title}</h3>
      <p className="mt-2 text-slate-300">{current.description}</p>
      <p className="mt-3 text-xs text-slate-400">Assignment: Watch at least one practice sequence, explain the setup, record a trade or a deliberate WAIT in your journal, then review risk discipline.</p>
      <label className="mt-4 block text-xs font-semibold text-slate-400">Today's learning notes<textarea rows={4} maxLength={4000} value={progress[day]?.notes||""} onChange={e=>update({...progress,[day]:{...progress[day],notes:e.target.value}})} placeholder="What did I see? What did Jarvis flag? What would I improve?" className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-3 text-sm text-white"/></label>
      <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={!!progress[day]?.completed} onChange={e=>update({...progress,[day]:{...progress[day],completed:e.target.checked}})}/><span>Mark this practice day complete</span></label>
    </div>
    <p className="text-xs text-slate-500">Educational simulator only. Completion measures learning activity—not profitability, account eligibility, or broker evaluation success.</p>
  </div>;
}

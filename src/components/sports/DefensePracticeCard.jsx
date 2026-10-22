import React, {useEffect, useMemo, useState} from "react";

const drillTypes=[["GROUND","Ground ball"],["FLY","Fly ball"],["LINER","Line drive"],["RELAY","Cutoff / relay"],["FORCE","Force / double-play turn"],["BACKUP","Backup / rotation"]];
const situations=[["","Bases empty"],["1","Runner at first"],["2","Runner at second"],["3","Runner at third"],["12","First + second"],["13","Corners"],["23","Second + third"],["123","Bases loaded"]];
const results=[["OUT","Out recorded"],["SINGLE","Held to single"],["EXTRA","Extra base allowed"],["ERROR","Error / missed play"],["NO_OUT","No out, correct containment"]];
const defaults=["Jeff","Ethan","Jordan","Elijah","Jake","Shaw","Zack","Marcus","Kyle","Russ"];
const dateLabel=s=>{try{return new Date(s).toLocaleDateString(undefined,{month:"short",day:"numeric"});}catch{return "—";}};
const share= (a,b)=> b ? Math.round(100*a/b) : null;
function Metric({label,value,sub}){return <div className="rounded-xl border border-white/10 bg-white/[.035] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 text-2xl font-black text-white">{value}</div><p className="text-[10px] text-slate-500">{sub}</p></div>}
export default function DefensePracticeCard({groupId,coachId,teamId,players=[],resultsOnly=false}){
 const key=`sw_defensive_drills_v1_${groupId}_${coachId}`;
 const coverageKey=`sw_coach_coverage_v2_${groupId}_${coachId}`;
 const [loaded,setLoaded]=useState(false);
 const [reps,setReps]=useState([]);
 const [savedFormations,setSavedFormations]=useState([]);
 const [error,setError]=useState("");
 const [current,setCurrent]=useState({player:"",type:"GROUND",formation:"base",runners:"",outs:0,result:"OUT",read:true,assignment:true,clean:true,throwAccurate:true,notes:""});
 const roster=useMemo(()=>players?.length?players.filter(p=>p.is_active!==false).map(p=>({id:String(p.id),name:p.display_name||p.name||"Player"})):defaults.map(n=>({id:n,name:n})),[players]);
 useEffect(()=>{setLoaded(false);try{const data=JSON.parse(localStorage.getItem(key)||"[]");setReps(Array.isArray(data)?data:[]);}catch{setReps([]);setError("Could not load practice records.");}setLoaded(true);},[key]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(key,JSON.stringify(reps));}catch{setError("This browser could not store the practice records.");}},[key,reps,loaded]);
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(coverageKey)||"{}");setSavedFormations(Array.isArray(v.plays)?v.plays:[]);}catch{setSavedFormations([]);}},[coverageKey,resultsOnly]);
 useEffect(()=>{if(!roster.length)return;setCurrent(v=>roster.some(p=>p.id===v.player)?v:{...v,player:roster[0].id});},[roster]);
 const playerName=id=>roster.find(p=>p.id===id)?.name||reps.find(r=>r.player===id)?.playerName||id;
 const stats=useMemo(()=>{
  const total=reps.length;
  const outs=reps.filter(r=>r.result==="OUT").length;
  const clean=reps.filter(r=>r.clean).length;
  const decisions=reps.filter(r=>r.read&&r.assignment).length;
  const tasks=reps.reduce((a,r)=>a+["read","assignment","clean","throwAccurate"].filter(k=>r[k]).length,0);
  return {total,outs,clean,decisions,taskRate:share(tasks,total*4),outRate:share(outs,total),cleanRate:share(clean,total),decisionRate:share(decisions,total)};
 },[reps]);
 const perPlayer=useMemo(()=>roster.map(p=>{const list=reps.filter(r=>r.player===p.id);return {...p,attempts:list.length,outs:list.filter(r=>r.result==="OUT").length,decisions:share(list.filter(r=>r.read&&r.assignment).length,list.length),execution:share(list.reduce((a,r)=>a+["read","assignment","clean","throwAccurate"].filter(k=>r[k]).length,0),list.length*4)};}).filter(p=>p.attempts).sort((a,b)=>b.attempts-a.attempts),[reps,roster]);
 const add=()=>{const found=roster.find(p=>p.id===current.player);if(!found){setError("Select a player first.");return;}setError("");setReps(old=>[{...current,id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,teamId,playerName:found.name,recordedAt:new Date().toISOString()},...old]);setCurrent(v=>({...v,notes:""}));};
 const remove=id=>setReps(old=>old.filter(r=>r.id!==id));
 return <section className="space-y-3 rounded-2xl border border-emerald-300/20 bg-[#07111e] p-3 text-white">
  <div><div className="text-[10px] font-black uppercase tracking-[.15em] text-emerald-300">Coach-only practice evaluations</div><h2 className="mt-1 text-lg font-black">{resultsOnly?"Defensive practice results":"Defensive practice reps"}</h2><p className="mt-1 text-xs leading-5 text-slate-400">Record the play, whether it became an out, and whether the player made the correct read, assignment, fielding action, and throw.</p></div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
   <Metric label="Practice reps" value={stats.total} sub="Logged defensive plays"/>
   <Metric label="Out conversion" value={stats.outRate===null?"—":stats.outRate+"%"} sub={stats.outs+" outs / "+stats.total+" reps"}/>
   <Metric label="Correct decision" value={stats.decisionRate===null?"—":stats.decisionRate+"%"} sub="Read + assignment both right"/>
   <Metric label="Execution" value={stats.taskRate===null?"—":stats.taskRate+"%"} sub="All four tasks scored equally"/>
  </div>
  {!resultsOnly&&<div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
   <div className="grid grid-cols-2 gap-2">
    <label className="col-span-2 text-xs font-semibold text-slate-300">Defender<select value={current.player} onChange={e=>setCurrent(v=>({...v,player:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-2 text-base text-white">{roster.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-300">Drill<select value={current.type} onChange={e=>setCurrent(v=>({...v,type:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-2 text-sm text-white">{drillTypes.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-300">Coverage<select value={current.formation} onChange={e=>setCurrent(v=>({...v,formation:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-2 text-sm text-white"><option value="base">Cover 4 Base</option><option value="press">Cover Press</option><option value="deep">Cover Deep</option><option value="grass">Infield Back</option><option value="turn">Turn Two</option>{savedFormations.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-300">Runners<select value={current.runners} onChange={e=>setCurrent(v=>({...v,runners:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-2 text-sm text-white">{situations.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-300">Outs before<select value={current.outs} onChange={e=>setCurrent(v=>({...v,outs:Number(e.target.value)}))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-2 text-sm text-white">{[0,1,2].map(n=><option key={n} value={n}>{n} outs</option>)}</select></label>
    <label className="col-span-2 text-xs font-semibold text-slate-300">Actual result<select value={current.result} onChange={e=>setCurrent(v=>({...v,result:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-2 text-sm text-white">{results.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   </div>
   <div><p className="mb-2 text-[11px] font-black uppercase tracking-wide text-cyan-300">Grade the execution — tap each</p><div className="grid grid-cols-2 gap-2">{[["read","Correct first read"],["assignment","Correct assignment"],["clean","Clean field / catch"],["throwAccurate","Accurate throw / relay"]].map(([id,label])=><button key={id} type="button" aria-pressed={current[id]} onClick={()=>setCurrent(v=>({...v,[id]:!v[id]}))} className={`min-h-12 rounded-xl border p-2 text-left text-[11px] font-bold ${current[id]?"border-emerald-300/40 bg-emerald-300/10 text-emerald-100":"border-rose-300/25 bg-rose-300/5 text-rose-200"}`}>{current[id]?"✓ ":"○ "}{label}</button>)}</div></div>
   <label className="block text-xs text-slate-300">Note (optional)<input value={current.notes} onChange={e=>setCurrent(v=>({...v,notes:e.target.value}))} placeholder="Bad first step, clean relay, ball into gap…" className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-900 px-3 text-base text-white"/></label>
   {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
   <button type="button" onClick={add} className="min-h-12 w-full rounded-xl bg-emerald-300 text-sm font-black text-slate-950">+ Log defensive rep</button>
  </div>}
  <div className="rounded-xl border border-white/10 bg-black/10 p-3">
   <h3 className="text-sm font-black">Player execution results</h3>
   {perPlayer.length?<div className="mt-2 space-y-2">{perPlayer.map(p=><div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.02] px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{p.name}</p><p className="text-[10px] text-slate-400">{p.outs}/{p.attempts} outs · {p.decisions}% correct reads/assignments</p></div><span className="text-sm font-black text-emerald-200">{p.execution}%</span></div>)}</div>:<p className="mt-2 text-xs text-slate-500">Log practice reps to build a coaching baseline.</p>}
  </div>
  <div><h3 className="text-sm font-black">Recent defensive reps</h3><div className="mt-2 space-y-2">{reps.slice(0,15).map(r=><div key={r.id} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"><div className="min-w-0 flex-1"><p className="text-xs font-bold">{r.playerName} · {r.type} · {r.result}</p><p className="text-[10px] text-slate-400">{dateLabel(r.recordedAt)} · {r.formation} · {["read","assignment","clean","throwAccurate"].filter(k=>r[k]).length}/4 execution · {r.notes}</p></div>{!resultsOnly&&<button type="button" onClick={()=>remove(r.id)} className="rounded-md border border-rose-300/25 px-2 py-1 text-xs text-rose-200">Delete</button>}</div>)}</div></div>
  <p className="text-[11px] leading-5 text-amber-200">Defense practice records currently save only in this coach's browser on this device. Offensive BP/QAB records use the existing SyncWorks practice API. These measurements are training observations, not guaranteed game-out probabilities.</p>
 </section>;
}

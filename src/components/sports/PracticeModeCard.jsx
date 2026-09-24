import React, { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Crosshair, Plus, Target, Trash2 } from "lucide-react";
import { addPracticeRep, createPracticeSession, getPracticeSessions, getPracticeSummary, removePracticeRep } from "../../api/sports";

const cx=(...v)=>v.filter(Boolean).join(" ");
const num=(v)=>Number(v||0);
const pct=(v)=>num(v).toFixed(3).replace(/^0(?=\.)/,"");

const OBJECTIVES=[
  ["QUALITY_AB","Quality at-bat"],
  ["ADVANCE_RUNNER","Move the runner"],
  ["SAC_FLY","Sacrifice fly"],
  ["SCORE_RUNNER","Score the runner"],
  ["TWO_OUT_HIT","Two-out hitting"],
  ["HIT_BEHIND_RUNNER","Hit behind runner"],
];
const RESULTS=["1B","2B","3B","HR","BB","OUT","K","ROE","FC","SF"];
const BASES=[
  ["","Bases empty"],["1","Runner on 1st"],["2","Runner on 2nd"],["3","Runner on 3rd"],
  ["12","1st + 2nd"],["13","1st + 3rd"],["23","2nd + 3rd"],["123","Bases loaded"],
];

function Stat({label,value,sub}){return <div className="rounded-xl border border-white/10 bg-black/20 p-2"><div className="text-[7px] font-black uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-white">{value}</div>{sub?<div className="text-[8px] text-slate-500">{sub}</div>:null}</div>;}

export default function PracticeModeCard({teamId,playerId="",players=[],managerView=false}){
  const [selectedPlayer,setSelectedPlayer]=useState(playerId?String(playerId):"");
  const [sessions,setSessions]=useState([]);
  const [summary,setSummary]=useState(null);
  const [activeSession,setActiveSession]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [rep,setRep]=useState({objective:"QUALITY_AB",outs_before:0,base_state:"",result:"1B",runners_advanced:0,rbi:0,successful:true,notes:""});

  const effectivePlayer=selectedPlayer||String(playerId||"");
  const recent=useMemo(()=>sessions.find((row)=>String(row.id)===String(activeSession?.id))||activeSession,[sessions,activeSession]);

  async function refresh(target=effectivePlayer){
    if(!teamId||!target)return;
    setBusy(true);setError("");
    try{
      const [rows,info]=await Promise.all([
        getPracticeSessions({team:teamId,player:target}),
        getPracticeSummary(teamId,target),
      ]);
      setSessions(rows);
      setSummary(info);
      setActiveSession((current)=>current ? rows.find((row)=>Number(row.id)===Number(current.id))||rows[0]||null : rows[0]||null);
    }catch(err){setError(err?.response?.data?.detail||"Practice data could not load.");}
    finally{setBusy(false);}
  }

  useEffect(()=>{if(playerId)setSelectedPlayer(String(playerId));},[playerId]);
  useEffect(()=>{if(effectivePlayer)refresh(effectivePlayer);},[teamId,effectivePlayer]);

  async function startSession(kind="SITUATIONS"){
    if(!effectivePlayer||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const session=await createPracticeSession({team:Number(teamId),player:Number(effectivePlayer),kind,title:kind==="SITUATIONS"?"Situations BP":"Batting practice"});
      setNotice("Practice session started.");
      setActiveSession(session);
      await refresh(effectivePlayer);
    }catch(err){setError(err?.response?.data?.detail||"Practice session could not be created.");}
    finally{setBusy(false);}
  }

  async function logRep(){
    if(!recent?.id||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      await addPracticeRep(recent.id,{
        objective:rep.objective,outs_before:Number(rep.outs_before),base_state:rep.base_state,
        result:rep.result,runners_advanced:Number(rep.runners_advanced),rbi:Number(rep.rbi),
        successful:Boolean(rep.successful),notes:rep.notes,
      });
      setNotice("Rep logged.");
      setRep((current)=>({...current,notes:""}));
      await refresh(effectivePlayer);
    }catch(err){setError(err?.response?.data?.detail||"Practice rep could not be saved.");}
    finally{setBusy(false);}
  }

  async function deleteRep(id){
    if(busy||!window.confirm("Remove this practice rep?"))return;
    setBusy(true);
    try{await removePracticeRep(id);await refresh(effectivePlayer);}
    catch(err){setError(err?.response?.data?.detail||"Rep could not be removed.");}
    finally{setBusy(false);}
  }

  return <section className="space-y-3 rounded-[1.45rem] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,.08),transparent_38%),#07111f] p-3.5">
    <div className="flex items-start justify-between gap-3">
      <div><div className="flex items-center gap-2 text-sm font-black text-white"><Target className="h-4 w-4 text-emerald-300"/>Practice mode</div><p className="mt-1 text-[10px] leading-4 text-slate-400">Log BP and “situations” reps using the same context as the live Game Book, then compare practice success to game performance.</p></div>
      <Activity className="h-5 w-5 text-cyan-300"/>
    </div>

    {managerView&&players.length?<label className="block text-[8px] font-black uppercase tracking-wide text-slate-500">Player
      <select value={effectivePlayer} onChange={(e)=>setSelectedPlayer(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#050b14] px-3 text-xs font-black text-white">
        <option value="">Choose player</option>{players.filter((p)=>p.is_active!==false).map((p)=><option key={p.id} value={p.id}>#{p.jersey_number||"—"} {p.display_name}</option>)}
      </select>
    </label>:null}

    {error?<div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[10px] text-rose-100">{error}</div>:null}
    {notice?<div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2 text-[10px] text-emerald-100">{notice}</div>:null}

    {effectivePlayer&&summary?<>
      <div className="grid grid-cols-4 gap-1.5">
        <Stat label="Practice AVG" value={pct(summary.practice?.avg)} sub={summary.practice?.reps+" reps"}/>
        <Stat label="Live AVG" value={pct(summary.live?.avg)} sub={summary.live?.pa+" tracked PA"}/>
        <Stat label="BP 2-out" value={pct(summary.practice?.two_out_avg)} sub={summary.practice?.two_out_reps+" reps"}/>
        <Stat label="Live 2-out" value={pct(summary.live?.two_out_avg)} sub={summary.live?.two_out_pa+" PA"}/>
      </div>

      {(summary.recommendations||[]).length?<div className="rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3"><div className="text-[8px] font-black uppercase tracking-wide text-amber-300">Training recommendations</div><div className="mt-2 space-y-2">{summary.recommendations.map((row,index)=><div key={index} className="rounded-lg border border-white/10 bg-black/15 p-2"><b className="text-[10px] text-white">{row.title}</b><div className="mt-0.5 text-[9px] leading-4 text-slate-400">{row.reason}</div></div>)}</div></div>:null}

      <div className="overflow-x-auto rounded-xl border border-white/10"><table className="min-w-[620px] w-full text-[9px]"><thead className="bg-white/[.035] text-slate-500"><tr><th className="p-2 text-left">SITUATION</th><th>BP ATT</th><th>BP %</th><th>GAME ATT</th><th>GAME %</th></tr></thead><tbody>{(summary.objectives||[]).map((row)=><tr key={row.key} className="border-t border-white/10"><td className="p-2 font-black text-white">{row.label}</td><td className="text-center">{row.practice_attempts}</td><td className="text-center">{row.practice_rate==null?"—":Math.round(row.practice_rate*100)+"%"}</td><td className="text-center">{row.live_attempts}</td><td className="text-center">{row.live_rate==null?"—":Math.round(row.live_rate*100)+"%"}</td></tr>)}</tbody></table></div>
      <div className="text-[8px] leading-4 text-slate-600">{summary.tracking_note}</div>
    </>:effectivePlayer&&!busy?<div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-slate-500">Start the first BP session to build practice history.</div>:null}

    {effectivePlayer?<div className="grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={()=>startSession("BP")} className="min-h-11 rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-[10px] font-black text-cyan-100"><Plus className="mr-1 inline h-4 w-4"/>New BP</button><button type="button" disabled={busy} onClick={()=>startSession("SITUATIONS")} className="min-h-11 rounded-xl bg-emerald-300 text-[10px] font-black text-slate-950"><Crosshair className="mr-1 inline h-4 w-4"/>Situations</button></div>:null}

    {recent?<div className="rounded-xl border border-emerald-300/15 bg-black/15 p-3">
      <div className="flex items-center justify-between gap-2"><div><div className="text-[8px] font-black uppercase tracking-wide text-emerald-300">Active / recent session</div><b className="text-xs text-white">{recent.title||recent.kind}</b></div><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] text-slate-400">{recent.rep_count||recent.reps?.length||0} reps</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[8px] font-black uppercase text-slate-500">Objective<select value={rep.objective} onChange={(e)=>setRep({...rep,objective:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-xs text-white">{OBJECTIVES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className="text-[8px] font-black uppercase text-slate-500">Outs before<select value={rep.outs_before} onChange={(e)=>setRep({...rep,outs_before:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-xs text-white"><option value={0}>0 outs</option><option value={1}>1 out</option><option value={2}>2 outs</option></select></label>
        <label className="text-[8px] font-black uppercase text-slate-500">Runners<select value={rep.base_state} onChange={(e)=>setRep({...rep,base_state:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-xs text-white">{BASES.map(([v,l])=><option key={v||"empty"} value={v}>{l}</option>)}</select></label>
        <label className="text-[8px] font-black uppercase text-slate-500">Result<select value={rep.result} onChange={(e)=>setRep({...rep,result:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-xs text-white">{RESULTS.map((v)=><option key={v}>{v}</option>)}</select></label>
        <label className="text-[8px] font-black uppercase text-slate-500">Runners moved<input type="number" min="0" max="3" value={rep.runners_advanced} onChange={(e)=>setRep({...rep,runners_advanced:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-[16px] text-white sm:text-xs"/></label>
        <label className="text-[8px] font-black uppercase text-slate-500">RBI<input type="number" min="0" max="4" value={rep.rbi} onChange={(e)=>setRep({...rep,rbi:e.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-[16px] text-white sm:text-xs"/></label>
      </div>
      <button type="button" onClick={()=>setRep({...rep,successful:!rep.successful})} className={cx("mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border text-[10px] font-black",rep.successful?"border-emerald-300/30 bg-emerald-300/10 text-emerald-100":"border-white/10 text-slate-400")}>{rep.successful?<CheckCircle2 className="h-4 w-4"/>:null}{rep.successful?"Situation accomplished":"Mark situation successful"}</button>
      <input value={rep.notes} onChange={(e)=>setRep({...rep,notes:e.target.value})} placeholder="Optional note: backside grounder, deep fly, hard line drive…" className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-3 text-[16px] text-white sm:text-xs"/>
      <button type="button" disabled={busy} onClick={logRep} className="mt-2 min-h-11 w-full rounded-xl bg-cyan-300 text-xs font-black text-slate-950">Log rep</button>
      {(recent.reps||[]).length?<div className="mt-3 space-y-1.5">{recent.reps.slice().reverse().slice(0,12).map((row)=><div key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 p-2"><div className="min-w-0"><b className="text-[9px] text-white">#{row.sequence} · {row.objective_label} · {row.result}</b><div className="text-[8px] text-slate-500">{row.outs_before} out{row.outs_before===1?"":"s"} · {BASES.find(([v])=>v===row.base_state)?.[1]||"Bases empty"} · {row.successful?"SUCCESS":"MISS"}</div></div><button type="button" onClick={()=>deleteRep(row.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-300/20 text-rose-200"><Trash2 className="h-3.5 w-3.5"/></button></div>)}</div>:null}
    </div>:null}
  </section>;
}

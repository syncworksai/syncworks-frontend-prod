import React, { useEffect, useState } from "react";
import { Crosshair, Footprints, Flame, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Zap } from "lucide-react";

export const DEFAULT_REWARD_RULES = {
  POWER: { enabled:true, thresholds:[3,8,16,30] },
  CONTACT: { enabled:true, thresholds:[[0.450,10],[0.550,20],[0.650,35],[0.750,60]] },
  SPEED: { enabled:true, thresholds:[3,7,12,20] },
  CLUTCH: { enabled:true, thresholds:[1,3,5,8] },
};
const categories = [
  ["POWER","Power",Zap,"#FBBF24","Extra-base hits: 2B=1 point, 3B=2, HR=3."],
  ["CONTACT","Contact",Crosshair,"#22D3EE","Batting average after minimum official at-bats."],
  ["SPEED","Speed",Footprints,"#70FF3D","Coach-verified extra-base advances or permitted steals."],
  ["CLUTCH","Clutch",Flame,"#C084FC","Verified late tying or go-ahead RBI hits."],
];
const tierNames=["Bronze","Silver","Gold","Diamond"];
const tierColor=["#CD7F32","#38BDF8","#FBBF24","#C084FC"];
const copy = value => JSON.parse(JSON.stringify(value));

export default function TeamRewardSettings({ initialRules, onSave, saving=false }) {
  const [rules,setRules]=useState(()=>copy(initialRules||DEFAULT_REWARD_RULES));
  const [error,setError]=useState("");
  useEffect(()=>{if(initialRules)setRules(copy(initialRules));},[initialRules]);
  function threshold(category,index,value,ab=false){
    setRules(current=>{
      const next=copy(current), entries=next[category].thresholds;
      if(category==="CONTACT"){
        entries[index][ab?1:0]=ab?Number.parseInt(value||"0",10):Number(value||0);
      }else entries[index]=Number.parseInt(value||"0",10);
      return next;
    });
  }
  async function save(){
    setError("");
    for(const [key] of categories){
      const row=rules[key];
      if(!row||row.thresholds.length!==4){setError("Each category requires all four badge tiers.");return;}
      const thresholds=row.thresholds;
      if(key==="CONTACT"){
        if(thresholds.some((pair)=>!(pair[0]>=.05&&pair[0]<=1&&pair[1]>=1))||
           thresholds.some((pair,i)=>i>0&&(pair[0]<=thresholds[i-1][0]||pair[1]<=thresholds[i-1][1]))){
          setError("Contact tiers must have increasing batting averages and at-bat minimums.");return;
        }
      }else if(thresholds.some(v=>!Number.isInteger(v)||v<1||v>999)||
                 thresholds.some((v,i)=>i>0&&v<=thresholds[i-1])){
        setError(key+" point thresholds must be increasing whole numbers.");return;
      }
    }
    try {await onSave(copy(rules));}
    catch(err){setError(err?.response?.data?.rules || err?.response?.data?.detail || err?.message || "Unable to save reward rules.");}
  }
  return <div className="space-y-3">
    <section className="rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3">
      <div className="flex items-center gap-2 text-xs font-black text-amber-100"><SlidersHorizontal className="h-4 w-4"/>Earned reward settings</div>
      <p className="mt-2 text-[11px] leading-5 text-slate-300">Your team sets its own four-level season achievements. Only owners and coaches can change these goals. Every change recalculates badge borders from genuine stats and verified moments; it does not edit Game Book history.</p>
    </section>
    {categories.map(([key,label,Icon,color,description])=>{
      const value=rules[key];
      if(!value)return null;
      return <section key={key} className="rounded-xl border border-white/10 bg-[#07111f] p-3">
        <div className="flex items-start justify-between gap-2">
          <div><b className="flex items-center gap-2 text-sm text-white"><Icon className="h-5 w-5" style={{color}}/>{label}</b><p className="mt-1 text-[10px] leading-4 text-slate-400">{description}</p></div>
          <label className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2 text-[10px] font-black text-white"><input type="checkbox" checked={!!value.enabled} onChange={e=>setRules(current=>({...current,[key]:{...current[key],enabled:e.target.checked}}))} className="h-4 w-4 accent-cyan-300"/>{value.enabled?"ON":"OFF"}</label>
        </div>
        <div className={"mt-3 grid gap-2 sm:grid-cols-2 "+(!value.enabled?"opacity-50":"")}>
          {value.thresholds.map((entry,index)=><div key={index} className="rounded-xl border p-2.5" style={{borderColor:tierColor[index]+"55",background:tierColor[index]+"0a"}}>
            <div className="mb-2 flex items-center justify-between gap-2"><b className="text-[10px] uppercase tracking-wider text-white">{tierNames[index]}</b><span className="h-2 w-2 rounded-full" style={{background:tierColor[index],boxShadow:`0 0 9px ${tierColor[index]}`}}/></div>
            {key==="CONTACT"?<div className="grid grid-cols-2 gap-1.5">
              <label className="text-[9px] text-slate-400">Minimum AVG
                <input aria-label={`${label} ${tierNames[index]} minimum AVG`} type="number" min=".05" max="1" step=".001" value={entry[0]} onChange={e=>threshold(key,index,e.target.value,false)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-[#030712] px-2 text-base text-white"/>
              </label>
              <label className="text-[9px] text-slate-400">At-bats
                <input aria-label={`${label} ${tierNames[index]} at bats`} type="number" min="1" max="500" step="1" value={entry[1]} onChange={e=>threshold(key,index,e.target.value,true)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-[#030712] px-2 text-base text-white"/>
              </label>
            </div>:<label className="text-[9px] text-slate-400">Earned points
              <input aria-label={`${label} ${tierNames[index]} points`} type="number" min="1" max="999" step="1" value={entry} onChange={e=>threshold(key,index,e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-[#030712] px-3 text-base text-white"/>
            </label>}
          </div>)}
        </div>
      </section>;
    })}
    <section className="rounded-xl border border-violet-300/20 bg-violet-300/[.04] p-3">
      <div className="flex items-center gap-2 text-[11px] font-black text-violet-100"><ShieldCheck className="h-4 w-4"/>Coach review of individual rewards</div>
      <p className="mt-1 text-[10px] leading-5 text-slate-300">Open a player in Roster to verify or undo Speed and Clutch moments. To correct Power or Contact, adjust the official Game Book or documented historical stats. Badges cannot be assigned without a recorded achievement.</p>
    </section>
    {error?<div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-xs text-rose-100">{String(error)}</div>:null}
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={()=>setRules(copy(DEFAULT_REWARD_RULES))} className="min-h-12 rounded-xl border border-white/15 text-xs font-black text-slate-200"><RotateCcw className="mr-1 inline h-4 w-4"/>Reset defaults</button>
      <button type="button" disabled={saving} onClick={save} className="min-h-12 rounded-xl bg-cyan-300 text-xs font-black text-slate-950 disabled:opacity-50"><Save className="mr-1 inline h-4 w-4"/>{saving?"Saving…":"Save reward rules"}</button>
    </div>
    <p className="text-[9px] text-slate-500">Changing goals affects the display of current and past season badges for this team. Historical stat records and independently verified Game Books stay unchanged.</p>
  </div>;
}

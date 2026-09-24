import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trophy } from "lucide-react";

const num = (value) => Number(value || 0);
const pct = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");

const COLUMNS = [
  ["g","G",(v)=>num(v)], ["pa","PA",(v)=>num(v)], ["ab","AB",(v)=>num(v)],
  ["avg","AVG",pct], ["obp","OBP",pct], ["slg","SLG",pct], ["ops","OPS",pct],
  ["h","H",(v)=>num(v)], ["single","1B",(v)=>num(v)], ["double","2B",(v)=>num(v)],
  ["triple","3B",(v)=>num(v)], ["hr","HR",(v)=>num(v)], ["rbi","RBI",(v)=>num(v)],
  ["runs","R",(v)=>num(v)], ["bb","BB",(v)=>num(v)], ["sf","SF",(v)=>num(v)], ["tb","TB",(v)=>num(v)],
];
const MAP = Object.fromEntries(COLUMNS.map(([key,label,format])=>[key,{key,label,format}]));

export default function InteractiveStatsBoard({ rows, scope, onScope, managerView, onAdd }) {
  const [sortKey,setSortKey] = useState("ops");
  const [sortDirection,setSortDirection] = useState("desc");
  const cleanRows = Array.isArray(rows) ? rows : [];

  const sorted = useMemo(() => [...cleanRows].sort((a,b)=>{
    const av=num(a?.[sortKey]); const bv=num(b?.[sortKey]);
    const delta=sortDirection==="desc" ? bv-av : av-bv;
    if (delta) return delta;
    return String(a?.player?.display_name||"").localeCompare(String(b?.player?.display_name||""));
  }),[cleanRows,sortKey,sortDirection]);

  const leaders = ["avg","ops","h","hr","rbi"].map((key)=>{
    const leader=[...cleanRows].sort((a,b)=>num(b?.[key])-num(a?.[key])||num(b?.pa)-num(a?.pa))[0]||null;
    return {key,leader};
  });

  function sortBy(key){
    if(sortKey===key) setSortDirection((value)=>value==="desc"?"asc":"desc");
    else { setSortKey(key); setSortDirection("desc"); }
  }

  return <section className="rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-3 sm:p-4">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-sm font-black text-white">Stats grid</h2><p className="mt-1 text-[10px] leading-4 text-slate-500">MLB-style sheet: tap any column header to rank the entire roster. Tap again to reverse the sort.</p></div>
      {managerView?<button type="button" onClick={onAdd} className="min-h-10 shrink-0 rounded-xl bg-amber-300 px-3 text-[10px] font-black text-slate-950"><Plus className="mr-1 inline h-4 w-4"/>Add history</button>:<Trophy className="h-4 w-4 text-amber-300"/>}
    </div>

    <div className="mt-3">
      <div className="mb-1.5 flex items-center gap-1 text-[8px] font-black uppercase tracking-[.14em] text-amber-300"><Trophy className="h-3.5 w-3.5"/>Leaders</div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {leaders.map(({key,leader})=><button key={key} type="button" onClick={()=>sortBy(key)} className={"min-w-0 rounded-xl border p-2 text-left "+(sortKey===key?"border-amber-300/30 bg-amber-300/10":"border-white/10 bg-black/15")}>
          <div className="text-[7px] font-black uppercase tracking-wide text-slate-500">{MAP[key].label}</div>
          <div className="mt-1 truncate text-[9px] font-black text-white">{leader?.player?.display_name||"—"}</div>
          <div className="mt-0.5 text-sm font-black text-amber-200">{leader?MAP[key].format(leader[key]):"—"}</div>
        </button>)}
      </div>
    </div>

    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
      {["ALL","LEAGUE","TOURNAMENT"].map((value)=><button key={value} type="button" onClick={()=>onScope?.(value)} className={"shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black "+(scope===value?"bg-cyan-300 text-slate-950":"border border-white/10 text-slate-400")}>{value==="ALL"?"Combined":value[0]+value.slice(1).toLowerCase()}</button>)}
    </div>

    <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#050b14]">
      <table className="min-w-[1120px] border-collapse text-right text-[9px]">
        <thead className="sticky top-0 z-20 bg-[#091421] text-slate-500">
          <tr>
            <th className="sticky left-0 z-30 min-w-[12rem] border-r border-white/10 bg-[#091421] px-3 py-2 text-left">PLAYER</th>
            {COLUMNS.map(([key,label])=><th key={key} className={"border-l border-white/5 px-2 py-2 "+(sortKey===key?"bg-cyan-300/10 text-cyan-100":"")}>
              <button type="button" onClick={()=>sortBy(key)} className="inline-flex min-h-8 w-full items-center justify-end gap-1 font-black">{label}{sortKey===key?(sortDirection==="desc"?<ArrowDown className="h-3 w-3"/>:<ArrowUp className="h-3 w-3"/>):null}</button>
            </th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row,index)=><tr key={row.player?.id} className="border-t border-white/5 hover:bg-white/[.025]">
            <td className="sticky left-0 z-10 border-r border-white/10 bg-[#07111f] px-3 py-2 text-left">
              <div className="flex items-center gap-2"><span className="w-5 text-[8px] font-black text-cyan-300">#{index+1}</span><div className="min-w-0"><b className="block truncate text-[10px] text-white">#{row.player?.jersey_number||"—"} {row.player?.display_name}</b><span className="text-[7px] text-slate-600">{row.player?.primary_position||"—"}</span></div></div>
            </td>
            {COLUMNS.map(([key,,format])=><td key={key} className={"border-l border-white/5 px-2 py-2 font-black "+(sortKey===key?"bg-cyan-300/[.05] text-cyan-100":"text-slate-300")}>{format(row?.[key])}</td>)}
          </tr>)}
          {!sorted.length?<tr><td colSpan={COLUMNS.length+1} className="p-6 text-center text-xs text-slate-500">No stats recorded yet.</td></tr>:null}
        </tbody>
      </table>
    </div>
    <div className="mt-2 text-[8px] text-slate-600">Swipe the sheet left/right on mobile. Player names stay pinned while you compare columns.</div>
  </section>;
}

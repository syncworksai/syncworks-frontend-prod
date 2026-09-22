import React, { useState } from "react";
import { BarChart3, CalendarDays, History, Trophy } from "lucide-react";

const options = [
  ["YEAR", "Year", "year_splits"],
  ["MONTH", "Month", "month_splits"],
  ["COMPETITION", "League / Type", "competition_splits"],
  ["SEASON", "Season", "season_splits"],
];
const num = (value) => Number(value || 0);
const pct = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");

export default function PlayerStatSplits({ progress }) {
  const [tab, setTab] = useState("YEAR");
  const selected = options.find(([key]) => key === tab) || options[0];
  const rows = progress?.[selected[2]] || [];
  const career = progress?.career_totals || {};
  return <section className="space-y-3 rounded-[1.4rem] border border-white/10 bg-[#07111f] p-3.5 sm:p-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-black text-white"><History className="h-4 w-4 text-amber-300" />Back of the card</h2>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">Official finalized Game Books and approved manager-entered history.</p>
      </div>
      <div className="shrink-0 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[9px] font-black text-amber-200">CAREER {num(career.g)} G</div>
    </div>
    <div className="grid grid-cols-4 gap-1.5 border-y border-white/10 py-3 text-center">
      {[["AVG",pct(career.avg)],["OPS",pct(career.ops)],["H",num(career.h)],["HR",num(career.hr)]].map(([label,value])=>
        <div key={label}><div className="text-[8px] font-black text-slate-500">{label}</div><div className="mt-1 text-sm font-black text-white">{value}</div></div>
      )}
    </div>
    <div role="group" aria-label="Statistic breakdown" className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
      {options.map(([key,label])=><button key={key} type="button" aria-pressed={tab===key} onClick={()=>setTab(key)}
        className={`min-h-10 rounded-lg px-1 text-[9px] font-black ${tab===key?"bg-amber-300 text-slate-950":"text-slate-400 hover:bg-white/[.06]"}`}>{label}</button>)}
    </div>
    {rows.length ? <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[630px] border-collapse text-center text-[10px]">
        <thead className="bg-white/[.05] text-[9px] font-bold uppercase text-slate-400"><tr>
          {["Period", "G", "AB", "H", "AVG", "OBP", "SLG", "OPS", "2B", "3B", "HR", "RBI", "R"].map(label=>
            <th key={label} className="whitespace-nowrap px-2 py-2 text-left first:sticky first:left-0 first:bg-[#132033]">{label}</th>
          )}
        </tr></thead>
        <tbody>{rows.map((row,index)=><tr key={String(row.label)+"-"+index} className="border-t border-white/10">
          <td className="sticky left-0 min-w-[7rem] bg-[#0b1525] px-2 py-2 text-left font-bold text-white">{row.label}{row.historical?<span className="ml-1 text-[8px] text-slate-400">history</span>:null}</td>
          {[num(row.g),num(row.ab),num(row.h),pct(row.avg),pct(row.obp),pct(row.slg),pct(row.ops),num(row.double),num(row.triple),num(row.hr),num(row.rbi),num(row.runs)].map((v,j)=>
            <td key={j} className={`px-2 py-2 text-left ${j===6?"font-black text-cyan-200":"text-slate-200"}`}>{v}</td>
          )}
        </tr>)}</tbody>
      </table>
    </div> : <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-slate-500">
      <span>No {selected[1].toLowerCase()} breakdown yet. Finish games to build your card.</span>
    </div>}
    <p className="text-[9px] leading-4 text-slate-500">{tab==="MONTH"
      ? "Monthly splits include only dated official games. Undated historical stat entries are not assigned an invented month."
      : "Badges are recalculated when an official Game Book is corrected or verified moments are reversed."}</p>
  </section>;
}

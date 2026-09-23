import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, LayoutGrid, Plus, Search, Table2, Trophy } from "lucide-react";

const n = (value) => Number(value || 0);
const rate = (value) => n(value).toFixed(3).replace(/^0(?=\.)/, "");
const COLUMNS = [
  { key: "g", label: "G", type: "int" },
  { key: "pa", label: "PA", type: "int" },
  { key: "ab", label: "AB", type: "int" },
  { key: "h", label: "H", type: "int" },
  { key: "avg", label: "AVG", type: "rate" },
  { key: "obp", label: "OBP", type: "rate" },
  { key: "slg", label: "SLG", type: "rate" },
  { key: "ops", label: "OPS", type: "rate" },
  { key: "double", label: "2B", type: "int" },
  { key: "triple", label: "3B", type: "int" },
  { key: "hr", label: "HR", type: "int" },
  { key: "rbi", label: "RBI", type: "int" },
  { key: "runs", label: "R", type: "int" },
  { key: "bb", label: "BB", type: "int" },
];
const BY_KEY = Object.fromEntries(COLUMNS.map(column=>[column.key,column]));
const LEADER_KEYS = ["avg", "ops", "h", "hr", "rbi"];
const format = (key,value) => BY_KEY[key]?.type === "rate" ? rate(value) : String(n(value));
const qualified = (row, key, minAB) => BY_KEY[key]?.type !== "rate" || n(row.ab) >= Math.max(1,minAB);

export default function InteractiveStatsBoard({
  rows = [], scope = "ALL", onScope, managerView = false, onAdd, onPlayer,
  bookCoverage = null,
}) {
  const [sortKey, setSortKey] = useState("ops");
  const [direction, setDirection] = useState("desc");
  const [view, setView] = useState("grid");
  const [minAB, setMinAB] = useState(1);
  const [search, setSearch] = useState("");
  const [onlyQualified, setOnlyQualified] = useState(false);
  const cleanRows = useMemo(() => (Array.isArray(rows)?rows:[]).filter(row=>row.player && row.player.is_active!==false && !row.player.merged_into),[rows]);
  const sorted = useMemo(() => cleanRows
    .filter(row => (row.player?.display_name||"").toLowerCase().includes(search.toLowerCase()) ||
      String(row.player?.jersey_number||"").includes(search))
    .filter(row => !onlyQualified || qualified(row,sortKey,minAB))
    .sort((a,b) => {
      const qa = qualified(a,sortKey,minAB), qb = qualified(b,sortKey,minAB);
      if (qa !== qb) return qa ? -1 : 1;
      const delta = n(a[sortKey]) - n(b[sortKey]);
      return (direction==="desc" ? -delta : delta) || (a.player?.display_name||"").localeCompare(b.player?.display_name||"");
    }), [cleanRows,sortKey,direction,minAB,search,onlyQualified]);

  const leaders = LEADER_KEYS.map(key => {
    const eligible = cleanRows.filter(row=>qualified(row,key,minAB) && n(row[key])>0);
    const found = [...eligible].sort((a,b)=>n(b[key])-n(a[key])||n(b.ab)-n(a.ab))[0]||null;
    return {key,row:found};
  });

  function changeSort(key) {
    if (sortKey===key) setDirection(current=>current==="desc"?"asc":"desc");
    else {setSortKey(key);setDirection("desc");}
  }

  return <section className="rounded-[1.35rem] border border-cyan-300/15 bg-[#07111f]/95 p-3.5 sm:p-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-black text-white">Stat center · sortable roster</h2>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">MLB-style leaders and spreadsheet columns. Tap any category to sort high-to-low, then tap again to reverse.</p>
        {bookCoverage && bookCoverage.total>bookCoverage.withPlays ? <p className="mt-1 text-[10px] font-bold text-amber-200">
          Only {bookCoverage.withPlays}/{bookCoverage.total} final games have recorded play-by-play. Historical batting totals are incomplete.
        </p> : null}
      </div>
      {managerView && onAdd ? <button type="button" onClick={onAdd} className="min-h-11 shrink-0 rounded-xl bg-amber-300 px-3 text-[10px] font-black text-slate-950"><Plus className="mr-1 inline h-4 w-4"/>Add stats</button> : null}
    </div>

    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-200"><Trophy className="h-4 w-4"/>Team leaders · recorded data</div>
    <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
      {leaders.map(({key,row})=><button type="button" key={key} onClick={()=>changeSort(key)}
        className={`min-w-0 rounded-xl border p-2 text-left ${sortKey===key?"border-amber-300/40 bg-amber-300/10":"border-white/10 bg-white/[.025]"}`}>
        <span className="block text-[8px] font-black text-amber-200">{BY_KEY[key].label}</span>
        <b className="mt-1 block truncate text-[10px] text-white">{row?.player?.display_name||"Not recorded"}</b>
        <span className="mt-1 block text-lg font-black tabular-nums text-cyan-200">{row?format(key,row[key]):"—"}</span>
        {BY_KEY[key].type==="rate"?<span className="text-[8px] text-slate-500">{row?n(row.ab)+" AB":"Min "+Math.max(1,minAB)+" AB"}</span>:null}
      </button>)}
    </div>

    <div className="mt-3 flex flex-wrap gap-1.5">
      {["ALL","LEAGUE","TOURNAMENT"].map(value=><button type="button" key={value} onClick={()=>onScope?.(value)}
        className={`min-h-10 rounded-xl px-3 text-[9px] font-black ${scope===value?"bg-cyan-300 text-slate-950":"border border-white/10 text-slate-400"}`}>
        {value==="ALL"?"Combined":value.charAt(0)+value.slice(1).toLowerCase()}
      </button>)}
    </div>

    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="relative min-w-[10rem] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-slate-500"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search player or jersey"
          className="h-11 w-full rounded-xl border border-white/10 bg-[#050b14] pl-8 pr-3 text-[16px] text-white sm:text-[11px]"/>
      </label>
      <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400">MIN AB
        <select value={minAB} onChange={e=>setMinAB(Number(e.target.value))} className="h-11 rounded-xl border border-white/10 bg-[#050b14] px-2 text-[11px] text-white">
          {[1,5,10,20].map(value=><option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="flex rounded-xl border border-white/10 p-0.5">
        <button type="button" aria-label="Spreadsheet view" onClick={()=>setView("grid")} className={`grid h-10 w-10 place-items-center rounded-lg ${view==="grid"?"bg-white text-slate-950":"text-slate-400"}`}><Table2 className="h-4 w-4"/></button>
        <button type="button" aria-label="Player cards view" onClick={()=>setView("cards")} className={`grid h-10 w-10 place-items-center rounded-lg ${view==="cards"?"bg-white text-slate-950":"text-slate-400"}`}><LayoutGrid className="h-4 w-4"/></button>
      </div>
    </div>
    <label className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
      <input type="checkbox" checked={onlyQualified} onChange={e=>setOnlyQualified(e.target.checked)} className="h-4 w-4 accent-cyan-300"/>
      Hide players below qualifying AB for rate statistics
    </label>

    {view==="grid" ? <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-xl border border-white/10" role="region" aria-label="Swipe sideways to view all baseball statistics" tabIndex={0}>
      <table className="w-full min-w-[1030px] border-collapse text-right text-[10px] tabular-nums">
        <thead><tr className="border-b border-white/15 bg-[#0f1e2e]">
          <th scope="col" className="sticky left-0 z-20 min-w-36 border-r border-white/10 bg-[#0f1e2e] px-3 py-3 text-left font-black text-slate-400">PLAYER</th>
          {COLUMNS.map(col=><th key={col.key} scope="col" className="min-w-12 border-r border-white/[.04] p-0">
            <button type="button" onClick={()=>changeSort(col.key)} aria-sort={sortKey===col.key?(direction==="desc"?"descending":"ascending"):undefined}
              className={`flex min-h-11 w-full items-center justify-end gap-1 px-2 text-[9px] font-black ${sortKey===col.key?"bg-cyan-300/10 text-cyan-100":"text-slate-400"}`}>
              {col.label}{sortKey===col.key?(direction==="desc"?<ArrowDown className="h-3 w-3"/>:<ArrowUp className="h-3 w-3"/>):null}
            </button>
          </th>)}
        </tr></thead>
        <tbody>{sorted.map((row,index)=><tr key={row.player.id} className="border-b border-white/[.06] odd:bg-white/[.016] hover:bg-cyan-300/[.05]">
          <th className="sticky left-0 z-10 border-r border-white/10 bg-[#0a1827] px-2 py-2 text-left">
            {onPlayer ? <button type="button" onClick={()=>onPlayer(row)} className="flex w-full items-center gap-1 text-left">
              <span className="w-4 shrink-0 text-[9px] text-cyan-400">{index+1}</span><span className="min-w-0 truncate text-[9px] font-black text-white">#{row.player.jersey_number||"—"} {row.player.display_name}</span><ChevronRight className="h-3 w-3 shrink-0 text-cyan-300"/>
            </button> : <div className="flex items-center gap-1"><span className="w-4 shrink-0 text-[9px] text-cyan-400">{index+1}</span><span className="min-w-0 truncate text-[9px] font-black text-white">#{row.player.jersey_number||"—"} {row.player.display_name}</span></div>}
          </th>
          {COLUMNS.map(col=><td key={col.key} className={`border-r border-white/[.03] px-2 py-2 text-right ${sortKey===col.key?"bg-cyan-300/[.06] font-black text-cyan-100":col.type==="rate"&&!qualified(row,col.key,minAB)?"text-slate-600":"text-slate-300"}`}>
            {format(col.key,row[col.key])}
          </td>)}
        </tr>)}
          {!sorted.length?<tr><td colSpan={COLUMNS.length+1} className="py-8 text-center text-xs text-slate-500">No players match your filters.</td></tr>:null}
        </tbody>
      </table>
    </div> : <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {sorted.map((row,index)=><button type="button" key={row.player.id} onClick={()=>onPlayer?.(row)} className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-left">
        <div className="flex items-center justify-between gap-2"><b className="truncate text-xs text-white">#{index+1} · #{row.player.jersey_number||"—"} {row.player.display_name}</b><span className="rounded-lg bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-100">{BY_KEY[sortKey].label} {format(sortKey,row[sortKey])}</span></div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">{["g","ab","h","avg","ops","hr","rbi","runs"].map(key=><div key={key} className="rounded-lg border border-white/10 bg-black/15 p-1.5"><div className="text-[8px] font-black text-slate-500">{BY_KEY[key].label}</div><b className="text-[11px] text-white">{format(key,row[key])}</b></div>)}</div>
      </button>)}
    </div>}
    <p className="mt-2 text-[9px] text-slate-500">Rate leaders require at least {Math.max(1,minAB)} recorded AB. Blank historical games are not zero-hit performances; upload and review their original Game Books before treating season leaderboards as complete.</p>
  </section>;
}

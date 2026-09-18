import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CalendarRange, Loader2, Target, Trophy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import HitterTendencyField from "../components/sports/HitterTendencyField";
import { getPlayerCard } from "../api/sports";

const cx = (...v) => v.filter(Boolean).join(" ");
const num = (v) => Number(v || 0);
const rate = (v) => num(v).toFixed(3);
const errorText = (e) => e?.response?.data?.detail || e?.message || "Player card could not load.";

function Card({ title, body, action, children }) {
  return <section className="rounded-[1.45rem] border border-white/10 bg-[#07111f]/95 p-4">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-sm font-black text-white">{title}</h2>{body?<p className="mt-1 text-[10px] leading-4 text-slate-500">{body}</p>:null}</div>
      {action}
    </div>
    <div className="mt-3">{children}</div>
  </section>;
}

function Metric({ label, value, tone="cyan" }) {
  const tones={cyan:"border-cyan-300/15 bg-cyan-300/[.045]",green:"border-emerald-300/15 bg-emerald-300/[.045]",violet:"border-violet-300/15 bg-violet-300/[.045]",amber:"border-amber-300/15 bg-amber-300/[.045]"};
  return <div className={cx("rounded-xl border p-2.5 text-center",tones[tone])}><div className="text-[7px] font-black uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-white">{value}</div></div>;
}

function StatRow({ label, row, tone="cyan" }) {
  if(!row) return null;
  return <div className="rounded-xl border border-white/10 bg-black/15 p-3">
    <div className={cx("text-[8px] font-black uppercase tracking-wide",tone==="violet"?"text-violet-300":tone==="green"?"text-emerald-300":"text-cyan-300")}>{label}</div>
    <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      <Metric label="G" value={num(row.g)}/>
      <Metric label="AB" value={num(row.ab)}/>
      <Metric label="H" value={num(row.h)} tone="green"/>
      <Metric label="AVG" value={rate(row.avg)}/>
      <Metric label="HR" value={num(row.hr)} tone="violet"/>
      <Metric label="RBI" value={num(row.rbi)} tone="green"/>
      <Metric label="SLG" value={rate(row.slg)} tone="amber"/>
      <Metric label="OPS" value={rate(row.ops)} tone="amber"/>
    </div>
  </div>;
}

export default function SportsPlayerCard() {
  const { groupId, playerId } = useParams();
  const navigate = useNavigate();
  const [card,setCard]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let alive=true;
    setLoading(true); setError("");
    getPlayerCard(playerId)
      .then((row)=>{if(alive)setCard(row);})
      .catch((e)=>{if(alive)setError(errorText(e));})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[playerId]);

  const seasons=useMemo(()=>Array.isArray(card?.seasons)?card.seasons:[],[card?.seasons]);
  const allSeasonRows=useMemo(()=>seasons.filter((row)=>row.scope==="ALL"),[seasons]);
  const player=card?.player;
  const current=card?.current||{};
  const tendencies=card?.tendencies||{};
  const photo=card?.profile_photo_url||"";

  if(loading) return <div className="min-h-screen bg-[#02060c] text-white"><ModeBar title="Player Card" subtitle="SyncWorks Sports"/><div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300"/></div></div>;

  if(!card||!player) return <div className="min-h-screen bg-[#02060c] p-3 text-white"><ModeBar title="Player Card" subtitle="SyncWorks Sports"/><Card title="Player unavailable"><p className="text-xs text-slate-500">{error}</p><button onClick={()=>navigate("/connect/groups/"+groupId+"/sports")} className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs font-black"><ArrowLeft className="mr-1 inline h-4 w-4"/>Back to team</button></Card></div>;

  const initials=String(player.display_name||"P").split(/\s+/).slice(0,2).map((p)=>p[0]).join("").toUpperCase();

  return <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
    <ModeBar title="Player Card" subtitle={card.team?.name||"SyncWorks Sports"}/>
    <main className="mx-auto max-w-6xl space-y-3 px-3 py-3 sm:px-5">
      <button onClick={()=>navigate("/connect/groups/"+groupId+"/sports")} className="min-h-10 rounded-xl border border-white/10 px-3 text-[10px] font-black text-slate-300"><ArrowLeft className="mr-1 inline h-4 w-4"/>Team</button>

      {error?<div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[10px] text-rose-100">{error}</div>:null}

      <section className="relative overflow-hidden rounded-[1.9rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_86%_0%,rgba(34,211,238,.18),transparent_31%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.18),transparent_35%),#07111f] p-4 sm:p-5">
        <div className="absolute -right-5 top-3 text-[8rem] font-black leading-none text-white/[.025]">#{player.jersey_number||"—"}</div>
        <div className="relative flex items-start gap-4">
          {photo?<img src={photo} alt="" className="h-24 w-24 rounded-[1.35rem] border border-white/10 object-cover"/>:<div className="grid h-24 w-24 shrink-0 place-items-center rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/10 text-2xl font-black text-cyan-100">{initials}</div>}
          <div className="min-w-0 flex-1">
            <div className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">{card.team?.season_name||"Current season"} · {card.team?.league_name||"Team"}</div>
            <h1 className="mt-1 truncate text-2xl font-black text-white">{player.display_name}</h1>
            <div className="mt-1 text-xs text-slate-400">#{player.jersey_number||"—"} · {player.primary_position||"Position TBD"} · Bats {player.bats||"—"} / Throws {player.throws||"—"}</div>
            <div className="mt-1 text-[9px] text-slate-500">{[card.team?.division_name,card.team?.name].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-4 gap-1.5">
          <Metric label="AVG" value={rate(current.all?.avg)}/>
          <Metric label="HR" value={num(current.all?.hr)} tone="violet"/>
          <Metric label="RBI" value={num(current.all?.rbi)} tone="green"/>
          <Metric label="OPS" value={rate(current.all?.ops)} tone="amber"/>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-3">
          <Card title="Current season splits" body="League and tournament numbers stay separate while the combined line remains available." action={<Trophy className="h-4 w-4 text-amber-300"/>}>
            <div className="space-y-2">
              <StatRow label="All games" row={current.all}/>
              <StatRow label="League" row={current.league} tone="green"/>
              <StatRow label="Tournament" row={current.tournament} tone="violet"/>
            </div>
          </Card>

          <Card title="Back of the card" body="Season-by-season totals recorded in SyncWorks plus approved imported history." action={<CalendarRange className="h-4 w-4 text-cyan-300"/>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-center text-[9px]">
                <thead className="text-slate-500"><tr><th className="p-2 text-left">SEASON</th><th>G</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>RBI</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th></tr></thead>
                <tbody>{allSeasonRows.map((row)=><tr key={row.season+"-"+row.scope} className="border-t border-white/10"><td className="p-2 text-left font-black text-white">{row.season}</td><td>{num(row.g)}</td><td>{num(row.ab)}</td><td>{num(row.h)}</td><td>{num(row.double)}</td><td>{num(row.triple)}</td><td>{num(row.hr)}</td><td>{num(row.rbi)}</td><td>{rate(row.avg)}</td><td>{rate(row.obp)}</td><td>{rate(row.slg)}</td><td className="font-black text-cyan-200">{rate(row.ops)}</td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <HitterTendencyField tendencies={tendencies}/>
          <Card title="Plate appearance tendencies" body="Historical rates from prior tracked plate appearances." action={<Target className="h-4 w-4 text-emerald-300"/>}>
            <div className="grid grid-cols-5 gap-1.5">
              <Metric label="HIT%" value={num(tendencies.hit_pct).toFixed(0)+"%"}/>
              <Metric label="REACH%" value={num(tendencies.reach_pct).toFixed(0)+"%"} tone="green"/>
              <Metric label="XBH%" value={num(tendencies.xbh_pct).toFixed(0)+"%"} tone="violet"/>
              <Metric label="HR%" value={num(tendencies.hr_pct).toFixed(0)+"%"} tone="amber"/>
              <Metric label="OUT%" value={num(tendencies.out_pct).toFixed(0)+"%"}/>
            </div>
            <div className="mt-2 text-[8px] text-slate-600">Sample: {num(tendencies.sample_pa)} previous plate appearances · {num(tendencies.spray_sample)} charted batted balls.</div>
          </Card>
          <Card title="Recent results" body="Most recent tracked plate appearances before today." action={<BarChart3 className="h-4 w-4 text-violet-300"/>}>
            <div className="space-y-1.5">{(tendencies.recent||[]).map((row,index)=><div key={index} className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] p-2"><div className={cx("rounded-lg px-2 py-1 text-center text-[9px] font-black",["1B","2B","3B","HR"].includes(row.result)?"bg-emerald-300/10 text-emerald-100":row.result==="BB"?"bg-violet-300/10 text-violet-100":"bg-white/[.05] text-slate-300")}>{row.result}</div><div className="min-w-0"><b className="block truncate text-[10px] text-white">vs {row.opponent}</b><span className="text-[8px] text-slate-500">{new Date(row.date).toLocaleDateString()} · {row.game_type}</span></div><div className="text-right text-[8px] text-slate-500">{num(row.rbi)} RBI<br/>{num(row.runs)} R</div></div>)}{!(tendencies.recent||[]).length?<div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">No prior tracked plate appearances yet.</div>:null}</div>
          </Card>
        </div>
      </div>
    </main>
  </div>;
}

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, BookOpen, CalendarDays, ChevronRight, ClipboardList, Users } from "lucide-react";

const num = (v) => Number(v || 0);
const EH = new Set(["EH", "EH1", "EH2", "DH"]);
function dayKey(game) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: game?.timezone || "America/Chicago", year: "numeric",
    month: "2-digit", day: "2-digit",
  }).format(new Date(game.start_at));
}
function gameTime(game) {
  return new Date(game.start_at).toLocaleTimeString("en-US", {
    timeZone: game.timezone || "America/Chicago", hour: "numeric", minute: "2-digit",
  });
}

export default function GameDayLineupPreview({
  games = [], players = [], badgeRings = {}, managerView = false,
  onEditLineup, onOpenGame, onCopyLineup,
}) {
  const dayGames = useMemo(() => {
    const upcoming = games.filter(g => ["SCHEDULED", "LIVE"].includes(g.status)
      && new Date(g.start_at).getTime() > Date.now() - 6 * 60 * 60 * 1000
    ).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
    if (!upcoming.length) return [];
    const firstDay = dayKey(upcoming[0]);
    return upcoming.filter(g=>dayKey(g)===firstDay);
  }, [games]);
  const [gameId, setGameId] = useState(null);
  useEffect(() => { if (dayGames.length && !dayGames.some(g => num(g.id) === num(gameId))) setGameId(dayGames[0].id); }, [dayGames, gameId]);
  const active = dayGames.find(g=>num(g.id)===num(gameId)) || dayGames[0];
  const batting = [...(active?.lineup_spots || [])].sort((a,b)=>num(a.batting_order)-num(b.batting_order));
  const byId = new Map(players.map(p=>[num(p.id),p]));
  const bench = (active?.bench_players || []).filter(p=>p.is_active!==false);
  const firstWithLineup = dayGames.find(g=>num(g.id)!==num(active?.id) && (g.lineup_spots||[]).length);
  const normal = batting.filter(s=>!EH.has(String(s.defensive_position||"").toUpperCase()));
  const extra = batting.filter(s=>EH.has(String(s.defensive_position||"").toUpperCase()));

  if (!active) return <section className="rounded-2xl border border-white/10 bg-[#091321] p-4 text-[11px] text-slate-400">No upcoming lineup is published yet.</section>;
  return <section className="rounded-[1.4rem] border border-cyan-300/20 bg-[#071321] p-3.5 text-slate-100">
    <div className="flex items-center justify-between gap-2">
      <div><div className="text-[9px] font-black uppercase tracking-wider text-cyan-300"><ClipboardList className="mr-1 inline h-4 w-4"/>Game-day lineups</div>
        <h3 className="mt-1 text-base font-black text-white">Starting lineup & bench</h3>
        <p className="mt-1 text-[9px] text-slate-400">Switch between every game on the same day. Unpublished lineups stay separate.</p>
      </div>
      <CalendarDays className="h-6 w-6 shrink-0 text-cyan-300"/>
    </div>
    <div className="mt-3 grid gap-1.5" style={{gridTemplateColumns:`repeat(${Math.min(3,dayGames.length)},minmax(0,1fr))`}}>
      {dayGames.map((g,index)=><button key={g.id} type="button" onClick={()=>setGameId(g.id)}
        className={`min-h-16 min-w-0 rounded-xl border px-2 py-1.5 text-left ${num(active.id)===num(g.id)?"border-cyan-300/40 bg-cyan-300/10":"border-white/10 bg-black/15"}`}>
        <span className="block text-[8px] font-black text-cyan-200">GAME {index+1} · {g.home_away==="AWAY"?"VISITOR":g.home_away}</span>
        <span className="mt-0.5 block truncate text-[10px] font-black text-white">{gameTime(g)} · {g.opponent_name}</span>
        <span className="block truncate text-[8px] text-slate-400">{g.venue_name || "Field TBD"}</span>
      </button>)}
    </div>

    {batting.length ? <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-black text-white">{batting.length} batters · {normal.length} field · {extra.length} EH/DH</span>
        <button type="button" onClick={()=>onOpenGame?.(active)} className="min-h-9 rounded-lg border border-white/10 px-3 text-[9px] font-black text-cyan-200"><BookOpen className="mr-1 inline h-3.5 w-3.5"/>Game Book</button>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {batting.map(spot => {
          const p = spot.player_detail || byId.get(num(spot.player)) || {};
          const ring = badgeRings[spot.player];
          return <div key={spot.id || spot.player} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_3rem] items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-2 py-2">
            <span className="text-center text-sm font-black text-cyan-200">{spot.batting_order}</span>
            <span className="min-w-0 truncate text-[10px] font-bold text-white" style={ring?.highest_tier && ring.highest_tier!=="LOCKED"?{textShadow:`0 0 12px ${ring.ring_color}`}:{}}>#{p.jersey_number||"—"} {p.display_name||"Player"}</span>
            <span className={`rounded-lg border px-1 py-1 text-center text-[8px] font-black ${EH.has(String(spot.defensive_position||"").toUpperCase())?"border-amber-300/20 text-amber-200":"border-cyan-300/15 text-cyan-200"}`}>{spot.defensive_position||"EH"}</span>
          </div>;
        })}
      </div>
      {bench.length ? <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-2">
        <div className="text-[9px] font-black uppercase text-amber-200"><Users className="mr-1 inline h-3.5 w-3.5"/>Bench · {bench.length}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">{bench.map(p=><span key={p.id} className="rounded-lg border border-white/10 px-2 py-1 text-[9px] text-slate-300">#{p.jersey_number||"—"} {p.display_name}</span>)}</div>
      </div> : null}
    </div> : <div className="mt-3 rounded-xl border border-dashed border-amber-300/30 bg-amber-300/[.04] p-3">
      <b className="text-xs text-amber-100">Lineup not published for this game</b>
      <p className="mt-1 text-[10px] text-slate-400">The previous game’s batting order is not automatically reused. Confirm attendance and positions for this game.</p>
      {managerView && firstWithLineup ? <button type="button" onClick={()=>onCopyLineup?.(firstWithLineup,active)} className="mt-2 min-h-11 w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-[10px] font-black text-cyan-100">
        <ArrowRightLeft className="mr-1 inline h-4 w-4"/>Copy {firstWithLineup.opponent_name} lineup to this game
      </button>:null}
    </div>}
    {managerView ? <button type="button" onClick={()=>onEditLineup?.(active)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-1 rounded-xl bg-cyan-300 px-3 text-[10px] font-black text-slate-950">Edit this game’s lineup <ChevronRight className="h-4 w-4"/></button>:null}
  </section>;
}

import React from "react";
import { CalendarDays, Check, MapPin } from "lucide-react";

const cx=(...v)=>v.filter(Boolean).join(" ");

function gameDateKey(game){
  const date=new Date(game.start_at);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}

export function firstUpcomingGameDay(games=[]){
  const sorted=[...(Array.isArray(games)?games:[])].filter((g)=>g?.start_at).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
  if(!sorted.length)return [];
  const key=gameDateKey(sorted[0]);
  return sorted.filter((game)=>gameDateKey(game)===key);
}

export default function UpcomingGameDayCard({games=[],responses={},onRespond,onOpen,title="Next game day"}){
  if(!games.length)return null;
  const first=games[0];
  return <section className="rounded-[1.35rem] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,.09),transparent_40%),#07111f] p-3.5">
    <div className="flex items-start justify-between gap-2">
      <div><div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="h-4 w-4 text-emerald-300"/>{title}</div><p className="mt-1 text-[10px] text-slate-500">{new Date(first.start_at).toLocaleDateString([], {weekday:"long",month:"long",day:"numeric"})} · {games.length} game{games.length===1?"":"s"}</p></div>
      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[8px] font-black text-emerald-100">GAME DAY</span>
    </div>
    <div className="mt-3 space-y-2">
      {games.map((game,index)=>{
        const response=responses?.[String(game.id)]||responses?.[game.id]||"PENDING";
        return <article key={game.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <button type="button" onClick={()=>onOpen?.(game)} className="w-full text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-wide text-emerald-300">Game {index+1} · {game.home_away||"TBD"}</div><b className="mt-0.5 block truncate text-sm text-white">{game.home_away==="AWAY"?"at":"vs"} {game.opponent_name}</b><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400"><span>{new Date(game.start_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3"/>{game.venue_name||"Field TBD"}</span></div></div>
              <span className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[8px] font-black text-slate-300">{game.status}</span>
            </div>
          </button>
          {onRespond?<div className="mt-2 grid grid-cols-3 gap-1.5">{[["YES","IN"],["MAYBE","SUB"],["NO","OUT"]].map(([value,label])=><button key={value} type="button" onClick={()=>onRespond(game,value)} className={cx("min-h-10 rounded-lg border text-[9px] font-black",response===value?(value==="YES"?"border-emerald-300/40 bg-emerald-300/15 text-emerald-100":value==="MAYBE"?"border-amber-300/40 bg-amber-300/15 text-amber-100":"border-rose-300/40 bg-rose-300/15 text-rose-100"):"border-white/10 text-slate-500")}>{response===value?<Check className="mr-1 inline h-3 w-3"/>:null}{label}</button>)}</div>:null}
        </article>;
      })}
    </div>
  </section>;
}

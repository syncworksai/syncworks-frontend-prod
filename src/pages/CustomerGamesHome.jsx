import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,ArrowRight,Club,Plus,Users,Trophy,WalletCards} from "lucide-react";
import {getGroups} from "../api/social";
import {CARD_CONSOLE_GAMES,CARD_GAME_CATEGORIES} from "../games/cardConsoleCatalog.mjs";

export default function CustomerGamesHome(){
 const nav=useNavigate(),[params]=useSearchParams();
 const [groups,setGroups]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const [selected,setSelected]=useState(params.get("group")||"");
 useEffect(()=>{let active=true;getGroups().then(rows=>{if(active){setGroups(rows);if(!selected&&rows.length===1)setSelected(String(rows[0].id));}}).catch(e=>{if(active)setError(e.message||"Unable to load leagues");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const group=groups.find(g=>String(g.id)===selected);
 return <main className="min-h-dvh bg-[#020817] px-4 pb-24 pt-[max(1.25rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-4xl">
  <header className="mb-5 flex items-center justify-between gap-3"><button onClick={()=>nav("/customer")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs"><ArrowLeft size={17}/> Customer</button><span className="text-[10px] font-black tracking-[.2em] text-cyan-300">SYNCWORKS GAMES</span></header>
  <section className="overflow-hidden rounded-[1.8rem] border border-cyan-300/20 bg-gradient-to-br from-[#14243b] via-[#061426] to-[#080b20] p-5 shadow-xl">
   <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Your league. Your table.</div>
   <h1 className="mt-2 text-3xl font-black">Card Console</h1><p className="mt-2 max-w-xl text-xs leading-5 text-slate-300">One club, multiple tables and many kinds of card night. Practice modes are available now; secure cross-phone multiplayer and additional game engines are under development.</p>
   <button type="button" onClick={()=>nav("/customer/games/new")} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-black text-slate-950">＋ New Game · Create room</button>
   <div className="mt-4 flex gap-2 text-xs"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Five poker variants in practice/prototype</span><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Club scorekeeping</span></div>
  </section>
  <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_.9fr]">
   <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="flex items-center gap-2 text-lg font-black"><Club className="text-cyan-300"/> Choose your league</h2>
    <p className="mt-1 text-xs text-slate-400">Up to 100+ members can belong to a league; individual tables have limited seats.</p>
    {error&&<p className="mt-3 text-sm text-rose-300">{error}</p>}
    {loading?<p className="mt-4 text-xs">Loading your groups…</p>:<div className="mt-3 max-h-72 space-y-2 overflow-auto">
     {groups.map(g=><button type="button" onClick={()=>setSelected(String(g.id))} key={g.id} className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-3 text-left ${selected===String(g.id)?"border-cyan-300/60 bg-cyan-300/10":"border-white/10 bg-white/[.02]"}`}><span><b className="block text-sm">{g.name}</b><span className="text-[10px] text-slate-400">{g.kind||"Group"} · {g.member_count||0} members</span></span><ArrowRight size={17}/></button>)}
     {!groups.length&&<p className="p-3 text-xs text-slate-400">No leagues yet. Create one to start.</p>}
    </div>}
    <button onClick={()=>nav("/customer/games/clubs")} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-400/10 text-sm font-black text-violet-200"><Plus size={17}/> Create league or join by code</button>
   </section>
   <section className="flex flex-col rounded-2xl border border-emerald-400/20 bg-emerald-500/[.04] p-4"><h2 className="text-lg font-black">{group?group.name:"Your league hub"}</h2><p className="mt-2 text-xs leading-5 text-slate-300">{group?"View players, purse and leaderboard, then open a room or create a table.":"Select a group to see its lobby and standings."}</p>
     <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/10 p-3"><Trophy className="mb-2 h-5 w-5 text-amber-300"/><div className="text-xs font-bold">All-time leaders</div><div className="mt-1 text-[10px] text-slate-400">Money in / out</div></div><div className="rounded-xl border border-white/10 p-3"><Users className="mb-2 h-5 w-5 text-cyan-300"/><div className="text-xs font-bold">Waiting rooms</div><div className="mt-1 text-[10px] text-slate-400">4–6 seat tables</div></div></div>
     <div className="mt-auto space-y-2 pt-5"><button disabled={!group} onClick={()=>nav(`/customer/games/clubs?group=${group.id}`)} className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-slate-950 disabled:opacity-40">Enter league dashboard</button><button disabled={!group} onClick={()=>nav(`/customer/games/new?group=${group.id}`)} className="min-h-12 w-full rounded-xl border border-cyan-300/30 font-bold text-cyan-200 disabled:opacity-40">Create new poker room</button></div>
   </section>
  </div>
  <section className="mt-5 rounded-2xl border border-cyan-300/20 bg-white/[.025] p-4" aria-labelledby="sw-console-library-heading">
   <h2 id="sw-console-library-heading" className="text-lg font-black">Card Game Library</h2>
   <p className="mt-1 text-xs leading-5 text-slate-300">Browse by how you want to play. Games marked Planned are concepts, not playable yet. Clubs and tables will be shared across future game engines.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-2">{CARD_GAME_CATEGORIES.map(category=><article key={category.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3"><h3 className="text-sm font-black text-cyan-100">{category.label}</h3><p className="mt-1 text-[11px] text-slate-400">{category.description}</p><ul className="mt-3 space-y-2">{CARD_CONSOLE_GAMES.filter(game=>game.category===category.id).map(game=><li key={game.id} className="flex items-center justify-between gap-3 text-xs"><span>{game.name}</span><span className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-[10px] text-slate-300">{game.status==="practice"?"Practice":game.status==="prototype"?"Prototype":"Planned"}</span></li>)}</ul></article>)}</div>
  </section>
  <p className="mt-4 text-center text-[11px] leading-5 text-amber-200">Game rooms and virtual tallies are currently a local beta preview. Other devices cannot join the same live game yet. SyncWorks holds no game funds.</p>
 </div></main>;
}

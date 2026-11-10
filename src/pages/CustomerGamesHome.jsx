import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,ArrowRight,Club,Plus,Users,Trophy,WalletCards,Spade,Gamepad2,Play,Layers,ShieldCheck,Clock3,BarChart3} from "lucide-react";
import {getGroups} from "../api/social";
import {CARD_CONSOLE_GAMES,CARD_GAME_CATEGORIES} from "../games/cardConsoleCatalog.mjs";
import {useAuth} from "../auth/AuthContext";
import {listPracticeGames} from "../games/cardPracticeResume.mjs";
import "./CardConsoleTheme.css";

export default function CustomerGamesHome(){
 const nav=useNavigate(),[params]=useSearchParams();
 const {user}=useAuth();
 const [groups,setGroups]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const [selected,setSelected]=useState(params.get("group")||"");
 useEffect(()=>{let active=true;getGroups().then(rows=>{if(active){setGroups(rows);if(!selected&&rows.length===1)setSelected(String(rows[0].id));}}).catch(e=>{if(active)setError(e.message||"Unable to load leagues");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const group=groups.find(g=>String(g.id)===selected);
 const resumed=useMemo(()=>listPracticeGames(user?.id,selected),[user?.id,selected]);
 const quickActions=[{name:"Tables",icon:Layers,to:group?`/customer/games/clubs?group=${group.id}`:"/customer/games/clubs"},{name:"Clubs",icon:Users,to:"/customer/games/clubs"},{name:"Practice",icon:Gamepad2,to:group?`/customer/games/table?group=${group.id}`:"/customer/games/table"},{name:"Stats",icon:Trophy,to:group?`/customer/games/clubs?group=${group.id}`:"/customer/games/clubs"}];
 return <main className="sw-console-lobby min-h-dvh px-4 pb-24 pt-[max(1.25rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-6xl">
  <header className="mb-5 flex items-center justify-between gap-3"><button onClick={()=>nav("/customer")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs"><ArrowLeft size={17}/> Customer</button><span className="text-[10px] font-black tracking-[.2em] text-cyan-300">SYNCWORKS GAMES</span></header>
  <section className="sw-console-hero" aria-label="Card Console casino lounge">
   <div className="sw-console-hero-glow" aria-hidden="true"/>
   <div className="sw-console-hero-header">
    <div><div className="sw-console-eyebrow">YOUR CLUB · YOUR TABLE · YOUR CARD NIGHT</div><h1>SYNCWORKS <span>CARD CONSOLE</span></h1><p>Play together, from wherever you are. Join a club, practice your favorite card games, and keep your nights connected.</p></div>
    <span className="sw-console-free"><ShieldCheck size={15}/> FREE BETA</span>
   </div>
   <div className="sw-console-stage">
    <div className="sw-console-stage-lamps" aria-hidden="true"><i/><i/><i/></div>
    <div className="sw-console-stage-table" aria-hidden="true"><div className="sw-console-stage-inset"><span className="sw-console-stage-monogram">S</span><span className="sw-console-stage-wordmark">SYNCWORKS<br/>POKER</span></div></div>
    <div className="sw-console-stage-chips" aria-hidden="true"><i/><i/><i/></div>
   </div>
   <div className="sw-console-hero-actions">
    <button type="button" onClick={()=>nav(group?"/customer/games/clubs?group="+group.id:"/customer/games/clubs")} className="sw-console-hero-button play"><Spade size={22}/><span><strong>Enter Card Club</strong><small>Lobby, friends & tables</small></span><ArrowRight size={19}/></button>
    <button type="button" onClick={()=>nav(resumed[0]?.path||(group?"/customer/games/clubs?group="+group.id:"/customer/games/clubs"))} className="sw-console-hero-button resume"><Play size={22}/><span><strong>{resumed.length?"Resume Game":"Your Game Lobby"}</strong><small>{resumed.length?"Pick up your saved hand":"Find your table"}</small></span><ArrowRight size={19}/></button>
   </div>
  </section>
  <nav className="sw-console-shortcuts" aria-label="Card Console shortcuts">{quickActions.map(action=><button type="button" key={action.name} onClick={()=>nav(action.to)}><action.icon size={19}/><span>{action.name}</span></button>)}</nav>
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
  <section className="sw-console-library mt-5 rounded-2xl border border-cyan-300/20 bg-white/[.025] p-4" aria-labelledby="sw-console-library-heading">
   <h2 id="sw-console-library-heading" className="text-lg font-black">♠ Choose Your Game</h2>
   <p className="mt-1 text-xs leading-5 text-slate-300">Browse by how you want to play. Games marked Planned are concepts, not playable yet. Clubs and tables will be shared across future game engines.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-2">{CARD_GAME_CATEGORIES.map(category=><article key={category.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3"><h3 className="text-sm font-black text-cyan-100">{category.label}</h3><p className="mt-1 text-[11px] text-slate-400">{category.description}</p><ul className="mt-3 space-y-2">{CARD_CONSOLE_GAMES.filter(game=>game.category===category.id).map(game=><li key={game.id} className="flex items-center justify-between gap-3 text-xs"><span>{game.name}</span><span className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-[10px] text-slate-300">{game.status==="practice"?"Practice":game.status==="prototype"?"Prototype":"Planned"}</span></li>)}</ul></article>)}</div>
  </section>
  <p className="mt-4 text-center text-[11px] leading-5 text-amber-200">Game rooms and virtual tallies are currently a local beta preview. Other devices cannot join the same live game yet. SyncWorks holds no game funds.</p>
 </div></main>;
}

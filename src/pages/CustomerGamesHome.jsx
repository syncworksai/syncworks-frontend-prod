import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,ArrowRight,Club,Plus,Users,Trophy,WalletCards} from "lucide-react";
import {getGroups} from "../api/social";

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
   <h1 className="mt-2 text-3xl font-black">Poker Night</h1><p className="mt-2 max-w-xl text-xs leading-5 text-slate-300">Create a league, invite friends, check lifetime standings and join its poker lobby. Games are selected inside the room—not before it.</p>
   <div className="mt-4 flex gap-2 text-xs"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">5 card games</span><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Manual Poker</span></div>
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
     <div className="mt-auto space-y-2 pt-5"><button disabled={!group} onClick={()=>nav(`/customer/games/clubs?group=${group.id}`)} className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-slate-950 disabled:opacity-40">Enter league dashboard</button><button disabled={!group} onClick={()=>nav(`/customer/games/clubs/room?group=${group.id}`)} className="min-h-12 w-full rounded-xl border border-cyan-300/30 font-bold text-cyan-200 disabled:opacity-40">Open poker lobby</button></div>
   </section>
  </div>
  <p className="mt-4 text-center text-[11px] leading-5 text-amber-200">Game rooms and virtual tallies are currently a local beta preview. Other devices cannot join the same live game yet. SyncWorks holds no game funds.</p>
 </div></main>;
}

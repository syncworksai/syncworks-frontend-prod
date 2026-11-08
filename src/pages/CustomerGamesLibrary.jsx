import React from "react";
import { ArrowLeft, ArrowRight, Bot, Club, Crown, Spade, Users, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";

const accents = { cyan: "border-cyan-300/20 bg-cyan-500/10 text-cyan-200", emerald: "border-emerald-300/20 bg-emerald-500/10 text-emerald-200", violet: "border-violet-300/20 bg-violet-500/10 text-violet-200" };
const tiles = [
  { title: "3-5-7 DROP", subtitle: "3s → 5s → 7s wild", note: "Hold or drop, drag-and-replace pot, cumulative lone holds", icon: Spade, path: "/customer/games/357", status: "Playable local beta", accent: "cyan" },
  { title: "4/4/Deuce", subtitle: "2s wild · 4s conditional", note: "Guts declarations, re-ante and capped match-the-pot preview", icon: Spade, path: "/customer/games/442", status: "Rules sandbox", accent: "cyan" },
  { title: "FYB", subtitle: "Low card loses", note: "Pass left, Kings block trades, three chips to start", icon: Club, path: "/customer/games/fyb", status: "Playable local beta", accent: "emerald" },
  { title: "Queen & the Follower", subtitle: "Dynamic wild cards", note: "Queens stay wild; each face-up Queen activates the following rank", icon: Crown, path: "/customer/games/queen-follower", status: "Dealing simulator", accent: "violet" },
];
export default function CustomerGamesLibrary() {
  const nav = useNavigate();
  return <main className="min-h-dvh bg-[#020817] px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <button type="button" onClick={()=>nav("/customer")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-bold text-slate-200"><ArrowLeft size={17}/> Customer</button>
        <div className="text-right"><div className="text-[10px] font-black tracking-[.22em] text-cyan-300">SYNCWORKS</div><h1 className="text-3xl font-black">Games</h1></div>
      </header>
      <section className="mb-5 rounded-[1.5rem] border border-cyan-300/20 bg-gradient-to-br from-[#10243b] to-[#041022] p-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-200"><Users size={15}/> Game night, your way</div>
        <h2 className="text-2xl font-black">Pick a table. Play together.</h2>
        <p className="mt-2 text-xs leading-5 text-slate-300">Play on one phone or against the computer, explore new card games, and preview your club's running tally. Live online rooms and synced group balances are being developed.</p>
        <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold text-cyan-200">4 games</span><span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-200">Solo + pass & play</span><span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold text-amber-200">Virtual tallies only</span></div>
      </section>
      <h2 className="mb-3 text-base font-black">Card games</h2>
      <div className="grid gap-3 sm:grid-cols-2">{tiles.map(({title,subtitle,note,icon:Icon,path,status,accent})=><button key={path} type="button" onClick={()=>nav(path)} className="group flex min-h-44 flex-col justify-between rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-cyan-400">
        <div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl border ${accents[accent]}`}><Icon size={24}/></span><ArrowRight size={18} className="text-slate-500 group-hover:text-cyan-200"/></div>
        <div><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-1 text-xs font-semibold text-cyan-200">{subtitle}</p><p className="mt-1 text-xs leading-5 text-slate-400">{note}</p><div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-amber-200">{status}</div></div>
      </button>)}</div>
      <button type="button" onClick={()=>nav("/customer/games/clubs")} className="mt-4 flex min-h-20 w-full items-center gap-3 rounded-2xl border border-violet-400/25 bg-violet-500/[.08] p-4 text-left"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-400/15 text-violet-200"><WalletCards size={24}/></span><span className="flex-1"><span className="block text-sm font-black">Card Clubs & running tally</span><span className="mt-1 block text-xs text-slate-400">Device-only ledger preview · club invites and synchronization not yet connected</span></span><ArrowRight size={18} className="text-violet-200"/></button>
      <div className="mt-5 rounded-xl border border-white/10 p-3 text-xs leading-5 text-slate-400"><Bot size={14} className="mr-2 inline text-cyan-300"/>These are four development-stage game screens, not a hosted multiplayer service. SyncWorks does not hold or transfer game money.</div>
    </div>
  </main>;
}

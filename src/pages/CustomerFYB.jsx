import React, {useState} from "react";
import {ArrowLeft, RotateCcw, Shield, Users} from "lucide-react";
import {useNavigate} from "react-router-dom";
const suits=["♠","♥","♦","♣"];
const name=(n)=>({1:"A",11:"J",12:"Q",13:"K"}[n]||String(n));
function shuffled(){const a=suits.flatMap(suit=>Array.from({length:13},(_,i)=>({rank:i+1,suit})));for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export default function CustomerFYB(){
 const nav=useNavigate();
 const [names,setNames]=useState(["Player 1","Player 2","Dealer"]);
 const [chip,setChip]=useState("0.25");
 const [dealerMode,setDealerMode]=useState("last");
 const [dealer,setDealer]=useState(2);
 const [deck,setDeck]=useState([]);
 const [cards,setCards]=useState([]);
 const [turn,setTurn]=useState(0);
 const [phase,setPhase]=useState("setup");
 const [log,setLog]=useState([]);
 const [scores,setScores]=useState([]);
 const [view,setView]=useState(null);
 const value=Math.round(Number(chip)*100);
 const players=names.length;
 const order=Array.from({length:players},(_,i)=>(dealer+1+i)%players);
 const cardText=(card)=>card?name(card.rank)+card.suit:"?";
 function start(){
  const fresh=shuffled();
  const dealerIndex=dealerMode==="random"?Math.floor(Math.random()*players):dealerMode==="first"?0:players-1;
  setDealer(dealerIndex);setCards(fresh.slice(0,players));setDeck(fresh.slice(players));setScores(names.map(()=>0));setTurn(0);setLog(["Every player begins with 3 virtual chips. The dealer acts last."]);setPhase("playing");setView(null);
 }
 const actualOrder=Array.from({length:players},(_,i)=>(dealer+1+i)%players);
 function action(pass){
  if(phase!=="playing")return;
  const actor=actualOrder[turn];const next=(turn+1)%players;
  const current=cards[actor];const updated=[...cards];const notes=[...log];
  if(pass){
   if(actor===dealer){
     if(deck.length){updated[actor]=deck[0];setDeck(deck.slice(1));notes.push(names[actor]+" (dealer) drew a new card.");}
   }else{
     const neighbor=actualOrder[turn+1];
     if(updated[neighbor].rank===13) notes.push(names[actor]+" tried to pass; "+names[neighbor]+" has a King and blocks the swap.");
     else{updated[actor]=updated[neighbor];updated[neighbor]=current;notes.push(names[actor]+" swapped with "+names[neighbor]+".");}
   }
  }else notes.push(names[actor]+" held.");
  setCards(updated);setLog(notes);setView(null);
  if(turn+1>=players){
   const lowest=Math.min(...updated.map(c=>c.rank));
   const losers=updated.map((c,i)=>c.rank===lowest?i:-1).filter(i=>i>=0);
   setScores(old=>old.map((s,i)=>s+(losers.includes(i)?-value:0)));
   setLog([...notes,"Lowest rank "+name(lowest)+": "+losers.map(i=>names[i]).join(", ")+" each owes "+(value/100).toFixed(2)+" (virtual tally)."]);
   setPhase("result");
  } else setTurn(turn+1);
 }
 function again(){const fresh=shuffled();setCards(fresh.slice(0,players));setDeck(fresh.slice(players));setTurn(0);setLog([]);setPhase("playing");setView(null);}
 function reset(){setPhase("setup");setScores([]);}
 return <main className="min-h-dvh bg-[#020817] px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-3xl">
  <header className="mb-5 flex items-center justify-between gap-3"><button type="button" onClick={()=>nav("/customer/games")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm"><ArrowLeft size={17}/> Games</button><div className="text-right"><div className="text-[10px] font-black tracking-widest text-emerald-300">CARD GAMES</div><h1 className="text-2xl font-black">FYB</h1></div></header>
  <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.07] p-4"><h2 className="font-black">Keep the high card. Don't be the lowest.</h2><p className="mt-2 text-xs leading-5 text-slate-300">Aces low, Kings high. Each player starts with three virtual chips. The dealer acts last and may draw from the deck instead of swapping. Kings block swaps. Lowest card(s) lose one chip.</p><p className="mt-2 text-[11px] text-amber-200">Pass-and-play rules prototype. This currently tracks virtual losses without a payout pool or synchronized club ledger.</p></div>
  {phase==="setup"?<section className="space-y-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="flex items-center gap-2 font-black"><Users size={19}/> Table settings</h2><div className="space-y-2">{names.map((n,i)=><input key={i} aria-label={`Player ${i+1}`} maxLength={24} value={n} onChange={e=>setNames(a=>a.map((v,j)=>j===i?e.target.value:v))} className="w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/>)}</div><div className="flex gap-2"><button type="button" disabled={players<=2} onClick={()=>setNames(names.slice(0,-1))} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40">Remove</button><button type="button" disabled={players>=8} onClick={()=>setNames([...names,`Player ${players+1}`])} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40">Add</button></div><label className="block text-xs text-slate-400">Chip denomination ($)</label><div className="grid grid-cols-3 gap-2">{["0.25","0.50","1.00"].map(n=><button type="button" key={n} onClick={()=>setChip(n)} className={`rounded-xl border p-3 font-black ${chip===n?"border-emerald-300 bg-emerald-500/20":"border-white/15"}`}>${n}</button>)}</div><input type="number" min="0.01" max="100" step="0.01" value={chip} onChange={e=>setChip(e.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"/><label className="block text-xs text-slate-400">Dealer selection</label><select value={dealerMode} onChange={e=>setDealerMode(e.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"><option value="last">Last player</option><option value="first">First player</option><option value="random">Random</option></select><button type="button" disabled={!Number.isInteger(value)||value<=0} onClick={start} className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-black disabled:opacity-40">Deal one card each</button></section>:<>
  <div className="mb-4 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="text-xs font-black text-emerald-200">Dealer: {names[dealer]}</div><div className="mt-1 text-[11px] text-slate-400">Virtual chips: 3 each to start · ${(value/100).toFixed(2)} per loss</div></div>
  <div className="grid gap-2 sm:grid-cols-3">{names.map((n,i)=><div key={i} className={`rounded-xl border p-3 ${phase==="playing"&&actualOrder[turn]===i?"border-emerald-300/50 bg-emerald-500/10":"border-white/10 bg-white/[.03]"}`}><div className="flex justify-between gap-2 text-sm font-bold"><span>{n}</span><span className="text-[10px] text-slate-400">{i===dealer?"DEALER":""}</span></div><div className="my-3 text-center text-3xl font-black">{phase==="result"||view===i?cardText(cards[i]):"🂠"}</div><div className="text-xs text-slate-400">Net: {scores[i] < 0?"−":"+"}${(Math.abs(scores[i])/100).toFixed(2)}</div></div>)}</div>
  {phase==="playing"?<div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/[.06] p-4"><h2 className="font-black">{names[actualOrder[turn]]}'s turn</h2><p className="mt-2 text-xs text-slate-400">Pass the phone privately. View only your card, then decide.</p><button type="button" className="mt-3 min-h-11 w-full rounded-xl border border-white/20 bg-white/5 text-sm font-black" onClick={()=>setView(view===actualOrder[turn]?null:actualOrder[turn])}>{view===actualOrder[turn]?"Hide card":"View my card"}</button><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>action(false)} className="min-h-12 rounded-xl bg-cyan-500 font-black text-black">HOLD</button><button type="button" onClick={()=>action(true)} className="min-h-12 rounded-xl bg-amber-400 font-black text-black">{actualOrder[turn]===dealer?"DRAW TOP":"PASS LEFT"}</button></div></div>:<div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4"><h2 className="font-black">Showdown</h2><p className="mt-2 text-xs">Lowest card loses a virtual chip. If multiple players tie for lowest, each loses one.</p><div className="mt-3 flex gap-2"><button type="button" onClick={again} className="min-h-11 flex-1 rounded-xl bg-emerald-400 font-black text-black">Next hand</button><button type="button" onClick={reset} className="rounded-xl border border-white/20 px-4 text-sm">Settings</button></div></div>}
  <section className="mt-4 rounded-xl border border-white/10 p-3"><h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Hand activity</h2>{log.slice(-8).map((line,i)=><p key={i} className="py-1 text-xs text-slate-300">{line}</p>)}</section>
  </>}
 </div></main>;
}

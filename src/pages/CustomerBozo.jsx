import React,{useState} from "react";
import {ArrowLeft,RotateCcw,Skull,Trophy,Users} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {LABEL,makeShuffledDeck,resolveBozoRound,evaluateBozoHand} from "../games/bozoRules.mjs";

const usd=(cents)=>"$"+(Math.abs(cents)/100).toFixed(2);
const moneyInput=(value)=>Math.round(Number(value)*100);
const CARD_RED=new Set(["♦","♥"]);
function Card({card,faceDown=false,wild=false}){
 return <div className={`relative flex h-20 w-14 shrink-0 flex-col justify-between rounded-lg border p-1.5 shadow-md ${faceDown?"border-cyan-300/40 bg-slate-900 text-cyan-300":wild?"border-amber-400 bg-amber-50 text-black":"border-white bg-white text-black"}`}>
 <span className="text-sm font-black">{faceDown?"SW":LABEL(card.rank)}</span><span className={`text-center text-2xl ${!faceDown&&CARD_RED.has(card.suit)?"text-red-600":""}`}>{faceDown?"♠":card.suit}</span>{wild&&!faceDown&&<span className="absolute -top-2 -right-1 rounded-full bg-amber-400 px-1 text-[8px] font-black text-black">WILD</span>}</div>;
}
export default function CustomerBozo(){
 const nav=useNavigate();
 const [names,setNames]=useState(["Player 1","Player 2","Player 3"]);
 const [handSize,setHandSize]=useState(5);
 const [ante,setAnte]=useState("0.25"),[cap,setCap]=useState("50");
 const [phase,setPhase]=useState("setup"),[hands,setHands]=useState([]),[clown,setClown]=useState([]);
 const [choices,setChoices]=useState([]),[peek,setPeek]=useState(null),[round,setRound]=useState(0),[pot,setPot]=useState(0);
 const [outcome,setOutcome]=useState(null),[history,setHistory]=useState([]),[net,setNet]=useState([]);
 const [error,setError]=useState("");
 const wildRank=clown[0]?.rank;
 const anteCents=moneyInput(ante),capCents=moneyInput(cap);
 const maxPlayers=Math.floor(52/handSize)-1;
 function distribute(oldPot=0,oldNet=[],oldHistory=[]){
   const deck=makeShuffledDeck();
   const dealt=names.map((_,i)=>deck.slice(i*handSize,(i+1)*handSize));
   const ghost=deck.slice(names.length*handSize,(names.length+1)*handSize);
   const added=anteCents*names.length;
   setHands(dealt);setClown(ghost);setChoices([]);setPeek(null);setOutcome(null);setPhase("declare");setRound(n=>n+1);
   setPot(oldPot+added);
   setNet((oldNet.length?oldNet:names.map(()=>0)).map(n=>n-anteCents));
   setHistory([...oldHistory,{text:`Hand ${round+1}: ${names.length} antes of ${usd(anteCents)}; pot ${usd(oldPot+added)}.`}]);
 }
 function start(){
   if(!Number.isSafeInteger(anteCents)||anteCents<1||!Number.isSafeInteger(capCents)||capCents<1||names.length>maxPlayers){setError("Check player count, ante and cap.");return;}
   setError("");setRound(0);distribute(0,names.map(()=>0),[]);
 }
 function commit(choice){
   if(phase!=="declare"||choices.length>=names.length)return;
   const updated=[...choices,choice];setChoices(updated);setPeek(null);
   if(updated.length===names.length){
     try{
       const resolved=resolveBozoRound({choices:updated,hands,clown,wildRank,potCents:pot});
       setOutcome(resolved);
       if(resolved.kind==="tie-review"){setPhase("review");return;}
       setNet(old=>old.map((balance,i)=>{
         const award=resolved.kind==="player-win"&&resolved.winner===i?resolved.dragCents:0;
         const penalty=resolved.penalties.find(p=>p.player===i)?.cents||0;
         return balance+award-penalty;
       }));
       setPot(resolved.nextPotCents);
       setHistory(old=>[...old,{text:resolved.kind==="player-win"?`${names[resolved.winner]} dragged ${usd(resolved.dragCents)}; ${resolved.penalties.length} holder penalties of ${usd(pot)}; next pot ${usd(resolved.nextPotCents)}.`:resolved.kind==="clown-win"?`Clown won: ${resolved.penalties.length} holders matched ${usd(pot)}; pot ${usd(resolved.nextPotCents)}.`:`No holders: pot stays ${usd(pot)} until all ante again.`}]);
       setPhase("result");
     }catch(e){setError(e.message||"Showdown could not be evaluated");setPhase("review");}
   }
 }
 function nextHand(){if(phase!=="result"||pot>capCents)return;distribute(pot,net,history);}
 function reset(){setPhase("setup");setHands([]);setClown([]);setChoices([]);setPot(0);setNet([]);setHistory([]);setRound(0);setError("");}
 return <main className="min-h-dvh bg-[#020817] px-4 pb-20 pt-[max(1.5rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-4xl">
  <header className="mb-5 flex items-center justify-between gap-3"><button type="button" onClick={()=>nav("/customer/games")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm"><ArrowLeft size={16}/> Games</button><div className="text-right"><div className="text-[10px] font-black tracking-widest text-amber-300">SYNCWORKS GAMES</div><h1 className="text-2xl font-black">Bozo · The Clown</h1></div></header>
  <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/[.07] p-4"><h2 className="flex items-center gap-2 text-base font-black"><Skull size={20} className="text-amber-300"/> Beat the Clown to drag the pot</h2><p className="mt-2 text-xs leading-5 text-slate-300">The Clown has one face-up card. Its rank is wild for everyone, including the Clown. Holders must beat the Clown and all other holders to drag the virtual pot. The Clown never pays an ante or a penalty.</p><p className="mt-2 text-[11px] text-amber-200">Local pass-and-play beta, with provisional poker hand ranking. No online opponents, funds held, transfers, or shared ledger yet.</p></div>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-rose-400/30 p-3 text-xs text-rose-200">{error}</p>}
  {phase==="setup"?<section className="space-y-4 rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="flex items-center gap-2 text-lg font-black"><Users size={18}/> Dealer setup</h2>
    <div className="grid grid-cols-2 gap-2">{[5,7].map(n=><button type="button" key={n} onClick={()=>{setHandSize(n);if(names.length>Math.floor(52/n)-1)setNames(names.slice(0,Math.floor(52/n)-1));}} className={`min-h-11 rounded-xl border text-sm font-bold ${handSize===n?"border-amber-300 bg-amber-500/20":"border-white/15"}`}>{n}-card hand</button>)}</div>
    <div className="space-y-2">{names.map((name,i)=><input key={i} value={name} maxLength={24} aria-label={`Player ${i+1}`} onChange={e=>setNames(old=>old.map((n,j)=>i===j?e.target.value:n))} className="w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/>)}</div>
    <div className="flex gap-2"><button type="button" disabled={names.length<=2} onClick={()=>setNames(names.slice(0,-1))} className="min-h-10 rounded-xl border border-white/20 px-3 text-xs disabled:opacity-40">Remove</button><button type="button" disabled={names.length>=Math.min(6,maxPlayers)} onClick={()=>setNames([...names,`Player ${names.length+1}`])} className="min-h-10 rounded-xl border border-white/20 px-3 text-xs disabled:opacity-40">Add player</button></div>
    <label className="block text-xs text-slate-400">Ante per player ($)<div className="mt-2 grid grid-cols-3 gap-2">{["0.25","0.50","1.00"].map(v=><button type="button" key={v} onClick={()=>setAnte(v)} className={`min-h-11 rounded-xl border font-bold ${ante===v?"border-amber-300 bg-amber-500/20":"border-white/15"}`}>${v}</button>)}</div><input value={ante} type="number" min="0.01" max="1000" step="0.01" onChange={e=>setAnte(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/></label>
    <label className="block text-xs text-slate-400">Dealer review threshold (pot cap, $)<input value={cap} type="number" min="0.01" step="0.01" max="100000" onChange={e=>setCap(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/></label>
    <button type="button" onClick={start} className="min-h-12 w-full rounded-xl bg-amber-400 font-black text-black">Deal against the Clown</button>
  </section>:<>
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Hand",String(round)],["Virtual pot",usd(pot)],["Wild rank",LABEL(wildRank)],["Cap",usd(capCents)]].map(([k,v])=><div key={k} className="rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="text-[10px] text-slate-400">{k}</div><div className="mt-1 text-lg font-black">{v}</div></div>)}</div>
    <section className="mb-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4"><div className="flex items-center justify-between gap-2"><div><div className="text-xs font-black uppercase tracking-widest text-amber-200">The Clown · ghost opponent</div><p className="mt-1 text-[11px] text-slate-400">Never folds · never contributes</p></div>{phase!=="declare"&&<div className="text-right text-xs font-bold text-amber-200">{outcome?.clownHand?.name||""}</div>}</div><div className="mt-4 flex flex-wrap gap-2">{clown.map((c,i)=><Card key={i} card={c} wild={c.rank===wildRank} faceDown={phase==="declare"&&i!==0}/>)}</div><p className="mt-3 text-xs text-amber-100">Face-up card: {clown[0]?LABEL(wildRank)+clown[0].suit:"—"} · all {LABEL(wildRank)}s wild</p></section>
    <div className="grid gap-2 sm:grid-cols-3">{names.map((name,i)=><section key={i} className="rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="flex items-center justify-between gap-2"><b className="text-sm">{name}</b><span className="text-[10px] font-black text-slate-400">{choices[i]==="hold"?"HELD":choices[i]==="drop"?"DROPPED":""}</span></div><div className="mt-1 text-xs text-slate-400">Net in session: {net[i]<0?"−":"+"}{usd(net[i]||0)}</div><div className="mt-3 flex flex-wrap gap-1.5">{hands[i].map((card,j)=><Card key={j} card={card} wild={card.rank===wildRank} faceDown={phase==="declare"&&peek!==i}/>)}</div>{phase!=="declare"&&choices[i]==="hold"&&outcome?.playerHands?.some(x=>x.i===i)&&<div className="mt-2 text-xs font-bold text-cyan-200">{outcome.playerHands.find(x=>x.i===i).hand.name}</div>}</section>)}</div>
    {phase==="declare"&&<section className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.05] p-4"><h2 className="text-lg font-black">{names[choices.length]} · HOLD or DROP?</h2><p className="mt-2 text-xs text-slate-400">Pass the device privately; other choices remain hidden until all players commit.</p><button type="button" onClick={()=>setPeek(peek===choices.length?null:choices.length)} className="mt-3 min-h-11 w-full rounded-xl border border-white/15 text-sm font-bold">{peek===choices.length?"Hide my cards":"View my cards"}</button><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>commit("hold")} className="min-h-12 rounded-xl bg-emerald-400 font-black text-black">HOLD · IN</button><button type="button" onClick={()=>commit("drop")} className="min-h-12 rounded-xl bg-rose-500 font-black text-white">DROP · OUT</button></div></section>}
    {phase==="result"&&<section className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4"><h2 className="text-xl font-black">{outcome.kind==="player-win"?`🏆 ${names[outcome.winner]} beats the Clown!`:outcome.kind==="clown-win"?"🤡 The Clown wins!":"Everyone dropped"}</h2><p className="mt-2 text-sm leading-6 text-slate-200">{outcome.message}</p>{outcome.dragCents>0&&<p className="mt-2 font-black text-emerald-200">Pot dragged: {usd(outcome.dragCents)}</p>}<p className="mt-2 text-xs text-slate-300">Next virtual pot: {usd(outcome.nextPotCents)}. Each new hand also collects a fresh ante from each player.</p>{pot>capCents?<p className="mt-3 rounded-lg border border-rose-400/40 p-3 text-sm text-rose-200">Dealer review threshold exceeded. No automatic truncation or new deal.</p>:<button type="button" onClick={nextHand} className="mt-4 min-h-12 w-full rounded-xl bg-amber-400 font-black text-black">{outcome.kind==="player-win"?"Start next game with carried pot":"Re-ante & deal next hand"}</button>}<button type="button" onClick={reset} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 text-xs"><RotateCcw size={14}/> New table / reset</button></section>}
    {phase==="review"&&<section className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4"><h2 className="font-black">Dealer review required</h2><p className="mt-2 text-xs text-slate-200">{outcome?.message||"Showdown evaluator needs review."} No virtual pot movement has been applied.</p><button type="button" onClick={reset} className="mt-3 rounded-xl border border-white/20 px-4 py-3 text-xs">Reset table</button></section>}
    <section className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-4"><h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Virtual activity log</h3>{[...history].reverse().slice(0,12).map((h,i)=><p className="border-b border-white/5 py-2 text-xs leading-5 text-slate-300" key={i}>{h.text}</p>)}</section>
  </>}
 </div></main>;
}

import React, {useMemo,useState} from "react";
import {ArrowLeft,RefreshCcw,Shield,Users} from "lucide-react";
import {useNavigate} from "react-router-dom";
const suits=["♠","♥","♦","♣"];
const label=(r)=>({11:"J",12:"Q",13:"K",14:"A"}[r]||String(r));
const dollars=(v)=>"$"+(v/100).toFixed(2);
const num=(v)=>Math.round(Number(v)*100);
function shuffle(){
 const deck=suits.flatMap(s=>Array.from({length:13},(_,i)=>({rank:i+2,suit:s})));
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;
}
export function wild442(hand){const hasDeuce=hand.some(card=>card.rank===2);return hand.map(card=>card.rank===2||(card.rank===4&&hasDeuce));}
export default function Customer442(){
 const nav=useNavigate();
 const [names,setNames]=useState(["Player 1","Player 2","Player 3"]);
 const [ante,setAnte]=useState("1.00"),[cap,setCap]=useState("50.00");
 const [hands,setHands]=useState([]),[stage,setStage]=useState("setup"),[decisions,setDecisions]=useState([]),[position,setPosition]=useState(0);
 const [pot,setPot]=useState(0),[history,setHistory]=useState([]),[activeView,setActiveView]=useState(null);
 const [winner,setWinner]=useState(null);
 const stake=num(ante),limit=num(cap);
 const holders=useMemo(()=>decisions.map((v,i)=>v==="in"?i:-1).filter(i=>i>=0),[decisions]);
 function start(){
   const deck=shuffle();const cards=names.map((_,i)=>deck.slice(i*5,i*5+5));
   setHands(cards);setDecisions([]);setPosition(0);setWinner(null);setActiveView(null);
   setPot(names.length*stake);setHistory([{text:`Opening ante: ${names.length} players × ${dollars(stake)} = ${dollars(names.length*stake)}`}]);
   setStage("declaring");
 }
 function nextHand(extraAnte=false){
   const deck=shuffle();
   setHands(names.map((_,i)=>deck.slice(i*5,i*5+5)));
   setDecisions([]);setPosition(0);setWinner(null);setActiveView(null);
   if(extraAnte){
     const newPot=pot+names.length*stake;setPot(newPot);
     setHistory(h=>[...h,{text:`Everyone out: ${names.length} new antes of ${dollars(stake)}; pot ${dollars(newPot)}.`}]);
   }
   setStage("declaring");
 }
 function commit(choice){
   const next=[...decisions,choice];setDecisions(next);setPosition(next.length);setActiveView(null);
   if(next.length===names.length){
     const ins=next.map((v,i)=>v==="in"?i:-1).filter(i=>i>=0);
     if(ins.length===0)setStage("all-out");
     else if(ins.length===1){setWinner(ins[0]);setHistory(h=>[...h,{text:`${names[ins[0]]} was the lone holder and drags ${dollars(pot)}.`}]);setPot(0);setStage("result");}
     else setStage("adjudicate");
   }
 }
 function resolve(selected){
   if(!holders.includes(selected))return;
   const dragged=pot,match=Math.min(dragged,limit),nextPot=(holders.length-1)*match;
   setWinner(selected);setPot(nextPot);
   setHistory(h=>[...h,{text:`${names[selected]} drags ${dollars(dragged)}. ${holders.filter(i=>i!==selected).map(i=>names[i]).join(", ")} match ${dollars(match)} each; next pot ${dollars(nextPot)}.`}]);
   setStage("result");
 }
 return <main className="min-h-dvh bg-[#020817] px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-3xl">
 <header className="mb-5 flex items-center justify-between gap-3"><button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm" onClick={()=>nav("/customer/games")}><ArrowLeft size={17}/> Games</button><div className="text-right"><div className="text-[10px] font-black tracking-widest text-cyan-300">SYNCWORKS GAMES</div><h1 className="text-2xl font-black">4 / 4 / Deuce</h1></div></header>
 <div className="mb-4 rounded-2xl border border-cyan-400/25 bg-cyan-500/[.06] p-4"><h2 className="font-black">2s are always wild. 4s require a 2.</h2><p className="mt-2 text-xs leading-5 text-slate-300">If your own hand contains a deuce, every 4 in your hand also becomes wild. Otherwise your 4s count as natural 4s. Everyone antes and declares IN/OUT; losing holders match the current pot up to the dealer cap.</p><p className="mt-2 text-xs text-amber-200">Five-card local demonstration (hand size not yet confirmed). Winner selection is manual for now because the full conditional-wild hand evaluator has not been verified. No actual funds.</p></div>
 {stage==="setup"?<section className="space-y-3 rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="flex items-center gap-2 font-black"><Users size={18}/> Setup table</h2>{names.map((n,i)=><input key={i} value={n} maxLength={24} onChange={e=>setNames(a=>a.map((v,j)=>i===j?e.target.value:v))} aria-label={`Player ${i+1}`} className="w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/>)}<div className="flex gap-2"><button type="button" disabled={names.length<=2} className="rounded-xl border border-white/20 px-3 py-2 text-xs disabled:opacity-40" onClick={()=>setNames(names.slice(0,-1))}>Remove</button><button type="button" disabled={names.length>=6} className="rounded-xl border border-white/20 px-3 py-2 text-xs disabled:opacity-40" onClick={()=>setNames([...names,`Player ${names.length+1}`])}>Add</button></div><div className="text-xs text-slate-400">Ante per player</div><div className="grid grid-cols-3 gap-2">{["0.25","0.50","1.00"].map(v=><button type="button" key={v} className={`rounded-xl border p-3 font-bold ${ante===v?"border-cyan-400 bg-cyan-500/20":"border-white/15"}`} onClick={()=>setAnte(v)}>${v}</button>)}</div><label className="block text-xs text-slate-400">Custom ante ($)<input type="number" step="0.01" min="0.01" max="1000" value={ante} onChange={e=>setAnte(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/></label><label className="block text-xs text-slate-400">Match-the-pot penalty cap per losing holder ($)<input type="number" step="0.01" min="0.01" max="100000" value={cap} onChange={e=>setCap(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/></label><button type="button" disabled={!Number.isSafeInteger(stake)||stake<=0||!Number.isSafeInteger(limit)||limit<=0} onClick={start} className="min-h-12 w-full rounded-xl bg-cyan-400 font-black text-slate-950 disabled:opacity-40">Deal demo</button></section>:<>
 <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4"><div className="text-xs font-bold text-amber-200">Current virtual pot</div><div className="text-3xl font-black">{dollars(pot)}</div><div className="text-xs text-slate-300">Loser match cap: {dollars(limit)} each</div></div>
 <div className="grid gap-2 sm:grid-cols-3">{names.map((n,i)=><div key={i} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex justify-between text-xs font-black"><span>{n}</span><span>{decisions[i]==="in"?"IN":decisions[i]==="out"?"OUT":""}</span></div><div className="mt-2 flex flex-wrap gap-1">{hands[i].map((card,j)=><div key={j} className={`flex h-[66px] w-10 flex-col justify-between rounded border p-1 text-xs font-black ${activeView===i||stage!=="declaring"?"border-white/60 bg-white text-slate-950":"border-cyan-300/30 bg-slate-900 text-cyan-200"}`}><span>{activeView===i||stage!=="declaring"?label(card.rank):"SW"}</span><span className="text-right">{activeView===i||stage!=="declaring"?card.suit:"♠"}</span><span className="text-[8px] text-amber-700">{(activeView===i||stage!=="declaring")&&wild442(hands[i])[j]?"WILD":""}</span></div>)}</div></div>)}</div>
 {stage==="declaring"&&<section className="mt-4 rounded-2xl border border-cyan-400/20 p-4"><h2 className="font-black">{names[position]}'s declaration</h2><p className="mt-2 text-xs text-slate-400">Pass device privately. Online simultaneous declarations will require a secure room server.</p><button type="button" onClick={()=>setActiveView(activeView===position?null:position)} className="mt-3 min-h-11 w-full rounded-xl border border-white/20"> {activeView===position?"Hide":"Peek at"} my hand</button><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>commit("in")} className="min-h-12 rounded-xl bg-emerald-400 font-black text-black">IN</button><button type="button" onClick={()=>commit("out")} className="min-h-12 rounded-xl bg-rose-500 font-black">OUT</button></div></section>}
 {stage==="all-out"&&<div className="mt-4 rounded-xl border border-amber-400/20 p-4"><h2 className="font-black">Everyone dropped</h2><p className="mt-2 text-xs">Pot carries over. Every player pays another {dollars(stake)} virtual ante.</p><button type="button" onClick={()=>nextHand(true)} className="mt-3 min-h-12 w-full rounded-xl bg-cyan-400 font-black text-black">Re-ante & deal</button></div>}
 {stage==="adjudicate"&&<section className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4"><h2 className="font-black">Select winning hand (demo only)</h2><p className="mt-2 text-xs text-slate-400">This prototype does not automatically determine the highest hand. Select a winner to preview the match-the-pot rule.</p><div className="mt-3 grid gap-2">{holders.map(i=><button type="button" key={i} onClick={()=>resolve(i)} className="min-h-11 rounded-xl border border-cyan-300/20 bg-cyan-500/10 text-sm font-bold">Award to {names[i]}</button>)}</div></section>}
 {stage==="result"&&<section className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4"><div className="font-black">{names[winner]} drags the pot</div><div className="mt-2 text-xs text-slate-300">Next virtual pot: {dollars(pot)}</div><div className="mt-3 flex gap-2"><button type="button" onClick={()=>nextHand(false)} className="min-h-11 flex-1 rounded-xl bg-emerald-400 font-black text-black">Next hand</button><button type="button" onClick={()=>setStage("setup")} className="flex items-center gap-1 rounded-xl border border-white/20 px-3"><RefreshCcw size={15}/> Setup</button></div></section>}
 <section className="mt-4 rounded-xl border border-white/10 p-3"><h2 className="flex items-center gap-2 text-xs font-black"><Shield size={15}/> Demo history</h2>{[...history].reverse().map((item,i)=><p key={i} className="mt-2 text-xs text-slate-400">{item.text}</p>)}</section>
 </>}
 </div></main>;
}

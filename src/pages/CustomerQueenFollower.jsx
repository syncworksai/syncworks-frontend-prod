import React,{useMemo,useState} from "react";
import {ArrowLeft,Crown,RotateCcw,Users} from "lucide-react";
import {useNavigate} from "react-router-dom";
const SUITS=["♠","♥","♦","♣"];
const textRank=(n)=>({11:"J",12:"Q",13:"K",14:"A"}[n]||String(n));
function shuffle(){
 const cards=SUITS.flatMap(suit=>Array.from({length:13},(_,index)=>({rank:index+2,suit})));
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;
}
const pretty=(card)=>textRank(card.rank)+card.suit;
export default function CustomerQueenFollower(){
 const nav=useNavigate();
 const [names,setNames]=useState(["Player 1","Player 2","Player 3"]);
 const [deck,setDeck]=useState([]);
 const [hands,setHands]=useState([]);
 const [dealt,setDealt]=useState(0);
 const [pending,setPending]=useState(false);
 const [followers,setFollowers]=useState([]);
 const [events,setEvents]=useState([]);
 const [phase,setPhase]=useState("setup");
 const [downFirst,setDownFirst]=useState(true);
 const active=names.length;
 const wild=useMemo(()=>new Set([12,...followers]),[followers]);
 function start(){
   setDeck(shuffle());setHands(names.map(()=>[]));setDealt(0);setPending(false);setFollowers([]);setEvents([]);
   setPhase("dealing");
 }
 function deal(){
   if(phase!=="dealing"||deck.length===0)return;
   const card=deck[0];
   const player=dealt%active;
   const faceUp=!(downFirst&&dealt<active);
   const nextEvents=[...events];
   let nextPending=pending, nextWild=[...followers];
   let event=`${names[player]} received ${faceUp?pretty(card):"a private down card"}.`;
   // Only a face-up Queen starts the follower chain. The next dealt face-up
   // card reveals the follower rank; a Queen extends the pending chain.
   if(faceUp){
     if(card.rank===12){
       nextPending=true;
       event+=pending?" Another Queen keeps the follower pending.":" Face-up Queen: next card decides a wild rank.";
     }else if(pending){
       if(!nextWild.includes(card.rank))nextWild.push(card.rank);
       nextPending=false;
       event+=` All ${textRank(card.rank)}s become wild.`;
     }
   }else if(pending){
     // Do not reveal a private down card's rank. Pause the follower chain until
     // a face-up card is dealt. This case cannot occur in the initial-down mode.
     event+=" Follower awaits the next face-up card.";
   }
   nextEvents.push(event);
   setDeck(deck.slice(1));setDealt(dealt+1);setPending(nextPending);setFollowers(nextWild);setEvents(nextEvents);
   setHands(hands.map((hand,i)=>i===player?[...hand,{...card,faceUp}]:hand));
 }
 function newGame(){setPhase("setup");setEvents([]);}
 return <main className="min-h-dvh bg-[#020817] px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-4xl">
  <header className="mb-5 flex items-center justify-between gap-3"><button type="button" onClick={()=>nav("/customer/games")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"><ArrowLeft size={17}/> Games</button><div className="text-right"><div className="text-[10px] font-black tracking-widest text-violet-300">CARD GAMES</div><h1 className="text-2xl font-black">Queen & the Follower</h1></div></header>
  <section className="mb-4 rounded-2xl border border-violet-400/25 bg-violet-500/[.07] p-4"><div className="flex items-center gap-2 text-lg font-black"><Crown size={21} className="text-amber-300"/> Wild cards follow the deal</div><p className="mt-2 text-xs leading-5 text-slate-300">All Queens are always wild. When a Queen appears face-up, the following card determines an additional wild rank. Consecutive Queens extend the trigger, and follower ranks stack. A final Queen with no follower adds nothing.</p><p className="mt-2 text-[11px] leading-5 text-amber-200">Dealing and wild-card demonstration only. Full stud schedule, bets, hand comparison and natural-over-wild tiebreakers still need a validated game engine.</p></section>
  {phase==="setup"?<section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="mb-3 flex items-center gap-2 font-black"><Users size={19}/> Demo table</h2><div className="space-y-2">{names.map((n,i)=><input key={i} aria-label={`Player ${i+1}`} value={n} maxLength={24} onChange={e=>setNames(old=>old.map((x,j)=>i===j?e.target.value:x))} className="w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm"/>)}</div><div className="mt-3 flex gap-2"><button type="button" disabled={active<=2} onClick={()=>setNames(names.slice(0,-1))} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40">Remove</button><button type="button" disabled={active>=6} onClick={()=>setNames([...names,`Player ${active+1}`])} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40">Add</button></div><label className="mt-4 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={downFirst} onChange={e=>setDownFirst(e.target.checked)}/> First card down, remaining cards face-up</label><button type="button" onClick={start} className="mt-4 min-h-12 w-full rounded-xl bg-violet-400 font-black text-black">Start demonstration</button></section>:<>
  <section className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4"><div className="text-xs font-black uppercase tracking-widest text-amber-200">Current wild ranks</div><div className="mt-2 text-2xl font-black">{[12,...followers].map(textRank).join(" · ")}</div><div className="mt-1 text-[11px] text-slate-300">{pending?"Queen just appeared — waiting for follower!":"No pending Queen trigger."}</div></section>
  <div className="mb-4 grid gap-3 sm:grid-cols-3">{names.map((n,i)=><div key={i} className="rounded-xl border border-white/10 bg-white/[.035] p-3"><h3 className="mb-3 text-sm font-black">{n}</h3><div className="flex flex-wrap gap-2">{hands[i].length?hands[i].map((card,j)=><div key={j} className={`flex h-20 w-12 flex-col justify-between rounded-lg border p-1 ${card.faceUp?"border-white bg-white text-black":"border-cyan-300/30 bg-cyan-950 text-cyan-200"}`}><span className="text-xs font-black">{card.faceUp?textRank(card.rank):"SW"}</span><span className={`text-center text-2xl ${card.faceUp&&(card.suit==="♥"||card.suit==="♦")?"text-red-600":""}`}>{card.faceUp?card.suit:"♠"}</span><span className="text-center text-[8px] font-black">{card.faceUp&&wild.has(card.rank)?"WILD":" "}</span></div>):<span className="text-xs text-slate-500">Waiting for cards</span>}</div></div>)}</div>
  <button type="button" disabled={deck.length===0} onClick={deal} className="min-h-12 w-full rounded-xl bg-violet-400 font-black text-black disabled:opacity-40">Deal next {dealt<active&&downFirst?"down":"face-up"} card · {deck.length} remaining</button>
  <section className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Deal log</h2><button type="button" onClick={newGame} className="flex items-center gap-1 text-xs font-bold text-cyan-300"><RotateCcw size={13}/> Reset</button></div><div className="mt-2 max-h-56 space-y-2 overflow-y-auto">{[...events].reverse().slice(0,18).map((e,i)=><p key={i} className="text-xs leading-5 text-slate-300">{e}</p>)}</div></section>
  </>}
 </div></main>;
}

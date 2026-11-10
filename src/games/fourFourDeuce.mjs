import {fundedReplacement} from "./pokerPracticeSession.mjs";
// Four Card Drop: four cards only. Fours always wild; no straights or flushes.
const ranks = cards => cards.map(c => c.rank);
const encode = values => values.reduce((n,v)=>n*15+v,0);
export function naturalPair442(cards){
 const seen=new Set();
 for(const c of cards){if(c.rank===4)continue;if(seen.has(c.rank))return true;seen.add(c.rank);}
 return false;
}
export function score442(cards){
 if(!Array.isArray(cards)||cards.length!==4)throw Error("4/4 requires exactly four cards");
 const fixed=cards.filter(c=>c.rank!==4),wild=4-fixed.length;
 let best=null;
 const visit=(assigned)=>{
  if(assigned.length<wild){for(let r=2;r<=14;r++)visit([...assigned,r]);return;}
  const counts=new Map();
  for(const r of [...ranks(fixed),...assigned])counts.set(r,(counts.get(r)||0)+1);
  const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const top=groups[0][1],pair=groups.filter(g=>g[1]===2);
  const category=top===4?4:top===3?3:pair.length===2?2:top===2?1:0;
  const kickers=category===4?[groups[0][0]]:category===3?[groups[0][0],groups[1][0]]:category===2?pair.map(g=>g[0]).sort((a,b)=>b-a):category===1?[groups[0][0],...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)]:[...ranks(fixed),...assigned].sort((a,b)=>b-a);
  const score=category*15**4+encode([...kickers,...Array(4).fill(0)].slice(0,4));
  if(!best||score>best.score)best={score,category,kickers,name:["High card","Pair","Two pair","Three of a kind","Four of a kind"][category]};
 };
 visit([]);
 return best;
}
export function replace442({hands,deck,seat,indexes}){
 if(!Array.isArray(indexes)||indexes.length>3||new Set(indexes).size!==indexes.length||indexes.some(i=>!Number.isInteger(i)||i<0||i>3))throw Error("Select up to three distinct cards");
 if(!hands[seat]||hands[seat].length!==4||deck.length<indexes.length)throw Error("Invalid exchange");
 const nextHands=hands.map(h=>[...h]),nextDeck=[...deck];
 for(const i of indexes)nextHands[seat][i]=nextDeck.shift();
 return {hands:nextHands,deck:nextDeck};
}
export function settle442({hands,choices,potCents,capCents,anteCents,stacks}){
 const holders=choices.flatMap((c,i)=>c==="hold"?[i]:[]);
 if(!holders.length)return {kind:"all-drop",winner:null,losers:[],nextPot:potCents,delta:choices.map(()=>0),message:"Everyone dropped. Each player antes again for the next deal."};
 if(holders.length===1&&!naturalPair442(hands[holders[0]]))return {kind:"no-natural-pair",winner:null,losers:[],nextPot:potCents,delta:choices.map(()=>0),message:"Lone holder has no natural pair. The pot carries forward; everyone antes again."};
 const ranked=holders.map(i=>({seat:i,hand:score442(hands[i])}));
 const best=Math.max(...ranked.map(x=>x.hand.score)),tied=ranked.filter(x=>x.hand.score===best);
 if(tied.length>1)return {kind:"tie-review",winner:null,losers:[],nextPot:potCents,delta:choices.map(()=>0),message:"Tied best four-card hands. Dealer review required; no chips moved."};
 const winner=tied[0].seat,losers=holders.filter(i=>i!==winner);
 const capFinal=potCents>=capCents;
 const match=capFinal?0:fundedReplacement({losers,stacks,potCents,capCents}).perLoser;
 const delta=choices.map((_,i)=>i===winner?potCents:losers.includes(i)?-match:0);
 return {kind:"drag",winner,losers,match,capFinal,nextPot:match*losers.length,delta,hand:ranked.find(x=>x.seat===winner).hand,message:capFinal?"Capped pot awarded to qualifying winner; new game.":winner+" wins with "+ranked.find(x=>x.seat===winner).hand.name+", dragging the pot."};
}
export function botExchange442(cards){
 const counts=new Map();for(const c of cards)if(c.rank!==4)counts.set(c.rank,(counts.get(c.rank)||0)+1);
 const keeps=cards.map((c,i)=>({c,i})).filter(({c})=>c.rank===4||counts.get(c.rank)>1).map(({i})=>i);
 if(!keeps.length)keeps.push(cards.reduce((best,c,i)=>c.rank>cards[best].rank?i:best,0));
 return cards.map((_,i)=>i).filter(i=>!keeps.includes(i)).slice(0,3);
}
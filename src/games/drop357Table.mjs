import { evaluateBozoHand } from "./bozoRules.mjs";

export const THREE_FIVE_SEVEN = [3, 5, 7];
export const SUITS = ["♠", "♥", "♦", "♣"];
export const cardRank = rank => ({11:"J",12:"Q",13:"K",14:"A"}[rank] || String(rank));
export const displayMoney = cents => (cents < 0 ? "-" : "") + "$" + (Math.abs(cents)/100).toFixed(2);

export function createShuffledDeck(random=Math.random) {
  const deck = SUITS.flatMap(suit => Array.from({length:13},(_,i)=>({rank:i+2,suit})));
  for (let i=deck.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}

export function dealt357(deck,playerCount,activeSeats=Array.from({length:playerCount},(_,i)=>i)) {
  if (playerCount<2 || playerCount>6 || activeSeats.length<2 || new Set(activeSeats).size!==activeSeats.length || activeSeats.some(i=>!Number.isInteger(i)||i<0||i>=playerCount)||deck.length<activeSeats.length*7) throw new Error("A single deck supports 2–6 active players here.");
  const hands=Array.from({length:playerCount},()=>[]);
  let next=0;
  // Deal only to seated players who have not left the table; preserves a single deck.
  for(let pass=0;pass<3;pass++)for(const player of activeSeats)hands[player].push(deck[next++]);
  return {hands,deck:deck.slice(next)};
}
export function addRoundCards(hands,deck,activeSeats=null) {
  const result=hands.map(hand=>[...hand]);
  const active=activeSeats??result.flatMap((h,i)=>h.length?[i]:[]);
  if(deck.length<active.length*2)throw Error("Not enough cards left in this deck.");
  let index=0;
  for(let pass=0;pass<2;pass++)for(const i of active)result[i].push(deck[index++]);
  return {hands:result,deck:deck.slice(index)};
}
export const instant357=hand=>hand.length===3&&hand.map(c=>c.rank).sort((a,b)=>a-b).join(",")==="3,5,7";

function evaluateThree(hand,wildRank=3) {
  const natural=hand.filter(c=>c.rank!==wildRank).map(c=>c.rank);
  const wilds=hand.length-natural.length;
  if(natural.length===0)return {score:30000+14,name:"Three of a kind"};
  if(natural.every(r=>r===natural[0])&&natural.length+wilds===3)
    return {score:30000+natural[0],name:"Three of a kind"};
  let bestPair=0,kicker=0;
  for(let rank=14;rank>=2;rank--){
    const matching=natural.filter(r=>r===rank).length;
    if(matching+wilds<2)continue;
    const other=natural.filter(r=>r!==rank);
    if(other.length>1)continue;
    const k=other[0]||14;
    const score=10000+rank*15+k;
    if(score>bestPair){bestPair=score;kicker=k;}
  }
  if(bestPair)return {score:bestPair,name:"Pair"};
  return {score:natural.slice().sort((a,b)=>b-a).reduce((v,r)=>v*15+r,0),name:"High card"};
}

export function rate357(hand,round) {
  if(round===0)return evaluateThree(hand,3);
  if(round===1)return evaluateBozoHand(hand,5);
  return evaluateBozoHand(hand,7);
}

export function resolve357({hands,round,choices,potCents,strikes,anteCents}) {
  const entered=choices.flatMap((c,i)=>c==="hold"?[i]:[]);
  const scores=entered.map(i=>({index:i,...rate357(hands[i],round)}));
  const currentStrikes={...strikes};
  if(!entered.length) {
    return {kind:"all-drop",winner:null,entered,scores,
      nextPot:potCents+anteCents*hands.length,
      delta:hands.map(()=>-anteCents),strikes:currentStrikes,
      message:"Everyone folded. Each player antes again and the pot carries forward."};
  }
  if(entered.length===1){
    const only=entered[0];
    currentStrikes[only]=(currentStrikes[only]||0)+1;
    if(currentStrikes[only]<3)
      return {kind:"lone-strike",winner:null,entered,scores,nextPot:potCents,
        delta:hands.map(()=>0),strikes:currentStrikes,
        message:`One holder earns an uncontested strike (${currentStrikes[only]}/3 cumulative). The pot carries forward.`};
  }
  const top=Math.max(...scores.map(s=>s.score));
  const winners=scores.filter(s=>s.score===top).map(s=>s.index);
  if(winners.length!==1)
    return {kind:"tie-review",winner:null,entered,scores,nextPot:potCents,
      delta:hands.map(()=>0),strikes:currentStrikes,
      message:"Showdown tie: the dealer must apply the club tie rule before payout."};
  const winner=winners[0];
  const loserCount=entered.length-1;
  return {kind:"drag",winner,entered,scores,nextPot:potCents*loserCount,
    delta:hands.map((_,i)=>i===winner?potCents:entered.includes(i)?-potCents:0),
    strikes:currentStrikes,
    message:entered.length===1?"Three cumulative uncontested holds: pot dragged.":`Winner drags ${displayMoney(potCents)}; ${loserCount} losing holder(s) each replace ${displayMoney(potCents)}.`};
}

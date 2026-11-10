import {createShuffledDeck,rate357,THREE_FIVE_SEVEN} from "./drop357Table.mjs";

// Ranked from strongest to weakest. 3-card straights and flushes are not hands.
export const HAND_RANKINGS_357 = Object.freeze({
  0:["Three of a kind (3s wild)","Three of a kind","Pair","High card"],
  1:["Five of a kind","Straight flush","Four of a kind","Full house","Flush","Straight","Three of a kind","Two pair","Pair","High card"],
  2:["Five of a kind","Straight flush","Four of a kind","Full house","Flush","Straight","Three of a kind","Two pair","Pair","High card"]
});

export function practiceHandInfo(cards,round) {
  if(!Array.isArray(cards)||cards.length!==[3,5,7][round]) return null;
  const assessment=rate357(cards,round);
  const wild=THREE_FIVE_SEVEN[round];
  const wildCount=cards.filter(c=>c.rank===wild).length;
  return {name:assessment.name,score:assessment.score,wild,wildCount};
}

// One-opponent Monte Carlo estimate conditioned on both players staying in.
// We deliberately exclude only the VIEWER'S exposed hand. Never inspect a
// real opponent's private cards or the game's predetermined undealt deck.
export function estimatePracticeEquity(hand,round,{trials,random=Math.random}={}) {
  if(!Array.isArray(hand)||hand.length!==[3,5,7][round]) return null;
  const sampleCount=Number.isInteger(trials)&&trials>0?Math.min(trials,1000):round===2?120:240;
  const known=new Set(hand.map(c=>c.rank+":"+c.suit));
  const pool=createShuffledDeck(()=>0.5).filter(c=>!known.has(c.rank+":"+c.suit));
  if(pool.length<hand.length)return null;
  const player=practiceHandInfo(hand,round);
  if(!player)return null;

  let wins=0,ties=0;
  for(let t=0;t<sampleCount;t++){
    // Partial Fisher-Yates; different random opponent on each trial.
    const sample=pool.slice();
    for(let i=0;i<hand.length;i++){
      const remaining=sample.length-i;
      const r=Number(random());
      const j=i+Math.min(remaining-1,Math.max(0,Math.floor((Number.isFinite(r)?r:0.5)*remaining)));
      [sample[i],sample[j]]=[sample[j],sample[i]];
    }
    const opponent=rate357(sample.slice(0,hand.length),round);
    if(player.score>opponent.score)wins++;
    else if(player.score===opponent.score)ties++;
  }
  // Half-credit on tied ranks; true payout may require a manual tie ruling.
  return {percent:Math.round((wins+ties*0.5)/sampleCount*100),wins,ties,trials:sampleCount};
}

/** Teach the player which physical cards help form the ranked combination.
 * Other cards are never exposed. Highlight wilds and the strongest matching
 * rank group. For straights/flushes, highlight the whole made hand instead.
 */
export function practiceKeyCardIndices(hand,round){
 if(!Array.isArray(hand)||hand.length!==[3,5,7][round])return [];
 const assessment=rate357(hand,round);
 const category=String(assessment?.name||"").toLowerCase();
 const wild=[3,5,7][round];
 if(/straight|flush|high card/.test(category))return hand.map((_,i)=>i);
 const counts=new Map();
 hand.forEach(card=>{if(card.rank!==wild)counts.set(card.rank,(counts.get(card.rank)||0)+1);});
 const sorted=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
 const groupLimit=/full house|two pair/.test(category)?2:1;
 const ranks=new Set(sorted.slice(0,groupLimit).map(([r])=>r));
 return hand.flatMap((card,i)=>card.rank===wild||ranks.has(card.rank)?[i]:[]);
}

import {createShuffledDeck,rate357,THREE_FIVE_SEVEN} from "./drop357Table.mjs";

// Ranked from strongest to weakest. 3-card straights and flushes are not hands.
export const HAND_RANKINGS_357 = Object.freeze({
  0:["Natural 3-5-7 (instant drag)","Three of a kind","Pair","High card"],
  1:["Five of a kind","Straight flush","Four of a kind","Full house","Flush","Straight","Three of a kind","Two pair","Pair","High card"],
  2:["Five of a kind","Straight flush","Four of a kind","Full house","Flush","Straight","Three of a kind","Two pair","Pair","High card"]
});

export function practiceHandInfo(cards,round) {
  if(!Array.isArray(cards)||cards.length!==[3,5,7][round]) return null;
  const assessment=rate357(cards,round);
  const wild=THREE_FIVE_SEVEN[round];
  const wildCount=cards.filter(c=>c.rank===wild).length;
  const natural357=round===0&&cards.map(c=>c.rank).sort((a,b)=>a-b).join(",")==="3,5,7";
  return {name:natural357?"Natural 3-5-7 — instant drag":assessment.name,score:assessment.score,wild,wildCount};
}

// One-opponent Monte Carlo estimate conditioned on both players staying in.
// We deliberately exclude only the VIEWER'S exposed hand. Never inspect a
// real opponent's private cards or the game's predetermined undealt deck.
export function estimatePracticeEquity(hand,round,{trials,random=Math.random}={}) {
  if(!Array.isArray(hand)||hand.length!==[3,5,7][round]) return null;
  const sampleCount=Number.isInteger(trials)&&trials>0?Math.min(trials,1000):round===2?28:100;
  const known=new Set(hand.map(c=>c.rank+":"+c.suit));
  const pool=createShuffledDeck(()=>0.5).filter(c=>!known.has(c.rank+":"+c.suit));
  if(pool.length<hand.length)return null;
  const player=practiceHandInfo(hand,round);
  if(!player)return null;
  if(player.name==="Natural 3-5-7 — instant drag") return {percent:100,wins:sampleCount,ties:0,trials:sampleCount};
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

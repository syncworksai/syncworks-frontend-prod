import {createShuffledDeck} from "./drop357Table.mjs";
import {score442} from "./fourFourDeuce.mjs";
import {evaluateBozoHand} from "./bozoRules.mjs";

/** Practice only: one RANDOM comparable opponent hand, never real bot cards.
 * This is a simulated head-to-head showdown chance, not the probability of
 * winning a multi-opponent table or a prediction that someone will hold.
 */
export function variantPracticeEquity({variant,hand,wildRank,trials,random=Math.random}){
 if(!["bozo","442"].includes(variant)||!Array.isArray(hand)||!hand.length)return null;
 if(variant==="442"&&hand.length!==4)return null;
 if(variant==="bozo"&&![5,7].includes(hand.length))return null;
 if(variant==="bozo"&&!Number.isInteger(wildRank))return null;
 const sampleCount=Number.isInteger(trials)&&trials>0?Math.min(200,trials):hand.length>=7?18:variant==="bozo"?35:100;
 const rating=variant==="bozo"?h=>evaluateBozoHand(h,wildRank):score442;
 const own=rating(hand);
 const taken=new Set(hand.map(c=>c.rank+":"+c.suit));
 const remaining=createShuffledDeck(()=>0.5).filter(c=>!taken.has(c.rank+":"+c.suit));
 let wins=0,ties=0;
 for(let n=0;n<sampleCount;n++){
  const deck=remaining.slice();
  for(let k=0;k<hand.length;k++){
   const x=Number(random());
   const j=k+Math.min(deck.length-k-1,Math.max(0,Math.floor((Number.isFinite(x)?x:0.5)*(deck.length-k))));
   [deck[k],deck[j]]=[deck[j],deck[k]];
  }
  const opponent=rating(deck.slice(0,hand.length));
  if(own.score>opponent.score)wins++;
  else if(own.score===opponent.score)ties++;
 }
 return {name:own.name||"Poker hand",percent:Math.round((wins+ties/2)/sampleCount*100),trials:sampleCount};
}

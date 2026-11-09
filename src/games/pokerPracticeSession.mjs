// Virtual-chip safeguards for the local SyncWorks poker session.
// A pot cap is a HARD central-purse limit: never mint chips or let pot exceed it.
export const centsFromDollars=value=>{if(String(value).trim()==="")return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=10000?Math.round(n*100):null;};
export function limitAnte({potCents,capCents,anteCents,playerCount}){
 if(!Number.isSafeInteger(capCents)||capCents<=0||!Number.isInteger(playerCount)||playerCount<=0)throw Error("Invalid pot cap");
 return Math.max(0,Math.min(anteCents,Math.floor((capCents-Math.min(potCents,capCents))/playerCount)));
}
export function capGutsResult(result,{potCents,capCents,anteCents}){
 if(!result||!Number.isSafeInteger(capCents)||capCents<=0)throw Error("Invalid settlement");
 if(result.kind==="all-drop"){
   const perPerson=limitAnte({potCents,capCents,anteCents,playerCount:result.delta.length});
   return {...result,nextPot:Math.min(capCents,potCents+perPerson*result.delta.length),delta:result.delta.map(()=>-perPerson),message:result.message+(perPerson<anteCents?" Pot cap limited the added antes.":"")};
 }
 if(result.kind!=="drag"||result.winner==null)return result;
 const losers=result.entered.filter(i=>i!==result.winner);
 if(!losers.length)return result;
 // Equal, deterministic limited liability per loser. Preserve chips == purse.
 const perLoser=Math.min(potCents,Math.floor(capCents/losers.length));
 return {...result,nextPot:perLoser*losers.length,delta:result.delta.map((_,i)=>i===result.winner?potCents:losers.includes(i)?-perLoser:0),matchingAmountCents:perLoser,message:result.message+(perLoser<potCents?" Pot cap reduced each losing holder's replacement to "+(perLoser/100).toFixed(2)+".":"")};
}
export function rebuyChips(stacks,index,amountCents){
 if(!Array.isArray(stacks)||!Number.isInteger(index)||index<0||index>=stacks.length||!Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>1000000)throw Error("Invalid rebuy");
 return stacks.map((n,i)=>i===index?n+amountCents:n);
}
export function pickPracticeBotChoice(hand,round,style="balanced",random=Math.random){
 // Compare actual hand rank to its category; stronger cards justify more holding.
 // Three-card pairing/wilds increases the hold rate; avoid fixed 60% for every bot.
 const strong=hand?.some(c=>c.rank===[3,5,7][round])||new Set(hand?.map(c=>c.rank)).size<(hand?.length||0);
 const base={cautious:0.23,balanced:0.39,aggressive:0.65}[style]??0.39;
 const chance=Math.max(0.08,Math.min(0.87,base+(strong?0.20:-0.06)));
 return Number(random())<chance?"hold":"drop";
}

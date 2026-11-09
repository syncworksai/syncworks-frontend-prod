// Virtual-chip safeguards for the local SyncWorks poker session.
// A pot cap is a HARD central-purse limit: never mint chips or let pot exceed it.
export const centsFromDollars=value=>{if(String(value).trim()==="")return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=10000?Math.round(n*100):null;};
export function limitAnte({potCents,capCents,anteCents,playerCount}){
 if(!Number.isSafeInteger(capCents)||capCents<=0||!Number.isInteger(playerCount)||playerCount<=0)throw Error("Invalid pot cap");
 return Math.max(0,Math.min(anteCents,Math.floor((capCents-Math.min(potCents,capCents))/playerCount)));
}
// All chip amounts are virtual cents. Never debit a stack below zero.
// At a full cap the next qualifying pot winner takes it; no replacement pot.
export function fundedReplacement({losers,stacks,potCents,capCents}){
 if(!Array.isArray(stacks))throw Error("Missing chip stacks");
 const funds=losers.map(i=>Math.max(0,Math.floor(stacks[i]??0)));
 const capRoom=Math.max(0,capCents);
 const wanted=Math.min(potCents,losers.length?Math.floor(capRoom/losers.length):0);
 const perLoser=Math.max(0,Math.min(wanted,...funds));
 return {perLoser,contributions:losers.map(i=>({seat:i,cents:perLoser}))};
}
export function capGutsResult(result,{potCents,capCents,anteCents,stacks}){
 if(!result||!Number.isSafeInteger(capCents)||capCents<=0||!Array.isArray(stacks))throw Error("Invalid settlement");
 if(result.kind==="all-drop"){
   // Ante is collected once, when the following hand is dealt.
   return {...result,nextPot:potCents,delta:result.delta.map(()=>0),
    message:potCents>=capCents?"Pot cap reached. No more antes; deal until there is a qualifying winner.":"Everyone dropped. Pot carries; next hand collects antes once."};
 }
 if(result.kind!=="drag"||result.winner==null)return result;
 const losers=result.entered.filter(i=>i!==result.winner);
 if(potCents>=capCents){
   return {...result,nextPot:0,delta:result.delta.map((_,i)=>i===result.winner?potCents:0),matchingAmountCents:0,capFinal:true,
    message:"Pot cap reached: winner drags "+(potCents/100).toFixed(2)+". No additional matching. Next dealer chooses a game."};
 }
 const {perLoser}=fundedReplacement({losers,stacks,potCents,capCents});
 return {...result,nextPot:perLoser*losers.length,
   delta:result.delta.map((_,i)=>i===result.winner?potCents:losers.includes(i)?-perLoser:0),
   matchingAmountCents:perLoser,
   message:result.message+(perLoser<potCents?" Replacement limited to available virtual chips and the pot cap.":"")};
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

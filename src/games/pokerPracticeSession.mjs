// Virtual-chip accounting. Amounts are in cents, wagered in quarter-chip units.
// Debts are allowed at settlement but never permit a negative-balance seat to
// enter the NEXT hand before a human rebuys. Bots never rebuy.
export const CHIP_UNIT=25;
export const roundChip=value=>Math.round(value/CHIP_UNIT)*CHIP_UNIT;
export const centsFromDollars=value=>{
 if(String(value).trim()==="")return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>=0&&n<=10000?roundChip(Math.round(n*100)):null;
};
export function limitAnte({potCents,capCents,anteCents,playerCount}){
 if(!Number.isSafeInteger(capCents)||capCents<=0||!Number.isInteger(playerCount)||playerCount<=0)throw Error("Invalid pot cap");
 const room=Math.max(0,capCents-Math.min(potCents,capCents));
 return Math.max(0,roundChip(Math.min(anteCents,Math.floor(room/playerCount)/CHIP_UNIT*CHIP_UNIT)));
}
export function fundedReplacement({losers,stacks,potCents,capCents}){
 if(!Array.isArray(stacks))throw Error("Missing chip stacks");
 // Losing holders incur the full liability. Cap applies to the CENTER pot,
 // not to each player's debt. Surplus from capped rounds goes to the winner.
 const match=roundChip(Math.max(0,potCents));
 return {perLoser:match,contributions:losers.map(i=>({seat:i,cents:match}))};
}
export function capGutsResult(result,{potCents,capCents,anteCents,stacks}){
 if(!result||!Number.isSafeInteger(capCents)||capCents<=0||!Array.isArray(stacks))throw Error("Invalid settlement");
 if(result.kind==="all-drop"){
  // Ante is charged only when the following fresh hand is dealt.
  return {...result,nextPot:potCents,delta:result.delta.map(()=>0),matchingAmountCents:0,
   message:potCents>=capCents?"Pot cap reached; no more antes. Everyone can compete for the same capped pot.":"Everyone dropped. Pot carries; next hand collects antes once."};
 }
 if(result.kind!=="drag"||result.winner==null)return result;
 const losers=result.entered.filter(i=>i!==result.winner);
 const match=roundChip(potCents);
 const total=match*losers.length;
 const nextPot=Math.min(capCents,total);
 const bonus=Math.max(0,total-nextPot);
 return {...result,nextPot,
  delta:result.delta.map((_,i)=>i===result.winner?potCents+bonus:losers.includes(i)?-match:0),
  matchingAmountCents:match,bonusToWinnerCents:bonus,
  message:"Winner takes "+(potCents/100).toFixed(2)+" from the pot; each losing holder owes "+(match/100).toFixed(2)+
   ". "+(bonus?"Pot cap holds "+(nextPot/100).toFixed(2)+"; "+(bonus/100).toFixed(2)+" excess paid directly to winner.":"Losers replenish the next pot.")+
   " Unpaid balances may go negative and require a rebuy before the next hand."};
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

// FYB: three virtual chips, three strikes. A loss is not a contribution to a growing pot.
// Seats are stable; eliminated players sit out, and the dealer rotates among survivors.
export const FYB_STRIKES=3;
export function fybOrder(active,dealer){
 if(active.length<1)return [];
 const d=active.includes(dealer)?dealer:active.find(i=>i>dealer)??active[0];
 const at=active.indexOf(d);
 return [...active.slice(at+1),...active.slice(0,at+1)];
}
export function fybRound({hands,active,losses,chipCents}){
 if(!Number.isSafeInteger(chipCents)||chipCents<=0||!Array.isArray(active)||active.length<2)throw Error("Invalid FYB table");
 const low=Math.min(...active.map(i=>hands[i]?.[0]?.rank??Infinity));
 if(!Number.isFinite(low))throw Error("Missing FYB cards");
 const losers=active.filter(i=>hands[i][0].rank===low);
 const nextLosses=losses.map((loss,i)=>Math.min(FYB_STRIKES,loss+(losers.includes(i)?1:0)));
 const eliminated=active.filter(i=>nextLosses[i]>=FYB_STRIKES&&losses[i]<FYB_STRIKES);
 const survivors=active.filter(i=>nextLosses[i]<FYB_STRIKES);
 return {low,losers,nextLosses,eliminated,survivors,winner:survivors.length===1?survivors[0]:null,roundLosses:losers.map(i=>({seat:i,cents:chipCents})),gameOver:survivors.length<=1};
}
export function fybNextDealer(active,previous){
 if(active.length<1)return previous;
 return active.find(i=>i>previous)??active[0];
}
export function fybSwap({hands,deck,actor,next,pass,playerName,nextName}){
 const updated=hands.map(cards=>[...cards]);const remaining=[...deck];
 const before=updated[actor]?.[0];
 if(!before)throw Error("Missing FYB actor card");
 if(!pass)return {hands:updated,deck:remaining,event:playerName+" kept their card.",kind:"keep",before,after:before};
 if(next==null){const drawn=remaining.shift();if(drawn)updated[actor]=[drawn];return {hands:updated,deck:remaining,event:drawn?playerName+" drew a replacement card from the deck.":playerName+" kept their card (deck empty).",kind:drawn?"draw":"keep",before,after:updated[actor][0]};}
 const neighbor=updated[next]?.[0];if(!neighbor)throw Error("Missing FYB neighbor card");
 if(neighbor.rank===13)return {hands:updated,deck:remaining,event:nextName+"'s King blocked "+playerName+"'s pass. The card stays with "+playerName+".",kind:"blocked",before,after:before};
 updated[actor]=[neighbor];updated[next]=[before];
 return {hands:updated,deck:remaining,event:playerName+" passed left to "+nextName+" and swapped cards.",kind:"swap",before,after:neighbor,nextBefore:neighbor,nextAfter:before};
}

// The dealer enters a player's TOTAL maximum FYB liability, not the chip face value.
// A total stake must divide evenly into three whole-cent chips.
export function fybStakeFromTotal(totalCents){
 if(!Number.isSafeInteger(totalCents)||totalCents<3||totalCents%FYB_STRIKES!==0)return null;
 return {totalCents,chipCents:totalCents/FYB_STRIKES,strikes:FYB_STRIKES};
}

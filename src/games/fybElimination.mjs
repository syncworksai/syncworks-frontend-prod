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

// Kings reveal publicly when their seat is reached or they block an incoming pass.
// Only keep a public King visible while its owner actually holds that King.
export function fybRevealKing(current,hands,seat){
 const card=hands?.[seat]?.[0];
 if(card?.rank!==13)return current;
 if(current?.[seat]?.rank===13&&current[seat].suit===card.suit)return current;
 return {...current,[seat]:card};
}
export function fybCurrentKings(revealed,hands){
 return Object.entries(revealed||{}).filter(([seat])=>hands?.[Number(seat)]?.[0]?.rank===13)
  .map(([seat])=>({seat:Number(seat),card:hands[Number(seat)][0]}));
}

// A FYB game uses one shuffled deck until exhausted. Cards dealt in older hands
// are discarded, not reinserted. When the draw pile is empty, a fresh deck enters.
export function fybDealFromShoe({deck,active,playerCount,newDeck}){
 if(!Array.isArray(deck)||!Array.isArray(active)||!Number.isInteger(playerCount)||!newDeck)throw Error("Invalid FYB shoe");
 let remaining=[...deck],replacements=0;
 const hands=Array.from({length:playerCount},()=>[]);
 for(const seat of active){
  if(remaining.length===0){remaining=newDeck();replacements++;}
  const card=remaining.shift();
  if(!card)throw Error("Empty replacement deck");
  hands[seat]=[card.rank===14?{...card,rank:1}:card];
 }
 return {hands,deck:remaining,newDeckCount:replacements};
}
export function fybDealerDraw({hands,deck,actor,newDeck}){
 let remaining=[...deck],replacements=0;
 if(remaining.length===0){remaining=newDeck();replacements++;}
 const card=remaining.shift();
 if(!card)throw Error("Empty replacement deck");
 const updated=hands.map(h=>[...h]);
 updated[actor]=[card.rank===14?{...card,rank:1}:card];
 return {hands:updated,deck:remaining,newDeckCount:replacements};
}
// Lose one fixed-denomination chip to the shared FYB purse. Once the last
// survivor is known, award the entire purse and leave no unclaimed FYB pot.
export function fybPayRound({stacks,potCents,losers,chipCents,winner=null}){
 if(!Array.isArray(stacks)||!Number.isSafeInteger(potCents)||potCents<0||!Number.isSafeInteger(chipCents)||chipCents<0)throw Error("Invalid FYB accounting");
 const paid=losers.length*chipCents;
 const purse=potCents+paid;
 const next=stacks.map((n,i)=>n-(losers.includes(i)?chipCents:0)+(i===winner?purse:0));
 return {stacks:next,potCents:winner===null?purse:0,dragCents:winner===null?0:purse,paidCents:paid};
}

// A split is available only while exactly two eligible players remain.
// Each player's affirmative vote must be recorded before any chips move.
export function fybSplitPurse({stacks,potCents,seats,approvals}){
 if(!Array.isArray(stacks)||!Array.isArray(seats)||seats.length!==2||seats[0]===seats[1]||!seats.every(i=>Number.isInteger(i)&&i>=0&&i<stacks.length))throw Error("Split requires exactly two eligible seats");
 if(!Number.isSafeInteger(potCents)||potCents<=0)throw Error("No FYB purse available to split");
 if(!seats.every(i=>approvals?.[i]===true))throw Error("Both players must approve");
 const ordered=[...seats].sort((a,b)=>a-b);
 const first=Math.ceil(potCents/2),second=Math.floor(potCents/2);
 const payouts={[ordered[0]]:first,[ordered[1]]:second};
 const nextStacks=stacks.map((amount,i)=>amount+(payouts[i]??0));
 return {stacks:nextStacks,potCents:0,payouts,splitCents:potCents};
}

// A FYB virtual player acts only on its own currently held card and whether
// that card improved from a previous exchange. Never inspect the next seat's
// hidden card or future deck cards to decide.
export function fybBotWantsPass({card,previousCard=null,random=Math.random}){
 if(!card||!Number.isInteger(card.rank))throw Error("Missing virtual player's FYB card");
 const rank=card.rank===14?1:card.rank;
 if(rank===13)return false; // Kings trump and cannot be improved by a swap.
 let probability=rank<=2?.92:rank===3?.78:rank===4?.7:rank<=6?.58:rank<=8?.42:rank<=10?.25:.12;
 const previousRank=previousCard?.rank===14?1:previousCard?.rank;
 // A bot that improved from a 2 to a 3 should usually keep its improvement.
 if(Number.isInteger(previousRank)&&rank>previousRank)probability=Math.min(probability,.22);
 return random()<probability;
}

// Private view belongs to the local seat, never to the moving action cursor.
// In this local practice table, the first human seat is the device owner.
// Remote multiplayer will resolve this from the authenticated seat identity.
export function fybLocalSeat(players){
 return Array.isArray(players)?players.findIndex(p=>p?.kind!=="computer"):-1;
}
export function canRevealOwnFybCard({viewerSeat,localSeat,players}){
 return Number.isInteger(localSeat)&&localSeat>=0
   &&players?.[localSeat]?.kind!=="computer"
   &&viewerSeat===localSeat;
}

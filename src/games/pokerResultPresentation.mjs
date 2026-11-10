// Shared compact result descriptors across the Card Console poker variants.
// No result banner should invent a winning player in carry-over or tie rounds.
const RANKS={2:"Twos",3:"Threes",4:"Fours",5:"Fives",6:"Sixes",7:"Sevens",8:"Eights",9:"Nines",10:"Tens",11:"Jacks",12:"Queens",13:"Kings",14:"Aces"};
const SINGLE={2:"Two",3:"Three",4:"Four",5:"Five",6:"Six",7:"Seven",8:"Eight",9:"Nine",10:"Ten",11:"Jack",12:"Queen",13:"King",14:"Ace"};
export const rankPlural=n=>RANKS[n]||"Unknown";
export const describeRankedHand=hand=>{
 if(!hand||!hand.name)return "Winning hand";
 const k=hand.kickers||[];
 switch(hand.name.toLowerCase()){
  case "five of a kind":return "Five of a kind · "+rankPlural(k[0]);
  case "four of a kind":return "Four of a kind · "+rankPlural(k[0]);
  case "full house":return "Full house · "+rankPlural(k[0])+" over "+rankPlural(k[1]);
  case "three of a kind":return "Three of a kind · "+rankPlural(k[0]);
  case "two pair":return "Two pair · "+rankPlural(k[0])+" and "+rankPlural(k[1]);
  case "pair":return "Pair of "+rankPlural(k[0]);
  case "straight flush":return "Straight flush · "+(SINGLE[k[0]]||"")+(k[0]?" high":"");
  case "straight":return "Straight · "+(SINGLE[k[0]]||"")+(k[0]?" high":"");
  case "flush":return "Flush"+(k[0]?" · "+SINGLE[k[0]]+" high":"");
  case "high card":return "High card · "+(SINGLE[k[0]]||"Unknown");
  default:return hand.name;
 }
};
export function describePokerResult({variant,outcome,players=[],hands=[],clownResult=null,bozoResult=null,fybSettlement=null}){
 if(!outcome)return null;
 const name=i=>players[i]?.name||"Player";
 if(variant==="bozo"){
  if(outcome.kind==="all-drop")return {title:"Everyone dropped",detail:"No winner · pot carries forward",winner:false};
  if(outcome.kind==="tie-review")return {title:"Tied hands · dealer review",detail:"No chips awarded",winner:false};
  if(outcome.kind==="clown-win")return {title:"🤡 The Clown wins",detail:(clownResult?describeRankedHand(clownResult)+" · ":"")+"Pot carries · "+(outcome.message||""),winner:true};
  if(outcome.kind==="player-win"&&outcome.winner!=null){
   const ranked=bozoResult?.playerHands?.find(x=>x.i===outcome.winner)?.hand;
   return {title:"🏆 WINNER · "+name(outcome.winner),detail:(ranked?describeRankedHand(ranked)+" · ":"")+"Dragged "+formatChips(outcome.amount||0)+" · "+(outcome.losers?.length||0)+" other holder(s) replace pot",winner:true};
  }
 }
 if(variant==="442"){
  if(outcome.kind==="drag"&&outcome.winner!=null)return {title:"🏆 WINNER · "+name(outcome.winner),detail:describeRankedHand(outcome.hand)+" · Dragged "+formatChips(outcome.delta?.[outcome.winner]||0)+" · "+(outcome.losers?.length||0)+" other holder(s) replace pot",winner:true};
  if(outcome.kind==="all-drop")return {title:"Everyone dropped",detail:"No winner · pot carries forward",winner:false};
  if(outcome.kind==="no-natural-pair")return {title:"No qualifying winner",detail:"Lone holder needs a natural pair · pot carries",winner:false};
  if(outcome.kind==="tie-review")return {title:"Tied hands · dealer review",detail:"No automatic payout",winner:false};
 }
 if(variant==="fyb"){
  if(outcome.split)return {title:"🤝 Agreed split",detail:outcome.message||"Remaining players split purse",winner:true};
  if(outcome.winner!=null){
   const card=hands[outcome.winner]?.[0];
   const face=card?(SINGLE[card.rank]||card.rank)+" "+card.suit:"";
   return {title:"🏆 FYB WINNER · "+name(outcome.winner),detail:"Last player standing"+(face?" · Final card: "+face:"")+" · Dragged "+formatChips(outcome.dragCents||0),winner:true};
  }
  const losers=fybSettlement?.losers||outcome.losers||[];
  return {title:"FYB hand settled",detail:losers.length?"Lowest: "+losers.map(i=>name(i)).join(", ")+" · "+(outcome.message||""):(outcome.message||"No payout yet"),winner:false};
 }
 return {title:"Hand settled",detail:outcome.message||"",winner:false};
}
const formatChips=cents=>"$"+(cents/100).toFixed(2);

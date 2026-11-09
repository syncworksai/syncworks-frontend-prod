import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Eye,EyeOff,Info,RotateCcw,ChevronRight} from "lucide-react";
import {createShuffledDeck,displayMoney} from "../games/drop357Table.mjs";
import {evaluateBozoHand,resolveBozoRound} from "../games/bozoRules.mjs";
import {score442,naturalPair442,replace442,settle442,botExchange442} from "../games/fourFourDeuce.mjs";
import {capGutsResult,limitAnte,rebuyChips,centsFromDollars,pickPracticeBotChoice,fundedReplacement} from "../games/pokerPracticeSession.mjs";
import {readCardNight,saveCardNight,clearCardNight} from "../games/cardNightTransfer.mjs";
import PokerSessionBar from "../components/poker/PokerSessionBar";
import {getCardRoom} from "../api/cardRooms";
import {fybOrder,fybRound,fybNextDealer,fybSwap,fybStakeFromTotal,fybRevealKing,fybCurrentKings,fybDealFromShoe,fybDealerDraw,fybPayRound,fybSplitPurse,fybBotWantsPass,fybLocalSeat,canRevealOwnFybCard} from "../games/fybElimination.mjs";
import "./CustomerPokerTable.css";

const GAMES={fyb:{title:"FYB",tag:"Kings trump · Aces low"},442:{title:"4/4/Deuce",tag:"4 cards · 4s wild · Draw up to 3"},bozo:{title:"Bozo · The Clown",tag:"Beat the ghost hand"}, "queen-follower":{title:"Queen & the Follower",tag:"Dynamic stud wilds"}};
const SYMBOL={1:"A",11:"J",12:"Q",13:"K",14:"A"};
const label=c=>!c?"":(SYMBOL[c.rank]||c.rank)+c.suit;
function PokerCard({c,hidden=false,wild=false}){if(!c)return <span className="sw-poker-card back">♠</span>;return <div className={"sw-poker-card"+(hidden?" back":["♥","♦"].includes(c.suit)?" red":"")}><strong>{hidden?"S":label(c)}</strong><b>{hidden?"♠":c.suit}</b>{wild&&!hidden&&<small>WILD</small>}</div>}
function localDeal(game,count,size=5){
 const deck=createShuffledDeck();if(game==="fyb"){const cards=deck.map(c=>({...c,rank:c.rank===14?1:c.rank}));return {hands:Array.from({length:count},(_,i)=>[cards[i]]),deck:cards.slice(count),clown:[]};}
 const handSize=game==="442"?4:size;
 const hands=Array.from({length:count},(_,i)=>deck.slice(i*handSize,(i+1)*handSize));
 return {hands,deck:deck.slice(game==="bozo"?(count+1)*size:count*handSize),clown:game==="bozo"?deck.slice(count*size,(count+1)*size):[]};
}
const cents=x=>Math.round(Number(x)*100);
export default function CustomerPokerVariantTable({variant:providedVariant}){
 const [query]=useSearchParams(),nav=useNavigate();
 const variant=providedVariant||query.get("game")||"fyb";
 const game=GAMES[variant]||GAMES.fyb;
 const groupId=query.get("group")||"",roomId=query.get("room")||"";
 const [players,setPlayers]=useState([]),[stacks,setStacks]=useState([]),[dealer,setDealer]=useState(0),[pot,setPot]=useState(0),[gameNumber,setGameNumber]=useState(1);
 const [ante,setAnte]=useState(variant==="fyb"?"1.50":query.get("ante")||"0.25"),[cap,setCap]=useState("50"),[step,setStep]=useState("loading");
 const [hands,setHands]=useState([]),[clown,setClown]=useState([]),[deck,setDeck]=useState([]),[decisions,setDecisions]=useState([]),[viewer,setViewer]=useState(null),[outcome,setOutcome]=useState(null),[log,setLog]=useState([]);
 const [drawer,setDrawer]=useState(false),[tab,setTab]=useState("hands"),[rebuy,setRebuy]=useState(false),[rebuySeat,setRebuySeat]=useState(0),[rebuyAmount,setRebuyAmount]=useState("20"),[status,setStatus]=useState("");
 const [fybTurn,setFybTurn]=useState(0),[fybSettlement,setFybSettlement]=useState(null),[draw442Turn,setDraw442Turn]=useState(0),[draw442Selected,setDraw442Selected]=useState([]),[showdown442,setShowdown442]=useState(null),[followers,setFollowers]=useState([]),[pendingFollower,setPendingFollower]=useState(false),[street,setStreet]=useState(0);
 const [dealerPick,setDealerPick]=useState(false),[fybLosses,setFybLosses]=useState([]),[fybHandNumber,setFybHandNumber]=useState(0),[fybLastMove,setFybLastMove]=useState(null),[fybActions,setFybActions]=useState({}),[fybAnimating,setFybAnimating]=useState(false),[fybAwaitNext,setFybAwaitNext]=useState(false),[fybRevealedKings,setFybRevealedKings]=useState({}),[fybDeckNumber,setFybDeckNumber]=useState(0),[fybDeckFlash,setFybDeckFlash]=useState(false),[splitOpen,setSplitOpen]=useState(false),[splitApprovals,setSplitApprovals]=useState({}),[splitDeclined,setSplitDeclined]=useState(""),[fybPreviousCard,setFybPreviousCard]=useState({});
 const maxCents=variant==="fyb"?1000000:cents(cap),fybStake=variant==="fyb"?fybStakeFromTotal(cents(ante)):null,anteCents=variant==="fyb"?(fybStake?.chipCents??NaN):cents(ante),index=players.length;
 const currentIndex=useMemo(()=>decisions.findIndex(v=>v===null),[decisions]);
 const fybActive=players.map((_,i)=>i).filter(i=>(fybLosses[i]??0)<3);
 const fybSeatCoords=[{x:"21%",y:"9%"},{x:"50%",y:"-1%"},{x:"79%",y:"9%"},{x:"80%",y:"88%"},{x:"50%",y:"103%"},{x:"20%",y:"88%"}];
 const order=useMemo(()=>variant==="fyb"?fybOrder(fybActive,dealer):players.map((_,i)=>(dealer+1+i)%players.length),[dealer,players,variant,fybLosses]);
 const activeIndex=variant==="fyb"?(order[fybTurn]??-1):variant==="442"&&step==="442-draw"?(order[draw442Turn]??-1):(currentIndex<0?-1:currentIndex);
 const fybDealerTurn=variant==="fyb"&&step==="fyb"&&activeIndex===dealer;
 const currentPlayer=players[activeIndex];
 const localSeat=fybLocalSeat(players);
 const activeCards=variant==="fyb"?null:variant==="442"&&step==="442-draw"?hands[activeIndex]:(viewer===activeIndex?hands[activeIndex]:null);
 const ownFybCards=variant==="fyb"&&canRevealOwnFybCard({viewerSeat:viewer,localSeat,players})?hands[localSeat]:null;
 const potFull=pot>=maxCents;
 const botCount=players.filter(p=>p.kind==="computer").length;
 const nextGameUrl="/customer/games/table?"+new URLSearchParams({group:groupId,room:roomId,resumeGame:"1"}).toString();
 const record=(message)=>setLog(v=>[{id:Date.now()+Math.random(),message},...v].slice(0,45));
 useEffect(()=>{let mounted=true;
  const saved=readCardNight(groupId,roomId);
  if(saved){setPlayers(saved.people);setStacks(saved.stacks);setDealer(saved.dealer??0);setPot(saved.pot??0);setCap(String((saved.capCents??5000)/100));setGameNumber(saved.gameNumber??1);setStep("ready");return()=>{mounted=false;};}
  if(roomId){getCardRoom(roomId).then(r=>{if(!mounted)return;const ps=r.seats?.map((p,i)=>({id:String(p.id??i),name:p.name||p.nickname||"Player "+(i+1),kind:p.is_computer?"computer":"human",chips:p.virtual_chips_cents??2000}))||[];setPlayers(ps);setStacks(ps.map(p=>p.chips));setStep("ready");}).catch(()=>{if(mounted){setStatus("Could not load room. Return to your poker lobby.");setStep("ready");}});}
  else {const p=[{id:"you",name:"You",kind:"human",chips:2000},{id:"bot",name:"Virtual Player 1",kind:"computer",chips:2000}];setPlayers(p);setStacks(p.map(x=>x.chips));setStep("ready");}
  return()=>{mounted=false;};
 },[groupId,roomId]);
 function store(nextStacks=stacks,nextPot=pot,nextDealer=dealer,nextGame=gameNumber){
  saveCardNight({groupId,roomId,people:players,stacks:nextStacks,pot:nextPot,dealer:nextDealer,gameNumber:nextGame,capCents:maxCents});
 }
 function quitToDealer(){
  const next=(dealer+1)%players.length;
  store(stacks,pot,next,gameNumber+1);
  nav(nextGameUrl);
 }
 function endLocalSession(){
  clearCardNight();
  setViewer(null);setHands([]);setDeck([]);setFybLastMove(null);
  nav(groupId?"/customer/games/clubs?group="+encodeURIComponent(groupId):"/customer/games");
 }
 function startSplitOffer(){
  if(variant!=="fyb"||step!=="result"||outcome?.gameFinished||fybActive.length!==2||pot<=0)return;
  setSplitApprovals({});setSplitDeclined("");setSplitOpen(true);setViewer(null);
 }
 function respondToSplit(seat,agree){
  if(!splitOpen||variant!=="fyb"||step!=="result"||fybActive.length!==2||pot<=0)return;
  if(!fybActive.includes(seat))return;
  if(!agree){
   setSplitDeclined(players[seat].name+" declined. The game continues normally.");
   setSplitOpen(false);setSplitApprovals({});
   record(players[seat].name+" declined a FYB pot split. No chips moved.");
   return;
  }
  const approvals={...splitApprovals,[seat]:true};
  setSplitApprovals(approvals);
  if(!fybActive.every(i=>approvals[i]===true))return;
  try{
   const split=fybSplitPurse({stacks,potCents:pot,seats:fybActive,approvals});
   setStacks(split.stacks);setPot(0);
   const names=fybActive.map(i=>players[i].name+" receives "+displayMoney(split.payouts[i]));
   const message="🤝 Split approved by both players · "+names.join(" · ")+". FYB complete.";
   setOutcome({message,gameFinished:true,split:true,dragCents:split.splitCents,payouts:split.payouts});
   setSplitOpen(false);setSplitDeclined("");
   record(message);
  }catch(err){setStatus(err.message||"Split could not be completed; chips were not moved.");setSplitOpen(false);}
 }
 function askVirtualSplit(seat){
  // Virtual opponents respond independently; no real person's vote is fabricated.
  if(players[seat]?.kind!=="computer")return;
  const accept=Math.random()<0.7;
  respondToSplit(seat,accept);
 }
 function takeAnte(){
  const actual=limitAnte({potCents:pot,capCents:maxCents,anteCents,playerCount:players.length});
  if(stacks.some((v,i)=>players[i].kind!=="computer"&&v<actual)){setStatus("A player needs a rebuy before dealing.");setRebuy(true);return false;}
  const nextStacks=stacks.map((v,i)=>v+(players[i].kind==="computer"&&v<actual?2000:0)-actual);
  setStacks(nextStacks);setPot(v=>v+actual*players.length);
  return true;
 }
 function deal(){
  if(players.length<2||players.length>6){setStatus("Choose a table with 2–6 seated players.");return;}
  if(!Number.isInteger(maxCents)||maxCents<=0||!Number.isInteger(anteCents)||anteCents<=0||anteCents>1000000){setStatus(variant==="fyb"?"Choose a total FYB stake divisible into three whole-cent chips (e.g., $1.50 or $3.00).":"Choose valid ante and pot amounts.");return;}
  if(variant!=="fyb"&&!takeAnte())return;
  const draft=variant==="fyb"?{hands:[],deck:[],clown:[]}:localDeal(variant,players.length);
  if(variant==="fyb"){
   const next=fybActive.filter(i=>i>=0);
   if(next.length<2){setStatus("FYB is over. Pass the dealer to select another game.");return;}
   const first=fybOrder(next,dealer);
   const dealt=fybDealFromShoe({deck,active:first,playerCount:players.length,newDeck:createShuffledDeck});
   draft.hands=dealt.hands;draft.deck=dealt.deck;
   if(dealt.newDeckCount){setFybDeckNumber(n=>n+dealt.newDeckCount);setFybDeckFlash(true);record("New 52-card deck opened · previous used cards discarded.");}
   setSplitOpen(false);setSplitApprovals({});setSplitDeclined("");setFybSettlement(null);setFybPreviousCard({});setFybHandNumber(n=>n+1);setFybLastMove(null);setFybActions({});setFybAnimating(false);setFybAwaitNext(false);setFybRevealedKings({});
  }
  setHands(draft.hands);setDeck(draft.deck);setClown(draft.clown);
  if(variant==="442"){setDraw442Turn(0);setDraw442Selected([]);setShowdown442(null);}
  setViewer(variant==="fyb"?fybLocalSeat(players):null);setOutcome(null);setFybTurn(0);setFollowers([]);setPendingFollower(false);setStreet(0);
  setDecisions(players.map(p=>p.kind==="computer"&&variant!=="bozo"&&variant!=="442"?(Math.random()<0.38?"hold":"fold"):null));
  if(variant==="fyb")setStep("fyb");
  else if(variant==="442")setStep("442-draw");
  else if(variant==="queen-follower"){setHands(players.map(()=>[]));setDeck(createShuffledDeck());setStep("stud");}
  else setStep("deciding");
  record("Cards dealt for "+game.title+". Virtual chips only.");
 }
 function finishFybRound(finalHands){
  const roundResult=fybRound({hands:finalHands,active:fybActive,losses:players.map((_,i)=>fybLosses[i]||0),chipCents:anteCents});
  setFybLosses(roundResult.nextLosses);
  // Fixed chip losses accumulate in one FYB purse, NOT match-the-pot compounding.
  // At elimination the final survivor drags every paid chip. Other game pots are unaffected.
  const payout=fybPayRound({stacks,potCents:pot,losers:roundResult.losers,chipCents:anteCents,winner:roundResult.winner});
  setStacks(payout.stacks);setPot(payout.potCents);
  setFybSettlement({nonce:Date.now(),active:[...fybActive],losers:roundResult.losers,low:roundResult.low,beforeStacks:[...stacks],afterStacks:[...payout.stacks],paidCents:anteCents,purseBefore:pot,purseAfter:payout.potCents,winner:roundResult.winner});
  const loserNames=roundResult.losers.map(i=>players[i].name);
  const elimNames=roundResult.eliminated.map(i=>players[i].name);
  const message=loserNames.join(", ")+" had the lowest card ("+(SYMBOL[roundResult.low]||roundResult.low)+") · each loses 1 chip ("+displayMoney(anteCents)+")."+
   (elimNames.length?" Eliminated: "+elimNames.join(", ")+".":"")+
   (roundResult.winner!==null?" 🏆 "+players[roundResult.winner].name+" DRAGS "+displayMoney(payout.dragCents)+" and wins FYB!":
    roundResult.gameOver?" All remaining players were eliminated together; dealer review required.":"");
  setOutcome({message,losers:roundResult.losers,eliminated:roundResult.eliminated,winner:roundResult.winner,dragCents:payout.dragCents,gameFinished:roundResult.gameOver});
  setStep("result");
  setFybAnimating(false);
  record(message);
 }
 // FYB is pass/keep with a King blocking an incoming swap. Dealer may draw off the deck.
 function fybAction(pass){
  if(step!=="fyb"||fybTurn>=order.length||fybAnimating||fybAwaitNext)return;
  const actor=order[fybTurn],next=order[fybTurn+1];
  let moved;
  if(next==null&&pass){
   const draw=fybDealerDraw({hands,deck,actor,newDeck:createShuffledDeck});
   if(draw.newDeckCount){setFybDeckNumber(n=>n+draw.newDeckCount);setFybDeckFlash(true);record("New 52-card deck opened for dealer's draw.");}
   moved={...draw,kind:"draw",event:players[actor].name+" drew a replacement card from the deck."};
  }else moved=fybSwap({hands,deck,actor,next,pass,playerName:players[actor].name,nextName:next==null?"Dealer":players[next].name});
  setHands(moved.hands);setDeck(moved.deck);if(variant!=="fyb")setViewer(null);
  if(moved.kind==="swap"&&next!==undefined)setFybPreviousCard(old=>({...old,[next]:moved.nextBefore}));
  setFybLastMove({seat:actor,to:next??null,kind:moved.kind,event:moved.event,blockedKing:moved.kind==="blocked"?hands[next]?.[0]:null,nonce:Date.now()});
  if(moved.kind==="blocked")setFybRevealedKings(old=>fybRevealKing(old,moved.hands,next));
  setFybActions(old=>({...old,[actor]:moved.kind}));
  setFybAnimating(true);
  record(moved.event);
  if(fybTurn+1<order.length){return;}
  if(players[actor].kind!=="computer"&&moved.kind==="draw"){return;}
  finishFybRound(moved.hands);

 }
 // A seven-card stud demonstration while the advanced wagering/score engine is finished.
 function dealStudStreet(){
  if(step!=="stud")return;
  if(street>=7){setStep("stud-result");return;}
  const copy=deck.slice(),nextHands=hands.map(h=>h.slice()),wilds=[...followers];
  let pending=pendingFollower;
  const faceUp=street>=2&&street<=5;
  players.forEach((p,i)=>{
   const card=copy.shift();nextHands[i].push({...card,faceUp});
   if(faceUp){if(card.rank===12)pending=true;else if(pending){if(!wilds.includes(card.rank))wilds.push(card.rank);pending=false;}}
  });
  setDeck(copy);setHands(nextHands);setFollowers(wilds);setPendingFollower(pending);setStreet(v=>v+1);
  record("Stud street "+(street+1)+" dealt. Visible wild ranks: Q"+(wilds.length?", "+wilds.join(", "):"")+".");
  if(street===6)setStep("stud-result");
 }
 function settleGuts(next){
  const entered=next.flatMap((v,i)=>v==="hold"?[i]:[]);
  const amount=pot;
  if(!entered.length&&variant!=="442"){setOutcome({message:"All players folded. Pot carries forward."});setDecisions(next);setStep("result");return;}
  if(variant==="442"){
   const result=settle442({hands,choices:next,potCents:pot,capCents:maxCents,anteCents,stacks});
   setDecisions(next);
   setShowdown442({...result,nonce:Date.now(),beforeStacks:[...stacks],potBefore:pot});
   if(result.kind==="drag"){
    setStacks(old=>old.map((v,i)=>v+result.delta[i]));
    setPot(result.nextPot);
   }
   setOutcome({...result,gameFinished:result.kind==="drag"&&result.nextPot===0,message:result.kind==="drag"?players[result.winner].name+" wins with "+result.hand.name+" and drags "+displayMoney(pot)+". Losing holders replace "+displayMoney(result.match)+" each.":result.message});
   setStep("result");record(result.message);return;
  }
  const wild=clown[0]?.rank;
  const score=resolveBozoRound({choices:next.map(v=>v==="hold"?"hold":"drop"),hands,clown,wildRank:wild,potCents:amount});
  if(score.kind==="player-win")return settleGutsPay(score.winner,entered,next,amount);
  if(score.kind==="clown-win"){
   const each=pot>=maxCents?0:fundedReplacement({losers:entered,stacks,potCents:amount,capCents:maxCents-pot}).perLoser;
   const paid=stacks.map((v,i)=>v-(entered.includes(i)?each:0));
   setStacks(paid);setPot(pot+each*entered.length);
   setOutcome({message:each===0?"Pot is capped or no chips remain. No further matching is charged; keep dealing until a player beats the Clown.":"The Clown wins! Each holding player matches "+displayMoney(each)+". The ghost never contributes chips."});
  }else setOutcome({message:score.message});
  setDecisions(next);setStep("result");
 }
 function settleGutsPay(winner,entered,next,amount){
  const losers=entered.filter(i=>i!==winner);
  const match=pot>=maxCents?0:fundedReplacement({losers,stacks,potCents:amount,capCents:maxCents}).perLoser;
  const nextStacks=stacks.map((v,i)=>v+(i===winner?amount:losers.includes(i)?-match:0));
  const newPot=match*losers.length;setStacks(nextStacks);setPot(newPot);
  setOutcome({winner,amount,match,losers,gameFinished:newPot===0,message:players[winner].name+" drags "+displayMoney(amount)+". "+(pot>=maxCents?"Pot cap reached; no further matching. New dealer chooses a game.":losers.length+" losing holder(s) replenish "+displayMoney(match)+" each.")});
  setDecisions(next);setStep("result");
 }
 function finish442Exchange(seat,indexes){
  if(variant!=="442"||step!=="442-draw"||activeIndex!==seat)return;
  try{
   const changed=replace442({hands,deck,seat,indexes});
   setHands(changed.hands);setDeck(changed.deck);setDraw442Selected([]);record(players[seat].name+" exchanged "+indexes.length+" card(s).");
   if(draw442Turn+1>=order.length){setStep("deciding");setDecisions(players.map(()=>null));}
   else setDraw442Turn(v=>v+1);
  }catch(e){setStatus(e.message);}
 }
 function chooseHold(choice){
  if(step!=="deciding"||activeIndex<0||currentPlayer?.kind==="computer")return;
  const next=decisions.map((v,i)=>i===activeIndex?choice:v);setDecisions(next);setViewer(null);
  if(next.every(Boolean))settleGuts(next);
 }
 function addRebuy(){
  const n=centsFromDollars(rebuyAmount);if(n==null||n<=0){setStatus("Enter a valid rebuy.");return;}
  setStacks(v=>rebuyChips(v,Number(rebuySeat),n));setRebuy(false);record(players[rebuySeat].name+" rebought "+displayMoney(n)+".");
 }
 // The active player's King turns face-up even when nobody attempted a pass.
 // This also reveals a dealer's King when the deal comes around to the dealer.
 useEffect(()=>{
  if(variant!=="fyb"||step!=="fyb"||activeIndex<0)return;
  if(hands[activeIndex]?.[0]?.rank===13){
   setFybRevealedKings(old=>fybRevealKing(old,hands,activeIndex));
  }
 },[variant,step,activeIndex,hands]);
 useEffect(()=>{if(!fybAnimating||step!=="fyb")return;
  const id=setTimeout(()=>{setFybAnimating(false);if(fybTurn+1<order.length){if(currentPlayer?.kind!=="computer"&&["swap","draw"].includes(fybLastMove?.kind)){setFybAwaitNext(true);}else {setFybTurn(v=>v+1);}}else if(currentPlayer?.kind!=="computer"&&fybLastMove?.kind==="draw"){setFybAwaitNext(true);}},1550);
  return()=>clearTimeout(id);
 },[fybAnimating,fybTurn,step,order,activeIndex,currentPlayer?.kind,fybLastMove?.kind,players]);
 useEffect(()=>{if(step!=="fyb"||fybAnimating||fybAwaitNext||!currentPlayer||currentPlayer.kind!=="computer")return;
  const timer=setTimeout(()=>fybAction(fybBotWantsPass({card:hands[activeIndex]?.[0],previousCard:fybPreviousCard[activeIndex]})),2100);return()=>clearTimeout(timer);
 },[step,fybTurn,hands,players,fybAnimating,fybAwaitNext,fybPreviousCard]);
 // Delay each Bozo bot decision so the player sees the action sequence.
 // No automated opponent receives access to another player's private hand.
 useEffect(()=>{if(variant!=="442"||step!=="442-draw"||currentPlayer?.kind!=="computer")return;
  const id=setTimeout(()=>finish442Exchange(activeIndex,botExchange442(hands[activeIndex]||[])),1100);
  return()=>clearTimeout(id);
 },[variant,step,activeIndex,hands,currentPlayer?.kind]);
 useEffect(()=>{if(variant!=="442"||step!=="deciding"||currentPlayer?.kind!=="computer")return;
  const id=setTimeout(()=>{
   const own=score442(hands[activeIndex]);const hold=own.category>=1&&Math.random()<.77||Math.random()<.08;
   const next=decisions.map((v,i)=>i===activeIndex?(hold?"hold":"fold"):v);
   setDecisions(next);if(next.every(Boolean))settleGuts(next);
  },1200);return()=>clearTimeout(id);
 },[variant,step,activeIndex,hands,currentPlayer?.kind,decisions]);
 useEffect(()=>{if(variant!=="bozo"||step!=="deciding"||activeIndex<0||currentPlayer?.kind!=="computer")return;
  const timer=setTimeout(()=>{
   const own=hands[activeIndex]||[];
   const hasWild=own.some(c=>c.rank===clown[0]?.rank);
   const choice=hasWild||Math.random()<.54?"hold":"fold";
   const next=decisions.map((v,i)=>i===activeIndex?choice:v);
   setDecisions(next);setViewer(null);
   if(next.every(Boolean))settleGuts(next);
  },2000);
  return()=>clearTimeout(timer);
 },[variant,step,activeIndex,decisions,hands,clown,players]);
 useEffect(()=>{if(variant!=="442"||step!=="442-next")return;const id=setTimeout(()=>deal(),650);return()=>clearTimeout(id);},[variant,step,dealer]);
 useEffect(()=>{if(variant!=="fyb"||step!=="fyb-next")return;
  const id=setTimeout(()=>deal(),650);
  return()=>clearTimeout(id);
 },[variant,step,dealer]);
 useEffect(()=>{if(!fybDeckFlash)return;
  const timer=setTimeout(()=>setFybDeckFlash(false),1900);
  return()=>clearTimeout(timer);
 },[fybDeckFlash,fybDeckNumber]);
 const reviewable=step==="result"||step==="stud-result";
 const centered=step==="442-next"?"Next 4/4 hand · Shuffling":step==="442-draw"&&activeIndex>=0?currentPlayer?.name+" · Exchange up to 3":step==="fyb-next"?"Next FYB hand · Shuffling":step==="deciding"&&activeIndex>=0?"Your turn: "+currentPlayer?.name:step==="fyb"&&activeIndex>=0?currentPlayer?.name+"'s turn":step==="stud"?"Stud street "+(street+1):reviewable?"Hand finished":game.tag;
 return <main className={"sw-poker-screen"+(variant==="fyb"&&step==="fyb"?" sw-fyb-play-mode":"")}><div className="sw-poker-content">
  <header className="sw-poker-top"><button type="button" className="sw-poker-back" onClick={()=>{store();nav(nextGameUrl);}}><ArrowLeft size={20}/></button><div className="sw-poker-symbol">S</div><div className="sw-poker-heading"><strong>SYNCWORKS POKER</strong><small>♠ Card Night · {game.title}</small></div><button type="button" className="sw-poker-icon-btn" onClick={()=>{setTab("rules");setDrawer(true)}} aria-label="Game information"><Info size={20}/></button></header>
  <PokerSessionBar players={players} stacks={stacks} groupId={groupId} roomId={roomId} gameNumber={gameNumber} onEnd={endLocalSession}/>
  <div className="sw-poker-round"><div className="sw-poker-round-badge"><div>♠ {game.title}</div><span>{game.tag}</span></div><span className="sw-poker-capsule">♙ {players.length}</span></div>
  {variant==="fyb"&&fybDeckFlash&&<div className="sw-fyb-new-deck-flash" role="status" aria-live="polite">♠ NEW DECK · 52 cards</div>}
  <div className="sw-poker-session-status"><span>♣ Card Night · Game {gameNumber}</span><span>Dealer: {players[dealer]?.name||"Waiting"} · {variant==="fyb"?fybActive.length+" active · "+displayMoney(cents(ante))+" total per player":"Hard cap "+displayMoney(maxCents)}</span></div>
  {status&&<div role="status" className="sw-poker-practice-note">{status}</div>}
  {variant==="fyb"&&splitDeclined&&step==="result"&&<div className="sw-fyb-split-declined" role="status">{splitDeclined}</div>}
  {step==="ready"&&<section className="sw-poker-game-choice sw-fyb-setup-panel">
  <strong>{variant==="fyb"?"♠ Dealer setup · FYB":("Ready for "+game.title)}</strong>
  {variant==="fyb"?<><p>Choose the <b>total stake per player</b> once. Three strikes. Then the table will automatically deal each new hand with the same settings.</p>
   <div className="sw-fyb-setup-fields">
    <label htmlFor="fyb-total-stake">Total per player ($)
     <input id="fyb-total-stake" type="number" step="0.01" min="0.03" value={ante} onChange={e=>setAnte(e.target.value)}/>
    </label>
    <div className="sw-fyb-stake-presets" aria-label="Total stake presets">{["1.50","3.00","6.00"].map(total=><button type="button" key={total} className={ante===total?"selected":""} onClick={()=>setAnte(total)}>$ {total}</button>)}</div>
   </div>
   <div className="sw-fyb-setup-summary"><span>Three chips each</span><strong>{fybStake?displayMoney(fybStake.chipCents)+" per loss":"Enter a total divisible into three chips"}</strong></div>
  </>:<><p>Same SyncWorks table, players and virtual chip balances.</p><div className="sw-fyb-setup-fields"><label>Ante ($)<input type="number" step="0.01" min="0.01" value={ante} onChange={e=>setAnte(e.target.value)}/></label><label>Maximum pot ($)<input type="number" min="1" value={cap} step="0.01" onChange={e=>setCap(e.target.value)}/></label></div></>}
  <button type="button" className="sw-poker-button primary mt-3 w-full" onClick={deal}>♠ Shuffle & Deal {game.title}</button>
 </section>}
  <div className="sw-poker-table-space"><div className="sw-poker-felt"><div className="sw-poker-felt-brand"><i>S</i>SYNCWORKS<br/>POKER</div>{variant==="442"&&step==="result"&&showdown442?.losers.map((seat,index)=><div key={showdown442.nonce+"-"+seat} className={"sw-fyb-chip-flight from-seat-"+seat} style={{"--chip-delay":index*170+"ms"}} aria-hidden="true"><span>●</span><small>−{displayMoney(showdown442.match)}</small></div>)}{variant==="fyb"&&step==="result"&&fybSettlement?.losers.map((seat,index)=><div key={fybSettlement.nonce+"-"+seat} className={"sw-fyb-chip-flight from-seat-"+seat} style={{"--chip-delay":index*180+"ms"}} aria-hidden="true"><span>●</span><small>−{displayMoney(fybSettlement.paidCents)}</small></div>)}<div className="sw-poker-pot"><div className="sw-poker-chip-stack"><span className="sw-poker-chip dark"/><span className="sw-poker-chip blue"/><span className="sw-poker-chip red"/></div><div className="sw-poker-pot-amount">{variant==="fyb"?"FYB Purse: "+displayMoney(pot):"Pot: "+displayMoney(pot)}</div><div className="sw-poker-pot-small">{game.title} · {variant==="fyb"?fybActive.length+" active · "+displayMoney(anteCents)+" / loss · Deck "+fybDeckNumber+" · "+deck.length+" left":"Max "+displayMoney(maxCents)}</div></div>
  {players.map((p,i)=><div className={"sw-poker-seat s"+i+(variant==="fyb"&&(fybLosses[i]??0)>=3?" sw-fyb-out":"")+(variant==="fyb"&&step==="result"&&fybSettlement?.losers.includes(i)?" sw-fyb-lowest-seat":"")} key={p.id}><div className="sw-poker-seat-avatar">{p.kind==="computer"?"🤖":p.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div className="sw-poker-seat-nameplate"><strong>{p.name}</strong><small>◉ {displayMoney(stacks[i]??p.chips)}</small>{variant==="fyb"&&<span className="sw-fyb-strikes" aria-label={3-(fybLosses[i]??0)+" remaining chips"}>{[0,1,2].map(n=><span key={n} className={n<3-(fybLosses[i]??0)?"live":"spent"}>●</span>)}</span>}</div>{i===dealer&&<span className="sw-poker-dealer">D</span>}{variant==="fyb"&&fybCurrentKings(fybRevealedKings,hands).some(k=>k.seat===i)&&<span className="sw-poker-status sw-fyb-king-label">👑 K</span>}{variant==="442"&&step==="result"&&hands[i]?.length===4&&<div className={"sw-442-showdown"+(showdown442?.winner===i?" winner":showdown442?.losers.includes(i)?" loser":"")} aria-label={p.name+" shows their four-card hand"}>{hands[i].map((c,j)=><span key={j} style={{"--card-delay":j*115+"ms"}} className="sw-442-flip-card">{label(c)}</span>)}{showdown442?.winner===i&&<small>WINNER</small>}{showdown442?.losers.includes(i)&&<small>−{displayMoney(showdown442.match)}</small>}</div>}{variant==="fyb"&&step==="result"&&fybSettlement?.active.includes(i)&&hands[i]?.[0]&&<div className={"sw-fyb-showdown-card"+(fybSettlement.losers.includes(i)?" lowest":"")} aria-label={p.name+" shows "+label(hands[i][0])+(fybSettlement.losers.includes(i)?" lowest card":"")}><span className="sw-fyb-showdown-back">♠</span><span className="sw-fyb-showdown-face">{label(hands[i][0])}</span>{fybSettlement.losers.includes(i)&&<small>LOWEST · −{displayMoney(fybSettlement.paidCents)}</small>}</div>}{variant==="fyb"&&step==="result"&&fybSettlement&&<span className="sw-fyb-new-total">Total: {displayMoney(fybSettlement.afterStacks[i]??0)}</span>}{variant==="fyb"&&fybActions[i]&&step!=="result"&&<span className={"sw-poker-status sw-fyb-action-label "+fybActions[i]}>{({swap:"Swapped",keep:"Kept",blocked:"King blocked",draw:"Drew"})[fybActions[i]]}</span>}{step==="442-draw"&&<span className="sw-poker-status">{i===activeIndex?"Drawing":"Wait"}</span>}{step==="deciding"&&<span className="sw-poker-status">{decisions[i]?"✓ Ready":"Waiting"}</span>}</div>)}
  {variant==="fyb"&&step!=="result"&&fybCurrentKings(fybRevealedKings,hands).map(({seat,card})=><div className="sw-fyb-public-king" key={seat} style={{left:fybSeatCoords[seat]?.x,top:fybSeatCoords[seat]?.y}} aria-label={players[seat]?.name+" has a revealed King of "+card.suit}><div className="sw-fyb-public-king-face"><b>K {card.suit}</b></div></div>)}
   {variant==="fyb"&&step==="fyb"&&fybLastMove&&<div className="sw-fyb-table-animation" key={fybLastMove.nonce} aria-hidden="true">
     {fybLastMove.kind==="swap"&&<><div className="sw-fyb-flying-card" style={{"--fyb-x0":fybSeatCoords[fybLastMove.seat]?.x,"--fyb-y0":fybSeatCoords[fybLastMove.seat]?.y,"--fyb-x1":fybSeatCoords[fybLastMove.to]?.x,"--fyb-y1":fybSeatCoords[fybLastMove.to]?.y}}>♠</div><div className="sw-fyb-flying-card return" style={{"--fyb-x0":fybSeatCoords[fybLastMove.to]?.x,"--fyb-y0":fybSeatCoords[fybLastMove.to]?.y,"--fyb-x1":fybSeatCoords[fybLastMove.seat]?.x,"--fyb-y1":fybSeatCoords[fybLastMove.seat]?.y}}>♠</div></>}
     {fybLastMove.kind==="draw"&&<div className="sw-fyb-flying-card deck" style={{"--fyb-x0":"50%","--fyb-y0":"50%","--fyb-x1":fybSeatCoords[fybLastMove.seat]?.x,"--fyb-y1":fybSeatCoords[fybLastMove.seat]?.y}}>♠</div>}
    </div>}
  </div></div>
  {step!=="ready"&&<section className="sw-poker-panel sw-poker-compact-result"><h3>{centered}</h3>
   {step==="stud"&&<p>Queens are always wild; face-up followers: {followers.length?followers.join(", "):"none"}. {pendingFollower?"Follower trigger pending.":""}</p>}
   {variant==="fyb"&&step==="fyb"&&false&&<p className="sw-fyb-turn-description">{fybDealerTurn?"Dealer turn: the player on your right has acted. You can KEEP your card or DRAW a fresh one from the deck.":"Pass Left to "+players[order[fybTurn+1]]?.name+". A King blocks the swap and flips face-up at the receiving seat. Your own card remains available above; Keep or Pass Left."}</p>}{variant==="fyb"&&fybAwaitNext&&false&&<p className="sw-fyb-turn-description">Your updated card is shown in Your Card. Tap Continue to {fybDealerTurn?"finish this hand":"pass the phone to the next player"}.</p>}{variant==="fyb"&&fybLastMove&&step!=="fyb"&&<p role="status" aria-live="polite" className="sw-fyb-exchange"><span className="sw-fyb-card-backs">🂠 <span>↔</span> 🂠</span> {fybLastMove.event}</p>}{step==="fyb"&&localSeat>=0&&false&&<div className="sw-fyb-own-hand"><strong>♠ Your card · {players[localSeat]?.name}</strong><div className="sw-poker-facecards">{ownFybCards?ownFybCards.map((c,i)=><PokerCard key={i} c={c}/>):hands[localSeat]?.map((c,i)=><PokerCard key={i} c={c} hidden/>)}</div><small>Your card updates when you receive a swap. Other players’ cards stay private.</small></div>}{variant==="442"&&step==="442-draw"&&<><p>Tap 0–3 cards to exchange. Selected cards get a gold border; 4s are wild. {currentPlayer?.kind==="computer"?"Bot is drawing…":draw442Selected.length+" selected."}</p><div className="sw-poker-facecards sw-442-select-cards">{hands[activeIndex]?.map((c,i)=><button type="button" key={i} disabled={currentPlayer?.kind==="computer"} aria-pressed={draw442Selected.includes(i)} aria-label={currentPlayer?.kind==="computer"?"Private card":("Exchange "+label(c))} className={"sw-442-pick"+(draw442Selected.includes(i)?" selected":"")} onClick={()=>setDraw442Selected(old=>old.includes(i)?old.filter(x=>x!==i):old.length<3?[...old,i]:old)}><PokerCard c={c} hidden={currentPlayer?.kind==="computer"} wild={c.rank===4}/></button>)}</div></>}{step==="deciding"?<div className="sw-poker-facecards">{activeCards?activeCards.map((c,i)=><PokerCard key={i} c={c} wild={variant==="442"&&c.rank===4||variant==="bozo"&&c.rank===clown[0]?.rank}/>):(hands[activeIndex]||[]).map((c,i)=><PokerCard key={i} c={c} hidden/>)}</div>:null}
   {variant==="bozo"&&clown.length>0&&<p>🤡 Clown's exposed wild card: {label(clown[0])}. Its other cards stay concealed until resolution.</p>}
   {step==="result"&&<>{variant==="fyb"&&fybSettlement&&<p className="sw-fyb-results-summary" role="status">Lowest: {fybSettlement.losers.map(i=>players[i].name+" ("+label(hands[i]?.[0])+")").join(", ")} · {displayMoney(fybSettlement.paidCents)} per loss · Purse: {displayMoney(fybSettlement.purseAfter)}</p>}<div className="sw-poker-winner-banner">{variant==="fyb"?"♠ ":"🏆 "}{outcome?.message}</div>{variant==="fyb"&&fybActive.length===2&&!outcome?.gameFinished&&pot>0&&<p className="sw-fyb-split-hint">Two players remain. They may continue playing or both agree to split the {displayMoney(pot)} purse.</p>}<button className="sw-poker-button mt-2" onClick={()=>{setTab("hands");setDrawer(true)}}><Eye size={14} className="inline"/> Review cards</button></>}
   {step==="stud-result"&&<><p>All seven cards dealt. The next step is validated betting and natural-versus-wild showdown; this is a guided dealing demonstration, not an automatic pot award.</p><button className="sw-poker-button mt-2" onClick={()=>{setTab("hands");setDrawer(true)}}>Review stud cards</button></>}
  </section>}
 </div>
 {step!=="loading"&&<nav className="sw-poker-sticky-actions"><div className="sw-poker-action-top"><strong>♠ {centered}</strong><span>{variant==="fyb"?"FYB "+displayMoney(pot)+" · "+fybActive.length+" active":displayMoney(pot)+" / "+displayMoney(maxCents)}</span></div><div className="sw-poker-action-buttons">
 {step==="ready"&&<button className="sw-poker-action hold grow" onClick={deal}>Deal cards</button>}
 {step==="442-next"&&<span className="sw-poker-action-wait">Dealer passes · Dealing four new cards…</span>}{step==="442-draw"&&currentPlayer?.kind==="computer"&&<span className="sw-poker-action-wait">🤖 {currentPlayer.name} choosing exchanges…</span>}{step==="442-draw"&&currentPlayer?.kind!=="computer"&&<button className="sw-poker-action hold grow" onClick={()=>finish442Exchange(activeIndex,draw442Selected)}>Exchange {draw442Selected.length} · Continue</button>}{step==="fyb-next"&&<span className="sw-poker-action-wait">Dealer rotates · Shuffling the next hand…</span>}
 {step==="deciding"&&currentPlayer?.kind==="computer"&&<span className="sw-poker-action-wait">🤖 {currentPlayer.name} is deciding…</span>}
 {step==="deciding"&&currentPlayer&&currentPlayer.kind!=="computer"&&<><button className="sw-poker-action hide" onClick={()=>setViewer(v=>v===activeIndex?null:activeIndex)}>{viewer===activeIndex?<EyeOff size={15}/>:<Eye size={15}/>} {viewer===activeIndex?"Hide":"Show"}</button><button className="sw-poker-action fold" onClick={()=>chooseHold("fold")}>{variant==="442"?"Drop":"Fold"}</button><button className="sw-poker-action hold" onClick={()=>chooseHold("hold")}>Hold</button></>}
 {step==="fyb"&&localSeat>=0&&<div className="sw-fyb-sticky-card"><div className="sw-fyb-sticky-card-face" aria-label="Your private FYB card">{ownFybCards?.[0]?<PokerCard c={ownFybCards[0]}/>:<PokerCard c={hands[localSeat]?.[0]} hidden/>}</div><button className="sw-poker-action hide" onClick={()=>setViewer(v=>v===localSeat?null:localSeat)}>{viewer===localSeat?"Hide":"Show"} Card</button></div>}
 {step==="fyb"&&currentPlayer?.kind==="computer"&&<><button className="sw-poker-action fold" disabled>Pass Left</button><button className="sw-poker-action hold" disabled>Keep</button></>}
 {step==="fyb"&&currentPlayer&&currentPlayer.kind!=="computer"&&(fybAwaitNext?<button className="sw-poker-action hold grow" onClick={()=>{setFybAwaitNext(false);if(fybTurn+1>=order.length){finishFybRound(hands);}else {setFybTurn(v=>v+1);}}}>Continue <ChevronRight size={17}/></button>:<><button disabled={fybAnimating} className="sw-poker-action fold" onClick={()=>fybAction(true)}>{fybDealerTurn?"Draw Deck":"Pass Left"}</button><button disabled={fybAnimating} className="sw-poker-action hold" onClick={()=>fybAction(false)}>Keep</button></>)}
 {variant==="fyb"&&step==="result"&&fybActive.length===2&&!outcome?.gameFinished&&pot>0&&<button className="sw-poker-action sw-fyb-split-action" onClick={startSplitOffer}>🤝 Offer Split</button>}
 {step==="stud"&&<button className="sw-poker-action hold grow" onClick={dealStudStreet}>Deal next stud card · {street+1}/7</button>}
 {(step==="result"||step==="stud-result")&&<><button className="sw-poker-action hold grow" onClick={()=>{if(outcome?.gameFinished||(variant!=="fyb"&&pot===0)){quitToDealer();return;}if(variant==="fyb"){setDealer(d=>fybNextDealer(fybActive,d));setStep("fyb-next");}else if(variant==="442"){setDealer(d=>(d+1)%players.length);setStep("442-next");}else setStep("ready");setOutcome(null);setFybLastMove(null);}}> {outcome?.gameFinished||variant!=="fyb"&&pot===0?"Next Dealer · Choose Game":variant==="fyb"?"Deal":variant==="442"?"Deal":"Next hand"} <ChevronRight size={17}/></button>{!outcome?.gameFinished&&<button className="sw-poker-action hide" onClick={quitToDealer}>Choose Game</button>}</>}
 <button className="sw-poker-action info" onClick={()=>{setTab(variant==="fyb"?"activity":"rules");setDrawer(true)}}><Info size={18}/><span>Info</span></button></div></nav>}
 {splitOpen&&<div className="sw-poker-drawer-backdrop sw-fyb-split-shade" onClick={()=>setSplitOpen(false)}>
  <section className="sw-fyb-split-dialog" role="dialog" aria-modal="true" aria-label="Agree to split the FYB purse" onClick={e=>e.stopPropagation()}>
   <header><h3>🤝 Split the FYB purse?</h3><button type="button" aria-label="Cancel split" onClick={()=>setSplitOpen(false)}>×</button></header>
   <p>Two players remain. Both must agree. The shared <strong>{displayMoney(pot)}</strong> virtual purse will be divided equally and FYB ends. If either declines, play continues and no chips move.</p>
   <div className="sw-fyb-split-votes">{fybActive.map(i=><div className="sw-fyb-split-player" key={players[i].id||i}>
    <strong>{players[i].name}</strong><small>{splitApprovals[i]?"✓ Agreed":"Waiting for decision"}</small>
    {splitApprovals[i]?<span className="sw-fyb-approved">✓ Approved</span>:<div className="sw-fyb-split-buttons">
     <button type="button" className="approve" onClick={()=>players[i].kind==="computer"?askVirtualSplit(i):respondToSplit(i,true)}>{players[i].kind==="computer"?"Ask Virtual Player":"Agree to split"}</button>
     {players[i].kind!=="computer"&&<button type="button" className="reject" onClick={()=>respondToSplit(i,false)}>Decline</button>}
    </div>}
   </div>)}</div>
   <small className="sw-fyb-split-disclaimer">Local practice: human players approve on this device. Virtual players simulate their own decisions. No real funds are transferred.</small>
   <button className="sw-fyb-split-cancel" type="button" onClick={()=>setSplitOpen(false)}>Continue playing instead</button>
  </section>
 </div>}
 {drawer&&<div className="sw-poker-drawer-backdrop" onClick={()=>setDrawer(false)}><section className="sw-poker-drawer" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="sw-poker-drawer-grip"/><div className="sw-poker-drawer-heading"><strong>♠ {game.title} · Table Details</strong><button className="sw-poker-drawer-close" onClick={()=>setDrawer(false)}>✕</button></div><div className="sw-poker-drawer-tabs">{(variant==="fyb"?["activity","hands","rules","log","settings"]:["hands","rules","log","settings"]).map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="sw-poker-drawer-body">
 {tab==="activity"&&variant==="fyb"&&<><h3>Current turn</h3><p>{centered}</p><p>{fybDealerTurn?"Dealer: keep your card or draw a replacement from the deck.":activeIndex>=0?"Pass left to "+(players[order[fybTurn+1]]?.name||"the next seat")+". Kings block incoming swaps and reveal at their seat.":"Waiting for the next hand."}</p>{fybAwaitNext&&<p>Review your updated card, then tap Continue.</p>}{fybLastMove&&<p className="sw-fyb-exchange">{fybLastMove.event}</p>}<h3>Recent activity</h3>{log.slice(0,12).map(e=><p key={e.id} className="sw-poker-drawer-log-entry">{e.message}</p>)}<h3>Hand details</h3><p>Dealer: {players[dealer]?.name} · {fybActive.length} active · {displayMoney(anteCents)} per loss · Deck {fybDeckNumber} · {deck.length} remaining · Purse {displayMoney(pot)}</p></>}{tab==="hands"&&<>{variant==="fyb"&&step==="result"&&fybSettlement&&<p>Lowest card: {fybSettlement.losers.map(i=>players[i].name).join(", ")}. Losers pay {displayMoney(fybSettlement.paidCents)} each. All balances shown are after settlement.</p>}{!reviewable?<p>Opponents' private cards are not revealed before a completed hand. You can view only your active hand.</p>:players.map((p,i)=><section className="sw-poker-drawer-hands" key={p.id}><strong>{p.name}</strong><div className="sw-poker-facecards">{hands[i]?.map((c,j)=><PokerCard c={c} key={j}/>)}</div></section>)}{variant==="bozo"&&reviewable&&<section><h3>Clown</h3><div className="sw-poker-facecards">{clown.map((c,i)=><PokerCard key={i} c={c}/>)}</div></section>}</>}
 {tab==="rules"&&<><h3>{game.title}</h3><p>{variant==="fyb"?"Three chips per person, with one shared purse of lost chips. Dealer sets the total stake per player (e.g. $3.00 total means $1.00 for each lost chip). Each lowest-card player loses one chip per completed hand; ties all lose a chip. At three lost chips, that player is eliminated. All lost chips go to the shared purse. The last player standing drags that purse. Keep using the same 52-card deck between hands and open a new one only when it is exhausted. Aces are lowest; Kings are highest and block a pass to them. Any King flips face-up for the table when its owner’s turn arrives, including the dealer’s King. A King also flips immediately when it blocks a pass, and stays revealed for that hand. Pass exchanges cards with the player to the left, and the dealer may draw off the deck. Dealer rotates each hand among surviving players.":variant==="442"?"Four cards per player, with 4s always wild. No straights or flushes: four of a kind beats three of a kind, then two pair, a pair, then high card. Starting left of the dealer, each player exchanges zero to three cards from the deck. Then each privately chooses Drop or Hold. Highest four-card hand among holders wins the pot, and other holding players replace it up to the pot cap. A lone holder can drag only with a NATURAL pair: two matching non-wild cards. If no one holds, or a lone holder has no natural pair, the pot carries forward and everyone antes again. Dealer passes each new hand.":variant==="bozo"?"The Clown is a ghost hand with one upcard that sets the wild rank. A holder must beat the Clown and all other holders. Losers replenish the pot.": "Queens are always wild. A face-up Queen makes the next face-up follower rank wild for everyone. The stud betting engine is still under construction."}</p></>}
 {tab==="log"&&<><h3>Balances</h3>{players.map((p,i)=><p key={p.id}>{p.name} — {displayMoney(stacks[i]??0)}</p>)}<h3>Hand log</h3>{log.map(e=><p key={e.id}>{e.message}</p>)}</>}
 {tab==="settings"&&<><h3>Rebuy virtual chips</h3><select value={rebuySeat} onChange={e=>setRebuySeat(Number(e.target.value))}>{players.map((p,i)=><option key={p.id} value={i}>{p.name}</option>)}</select><input type="number" min="0.01" step="0.01" value={rebuyAmount} onChange={e=>setRebuyAmount(e.target.value)}/><button className="sw-poker-button" onClick={addRebuy}>Rebuy</button><button className="sw-poker-button mt-3" onClick={quitToDealer}>Return to dealer game choice</button></>}
 </div></section></div>}
 {rebuy&&<div className="sw-poker-modal-cover"><section className="sw-poker-modal"><h2>Rebuy virtual chips</h2><p>A human player needs more chips before dealing.</p><select value={rebuySeat} onChange={e=>setRebuySeat(Number(e.target.value))}>{players.map((p,i)=><option key={p.id} value={i}>{p.name}</option>)}</select><input type="number" value={rebuyAmount} onChange={e=>setRebuyAmount(e.target.value)}/><button className="sw-poker-button primary" onClick={addRebuy}>Confirm rebuy</button><button className="sw-poker-button" onClick={()=>setRebuy(false)}>Cancel</button></section></div>}
 </main>;
}

import React,{useEffect,useMemo,useRef,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,BookOpen,Check,ChevronRight,Eye,EyeOff,Info,Lightbulb,RotateCcw,Shield,Spade,Target,Users,WalletCards} from "lucide-react";
import {getCardRoom,createCardRoom} from "../api/cardRooms";
import {createGroupInviteLink} from "../api/social";
import {useAuth} from "../auth/AuthContext";
import {Share2} from "lucide-react";
import {ensure357Street,cardRank,createShuffledDeck,dealt357,displayMoney,instant357,rate357,resolve357,winningHandText357,THREE_FIVE_SEVEN} from "../games/drop357Table.mjs";
import "./CustomerPokerTable.css";
import {HAND_RANKINGS_357,practiceHandInfo,estimatePracticeEquity} from "../games/practiceOdds357.mjs";
import {rotationAfterPot,chooseVirtualDealer} from "../games/pokerDealerRotation.mjs";
import {capGutsResult,limitAnte,rebuyChips,centsFromDollars,pickPracticeBotChoice} from "../games/pokerPracticeSession.mjs";
import {readCardNight,saveCardNight,clearCardNight} from "../games/cardNightTransfer.mjs";
import PokerSessionBar from "../components/poker/PokerSessionBar";
import {readPracticeGame,savePracticeGame,clearPracticeGame} from "../games/cardPracticeResume.mjs";
import CardClubTableSwitcher from "../components/poker/CardClubTableSwitcher";
import PokerLandscapeControl from "../components/poker/PokerLandscapeControl";
import {buildPracticeSummary,savePracticeSummary} from "../games/pokerClubPracticeLedger.mjs";

const DEFAULT_PLAYERS=[{id:"local-you",name:"You",kind:"local"},{id:"local-zack",name:"Zack",kind:"guest"},{id:"local-russ",name:"Russ",kind:"guest"}];
const TABLE_GAMES=[
 {code:"357",label:"3-5-7 DROP",path:"/customer/games/table"},
 {code:"fyb",label:"FYB",path:"/customer/games/fyb"},
 {code:"442",label:"4/4/Deuce",path:"/customer/games/442"},
 {code:"queen-follower",label:"Queen & the Follower",path:"/customer/games/queen-follower"},
 {code:"bozo",label:"Bozo · The Clown",path:"/customer/games/bozo"},
];
const gameName="3-5-7 DROP";
const rankText=card=>cardRank(card.rank);
const isRed=suit=>suit==="♥"||suit==="♦";
const uid=()=>String(Date.now())+"-"+Math.random();
const localRoomKey=id=>"syncworks-local-poker-room-v1-"+id;
function readLocalRoom(group){try{const room=JSON.parse(localStorage.getItem(localRoomKey(group))||"null");return Array.isArray(room?.seats)?room:null;}catch{return null;}}
function getPlayer(p,i){return {id:String(p.user_id||p.id||uid()),name:p.nickname||p.name||p.label||"Player "+(i+1),photo:p.avatar_url||p.photo||"",kind:p.is_computer||p.kind==="computer"?"computer":p.kind||"member",chips:Number.isFinite(p.virtual_chips_cents)?p.virtual_chips_cents:2000};}
function Card({card,hidden=false,wild=false}) {if(!card)return null;return <div className={"sw-poker-card"+(hidden?" back":isRed(card.suit)?" red":"")} aria-label={hidden?"Face down card":rankText(card)+" of "+card.suit}>{hidden?<><strong>S</strong><b>♠</b></>:<><strong>{rankText(card)} {card.suit}</strong><b>{card.suit}</b>{wild&&<small>WILD</small>}</>}</div>;}
function Photo({person}){return <div className="sw-poker-seat-avatar">{person?.photo?<img src={person.photo} alt="" onError={e=>{e.currentTarget.style.display="none";}}/>:(person?.kind==="computer"?"🤖":(person?.name||"?").split(/\s+/).map(v=>v[0]).slice(0,2).join("").toUpperCase())}</div>;}
function helperContent(page,round){
 if(page==="ranks")return <><p>Strongest to weakest, using the active round’s wild rank. The instant 3-5-7 opening hand overrides regular rankings.</p><div className="sw-practice-rank-list">{HAND_RANKINGS_357[round].map((name,i)=><div key={name}><span>{i+1}</span><strong>{name}</strong></div>)}</div><p>Round 1 (three cards): straights and flushes do not count. Rounds 2–3: five-card poker categories apply; seven cards use the strongest five-card combination. Wild cards can create five of a kind.</p></>;
 if(page==="strategy")return <><p>Beginner reminders — not a promise of winning:</p><p><b>3-card stage:</b> Pairs and three of a kind matter. Straights and flushes do not count. Your 3s are wild only during this round.</p><p><b>5- and 7-card stages:</b> Look for combinations helped by the current wild rank. Former wilds become ordinary cards.</p><p>Holding exposes you to a match-the-pot loss if another holder has the stronger hand. Dropping avoids that penalty for this round only.</p></>;
 return <><p>One continuous seven-card deal: all seated players start with 3 cards (3s wild), receive 2 more (5s wild), then 2 more (7s wild). Folding removes a player from the current round only; they still receive cards and may Hold in the next round.</p><p>Everyone privately chooses <b>Hold</b> or <b>Drop</b>. Ready means a decision was saved, not what it was. The dealer starts a 3, 2, 1 reveal after all are ready.</p><p>After each 3-, 5-, and 7-card round settles, only players who held can review one another\'s cards from that round. Folded players never see those hands. The strongest holder drags the current pot; other losing holders match the allowed replacement amount into the next pot.</p><p>One holder needs three cumulative uncontested holds to drag the pot. If everyone folds, each antes again. An opening 3-5-7 hand instantly wins the pot.</p><p>The pot cap pauses play for dealer review; this preview never moves real money.</p></>;
}
export default function CustomerPokerTable(){
 const nav=useNavigate(),[params]=useSearchParams();
 const {user}=useAuth();
 const groupId=params.get("group")||"";
 const roomId=params.get("room")||"";
 // This frontend engine is an on-device practice round even when launched from a shared waiting room.
 // Real multiplayer hands must use server-authoritative cards and never receive hints/odds.
 const practiceMode=true;
 const isSharedRoom=Boolean(roomId); // Shared lobby is not an authoritative game service.
 const restoredRef=useRef(false);
 const [people,setPeople]=useState(DEFAULT_PLAYERS);
 const [lobbyName,setLobbyName]=useState("Saturday Poker");
 const [dealer,setDealer]=useState(0),[session,setSession]=useState("setup");
 const [virtualSessionId,setVirtualSessionId]=useState(()=>("practice-"+Date.now()+"-"+Math.random().toString(36).slice(2))),[rebuyCounts,setRebuyCounts]=useState({}),[sittingOut,setSittingOut]=useState({}),[handFolds,setHandFolds]=useState({}),[cashouts,setCashouts]=useState([]),[dealAnimation,setDealAnimation]=useState(null);
 const [phase,setPhase]=useState("setup"),[round,setRound]=useState(0),[hands,setHands]=useState([]),[deck,setDeck]=useState([]);
 const [choices,setChoices]=useState([]),[viewer,setViewer]=useState(null);
 const [counter,setCounter]=useState(null),[reveal,setReveal]=useState({}),[outcome,setOutcome]=useState(null);
 const [revealStep,setRevealStep]=useState(0),[showdownViewer,setShowdownViewer]=useState(null),[chipAnimation,setChipAnimation]=useState(null);
 const [strikes,setStrikes]=useState({}),[pot,setPot]=useState(0),[chipStacks,setChipStacks]=useState([]);
 const [ante,setAnte]=useState("0.25"),[maxPot,setMaxPot]=useState("50"),[startingChips,setStartingChips]=useState("20");
 const [drawerOpen,setDrawerOpen]=useState(false),[drawerTab,setDrawerTab]=useState("hands"),[status,setStatus]=useState(""),[log,setLog]=useState([]),[remoteNotice,setRemoteNotice]=useState(false);
 const [shareBusy,setShareBusy]=useState(false),[inviteUrl,setInviteUrl]=useState(""),[roomMinimum,setRoomMinimum]=useState(null),[roomCapacity,setRoomCapacity]=useState(6);
 const [selectedGame,setSelectedGame]=useState("357");
 const [dealerBozoSize,setDealerBozoSize]=useState(5);
 const [dealerChoosing,setDealerChoosing]=useState(false);
 const [capDraft,setCapDraft]=useState("50");
 const [botStyle,setBotStyle]=useState("balanced"),[rebuyOpen,setRebuyOpen]=useState(false),[rebuySeat,setRebuySeat]=useState(0),[rebuyAmount,setRebuyAmount]=useState("20"),[sessionGames,setSessionGames]=useState(1),[resetConfirm,setResetConfirm]=useState(false);
 const [upgrading,setUpgrading]=useState(false);
 const [turnRemaining,setTurnRemaining]=useState(30);
 const [myHandVisible,setMyHandVisible]=useState(true);
 const [seatEditor,setSeatEditor]=useState(false),[seatName,setSeatName]=useState(""),[seatBuyin,setSeatBuyin]=useState("20"),[seatError,setSeatError]=useState("");
 function openDrawer(tab="hands"){setDrawerTab(tab);setDrawerOpen(true);}
 function closeDrawer(){setDrawerOpen(false);setShowdownViewer(null);}
 const anteCents=Math.round(Number(ante)*100),capCents=maxPot==="unlimited"?100000000:Math.round(Number(maxPot)*100);
 const capText=maxPot==="unlimited"?"Unlimited":displayMoney(capCents);
 const wild=THREE_FIVE_SEVEN[round];
 const tableSize=people.length;
 const currentIndex=choices.findIndex(c=>c===null);
 const localHumanSeats=people.flatMap((p,i)=>p.kind!=="computer"?[i]:[]);
 const authenticatedSeat=people.findIndex(p=>p.kind!=="computer"&&String(p.id)===String(user?.id??""));
 const privateSeatIndex=authenticatedSeat>=0?authenticatedSeat:localHumanSeats.length===1?localHumanSeats[0]:-1;
 const activeHumanTurn=currentIndex>=0&&people[currentIndex]?.kind!=="computer";
 const canActCurrent=activeHumanTurn&&!isSharedRoom&&privateSeatIndex===currentIndex;
 const allReady=choices.length===tableSize&&choices.every(c=>c!==null);
 const held=choices.flatMap((c,i)=>c==="hold"?[i]:[]);
 const revealOrder=useMemo(()=>held.slice().sort((a,b)=>((a-dealer+tableSize-1)%tableSize)-((b-dealer+tableSize-1)%tableSize)),[choices,dealer,tableSize]);
 const competingHolders=held.length>=2;
 const eligibleShowdownViewers=held.filter(i=>i===privateSeatIndex&&!isSharedRoom);
 const isFinalShowdown=phase==="resolved";
 const canSeeOtherHands=isFinalShowdown&&!isSharedRoom&&showdownViewer===privateSeatIndex&&eligibleShowdownViewers.includes(showdownViewer)&&competingHolders;
 const sevenCardReveal=round===2&&competingHolders;
 const revealedCount=Object.values(reveal).reduce((sum,n)=>sum+n,0);
 const totalRevealCards=revealOrder.reduce((sum,i)=>sum+(hands[i]?.length||0),0);
 const currentReveal=revealOrder.find(i=>(reveal[i]||0)<(hands[i]?.length||0));
 const displayIndex=currentIndex>=0?currentIndex:null;
 const viewCards=myHandVisible&&privateSeatIndex>=0&&session==="playing"&&!isSharedRoom&&hands[privateSeatIndex]?.length?hands[privateSeatIndex]:null;
 const handInsight=useMemo(()=>practiceMode&&viewCards?practiceHandInfo(viewCards,round):null,[practiceMode,viewCards,round]);
 const equity=useMemo(()=>practiceMode&&viewCards?estimatePracticeEquity(viewCards,round):null,[practiceMode,viewCards,round]);
 useEffect(()=>{
  if(!user?.id||isSharedRoom){restoredRef.current=true;return;}
  const saved=readPracticeGame(user.id,groupId,"357");
  if(saved?.active&&Array.isArray(saved.people)&&saved.people.length>=2&&Array.isArray(saved.hands)&&Array.isArray(saved.chipStacks)){
   setPeople(saved.people);setDealer(saved.dealer??0);setSession(saved.session||"playing");setPhase(["setup","choosing","resolved"].includes(saved.phase)?saved.phase:"resolved");setRound(saved.round??0);
   setHands(saved.hands);setDeck(saved.deck||[]);setChoices(saved.choices||[]);setPot(saved.pot??0);setChipStacks(saved.chipStacks);
   setStrikes(saved.strikes||{});setOutcome(saved.outcome||null);setHandFolds(saved.handFolds||{});setAnte(saved.ante||"0.25");setMaxPot(saved.maxPot||"50");
   setStartingChips(saved.startingChips||"20");setSessionGames(saved.sessionGames||1);setRebuyCounts(saved.rebuyCounts||{});setSittingOut(saved.sittingOut||{});
   setCashouts(saved.cashouts||[]);setVirtualSessionId(saved.virtualSessionId||("practice-"+Date.now()));setMyHandVisible(true);
   setStatus("Practice game resumed where you left off.");
  }
  restoredRef.current=true;
 },[user?.id,groupId,isSharedRoom]);
 useEffect(()=>{
  if(!restoredRef.current||!user?.id||isSharedRoom||session!=="playing")return;
  savePracticeGame(user.id,groupId,"357",{active:true,people,dealer,session,phase,round,hands,deck,choices,pot,chipStacks,strikes,outcome,handFolds,ante,maxPot,startingChips,sessionGames,rebuyCounts,sittingOut,cashouts,virtualSessionId});
 },[user?.id,groupId,isSharedRoom,people,dealer,session,phase,round,hands,deck,choices,pot,chipStacks,strikes,outcome,handFolds,ante,maxPot,startingChips,sessionGames,rebuyCounts,sittingOut,cashouts,virtualSessionId]);
 // Older on-device checkpoints sometimes recorded the new street number
 // without its two additional cards. Complete only missing cards, preserving
 // the original deck and every card already held by a seated player.
 useEffect(()=>{
  if(isSharedRoom||session!=="playing"||round===0||phase!=="choosing"||!hands.length)return;
  const expected=[3,5,7][round];
  const missing=hands.some((hand,i)=>hand?.length>0&&!sittingOut[i]&&hand.length<expected);
  if(!missing)return;
  try{
   const repaired=ensure357Street({hands,deck,round,sittingOut});
   if(!repaired.dealt)return;
   setHands(repaired.hands);setDeck(repaired.deck);
   setDealAnimation({nonce:Date.now(),count:repaired.dealt>hands.length?2:repaired.dealt});
   setStatus("Restored "+repaired.dealt+" missing cards so this "+expected+"-card round can continue.");
  }catch(e){setStatus("Cannot complete this round from its saved deck: "+e.message+" Please reset this practice hand.");}
 },[isSharedRoom,session,round,phase,hands,deck,sittingOut]);
 function addLog(message){setLog(old=>[{id:uid(),message,time:new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})},...old].slice(0,32));}
 useEffect(()=>{let mounted=true;
  if(roomId){getCardRoom(roomId).then(r=>{if(!mounted)return;setLobbyName(r.name||"Poker Table");if(Array.isArray(r.seats)&&r.seats.length>=2){if(params.get("resumeGame")!=="1"||!readCardNight(groupId,roomId))setPeople(r.seats.map(getPlayer));setStartingChips(String((r.virtual_buy_in_cents??2000)/100));setRoomMinimum(r.minimum_buy_in_cents??r.virtual_buy_in_cents??2000);setRoomCapacity(r.capacity||6);const idx=r.seats.findIndex(s=>s.position===r.dealer_position);if(idx>=0&&!(params.get("resumeGame")==="1"&&readCardNight(groupId,roomId)))setDealer(idx);setRemoteNotice(true);}}).catch(()=>{if(mounted)setStatus("Shared lobby unavailable; use the local preview with sample seats.");});}
  else if(groupId&&!readPracticeGame(user?.id,groupId,"357")){const r=readLocalRoom(groupId);if(r?.seats?.length){setLobbyName(r.name||"Poker Table");setPeople(r.seats.map(getPlayer));setStartingChips(String((r.buyInCents??2000)/100));setRoomMinimum(r.buyInCents??2000);setRoomCapacity(r.capacity||6);setRemoteNotice(false);}}
  return()=>{mounted=false;};
 },[groupId,roomId]);
 useEffect(()=>{
  if(params.get("resumeGame")!=="1"||readPracticeGame(user?.id,groupId,"357"))return;
  const previous=readCardNight(groupId,roomId);if(!previous)return;
  setPeople(previous.people);setChipStacks(previous.stacks);setPot(previous.pot??0);
  setDealer(previous.dealer??0);setSessionGames(previous.gameNumber??1);
  setRebuyCounts(previous.rebuyCounts||{});setSittingOut(previous.sittingOut||{});setCashouts(previous.cashouts||[]);setVirtualSessionId(previous.virtualSessionId||("practice-"+Date.now()));
  setMaxPot(previous.capCents===100000000?"unlimited":String((previous.capCents??5000)/100));setCapDraft(previous.capCents===100000000?"unlimited":String((previous.capCents??5000)/100));
  setDealerChoosing(true);setSession("setup");setPhase("setup");
  if(previous.people[previous.dealer??0]?.kind==="computer"){
    const pick=chooseVirtualDealer();
    setSelectedGame(pick.game);setAnte(pick.ante);
    setStatus(previous.people[previous.dealer??0].name+" is dealer and randomly chose "+(TABLE_GAMES.find(g=>g.code===pick.game)?.label||pick.game)+". Confirm to play.");
  }else{
    setSelectedGame("357");
    setStatus("Card night restored. Next dealer chooses a game and ante; virtual chips carry over.");
  }
 },[groupId,roomId]);
 useEffect(()=>{
  if(phase!=="choosing"||!activeHumanTurn||isSharedRoom){setTurnRemaining(30);return;}
  const deadline=Date.now()+30000;
  setTurnRemaining(30);
  const clock=setInterval(()=>setTurnRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000))),200);
  const timeout=setTimeout(()=>{
   setChoices(old=>old.map((v,i)=>i===currentIndex&&v===null?"drop":v));
   setHandFolds(old=>({...old,[currentIndex]:true}));setViewer(null);
   addLog(people[currentIndex]?.name+" auto-folded after 30 seconds.");
  },30000);
  return()=>{clearInterval(clock);clearTimeout(timeout);};
 },[phase,currentIndex,activeHumanTurn,isSharedRoom]);
 useEffect(()=>{if(phase!=="countdown")return;setCounter(3);const started=Date.now();const timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);const remaining=3-elapsed;if(remaining<=0){clearInterval(timer);setCounter(null);setRevealStep(0);setPhase("revealing");setViewer(null);setShowdownViewer(null);addLog("Dealer countdown complete. Evaluating hands; cards show after the result.");}else setCounter(remaining);},120);return()=>clearInterval(timer);},[phase]);
 // Keep all cards concealed until the completed round is scored.
 // The finished result mounts each face-up hand with staggered flip animation.
 useEffect(()=>{
  if(phase!=="revealing")return;
  const timer=setTimeout(()=>settleCurrentRound(),850);return()=>clearTimeout(timer);
 },[phase,round,revealStep,choices,hands,pot,strikes]);
 useEffect(()=>{if(!chipAnimation)return;const timer=setTimeout(()=>setChipAnimation(null),4200);return()=>clearTimeout(timer);},[chipAnimation]);
 async function upgradeToLiveRoom(){
  if(upgrading||!groupId||roomId||session!=="setup")return;
  const minimum=roomMinimum??Math.round(Number(startingChips)*100);
  if(!Number.isSafeInteger(minimum)||minimum<0||minimum>1000000){setStatus("Set a valid room minimum first.");return;}
  setUpgrading(true);setStatus("");
  try{
    const shared=await createCardRoom({
      group:Number(groupId),name:lobbyName||"Poker Table",
      capacity:roomCapacity,virtual_buy_in_cents:minimum
    });
    if(!shared?.id)throw Error("Server did not confirm the new shared room.");
    // Each remote participant must join on their own account; local guests
    // and already dealt hands are never silently moved to a shared table.
    nav("/customer/games/clubs/room?group="+encodeURIComponent(groupId)+"&room="+encodeURIComponent(shared.id),{replace:true});
  }catch(err){
    const code=err?.response?.status;
    setStatus(code===404?"Shared poker rooms are not enabled on the server yet. Your local table is unchanged.":err?.response?.data?.detail||err?.message||"Could not create a shared room. Your local table is unchanged.");
  }finally{setUpgrading(false);}
 }
 async function shareRoom(){
  if(shareBusy)return;
  if(!roomId){
    setStatus("This is a local preview stored on your phone. It has no shared room ID, so a friend cannot join it by link. Shared rooms must be enabled on the server first. The Card Club invitation adds members to your club, not this table.");
    return;
  }
  setShareBusy(true);
  try{
    const roomPath="/customer/games/join?group="+encodeURIComponent(groupId)+"&room="+encodeURIComponent(roomId);
    const invitation=await createGroupInviteLink(Number(groupId),"MEMBER");
    const raw=invitation?.invite_url||invitation?.url||invitation?.link||(invitation?.token?window.location.origin+"/social/invite/"+invitation.token:"");
    if(!raw)throw Error("Could not create a club invitation.");
    const link=new URL(raw,window.location.origin);
    link.searchParams.set("mode","club");
    link.searchParams.set("next",roomPath);
    const url=link.href;
    setInviteUrl(url);
    if(navigator.share)await navigator.share({title:lobbyName+" · Join my SyncWorks poker table",text:"This link takes you to my existing poker room after joining the club. Club approval may be required.",url});
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setStatus("Table invitation copied. Players are directed to this specific room after club access is approved.");}
    else setStatus("Table invitation: "+url);
  }catch(err){if(err?.name!=="AbortError")setStatus(err?.response?.data?.detail||err?.message||"Could not share table.");}
  finally{setShareBusy(false);}
 }
 function changeGame(nextCode){
  setSelectedGame(nextCode);
  if(dealerChoosing||nextCode==="357")return;
  const next=TABLE_GAMES.find(g=>g.code===nextCode);
  if(!next)return;
  saveCardNight({groupId,roomId,people,stacks:chipStacks.length===people.length?chipStacks:people.map(p=>p.chips??2000),pot,dealer,gameNumber:sessionGames,capCents,rebuyCounts,sittingOut,cashouts,virtualSessionId});
  // All other game choices open the same branded table shell.
  const qs=new URLSearchParams();
  if(groupId)qs.set("group",groupId);
  if(roomId)qs.set("room",roomId);
  qs.set("game",nextCode);
  nav("/customer/games/variant?"+qs.toString());
 }
 function finishGameAndPassDealer(){
  const rotation=rotationAfterPot({potCents:pot,dealer,playerCount:tableSize});
  if(!rotation.gameFinished){setStatus("A replacement pot remains. This dealer continues until it is fully dragged.");return;}
  const next=rotation.nextDealer;
  clearPracticeGame(user?.id,groupId,"357");
  setSessionGames(v=>v+1);setDealer(next);setPhase("setup");setSession("setup");setChoices([]);setViewer(null);closeDrawer();
  setShowdownViewer(null);setOutcome(null);setChipAnimation(null);setReveal({});
  setStrikes({});setHands([]);setDeck([]);setRound(0);setDealerChoosing(true);
  if(people[next]?.kind==="computer"){
    const pick=chooseVirtualDealer();setSelectedGame(pick.game);setAnte(pick.ante);
    addLog(people[next].name+" picked "+(TABLE_GAMES.find(g=>g.code===pick.game)?.label||pick.game)+" with "+pick.ante+" virtual ante.");
  }else{setSelectedGame("357");addLog(people[next]?.name+" is the next dealer. Choose the next game and ante.");}
 }
 function confirmRebuy(){
  const add=centsFromDollars(rebuyAmount),index=Number(rebuySeat);
  if(add!==2000||!people[index]){setStatus("Each rebuy is exactly $20.");return;}
  if(people[index].kind==="computer"){setStatus("AI opponents cannot rebuy. They leave when their chips are exhausted.");return;}
  if((rebuyCounts[index]||0)>=4){setStatus("Maximum four $20 rebuys per player ($100 total).");return;}
  setRebuyCounts(old=>({...old,[index]:(old[index]||0)+1}));
  if(session==="playing")setChipStacks(old=>rebuyChips(old,index,add));
  else setChipStacks(old=>(old.length===people.length?old:people.map(p=>p.chips??2000)).map((v,i)=>i===index?v+add:v));
  setSittingOut(old=>({...old,[index]:false}));
  addLog(people[index].name+" rebought "+displayMoney(add)+" (rebuy "+((rebuyCounts[index]||0)+1)+"/4).");
  setStatus(people[index].name+" rebought "+displayMoney(add)+". No real money was charged.");
  setRebuyOpen(false);
 }
 function sitOutPlayer(index){
  if(session==="playing"&&phase!=="resolved"){setStatus("Finish the current round before sitting out.");return;}
  setSittingOut(old=>({...old,[index]:true}));setHandFolds(old=>({...old,[index]:true}));setStatus(people[index].name+" is sitting out; their chips remain saved.");
 }
 function cashOutPlayer(index){
  if(session==="playing"&&phase!=="resolved"){setStatus("Finish the current round before leaving.");return;}
  const balance=chipStacks[index]??people[index]?.chips??0;
  if(balance<0){setStatus("Balance must be nonnegative before cashing out.");return;}
  const nextCashouts=[...cashouts,{seat:index,name:people[index].name,chips:balance,at:new Date().toISOString()}];
  const nextStacks=(chipStacks.length===people.length?chipStacks:people.map(p=>p.chips??2000)).map((v,i)=>i===index?0:v);
  try{savePracticeSummary(groupId,buildPracticeSummary({id:virtualSessionId,players:people,stacks:nextStacks,rebuyCounts,cashouts:nextCashouts,pot,gameCount:sessionGames}));}catch(e){setStatus("Could not save this cash-out to local statistics: "+e.message);return;}
  setCashouts(nextCashouts);setSittingOut(old=>({...old,[index]:true}));
  setChipStacks(nextStacks);
  setStatus(people[index].name+" cashed out "+displayMoney(balance)+" in virtual chips (local session record).");
 }
 function restartPracticeSession(){
  // Explicit practice reset; reset the full ledger and current game together.
  const restored=people.map(p=>Number.isFinite(p.chips)?p.chips:roomMinimum??2000);
  clearCardNight();
  setChipStacks(restored);setPot(0);setStrikes({});setDealer(0);setSessionGames(1);setRebuyCounts({});setSittingOut({});setHandFolds({});setCashouts([]);setVirtualSessionId("practice-"+Date.now()+"-"+Math.random().toString(36).slice(2));
  setSession("setup");setPhase("setup");setRound(0);setHands([]);setDeck([]);
  setChoices([]);setOutcome(null);setReveal({});setRevealStep(0);setChipAnimation(null);
  setDealerChoosing(false);setSelectedGame("357");setViewer(null);setCounter(null);
  setShowdownViewer(null);setLog([]);setResetConfirm(false);closeDrawer();
  setStatus("Practice session restarted. Virtual chips and pot reset to original buy-ins; names and seats were retained.");
 }
 function setPotCap(value){
  const next=value==="unlimited"?100000000:centsFromDollars(value);
  if(![1000,2000,5000,100000000].includes(next)){setStatus("Select $10, $20, $50 or Unlimited.");return;}
  if(next<pot){setStatus("The cap cannot be lower than the existing pot. Finish or restart the session first.");return;}
  setMaxPot(value);setCapDraft(value);setStatus(next===100000000?"Unlimited virtual pot selected.":"Maximum pot set to "+displayMoney(next)+".");
 }
 function startDealerSelectedGame(){
  if(!dealerChoosing)return;
  if(!Number.isFinite(Number(ante))||Number(ante)<0||Number(ante)>100){setStatus("Choose an ante between $0 and $100.");return;}
  if(selectedGame==="357"){setDealerChoosing(false);setSession("playing");setLog([]);dealOpening(0,chipStacks,{});return;}
  // Other games have independent local prototypes; never imply chip ledger transfer.
  const next=TABLE_GAMES.find(g=>g.code===selectedGame);
  if(!next)return;
  saveCardNight({groupId,roomId,people,stacks:chipStacks.length===people.length?chipStacks:people.map(p=>p.chips??2000),pot,dealer,gameNumber:sessionGames,capCents,rebuyCounts,sittingOut,cashouts,virtualSessionId});
  const q=new URLSearchParams({practice:"1",ante:String(ante),dealer:String(dealer),fromPoker:"1",game:selectedGame});
  if(groupId)q.set("group",groupId);
  if(roomId)q.set("room",roomId);
  if(selectedGame==="bozo"){q.set("handSize",String(dealerBozoSize));q.set("botStyle",botStyle);}
  nav("/customer/games/variant?"+q.toString());
 }
 function storeLocalSeats(updated){
  if(!groupId||roomId)return;
  try{
    const stored=readLocalRoom(groupId);
    if(!stored)return;
    localStorage.setItem(localRoomKey(groupId),JSON.stringify({...stored,seats:updated.map(p=>({id:p.id,name:p.name,kind:p.kind,photo:p.photo||"",virtual_chips_cents:p.chips}))}));
  }catch{setStatus("Seats changed, but this browser could not save the local table.");}
 }
 function updateSeats(action){
   if(session!=="setup")return;
   setPeople(current=>{const result=action(current);storeLocalSeats(result);return result;});
 }
 function addGuestToTable(event){
   event.preventDefault();
   const name=seatName.trim().slice(0,24);
   const amount=Math.round(Number(seatBuyin)*100);
   if(!name){setSeatError("Enter a player name.");return;}
   if(!Number.isSafeInteger(amount)||amount<(roomMinimum??0)||amount>1000000){setSeatError("Choose a valid virtual chip buy-in at or above the room minimum.");return;}
   if(people.length>=roomCapacity){setSeatError("This table has no open seats.");return;}
   updateSeats(old=>[...old,{id:uid(),name,kind:"guest",chips:amount}]);
   setSeatError("");setSeatName("");setSeatEditor(false);
 }
 function addComputerToTable(){
   if(session!=="setup"||people.length>=roomCapacity)return;
   const virtualCount=people.filter(p=>p.kind==="computer").length;
   updateSeats(old=>[...old,{id:uid(),name:"Virtual Player "+(virtualCount+1),kind:"computer",chips:roomMinimum??2000}]);
 }
 function preparedChoices(size,cards=hands,stage=round){return people.slice(0,size).map((p,i)=>p.kind==="computer"?!cards[i]?.length?"drop":pickPracticeBotChoice(cards[i],stage,botStyle):null);}
 function dealOpening(previousPot=0,previousChips=null,previousStrikes=null){
  const stack=previousChips||people.map(p=>Number.isFinite(p.chips)?p.chips:Math.max(0,Math.round(Number(startingChips)*100)));
  if(isSharedRoom){setStatus("Shared rooms are lobby-only. Secure server-side gameplay is not live yet; dealing here would expose other players\' cards.");return;}
  if(tableSize<2||tableSize>6){setStatus("Choose 2–6 players before dealing.");return;}
  if(!Number.isSafeInteger(anteCents)||anteCents<0||!Number.isSafeInteger(capCents)||capCents<1){setStatus("Set valid ante and pot-cap amounts.");return;}
  let active=people.map((_,i)=>i).filter(i=>!sittingOut[i]&&!(people[i]?.kind==="computer"&&stack[i]<=0));
  if(previousPot>capCents){setStatus("The current pot exceeds the selected cap. Increase the cap or reset practice.");return;}
  let actualAnte=limitAnte({potCents:previousPot,capCents,anteCents,playerCount:Math.max(1,active.length)});
  const bustedBots=people.flatMap((p,i)=>p.kind==="computer"&&!sittingOut[i]&&(!active.includes(i)||stack[i]<Math.max(1,actualAnte))?[i]:[]);
  if(bustedBots.length){active=active.filter(i=>!bustedBots.includes(i));setSittingOut(old=>({...old,...Object.fromEntries(bustedBots.map(i=>[i,true]))}));addLog(bustedBots.map(i=>people[i].name).join(", ")+" out of chips · no AI rebuy.");}
  if(active.length<2){setStatus("Fewer than two funded players remain. AI bots cannot rebuy.");return;}
  actualAnte=limitAnte({potCents:previousPot,capCents,anteCents,playerCount:active.length});
  if(stack.some((value,i)=>active.includes(i)&&value<Math.max(1,actualAnte)&&people[i]?.kind!=="computer")){
   setStatus("A human player needs a rebuy or must sit out before dealing.");setRebuySeat(stack.findIndex((value,i)=>active.includes(i)&&value<Math.max(1,actualAnte)&&people[i]?.kind!=="computer"));setRebuyOpen(true);return;
  }
  const fresh=dealt357(createShuffledDeck(),tableSize,active);
  const afterAnte=stack.map((v,i)=>v-(active.includes(i)?actualAnte:0));
  const newPot=previousPot+active.length*actualAnte;
  if(actualAnte<anteCents)addLog(actualAnte===0?"Pot cap reached: no more antes until a qualifying winner drags the pot.":"Pot cap reduced the starting ante to "+displayMoney(actualAnte)+" each.");
  setHands(fresh.hands);setDeck(fresh.deck);setRound(0);setHandFolds({});setDealAnimation({nonce:Date.now(),count:3});setMyHandVisible(true);
  setChipStacks(afterAnte);setPot(newPot);setStrikes(previousStrikes||{});
  setReveal({});setRevealStep(0);setShowdownViewer(null);setChipAnimation(null);setOutcome(null);setViewer(null);setCounter(null);closeDrawer();
  const instant=fresh.hands.flatMap((hand,i)=>active.includes(i)&&instant357(hand)?[i]:[]);
  if(instant.length===1){
   const winner=instant[0];setChipStacks(afterAnte.map((v,i)=>i===winner?v+newPot:v));setPot(0);
   setOutcome({kind:"instant",winner,entered:[winner],delta:[],potDraggedCents:newPot,message:people[winner].name+" received 3-5-7 on the opening deal. Instant pot win!"});
   setPhase("resolved");addLog(people[winner].name+" dealt natural 3-5-7 — instant win.");
  }else if(instant.length>1){
   setPhase("review");addLog("Multiple 3-5-7 instant hands — dealer review required.");
  }else{
   setChoices(preparedChoices(tableSize,fresh.hands,0).map((c,i)=>sittingOut[i]?"drop":c));setPhase("choosing");addLog("Three cards dealt. 3s are wild. Players choose Drop or Hold.");
  }
 }
 function start(){setSession("playing");setLog([]);dealOpening(0,chipStacks.length===people.length?chipStacks:null,{});}
 function choose(c){if(phase!=="choosing"||currentIndex<0||!canActCurrent)return;setChoices(old=>old.map((v,i)=>i===currentIndex?c:v));if(c==="drop")setHandFolds(old=>({...old,[currentIndex]:true}));setViewer(null);addLog(people[currentIndex].name+" is READY.");}
 function countdown(){if(isSharedRoom||phase!=="choosing"||!allReady)return;setPhase("countdown");addLog("Dealer started 3, 2, 1 countdown.");}
 function settleCurrentRound(){
  if(phase!=="revealing")return;
  setHandFolds(old=>({...old,...Object.fromEntries(choices.flatMap((c,i)=>c==="drop"?[[i,true]]:[]))}));
   const result=capGutsResult(resolve357({hands,round,choices,potCents:pot,strikes,anteCents}),{potCents:pot,capCents,anteCents,stacks:chipStacks});
  setOutcome({...result,potDraggedCents:result.winner!==null&&result.winner!==undefined?pot:0});
  setShowdownViewer(privateSeatIndex>=0&&choices[privateSeatIndex]==="hold"&&result.entered?.length>1?privateSeatIndex:null);
  setStrikes(result.strikes);
  setChipStacks(previous=>previous.map((value,index)=>value+(result.delta[index]||0)));
  setPot(result.nextPot);
  if(result.winner!==null&&result.winner!==undefined) {
    setChipAnimation({winner:result.winner,amount:pot,losers:result.entered.filter(i=>i!==result.winner),contributions:result.delta.map((delta,seat)=>({seat,amount:Math.max(0,-delta)})).filter(x=>x.amount>0),nonce:Date.now()});
  }else if(result.kind==="all-drop"){
    setChipAnimation({winner:null,amount:result.nextPot-pot,losers:[],contributions:result.delta.map((delta,seat)=>({seat,amount:Math.max(0,-delta)})).filter(x=>x.amount>0),nonce:Date.now()});
  }
  setPhase(result.kind==="tie-review"?"review":"resolved");
  addLog(result.message);
 }
 function next(){
  if(phase!=="resolved")return;
  if(pot===0&&(outcome?.kind==="drag"||outcome?.kind==="instant")){finishGameAndPassDealer();return;}
  if(round===2||outcome?.kind==="instant") {const nextDealer=(dealer+1)%tableSize;setDealer(nextDealer);setHandFolds({});dealOpening(pot,chipStacks,strikes);addLog("Dealer passes to "+people[nextDealer]?.name+". Pot carries into a fresh three-card hand.");return;}
  const updated=ensure357Street({hands,deck,round:round+1,sittingOut});
  setDealAnimation({nonce:Date.now(),count:2});
  setHands(updated.hands);setDeck(updated.deck);setRound(v=>v+1);setViewer(null);setShowdownViewer(null);setMyHandVisible(true);setHandFolds({});setChoices(preparedChoices(tableSize,updated.hands,round+1).map((c,i)=>sittingOut[i]?"drop":c));setReveal({});setRevealStep(0);setOutcome(null);setPhase("choosing");closeDrawer();
  addLog("Two cards added to all "+updated.eligible.length+" seated hands, including players who folded the prior round. Only "+THREE_FIVE_SEVEN[round+1]+"s are wild.");
 }
 const currentPlayer=displayIndex!==null?people[displayIndex]:null;
 const readyCount=choices.filter(c=>c!==null).length;
 const canReveal=phase==="revealing"&&currentReveal!==undefined;
 const gameOver=pot===0&&phase==="resolved"&&(outcome?.kind==="drag"||outcome?.kind==="instant");
 const hasPracticeRecap=practiceMode&&phase==="resolved"&&people.some(p=>p.kind==="computer");
 const winnerHand=outcome?.winner!=null?winningHandText357(hands[outcome.winner],round):null;
 const nextActionLabel=gameOver?"Pass dealer · Choose game":round===2||outcome?.kind==="all-drop"?"Next dealer · New 3-card hand":"Deal 2 more · "+THREE_FIVE_SEVEN[round+1]+"s wild";
 const doNext=()=>gameOver?finishGameAndPassDealer():next();
 useEffect(()=>{if(!drawerOpen)return;const onKey=e=>{if(e.key==="Escape")closeDrawer();};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[drawerOpen]);
 return <main className={"sw-poker-screen"+(session==="playing"?" sw-357-playing sw-card-console-active":"")}><div className="sw-poker-content">
  <header className="sw-poker-top"><PokerLandscapeControl/>
   <button type="button" className="sw-poker-back" onClick={()=>nav(groupId?"/customer/games/new?group="+encodeURIComponent(groupId):"/customer/games")} aria-label="Back to lobby"><ArrowLeft size={21}/></button>
   <div className="sw-poker-symbol" aria-label="SyncWorks">S</div>
   <div className="sw-poker-heading"><strong>SYNCWORKS POKER</strong><small>♧ {lobbyName} · Private table preview</small></div>
   {groupId&&<button type="button" className="sw-poker-icon-btn" aria-label={roomId?"Share poker room":"Room sharing unavailable in local preview"} onClick={shareRoom} disabled={shareBusy}><Share2 size={20}/></button>}
   <span className="sw-poker-capsule">♙ {tableSize}</span>
   <button type="button" className="sw-poker-icon-btn" aria-label="Rules and strategy" onClick={()=>openDrawer("rules")}><Info size={20}/></button>
  </header>
  <PokerSessionBar players={people.map(p=>({...p,chips:p.chips??Math.round(Number(startingChips)*100)}))} stacks={chipStacks.length===people.length?chipStacks:people.map(p=>p.chips??Math.round(Number(startingChips)*100))} groupId={groupId} roomId={roomId} gameNumber={sessionGames} onEnd={()=>{try{savePracticeSummary(groupId,buildPracticeSummary({id:virtualSessionId,players:people,stacks:chipStacks.length===people.length?chipStacks:people.map(p=>p.chips??2000),rebuyCounts,cashouts,pot,gameCount:sessionGames}));}catch(e){console.warn("Virtual session summary could not be saved",e);}clearCardNight();clearPracticeGame(user?.id,groupId,"357");setSession("setup");setHands([]);setDeck([]);setPot(0);setViewer(null);nav(groupId?"/customer/games/clubs?group="+encodeURIComponent(groupId):"/customer/games");}}/>
  <div className="sw-poker-session-status"><span>♣ Card Night · Game {sessionGames}</span><span>Max pot <b>{capText}</b> · {botStyle==="balanced"?"Balanced bots":botStyle==="cautious"?"Cautious bots":"Aggressive bots"}</span></div>
  <div className="sw-poker-round"><div className="sw-poker-round-badge"><div>♠ {gameName}</div><span>Round {round+1} · {wild}s Wild</span></div><div className="sw-poker-steps">{THREE_FIVE_SEVEN.map((n,i)=><div key={i} title={"Round "+(i+1)+": "+n+"s wild"} className={"sw-poker-step"+(i===round?" current":"")}>{i+1}</div>)}</div></div>
  {!roomId&&groupId&&session==="setup"&&roomMinimum!==null&&<section className="mb-3 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-3"><div className="text-sm font-black text-emerald-100">Want players on separate phones?</div><p className="mt-1 text-xs leading-5 text-slate-300">Create a shared waiting room in this Card Club with the same name, seat count and minimum buy-in. Local guests and dealt hands stay on this device, and synchronized game cards are not live yet.</p><button type="button" onClick={upgradeToLiveRoom} disabled={upgrading} className="sw-poker-button primary mt-3 w-full">{upgrading?"Creating shared room…":"♠ Make This a Live Waiting Room"}</button></section>}
  {session==="setup"&&<section className="sw-poker-game-choice sw-poker-unified-choice" aria-label="Dealer game setup">
   <label htmlFor="sw-poker-game-select">{dealerChoosing?people[dealer]?.name+" · Dealer's game choice":"Dealer's game choice"}</label>
   <select id="sw-poker-game-select" value={selectedGame} onChange={e=>changeGame(e.target.value)}>{TABLE_GAMES.map(g=><option key={g.code} value={g.code}>{g.label}</option>)}</select>
   {selectedGame==="bozo"&&<div className="sw-poker-unified-controls"><label>Bozo hand size<select value={dealerBozoSize} onChange={e=>setDealerBozoSize(Number(e.target.value))}><option value={5}>5 cards</option><option value={7}>7 cards</option></select></label><span className="self-end text-xs text-cyan-200">Locked after first deal</span></div>}
    <div className="sw-poker-unified-controls"><label>Ante ($)<input type="number" inputMode="decimal" min="0.01" step="0.01" value={ante} onChange={e=>setAnte(e.target.value)}/></label><label>Maximum pot<select value={capDraft} onChange={e=>{setCapDraft(e.target.value);setPotCap(e.target.value);}}><option value="10">$10</option><option value="20">$20</option><option value="50">$50</option><option value="unlimited">Unlimited</option></select></label></div>
   {dealerChoosing&&<button type="button" onClick={startDealerSelectedGame} className="sw-poker-button gold">♠ Start {TABLE_GAMES.find(g=>g.code===selectedGame)?.label||"Selected Game"}</button>}
  </section>}
  {session==="setup"&&<section className="sw-poker-session-setup sw-poker-bot-setup"><label>Virtual opponents<select value={botStyle} onChange={e=>setBotStyle(e.target.value)}><option value="cautious">Cautious</option><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option></select></label></section>}
  {session==="setup"&&!dealerChoosing&&<section className="sw-poker-quick-setup" aria-label="Poker table seating">
  <div className="sw-poker-quick-header"><div><strong>YOUR TABLE · {tableSize}/{roomCapacity} PLAYERS</strong><p>Choose players, add up to five virtual opponents, then deal.</p></div><span className="sw-poker-purse">♠ {displayMoney(people.reduce((sum,p)=>sum+(p.chips??roomMinimum??2000),0))} chips</span></div>
  <div className="sw-poker-quick-actions"><button type="button" className="sw-poker-button primary" disabled={tableSize>=roomCapacity} onClick={()=>{setSeatBuyin(String((roomMinimum??2000)/100));setSeatEditor(true);setSeatError("");}}><Users size={16} className="mr-1 inline"/> + Add Player</button><button type="button" className="sw-poker-button" disabled={tableSize>=roomCapacity} onClick={addComputerToTable}>🤖 Add Virtual Player ({people.filter(p=>p.kind==="computer").length}/{roomCapacity-people.filter(p=>p.kind!=="computer").length})</button></div>
  <div className="sw-poker-quick-players">{people.map((p,i)=><div className="sw-poker-quick-person" key={p.id}><Photo person={p}/><label className="min-w-0 flex-1 text-xs text-slate-300"><input aria-label={"Player "+(i+1)+" name"} value={p.name} maxLength={24} onChange={e=>updateSeats(old=>old.map((x,j)=>i===j?{...x,name:e.target.value.slice(0,24)}:x))} className="sw-poker-name-input"/><span className="block text-[10px] text-emerald-200">{displayMoney(p.chips??roomMinimum??2000)} · {p.kind==="computer"?"Computer":"Seated"}</span></label>{p.kind!=="host"&&<button type="button" aria-label={"Remove "+p.name} onClick={()=>updateSeats(old=>old.filter((_,j)=>j!==i))} className="sw-poker-remove">×</button>}</div>)}</div>
  <div className="sw-poker-quick-footer"><button type="button" className="sw-poker-button primary" disabled={tableSize<2} onClick={start}>♠ Shuffle & Deal · 3 Cards</button><p>{tableSize<2?"Add at least one more player or a computer to start.":"Ready to deal on this device."}</p></div>
 </section>}
  {status&&<div role="status" className="mb-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-xs text-cyan-100">{status}</div>}
  {roomMinimum!==null&&<div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs"><span>Room minimum: <b>{displayMoney(roomMinimum)}</b> virtual chips</span>{groupId&&<button type="button" onClick={shareRoom} disabled={shareBusy} className="rounded-lg border border-cyan-300/30 px-3 py-2 font-black text-cyan-100"><Share2 size={14} className="mr-1 inline"/> {roomId?"Share table":"Sharing unavailable"}</button>}</div>}
  {practiceMode&&session==="setup"&&<div className="sw-poker-practice-note">♠ Practice Mode · hand tips, odds and ranks in Info</div>}
  {session==="setup"&&<div className="sw-poker-practice-note">Local virtual chip practice · hands are not synchronized between phones.</div>}
  {isSharedRoom&&<div role="alert" className="sw-poker-practice-note">Shared waiting room only. Players cannot safely see their own separate cards until the server-controlled multiplayer engine is live. Dealing is disabled here.</div>}
 {seatEditor&&session==="setup"&&<div className="sw-poker-modal-cover" role="presentation" onClick={()=>setSeatEditor(false)}><form className="sw-poker-modal" role="dialog" aria-modal="true" aria-label="Add poker player" onClick={e=>e.stopPropagation()} onSubmit={addGuestToTable}><div className="flex items-center justify-between"><h2 className="text-xl font-black">Add a player</h2><button type="button" className="sw-poker-button" onClick={()=>setSeatEditor(false)}>✕</button></div><p className="mt-2 text-xs text-slate-400">Local guest seat; no separate phone connection yet.</p><label className="mt-4 block text-xs text-slate-300">Display name<input autoFocus required maxLength={24} value={seatName} onChange={e=>setSeatName(e.target.value)} placeholder="e.g. Zack" className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white"/></label><label className="mt-3 block text-xs text-slate-300">Virtual buy-in ($) · minimum {displayMoney(roomMinimum??0)}<input required type="number" min={(roomMinimum??0)/100} max="10000" step="0.01" value={seatBuyin} onChange={e=>setSeatBuyin(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white"/></label>{seatError&&<p role="alert" className="mt-3 text-xs text-rose-300">{seatError}</p>}<button type="submit" className="sw-poker-button primary mt-4 w-full">Seat Player</button></form></div>}
  <div className="sw-poker-table-space">
   <div className="sw-poker-felt">
    <div className="sw-poker-felt-brand"><i>S</i>SYNCWORKS<br/>POKER</div>{dealAnimation&&phase==="choosing"&&<div className="sw-357-deal-animation" key={dealAnimation.nonce} aria-hidden="true">{people.flatMap((p,i)=>sittingOut[i]?[]:Array.from({length:dealAnimation.count},(_,j)=><span key={i+"-"+j} className={"sw-357-deal-fly from-seat-"+i} style={{"--deal-delay":(i*120+j*70)+"ms"}}>♠</span>))}</div>}
     {chipAnimation?.contributions?.map(({seat,amount},index)=><div key={chipAnimation.nonce+"-"+seat} className={"sw-357-chip-to-pot from-seat-"+seat} style={{"--chip-delay":index*160+"ms"}} aria-hidden="true"><span className="sw-357-moving-chip">●</span><small>{displayMoney(amount)}</small></div>)}
    <div className="sw-poker-pot">{chipAnimation&&<div className={"sw-poker-chip-flight "+(chipAnimation.winner===null?"ante":"payout")} aria-hidden="true">🪙 {chipAnimation.winner!==null?"→ "+people[chipAnimation.winner]?.name:"Antes → Pot"}</div>}<div className="sw-poker-chip-stack"><span className="sw-poker-chip dark"/><span className="sw-poker-chip blue"/><span className="sw-poker-chip red"/></div><div className="sw-poker-pot-amount">Pot: {displayMoney(pot)}</div><div className="sw-poker-pot-small">Ante: {displayMoney(anteCents)} · Cap: {capText}</div></div>
    {counter!==null&&<div aria-live="assertive" className="sw-poker-decision-shadow">{counter}</div>}
    {phase==="choosing"&&activeHumanTurn&&!isSharedRoom&&<div className={"sw-poker-your-turn"+(canActCurrent?" active":" waiting")} aria-live="polite"><strong>{canActCurrent?"YOUR TURN":"PLAYER TURN"}</strong><span>{turnRemaining}s</span></div>}
    {Array.from({length:session==="setup"?roomCapacity:tableSize},(_,i)=>{const p=people[i];return <div key={p?.id||"open-"+i} className={"sw-poker-seat s"+i+(p?"":" sw-poker-seat-empty")} aria-label={p?p.name+" "+(choices[i]!==null?"Ready":"Waiting"):"Open poker seat"}>
      {p?<Photo person={p}/>:<button type="button" aria-label={"Add player to seat "+(i+1)} disabled={session!=="setup"} className="sw-poker-empty-seat" onClick={()=>{setSeatBuyin(String((roomMinimum??2000)/100));setSeatEditor(true);}}>+</button>}
      <div className="sw-poker-seat-nameplate"><strong>{p?.name||"Open Seat"}</strong><small>{p?"◉ "+displayMoney(chipStacks[i]??p.chips??2000):"Tap to join"}</small></div>
      {session==="playing"&&p&&<span className={"sw-poker-status"+(choices[i]!==null&&phase!=="setup"?" ready":"")}>{phase==="choosing"||phase==="countdown"?(choices[i]===null?"◷ Waiting":"✓ Ready"):phase==="revealing"||phase==="resolved"?(choices[i]==="hold"?"Held":choices[i]==="drop"?"Dropped":"Waiting"):"At table"}</span>}
      {session==="playing"&&p&&<div className="sw-357-strike-dots" aria-label={(strikes[i]||0)+" of 3 uncontested holds"}>{[0,1,2].map(n=><span key={n} className={n<(strikes[i]||0)?"filled":""}/>)}</div>}
      {p&&chipAnimation?.winner===i&&<div className="sw-poker-win-pop">+{displayMoney(chipAnimation.amount)}</div>}{p&&chipAnimation?.contributions?.some(x=>x.seat===i)&&<div className="sw-poker-loss-pop">−{displayMoney(chipAnimation.contributions.find(x=>x.seat===i).amount)}</div>}
       {p&&hands[i]?.length>0&&phase==="resolved"&&canSeeOtherHands&&choices[i]==="hold"&&<div className="sw-357-seat-reveal" aria-label={p.name+" cards at completed round showdown"}>{hands[i].map((c,j)=><div key={j} className="sw-357-flip-card sw-357-end-flip" style={{"--flip-delay":j*95+"ms"}}><span className="sw-357-flip-back">♠</span><span className={"sw-357-flip-face"+(isRed(c.suit)?" red":"")}>{rankText(c)}{c.suit}</span></div>)}</div>}
      {p&&dealer===i&&<span className="sw-poker-dealer">D</span>}
    </div>;})}
   </div>
  </div>
  {session!=="setup"&&<>
   {(phase==="choosing"||phase==="resolved")&&<div className="sw-poker-pov sw-357-persistent-hand">
    <p className="sw-poker-pov-label">My cards · {hands[privateSeatIndex]?.length||0} dealt · {wild}s wild {phase==="choosing"&&currentPlayer?"· "+readyCount+"/"+tableSize+" ready":""}</p>
    <div className="sw-poker-facecards sw-357-one-row">{viewCards?viewCards.map((c,i)=><div key={i} className={"sw-357-hand-position"+(dealAnimation?.count===2&&i>=hands[privateSeatIndex].length-2&&phase==="choosing"?" sw-357-new-card":"")} style={{"--card-index":i}}><Card card={c} wild={c.rank===wild}/></div>):(hands[privateSeatIndex>=0?privateSeatIndex:displayIndex??0]||[]).map((c,i)=><div key={i} className="sw-357-hand-position"><Card card={c} hidden/></div>)}</div>


    
   </div>}
   {phase==="countdown"&&<div className="sw-poker-pov rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4"><strong>Everyone is READY</strong><p className="mt-1 text-xs text-cyan-200">Synchronized-style countdown demonstration on this device.</p></div>}
   {phase==="revealing"&&<section className="sw-poker-pov sw-poker-panel sw-poker-showdown sw-poker-compact-result">
    <h3><Eye size={17}/> {held.length===0?"Everyone dropped":held.length===1?"Uncontested hold":"Comparing hands"}</h3>
    <p>Cards remain private until the street settles. {held.length===0?"Everyone dropped; pot carries forward.":"Only holders may review the other holders of this street after the result."}</p>
    
   </section>}
   {phase==="review"&&<section className="sw-poker-panel mx-auto max-w-xl"><h3>Dealer review required</h3><p>{outcome?.message||"More than one player was dealt 3-5-7. No automatic payout has been made."}</p><button type="button" onClick={()=>{setSession("setup");setPhase("setup");}} className="sw-poker-button mt-3">Restart demo</button></section>}
   {phase==="resolved"&&<div className={"sw-357-round-winner-banner"+(outcome?.winner!=null?" sw-357-banner-win":"")} role="status">
     {outcome?.winner!=null?<><strong className="sw-357-banner-title">🏆 WINNER · {people[outcome.winner]?.name}</strong><span className="sw-357-banner-detail">{winnerHand} · Won {displayMoney(outcome.potDraggedCents??0)}{outcome?.entered?.length>1?" · "+outcome.entered.filter(i=>i!==outcome.winner).length+" loser(s) replace "+displayMoney(outcome.matchingAmountCents??0):""}</span></>:
     outcome?.kind==="lone-strike"?<><strong className="sw-357-banner-title">Uncontested hold · {people[outcome.entered?.[0]]?.name}</strong><span className="sw-357-banner-detail">{strikes[outcome.entered?.[0]]||0}/3 dots filled · Pot carries to next round</span></>:
     <><strong className="sw-357-banner-title">{outcome?.kind==="all-drop"?"Everyone folded":"Round settled"}</strong><span className="sw-357-banner-detail">{outcome?.kind==="all-drop"?"Pot carries · all seated players continue":outcome?.message}</span></>}
     {competingHolders&&eligibleShowdownViewers.length>0&&<button type="button" onClick={()=>openDrawer("hands")} className="sw-357-review-holders">View held hands · {held.length} players</button>}
    </div>}
  </>}
 </div>

 {session==="playing"&&<nav className="sw-poker-sticky-actions" aria-label="Poker actions">
  {groupId&&<div className="sw-card-console-table-switch"><CardClubTableSwitcher groupId={groupId} currentRoomId={roomId} userId={user?.id} navigate={nav} compact/></div>}
  <div className="sw-poker-action-top"><strong>♠ {phase==="choosing"?(currentPlayer?.name||"Dealer")+" · "+readyCount+"/"+tableSize+" ready":phase==="resolved"?"Round settled":phase==="revealing"?"Showdown in progress":phase==="countdown"?"3 · 2 · 1":"Poker"}</strong><div className="sw-poker-quick-management"><span>Pot {displayMoney(pot)} / {capText}</span><button type="button" onClick={()=>{setRebuySeat(0);setRebuyAmount("20");setRebuyOpen(true);}}>+ Rebuy</button><button type="button" onClick={()=>setResetConfirm(true)}>↻ Reset</button></div></div>
  <div className="sw-poker-action-buttons">
   {isSharedRoom&&<span className="sw-poker-action-wait">Shared lobby only · secure real-time dealing is not yet available</span>}
   {!isSharedRoom&&privateSeatIndex>=0&&<button type="button" className="sw-poker-action hide sw-357-show-toggle" onClick={()=>setMyHandVisible(v=>!v)} aria-pressed={myHandVisible}>{myHandVisible?<><EyeOff size={16}/> Hide</>:<><Eye size={16}/> Show</>}</button>}
   {!isSharedRoom&&phase==="choosing"&&currentPlayer&&canActCurrent?<><button type="button" className="sw-poker-action fold" onClick={()=>choose("drop")}>Drop</button><button type="button" className="sw-poker-action hold" onClick={()=>choose("hold")}>Hold</button></>:
    !isSharedRoom&&phase==="choosing"&&currentPlayer?<span className="sw-poker-action-wait">Waiting for {currentPlayer.name} · {turnRemaining}s</span>:
    !isSharedRoom&&phase==="choosing"&&allReady?<button type="button" className="sw-poker-action hold grow" onClick={countdown}>3 · 2 · 1 Reveal</button>:
    !isSharedRoom&&phase==="resolved"?<button type="button" className="sw-poker-action hold grow" onClick={doNext}>{nextActionLabel} <ChevronRight size={16}/></button>:
    phase==="revealing"?<span className="sw-poker-action-wait">Evaluating hands privately…</span>:
    <span className="sw-poker-action-wait">Waiting for round…</span>}
   <button type="button" className="sw-poker-action info" onClick={()=>openDrawer("log")} aria-label="Show round results"><BookOpen size={19}/><span>Results</span></button><button type="button" className="sw-poker-action info" onClick={()=>openDrawer("rules")} aria-label="Open game information"><Info size={19}/><span>Info</span></button>
  </div>
 </nav>}
 {drawerOpen&&<div className="sw-poker-drawer-backdrop" role="presentation" onClick={closeDrawer}>
  <section role="dialog" aria-modal="true" aria-label="Poker details" className="sw-poker-drawer" onClick={e=>e.stopPropagation()}>
   <div className="sw-poker-drawer-grip" aria-hidden="true"/>
   <div className="sw-poker-drawer-heading"><div><strong>♠ Table Details</strong><small>Practice mode · {gameName} · {wild}s wild</small></div><button type="button" className="sw-poker-drawer-close" aria-label="Close table details" onClick={closeDrawer}>✕</button></div>
   <div role="tablist" aria-label="Poker details" className="sw-poker-drawer-tabs">{[["hands","Hands"],["ranks","Rankings"],["strategy","Tips"],["rules","Rules"],["log","Log"],["settings","Settings"]].map(([tab,label])=><button type="button" key={tab} role="tab" aria-selected={drawerTab===tab} onClick={()=>setDrawerTab(tab)} className={drawerTab===tab?"active":""}>{label}</button>)}</div>
   <div className="sw-poker-drawer-body">
    {drawerTab==="hands"&&<>
      {phase==="choosing"&&<>{handInsight&&viewCards?<div className="sw-practice-hint"><strong>{handInsight.name}</strong><p>{handInsight.wildCount?handInsight.wildCount+" wild card(s) · ":""}{wild}s are wild. {round===0?"No flushes or straights in the 3-card round.":round===2?"Best five cards from seven.":"Five-card hand ranking."}</p>{equity&&<div className="sw-practice-equity"><div><b>{equity.percent}%</b><span>Estimate against one random hand</span></div><div className="sw-practice-equity-track"><i style={{width:equity.percent+"%"}}/></div><small>Practice simulation using {equity.trials} random hands, not the opponents' actual cards. Not a guaranteed win.</small></div>}</div>:<p>Tap <b>Show hand</b> in the bottom bar first to see your hand strength and estimated odds. Opponents' cards stay hidden until the round ends.</p>}</>}
      {phase==="revealing"&&<p>Hands are being evaluated. Only holders may inspect other holding hands after settlement; folded cards stay private.</p>}
      {phase==="resolved"&&<><p>{!competingHolders?"No cards revealed: fewer than two players held.":"Only a player who held may inspect other holders' cards. Folded hands stay private."}</p>{isFinalShowdown&&competingHolders&&<div className="sw-poker-drawer-buttons">{eligibleShowdownViewers.map(i=><button key={people[i].id} type="button" className={showdownViewer===i?"active":""} onClick={()=>setShowdownViewer(v=>v===i?null:i)}>{showdownViewer===i?"Hide cards":"View as "+people[i].name}</button>)}{showdownViewer!==null&&<button type="button" onClick={()=>setShowdownViewer(null)}>Hide all</button>}</div>}{canSeeOtherHands?<div className="sw-poker-drawer-hands">{held.map(i=><section key={people[i].id}><strong>{people[i].name} · Held</strong><div className="sw-poker-facecards">{hands[i]?.map((c,j)=><Card key={j} card={c} wild={c.rank===wild}/>)}</div></section>)}</div>:<p>{competingHolders?"Only a signed-in player who held this round can review the other holders after settlement. The next street hides them again.":"Only the pot and result are shown."}</p>}</>}
      {phase==="countdown"&&<p>The decision countdown is underway. Opponents' hands stay private.</p>}
      {phase==="review"&&<p>Dealer review required. No automatic payout has been made.</p>}
    </>}
    {(drawerTab==="ranks"||drawerTab==="strategy"||drawerTab==="rules")&&<div className="sw-poker-drawer-prose">{helperContent(drawerTab,round)}</div>}
    {drawerTab==="settings"&&<div className="sw-poker-settings"><h3>Table limits</h3><label>Maximum pot <select value={capDraft} onChange={e=>{setCapDraft(e.target.value);setPotCap(e.target.value);}}><option value="10">$10</option><option value="20">$20</option><option value="50">$50</option><option value="unlimited">Unlimited</option></select></label><button type="button" className="sw-poker-button mt-2" onClick={()=>setPotCap(capDraft)}>Apply maximum pot</button><p>At the cap, no additional chips enter. The next qualifying winner drags the capped pot and the dealer rotates.</p><h3>Player status & cash-out</h3><p>$20 starting chips, up to four $20 rebuys per player each session. Sit out between rounds, then return on the next deal. Cash-out records the current virtual stack.</p>{people.map((p,i)=><div key={p.id} className="sw-poker-drawer-ledger"><span>{p.name} · {displayMoney(chipStacks[i]??p.chips??0)} · {rebuyCounts[i]||0}/4 rebuys {sittingOut[i]?"· OUT":""}</span><div className="flex flex-wrap gap-1">{sittingOut[i]?<button type="button" className="sw-poker-button" onClick={()=>{if((chipStacks[i]??0)>0){setSittingOut(old=>({...old,[i]:false}));setStatus(p.name+" returns on the next fresh deal.");}else{setRebuySeat(i);setRebuyAmount("20");setRebuyOpen(true);}}}>Return / Rebuy</button>:<button type="button" className="sw-poker-button" onClick={()=>sitOutPlayer(i)}>Sit out</button>}<button type="button" className="sw-poker-button" disabled={sittingOut[i]} onClick={()=>cashOutPlayer(i)}>Cash out</button></div></div>)}<h3 className="mt-3">Virtual cash-outs</h3>{cashouts.map((c,i)=><p key={i}>{c.name}: {displayMoney(c.chips)} · {new Date(c.at).toLocaleString()}</p>)}<label>Virtual player behavior<select value={botStyle} onChange={e=>setBotStyle(e.target.value)}><option value="cautious">Cautious · fewer holds</option><option value="balanced">Balanced · stronger hands hold more</option><option value="aggressive">Aggressive · holds more often</option></select></label><p>Balanced is recommended with six seats. Aggressive increases the frequency of holding.</p><button type="button" className="sw-poker-button" onClick={()=>setRebuyOpen(true)}>+ Rebuy chips</button><button type="button" className="sw-poker-button mt-2" onClick={()=>setResetConfirm(true)}>↻ Reset practice session</button></div>}
    {drawerTab==="log"&&<><h3>Round details</h3>{phase==="resolved"&&<div className="sw-poker-drawer-summary"><p>{outcome?.message}</p><p>Winner's pot: {displayMoney(outcome?.potDraggedCents??0)} · Next pot: {displayMoney(pot)}</p>{outcome?.kind==="drag"&&outcome.entered.filter(i=>i!==outcome.winner).map(i=><p key={people[i].id}>{people[i].name} replaces {displayMoney(outcome.matchingAmountCents??outcome.potDraggedCents??0)}</p>)}</div>}<h3>Player chip balances</h3>{people.map((p,i)=><div key={p.id} className="sw-poker-drawer-ledger"><span>{p.name}</span><b>{displayMoney(chipStacks[i]??p.chips??0)}</b></div>)}<h3>Game log</h3>{log.length?log.map(entry=><p className="sw-poker-drawer-log-entry" key={entry.id}><span>{entry.time}</span>{entry.message}</p>):<p>No actions yet.</p>}</>}
   </div>
  </section>
 </div>}
 {rebuyOpen&&<div className="sw-poker-modal-cover" role="presentation" onClick={()=>setRebuyOpen(false)}><section role="dialog" aria-modal="true" aria-label="Rebuy virtual chips" className="sw-poker-modal" onClick={e=>e.stopPropagation()}><h2 className="text-xl font-black">+ Rebuy virtual chips</h2><p className="mt-2 text-sm text-slate-300">Add practice chips to a player. This does not change the pot or charge money.</p><label className="mt-4 block text-sm">Player<select className="mt-1 w-full rounded-lg border border-cyan-400/30 bg-slate-950 p-3" value={rebuySeat} onChange={e=>setRebuySeat(Number(e.target.value))}>{people.map((p,i)=><option key={p.id} value={i}>{p.name} · {displayMoney(chipStacks[i]??p.chips??0)}</option>)}</select></label><p className="mt-3 text-sm text-cyan-200">Rebuy: <strong>$20.00</strong> · {rebuyCounts[rebuySeat]||0} of 4 used · Maximum total contributions $100 per player per session.</p><div className="mt-4 flex gap-2"><button className="sw-poker-button" type="button" onClick={()=>setRebuyOpen(false)}>Cancel</button><button className="sw-poker-button primary flex-1" type="button" onClick={confirmRebuy}>Confirm Rebuy</button></div></section></div>}
 {resetConfirm&&<div className="sw-poker-modal-cover" role="presentation" onClick={()=>setResetConfirm(false)}><section role="dialog" aria-modal="true" aria-label="Reset practice session" className="sw-poker-modal" onClick={e=>e.stopPropagation()}><h2 className="text-xl font-black">↻ Reset practice session?</h2><p className="mt-2 text-sm text-slate-300">The pot returns to $0, players return to their starting virtual buy-ins, and all hands and strikes are cleared. Seats and names stay the same. This cannot be undone.</p><div className="mt-4 flex gap-2"><button type="button" className="sw-poker-button" onClick={()=>setResetConfirm(false)}>Keep playing</button><button type="button" className="sw-poker-button primary flex-1" onClick={restartPracticeSession}>Reset Session</button></div></section></div>}
 </main>;
}

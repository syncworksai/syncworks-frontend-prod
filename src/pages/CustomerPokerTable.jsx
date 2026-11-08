import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,BookOpen,Check,ChevronRight,Eye,EyeOff,Info,Lightbulb,RotateCcw,Shield,Spade,Target,Users,WalletCards} from "lucide-react";
import {getCardRoom} from "../api/cardRooms";
import {createGroupInviteLink} from "../api/social";
import {useAuth} from "../auth/AuthContext";
import {Share2} from "lucide-react";
import {addRoundCards,cardRank,createShuffledDeck,dealt357,displayMoney,instant357,rate357,resolve357,THREE_FIVE_SEVEN} from "../games/drop357Table.mjs";
import "./CustomerPokerTable.css";

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
 if(page==="strategy")return <><p>Beginner reminders — not a promise of winning:</p><p><b>3-card stage:</b> Pairs and three of a kind matter. Straights and flushes do not count. Your 3s are wild only during this round.</p><p><b>5- and 7-card stages:</b> Look for combinations helped by the current wild rank. Former wilds become ordinary cards.</p><p>Holding exposes you to a full match-the-pot loss if another holder has the stronger hand. Dropping avoids that penalty.</p></>;
 return <><p>One growing hand: start with 3 cards (3s wild), add 2 (5s wild), add 2 (7s wild). In the seven-card round compare the best five cards.</p><p>Everyone privately chooses <b>Hold</b> or <b>Fold</b>. Ready means a decision was saved, not what it was. The dealer starts a 3, 2, 1 reveal after all are ready.</p><p>Only holders show their cards, left of dealer first. The stronger holding hand drags the pot; every other losing holder matches the prior pot into the next pot.</p><p>One holder needs three cumulative uncontested holds to drag the pot. If everyone folds, each antes again. An opening 3-5-7 hand instantly wins the pot.</p><p>The pot cap pauses play for dealer review; this preview never moves real money.</p></>;
}
export default function CustomerPokerTable(){
 const nav=useNavigate(),[params]=useSearchParams();
 const {user}=useAuth();
 const groupId=params.get("group")||"";
 const roomId=params.get("room")||"";
 const [people,setPeople]=useState(DEFAULT_PLAYERS);
 const [lobbyName,setLobbyName]=useState("Saturday Poker");
 const [dealer,setDealer]=useState(0),[session,setSession]=useState("setup");
 const [phase,setPhase]=useState("setup"),[round,setRound]=useState(0),[hands,setHands]=useState([]),[deck,setDeck]=useState([]);
 const [choices,setChoices]=useState([]),[viewer,setViewer]=useState(null);
 const [counter,setCounter]=useState(null),[reveal,setReveal]=useState({}),[outcome,setOutcome]=useState(null);
 const [strikes,setStrikes]=useState({}),[pot,setPot]=useState(0),[chipStacks,setChipStacks]=useState([]);
 const [ante,setAnte]=useState("0.25"),[maxPot,setMaxPot]=useState("50"),[startingChips,setStartingChips]=useState("20");
 const [guide,setGuide]=useState(null),[status,setStatus]=useState(""),[log,setLog]=useState([]),[remoteNotice,setRemoteNotice]=useState(false);
 const [shareBusy,setShareBusy]=useState(false),[inviteUrl,setInviteUrl]=useState(""),[roomMinimum,setRoomMinimum]=useState(null),[roomCapacity,setRoomCapacity]=useState(6);
 const [selectedGame,setSelectedGame]=useState("357");
 const [seatEditor,setSeatEditor]=useState(false),[seatName,setSeatName]=useState(""),[seatBuyin,setSeatBuyin]=useState("20"),[seatError,setSeatError]=useState("");
 const anteCents=Math.round(Number(ante)*100),capCents=Math.round(Number(maxPot)*100);
 const wild=THREE_FIVE_SEVEN[round];
 const tableSize=people.length;
 const currentIndex=choices.findIndex(c=>c===null);
 const allReady=choices.length===tableSize&&choices.every(c=>c!==null);
 const held=choices.flatMap((c,i)=>c==="hold"?[i]:[]);
 const revealOrder=useMemo(()=>held.slice().sort((a,b)=>((a-dealer+tableSize-1)%tableSize)-((b-dealer+tableSize-1)%tableSize)),[choices,dealer,tableSize]);
 const revealedCount=Object.values(reveal).reduce((sum,n)=>sum+n,0);
 const totalRevealCards=revealOrder.reduce((sum,i)=>sum+(hands[i]?.length||0),0);
 const currentReveal=revealOrder.find(i=>(reveal[i]||0)<(hands[i]?.length||0));
 const displayIndex=currentIndex>=0?currentIndex:null;
 const viewCards=viewer!==null&&phase==="choosing"?hands[viewer]:null;
 function addLog(message){setLog(old=>[{id:uid(),message,time:new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})},...old].slice(0,32));}
 useEffect(()=>{let mounted=true;
  if(roomId){getCardRoom(roomId).then(r=>{if(!mounted)return;setLobbyName(r.name||"Poker Table");if(Array.isArray(r.seats)&&r.seats.length>=2){setPeople(r.seats.map(getPlayer));setStartingChips(String((r.virtual_buy_in_cents??2000)/100));setRoomMinimum(r.minimum_buy_in_cents??r.virtual_buy_in_cents??2000);setRoomCapacity(r.capacity||6);const idx=r.seats.findIndex(s=>s.position===r.dealer_position);if(idx>=0)setDealer(idx);setRemoteNotice(true);}}).catch(()=>{if(mounted)setStatus("Shared lobby unavailable; use the local preview with sample seats.");});}
  else if(groupId){const r=readLocalRoom(groupId);if(r?.seats?.length){setLobbyName(r.name||"Poker Table");setPeople(r.seats.map(getPlayer));setStartingChips(String((r.buyInCents??2000)/100));setRoomMinimum(r.buyInCents??2000);setRoomCapacity(r.capacity||6);setRemoteNotice(false);}}
  return()=>{mounted=false;};
 },[groupId,roomId]);
 useEffect(()=>{if(phase!=="countdown")return;setCounter(3);const started=Date.now();const timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);const remaining=3-elapsed;if(remaining<=0){clearInterval(timer);setCounter(null);setPhase("revealing");setViewer(null);addLog("Dealer countdown finished — held hands may be revealed.");}else setCounter(remaining);},120);return()=>clearInterval(timer);},[phase]);
 async function shareRoom(){
  if(shareBusy)return;
  setShareBusy(true);
  try{
    // For a local room, sharing invites approved club membership, NOT this table.
    let url=inviteUrl;
    if(!url){
      if(!groupId)throw Error("Create a club room to share an invitation.");
      if(roomId){
        url=window.location.origin+"/customer/games/clubs/room?group="+encodeURIComponent(groupId)+"&room="+encodeURIComponent(roomId);
      }else{
        const invitation=await createGroupInviteLink(Number(groupId),"MEMBER");
        const raw=invitation?.invite_url||invitation?.url||invitation?.link||(invitation?.token?window.location.origin+"/social/invite/"+invitation.token:"");
        if(!raw)throw Error("The club invitation service did not provide a link.");
        const link=new URL(raw,window.location.origin);
        link.searchParams.set("mode","club");
        link.searchParams.set("next",roomId?"/customer/games/clubs/room?group="+groupId+"&room="+roomId:"/customer/games/new?group="+groupId);
        url=link.toString();
      }
      setInviteUrl(url);
    }
    if(navigator.share)await navigator.share({title:roomId?"SyncWorks Poker Room":"SyncWorks Card Club Invitation",text:roomId?"Join our private poker waiting room. Sign in to your approved club account first.":"Join our Card Club. This is a club invitation; local game seats are not shared between devices yet.",url});
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setStatus("Invitation link copied. "+(roomId?"Members can open the waiting room after approval.":"This invites members to the club, not to this local table."));}
    else setStatus("Share link: "+url);
  }catch(err){if(err?.name!=="AbortError")setStatus(err?.response?.data?.detail||err?.message||"Unable to share invitation.");}
  finally{setShareBusy(false);}
 }
 function changeGame(nextCode){
  setSelectedGame(nextCode);
  if(nextCode==="357")return;
  const next=TABLE_GAMES.find(g=>g.code===nextCode);
  if(!next)return;
  // Other engines have their own local prototype routes, not this 3-5-7 evaluator.
  const qs=new URLSearchParams();
  if(groupId)qs.set("group",groupId);
  if(roomId)qs.set("room",roomId);
  nav(next.path+(qs.toString()?"?"+qs.toString():""));
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
   if(session!=="setup"||people.length>=roomCapacity||people.some(p=>p.kind==="computer"))return;
   updateSeats(old=>[...old,{id:uid(),name:"Computer",kind:"computer",chips:roomMinimum??2000}]);
 }
 function preparedChoices(size){return people.slice(0,size).map(p=>p.kind==="computer"?(Math.random()>.4?"hold":"drop"):null);}
 function dealOpening(previousPot=0,previousChips=null,previousStrikes=null){
  const stack=previousChips||people.map(p=>Number.isFinite(p.chips)?p.chips:Math.max(0,Math.round(Number(startingChips)*100)));
  if(tableSize<2||tableSize>6){setStatus("Choose 2–6 players before dealing.");return;}
  if(!Number.isSafeInteger(anteCents)||anteCents<0||!Number.isSafeInteger(capCents)||capCents<1){setStatus("Set valid ante and pot-cap amounts.");return;}
  const fresh=dealt357(createShuffledDeck(),tableSize);
  const afterAnte=stack.map(v=>v-anteCents);
  const newPot=previousPot+tableSize*anteCents;
  setHands(fresh.hands);setDeck(fresh.deck);setRound(0);
  setChipStacks(afterAnte);setPot(newPot);setStrikes(previousStrikes||{});
  setReveal({});setOutcome(null);setViewer(null);setCounter(null);
  const instant=fresh.hands.flatMap((hand,i)=>instant357(hand)?[i]:[]);
  if(instant.length===1){
   const winner=instant[0];setChipStacks(afterAnte.map((v,i)=>i===winner?v+newPot:v));setPot(0);
   setOutcome({kind:"instant",winner,delta:[],message:people[winner].name+" received 3-5-7 on the opening deal. Instant pot win!"});
   setPhase("resolved");addLog(people[winner].name+" dealt natural 3-5-7 — instant win.");
  }else if(instant.length>1){
   setPhase("review");addLog("Multiple 3-5-7 instant hands — dealer review required.");
  }else{
   setChoices(preparedChoices(tableSize));setPhase("choosing");addLog("Three cards dealt. 3s are wild. Players choose Hold or Fold.");
  }
 }
 function start(){setSession("playing");setLog([]);dealOpening(0,null,{});}
 function choose(c){if(phase!=="choosing"||currentIndex<0||people[currentIndex].kind==="computer")return;setChoices(old=>old.map((v,i)=>i===currentIndex?c:v));setViewer(null);addLog(people[currentIndex].name+" is READY.");}
 function countdown(){if(phase!=="choosing"||!allReady)return;setPhase("countdown");addLog("Dealer started 3, 2, 1 countdown.");}
 function showNextCard(){if(phase!=="revealing"||currentReveal===undefined)return;setReveal(old=>({...old,[currentReveal]:(old[currentReveal]||0)+1}));}
 function settle(){
  if(phase!=="revealing"||revealedCount<totalRevealCards)return;
  const result=resolve357({hands,round,choices,potCents:pot,strikes,anteCents});
  setOutcome(result);setPot(result.nextPot);setStrikes(result.strikes);
  setChipStacks(old=>old.map((v,i)=>v+result.delta[i]));
  setPhase(result.kind==="tie-review"?"review":"resolved");
  addLog(result.message);
 }
 function next(){
  if(phase!=="resolved")return;
  if(round===2||outcome?.kind==="instant"||pot>=capCents){
   setDealer(i=>(i+1)%tableSize);dealOpening(pot,chipStacks,strikes);return;
  }
  const updated=addRoundCards(hands,deck);
  setHands(updated.hands);setDeck(updated.deck);setRound(v=>v+1);setViewer(null);setChoices(preparedChoices(tableSize));setReveal({});setOutcome(null);setPhase("choosing");
  addLog("Two cards added to every hand. Only "+THREE_FIVE_SEVEN[round+1]+"s are wild.");
 }
 const currentPlayer=displayIndex!==null?people[displayIndex]:null;
 const readyCount=choices.filter(c=>c!==null).length;
 const canReveal=phase==="revealing"&&currentReveal!==undefined;
 const gameOver=round===2||outcome?.kind==="instant";
 return <main className="sw-poker-screen"><div className="sw-poker-content">
  <header className="sw-poker-top">
   <button type="button" className="sw-poker-back" onClick={()=>nav(groupId?"/customer/games/new?group="+encodeURIComponent(groupId):"/customer/games")} aria-label="Back to lobby"><ArrowLeft size={21}/></button>
   <div className="sw-poker-symbol" aria-label="SyncWorks">S</div>
   <div className="sw-poker-heading"><strong>SYNCWORKS POKER</strong><small>♧ {lobbyName} · Private table preview</small></div>
   {groupId&&<button type="button" className="sw-poker-icon-btn" aria-label="Share poker room" onClick={shareRoom} disabled={shareBusy}><Share2 size={20}/></button>}
   <span className="sw-poker-capsule">♙ {tableSize}</span>
   <button type="button" className="sw-poker-icon-btn" aria-label="Rules and strategy" onClick={()=>setGuide("rules")}><Info size={20}/></button>
  </header>
  <div className="sw-poker-round"><div className="sw-poker-round-badge"><div>♠ {gameName}</div><span>Round {round+1} · {wild}s Wild</span></div><div className="sw-poker-steps">{THREE_FIVE_SEVEN.map((n,i)=><div key={i} title={"Round "+(i+1)+": "+n+"s wild"} className={"sw-poker-step"+(i===round?" current":"")}>{i+1}</div>)}</div></div>
  {session==="setup"&&<section className="sw-poker-game-choice" aria-label="Choose the poker game"><label htmlFor="sw-poker-game-select">Dealer's game choice</label><select id="sw-poker-game-select" value={selectedGame} onChange={e=>changeGame(e.target.value)}>{TABLE_GAMES.map(g=><option key={g.code} value={g.code}>{g.label}</option>)}</select><p>3-5-7 uses this branded table. Other games open their existing local game screens until the shared table engine is complete.</p></section>}
  {session==="setup"&&<section className="sw-poker-quick-setup" aria-label="Poker table seating">
  <div className="sw-poker-quick-header"><div><strong>YOUR TABLE · {tableSize}/{roomCapacity} PLAYERS</strong><p>Choose players, add a computer, then deal.</p></div><span className="sw-poker-purse">♠ {displayMoney(people.reduce((sum,p)=>sum+(p.chips??roomMinimum??2000),0))} chips</span></div>
  <div className="sw-poker-quick-actions"><button type="button" className="sw-poker-button primary" disabled={tableSize>=roomCapacity} onClick={()=>{setSeatBuyin(String((roomMinimum??2000)/100));setSeatEditor(true);setSeatError("");}}><Users size={16} className="mr-1 inline"/> + Add Player</button><button type="button" className="sw-poker-button" disabled={tableSize>=roomCapacity||people.some(p=>p.kind==="computer")} onClick={addComputerToTable}>🤖 + Computer</button></div>
  <div className="sw-poker-quick-players">{people.map((p,i)=><div className="sw-poker-quick-person" key={p.id}><Photo person={p}/><label className="min-w-0 flex-1 text-xs text-slate-300"><input aria-label={"Player "+(i+1)+" name"} value={p.name} maxLength={24} onChange={e=>updateSeats(old=>old.map((x,j)=>i===j?{...x,name:e.target.value.slice(0,24)}:x))} className="sw-poker-name-input"/><span className="block text-[10px] text-emerald-200">{displayMoney(p.chips??roomMinimum??2000)} · {p.kind==="computer"?"Computer":"Seated"}</span></label>{p.kind!=="host"&&<button type="button" aria-label={"Remove "+p.name} onClick={()=>updateSeats(old=>old.filter((_,j)=>j!==i))} className="sw-poker-remove">×</button>}</div>)}</div>
  <div className="sw-poker-quick-footer"><button type="button" className="sw-poker-button primary" disabled={tableSize<2} onClick={start}>♠ Shuffle & Deal · 3 Cards</button><p>{tableSize<2?"Add at least one more player or a computer to start.":"Ready to deal on this device."}</p></div>
 </section>}
  {status&&<div role="status" className="mb-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-xs text-cyan-100">{status}</div>}
  {roomMinimum!==null&&<div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs"><span>Room minimum: <b>{displayMoney(roomMinimum)}</b> virtual chips</span>{groupId&&<button type="button" onClick={shareRoom} disabled={shareBusy} className="rounded-lg border border-cyan-300/30 px-3 py-2 font-black text-cyan-100"><Share2 size={14} className="mr-1 inline"/> Share {roomId?"room":"club invite"}</button>}</div>}
  <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-100">Local interactive game preview. Ready, countdown, cards and payouts are on this device only; they are <b>not synchronized across phones</b>. All chips are virtual.</div>
 {seatEditor&&session==="setup"&&<div className="sw-poker-modal-cover" role="presentation" onClick={()=>setSeatEditor(false)}><form className="sw-poker-modal" role="dialog" aria-modal="true" aria-label="Add poker player" onClick={e=>e.stopPropagation()} onSubmit={addGuestToTable}><div className="flex items-center justify-between"><h2 className="text-xl font-black">Add a player</h2><button type="button" className="sw-poker-button" onClick={()=>setSeatEditor(false)}>✕</button></div><p className="mt-2 text-xs text-slate-400">Local guest seat; no separate phone connection yet.</p><label className="mt-4 block text-xs text-slate-300">Display name<input autoFocus required maxLength={24} value={seatName} onChange={e=>setSeatName(e.target.value)} placeholder="e.g. Zack" className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white"/></label><label className="mt-3 block text-xs text-slate-300">Virtual buy-in ($) · minimum {displayMoney(roomMinimum??0)}<input required type="number" min={(roomMinimum??0)/100} max="10000" step="0.01" value={seatBuyin} onChange={e=>setSeatBuyin(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white"/></label>{seatError&&<p role="alert" className="mt-3 text-xs text-rose-300">{seatError}</p>}<button type="submit" className="sw-poker-button primary mt-4 w-full">Seat Player</button></form></div>}
  <div className="sw-poker-table-space">
   <div className="sw-poker-felt">
    <div className="sw-poker-felt-brand"><i>S</i>SYNCWORKS<br/>POKER</div>
    <div className="sw-poker-pot"><div className="sw-poker-chip-stack"><span className="sw-poker-chip dark"/><span className="sw-poker-chip blue"/><span className="sw-poker-chip red"/></div><div className="sw-poker-pot-amount">Pot: {displayMoney(pot)}</div><div className="sw-poker-pot-small">Ante: {displayMoney(anteCents)} · Cap: {displayMoney(capCents)}</div></div>
    {counter!==null&&<div aria-live="assertive" className="sw-poker-decision-shadow">{counter}</div>}
    {Array.from({length:session==="setup"?roomCapacity:tableSize},(_,i)=>{const p=people[i];return <div key={p?.id||"open-"+i} className={"sw-poker-seat s"+i+(p?"":" sw-poker-seat-empty")} aria-label={p?p.name+" "+(choices[i]!==null?"Ready":"Waiting"):"Open poker seat"}>
      {p?<Photo person={p}/>:<button type="button" aria-label={"Add player to seat "+(i+1)} disabled={session!=="setup"} className="sw-poker-empty-seat" onClick={()=>{setSeatBuyin(String((roomMinimum??2000)/100));setSeatEditor(true);}}>+</button>}
      <div className="sw-poker-seat-nameplate"><strong>{p?.name||"Open Seat"}</strong><small>{p?"◉ "+displayMoney(chipStacks[i]??p.chips??2000):"Tap to join"}</small></div>
      {session==="playing"&&p&&<span className={"sw-poker-status"+(choices[i]!==null&&phase!=="setup"?" ready":"")}>{phase==="choosing"||phase==="countdown"?(choices[i]===null?"◷ Waiting":"✓ Ready"):phase==="revealing"||phase==="resolved"?(choices[i]==="hold"?"Held":choices[i]==="drop"?"Folded":"Waiting"):"At table"}</span>}
      {p&&dealer===i&&<span className="sw-poker-dealer">D</span>}
    </div>;})}
   </div>
  </div>
  {session!=="setup"&&<>
   {phase==="choosing"&&<div className="sw-poker-pov">
    <p className="sw-poker-pov-label">{allReady?"Everyone is ready — dealer may start countdown":currentPlayer?.name+" is choosing privately · "+readyCount+"/"+tableSize+" ready"}</p>
    <div className="sw-poker-facecards">{viewCards?viewCards.map((c,i)=><Card key={i} card={c} wild={c.rank===wild}/>):(hands[displayIndex??0]||[]).map((c,i)=><Card key={i} card={c} hidden/>)}</div>
    {currentPlayer&&<button type="button" className="sw-poker-button mt-2" onClick={()=>setViewer(v=>v===displayIndex?null:displayIndex)}>{viewer===displayIndex?<><EyeOff size={14} className="mr-1 inline"/> Hide my hand</>:<><Eye size={14} className="mr-1 inline"/> View {currentPlayer.name}'s hand</>}</button>}
    {currentPlayer?<div className="sw-poker-controls"><button type="button" onClick={()=>choose("drop")} className="sw-poker-control">FOLD</button><button type="button" onClick={()=>choose("hold")} className="sw-poker-control hold">HOLD</button></div>:<button type="button" disabled={!allReady} onClick={countdown} className="sw-poker-button gold mt-3 w-full max-w-lg">All {tableSize} Ready · Dealer start 3, 2, 1</button>}
    {currentPlayer&&<p className="mt-2 text-[11px] text-slate-400">Pass the device after each choice. Other players see only Ready/Waiting until reveal.</p>}
   </div>}
   {phase==="countdown"&&<div className="sw-poker-pov rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4"><strong>Everyone is READY</strong><p className="mt-1 text-xs text-cyan-200">Synchronized-style countdown demonstration on this device.</p></div>}
   {phase==="revealing"&&<section className="sw-poker-pov sw-poker-panel"><h3><Eye size={17}/> Showdown · left of dealer first</h3><p>Only players who held are eligible. Tap each player's cards to reveal them one at a time. Folded hands remain hidden.</p>
    {revealOrder.length===0?<p className="mt-3 font-bold text-amber-200">All players folded — no hands to show.</p>:<div className="mt-3 space-y-3">{revealOrder.map(i=><div key={i} className="rounded-xl border border-cyan-400/20 bg-black/15 p-3"><div className="mb-2 flex justify-between text-xs"><strong>{people[i].name}</strong><span className="text-emerald-300">{reveal[i]===hands[i].length?rate357(hands[i],round).name:(reveal[i]||0)+"/"+hands[i].length+" revealed"}</span></div><div className="sw-poker-facecards">{hands[i].map((c,j)=><Card key={j} card={c} wild={c.rank===wild} hidden={j>=(reveal[i]||0)}/>)}</div></div>)}</div>}
    {canReveal?<button type="button" className="sw-poker-button primary mt-3 w-full" onClick={showNextCard}>Flip next card · {people[currentReveal].name}</button>:<button type="button" className="sw-poker-button gold mt-3 w-full" onClick={settle}>Compare hands · settle virtual pot</button>}
   </section>}
   {phase==="review"&&<section className="sw-poker-panel mx-auto max-w-xl"><h3>Dealer review required</h3><p>{outcome?.message||"More than one player was dealt 3-5-7. No automatic payout has been made."}</p><button type="button" onClick={()=>{setSession("setup");setPhase("setup");}} className="sw-poker-button mt-3">Restart demo</button></section>}
   {phase==="resolved"&&<section className="sw-poker-panel mx-auto max-w-xl"><h3>🏆 Round {round+1} result</h3><p className="text-sm font-bold text-emerald-200">{outcome?.winner!==null&&outcome?.winner!==undefined?people[outcome.winner].name+" wins the drag":"Pot carries forward"}</p><p>{outcome?.message}</p><p className="mt-2">Next pot: {displayMoney(pot)}. Current stage: {wild}s wild.</p>{pot>=capCents&&<p className="mt-2 text-amber-200">Pot cap reached. Review settlement before beginning another hand.</p>}
    <button type="button" disabled={pot>=capCents} onClick={next} className="sw-poker-button primary mt-3 w-full">{gameOver?"New hand · rotate dealer":"Deal 2 more · "+THREE_FIVE_SEVEN[round+1]+"s wild"} <ChevronRight size={16} className="inline"/></button>
    {pot>=capCents&&<button type="button" onClick={()=>{setPhase("setup");setSession("setup");}} className="sw-poker-button mt-2">End table preview</button>}
   </section>}
  </>}
  <div className="sw-poker-panel-grid">
   <section className="sw-poker-panel"><h3><Users size={17}/> Table Status <span className="ml-auto text-xs text-slate-400">{tableSize} Players</span></h3><div className="grid grid-cols-2 gap-2">{people.map((p,i)=><div key={p.id} className="flex items-center justify-between gap-1 border-b border-white/10 py-1 text-[11px]"><span className="truncate">{p.name}</span><span className={choices[i]!==null?"text-emerald-300":"text-slate-400"}>{session!=="playing"?"Seated":phase==="choosing"||phase==="countdown"?(choices[i]!==null?"✓ Ready":"◷ Waiting"):choices[i]==="hold"?"HOLD":choices[i]==="drop"?"FOLD":"—"}</span></div>)}</div><button type="button" className="sw-poker-button mt-3 w-full" onClick={()=>setGuide("strategy")}><Lightbulb size={15} className="mr-2 inline"/> Beginner tip</button></section>
   <section className="sw-poker-panel"><h3><Eye size={17}/> Card Reveals</h3><p>When the countdown ends, only holding players reveal. Cards appear progressively in order, beginning to the dealer's left.</p><div className="mt-2 flex flex-wrap gap-2">{(phase==="revealing"?revealOrder:held).map(i=><span key={i} className="rounded-lg border border-cyan-400/25 px-2 py-1 text-[10px] text-cyan-200">{people[i].name}</span>)}{!held.length&&<span className="text-xs text-slate-500">No holders yet</span>}</div></section>
   <section className="sw-poker-panel"><h3><WalletCards size={17}/> Game Log</h3><div className="sw-poker-log">{log.length?log.map(item=><div key={item.id}><span className="mr-2 text-emerald-400">●</span>{item.message} <span className="float-right text-slate-500">{item.time}</span></div>):<p>Waiting for a new hand.</p>}</div></section>
   <section className="sw-poker-panel"><div className="mb-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setGuide("rules")} className="sw-poker-button"><BookOpen size={14} className="mr-1 inline"/> Rules</button><button type="button" onClick={()=>setGuide("strategy")} className="sw-poker-button"><Target size={14} className="mr-1 inline"/> Strategy</button></div><h3>3-5-7 DROP · Quick Guide</h3><p>Three stages: 3s, then 5s, then 7s wild. Keep the same hand and add two cards each stage. Choose Hold or Fold; losing holders match the previous pot.</p></section>
  </div>
 </div>
 {guide&&<div className="sw-poker-modal-cover" role="presentation" onClick={()=>setGuide(null)}><div className="sw-poker-modal" role="dialog" aria-modal="true" aria-label={guide==="rules"?"Game rules":"Beginner strategy"} onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-black">{guide==="rules"?"3-5-7 Rules":"Beginner Strategy"}</h2><button type="button" onClick={()=>setGuide(null)} className="sw-poker-button" aria-label="Close guide">✕</button></div><div className="mt-4 space-y-3 text-sm leading-6 text-slate-200">{helperContent(guide,round)}</div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setGuide("rules")} className="sw-poker-button">Rules</button><button type="button" onClick={()=>setGuide("strategy")} className="sw-poker-button">Strategy</button></div></div></div>}
 </main>;
}

import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,BookOpen,Check,ChevronRight,Eye,EyeOff,Info,Lightbulb,RotateCcw,Shield,Spade,Target,Users,WalletCards} from "lucide-react";
import {getCardRoom} from "../api/cardRooms";
import {addRoundCards,cardRank,createShuffledDeck,dealt357,displayMoney,instant357,rate357,resolve357,THREE_FIVE_SEVEN} from "../games/drop357Table.mjs";
import "./CustomerPokerTable.css";

const DEFAULT_PLAYERS=[{id:"local-you",name:"You",kind:"local"},{id:"local-zack",name:"Zack",kind:"guest"},{id:"local-russ",name:"Russ",kind:"guest"}];
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
  if(roomId){getCardRoom(roomId).then(r=>{if(!mounted)return;setLobbyName(r.name||"Poker Table");if(Array.isArray(r.seats)&&r.seats.length>=2){setPeople(r.seats.map(getPlayer));setStartingChips(String((r.virtual_buy_in_cents||2000)/100));const idx=r.seats.findIndex(s=>s.position===r.dealer_position);if(idx>=0)setDealer(idx);setRemoteNotice(true);}}).catch(()=>{if(mounted)setStatus("Shared lobby unavailable; use the local preview with sample seats.");});}
  else if(groupId){const r=readLocalRoom(groupId);if(r?.seats?.length>=2){setLobbyName(r.name||"Poker Table");setPeople(r.seats.map(getPlayer));setStartingChips(String((r.buyInCents||2000)/100));setRemoteNotice(false);}}
  return()=>{mounted=false;};
 },[groupId,roomId]);
 useEffect(()=>{if(phase!=="countdown")return;setCounter(3);const started=Date.now();const timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);const remaining=3-elapsed;if(remaining<=0){clearInterval(timer);setCounter(null);setPhase("revealing");setViewer(null);addLog("Dealer countdown finished — held hands may be revealed.");}else setCounter(remaining);},120);return()=>clearInterval(timer);},[phase]);
 function preparedChoices(size){return people.slice(0,size).map(p=>p.kind==="computer"?(Math.random()>.4?"hold":"drop"):null);}
 function dealOpening(previousPot=0,previousChips=null,previousStrikes=null){
  const stack=previousChips||people.map(p=>p.chips||Math.max(0,Math.round(Number(startingChips)*100)));
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
   <button type="button" className="sw-poker-back" onClick={()=>nav(groupId?"/customer/games/clubs/room-preview?group="+encodeURIComponent(groupId):"/customer/games")} aria-label="Back to lobby"><ArrowLeft size={21}/></button>
   <div className="sw-poker-symbol" aria-label="SyncWorks">S</div>
   <div className="sw-poker-heading"><strong>SYNCWORKS POKER</strong><small>♧ {lobbyName} · Private table preview</small></div>
   <span className="sw-poker-capsule">♙ {tableSize}</span>
   <button type="button" className="sw-poker-icon-btn" aria-label="Rules and strategy" onClick={()=>setGuide("rules")}><Info size={20}/></button>
  </header>
  <div className="sw-poker-round"><div className="sw-poker-round-badge"><div>♠ {gameName}</div><span>Round {round+1} · {wild}s Wild</span></div><div className="sw-poker-steps">{THREE_FIVE_SEVEN.map((n,i)=><div key={i} title={"Round "+(i+1)+": "+n+"s wild"} className={"sw-poker-step"+(i===round?" current":"")}>{i+1}</div>)}</div></div>
  <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-100">Local interactive game preview. Ready, countdown, cards and payouts are on this device only; they are <b>not synchronized across phones</b>. All chips are virtual.</div>
  <div className="sw-poker-table-space">
   <div className="sw-poker-felt">
    <div className="sw-poker-felt-brand"><i>S</i>SYNCWORKS<br/>POKER</div>
    <div className="sw-poker-pot"><div className="sw-poker-chip-stack"><span className="sw-poker-chip dark"/><span className="sw-poker-chip blue"/><span className="sw-poker-chip red"/></div><div className="sw-poker-pot-amount">Pot: {displayMoney(pot)}</div><div className="sw-poker-pot-small">Ante: {displayMoney(anteCents)} · Cap: {displayMoney(capCents)}</div></div>
    {counter!==null&&<div aria-live="assertive" className="sw-poker-decision-shadow">{counter}</div>}
    {people.map((p,i)=><div key={p.id} className={"sw-poker-seat s"+i} aria-label={p.name+" "+(choices[i]!==null?"Ready":"Waiting")}>
      <Photo person={p}/>
      <div className="sw-poker-seat-nameplate"><strong>{p.name}</strong><small>◉ {displayMoney(chipStacks[i]??p.chips??2000)}</small></div>
      {session==="playing"&&<span className={"sw-poker-status"+(choices[i]!==null&&phase!=="setup"?" ready":"")}>{phase==="choosing"||phase==="countdown"?(choices[i]===null?"◷ Waiting":"✓ Ready"):phase==="revealing"||phase==="resolved"?(choices[i]==="hold"?"Held":choices[i]==="drop"?"Folded":"Waiting"):"At table"}</span>}
      {dealer===i&&<span className="sw-poker-dealer">D</span>}
    </div>)}
   </div>
  </div>
  {session==="setup"?<section className="sw-poker-panel mx-auto max-w-xl">
   <h3><Users size={18}/> Start 3-5-7 Table Preview</h3>
   <p>This preview deals one shuffled 52-card deck to 2–6 seats. Everyone plays on this device, passing it for private decisions. The dealer starts the countdown when all are ready.</p>
   <div className="mt-3 space-y-2">{people.map((p,i)=><div key={p.id} className="flex items-center gap-2"><Photo person={p}/><input className="min-w-0 flex-1 rounded-lg border border-white/20 bg-slate-950 p-2 text-sm text-white" value={p.name} aria-label={"Player "+(i+1)+" display name"} onChange={e=>setPeople(old=>old.map((item,j)=>j===i?{...item,name:e.target.value.slice(0,24)}:item))}/>{people.length>2&&<button type="button" onClick={()=>setPeople(old=>old.filter((_,j)=>j!==i))} className="sw-poker-button">×</button>}</div>)}</div>
   <div className="mt-3 flex gap-2"><button type="button" className="sw-poker-button" disabled={people.length>=6} onClick={()=>setPeople(old=>[...old,{id:uid(),name:"Player "+(old.length+1),kind:"guest",chips:2000}])}>+ Seat</button><button type="button" className="sw-poker-button" disabled={people.length>=6||people.some(p=>p.kind==="computer")} onClick={()=>setPeople(old=>[...old,{id:uid(),name:"Computer",kind:"computer",chips:2000}])}>+ Computer</button></div>
   <div className="mt-3 grid grid-cols-3 gap-2">{[["Buy-in",startingChips,setStartingChips],["Ante",ante,setAnte],["Pot cap",maxPot,setMaxPot]].map(([title,value,setValue])=><label key={title} className="text-xs text-slate-300">{title} ($)<input type="number" min="0" step="0.25" value={value} onChange={e=>setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-white"/></label>)}</div>
   <button type="button" onClick={start} className="sw-poker-button primary mt-4 w-full">Shuffle & deal 3 cards</button>
  </section>:<>
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

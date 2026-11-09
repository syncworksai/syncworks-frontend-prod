import React,{useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Eye,EyeOff,Info,RotateCcw,ChevronRight} from "lucide-react";
import {createShuffledDeck,displayMoney} from "../games/drop357Table.mjs";
import {evaluateBozoHand,resolveBozoRound} from "../games/bozoRules.mjs";
import {capGutsResult,limitAnte,rebuyChips,centsFromDollars,pickPracticeBotChoice} from "../games/pokerPracticeSession.mjs";
import {readCardNight,saveCardNight} from "../games/cardNightTransfer.mjs";
import {getCardRoom} from "../api/cardRooms";
import "./CustomerPokerTable.css";

const GAMES={fyb:{title:"FYB",tag:"Kings trump · Aces low"},442:{title:"4/4/Deuce",tag:"2s wild · 4s need a 2"},bozo:{title:"Bozo · The Clown",tag:"Beat the ghost hand"}, "queen-follower":{title:"Queen & the Follower",tag:"Dynamic stud wilds"}};
const SYMBOL={11:"J",12:"Q",13:"K",14:"A"};
const label=c=>!c?"":(SYMBOL[c.rank]||c.rank)+c.suit;
function PokerCard({c,hidden=false,wild=false}){if(!c)return <span className="sw-poker-card back">♠</span>;return <div className={"sw-poker-card"+(hidden?" back":["♥","♦"].includes(c.suit)?" red":"")}><strong>{hidden?"S":label(c)}</strong><b>{hidden?"♠":c.suit}</b>{wild&&!hidden&&<small>WILD</small>}</div>}
function localDeal(game,count,size=5){
 const deck=createShuffledDeck();if(game==="fyb"){const cards=deck.map(c=>({...c,rank:c.rank===14?1:c.rank}));return {hands:Array.from({length:count},(_,i)=>[cards[i]]),deck:cards.slice(count),clown:[]};}
 const hands=Array.from({length:count},(_,i)=>deck.slice(i*size,(i+1)*size));
 return {hands,deck:deck.slice((count+1)*size),clown:game==="bozo"?deck.slice(count*size,(count+1)*size):[]};
}
function score442(cards){const deuce=cards.some(c=>c.rank===2);const mapped=cards.map(c=>deuce&&c.rank===4?{...c,rank:2}:c);return evaluateBozoHand(mapped,2)}
const cents=x=>Math.round(Number(x)*100);
export default function CustomerPokerVariantTable({variant:providedVariant}){
 const [query]=useSearchParams(),nav=useNavigate();
 const variant=providedVariant||query.get("game")||"fyb";
 const game=GAMES[variant]||GAMES.fyb;
 const groupId=query.get("group")||"",roomId=query.get("room")||"";
 const [players,setPlayers]=useState([]),[stacks,setStacks]=useState([]),[dealer,setDealer]=useState(0),[pot,setPot]=useState(0),[gameNumber,setGameNumber]=useState(1);
 const [ante,setAnte]=useState(query.get("ante")||"0.25"),[cap,setCap]=useState("50"),[step,setStep]=useState("loading");
 const [hands,setHands]=useState([]),[clown,setClown]=useState([]),[deck,setDeck]=useState([]),[decisions,setDecisions]=useState([]),[viewer,setViewer]=useState(null),[outcome,setOutcome]=useState(null),[log,setLog]=useState([]);
 const [drawer,setDrawer]=useState(false),[tab,setTab]=useState("hands"),[rebuy,setRebuy]=useState(false),[rebuySeat,setRebuySeat]=useState(0),[rebuyAmount,setRebuyAmount]=useState("20"),[status,setStatus]=useState("");
 const [fybTurn,setFybTurn]=useState(0),[followers,setFollowers]=useState([]),[pendingFollower,setPendingFollower]=useState(false),[street,setStreet]=useState(0);
 const [dealerPick,setDealerPick]=useState(false),[fybLosses,setFybLosses]=useState([]);
 const maxCents=variant==="fyb"?1000000:cents(cap),anteCents=cents(ante),index=players.length;
 const currentIndex=useMemo(()=>decisions.findIndex(v=>v===null),[decisions]);
 const order=useMemo(()=>players.map((_,i)=>(dealer+1+i)%players.length),[dealer,players]);
 const activeIndex=variant==="fyb"?order[fybTurn]:(currentIndex<0?-1:currentIndex);
 const currentPlayer=players[activeIndex];
 const activeCards=viewer===activeIndex?hands[activeIndex]:null;
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
  const next=(dealer+1)%players.length;store(stacks,pot,next,gameNumber+1);nav(nextGameUrl);
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
  if(!Number.isInteger(maxCents)||maxCents<=0||!Number.isInteger(anteCents)||anteCents<0){setStatus("Choose valid ante and pot amounts.");return;}
  if(variant!=="fyb"&&!takeAnte())return;
  const draft=localDeal(variant,players.length);
  setHands(draft.hands);setDeck(draft.deck);setClown(draft.clown);
  setViewer(null);setOutcome(null);setFybTurn(0);setFollowers([]);setPendingFollower(false);setStreet(0);
  setDecisions(players.map(p=>p.kind==="computer"?(Math.random()<0.38?"hold":"fold"):null));
  if(variant==="fyb")setStep("fyb");
  else if(variant==="queen-follower"){setHands(players.map(()=>[]));setDeck(createShuffledDeck());setStep("stud");}
  else setStep("deciding");
  record("Cards dealt for "+game.title+". Virtual chips only.");
 }
 // FYB is pass/keep with a King blocking an incoming swap. Dealer may draw off the deck.
 function fybAction(pass){
  if(step!=="fyb"||fybTurn>=players.length)return;
  const actor=order[fybTurn];const next=order[fybTurn+1];
  const updated=hands.map(h=>h.slice()),d=deck.slice();
  if(pass&&next===undefined){updated[actor]=[d.shift()||updated[actor][0]];record(players[actor].name+" draws from the deck.");}
  else if(pass&&updated[next]?.[0]?.rank!==13){const old=updated[actor][0];updated[actor]=[updated[next][0]];updated[next]=[old];record(players[actor].name+" swaps with "+players[next].name);}
  else record(players[actor].name+(pass?" meets a King: swap blocked.":" keeps their card."));
  setHands(updated);setDeck(d);setViewer(null);
  if(fybTurn===players.length-1){
   const lowest=Math.min(...updated.map(h=>h[0].rank));
   const losers=updated.map((h,i)=>h[0].rank===lowest?i:-1).filter(i=>i>=0);
   const loss=anteCents;
   const updatedLosses=players.map((p,i)=>(fybLosses[i]||0)+(losers.includes(i)?1:0));
   setFybLosses(updatedLosses);
   const finished=updatedLosses.some(n=>n>=3);
   const newStacks=stacks.map((v,i)=>v-(losers.includes(i)?loss:0));
   const newPot=pot+loss*losers.length;setStacks(newStacks);setPot(newPot);
   setOutcome({message:losers.map(i=>players[i].name).join(", ")+" had the lowest card ("+lowest+") and each pays "+displayMoney(loss)+(finished?". Three lost chips: FYB is complete, pass the dealer.":""),losers,gameFinished:finished});
   setStep("result");record("FYB hand complete. No showdown winner: lowest card(s) pay into the virtual purse.");
  }else setFybTurn(v=>v+1);
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
  if(!entered.length){setOutcome({message:"All players folded. Pot carries forward."});setDecisions(next);setStep("result");return;}
  if(variant==="442"){
   // 442 conditional wild evaluation: 4s become wild only when a deuce is held.
   const ranked=entered.map(i=>({i,score:score442(hands[i]).score}));
   const best=Math.max(...ranked.map(x=>x.score)),winners=ranked.filter(x=>x.score===best);
   if(winners.length!==1){setOutcome({message:"Tie: dealer must review before chips move."});setStep("result");return;}
   if(entered.length===1){setOutcome({message:"Lone player holds. This 442 house rule awards the pot to the lone holder.",winner:winners[0].i});}
   return settleGutsPay(winners[0].i,entered,next,amount);
  }
  const wild=clown[0]?.rank;
  const score=resolveBozoRound({choices:next.map(v=>v==="hold"?"hold":"drop"),hands,clown,wildRank:wild,potCents:amount});
  if(score.kind==="player-win")return settleGutsPay(score.winner,entered,next,amount);
  if(score.kind==="clown-win"){
   const each=Math.min(amount,Math.floor((maxCents-pot)/entered.length));
   const paid=stacks.map((v,i)=>v-(entered.includes(i)?each:0));
   setStacks(paid);setPot(pot+each*entered.length);
   setOutcome({message:"The Clown wins! Each holding player matches "+displayMoney(each)+". The ghost never contributes chips."});
  }else setOutcome({message:score.message});
  setDecisions(next);setStep("result");
 }
 function settleGutsPay(winner,entered,next,amount){
  const losers=entered.filter(i=>i!==winner);
  const match=losers.length?Math.min(amount,Math.floor(maxCents/losers.length)):0;
  const nextStacks=stacks.map((v,i)=>v+(i===winner?amount:losers.includes(i)?-match:0));
  const newPot=match*losers.length;setStacks(nextStacks);setPot(newPot);
  setOutcome({winner,amount,match,losers,message:players[winner].name+" drags "+displayMoney(amount)+". "+losers.length+" losing holder(s) replenish "+displayMoney(match)+" each."});
  setDecisions(next);setStep("result");
 }
 function chooseHold(choice){
  if(step!=="deciding"||activeIndex<0)return;
  const next=decisions.map((v,i)=>i===activeIndex?choice:v);setDecisions(next);setViewer(null);
  if(next.every(Boolean))settleGuts(next);
 }
 function addRebuy(){
  const n=centsFromDollars(rebuyAmount);if(n==null||n<=0){setStatus("Enter a valid rebuy.");return;}
  setStacks(v=>rebuyChips(v,Number(rebuySeat),n));setRebuy(false);record(players[rebuySeat].name+" rebought "+displayMoney(n)+".");
 }
 useEffect(()=>{if(step!=="fyb"||!currentPlayer||currentPlayer.kind!=="computer")return;
  const timer=setTimeout(()=>fybAction(Math.random()<0.45),700);return()=>clearTimeout(timer);
 },[step,fybTurn,hands,players]);
 const reviewable=step==="result"||step==="stud-result";
 const centered=step==="deciding"&&activeIndex>=0?"Your turn: "+currentPlayer?.name:step==="fyb"&&activeIndex>=0?currentPlayer?.name+"'s turn":step==="stud"?"Stud street "+(street+1):reviewable?"Hand finished":game.tag;
 return <main className="sw-poker-screen"><div className="sw-poker-content">
  <header className="sw-poker-top"><button type="button" className="sw-poker-back" onClick={()=>nav(nextGameUrl)}><ArrowLeft size={20}/></button><div className="sw-poker-symbol">S</div><div className="sw-poker-heading"><strong>SYNCWORKS POKER</strong><small>♠ Card Night · {game.title}</small></div><button type="button" className="sw-poker-icon-btn" onClick={()=>{setTab("rules");setDrawer(true)}} aria-label="Game information"><Info size={20}/></button></header>
  <div className="sw-poker-round"><div className="sw-poker-round-badge"><div>♠ {game.title}</div><span>{game.tag}</span></div><span className="sw-poker-capsule">♙ {players.length}</span></div>
  <div className="sw-poker-session-status"><span>♣ Card Night · Game {gameNumber}</span><span>Dealer: {players[dealer]?.name||"Waiting"} · Hard cap {displayMoney(maxCents)}</span></div>
  {status&&<div role="status" className="sw-poker-practice-note">{status}</div>}
  {step==="ready"&&<section className="sw-poker-game-choice"><strong>Ready for {game.title}</strong><p>Same SyncWorks table and seats. Play stays on this device; your virtual chip balances carry between games in this practice session.</p><div className="flex gap-2"><label className="flex-1">{variant==="fyb"?"Chip denomination ($)":"Ante ($)"}<input type="number" step="0.01" min="0.01" value={ante} onChange={e=>setAnte(e.target.value)} className="w-full rounded-lg bg-slate-950 p-3"/></label>{variant!=="fyb"&&<label className="flex-1">Max pot ($)<input type="number" min="1" value={cap} step="0.01" onChange={e=>setCap(e.target.value)} className="w-full rounded-lg bg-slate-950 p-3"/></label>}</div><button className="sw-poker-button primary mt-3 w-full" onClick={deal}>♠ Shuffle & Deal {game.title}</button></section>}
  <div className="sw-poker-table-space"><div className="sw-poker-felt"><div className="sw-poker-felt-brand"><i>S</i>SYNCWORKS<br/>POKER</div><div className="sw-poker-pot"><div className="sw-poker-chip-stack"><span className="sw-poker-chip dark"/><span className="sw-poker-chip blue"/><span className="sw-poker-chip red"/></div><div className="sw-poker-pot-amount">Pot: {displayMoney(pot)}</div><div className="sw-poker-pot-small">{game.title} · {variant==="fyb"?"3-chip limit per player":"Max "+displayMoney(maxCents)}</div></div>
  {players.map((p,i)=><div className={"sw-poker-seat s"+i} key={p.id}><div className="sw-poker-seat-avatar">{p.kind==="computer"?"🤖":p.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div className="sw-poker-seat-nameplate"><strong>{p.name}</strong><small>◉ {displayMoney(stacks[i]??p.chips)}</small></div>{i===dealer&&<span className="sw-poker-dealer">D</span>}{step==="deciding"&&<span className="sw-poker-status">{decisions[i]?"✓ Ready":"Waiting"}</span>}</div>)}
  </div></div>
  {step!=="ready"&&<section className="sw-poker-panel sw-poker-compact-result"><h3>{centered}</h3>
   {step==="stud"&&<p>Queens are always wild; face-up followers: {followers.length?followers.join(", "):"none"}. {pendingFollower?"Follower trigger pending.":""}</p>}
   {step==="deciding"||step==="fyb"?<div className="sw-poker-facecards">{activeCards?activeCards.map((c,i)=><PokerCard key={i} c={c} wild={variant==="442"&&(c.rank===2||c.rank===4&&activeCards.some(x=>x.rank===2))||variant==="bozo"&&c.rank===clown[0]?.rank}/>):(hands[activeIndex]||[]).map((c,i)=><PokerCard key={i} c={c} hidden/>)}</div>:null}
   {variant==="bozo"&&clown.length>0&&<p>🤡 Clown's exposed wild card: {label(clown[0])}. Its other cards stay concealed until resolution.</p>}
   {step==="result"&&<><div className="sw-poker-winner-banner">🏆 {outcome?.message}</div><button className="sw-poker-button mt-2" onClick={()=>{setTab("hands");setDrawer(true)}}><Eye size={14} className="inline"/> Review cards</button></>}
   {step==="stud-result"&&<><p>All seven cards dealt. The next step is validated betting and natural-versus-wild showdown; this is a guided dealing demonstration, not an automatic pot award.</p><button className="sw-poker-button mt-2" onClick={()=>{setTab("hands");setDrawer(true)}}>Review stud cards</button></>}
  </section>}
 </div>
 {step!=="loading"&&<nav className="sw-poker-sticky-actions"><div className="sw-poker-action-top"><strong>♠ {centered}</strong><span>{displayMoney(pot)} {variant==="fyb"?"· No cap":"/ "+displayMoney(maxCents)}</span></div><div className="sw-poker-action-buttons">
 {step==="ready"&&<button className="sw-poker-action hold grow" onClick={deal}>Deal cards</button>}
 {step==="deciding"&&currentPlayer&&<><button className="sw-poker-action hide" onClick={()=>setViewer(v=>v===activeIndex?null:activeIndex)}>{viewer===activeIndex?<EyeOff size={15}/>:<Eye size={15}/>} {viewer===activeIndex?"Hide":"Show"}</button><button className="sw-poker-action fold" onClick={()=>chooseHold("fold")}>Fold</button><button className="sw-poker-action hold" onClick={()=>chooseHold("hold")}>Hold</button></>}
 {step==="fyb"&&currentPlayer&&<><button className="sw-poker-action hide" onClick={()=>setViewer(v=>v===activeIndex?null:activeIndex)}>Show / Hide</button><button className="sw-poker-action fold" onClick={()=>fybAction(true)}>Pass</button><button className="sw-poker-action hold" onClick={()=>fybAction(false)}>Keep</button></>}
 {step==="stud"&&<button className="sw-poker-action hold grow" onClick={dealStudStreet}>Deal next stud card · {street+1}/7</button>}
 {(step==="result"||step==="stud-result")&&<><button className="sw-poker-action hold grow" onClick={()=>{if(outcome?.gameFinished||pot===0){quitToDealer();return;}setStep("ready");setOutcome(null);}}> {outcome?.gameFinished||pot===0?"Pass Dealer · Next Game":"Next hand"} <ChevronRight size={17}/></button><button className="sw-poker-action hide" onClick={quitToDealer}>Choose Game</button></>}
 <button className="sw-poker-action info" onClick={()=>{setTab("rules");setDrawer(true)}}><Info size={18}/><span>Info</span></button></div></nav>}
 {drawer&&<div className="sw-poker-drawer-backdrop" onClick={()=>setDrawer(false)}><section className="sw-poker-drawer" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="sw-poker-drawer-grip"/><div className="sw-poker-drawer-heading"><strong>♠ {game.title} · Table Details</strong><button className="sw-poker-drawer-close" onClick={()=>setDrawer(false)}>✕</button></div><div className="sw-poker-drawer-tabs">{["hands","rules","log","settings"].map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="sw-poker-drawer-body">
 {tab==="hands"&&<>{!reviewable?<p>Opponents' private cards are not revealed before a completed hand. You can view only your active hand.</p>:players.map((p,i)=><section className="sw-poker-drawer-hands" key={p.id}><strong>{p.name}</strong><div className="sw-poker-facecards">{hands[i]?.map((c,j)=><PokerCard c={c} key={j}/>)}</div></section>)}{variant==="bozo"&&reviewable&&<section><h3>Clown</h3><div className="sw-poker-facecards">{clown.map((c,i)=><PokerCard key={i} c={c}/>)}</div></section>}</>}
 {tab==="rules"&&<><h3>{game.title}</h3><p>{variant==="fyb"?"Aces low, Kings highest. Pass your one card left, or keep it. A King blocks the swap; dealer may draw. Every player tied for lowest loses one chip.":variant==="442"?"All 2s are wild. 4s are wild only in hands containing a deuce. Hold/Fold; highest five-card hand drags pot, other holders replace it subject to cap.":variant==="bozo"?"The Clown is a ghost hand with one upcard that sets the wild rank. A holder must beat the Clown and all other holders. Losers replenish the pot.": "Queens are always wild. A face-up Queen makes the next face-up follower rank wild for everyone. The stud betting engine is still under construction."}</p></>}
 {tab==="log"&&<><h3>Balances</h3>{players.map((p,i)=><p key={p.id}>{p.name} — {displayMoney(stacks[i]??0)}</p>)}<h3>Hand log</h3>{log.map(e=><p key={e.id}>{e.message}</p>)}</>}
 {tab==="settings"&&<><h3>Rebuy virtual chips</h3><select value={rebuySeat} onChange={e=>setRebuySeat(Number(e.target.value))}>{players.map((p,i)=><option key={p.id} value={i}>{p.name}</option>)}</select><input type="number" min="0.01" step="0.01" value={rebuyAmount} onChange={e=>setRebuyAmount(e.target.value)}/><button className="sw-poker-button" onClick={addRebuy}>Rebuy</button><button className="sw-poker-button mt-3" onClick={quitToDealer}>Return to dealer game choice</button></>}
 </div></section></div>}
 {rebuy&&<div className="sw-poker-modal-cover"><section className="sw-poker-modal"><h2>Rebuy virtual chips</h2><p>A human player needs more chips before dealing.</p><select value={rebuySeat} onChange={e=>setRebuySeat(Number(e.target.value))}>{players.map((p,i)=><option key={p.id} value={i}>{p.name}</option>)}</select><input type="number" value={rebuyAmount} onChange={e=>setRebuyAmount(e.target.value)}/><button className="sw-poker-button primary" onClick={addRebuy}>Confirm rebuy</button><button className="sw-poker-button" onClick={()=>setRebuy(false)}>Cancel</button></section></div>}
 </main>;
}

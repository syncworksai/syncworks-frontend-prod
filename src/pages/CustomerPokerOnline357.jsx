import React,{useCallback,useEffect,useRef,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Home,Info,Users,RefreshCw,Spade,Trophy} from "lucide-react";
import {useAuth} from "../auth/AuthContext";
import {getCardRoom} from "../api/cardRooms";
import {actOnlinePoker357,getOnlinePoker357} from "../api/onlinePoker357";
import "./CustomerPokerOnline357.css";

const SUITS={S:"♠",H:"♥",D:"♦",C:"♣"};
const FACE={11:"J",12:"Q",13:"K",14:"A"};
const money=c=>"$"+(Number(c||0)/100).toFixed(2);
const seconds=deadline=>deadline?Math.max(0,Math.ceil(deadline-Date.now()/1000)):0;
function Card({card,wild=false}){
 if(!card)return <div className="sw-online-card back">♠</div>;
 const symbol=SUITS[card.suit]||card.suit,red=card.suit==="H"||card.suit==="D";
 return <div className={"sw-online-card "+(red?"red":"black")+(wild?" wild":"")} aria-label={(FACE[card.rank]||card.rank)+" of "+card.suit}>
  {wild&&<small>WILD</small>}<b>{FACE[card.rank]||card.rank}{symbol}</b><strong>{symbol}</strong>
 </div>;
}
export default function CustomerPokerOnline357(){
 const nav=useNavigate(),[params]=useSearchParams(),{user}=useAuth();
 const roomId=params.get("room"),group=params.get("group");
 const lobby="/customer/games/clubs/room?group="+encodeURIComponent(group||"")+"&room="+encodeURIComponent(roomId||"");
 const [room,setRoom]=useState(null),[game,setGame]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[clock,setClock]=useState(Date.now()),[flash,setFlash]=useState(false);
 const lastResult=useRef(null), requestBusy=useRef(false);
 const refresh=useCallback(async()=>{
  if(!roomId||requestBusy.current)return;
  requestBusy.current=true;
  try{
   const data=await getOnlinePoker357(roomId);
   setGame(data);setError("");
   const key=data.phase==="result"||data.phase==="finished"?data.hand_number+":"+data.street+":"+data.version+":"+data.result?.type:null;
   if(key&&data.result?.winner!=null&&key!==lastResult.current){
    lastResult.current=key;setFlash(true);
   }else if(!key)lastResult.current=null;
  }catch(e){setError(e?.response?.data?.detail||"Could not synchronize this table. Check your connection.");}
  finally{requestBusy.current=false;setLoading(false);}
 },[roomId]);
 useEffect(()=>{
  if(!roomId)return;
  getCardRoom(roomId).then(setRoom).catch(()=>{});
  refresh();
  const poll=setInterval(refresh,1200),tick=setInterval(()=>setClock(Date.now()),250);
  return()=>{clearInterval(poll);clearInterval(tick);};
 },[roomId,refresh]);
 useEffect(()=>{if(!flash)return;const t=setTimeout(()=>setFlash(false),2750);return()=>clearTimeout(t);},[flash,game?.version]);
 async function action(command){
  if(!roomId||busy)return;
  setBusy(true);setError("");
  try{const data=await actOnlinePoker357(roomId,command);setGame(data);await refresh();}
  catch(e){setError(e?.response?.data?.detail||"Action failed. The game may already have advanced.");await refresh();}
  finally{setBusy(false);}
 }
 if(!roomId||!group)return <main className="sw-online-root"><p>A valid Card Club table is required.</p><button onClick={()=>nav("/customer/games")}>Poker Lounge</button></main>;
 const players=game?.players||[],phase=game?.phase||"not_started",street=game?.street||0;
 const mine=game?.my_position, me=players.find(p=>p.position===mine),myAction=me?.decision;
 const remaining=seconds(phase==="continue"?game?.continue_deadline:game?.deadline);
 const canChoose=phase==="choosing"&&mine!=null&&me?.eligible&&!myAction;
 const result=game?.result,winner=players.find(p=>p.position===result?.winner);
 const status=phase==="choosing"?"CHOOSE DROP OR HOLD":phase==="continue"?"NEXT ROUND STARTS IN":phase==="result"?"ROUND SETTLED":phase==="finished"?"GAME FINISHED":"WAITING FOR DEALER";
 const positions=[{x:"21%",y:"11%"},{x:"50%",y:"1%"},{x:"79%",y:"11%"},{x:"79%",y:"86%"},{x:"50%",y:"98%"},{x:"21%",y:"86%"}];
 return <main className="sw-online-root">
  <header className="sw-online-top"><button onClick={()=>nav("/customer/games")} aria-label="Poker Lounge"><Home size={18}/><span>Lounge</span></button><div><strong>SYNCWORKS POKER</strong><small>{room?.name||"Card Club"} · LIVE 3-5-7</small></div><button onClick={()=>nav(lobby)}><ArrowLeft size={18}/> Room</button></header>
  <div className="sw-online-meta"><span>♠ Round {street+1}/3 · {[3,5,7][street]} cards · {[3,5,7][street]}s wild</span><span>Table #{roomId} · {players.length} players</span></div>
  {error&&<div className="sw-online-error" role="alert">{error}<button onClick={refresh}><RefreshCw size={15}/></button></div>}
  {loading?<div className="sw-online-loading">Connecting to the shared card table…</div>:<>
   <section className="sw-online-stage" aria-label="Live synchronized 3-5-7 table">
    <div className="sw-online-felt"><div className="sw-online-table-mark">S<small>SYNCWORKS POKER</small></div>
     <div className="sw-online-pot"><strong>{money(game?.pot_cents)}</strong><small>POT · CAP {money(game?.cap_cents)}</small></div>
     <div className="sw-online-deadline">{status}{(phase==="choosing"||phase==="continue")&&<strong>{remaining}s</strong>}</div>
     {flash&&winner&&<div className="sw-online-victory" role="status"><span>✦ {result.type==="game_winner"?"GAME":"ROUND"} WINNER ✦</span><strong>{winner.name}</strong><small>{result.hand} · +{money(result.payout_cents)}</small></div>}
    </div>
    {players.map(p=>{const spot=positions[p.position]||positions[0];return <div key={p.position} className={"sw-online-seat"+(p.position===mine?" own":"")+(result?.winner===p.position?" winner":"")} style={{left:spot.x,top:spot.y}}>
      <div className="sw-online-avatar">{p.position===mine?"YOU":p.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</div>
      <div className="sw-online-name"><b>{p.name}</b><small>{money(p.chips_cents)} · {p.decision==="hold"?"Held":p.decision==="drop"?"Dropped":p.eligible?"Waiting":"Out"}</small>{p.strikes>0&&<small>● {"● ".repeat(Math.max(0,p.strikes-1))}{"○ ".repeat(Math.max(0,3-p.strikes))}</small>}</div>
    </div>;})}
   </section>
   <section className="sw-online-hand" aria-label="Your private cards">
    <div className="sw-online-hand-title"><strong>♠ YOUR HAND</strong><span>{me?.name||"Your seat"} · {game?.my_hand?.length||0} cards</span></div>
    <div className="sw-online-cards">{(game?.my_hand||[]).map((card,i)=><Card key={i} card={card} wild={card.rank===game?.wild_rank}/>)}</div>
    {phase==="result"&&me?.decision==="hold"&&Object.keys(game?.revealed_holders||{}).length>1&&<details className="sw-online-held"><summary>Reveal holding opponents</summary>{Object.entries(game.revealed_holders).filter(([position])=>Number(position)!==mine).map(([position,cards])=><div key={position}><strong>{players.find(p=>p.position===Number(position))?.name}</strong><div className="sw-online-mini-cards">{cards.map((c,i)=><Card card={c} key={i} wild={c.rank===game.wild_rank}/>)}</div></div>)}</details>}
   </section>
   {result&&["result","continue","finished"].includes(phase)&&<div className="sw-online-result" role="status"><Trophy size={18}/><span>{result.type==="carry"?"Everyone dropped · Pot carries":result.type==="uncontested"?(winner?.name+" holds uncontested · "+players.find(p=>p.position===result.winner)?.strikes+"/3 strikes"):result.type==="tie"?"Tie — pot carries":result.type==="game_winner"?"GAME WINNER · "+winner?.name+" · "+money(result.payout_cents):"WINNER · "+winner?.name+" · "+result.hand+" · "+money(result.payout_cents)}</span></div>}
   <nav className="sw-online-actions" aria-label="Online poker actions">
    {phase==="not_started"&&<button onClick={()=>action("start")} disabled={!game?.can_start||!game?.is_host||busy} className="sw-online-primary">♠ {game?.is_host?"Start synchronized table":"Waiting for host"}</button>}
    {phase==="choosing"&&<>{canChoose?<><button disabled={busy} onClick={()=>action("drop")} className="sw-online-drop">DROP</button><button disabled={busy} onClick={()=>action("hold")} className="sw-online-hold">HOLD</button></>:<span className="sw-online-wait">{myAction?"✓ Your choice is locked":"Waiting for other players"} · {remaining}s</span>}</>}
    {phase==="result"&&<button onClick={()=>action("continue")} disabled={busy} className="sw-online-primary">CONTINUE · 10s countdown</button>}
    {phase==="continue"&&<div className="sw-online-wait">Everyone advances together in <strong>{remaining}s</strong></div>}
    {phase==="finished"&&<button onClick={()=>nav(lobby)} className="sw-online-primary">Return to dealer · Choose Game</button>}
    <button onClick={()=>nav("/customer/games")} className="sw-online-lounge"><Home size={18}/> Lounge</button>
   </nav>
   <div className="sw-online-footnote"><Info size={13}/> Virtual chips only · server-controlled hands · 30-second decision timer</div>
  </>}
 </main>;
}

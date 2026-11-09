import React,{useCallback,useEffect,useMemo,useState} from "react";
import {ArrowRight,ChevronDown,RefreshCcw,Users} from "lucide-react";
import {listCardRooms} from "../../api/cardRooms";
import {listPracticeGames} from "../../games/cardPracticeResume.mjs";

/**
 * Displays authoritative room status only.
 * Turn alerts require backend-produced targeted player ID and a server deadline;
 * local/AI practice does not create a remote YOUR TURN notification.
 */
export function playerTurnAlert(rooms,userId){
 if(!userId)return null;
 const eligible=(Array.isArray(rooms)?rooms:[]).filter(room=>
  room?.state==="PLAYING" &&
  room?.practice_mode===false &&
  room?.turn?.requires_action===true &&
  String(room?.turn?.user_id)===String(userId) &&
  room?.turn?.deadline_at &&
  room?.turn?.hand_id
 );
 return eligible[0]||null;
}
export default function CardClubTableSwitcher({groupId,currentRoomId="",userId=null,navigate,compact=false}){
 const [open,setOpen]=useState(false);
 const [rooms,setRooms]=useState([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [pausedGames,setPausedGames]=useState([]);
 const [alertVisible,setAlertVisible]=useState(false);
 const [dismissedHand,setDismissedHand]=useState("");
 const refresh=useCallback(async()=>{
  if(!groupId)return;
  setLoading(true);
  setPausedGames(listPracticeGames(userId,groupId));
  try{const list=await listCardRooms(groupId);setRooms(list.filter(room=>room.state!=="CLOSED"));setError("");}
  catch(e){setError(e.response?.data?.detail||e.message||"Room status unavailable");}
  finally{setLoading(false);}
 },[groupId,userId]);
 useEffect(()=>{setRooms([]);setOpen(false);refresh();},[refresh]);
 // Poll only while list is visible. A server-driven turn event will eventually replace this.
 useEffect(()=>{if(!open||!groupId)return;const id=setInterval(refresh,15000);return()=>clearInterval(id);},[open,groupId,refresh]);
 const turnRoom=useMemo(()=>playerTurnAlert(rooms,userId),[rooms,userId]);
 const handKey=turnRoom?String(turnRoom.id)+":"+turnRoom.turn.hand_id:"";
 useEffect(()=>{
  if(!handKey||handKey===dismissedHand){setAlertVisible(false);return;}
  setAlertVisible(true);
  const timeout=setTimeout(()=>{setAlertVisible(false);setDismissedHand(handKey);},5000);
  return()=>clearTimeout(timeout);
 },[handKey,dismissedHand]);
 if(!groupId)return null;
 return <div className="relative z-30 w-full text-white">
  {alertVisible&&turnRoom&&<div role="alert" aria-live="assertive" className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-[#292006] p-2 text-xs font-black text-amber-100 shadow-[0_0_18px_#ffd55e66]">
   <span className="min-w-0 truncate">YOUR TURN · {turnRoom.name}</span>
   <button type="button" className="min-h-9 shrink-0 rounded-lg bg-amber-300 px-3 text-slate-950" onClick={()=>navigate("/customer/games/clubs/room?group="+encodeURIComponent(groupId)+"&room="+encodeURIComponent(turnRoom.id))}>Go to table</button>
   <button type="button" aria-label="Dismiss turn alert" onClick={()=>{setAlertVisible(false);setDismissedHand(handKey);}} className="px-2">×</button>
  </div>}
  <div className="flex items-center gap-2">
   <button type="button" aria-expanded={open} onClick={()=>{setOpen(v=>!v);if(!open)refresh();}} className={"flex min-h-10 min-w-0 items-center gap-2 rounded-xl border border-cyan-400/35 bg-[#071b31] px-3 text-xs font-bold "+(compact?"":"flex-1")}>
    <Users size={15}/><span className="truncate">Tables · {rooms.length}</span><ChevronDown size={15}/>
   </button>
   {!compact&&<button type="button" onClick={()=>navigate("/customer/games/new?group="+encodeURIComponent(groupId))} className="min-h-10 rounded-xl border border-emerald-400/30 px-3 text-xs font-bold">+ Table</button>}
  </div>
  {open&&<div className="mt-2 max-h-80 overflow-auto rounded-xl border border-cyan-400/25 bg-[#061529] p-2 shadow-xl" aria-label="Club table switcher">
   <div className="mb-2 flex items-center justify-between gap-2 px-1"><strong className="text-xs">Your club tables</strong><button type="button" onClick={refresh} disabled={loading} className="flex items-center gap-1 text-[11px] text-cyan-200"><RefreshCcw size={12}/> Refresh</button></div>
   {error&&<p className="p-2 text-xs text-amber-200">{error}</p>}
   {rooms.map(room=><button type="button" key={room.id} onClick={()=>navigate("/customer/games/clubs/room?group="+encodeURIComponent(groupId)+"&room="+encodeURIComponent(room.id))} className={"mb-1 flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border p-2 text-left "+(String(room.id)===String(currentRoomId)?"border-cyan-300 bg-cyan-900/30":"border-white/10 bg-white/[.03]")}>
    <span className="min-w-0"><strong className="block truncate text-xs">{room.name}</strong><span className="text-[10px] text-slate-400">{room.seats?.length||0}/{room.capacity} · {room.state==="PLAYING"?"In game":room.state==="READY"?"Ready":room.state==="WAITING"?"Waiting":"Dealer choice"} · {room.practice_mode?"Practice":"Human only"} · {room.admission_open===false?"Closed joins":"Open joins"}</span></span><ArrowRight size={15} className="shrink-0"/>
   </button>)}
   {!rooms.length&&!error&&<p className="p-2 text-xs text-slate-400">No current tables. Create a table to invite players.</p>}
   {pausedGames.length>0&&<div className="mt-2 border-t border-white/10 pt-2"><div className="px-1 pb-1 text-[11px] font-bold text-emerald-200">Continue practice</div>{pausedGames.map(game=><button type="button" key={game.variant} onClick={()=>navigate(game.path)} className="mb-1 flex min-h-10 w-full items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 text-left text-xs"><span>{({357:"3-5-7",fyb:"FYB",442:"4/4/Deuce",bozo:"Bozo","queen-follower":"Queen & the Follower"})[game.variant]||game.variant} · {game.phase}</span><span className="font-bold text-emerald-200">Continue →</span></button>)}</div>}
   <p className="mt-2 text-[10px] text-slate-400">Room status is shared. Cross-phone turn alerts will activate only once the server supplies authenticated player turns and deadlines.</p>
  </div>}
 </div>;
}

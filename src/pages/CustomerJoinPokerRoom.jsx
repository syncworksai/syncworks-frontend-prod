import React,{useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Check,Spade,UserPlus,Users} from "lucide-react";
import {actCardRoom,getCardRoom} from "../api/cardRooms";
import {useAuth} from "../auth/AuthContext";

function usd(c){return "$"+(Number(c||0)/100).toFixed(2);}
function cents(amount){return Math.round(Number(amount)*100);}
export default function CustomerJoinPokerRoom(){
 const nav=useNavigate(),[query]=useSearchParams(),{user}=useAuth();
 const group=query.get("group")||"",roomId=query.get("room")||"";
 const [room,setRoom]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[amount,setAmount]=useState("");
 const lobby="/customer/games/clubs/room?group="+encodeURIComponent(group)+"&room="+encodeURIComponent(roomId);
 const mySeat=room?.seats?.find(s=>String(s.user_id)===String(user?.id));
 const minimum=room?.minimum_buy_in_cents??room?.virtual_buy_in_cents??0;
 useEffect(()=>{
  let active=true;
  if(!group||!/^[1-9]\d*$/.test(roomId)){setError("This invitation does not contain a valid shared room ID.");setLoading(false);return;}
  getCardRoom(roomId).then(data=>{
   if(!active)return;
   if(String(data.group)!==String(group)){setError("This room does not belong to the invited club.");return;}
   setRoom(data);setAmount(String((data.minimum_buy_in_cents??data.virtual_buy_in_cents)/100));
  }).catch(err=>{
   if(!active)return;
   const status=err?.response?.status;
   setError(status===403||status===404?"This poker room is not available to your account. Club membership approval may still be required, or the room may have closed.":err?.response?.data?.detail||"Shared poker rooms are not online yet. Ask the host to create a live room once multiplayer is enabled.");
  }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[group,roomId]);
 async function join(){
  if(busy||!room||mySeat)return;
  const buyin=cents(amount);
  if(!Number.isSafeInteger(buyin)||buyin<minimum||buyin>1000000){setError("Your virtual chip buy-in must meet the room minimum.");return;}
  setBusy(true);setError("");
  try{
   const joined=await actCardRoom(room.id,"join",{virtual_buy_in_cents:buyin});
   if(!joined.seats?.some(s=>String(s.user_id)===String(user?.id)))throw Error("Your seat was not confirmed by the server.");
   nav(lobby,{replace:true});
  }catch(err){setError(err?.response?.data?.detail||err?.message||"Could not join this room.");}
  finally{setBusy(false);}
 }
 return <main className="min-h-dvh bg-[#020817] px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-lg">
  <header className="mb-5 flex items-center justify-between"><button type="button" onClick={()=>nav("/customer/games")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs"><ArrowLeft size={16}/> Games</button><span className="text-xs font-black tracking-[.14em] text-cyan-300">SYNCWORKS POKER</span></header>
  <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-[#183a4a] via-[#071c31] to-[#0a1029] p-5">
   <Spade size={28} className="mb-3 text-cyan-300"/><h1 className="text-2xl font-black">Join their poker table</h1>
   <p className="mt-2 text-xs leading-5 text-slate-300">This invitation is for an existing room, not for creating a new game. Sign in with your approved Card Club account to take an open seat.</p>
  </section>
  {loading?<div className="mt-4 rounded-2xl border border-white/10 p-5 text-center text-sm text-slate-300">Checking table access…</div>:room?<section className="mt-4 space-y-4 rounded-2xl border border-white/15 bg-white/[.04] p-5">
   <div><h2 className="text-xl font-black">{room.name}</h2><p className="mt-1 text-xs text-slate-400">Room #{room.id} · {room.state==="WAITING"?"Waiting for players":room.state==="CLOSED"?"Closed":"Game in progress"}</p></div>
   <div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/10 p-3"><Users size={17} className="mb-2 text-cyan-300"/><strong>{room.seats?.length||0}/{room.capacity}</strong><p className="mt-1 text-[11px] text-slate-400">Seats filled</p></div><div className="rounded-xl border border-white/10 p-3"><strong className="text-emerald-300">{usd(minimum)}</strong><p className="mt-2 text-[11px] text-slate-400">Minimum virtual buy-in</p></div></div>
   {mySeat?<button type="button" onClick={()=>nav(lobby,{replace:true})} className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-slate-950"><Check size={17} className="mr-1 inline"/> Already seated · Enter Table</button>:room.state==="WAITING"&&room.seats.length<room.capacity?<><label className="block text-xs text-slate-300">Your virtual chip buy-in ($)<input type="number" min={minimum/100} max="10000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-slate-950 px-3 text-white"/></label><button type="button" disabled={busy} onClick={join} className="min-h-12 w-full rounded-xl bg-cyan-400 font-black text-slate-950 disabled:opacity-50"><UserPlus size={17} className="mr-1 inline"/> {busy?"Joining…":"Join this table"}</button></>:<p className="rounded-xl border border-amber-300/20 p-3 text-xs text-amber-100">The room is no longer accepting new seats. Contact the dealer to start another room.</p>}
   <p className="text-[11px] leading-5 text-slate-400">Virtual chip tracking only. SyncWorks does not hold or transfer money. Shared gameplay and cards are still under development.</p>
  </section>:null}
  {error&&<div role="alert" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">{error}<button type="button" onClick={()=>nav("/customer/games/clubs?group="+encodeURIComponent(group))} className="mt-3 block min-h-11 w-full rounded-xl border border-white/20 font-bold text-white">View Card Club membership</button></div>}
 </div></main>;
}

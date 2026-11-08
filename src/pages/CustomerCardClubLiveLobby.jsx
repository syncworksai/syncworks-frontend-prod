import React,{useCallback,useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,ArrowRight,Club,Crown,RefreshCw,Spade,UserPlus,Users,Share2} from "lucide-react";
import {useAuth} from "../auth/AuthContext";
import {getGroups} from "../api/social";
import {actCardRoom,createCardRoom,getCardRoom,listCardRooms} from "../api/cardRooms";

const GAMES=[["357","3-5-7 DROP"],["fyb","FYB"],["442","4/4/Deuce"],["bozo","Bozo · The Clown"],["queen-follower","Queen & the Follower"]];
const dollars=c=>"$"+(Number(c||0)/100).toFixed(2);
const money=v=>Math.round(Number(v)*100);
const positions=[[3,1],[1,1],[1,3],[3,3],[2,1],[2,3]];
const statusText={WAITING:"Waiting for players",DEALER:"Dealer's choice",READY:"Table ready",CLOSED:"Closed"};
function Avatar({player}) {return <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-cyan-300/45 bg-gradient-to-br from-[#284263] to-[#402061] text-xs font-black text-cyan-100">{player?.avatar_url?<img src={player.avatar_url} alt="" className="h-full w-full object-cover"/>:(player?.name||"+").split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}</span>;}
function PokerTable({room,spinner}) {
 const seats=room?.seats||[];
 const selected=room?.dealer_position;
 return <section className="overflow-hidden rounded-[2.5rem] border border-emerald-400/30 bg-[#07191a] p-3 shadow-2xl"><div className="relative mx-auto min-h-[350px] max-w-[700px] rounded-[44%] border-[12px] border-[#50381e] bg-[#07483b] shadow-[inset_0_0_0_3px_#b99c57,inset_0_0_75px_#002a22] sm:min-h-[440px]">
 <div className="absolute inset-3 rounded-[44%] border border-emerald-100/20"/>
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><div className="text-[10px] font-black tracking-[.27em] text-emerald-200/70">SYNCWORKS POKER</div>{spinner&&<div className="grid h-20 w-20 animate-spin place-items-center rounded-full border-4 border-amber-300 bg-slate-900 text-3xl">♠</div>}{room?.state==="READY"&&<div className="flex -space-x-4">{[0,1,2,3,4].map(i=><span key={i} className="grid h-20 w-14 place-items-center rounded-lg border-2 border-cyan-200/60 bg-[#153550] text-2xl shadow-xl">♠</span>)}</div>}<div className="text-center text-xs font-bold text-amber-200">{spinner?"Spinning dealer…":room?.state==="READY"?(GAMES.find(([id])=>id===room.game_code)?.[1]||"Table ready"):"Waiting for the table"}</div></div>
 <div className="relative grid min-h-[320px] grid-cols-3 grid-rows-3 items-center justify-items-center gap-1 sm:min-h-[410px]">{Array.from({length:room.capacity},(_,i)=>{const seat=seats.find(s=>s.position===i);const [x,y]=positions[i];return <div key={i} style={{gridColumn:x,gridRow:y}} className="z-10 flex max-w-[105px] flex-col items-center gap-1"><div className="relative"><Avatar player={seat}/>{selected===i&&<span className="absolute -bottom-1 -right-2 rounded-full bg-amber-300 px-1.5 text-[9px] font-black text-black">D</span>}</div><div className="w-[95px] rounded-lg bg-[#020e17]/95 px-1.5 py-1 text-center"><div className="truncate text-[10px] font-black text-white">{seat?.name||"Open seat"}</div><div className="text-[9px] text-emerald-300">{seat?dollars(seat.virtual_chips_cents):"Waiting"}</div></div></div>;})}</div>
 </div></section>;
}
export default function CustomerCardClubLiveLobby(){
 const nav=useNavigate(),[params,setParams]=useSearchParams(),groupId=params.get("group")||"";
 const {user}=useAuth();
 const [group,setGroup]=useState(null),[rooms,setRooms]=useState([]),[room,setRoom]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[serverUnavailable,setServerUnavailable]=useState(false);
 const [newName,setNewName]=useState("Saturday Poker"),[capacity,setCapacity]=useState(6),[buyIn,setBuyIn]=useState("20");
 const [mode,setMode]=useState("DEALER"),[game,setGame]=useState("357"),[ante,setAnte]=useState("0.25"),[cap,setCap]=useState("50");
 const [nickname,setNickname]=useState(""),[showName,setShowName]=useState(false),[spinning,setSpinning]=useState(false);
 const [joinBuyin,setJoinBuyin]=useState("20");
 const currentId=room?.id;
 const mySeat=room?.seats?.find(s=>s.user_id===user?.id),isHost=room?.host===true;
 const dealerSeat=room?.seats?.find(s=>s.position===room.dealer_position);
 const canConfigure=isHost||dealerSeat?.user_id===user?.id;
 const refresh=useCallback(async()=>{
  if(!groupId)return;
  try {
   const rs=await listCardRooms(groupId);
   setRooms(rs);
   const wanted=params.get("room");
   if(wanted) {
    const found=rs.find(r=>String(r.id)===String(wanted));
    if(found)setRoom(found);else setRoom(null);
   }
  }catch(e){if(e?.response?.status===404)setServerUnavailable(true);else setError(e?.response?.data?.detail||e.message||"Unable to refresh poker rooms");}
 },[groupId,params]);
 useEffect(()=>{let mounted=true;if(!groupId){setLoading(false);return;}
  Promise.all([getGroups(),listCardRooms(groupId)]).then(([groups,rs])=>{if(!mounted)return;setGroup(groups.find(g=>String(g.id)===String(groupId))||null);setRooms(rs);
   const wanted=params.get("room");if(wanted){const found=rs.find(r=>String(r.id)===String(wanted))||null;setRoom(found);if(found)setJoinBuyin(String((found.minimum_buy_in_cents??found.virtual_buy_in_cents)/100));}
  }).catch(e=>{if(mounted){if(e?.response?.status===404)setServerUnavailable(true);else setError(e?.response?.data?.detail||e.message||"Unable to load lobby");}}).finally(()=>{if(mounted)setLoading(false);});
  return()=>{mounted=false;};
 },[groupId]);
 useEffect(()=>{if(!groupId)return;const timer=window.setInterval(()=>{refresh();},3500);return()=>window.clearInterval(timer);},[groupId,refresh]);
 async function mutate(action,payload={}){
  if(!room||busy)return;setBusy(true);setError("");
  try{const updated=await actCardRoom(room.id,action,payload);setRoom(updated);setRooms(old=>old.map(r=>r.id===updated.id?updated:r));if(action==="start"){setSpinning(true);window.setTimeout(()=>setSpinning(false),1750);}setNotice(action==="join"?"You joined the live room.":action==="nickname"?"Your table nickname was updated.":action==="start"?"Dealer selected.":action==="next-dealer"?"Dealer rotated.":"Room updated.");if(action==="close"){setRoom(null);setParams({group:groupId});await refresh();}}
  catch(e){setError(e?.response?.data?.detail||e?.message||"Room action failed");}finally{setBusy(false);}
 }
 async function create(e){e.preventDefault();if(busy)return;setBusy(true);setError("");try{
  const amount=money(buyIn);if(!Number.isSafeInteger(amount)||amount<0||amount>1000000)throw Error("Enter a valid virtual buy-in.");
  const data=await createCardRoom({group:Number(groupId),name:newName.trim(),capacity,virtual_buy_in_cents:amount});
  setRoom(data);setRooms(old=>[data,...old]);setParams({group:groupId,room:String(data.id)});setNotice("Room created. You have been seated automatically; other approved members may now join from their own accounts.");
 }catch(e){setError(e?.response?.data?.detail||e.message||"Unable to create room");}finally{setBusy(false);}}
 function openRoom(r){setRoom(r);setJoinBuyin(String((r.minimum_buy_in_cents??r.virtual_buy_in_cents)/100));setParams({group:groupId,room:String(r.id)});setNotice("");}
 function backToRooms(){setRoom(null);setParams({group:groupId});setNotice("");}
 async function shareLiveRoom(){
  if(!room)return;
  const url=window.location.origin+"/customer/games/clubs/room?group="+encodeURIComponent(groupId)+"&room="+room.id;
  try{
    if(navigator.share)await navigator.share({title:room.name+" · SyncWorks Poker",text:"Join our poker room with your approved Card Club account.",url});
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setNotice("Live room link copied.");}
    else setNotice("Room link: "+url);
  }catch(err){if(err?.name!=="AbortError")setError("Unable to share this room.");}
 }
 function configure(){const a=money(ante),c=money(cap);if(!Number.isSafeInteger(a)||a<0||!Number.isSafeInteger(c)||c<=0&&game!=="fyb"){setError("Check ante and pot max.");return;}mutate("configure",{game_selection:mode,game_code:game,ante_cents:a,pot_cap_cents:game==="fyb"?0:c});}
 if(!groupId)return <main className="min-h-dvh bg-[#020817] p-6 text-white">Choose a group first. <button className="underline" onClick={()=>nav("/customer/games")}>Leagues</button></main>;
 return <main className="min-h-dvh bg-[#020817] px-3 pb-24 pt-[max(1rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-4xl">
 <header className="mb-4 flex items-center justify-between"><button onClick={()=>room?backToRooms():nav("/customer/games/clubs?group="+groupId)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs"><ArrowLeft size={16}/> {room?"Rooms":"League"}</button><div className="text-right"><div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">SYNCWORKS CARD CLUB</div><h1 className="text-xl font-black">{group?.name||"Poker Lobby"}</h1></div></header>
 <p className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-[11px] leading-5 text-amber-100"><b>Live waiting-room beta.</b> Approved members can join seats across devices. Chip totals are virtual. Shuffling, actual game moves, pot ledger and player-to-player payouts are not yet synchronized; game prototypes remain local.</p>
 {serverUnavailable&&<div className="mb-4 rounded-xl border border-amber-300/35 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100"><b>Shared rooms not available on the server yet.</b> The new table screen is deployed as a preview while the Django room migration is verified. <button type="button" onClick={()=>nav("/customer/games/clubs/room-preview?group="+groupId)} className="mt-3 block min-h-11 w-full rounded-xl bg-amber-300 px-3 font-black text-slate-950">Open local animated poker table preview</button></div>}
 {error&&<div role="alert" className="mb-3 rounded-xl border border-rose-400/30 p-3 text-xs text-rose-200">{error}</div>}
 {notice&&<div role="status" className="mb-3 rounded-xl border border-cyan-400/25 p-3 text-xs text-cyan-100">{notice}</div>}
 {!room?<div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-cyan-300/20 bg-white/[.035] p-4"><h2 className="mb-2 text-lg font-black"><Club className="mr-2 inline text-cyan-200"/> Open rooms</h2><p className="mb-3 text-xs text-slate-400">Choose a table from your own league.</p>{loading?<p className="text-xs">Loading…</p>:<div className="max-h-80 space-y-2 overflow-auto">{rooms.map(r=><button key={r.id} type="button" onClick={()=>openRoom(r)} className="flex min-h-16 w-full items-center justify-between rounded-xl border border-white/10 bg-black/15 p-3 text-left"><div><div className="text-sm font-black">{r.name}</div><div className="text-xs text-slate-400">{r.seats.length}/{r.capacity} players · {r.state}</div></div><ArrowRight size={18} className="text-cyan-200"/></button>)}{!rooms.length&&<p className="p-4 text-xs text-slate-400">No open tables yet. Create the first one.</p>}</div>}</section><form onSubmit={create} className="space-y-3 rounded-2xl border border-violet-400/25 bg-white/[.035] p-4"><h2 className="text-lg font-black">Create a poker room</h2><label className="block text-xs text-slate-300">Room name<input value={newName} onChange={e=>setNewName(e.target.value)} required maxLength={80} className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white"/></label><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Seats<select value={capacity} onChange={e=>setCapacity(Number(e.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white">{[4,5,6].map(n=><option key={n} value={n}>{n} seats</option>)}</select></label><label className="text-xs text-slate-300">Buy-in ($)<input type="number" min="0" step="1" value={buyIn} onChange={e=>setBuyIn(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white"/></label></div><p className="text-xs text-slate-400">Each player gets their own starting virtual chip stack when they join. No money is charged.</p><button disabled={busy||serverUnavailable} className="min-h-12 w-full rounded-xl bg-violet-400 font-black text-black disabled:opacity-40">Create live lobby</button></form></div>:<>
 <section className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[.035] p-3"><div><div className="text-[10px] uppercase tracking-widest text-cyan-300">ROOM #{room.id}</div><h2 className="text-xl font-black">{room.name}</h2><p className="text-xs text-slate-400">{room.seats.length}/{room.capacity} seats · {statusText[room.state]||room.state}</p></div><div className="text-right"><div className="text-xs text-slate-400">Starting virtual purse</div><div className="text-xl font-black text-emerald-300">{dollars(room.seats.length*room.virtual_buy_in_cents)}</div></div></section>
 <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs text-slate-400">Minimum virtual buy-in: <b className="text-emerald-200">{dollars(room.minimum_buy_in_cents??room.virtual_buy_in_cents)}</b></span><button type="button" onClick={shareLiveRoom} className="flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-xs font-black text-cyan-200"><Share2 size={16}/> Share Room</button></div>
 <PokerTable room={room} spinner={spinning}/>
 <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="flex items-center gap-2 text-lg font-black"><Users size={18} className="text-cyan-300"/> {room.state==="WAITING"?"Waiting room":room.state==="DEALER"?"Dealer's choice":"Game ready"}</h2>
 {room.state==="WAITING"&&<div className="mt-3 space-y-3"><p className="text-xs text-slate-400">Joining is tied to the logged-in SyncWorks account. Room seats refresh automatically.</p>{mySeat?<div className="flex items-center justify-between rounded-xl border border-emerald-400/25 p-3 text-xs"><span>You are seated: <b>{mySeat.name}</b></span><button disabled={busy} onClick={()=>mutate("leave")} className="rounded-lg border border-white/20 px-3 py-2">Leave seat</button></div>:<div className="space-y-2 rounded-xl border border-white/10 p-3"><label className="block text-xs text-slate-300">Your virtual chip buy-in ($) · minimum {dollars(room.minimum_buy_in_cents??room.virtual_buy_in_cents)}<input type="number" min={(room.minimum_buy_in_cents??room.virtual_buy_in_cents)/100} max="10000" step="0.01" value={joinBuyin} onChange={e=>setJoinBuyin(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/></label><button disabled={busy||room.seats.length>=room.capacity||!Number.isSafeInteger(money(joinBuyin))||money(joinBuyin)<(room.minimum_buy_in_cents??room.virtual_buy_in_cents)} onClick={()=>mutate("join",{virtual_buy_in_cents:money(joinBuyin)})} className="min-h-12 w-full rounded-xl bg-cyan-400 font-black text-black disabled:opacity-40"><UserPlus size={17} className="mr-1 inline"/> Join with {dollars(money(joinBuyin))} virtual chips</button><p className="text-[11px] text-amber-100">Virtual chips only. No money is charged or held in SyncWorks.</p></div>}
  {mySeat&&<div><button onClick={()=>{setShowName(v=>!v);setNickname(mySeat.nickname||"");}} className="text-xs font-bold text-cyan-200">Edit my table name</button>{showName&&<form onSubmit={e=>{e.preventDefault();mutate("nickname",{nickname});setShowName(false);}} className="mt-2 flex gap-2"><input maxLength={32} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Display name" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 p-3 text-xs"/><button className="rounded-xl bg-cyan-400 px-3 text-xs font-black text-black">Save</button></form>}</div>}
  {isHost&&<div className="grid grid-cols-2 gap-2"><button disabled={busy||room.seats.length>=room.capacity||room.seats.some(s=>s.is_computer)} onClick={()=>mutate("add-computer")} className="min-h-11 rounded-xl border border-violet-400/30 text-xs font-bold disabled:opacity-40">🤖 Add computer</button><button disabled={busy||room.seats.length<2} onClick={()=>mutate("start")} className="min-h-11 rounded-xl bg-amber-400 text-xs font-black text-black disabled:opacity-40">Spin for dealer</button></div>}
 </div>}
 {room.state==="DEALER"&&<div className="mt-3 space-y-3"><p className="text-sm text-amber-200"><Crown size={16} className="mr-1 inline"/> Dealer: <b>{dealerSeat?.name||"Selecting..."}</b></p>{canConfigure?<><label className="block text-xs text-slate-300">Game selection<select value={mode} onChange={e=>setMode(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"><option value="DEALER">Dealer chooses game</option><option value="RANDOM">Random game</option></select></label>{mode==="DEALER"&&<label className="block text-xs text-slate-300">Choose game<select value={game} onChange={e=>setGame(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white">{GAMES.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>}<div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Ante ($)<input type="number" min="0" step="0.25" value={ante} onChange={e=>setAnte(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"/></label><label className="text-xs text-slate-300">Pot cap ($){game==="fyb"?" N/A":""}<input type="number" disabled={game==="fyb"} min="0.01" value={cap} onChange={e=>setCap(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white disabled:opacity-40"/></label></div><button disabled={busy} onClick={configure} className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-black disabled:opacity-40">Confirm dealer's game</button></>:<p className="text-xs text-slate-400">Waiting for the dealer to choose game and ante.</p>}</div>}
 {room.state==="READY"&&<div className="mt-3 space-y-3"><p className="text-sm">Selected: <b className="text-amber-200">{GAMES.find(g=>g[0]===room.game_code)?.[1]}</b> · Ante {dollars(room.ante_cents)} · Hand {room.hand_number}</p><p className="text-xs leading-5 text-amber-100">Card play is a local interactive preview; private cards, Hold/Fold decisions and pots are not yet synchronized between phones.</p><button onClick={()=>nav((room.game_code==="357"?"/customer/games/table":"/customer/games/"+room.game_code)+"?group="+groupId+(room.game_code==="357"?"&room="+room.id:""))} className="min-h-12 w-full rounded-xl bg-cyan-400 font-black text-black">Open game prototype <ArrowRight size={16} className="ml-1 inline"/></button>{isHost&&<button onClick={()=>mutate("next-dealer")} disabled={busy} className="min-h-11 w-full rounded-xl border border-amber-300/30 text-sm font-bold">Next game · rotate dealer</button>}</div>}
 {isHost&&<button disabled={busy} onClick={()=>mutate("close")} className="mt-5 text-xs text-rose-300">Close this room</button>}
 </section>
 </>}
 </div></main>;
}

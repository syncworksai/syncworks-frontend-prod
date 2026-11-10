import React,{useCallback,useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,ArrowRight,Club,Crown,RefreshCw,Spade,UserPlus,Users,Share2,X} from "lucide-react";
import {useAuth} from "../auth/AuthContext";
import {getGroups,createGroupInviteLink} from "../api/social";
import {actCardRoom,createCardRoom,getCardRoom,listCardRooms} from "../api/cardRooms";
import "./CustomerPokerTable.css";
import {rememberPokerRoom,clearPokerResume} from "../games/pokerResume.mjs";
import CardClubTableSwitcher from "../components/poker/CardClubTableSwitcher";
import {listPracticeGames} from "../games/cardPracticeResume.mjs";

const GAMES=[["357","3-5-7 DROP"],["fyb","FYB"],["442","4/4/Deuce"],["bozo","Bozo · The Clown"],["queen-follower","Queen & the Follower"]];
const dollars=c=>"$"+(Number(c||0)/100).toFixed(2);
const money=v=>Math.round(Number(v)*100);
const positions=[[3,1],[1,1],[1,3],[3,3],[2,1],[2,3]];
const statusText={WAITING:"Waiting for players",DEALER:"Dealer's choice",READY:"Ready for online table",CLOSED:"Closed"};
function Avatar({player}) {return <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-cyan-300/45 bg-gradient-to-br from-[#284263] to-[#402061] text-xs font-black text-cyan-100">{player?.avatar_url?<img src={player.avatar_url} alt="" className="h-full w-full object-cover"/>:(player?.name||"+").split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}</span>;}
function PokerTable({room,spinner,onJoin,onInvite,canJoin,canInvite,busy}) {
 const seats=room?.seats||[];
 const positions=[
  [19,9],[50,0],[81,9],[81,88],[50,103],[19,88]
 ];
 return <section className="sw-live-lobby-felt-wrap" aria-label="SyncWorks shared poker waiting table">
  <div className="sw-live-lobby-felt">
   <div className="sw-live-lobby-inner-ring"/>
   <div className="sw-live-lobby-center">
    <span className="sw-live-lobby-logo">S</span><strong>SYNCWORKS<br/>POKER</strong>
    {spinner?<div className="mt-2 animate-spin text-3xl text-amber-300">♠</div>:<div className="mt-2 text-xs font-black text-amber-300">{room.state==="WAITING"?"WAITING FOR PLAYERS":room.state==="DEALER"?"DEALER'S CHOICE":GAMES.find(g=>g[0]===room.game_code)?.[1]||"READY TO PLAY"}</div>}
    <div className="sw-live-lobby-pot">♠ {seats.length}/{room.capacity} seated · {dollars(seats.reduce((total,s)=>total+(s.virtual_chips_cents||0),0))} virtual chips</div>
   </div>
   {Array.from({length:room.capacity},(_,i)=> {
    const seat=seats.find(s=>s.position===i),[left,top]=positions[i],isDealer=room.dealer_position===i;
    const action=canJoin?onJoin:canInvite?onInvite:null;
    return <div key={i} className="sw-live-lobby-seat" style={{left:left+"%",top:top+"%"}}>
     {seat?<div className="sw-live-lobby-avatar">{seat.avatar_url?<img src={seat.avatar_url} alt="" className="h-full w-full rounded-full object-cover"/>:seat.is_computer?"🤖":seat.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}{isDealer&&<span className="sw-live-lobby-dealer">D</span>}</div>:<button type="button" onClick={action||undefined} disabled={!action||busy} className="sw-live-lobby-empty" aria-label={"Open seat "+(i+1)+(canJoin?", join table":canInvite?", invite player":"")}>+</button>}
     <div className="sw-live-lobby-name"><strong>{seat?.name||"Open Seat"}</strong><small>{seat?dollars(seat.virtual_chips_cents):"Waiting"}</small></div>
    </div>;
   })}
  </div>
 </section>;
}
export default function CustomerCardClubLiveLobby(){
 const nav=useNavigate(),[params,setParams]=useSearchParams(),groupId=params.get("group")||"";
 const {user}=useAuth();
 const pausedPractice=listPracticeGames(user?.id,groupId);
 const [group,setGroup]=useState(null),[rooms,setRooms]=useState([]),[room,setRoom]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[serverUnavailable,setServerUnavailable]=useState(false);
 const [newName,setNewName]=useState("Saturday Poker"),[capacity,setCapacity]=useState(6),[buyIn,setBuyIn]=useState("20");
 const [mode,setMode]=useState("DEALER"),[game,setGame]=useState("357"),[ante,setAnte]=useState("0.25"),[cap,setCap]=useState("50");
 const [nickname,setNickname]=useState(""),[showName,setShowName]=useState(false),[spinning,setSpinning]=useState(false);
 const [joinBuyin,setJoinBuyin]=useState("20");
 const virtualCount=room?.seats?.filter(seat=>seat.is_computer).length||0;
 const maxVirtual=Math.max(0,(room?.capacity||6)-(room?.seats?.filter(seat=>!seat.is_computer).length||0));
 const isPracticeRoom=Boolean(room?.practice_mode||virtualCount>0);
 const online357Ready=!isPracticeRoom&&room?.state==="READY"&&room?.game_code==="357";
 const seatsCanChange=room?.hand_active!==true&&room?.state!=="CLOSED";
 const currentId=room?.id;
 const mySeat=room?.seats?.find(s=>s.user_id===user?.id),isHost=room?.host===true;
 const dealerSeat=room?.seats?.find(s=>s.position===room.dealer_position);
 const canConfigure=isHost||dealerSeat?.user_id===user?.id;
 useEffect(()=>{
   if(!room?.id||!groupId||!user?.id)return;
   if(room.state==="CLOSED"){clearPokerResume(user);return;}
   if(room.seats?.some(seat=>String(seat.user_id)===String(user.id))){
     rememberPokerRoom(user,groupId,room.id);
   }
 },[user?.id,room?.id,room?.state,room?.seats,groupId]);

 const refresh=useCallback(async()=>{
  if(!groupId)return;
  try {
   const rs=await listCardRooms(groupId);
   setRooms(rs);
   const wanted=params.get("room");
   if(wanted) {
    const found=rs.find(r=>String(r.id)===String(wanted));
    if(found){setRoom(found);setError("");setServerUnavailable(false);}else setRoom(null);
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
  try{const updated=await actCardRoom(room.id,action,payload);setRoom(updated);setRooms(old=>old.map(r=>r.id===updated.id?updated:r));if(action==="start"){setSpinning(true);window.setTimeout(()=>setSpinning(false),1750);}setNotice(action==="join"?"You joined the live room.":action==="nickname"?"Your table nickname was updated.":action==="start"?"Dealer selected.":action==="next-dealer"?"Dealer rotated.":"Room updated.");if(action==="close"||action==="leave"){clearPokerResume(user);}if(action==="close"){setRoom(null);setParams({group:groupId});await refresh();}}
  catch(e){setError(e?.response?.data?.detail||e?.message||"Room action failed");}finally{setBusy(false);}
 }
 async function create(e){e.preventDefault();if(busy)return;setBusy(true);setError("");try{
  const amount=money(buyIn);if(!Number.isSafeInteger(amount)||amount<0||amount>1000000)throw Error("Enter a valid virtual buy-in.");
  const data=await createCardRoom({group:Number(groupId),name:newName.trim(),capacity,virtual_buy_in_cents:amount});
  setRoom(data);setRooms(old=>[data,...old]);setParams({group:groupId,room:String(data.id)});setNotice("Room created. You have been seated automatically; other approved members may now join from their own accounts.");
 }catch(e){setError(e?.response?.data?.detail||e.message||"Unable to create room");}finally{setBusy(false);}}
 async function closeRoomFromList(target){
  if(busy||!target||String(target.created_by)!==String(user?.id)||target.hand_active)return;
  if(!window.confirm('Close "'+target.name+'" (Table #'+target.id+')? Everyone will lose access to this room. This cannot be undone.'))return;
  setBusy(true);setError("");setNotice("");
  try{
   await actCardRoom(target.id,"close");
   setRooms(old=>old.filter(r=>String(r.id)!==String(target.id)));
   if(String(room?.id)===String(target.id)){setRoom(null);setParams({group:groupId});clearPokerResume(user);}
   setNotice('Table #'+target.id+' closed successfully.');
  }catch(e){setError(e?.response?.data?.detail||e?.message||"Unable to close this table.");}
  finally{setBusy(false);}
 }
 function openRoom(r){setRoom(r);setJoinBuyin(String((r.minimum_buy_in_cents??r.virtual_buy_in_cents)/100));setParams({group:groupId,room:String(r.id)});setNotice("");}
 function backToRooms(){setRoom(null);setParams({group:groupId});setNotice("");}
 async function shareLiveRoom(){
  if(!room||busy)return;
  setBusy(true);setError("");
  const roomPath="/customer/games/join?group="+encodeURIComponent(groupId)+"&room="+encodeURIComponent(room.id);
  let url=window.location.origin+roomPath;
  let description="Use this link to join my existing poker table with your own virtual buy-in.";
  try {
    if(isHost){
      // An invitation token is necessary for users who have not joined this club.
      // Approval may be required; the next parameter preserves the exact room.
      const invitation=await createGroupInviteLink(Number(groupId),"MEMBER");
      const raw=invitation?.invite_url||invitation?.url||invitation?.link||(invitation?.token?window.location.origin+"/social/invite/"+invitation.token:"");
      if(raw){
        const link=new URL(raw,window.location.origin);
        link.searchParams.set("mode","club");
        link.searchParams.set("next",roomPath);
        url=link.href;
        description="Join this Card Club first, then open our poker room. Approval may be required before taking a seat.";
      }
    }
    if(navigator.share)await navigator.share({title:room.name+" · SyncWorks Poker",text:description,url});
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setNotice("Room invitation copied. Club approval and a shared-room server are needed for remote seating.");}
    else setNotice("Invite URL: "+url);
  }catch(err){if(err?.name!=="AbortError")setError(err?.response?.data?.detail||err?.message||"Unable to share this room.");}
  finally{setBusy(false);}
 }
 function configure(){const a=money(ante),c=money(cap);if(!Number.isSafeInteger(a)||a<0||!Number.isSafeInteger(c)||c<=0&&game!=="fyb"){setError("Check ante and pot max.");return;}mutate("configure",{game_selection:mode,game_code:game,ante_cents:a,pot_cap_cents:game==="fyb"?0:c});}
 if(!groupId)return <main className="min-h-dvh bg-[#020817] p-6 text-white">Choose a group first. <button className="underline" onClick={()=>nav("/customer/games")}>Leagues</button></main>;
 return <main className="min-h-dvh bg-[#020817] px-3 pb-24 pt-[max(1rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-4xl">
 <header className="mb-4 flex items-center justify-between"><div className="flex gap-2"><button onClick={()=>nav("/customer/games")} className="flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 text-xs font-black">♠ Lounge</button><button onClick={()=>room?backToRooms():nav("/customer/games/clubs?group="+groupId)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs"><ArrowLeft size={16}/> {room?"Rooms":"Club"}</button></div><div className="text-right"><div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">SYNCWORKS CARD CLUB</div><h1 className="text-xl font-black">{group?.name||"Poker Lobby"}</h1></div></header>
 <div className="mb-3"><CardClubTableSwitcher groupId={groupId} currentRoomId={room?.id} userId={user?.id} navigate={nav}/></div>
 {pausedPractice.length>0&&<div className="mb-3 rounded-xl border border-emerald-300/35 bg-emerald-500/10 p-3"><strong className="block text-xs text-emerald-200">Saved practice games</strong><div className="mt-2 grid gap-2 sm:grid-cols-2">{pausedPractice.map(saved=><button type="button" key={saved.variant} className="flex min-h-12 items-center justify-between gap-2 rounded-lg bg-emerald-300 px-3 text-left font-black text-slate-950" onClick={()=>nav(saved.path)}><span className="min-w-0 truncate">▶ Continue {({357:"3-5-7",fyb:"FYB",bozo:"Bozo",442:"4/4/Deuce","queen-follower":"Queen & Follower"})[saved.variant]||saved.variant}</span><ArrowRight size={17}/></button>)}</div><p className="mt-2 text-[11px] text-emerald-100/75">Resume saved cards, pot and chip totals on this device.</p></div>}
 <p className="mb-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-[11px] leading-5 text-cyan-100"><b>Shared poker room:</b> Other approved club members can join these seats from their own phones. Hands and virtual pot gameplay currently run as an individual-device preview, not a shared hand.</p>
 {serverUnavailable&&<div className="mb-4 rounded-xl border border-amber-300/35 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100"><b>Shared rooms not available on the server yet.</b> The new table screen is deployed as a preview while the Django room migration is verified. <button type="button" onClick={()=>nav("/customer/games/new?group="+groupId)} className="mt-3 block min-h-11 w-full rounded-xl bg-amber-300 px-3 font-black text-slate-950">Create a room in the new poker table</button></div>}
 {error&&<div role="alert" className="mb-3 rounded-xl border border-rose-400/30 p-3 text-xs text-rose-200">{error}</div>}
 {notice&&<div role="status" className="mb-3 rounded-xl border border-cyan-400/25 p-3 text-xs text-cyan-100">{notice}</div>}
 {!room?<div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-cyan-300/20 bg-white/[.035] p-4"><h2 className="mb-2 text-lg font-black"><Club className="mr-2 inline text-cyan-200"/> Open rooms</h2><p className="mb-3 text-xs text-slate-400">Choose a table from your own league.</p>{loading?<p className="text-xs">Loading…</p>:<div className="max-h-80 space-y-2 overflow-auto">{rooms.map(r=><div key={r.id} className="flex min-h-16 items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-2"><button type="button" onClick={()=>openRoom(r)} className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg p-2 text-left"><div className="min-w-0"><div className="truncate text-sm font-black">{r.name} <span className="text-[10px] font-normal text-slate-400">#{r.id}</span></div><div className="text-xs text-slate-400">{r.seats.length}/{r.capacity} seats · {r.state} · {r.admission_open===false?"Closed to joins":"Open to joins"}</div></div><ArrowRight size={18} className="shrink-0 text-cyan-200"/></button>{String(r.created_by)===String(user?.id)&&<button type="button" aria-label={"Close table "+r.name+" number "+r.id} title={r.hand_active?"Finish active hand before closing":"Close this table"} disabled={busy||r.hand_active} onClick={()=>closeRoomFromList(r)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-rose-300/30 bg-rose-500/10 text-rose-200 disabled:opacity-35"><X size={18}/></button>}</div>)}{!rooms.length&&<p className="p-4 text-xs text-slate-400">No open tables yet. Create the first one.</p>}</div>}</section><form onSubmit={create} className="space-y-3 rounded-2xl border border-violet-400/25 bg-white/[.035] p-4"><h2 className="text-lg font-black">Create a poker room</h2><label className="block text-xs text-slate-300">Room name<input value={newName} onChange={e=>setNewName(e.target.value)} required maxLength={80} className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white"/></label><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Seats<select value={capacity} onChange={e=>setCapacity(Number(e.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white">{[4,5,6].map(n=><option key={n} value={n}>{n} seats</option>)}</select></label><label className="text-xs text-slate-300">Buy-in ($)<input type="number" min="0" step="1" value={buyIn} onChange={e=>setBuyIn(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white"/></label></div><p className="text-xs text-slate-400">Each player gets their own starting virtual chip stack when they join. No money is charged.</p><button disabled={busy||serverUnavailable} className="min-h-12 w-full rounded-xl bg-violet-400 font-black text-black disabled:opacity-40">Create live lobby</button></form></div>:<>
 <section className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[.035] p-3"><div><div className="text-[10px] uppercase tracking-widest text-cyan-300">ROOM #{room.id}</div><h2 className="text-xl font-black">{room.name}</h2><p className="text-xs text-slate-400">{room.seats.length}/{room.capacity} seats · {statusText[room.state]||room.state} · {isPracticeRoom?"Practice (AI)":"Human-only"}</p></div><div className="text-right"><div className="text-xs text-slate-400">Starting virtual purse</div><div className="text-xl font-black text-emerald-300">{dollars(room.seats.length*room.virtual_buy_in_cents)}</div></div></section>
 <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs text-slate-400">Minimum virtual buy-in: <b className="text-emerald-200">{dollars(room.minimum_buy_in_cents??room.virtual_buy_in_cents)}</b></span><button type="button" onClick={shareLiveRoom} className="flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-xs font-black text-cyan-200"><Share2 size={16}/> Share Room</button></div>
 <PokerTable room={room} spinner={spinning} busy={busy} canJoin={!mySeat&&room.admission_open!==false&&seatsCanChange&&room.seats.length<room.capacity} onJoin={()=>{const node=document.getElementById("sw-live-join-controls");node?.scrollIntoView({behavior:"smooth",block:"center"});}} canInvite={isHost&&room.admission_open!==false&&seatsCanChange&&room.seats.length<room.capacity} onInvite={shareLiveRoom}/>
 <section className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-cyan-400/25 bg-[#081a2f] p-3">
  {isHost&&room.state==="WAITING"?<button type="button" disabled={busy||room.seats.length>=room.capacity} onClick={()=>mutate("add-computer")} className="min-h-12 rounded-xl bg-violet-500/25 font-bold text-violet-100 disabled:opacity-40">🤖 Add Virtual Player ({virtualCount}/{maxVirtual})</button>:<button type="button" onClick={shareLiveRoom} className="min-h-12 rounded-xl border border-cyan-400/30 font-bold text-cyan-100"><Share2 size={16} className="mr-1 inline"/> Invite Players</button>}
  {isPracticeRoom?<div className="flex flex-col gap-2">{pausedPractice.length>0&&<button type="button" onClick={()=>nav(pausedPractice[0].path)} className="min-h-12 rounded-xl border border-emerald-200/60 bg-emerald-300 px-3 font-black text-slate-950">▶ Continue saved game</button>}<button type="button" disabled={room.seats.length<2} onClick={()=>nav("/customer/games/table?group="+encodeURIComponent(groupId))} className="min-h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-2 font-black text-slate-950 disabled:opacity-40">{pausedPractice.length?"♠ Return to practice":"♠ Start practice game"}</button>{!pausedPractice.length&&<p className="text-center text-[10px] text-slate-400">Progress saves automatically for your next visit.</p>}</div>:<button type="button" disabled={!online357Ready||!mySeat} onClick={()=>nav("/customer/games/online?group="+encodeURIComponent(groupId)+"&room="+encodeURIComponent(room.id))} className="min-h-12 rounded-xl border border-cyan-300 bg-gradient-to-r from-cyan-400 to-violet-500 px-2 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-45">{online357Ready?"♠ Enter Live 3-5-7":room?.state==="WAITING"?"Waiting for host to select dealer":room?.state==="DEALER"?"Dealer selecting game":"Live 3-5-7 only for this beta"}</button>}
  <p className="col-span-2 text-[11px] leading-4 text-slate-400">{isPracticeRoom?"AI present: this table is practice. Practice stats never count toward human-only game standings.":"Human-only table: eligible for real-play standings when secure online hands are implemented."} 3-5-7 now has a server-controlled multiplayer game when the host selects it. Other game variants remain local practice until their online engines are validated.</p>
 </section>
 <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="flex items-center gap-2 text-lg font-black"><Users size={18} className="text-cyan-300"/> {room.state==="WAITING"?"Waiting room":room.state==="DEALER"?"Dealer's choice":"Game ready"}</h2>
 {seatsCanChange&&<div className="mt-3 space-y-3"><p className="text-xs text-slate-400">A player has accepted a table seat only when their signed-in account appears below. Approved club membership alone does not reserve a table seat.</p>{mySeat?<div className="flex items-center justify-between rounded-xl border border-emerald-400/25 p-3 text-xs"><span>You are seated: <b>{mySeat.name}</b></span><button disabled={busy} onClick={()=>mutate("leave")} className="rounded-lg border border-white/20 px-3 py-2">Leave seat</button></div>:<div id="sw-live-join-controls" className="space-y-2 rounded-xl border border-white/10 p-3"><label className="block text-xs text-slate-300">Your virtual chip buy-in ($) · minimum {dollars(room.minimum_buy_in_cents??room.virtual_buy_in_cents)}<input type="number" min={(room.minimum_buy_in_cents??room.virtual_buy_in_cents)/100} max="10000" step="0.01" value={joinBuyin} onChange={e=>setJoinBuyin(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-white"/></label><button disabled={busy||room.admission_open===false||room.seats.length>=room.capacity||!Number.isSafeInteger(money(joinBuyin))||money(joinBuyin)<(room.minimum_buy_in_cents??room.virtual_buy_in_cents)} onClick={()=>mutate("join",{virtual_buy_in_cents:money(joinBuyin)})} className="min-h-12 w-full rounded-xl bg-cyan-400 font-black text-black disabled:opacity-40"><UserPlus size={17} className="mr-1 inline"/> {room.admission_open===false?"Table closed to new players":"Join with "+dollars(money(joinBuyin))+" virtual chips"}</button><p className="text-[11px] text-amber-100">Virtual chips only. No money is charged or held in SyncWorks.</p></div>}
  {mySeat&&<div><button onClick={()=>{setShowName(v=>!v);setNickname(mySeat.nickname||"");}} className="text-xs font-bold text-cyan-200">Edit my table name</button>{showName&&<form onSubmit={e=>{e.preventDefault();mutate("nickname",{nickname});setShowName(false);}} className="mt-2 flex gap-2"><input maxLength={32} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Display name" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 p-3 text-xs"/><button className="rounded-xl bg-cyan-400 px-3 text-xs font-black text-black">Save</button></form>}</div>}
  {isHost&&room.state==="WAITING"&&<button disabled={busy||room.seats.length<2} onClick={()=>mutate("start")} className="min-h-11 w-full rounded-xl bg-amber-400 text-xs font-black text-black disabled:opacity-40">Spin for dealer</button>}
 </div>}
 {room.state==="DEALER"&&<div className="mt-3 space-y-3"><p className="text-sm text-amber-200"><Crown size={16} className="mr-1 inline"/> Dealer: <b>{dealerSeat?.name||"Selecting..."}</b></p>{canConfigure?<><label className="block text-xs text-slate-300">Game selection<select value={mode} onChange={e=>setMode(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"><option value="DEALER">Dealer chooses game</option><option value="RANDOM">Random game</option></select></label>{mode==="DEALER"&&<label className="block text-xs text-slate-300">Choose game<select value={game} onChange={e=>setGame(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white">{GAMES.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>}<div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Ante ($)<input type="number" min="0" step="0.25" value={ante} onChange={e=>setAnte(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"/></label><label className="text-xs text-slate-300">Pot cap ($){game==="fyb"?" N/A":""}<input type="number" disabled={game==="fyb"} min="0.01" value={cap} onChange={e=>setCap(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white disabled:opacity-40"/></label></div><button disabled={busy} onClick={configure} className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-black disabled:opacity-40">Confirm dealer's game</button></>:<p className="text-xs text-slate-400">Waiting for the dealer to choose game and ante.</p>}</div>}
 {room.state==="READY"&&<div className="mt-3 space-y-3"><p className="text-sm">Selected: <b className="text-amber-200">{GAMES.find(g=>g[0]===room.game_code)?.[1]}</b> · Ante {dollars(room.ante_cents)} · Hand {room.hand_number}</p><p className="text-xs leading-5 text-amber-100">Card play is a local interactive preview; private cards, Hold/Fold decisions and pots are not yet synchronized between phones.</p><button onClick={()=>nav((room.game_code==="357"?"/customer/games/table":"/customer/games/"+room.game_code)+"?group="+groupId+(room.game_code==="357"?"&room="+room.id:""))} className="min-h-12 w-full rounded-xl bg-cyan-400 font-black text-black">Open game prototype <ArrowRight size={16} className="ml-1 inline"/></button>{isHost&&<button onClick={()=>mutate("next-dealer")} disabled={busy} className="min-h-11 w-full rounded-xl border border-amber-300/30 text-sm font-bold">Next game · rotate dealer</button>}</div>}
 {isHost&&<div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/20 p-3"><div className="min-w-0 flex-1"><strong className="text-xs">{room.admission_open!==false?"Open table":"Closed table"}</strong><p className="text-[11px] text-slate-400">Controls new joins; current players stay seated. Members may leave between hands.</p></div><button type="button" disabled={busy} onClick={()=>mutate("admission",{open:room.admission_open===false})} className="min-h-11 rounded-lg border border-cyan-300/40 px-3 text-xs font-bold">{room.admission_open!==false?"Close joins":"Open joins"}</button><button type="button" disabled={busy||room.hand_active} onClick={()=>mutate("close")} className="min-h-11 rounded-lg border border-rose-300/40 px-3 text-xs text-rose-200">End table</button></div>}
 </section>
 </>}
 </div></main>;
}

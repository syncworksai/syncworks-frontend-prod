import React,{useEffect,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ArrowLeft,Plus,Spade,Users} from "lucide-react";
import {createGroup,getGroups} from "../api/social";
import {createCardRoom,listCardRooms} from "../api/cardRooms";
import {useAuth} from "../auth/AuthContext";

const cents=v=>Math.round(Number(v)*100);
const roomKey=id=>"syncworks-local-poker-room-v1-"+id;
function groupOptions(groups){return groups.filter(g=>String(g.kind||"").toUpperCase()==="CLUB");}
export default function CustomerNewPokerGame(){
 const nav=useNavigate(),[params]=useSearchParams();
 const {user}=useAuth();
 const [groups,setGroups]=useState([]),[groupId,setGroupId]=useState(params.get("group")||"");
 const [createLeague,setCreateLeague]=useState(false),[leagueName,setLeagueName]=useState("Saturday Card Club");
 const [roomName,setRoomName]=useState("Saturday Poker"),[seats,setSeats]=useState(6),[minimum,setMinimum]=useState("20");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const [serverReady,setServerReady]=useState(false);
 useEffect(()=>{let live=true;getGroups().then(gs=>{if(!live)return;setGroups(gs);const clubs=groupOptions(gs);if(!params.get("group")&&clubs.length===1)setGroupId(String(clubs[0].id));if(clubs.length===0)setCreateLeague(true);}).catch(e=>{if(live)setError(e?.message||"Could not load your leagues");}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
 useEffect(()=>{if(!groupId)return;let live=true;listCardRooms(groupId).then(()=>{if(live)setServerReady(true);}).catch(()=>{if(live)setServerReady(false);});return()=>{live=false;};},[groupId]);
 async function submit(e){
  e.preventDefault();if(busy)return;
  const buyin=cents(minimum);
  if(!Number.isSafeInteger(buyin)||buyin<0||buyin>1000000){setError("Enter a valid virtual minimum buy-in up to $10,000.");return;}
  setBusy(true);setError("");
  try{
   let id=groupId;
   if(createLeague){
    if(!leagueName.trim())throw Error("Enter a league name.");
    const group=await createGroup({name:leagueName.trim(),category:"HOBBIES",kind:"CLUB",visibility:"PRIVATE",city:"",state:""});
    id=String(group.id);setGroupId(id);
   }
   if(!id)throw Error("Select a league or create one first.");
   try{
    const liveRoom=await createCardRoom({group:Number(id),name:roomName.trim()||"Poker Table",capacity:Number(seats),virtual_buy_in_cents:buyin});
    nav("/customer/games/clubs/room?group="+encodeURIComponent(id)+"&room="+liveRoom.id,{replace:true});
   }catch(err){
    if(err?.response?.status!==404)throw err;
    // Until the Django room API is deployed, keep a local, clearly labeled preview.
    const room={id:"local-"+Date.now(),name:roomName.trim()||"Poker Table",capacity:Number(seats),buyInCents:buyin,seats:[{id:String(user?.id||"host"),name:[user?.first_name,user?.last_name].filter(Boolean).join(" ")||user?.display_name||user?.email||"Host",kind:"host",virtual_chips_cents:buyin}],createdAt:new Date().toISOString(),localOnly:true};
    localStorage.setItem(roomKey(id),JSON.stringify(room));
    nav("/customer/games/table?group="+encodeURIComponent(id)+"&preview=1",{replace:true});
   }
  }catch(err){setError(err?.response?.data?.detail||err.message||"Could not create this room");}finally{setBusy(false);}
 }
 return <main className="min-h-dvh bg-[#020817] px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-xl">
  <header className="mb-5 flex items-center justify-between"><button type="button" onClick={()=>nav("/customer")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-xs"><ArrowLeft size={17}/> Dashboard</button><div className="text-right"><div className="text-[10px] font-black tracking-widest text-cyan-300">SYNCWORKS POKER</div><h1 className="text-2xl font-black">New Game</h1></div></header>
  <section className="mb-4 rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-[#132742] to-[#081322] p-5"><Spade className="mb-2 text-cyan-300" size={28}/><h2 className="text-xl font-black">Create a room. Invite your players. Play.</h2><p className="mt-2 text-xs leading-5 text-slate-300">Choose your league and the table minimum. Everyone can have their own virtual chip buy-in, starting at your minimum.</p></section>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
  <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[.035] p-4">
   <div><label className="text-xs font-bold text-slate-300">League / group</label>
    {!createLeague?<select disabled={loading} value={groupId} onChange={e=>setGroupId(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm"><option value="">Select a card club</option>{groupOptions(groups).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>:<input required value={leagueName} onChange={e=>setLeagueName(e.target.value)} placeholder="League name" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm"/>}
    <button type="button" onClick={()=>setCreateLeague(v=>!v)} className="mt-2 text-xs font-bold text-violet-200">{createLeague?"Use existing league":"＋ Create a new league"}</button>
   </div>
   <label className="block text-xs font-bold text-slate-300">Room name<input required maxLength={60} value={roomName} onChange={e=>setRoomName(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm"/></label>
   <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-300">Player seats<select value={seats} onChange={e=>setSeats(Number(e.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm">{[4,5,6].map(n=><option key={n} value={n}>{n} seats</option>)}</select></label><label className="text-xs font-bold text-slate-300">Min buy-in ($)<input required value={minimum} type="number" min="0" max="10000" step="0.01" onChange={e=>setMinimum(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm"/></label></div>
   <p className="text-xs leading-5 text-slate-400">{serverReady?"Live room service detected. Approved club members will be able to join from their own account.":"The room service is not deployed yet. Creating a room opens an on-device table preview, not a room other phones can join."} SyncWorks does not hold or transfer real money.</p>
   <button disabled={busy||loading||(!createLeague&&!groupId)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 font-black text-slate-950 disabled:opacity-40"><Plus size={19}/>{busy?"Creating…":"Create Room & Enter Table"}</button>
  </form>
  <button type="button" onClick={()=>nav("/customer/games")} className="mt-5 w-full py-3 text-xs text-slate-400">View leagues and leaderboards instead</button>
 </div></main>;
}

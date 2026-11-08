import React,{useEffect,useMemo,useState} from "react";
import {ArrowLeft,ArrowRight,Check,Copy,Plus,RefreshCcw,Trophy,Users,WalletCards} from "lucide-react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {createGroup,createGroupInviteLink,getGroupMembers,getGroups,getMemberships} from "../api/social";

const GAMES=[["357","3-5-7 DROP"],["fyb","FYB"],["queen-follower","Queen & the Follower"],["442","4/4/Deuce"]];
const cents=v=>Math.round(Number(v)*100);
const fmt=v=>(Math.abs(v)/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
const key=id=>`syncworks-games-club-ledger-local-v2-${id}`;
const empty=()=>({games:[],entries:[]});
const freshId=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random();
function readLocal(id){try{const v=JSON.parse(localStorage.getItem(key(id))||"null");return v&&Array.isArray(v.games)&&Array.isArray(v.entries)?v:empty();}catch{return empty();}}
function memberName(m){return m.display_name||m.user_name||m.username||m.name||m.user_display_name||m.user_email||m.email||`Member ${m.user||m.id||""}`;}
export default function CustomerCardClubHub(){
 const nav=useNavigate(),[params,setParams]=useSearchParams();
 const [groups,setGroups]=useState([]),[memberships,setMemberships]=useState([]),[members,setMembers]=useState([]),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [clubName,setClubName]=useState("Saturday Card Club"),[searchName,setSearchName]=useState("");
 const [selected,setSelected]=useState(params.get("group")||"");
 const [local,setLocal]=useState(empty),[customPlayers,setCustomPlayers]=useState([]);
 const [newPlayer,setNewPlayer]=useState("");
 const [tab,setTab]=useState("overview"),[game,setGame]=useState("357"),[winner,setWinner]=useState("");
 const [participants,setParticipants]=useState([]),[buyIn,setBuyIn]=useState("10"),[payout,setPayout]=useState("0");
 const [settlePayer,setSettlePayer]=useState(""),[settleReceiver,setSettleReceiver]=useState(""),[settleAmount,setSettleAmount]=useState("10");
 const [invite,setInvite]=useState("");
 const selectedGroup=groups.find(g=>String(g.id)===String(selected));
 const candidate=groups.filter(g=>["CLUB","COMMUNITY","OTHER"].includes(String(g.kind||"").toUpperCase())||["FRIENDS","HOBBIES"].includes(String(g.category||"").toUpperCase()));
 const playerNames=useMemo(()=>{
   const known=members.map(memberName).filter(Boolean);
   return [...new Set([...known,...customPlayers])];
 },[members,customPlayers]);
 const stats=useMemo(()=>{
   const totals=Object.fromEntries(playerNames.map(n=>[n,{name:n,played:0,wins:0,moneyIn:0,moneyOut:0,settledIn:0,settledOut:0}]));
   for(const g of local.games){
     for(const p of g.players||[]){if(totals[p]){totals[p].played++;totals[p].moneyIn+=g.buyInCents;}}
     if(totals[g.winner]){totals[g.winner].wins++;totals[g.winner].moneyOut+=g.payoutCents;}
   }
   for(const e of local.entries){if(e.kind!=="settlement")continue;
     if(totals[e.payer])totals[e.payer].settledOut+=e.cents;
     if(totals[e.receiver])totals[e.receiver].settledIn+=e.cents;
   }
   return Object.values(totals).map(r=>({...r,net:r.moneyOut-r.moneyIn,open:r.moneyOut-r.moneyIn+r.settledOut-r.settledIn})).sort((a,b)=>b.net-a.net);
 },[local,playerNames]);
 const totalGames=local.games.length;
 const outstanding=stats.reduce((v,p)=>v+Math.max(p.open,0),0);
 const overallIn=stats.reduce((v,p)=>v+p.moneyIn,0);
 const overallOut=stats.reduce((v,p)=>v+p.moneyOut,0);
 useEffect(()=>{let ok=true;Promise.all([getGroups(),getMemberships()]).then(([gs,ms])=>{if(ok){setGroups(gs);setMemberships(ms);}}).catch(e=>{if(ok)setError(e.message||"Unable to load groups");}).finally(()=>{if(ok)setLoading(false);});return()=>{ok=false;};},[]);
 useEffect(()=>{if(!selected)return;setLocal(readLocal(selected));try{const arr=JSON.parse(localStorage.getItem(key(selected)+"-players")||"[]");setCustomPlayers(Array.isArray(arr)?arr:[]);}catch{setCustomPlayers([]);}
 let valid=true;getGroupMembers(selected).then(rows=>{if(valid)setMembers(rows);}).catch(e=>{if(valid){setMembers([]);setError(e.message||"Unable to load members");}});return()=>{valid=false;};},[selected]);
 function persistLocal(mutator){
   setLocal(old=>{const updated=mutator(old);try{localStorage.setItem(key(selected),JSON.stringify(updated));}catch{setError("Browser storage is unavailable; ledger preview may not persist.");}return updated;});
 }
 useEffect(()=>{if(!selected)return;try{localStorage.setItem(key(selected)+"-players",JSON.stringify(customPlayers));}catch{}},[selected,customPlayers]);
 function chooseGroup(id){setSelected(String(id));setParams({group:String(id)});setInvite("");setTab("overview");setMembers([]);}
 async function makeGroup(e){e.preventDefault();if(!clubName.trim())return;setBusy(true);setError("");try{
   const g=await createGroup({name:clubName.trim(),category:"HOBBIES",kind:"CLUB",visibility:"PRIVATE",city:"",state:""});
   const gs=await getGroups();setGroups(gs);chooseGroup(g.id);setNotice("Private Social Club created. Invite members from its SyncWorks group dashboard.");
 }catch(e){setError(e.response?.data?.detail||e.message||"Could not create group");}finally{setBusy(false);}}
 async function makeInvite(){setBusy(true);setError("");try{
 const res=await createGroupInviteLink(Number(selected),"MEMBER");
 const url=res?.invite_url||res?.url||res?.link||(res?.token?`${window.location.origin}/social/invite/${res.token}`:"");
 if(!url)throw Error("Invite created but its URL was not returned. Open Social Group to review invitations.");
 setInvite(url);setNotice("Invite link generated by SyncWorks Social Groups.");
 }catch(e){setError(e.response?.data?.detail||e.message||"Invite unavailable");}finally{setBusy(false);}}
 function addLocalPlayer(e){e.preventDefault();const n=newPlayer.trim().slice(0,40);if(!n||playerNames.some(p=>p.toLowerCase()===n.toLowerCase()))return;setCustomPlayers(v=>[...v,n]);setNewPlayer("");setNotice("Local placeholder added. Invite this person to the Social Group for account-linked membership.");}
 function recordGame(e){e.preventDefault();
 const amount=cents(buyIn),prize=cents(payout);
 if(!participants.length||!participants.includes(winner)||!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(prize)||prize<0){setError("Choose participants and a winner, and enter valid amounts.");return;}
 const item={id:freshId(),time:new Date().toISOString(),game,winner,players:[...participants],buyInCents:amount,payoutCents:prize};
 persistLocal(v=>({...v,games:[...v.games,item]}));setNotice("Game recorded in this device's preview. Other members cannot see it.");setError("");
 }
 function recordSettlement(e){e.preventDefault();const amount=cents(settleAmount);
 if(!settlePayer||!settleReceiver||settlePayer===settleReceiver||!Number.isSafeInteger(amount)||amount<=0){setError("Select different payer and receiver, and a valid amount.");return;}
 persistLocal(v=>({...v,entries:[...v.entries,{id:freshId(),kind:"settlement",time:new Date().toISOString(),payer:settlePayer,receiver:settleReceiver,cents:amount,method:"outside SyncWorks",status:"recorded"}]}));
 setNotice("Off-app settlement recorded locally. This is a manual statement, not proof of payment.");setError("");
 }
 function addPlayerToGame(n){setParticipants(a=>a.includes(n)?a.filter(x=>x!==n):[...a,n]);}
 const appearance="rounded-xl border border-white/15 bg-slate-900 p-3 text-sm text-white";
 return <main className="min-h-dvh bg-[#020817] px-4 pb-20 pt-[max(1.5rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-5xl">
  <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={()=>nav("/customer/games")} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"><ArrowLeft size={17}/> Games</button><div className="text-right"><div className="text-xs font-black uppercase tracking-widest text-violet-300">SYNCWORKS · SOCIAL</div><h1 className="text-2xl font-black">Card Clubs</h1></div></header>
  <div role="note" className="mb-4 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100"><strong>Preview accounting only.</strong> Group creation, existing members, and invite links use SyncWorks Social Groups. Game results, money totals, settlement flags, and any manually added players stay in this browser only—not shared with members. No real money, wallets, collection, or transfers are processed. Do not rely on this as a final debt or settlement record.</div>
  {error&&<div role="alert" className="mb-3 rounded-xl border border-rose-400/20 p-3 text-sm text-rose-200">{error}</div>}
  {notice&&<div role="status" className="mb-3 rounded-xl border border-cyan-400/20 p-3 text-sm text-cyan-100">{notice}</div>}
  {!selectedGroup?<div className="grid gap-4 md:grid-cols-2">
   <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Plus size={20}/> Create a card club</h2><p className="mb-4 text-xs leading-5 text-slate-400">Creates a real private Social Group with kind CLUB. You can invite registered SyncWorks users afterward.</p><form onSubmit={makeGroup} className="space-y-3"><label className="block text-xs text-slate-400">Group name<input required maxLength={80} value={clubName} onChange={e=>setClubName(e.target.value)} className={`mt-1 w-full ${appearance}`}/></label><button disabled={busy} className="min-h-12 w-full rounded-xl bg-violet-400 font-black text-black disabled:opacity-50">Create private group</button></form></section>
   <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Users size={20}/> Choose existing group</h2><input placeholder="Filter your groups" value={searchName} onChange={e=>setSearchName(e.target.value)} className={`mb-3 w-full ${appearance}`}/>{loading?<p className="text-xs text-slate-400">Loading your groups…</p>:<div className="max-h-72 space-y-2 overflow-y-auto">{candidate.filter(g=>g.name.toLowerCase().includes(searchName.toLowerCase())).map(g=><button type="button" key={g.id} onClick={()=>chooseGroup(g.id)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-white/10 p-3 text-left text-sm font-semibold">{g.name}<ArrowRight size={16}/></button>)}{candidate.length===0&&<p className="text-xs text-slate-400">No groups yet. Create one to begin.</p>}</div>}</section>
  </div>:<>
   <section className="mb-4 rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Card club · linked Social Group</div><h2 className="mt-1 text-2xl font-black">{selectedGroup.name}</h2><p className="mt-1 text-xs text-slate-400">{members.length} loaded members · {customPlayers.length} local placeholders</p></div><button type="button" onClick={()=>{setSelected("");setParams({});setNotice("");setError("");}} className="min-h-10 rounded-xl border border-white/20 px-3 text-xs">Switch group</button></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>nav(`/connect/groups/${selectedGroup.id}`)} className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold">Open Social Group</button><button type="button" disabled={busy} onClick={makeInvite} className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold">Generate member invite</button>{invite&&<button type="button" onClick={()=>navigator.clipboard?.writeText(invite)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 px-3 py-2 text-xs"><Copy size={14}/> Copy invite</button>}</div>{invite&&<p className="mt-2 break-all text-xs text-slate-300">{invite}</p>}</section>
   <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">{[["Games played",String(totalGames)],["Recorded money in",fmt(overallIn)],["Recorded winnings",fmt(overallOut)],["Unsettled credits",fmt(outstanding)]].map(([title,value])=><div key={title} className="rounded-xl border border-white/10 bg-white/[.04] p-3"><div className="text-[10px] text-slate-400">{title}</div><div className="mt-1 text-lg font-black">{value}</div></div>)}</div>
   <div className="mb-4 flex gap-2 overflow-x-auto">{[["overview","Overview"],["new","Record game"],["settle","Mark paid outside"],["players","Players"]].map(([id,name])=><button type="button" key={id} onClick={()=>{setTab(id);setError("");}} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${tab===id?"bg-white text-slate-950":"border border-white/15 text-slate-300"}`}>{name}</button>)}</div>
   {tab==="overview"&&<div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
    <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="mb-2 flex items-center gap-2 font-black"><Trophy size={19} className="text-amber-300"/> All-time leaderboard</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-white/10 text-slate-400"><th className="py-2">Player</th><th>Games</th><th>Wins</th><th>In</th><th>Won</th><th>Net</th></tr></thead><tbody>{stats.map(p=><tr key={p.name} className="border-b border-white/5"><td className="py-3 font-bold">{p.name}</td><td>{p.played}</td><td>{p.wins}</td><td>{fmt(p.moneyIn)}</td><td>{fmt(p.moneyOut)}</td><td className={p.net>=0?"text-emerald-200":"text-rose-200"}>{p.net<0?"−":"+"}{fmt(p.net)}</td></tr>)}</tbody></table></div><p className="mt-3 text-[11px] text-slate-400">Net = recorded winnings minus recorded contributions. Off-app settlements change outstanding balances, not historical wins.</p></section>
    <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="mb-3 font-black">Outstanding balances (preview)</h3><div className="space-y-2">{stats.map(p=><div key={p.name} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 p-2 text-xs"><span>{p.name}</span><span className={p.open>=0?"text-emerald-200":"text-rose-200"}>{p.open<0?"Owes ":"Credit "}{fmt(p.open)}</span></div>)}</div><h3 className="mt-5 mb-2 font-black">Recent games</h3>{[...local.games].reverse().slice(0,8).map(g=><div key={g.id} className="border-b border-white/10 py-2 text-xs"><b>{GAMES.find(x=>x[0]===g.game)?.[1]}</b> · {g.winner} won {fmt(g.payoutCents)}<div className="text-slate-500">{new Date(g.time).toLocaleString()} · {g.players.length} players</div></div>)}{!local.games.length&&<p className="text-xs text-slate-400">No games recorded yet.</p>}</section>
   </div>}
   {tab==="new"&&<form onSubmit={recordGame} className="max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="font-black">Record a finished game</h3><label className="block text-xs text-slate-400">Game<select value={game} onChange={e=>setGame(e.target.value)} className={`mt-1 w-full ${appearance}`}>{GAMES.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label><div className="text-xs font-bold text-slate-300">Select participants</div><div className="grid grid-cols-2 gap-2">{playerNames.map(n=><label key={n} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-xs"><input type="checkbox" checked={participants.includes(n)} onChange={()=>addPlayerToGame(n)}/>{n}</label>)}</div><label className="block text-xs text-slate-400">Winner<select value={winner} onChange={e=>setWinner(e.target.value)} className={`mt-1 w-full ${appearance}`}><option value="">Choose winner</option>{participants.map(n=><option key={n}>{n}</option>)}</select></label><label className="block text-xs text-slate-400">Each participant contributed ($)<input type="number" min="0" step="0.01" value={buyIn} onChange={e=>setBuyIn(e.target.value)} className={`mt-1 w-full ${appearance}`}/></label><label className="block text-xs text-slate-400">Winner awarded ($)<input type="number" min="0" step="0.01" value={payout} onChange={e=>setPayout(e.target.value)} className={`mt-1 w-full ${appearance}`}/></label><p className="text-[11px] text-amber-200">Manual game entry only. Contributions and award can differ; the prototype does not enforce a balanced pot or verify results. Do not use for final settlement.</p><button className="min-h-12 w-full rounded-xl bg-cyan-400 font-black text-black">Save local game record</button></form>}
   {tab==="settle"&&<form onSubmit={recordSettlement} className="max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="font-black">Record paid outside SyncWorks</h3><p className="text-xs leading-5 text-slate-400">After friends actually settle externally, log the payer, receiver, and amount. This never transfers funds and doesn't independently verify payment.</p><label className="block text-xs text-slate-400">Paid by<select value={settlePayer} onChange={e=>setSettlePayer(e.target.value)} className={`mt-1 w-full ${appearance}`}><option value="">Choose payer</option>{playerNames.map(p=><option key={p}>{p}</option>)}</select></label><label className="block text-xs text-slate-400">Received by<select value={settleReceiver} onChange={e=>setSettleReceiver(e.target.value)} className={`mt-1 w-full ${appearance}`}><option value="">Choose receiver</option>{playerNames.map(p=><option key={p}>{p}</option>)}</select></label><label className="block text-xs text-slate-400">Amount ($)<input type="number" min="0.01" step="0.01" value={settleAmount} onChange={e=>setSettleAmount(e.target.value)} className={`mt-1 w-full ${appearance}`}/></label><button className="min-h-12 w-full rounded-xl bg-emerald-400 font-black text-black"><Check size={16} className="mr-2 inline"/>Record external payment</button><h4 className="font-black">Settlement log</h4>{[...local.entries].reverse().map(e=><p key={e.id} className="text-xs text-slate-400">{new Date(e.time).toLocaleDateString()} · {e.payer} paid {e.receiver} {fmt(e.cents)} · manually recorded</p>)}{!local.entries.length&&<p className="text-xs text-slate-500">No payments recorded.</p>}</form>}
   {tab==="players"&&<section className="max-w-xl rounded-2xl border border-white/10 bg-white/[.03] p-4"><h3 className="font-black">Group players</h3><p className="mt-1 mb-3 text-xs text-slate-400">Registered members come from the Social Group. Local placeholders are only for designing this dashboard.</p><div className="space-y-2">{playerNames.map(n=><div key={n} className="rounded-xl border border-white/10 p-3 text-sm">{n}</div>)}</div><form onSubmit={addLocalPlayer} className="mt-4 flex gap-2"><input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} placeholder="Local placeholder" className={`min-w-0 flex-1 ${appearance}`}/><button className="rounded-xl bg-violet-400 px-4 text-xs font-bold text-black">Add</button></form><button type="button" className="mt-4 rounded-xl border border-white/20 px-4 py-3 text-xs" onClick={()=>nav(`/connect/groups/${selected}`)}>Manage real group membership</button></section>}
  </>}
 </div></main>;
}

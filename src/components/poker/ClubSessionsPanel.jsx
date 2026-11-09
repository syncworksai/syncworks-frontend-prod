import React,{useEffect,useMemo,useState} from "react";
import {Plus,CheckCircle,AlertTriangle,Copy,Users,Save,Trash2} from "lucide-react";
import {sessionKey,money,parseMoney,createSession,sessionTotals,suggestedHistory,clubSummary,normalizeAlias} from "../../games/cardClubSessions.mjs";
import {virtualStatsKey,practiceLifetime} from "../../games/pokerClubPracticeLedger.mjs";

const draftRow=(player="",buyin="20")=>({player,buyin,rebuy:"0",payout:"0"});
const emptyDraft=()=>({date:new Date().toISOString().slice(0,10),table:"Table 1",notes:"",opening:"0",closing:"0",rows:[draftRow(),draftRow(),draftRow(),draftRow()]});
const initialData=()=>({sessions:[],aliases:{"Zach":"Zack","Ang.":"Angela"}});
const classes="min-w-0 w-full rounded-lg border border-white/15 bg-slate-950 px-2 py-3 text-sm text-white";
export default function ClubSessionsPanel({groupId,playerNames=[]}){
 const [data,setData]=useState(initialData),[draft,setDraft]=useState(emptyDraft),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [aliasName,setAliasName]=useState(""),[aliasTarget,setAliasTarget]=useState("");
 const [filterDate,setFilterDate]=useState(""),[editingId,setEditingId]=useState(null);
 useEffect(()=>{if(!groupId)return;try{const raw=JSON.parse(localStorage.getItem(sessionKey(groupId))||"null");setData(raw&&Array.isArray(raw.sessions)?{...initialData(),...raw}:initialData());}catch{setData(initialData());}setDraft(emptyDraft());setNotice("");setError("");},[groupId]);
 function updateData(next){setData(next);try{localStorage.setItem(sessionKey(groupId),JSON.stringify(next));}catch{setError("Browser storage unavailable: changes may not survive a reload.");}}
 const totals=useMemo(()=>clubSummary(data.sessions,data.aliases),[data]);
 const virtualStats=useMemo(()=>{try{return practiceLifetime(JSON.parse(localStorage.getItem(virtualStatsKey(groupId))||"[]"));}catch{return [];}},[groupId,data]);
 const mismatches=data.sessions.filter(s=>s.rows.length&&(!sessionTotals(s).balanced));
 const importHistory=()=>{
  const existing=new Set(data.sessions.map(s=>s.date+"|"+s.source+"|"+s.table));
  const added=suggestedHistory.filter(s=>!existing.has(s.date+"|"+s.source+"|"+s.table)).map(s=>({...s,id:"historical-"+s.date+"-"+Date.now()+"-"+Math.random().toString(36).slice(2),createdAt:new Date().toISOString(),openingPotCents:0,closingPotCents:0,reviewStatus:"draft"}));
  updateData({...data,sessions:[...data.sessions,...added]});setNotice(added.length+" provisional historical session(s) imported. Please review amounts; nothing marked verified.");setError("");
 };
 function changeRow(i,field,value){setDraft(old=>({...old,rows:old.rows.map((r,j)=>j===i?{...r,[field]:value}:r)}));}
 function save(e){
  e.preventDefault();setError("");setNotice("");
  try{
   const rows=draft.rows.filter(r=>r.player.trim()).map(r=>{
    const buyinCents=parseMoney(r.buyin),rebuyCents=parseMoney(r.rebuy),payoutCents=parseMoney(r.payout);
    if([buyinCents,rebuyCents,payoutCents].some(n=>n===null))throw Error("Use nonnegative dollar amounts with at most two decimals.");
    return {player:normalizeAlias(r.player,data.aliases),buyinCents,rebuyCents,payoutCents};
   });
   const openingPotCents=parseMoney(draft.opening),closingPotCents=parseMoney(draft.closing);
   if(openingPotCents===null||closingPotCents===null)throw Error("Opening and closing pot must be valid amounts.");
   const item=createSession({date:draft.date,table:draft.table,rows,notes:draft.notes,openingPotCents,closingPotCents});
   const summary=sessionTotals(item);
   updateData({...data,sessions:editingId?data.sessions.map(old=>old.id===editingId?{...item,id:editingId}:old):[...data.sessions,item]});
   setEditingId(null);
   setDraft(old=>({...emptyDraft(),date:old.date,table:old.table}));
   setNotice(summary.balanced?"Table session saved and reconciled.":"Table session saved as unreconciled. Review the difference before using as a final record.");
  }catch(err){setError(err.message||"Unable to save session");}
 }
 function editSession(s){
  setDraft({date:s.date,table:s.table,notes:s.notes||"",opening:String((s.openingPotCents||0)/100),closing:String((s.closingPotCents||0)/100),
   rows:s.rows?.length?s.rows.map(r=>({player:r.player,buyin:String((r.buyinCents||0)/100),rebuy:String((r.rebuyCents||0)/100),payout:String((r.payoutCents||0)/100)})): [draftRow("",String((s.defaultBuyinCents||2000)/100))]});
  setEditingId(s.id);
  setNotice("Editing the saved session. Changes are not applied until you press Save.");
  window.scrollTo?.({top:0,behavior:"smooth"});
 }
 function deleteSession(id){if(!window.confirm("Delete this locally recorded session?"))return;updateData({...data,sessions:data.sessions.filter(s=>s.id!==id)});}
 function addAlias(e){e.preventDefault();const alias=aliasName.trim(),target=aliasTarget.trim();if(!alias||!target||alias.toLowerCase()===target.toLowerCase())return;
  updateData({...data,aliases:{...data.aliases,[alias]:target}});setAliasName("");setAliasTarget("");setNotice("Alias added to the display and lifetime summary; historical original names remain recorded.");
 }
 const candidates=[...new Set([...playerNames,...data.sessions.flatMap(s=>s.rows.map(r=>normalizeAlias(r.player,data.aliases)))])].sort();
 return <div className="space-y-4">
  <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/[.06] p-4">
   <h3 className="flex items-center gap-2 text-lg font-black"><Users size={19}/> Club Sessions & Multiple Tables</h3>
   <p className="mt-2 text-xs leading-5 text-slate-300">One club can have any number of named tables on the same night. Up to six seats per online poker table; create additional tables for other club members. Manual table records here remain saved in this browser only.</p>
   <p className="mt-2 text-xs text-amber-200">Scorekeeping preview only. This does not transfer, collect, or verify money, and is not yet shared across members' devices.</p>
   <button type="button" onClick={importHistory} className="mt-3 min-h-11 rounded-xl border border-cyan-300/35 px-4 text-xs font-bold text-cyan-100">Import Sept 27, Oct 10 & Nov 7 draft history</button>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-rose-400/40 p-3 text-sm text-rose-200">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-cyan-400/35 p-3 text-xs text-cyan-100">{notice}</p>}
  <div className="grid grid-cols-3 gap-2">{[["Sessions",String(data.sessions.length)],["Needs review",String(mismatches.length)],["Player records",String(totals.length)]].map(([label,val])=><div key={label} className="rounded-xl border border-white/10 bg-white/[.04] p-3"><p className="text-[10px] text-slate-400">{label}</p><b className="text-xl">{val}</b></div>)}</div>
  <form onSubmit={save} className="space-y-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
   <h3 className="font-black">{editingId?"Edit table night":"Record a table night"}</h3>
   <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Date<input className={"mt-1 "+classes} type="date" value={draft.date} onChange={e=>setDraft(d=>({...d,date:e.target.value}))} required/></label><label className="text-xs text-slate-300">Table name<input className={"mt-1 "+classes} maxLength={60} value={draft.table} onChange={e=>setDraft(d=>({...d,table:e.target.value}))} required placeholder="Table 2"/></label></div>
   <div className="grid grid-cols-[1.1fr_.7fr_.7fr_.7fr_auto] gap-1 text-[10px] text-slate-300"><b>Player</b><b>Buy-in</b><b>Rebuy</b><b>Out</b><span></span></div>
   {draft.rows.map((r,i)=><div key={i} className="grid grid-cols-[1.1fr_.7fr_.7fr_.7fr_auto] gap-1 items-center">
    <input list="card-club-player-names" className={classes} aria-label={"Player "+(i+1)} value={r.player} placeholder="Name" onChange={e=>changeRow(i,"player",e.target.value)}/>
    {["buyin","rebuy","payout"].map(k=><input key={k} className={classes} type="number" min="0" step=".01" aria-label={k+" for "+(r.player||"player "+(i+1))} value={r[k]} onChange={e=>changeRow(i,k,e.target.value)}/>)}
    <button type="button" aria-label={"Remove row "+(i+1)} onClick={()=>setDraft(d=>({...d,rows:d.rows.filter((_,j)=>i!==j)}))} className="p-1 text-rose-300"><Trash2 size={16}/></button>
   </div>)}
   <datalist id="card-club-player-names">{candidates.map(n=><option key={n} value={n}/>)}</datalist>
   <button type="button" onClick={()=>setDraft(d=>({...d,rows:[...d.rows,draftRow()] }))} className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs"><Plus size={15}/> Add player</button>
   <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-300">Opening carry-over pot<input className={"mt-1 "+classes} type="number" step=".01" min="0" value={draft.opening} onChange={e=>setDraft(d=>({...d,opening:e.target.value}))}/></label><label className="text-xs text-slate-300">Closing pot not distributed<input className={"mt-1 "+classes} type="number" step=".01" min="0" value={draft.closing} onChange={e=>setDraft(d=>({...d,closing:e.target.value}))}/></label></div>
   <label className="block text-xs text-slate-300">Notes / source<textarea rows={2} className={"mt-1 "+classes} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} placeholder="Text screenshot, corrected names, missing totals…"/></label>
   <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 font-black text-slate-950"><Save size={17}/> Save table session</button>
  </form>
  <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
   <h3 className="font-black">Historical sessions</h3>
   <input type="date" className={"mt-3 "+classes} value={filterDate} onChange={e=>setFilterDate(e.target.value)}/>
   <div className="mt-3 space-y-3">{[...data.sessions].filter(s=>!filterDate||s.date===filterDate).sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{const x=sessionTotals(s);return <article key={s.id} className="rounded-xl border border-white/15 p-3">
    <div className="flex justify-between gap-2"><div><b className="text-sm">{s.date} · {s.table}</b><p className="text-xs text-slate-400">{s.rows.length} players · {s.source||"manual"}</p></div><span className={"shrink-0 text-xs font-bold "+(s.rows.length===0?"text-amber-300":x.balanced?"text-emerald-300":"text-amber-300")}>{s.rows.length===0?"Incomplete":x.balanced?"✓ Balanced":"⚠ Review"}</span></div>
    {s.rows.length>0&&<div className="mt-2 space-y-1">{s.rows.map((r,i)=><div key={i} className="flex justify-between gap-2 text-xs"><span>{r.player}</span><span>In {money((r.buyinCents||0)+(r.rebuyCents||0))} · Out {money(r.payoutCents||0)}</span></div>)}</div>}
    <div className="mt-2 text-xs text-slate-300">Total in {money(x.paidIn)} · Out {money(x.paidOut)} · Difference {money(x.difference)}</div>
    {s.defaultBuyinCents&&<p className="mt-1 text-xs text-amber-200">Confirmed buy-in per player: {money(s.defaultBuyinCents)}. Roster and payouts pending.</p>}
    {s.notes&&<p className="mt-2 text-xs text-slate-400">{s.notes}</p>}
    <div className="mt-3 flex gap-2"><button type="button" onClick={()=>editSession(s)} className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs">Edit</button><button type="button" onClick={()=>deleteSession(s.id)} className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200">Remove</button></div>
   </article>})}{!data.sessions.length&&<p className="text-sm text-slate-400">No sessions saved. Import the historical drafts or record a table above.</p>}</div>
  </section>
  <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
   <h3 className="font-black">Name aliases</h3><p className="mt-1 text-xs text-slate-400">Link spelling differences without overwriting the original text. For example, Zach → Zack and Ang. → Angela.</p>
   <form className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2" onSubmit={addAlias}><input className={classes} placeholder="Text name" value={aliasName} onChange={e=>setAliasName(e.target.value)}/><input className={classes} list="card-club-player-names" placeholder="Club member" value={aliasTarget} onChange={e=>setAliasTarget(e.target.value)}/><button className="rounded-lg border border-white/25 px-3 text-xs">Link</button></form>
   <p className="mt-3 text-xs text-slate-400">{Object.entries(data.aliases).map(([a,b])=>a+" → "+b).join(" · ")||"No aliases"}</p>
  </section>
  <section className="rounded-2xl border border-violet-400/20 bg-violet-500/[.04] p-4"><h3 className="font-black">Virtual Poker Night Results</h3><p className="mt-1 text-xs text-slate-400">End a practice session to save its virtual-chip buy-ins, rebuys and cash-outs here. These stats are separate from manually entered historical dollar records, and stay on this device.</p>{virtualStats.map(p=><div key={p.name} className="flex justify-between gap-2 border-b border-white/10 py-2 text-xs"><div><strong>{p.name}</strong><p className="text-slate-400">{p.nights} sessions · In {money(p.spent)} · Out {money(p.received)}</p></div><strong className={p.net>=0?"text-emerald-300":"text-rose-300"}>{p.net>=0?"+":""}{money(p.net)}</strong></div>)}{!virtualStats.length&&<p className="mt-2 text-xs text-slate-400">No completed virtual sessions recorded yet.</p>}</section>
  <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.04] p-4"><h3 className="font-black">Lifetime session summary</h3><p className="mt-1 text-xs text-slate-400">Across all entered tables, including provisional history. Positive net means received more than contributed. Do not use provisional entries to claim a debt.</p>
   <div className="mt-3 space-y-2">{totals.map(x=><div key={x.player} className="flex items-center justify-between gap-3 border-b border-white/10 py-2 text-xs"><div><b>{x.player}</b><p className="text-slate-400">{x.nights} nights · in {money(x.spent)} · out {money(x.received)}</p></div><b className={x.net>=0?"text-emerald-300":"text-rose-300"}>{x.net>=0?"+":""}{money(x.net)}</b></div>)}{!totals.length&&<p className="text-xs text-slate-400">No entries yet.</p>}</div>
  </section>
 </div>;
}

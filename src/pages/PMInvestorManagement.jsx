import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";
const list=d=>Array.isArray(d?.results)?d.results:Array.isArray(d)?d:[];
const input="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white";
const Field=({label,children})=><label className="block min-w-0"><span className="mb-1 block text-[11px] font-bold text-slate-300">{label}</span>{children}</label>;
export default function PMInvestorManagement(){
 const nav=useNavigate();const [ws,setWs]=useState(null),[props,setProps]=useState([]),[owners,setOwners]=useState([]),[grants,setGrants]=useState([]),[statements,setStatements]=useState([]),[documents,setDocuments]=useState([]),[shares,setShares]=useState([]);
 const [ownerId,setOwnerId]=useState(""),[invite,setInvite]=useState(""),[err,setErr]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [statement,setStatement]=useState({owner_id:"",property_id:"",period:new Date().toISOString().slice(0,7),rent_received:"",management_fees:"",expenses:"",reserve_change:"0",owner_payout:"",status:"DRAFT",payout_date:"",reference:""});
 const [shared,setShared]=useState({owner_id:"",document_id:""});
 const headers=ws?{"X-PM-Workspace-ID":String(ws.id)}:{};
 async function reload(w=ws){
  if(!w)return;const h={"X-PM-Workspace-ID":String(w.id)};
  const calls=["/pm-hub/property-owners/","/pm-hub/properties/","/pm-hub/access/investors/","/pm-hub/access/investors/statements/","/pm-hub/property-documents/","/pm-hub/access/investors/shared-files/"];
  const rs=await Promise.all(calls.map(path=>api.get(path,{headers:h})));
  setOwners(list(rs[0].data));setProps(list(rs[1].data));setGrants(rs[2].data.investors||[]);setStatements(rs[3].data.statements||[]);setDocuments(list(rs[4].data));setShares(rs[5].data.shares||[]);
 }
 useEffect(()=>{let active=true;(async()=>{try{const w=(await api.get("/pm-hub/workspaces/current/")).data;if(active){setWs(w);await reload(w);}}catch(e){if(active)setErr(e?.response?.data?.detail||"Unable to load owners.");}})();return()=>{active=false;};},[]);
 async function inviteOwner(){setErr("");setNotice("");setInvite("");setBusy(true);try{
 const r=await api.post("/pm-hub/access/investors/",{owner_id:ownerId},{headers});setInvite(r.data.invitation_code);await reload();setNotice("Access invitation prepared. Share the code privately with the owner; no email has been sent.");
 }catch(e){setErr(e?.response?.data?.detail||"Unable to create investor invitation.");}finally{setBusy(false);}}
 async function revoke(g){if(!window.confirm("Revoke this investor's property access?"))return;setErr("");try{await api.patch(`/pm-hub/access/investors/${g.id}/`,{status:"REVOKED"},{headers});await reload();setNotice("Investor access revoked.");}catch(e){setErr(e?.response?.data?.detail||"Revoke failed.");}}
 async function saveStatement(e){e.preventDefault();setBusy(true);setErr("");try{
 await api.post("/pm-hub/access/investors/statements/",statement,{headers});await reload();setNotice("Statement saved. Drafts stay private; SHARED and PAID statements appear in the investor portal.");
 }catch(e){setErr(e?.response?.data?.detail||"Statement failed validation.");}finally{setBusy(false);}}
 async function shareDocument(e){e.preventDefault();setBusy(true);setErr("");try{
 await api.post("/pm-hub/access/investors/shared-files/",shared,{headers});await reload();setNotice("Document shared with the selected property owner.");
 }catch(e){setErr(e?.response?.data?.detail||"Document could not be shared.");}finally{setBusy(false);}}
 const currentOwner=owners.find(x=>String(x.id)===String(statement.owner_id));
 const eligible=props.filter(p=>currentOwner?.properties?.includes(p.id));
 const selectedForSharing=owners.find(x=>String(x.id)===String(shared.owner_id));
 const ownedIds=selectedForSharing?.properties||[];
 return <PMShell><main className="mx-auto max-w-6xl space-y-3 px-3 py-3 pb-28 sm:px-5">
 <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-300">Owner relations</div><h1 className="text-xl font-black">Investors & Payouts</h1><p className="mt-1 text-xs text-slate-400">Owner access, statements, shared documents, and communication in one place.</p></div><button onClick={()=>nav("/pm")} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">Dashboard</button></div>
 {err?<p role="alert" className="rounded-lg border border-rose-500/35 bg-rose-500/10 p-3 text-xs">{err}</p>:null}{notice?<p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">{notice}</p>:null}
 <div className="grid grid-cols-3 gap-2">{[["Owner records",owners.length],["Active investors",grants.filter(x=>x.status==="ACCEPTED").length],["Statements",statements.length]].map(([k,v])=><div className="rounded-lg border border-slate-700 bg-[#07111f] p-2.5" key={k}><div className="text-[10px] text-slate-400">{k}</div><div className="mt-1 text-xl font-black">{v}</div></div>)}</div>
 <div className="grid gap-3 lg:grid-cols-2">
  <section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3"><h2 className="text-sm font-black">Connect an owner/investor</h2><p className="mt-1 text-xs text-slate-400">Only owner records explicitly linked to portfolio properties may be invited.</p><div className="mt-3 flex gap-2"><select className={input+" min-w-0 flex-1"} value={ownerId} onChange={e=>setOwnerId(e.target.value)}><option value="">Choose owner</option>{owners.map(o=><option value={o.id} key={o.id}>{o.name} · {o.email||"No email"}</option>)}</select><button type="button" onClick={inviteOwner} disabled={!ownerId||busy} className="min-h-10 rounded-lg bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Invite</button></div>
  {invite?<div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5"><p className="text-xs font-bold text-amber-100">Single-use code for invited owner</p><p className="mt-1 break-all font-mono text-xs">{invite}</p><button type="button" className="mt-2 rounded-lg border border-amber-400/30 px-2 py-1 text-xs" onClick={()=>navigator.clipboard?.writeText(invite)}>Copy code</button></div>:null}
  <div className="mt-3 space-y-2">{grants.map(g=><div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 p-2.5" key={g.id}><div><div className="text-xs font-bold">{g.owner_name}</div><p className="mt-0.5 text-[10px] text-slate-400">{g.email} · {g.status} · {g.property_ids.length} properties</p></div>{g.status!=="REVOKED"?<button type="button" onClick={()=>revoke(g)} className="rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-200">Revoke</button>:null}</div>)}</div>
  <button type="button" onClick={()=>nav("/pm/properties")} className="mt-3 text-xs font-bold text-cyan-200">Manage property ownership records →</button>
  </section>
  <section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3"><h2 className="text-sm font-black">Create an owner statement</h2><p className="mt-1 text-xs text-slate-400">Amounts are manually reconciled for now. An owner payout is not paid until a real date and payment reference are entered.</p>
  <form onSubmit={saveStatement} className="mt-3 space-y-2"><div className="grid grid-cols-2 gap-2">
    <Field label="Owner"><select required className={input} value={statement.owner_id} onChange={e=>setStatement({...statement,owner_id:e.target.value,property_id:""})}><option value="">Choose</option>{owners.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></Field>
    <Field label="Property"><select required className={input} value={statement.property_id} onChange={e=>setStatement({...statement,property_id:e.target.value})}><option value="">Choose</option>{eligible.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Period"><input type="month" required className={input} value={statement.period} onChange={e=>setStatement({...statement,period:e.target.value})}/></Field>
    {["rent_received","management_fees","expenses","reserve_change","owner_payout"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><input inputMode="decimal" required className={input} placeholder="0.00" value={statement[k]} onChange={e=>setStatement({...statement,[k]:e.target.value})}/></Field>)}
    <Field label="Status"><select className={input} value={statement.status} onChange={e=>setStatement({...statement,status:e.target.value})}>{[["DRAFT","Draft (private)"],["SHARED","Shared with owner"],["PAID","Payout recorded"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
    {statement.status==="PAID"?<><Field label="Date sent"><input type="date" required className={input} value={statement.payout_date} onChange={e=>setStatement({...statement,payout_date:e.target.value})}/></Field><Field label="Payment reference"><input required className={input} value={statement.reference} onChange={e=>setStatement({...statement,reference:e.target.value})}/></Field></>:null}
   </div><button disabled={busy} className="min-h-10 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Save statement</button>
  </form>
  </section>
 </div>
 <section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3"><h2 className="text-sm font-black">Share property documents with an investor</h2><p className="mt-1 text-xs text-slate-400">Only explicitly selected files are shared. Identity and tax documents are blocked from this investor portal workflow.</p><form onSubmit={shareDocument} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Field label="Owner"><select className={input} required value={shared.owner_id} onChange={e=>setShared({...shared,owner_id:e.target.value,document_id:""})}><option value="">Choose owner</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="Property file"><select className={input} required value={shared.document_id} onChange={e=>setShared({...shared,document_id:e.target.value})}><option value="">Choose file</option>{documents.filter(d=>ownedIds.includes(d.property)&&d.category!=="IDENTITY_TAX").map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></Field><button disabled={busy} className="min-h-10 self-end rounded-lg bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Share</button></form><p className="mt-2 text-xs text-slate-400">{shares.length} documents explicitly shared across this portfolio.</p></section>
 </main></PMShell>;
}

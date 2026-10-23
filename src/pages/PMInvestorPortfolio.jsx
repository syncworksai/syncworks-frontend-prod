import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
const cash=v=>Number(v||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const input="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm";
const Panel=({title,children,sub})=><section className="rounded-xl border border-cyan-500/20 bg-[#07111f] p-3 sm:p-4"><h2 className="text-sm font-black">{title}</h2>{sub?<p className="mt-1 text-xs text-slate-400">{sub}</p>:null}<div className="mt-3">{children}</div></section>;
export default function PMInvestorPortfolio(){
 const nav=useNavigate();const [portfolios,setPortfolios]=useState([]),[code,setCode]=useState(""),[messages,setMessages]=useState([]),[err,setErr]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [form,setForm]=useState({grant_id:"",property_id:"",subject:"",body:""});
 async function load(){
  setLoading(true);
  try{
   const [p,m]=await Promise.all([api.get("/pm-hub/access/investors/portfolio/"),api.get("/pm-hub/access/investors/messages/")]);
   setPortfolios(p.data.portfolios||[]);setMessages(m.data.messages||[]);
  }catch(e){setErr(e?.response?.data?.detail||"Unable to load investor portfolio.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{load();},[]);
 async function accept(e){e.preventDefault();setBusy(true);setErr("");try{
  await api.post("/pm-hub/access/investors/accept/",{code});setCode("");setNotice("Your owner portfolio is now linked.");await load();
 }catch(e){setErr(e?.response?.data?.detail||"Unable to accept invitation.");}finally{setBusy(false);}}
 async function message(e){e.preventDefault();setBusy(true);setErr("");try{
  await api.post("/pm-hub/access/investors/messages/",form);setNotice("Your message was added to the property management inbox.");setForm({...form,subject:"",body:""});await load();
 }catch(e){setErr(e?.response?.data?.detail||"Unable to send message.");}finally{setBusy(false);}}
 const all=portfolios.flatMap(p=>p.properties.map(property=>({...property,grant_id:p.grant_id,company:p.company})));
 return <div className="min-h-screen bg-[#040914] text-slate-100"><ModeBar/><main className="mx-auto max-w-6xl space-y-3 px-3 py-3 pb-28 sm:px-5">
  <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-300">My ownership</div><h1 className="text-xl font-black">Investor Portfolio</h1><p className="mt-1 text-xs text-slate-400">Property health, manager updates, shared documents, and owner payouts.</p></div><button type="button" onClick={()=>nav("/investor")} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">Investor home</button></div>
  {err?<p role="alert" className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-3 text-xs">{err}</p>:null}{notice?<p role="status" className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs">{notice}</p>:null}
  {loading?<p className="text-xs text-slate-400">Loading your portfolios…</p>:null}
  <Panel title="Connect to a management company" sub="Enter the one-time code sent privately by your property management company. The signed-in email must match the invitation."><form onSubmit={accept} className="flex gap-2"><input required className={input+" min-w-0 flex-1"} placeholder="Investor invitation code" value={code} onChange={e=>setCode(e.target.value)}/><button disabled={busy} className="rounded-lg bg-fuchsia-400 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Connect</button></form></Panel>
  <div className="grid grid-cols-3 gap-2">{[["Properties",all.length],["Companies",portfolios.length],["Open maintenance",all.reduce((sum,x)=>sum+Number(x.open_work_orders||0),0)]].map(([name,n])=><div key={name} className="rounded-xl border border-slate-700 bg-[#07111f] p-2.5"><div className="text-[10px] text-slate-400">{name}</div><div className="mt-1 text-xl font-black">{n}</div></div>)}</div>
  {!loading&&!portfolios.length?<Panel title="No managed properties linked"><p className="text-xs text-slate-400">Ask your manager to link your ownership record and send a portfolio invitation. No other owner's properties are visible.</p></Panel>:null}
  {portfolios.map(portfolio=><div key={portfolio.grant_id} className="space-y-3">
   <Panel title={portfolio.company} sub={"Owner record: "+portfolio.owner_name}>
    <div className="grid gap-2 sm:grid-cols-2">{portfolio.properties.map(p=><article key={p.id} className="rounded-lg border border-slate-700 bg-black/20 p-3"><div className="flex justify-between gap-2"><div className="text-sm font-black">{p.name}</div><span className="text-[10px] text-cyan-200">{p.health.replaceAll("_"," ")}</span></div><p className="mt-1 text-[11px] text-slate-400">{p.address}</p><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div>Occupancy <strong>{p.occupied}/{p.units}</strong></div><div>Open repairs <strong>{p.open_work_orders}</strong></div></div></article>)}</div>
   </Panel>
   <Panel title="Statements & Disbursements" sub="A shared statement shows a calculated owner amount. Only PAID with a payout date and reference means management recorded a disbursement.">
    {portfolio.statements?.length?<div className="space-y-2">{portfolio.statements.map(s=><div key={s.id} className="rounded-lg border border-slate-700 bg-black/20 p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{s.period}</strong><span className={s.status==="PAID"?"text-xs font-bold text-emerald-300":"text-xs font-bold text-amber-200"}>{s.status==="PAID"?"Payout recorded":"Statement shared"}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div>Rent received <strong>{cash(s.rent_received)}</strong></div><div>Fees <strong>{cash(s.management_fees)}</strong></div><div>Expenses <strong>{cash(s.expenses)}</strong></div><div>Owner amount <strong>{cash(s.owner_payout)}</strong></div></div>{s.payout_date?<p className="mt-2 text-[11px] text-emerald-200">Payout recorded {s.payout_date} · {s.reference}</p>:null}</div>)}</div>:<p className="text-xs text-slate-400">No statements released yet. Ask management for the current owner statement.</p>}
   </Panel>
   <Panel title="Shared Documents" sub="Only documents your manager explicitly shares with your ownership profile are shown.">
    {portfolio.documents?.length?<div className="space-y-2">{portfolio.documents.map(d=><div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 p-2.5"><div><div className="text-xs font-bold">{d.title}</div><p className="text-[10px] text-slate-400">{d.category.replaceAll("_"," ")}</p></div><button type="button" onClick={async()=>{try{const r=await api.get(`/pm-hub/access/investors/files/${d.id}/`,{responseType:"blob"});const url=URL.createObjectURL(r.data);const a=document.createElement("a");a.href=url;a.download=(d.title||"property-document").replaceAll("/","-");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setErr("Document could not be retrieved. Please contact management.");}}} className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-200">View</button></div>)}</div>:<p className="text-xs text-slate-400">No documents shared yet.</p>}
   </Panel>
  </div>)}
  {portfolios.length?<Panel title="Message property management" sub="Contact the management team without leaving your portfolio.">
   <form onSubmit={message} className="space-y-2"><label className="block text-xs">Property<select className={input+" mt-1"} required value={form.grant_id&&form.property_id?`${form.grant_id}:${form.property_id}`:""} onChange={e=>{const [grant,property]=e.target.value.split(":");setForm({...form,property_id:property||"",grant_id:grant||""});}}><option value="">Select your property</option>{all.map(p=><option key={p.company+"-"+p.id} value={`${p.grant_id}:${p.id}`}>{p.name} · {p.company}</option>)}</select></label><input required className={input} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Subject"/><textarea className={input} rows={3} required value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Your message to the PM company"/><button disabled={busy} className="min-h-10 w-full rounded-lg bg-cyan-400 text-xs font-black text-slate-950 disabled:opacity-40">Send message</button></form>
   {messages.length?<p className="mt-2 text-[11px] text-slate-400">{messages.length} existing investor conversation(s)</p>:null}
  </Panel>:null}
 </main></div>;
}

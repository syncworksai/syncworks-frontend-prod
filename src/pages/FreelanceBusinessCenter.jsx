import React, {useCallback,useEffect,useMemo,useState} from "react";
import api from "../api/client";
import {BriefcaseBusiness,Wallet,Receipt,Clock3,Plus,RefreshCcw,ShieldAlert,Bot,ExternalLink} from "lucide-react";

const ROOT="/sync-ai/freelance/pilot/business-ledger/";
const STATUS=["SAVED","QUALIFIED","PROPOSAL_DRAFT","APPLIED","VIEWED","INTERVIEW","OFFERED","HIRED","IN_PROGRESS","SUBMITTED","PAID","DECLINED","WITHDRAWN","CLOSED"];
const statusName={SAVED:"Saved",QUALIFIED:"Qualified",PROPOSAL_DRAFT:"Proposal draft",APPLIED:"Applied",VIEWED:"Client viewed",INTERVIEW:"Interview",OFFERED:"Offer received",HIRED:"Hired",IN_PROGRESS:"In progress",SUBMITTED:"Delivered",PAID:"Paid",DECLINED:"Declined",WITHDRAWN:"Withdrawn",CLOSED:"Closed"};
const box="rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-lg";
const inp="w-full min-w-0 rounded-xl border border-white/20 bg-slate-950/90 px-3 py-2 text-sm text-white";
const btn="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-40";
const cash=n=>Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const initial={title:"",url:"",expected_gross:"",estimated_hours:"",notes:"",status:"SAVED"};
const field=(label,key,form,setForm,type="text")=><label className="block text-xs text-slate-300">{label}<input className={inp+" mt-1"} type={type} value={form[key]||""} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/></label>;
export default function FreelanceBusinessCenter(){
 const [records,setRecords]=useState([]),[summary,setSummary]=useState(null),[active,setActive]=useState(false);
 const [err,setErr]=useState(""),[busy,setBusy]=useState(false),[form,setForm]=useState(initial);
 const [cost,setCost]=useState({title:"",cash_spent:"",connects_used:"",cost_type:"CONNECTS"});
 const [edit,setEdit]=useState({}),[selected,setSelected]=useState("jobs");
 const load=useCallback(async()=>{try{
  const r=await api.get(ROOT);setRecords(r.data.records||[]);setSummary(r.data.summary||null);setActive(true);setErr("");
 }catch(e){setActive(false);setErr(e?.response?.data?.detail||"Secure business ledger is not deployed or this account is not authorized. Manual browser pilot remains separate.");}},[]);
 useEffect(()=>{load();},[load]);
 const jobs=useMemo(()=>records.filter(x=>x.category==="JOB"),[records]);
 const costs=useMemo(()=>records.filter(x=>x.category==="EXPENSE"),[records]);
 const submit=async (category,e)=>{
  e.preventDefault();setBusy(true);setErr("");
  const obj=category==="JOB"?{...form,category,source:"MANUAL",expected_gross:form.expected_gross||"0"}:
   {...cost,category,source:"MANUAL",cash_spent:cost.cash_spent||"0",connects_used:Number(cost.connects_used||0)};
  if(category==="JOB"&&!obj.estimated_hours)delete obj.estimated_hours;
  try{await api.post(ROOT,obj);setForm(initial);setCost({title:"",cash_spent:"",connects_used:"",cost_type:"CONNECTS"});await load();}
  catch(e){setErr(JSON.stringify(e?.response?.data||"Unable to save record."));}finally{setBusy(false);}
 };
 const update=async (id,values)=>{
  setBusy(true);setErr("");
  try{await api.patch(ROOT+id+"/",values);setEdit(p=>({...p,[id]:{}}));await load();}
  catch(e){setErr(JSON.stringify(e?.response?.data||"Unable to update."));}finally{setBusy(false);}
 };
 const card=(title,value,hint,Icon)=><article className={box}><div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}<Icon size={16}/></div><p className="mt-2 text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></article>;
 return <div className="space-y-5">
  <header className={box}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-200">Freelance business operations</p><h2 className="mt-1 text-xl font-black text-white">Jobs, proposals, revenue & costs</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Account-scoped operating ledger. Revenue stages stay separate so a proposal is never mistaken for money earned.</p></div><button className={btn} type="button" onClick={load}><RefreshCcw size={15}/> Refresh</button></div>
   <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100"><ShieldAlert size={15} className="shrink-0"/><span><strong>{active?"Manual ledger connected":"Backend connection pending"}.</strong> Upwork is authorized in ChatGPT, not on this website. No live Upwork statuses, Connects balances, payments or applications are synced here. Never paste client-private information.</span></div>
   {err&&<p className="mt-3 text-xs text-amber-200" role="alert">{err}</p>}
  </header>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
   {card("Prospective value",cash(summary?.potential_gross),"Potential, not guaranteed income",BriefcaseBusiness)}
   {card("Signed contracts",cash(summary?.contracted_gross),"Contracted gross, recorded manually",Receipt)}
   {card("Received gross",cash(summary?.received_gross),"Only record confirmed payouts",Wallet)}
   {card("Cash expenses",cash(summary?.cash_expenses),"Manually recorded; excludes free Connects",Receipt)}
  </div>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
   {card("Applications",summary?.applications??0,"Manually entered outcomes",BriefcaseBusiness)}
   {card("Offers / Hired",(summary?.offers??0)+" / "+(summary?.hired??0),"Offer is not automatically a contract",Clock3)}
   {card("Declined",summary?.declined??0,"Recorded decisions, not a live API",ShieldAlert)}
   {card("Connects used",summary?.connects_used??0,"Units spent, not cash dollars",Bot)}
  </div>
  <div className="flex flex-wrap gap-2"><button onClick={()=>setSelected("jobs")} type="button" className={btn} aria-pressed={selected==="jobs"}>Job pipeline</button><button onClick={()=>setSelected("expenses")} type="button" className={btn} aria-pressed={selected==="expenses"}>Expense ledger</button></div>
  {selected==="jobs"?<div className="grid gap-4 lg:grid-cols-[1fr_1.55fr]">
   <form className={box+" space-y-3"} onSubmit={e=>submit("JOB",e)}><h3 className="flex items-center gap-2 font-bold text-white"><Plus size={17}/> Add an Upwork opportunity</h3>
    {field("Job title","title",form,setForm)}
    {field("Official Upwork job URL","url",form,setForm,"url")}
    <div className="grid grid-cols-2 gap-2">{field("Expected gross ($)","expected_gross",form,setForm,"number")}{field("Estimated hours","estimated_hours",form,setForm,"number")}</div>
    <label className="block text-xs text-slate-300">Application stage<select className={inp+" mt-1"} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>{STATUS.map(s=><option key={s} value={s}>{statusName[s]}</option>)}</select></label>
    {field("Internal notes (non-confidential)","notes",form,setForm)}
    <button className={btn} type="submit" disabled={!active||busy||!form.title.trim()}>Save opportunity</button>
   </form>
   <section className={box}><h3 className="font-bold text-white">Application pipeline</h3><p className="mt-1 mb-3 text-xs text-slate-400">{jobs.length} tracked · Manually recorded</p>
    <div className="max-h-[560px] space-y-3 overflow-y-auto">{jobs.length?jobs.map(job=><article key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-white">{job.title}</h4><span className="text-xs text-cyan-200">{statusName[job.status]||job.status}</span></div>
      <p className="mt-1 text-xs text-slate-400">Expected {cash(job.expected_gross)} · Contracted {cash(job.contract_gross)} · Received {cash(job.paid_gross)} · Manual</p>
      {job.url&&<a className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-200" target="_blank" rel="noopener noreferrer" href={job.url}>Open Upwork posting <ExternalLink size={13}/></a>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
       <label className="text-xs text-slate-300">Status<select className={inp+" mt-1"} value={edit[job.id]?.status||job.status} onChange={e=>setEdit(p=>({...p,[job.id]:{...p[job.id],status:e.target.value}}))}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></label>
       <label className="text-xs text-slate-300">Received gross ($)<input className={inp+" mt-1"} type="number" min="0" step="0.01" value={edit[job.id]?.paid_gross??job.paid_gross??0} onChange={e=>setEdit(p=>({...p,[job.id]:{...p[job.id],paid_gross:e.target.value}}))}/></label>
       <label className="text-xs text-slate-300">Contracted gross ($)<input className={inp+" mt-1"} type="number" min="0" step="0.01" value={edit[job.id]?.contract_gross??job.contract_gross??0} onChange={e=>setEdit(p=>({...p,[job.id]:{...p[job.id],contract_gross:e.target.value}}))}/></label>
       <label className="text-xs text-slate-300">Billed gross ($)<input className={inp+" mt-1"} type="number" min="0" step="0.01" value={edit[job.id]?.billed_gross??job.billed_gross??0} onChange={e=>setEdit(p=>({...p,[job.id]:{...p[job.id],billed_gross:e.target.value}}))}/></label>
      </div>
      <button className={btn+" mt-3"} type="button" disabled={busy||!active||!Object.keys(edit[job.id]||{}).length} onClick={()=>update(job.id,edit[job.id])}>Save update</button>
    </article>):<p className="text-sm text-slate-400">No jobs tracked. Start by entering a real posting you've reviewed in Upwork.</p>}</div>
   </section>
  </div>:<div className="grid gap-4 lg:grid-cols-[1fr_1.55fr]">
   <form className={box+" space-y-3"} onSubmit={e=>submit("EXPENSE",e)}><h3 className="font-bold text-white">Record a business expense</h3>
    {field("Expense description","title",cost,setCost)}
    <label className="block text-xs text-slate-300">Expense type<select className={inp+" mt-1"} value={cost.cost_type} onChange={e=>setCost(p=>({...p,cost_type:e.target.value}))}>{["CONNECTS","UPWORK_FEE","AI","SOFTWARE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-2">{field("Actual cash spent ($)","cash_spent",cost,setCost,"number")}{field("Connects used (units)","connects_used",cost,setCost,"number")}</div>
    <p className="text-xs text-slate-400">Using free Connects doesn't automatically create a cash expense. Record dollar expenses only when actually incurred.</p>
    <button className={btn} type="submit" disabled={!active||busy||!cost.title.trim()}>Save expense</button>
   </form>
   <section className={box}><h3 className="font-bold text-white">Expense history</h3><div className="mt-3 max-h-[470px] space-y-2 overflow-auto">{costs.length?costs.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div><p className="text-sm font-semibold text-white">{x.title}</p><p className="text-xs text-slate-400">{x.cost_type||"Other"} · {x.connects_used||0} Connects · Manual</p></div><strong className="text-sm text-white">{cash(x.cash_spent)}</strong></div>):<p className="text-sm text-slate-400">No expenses recorded.</p>}</div></section>
  </div>}
  <div className={box}><p className="text-sm font-bold text-white">Management controls</p><p className="mt-2 text-xs leading-6 text-slate-400">AI can research, evaluate, draft, and validate after explicit approval and when securely deployed. It cannot guarantee every deliverable or automatically access the Upwork OAuth session connected to ChatGPT. Upwork submissions, hiring outcomes, actual payment and Connects purchases must remain verified through Upwork.</p></div>
 </div>;
}

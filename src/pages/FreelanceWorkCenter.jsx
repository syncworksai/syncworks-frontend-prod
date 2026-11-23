import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import FreelanceJobsPage from "./FreelanceJobsPage";
import FreelanceOverviewDashboard from "./FreelanceOverviewDashboard";
import FreelanceUpworkDesk from "./FreelanceUpworkDeskV2";
import FreelanceProjectsPage from "./FreelanceProjectsPage";
import FreelanceAutomationStudio from "./FreelanceAutomationStudio";
import { BriefcaseBusiness, Search, FileText, FolderKanban, Wallet, PlugZap, Bot, Bell, ExternalLink, Plus, Trash2, ArrowLeft } from "lucide-react";

const PILOT_EMAIL = "jacoblord7@outlook.com";
const SECTIONS = [
  ["overview","Overview",BriefcaseBusiness],["upwork","Upwork Desk",BriefcaseBusiness],["jobs","Jobs",Search],["proposals","Proposals",FileText],
  ["projects","Projects",FolderKanban],["studio","Automation Studio",Bot],["earnings","Earnings",Wallet],["connections","Connections",PlugZap],
  ["jarvis","Jarvis",Bot],["updates","Updates",Bell],
];
const STATUSES = ["Saved","Proposal drafted","Applied","Interview","Contracted","In progress","Submitted","Paid","Declined"];
const storageKey = (userId) => `sw_freelance_pilot_v1_${userId}`;
const money = (n) => Number(n || 0).toLocaleString("en-US",{style:"currency",currency:"USD"});
function initialState(){ return { opportunities: [], updatedAt: null }; }
function loadState(userId) {
  try { const value = JSON.parse(window.localStorage.getItem(storageKey(userId)) || "null"); return value && Array.isArray(value.opportunities) ? value : initialState(); }
  catch { return initialState(); }
}
const panelClass = "rounded-2xl border border-white/10 bg-slate-900/80 p-5";
const inputClass = "w-full min-w-0 rounded-xl border border-white/20 bg-slate-950/90 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25";
const linkClass = "inline-flex items-center gap-1 text-sm font-semibold text-cyan-200 hover:text-white";

function Empty({title, detail}) {return <div className="rounded-xl border border-dashed border-white/15 px-5 py-9 text-center"><p className="font-semibold text-slate-200">{title}</p><p className="mt-2 text-sm text-slate-400">{detail}</p></div>;}
function Metric({label, value, hint}) {return <div className={panelClass}><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-2 text-2xl font-bold text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;}
function SectionHeader({title,detail}) {return <div className="mb-5"><h2 className="text-xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{detail}</p></div>;}
function JobRows({items, updateJob, deleteJob}) {
  return items.length ? <div className="space-y-3">{items.map(job=><article key={job.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{job.title}</h3><p className="mt-1 text-xs text-slate-400">{job.platform || "Freelance"} · {money(job.budget)} estimated value · {job.type || "Fixed price"}</p></div><div className="flex items-center gap-2">
      <select aria-label={`Status for ${job.title}`} className={inputClass} value={job.status} onChange={e=>updateJob(job.id,{status:e.target.value})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      <button type="button" className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10" onClick={()=>{if(window.confirm("Remove this local entry?"))deleteJob(job.id);}} aria-label={`Delete ${job.title}`}><Trash2 size={16}/></button>
    </div></div>
    {job.url ? <a target="_blank" rel="noopener noreferrer" href={job.url} className={`${linkClass} mt-3`}>Open original posting <ExternalLink size={13}/></a>:null}
  </article>)}</div> : <Empty title="No entries yet" detail="Add a job manually. Your Upwork account has not been connected."/>;
}
function JobForm({onAdd}) {
 const [form,setForm]=useState({title:"",platform:"Upwork",url:"",budget:"",type:"Fixed price"});
 const [open,setOpen]=useState(false);
 const field=(name,label,placeholder,type="text")=><label className="space-y-1 text-xs text-slate-300">{label}<input className={inputClass} type={type} placeholder={placeholder} value={form[name]} onChange={e=>setForm(v=>({...v,[name]:e.target.value}))}/></label>;
 return <div className="mb-5"><button type="button" className={buttonClass} onClick={()=>setOpen(v=>!v)}><Plus size={16}/> Add opportunity</button>
 {open && <form className={`${panelClass} mt-3 grid gap-3 sm:grid-cols-2`} onSubmit={e=>{e.preventDefault();if(!form.title.trim())return;onAdd(form);setForm({title:"",platform:"Upwork",url:"",budget:"",type:"Fixed price"});setOpen(false);}}>
 {field("title","Project title","e.g. Spreadsheet cleanup")}
 {field("platform","Source","Upwork")}
 {field("budget","Project value ($)","75","number")}
 {field("type","Contract type","Fixed price")}
 <div className="sm:col-span-2">{field("url","Posting URL (optional)","https://www.upwork.com/...","url")}</div>
 <button type="submit" className={buttonClass}>Save locally</button></form>}</div>;
}
export default function FreelanceWorkCenter(){
 const {user}=useAuth(), nav=useNavigate(), {section="overview"}=useParams();
 const email=String(user?.email||"").trim().toLowerCase();
 const enabled=email===PILOT_EMAIL;
 const key=String(user?.id||email);
 const [data,setData]=useState(()=>loadState(key));
 useEffect(()=>{if(enabled)setData(loadState(key));},[enabled,key]);
 useEffect(()=>{if(enabled){try{window.localStorage.setItem(storageKey(key),JSON.stringify(data));}catch{/* storage unavailable */}}},[enabled,key,data]);
 const items=data.opportunities||[];
 const addJob=form=>setData(d=>({...d,updatedAt:new Date().toISOString(),opportunities:[{...form,id:crypto.randomUUID(),budget:Math.max(0,Number(form.budget)||0),status:form.status||"Saved"},...d.opportunities]}));
 const updateJob=(id,changes)=>setData(d=>({...d,updatedAt:new Date().toISOString(),opportunities:d.opportunities.map(j=>j.id===id?{...j,...changes}:j)}));
 const deleteJob=id=>setData(d=>({...d,updatedAt:new Date().toISOString(),opportunities:d.opportunities.filter(j=>j.id!==id)}));
 const totals=useMemo(()=>({saved:items.length,active:items.filter(j=>["Contracted","In progress","Submitted"].includes(j.status)).length,paid:items.filter(j=>j.status==="Paid").reduce((s,j)=>s+Number(j.budget||0),0),pipeline:items.filter(j=>!["Paid","Declined"].includes(j.status)).reduce((s,j)=>s+Number(j.budget||0),0)}),[items]);
 if(!enabled) return <Navigate to="/customer" replace/>;
 if(!SECTIONS.some(([id])=>id===section))return <Navigate to="/customer/freelance/overview" replace/>;
 const byStatus=(statuses)=>items.filter(j=>statuses.includes(j.status));
 if(section==="upwork")return <FreelanceUpworkDesk items={items} addJob={addJob} updateJob={updateJob}/>;
 return <main className="min-h-dvh bg-[#060d19] px-4 pb-16 pt-6 text-slate-100 sm:px-7" data-sw-feature="freelance-pilot">
 <div className="mx-auto max-w-6xl">
 <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button onClick={()=>nav("/customer")} type="button" className={linkClass}><ArrowLeft size={16}/> Customer Workspace</button><span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">Founder visual pilot · Demo</span></div>
 <header className="mb-7"><p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">SYNCWORKS / WORKSPACE</p><h1 className="mt-2 text-3xl font-black text-white">Freelance Work Center</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Jobs, proposals, projects, local automation, earnings and Jarvis in one place. Upwork is not yet connected; job and earnings figures are manually recorded pilot values.</p></header>
 <nav aria-label="Freelance sections" className="mb-7 flex gap-2 overflow-x-auto pb-2">{SECTIONS.map(([id,label,Icon])=><NavLink key={id} to={`/customer/freelance/${id}`} className={({isActive})=>`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${isActive?"border-cyan-400/40 bg-cyan-500/20 text-cyan-100":"border-white/10 bg-slate-900/65 text-slate-300 hover:bg-slate-800"}`}><Icon size={15}/>{label}</NavLink>)}</nav>
 {section==="overview"&&<><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4"><div><p className="font-bold text-white">Upwork Desk is ready</p><p className="text-xs text-slate-300">Track the first submitted proposal in your founder-only workspace.</p></div><button className={buttonClass} type="button" onClick={()=>nav("/customer/freelance/upwork")}>Open Upwork Desk</button></div><FreelanceOverviewDashboard items={items} totals={totals}/></>}
 {section==="upwork"&&<FreelanceUpworkDesk items={items} addJob={addJob}/>}
 {section==="jobs"&&<FreelanceJobsPage items={items} addJob={addJob} updateJob={updateJob} deleteJob={deleteJob}/>}
 {section==="proposals"&&<><SectionHeader title="Proposal pipeline" detail="Review your drafts and applications. Sending requires your approval on Upwork."/><JobRows items={byStatus(["Proposal drafted","Applied","Interview"])} updateJob={updateJob} deleteJob={deleteJob}/><div className={`${panelClass} mt-4`}><button type="button" className={buttonClass} onClick={()=>nav("/sync/assist")}>Draft with Jarvis</button><p className="mt-2 text-xs text-slate-400">Paste the job description into Sync Assist. No proposals are auto-submitted.</p></div></>}
 {section==="projects"&&<FreelanceProjectsPage items={items} updateJob={updateJob}/>} 
 {section==="studio"&&<FreelanceAutomationStudio items={items} updateJob={updateJob}/>}
 {section==="earnings"&&<><SectionHeader title="Earnings hub" detail="Manual bookkeeping only: no connection to Upwork balances or bank transactions."/><div className="mb-5 grid gap-3 sm:grid-cols-3"><Metric label="Recorded paid" value={money(totals.paid)} hint="Gross, before platform fees/taxes"/><Metric label="Active pipeline" value={money(totals.pipeline)} hint="Prospective—not earned"/><Metric label="Paid projects" value={byStatus(["Paid"]).length} hint="Mark jobs Paid once verified"/></div><JobRows items={byStatus(["Paid"])} updateJob={updateJob} deleteJob={deleteJob}/></>}
 {section==="connections"&&<><SectionHeader title="Connections" detail="One place to see provider and Jarvis integration readiness."/><div className="grid gap-4 md:grid-cols-2">{[["Upwork","Not connected","Official authorization required. No password or session scraping."],["Sync Assist / Jarvis","Available separately","Existing Sync Assist opens from this workspace, but no automated Upwork actions are wired."],["Email & calendar","Not connected here","Consent-based connections can be added later for deadline reminders."],["Payments","Manual tracking","No Upwork payout, banking, or Stripe sync is connected."]].map(([name,state,detail])=><div className={panelClass} key={name}><h3 className="font-bold text-white">{name}</h3><p className="my-2 text-xs font-semibold text-amber-200">{state}</p><p className="text-sm text-slate-400">{detail}</p></div>)}</div><a href="https://www.upwork.com/" target="_blank" rel="noopener noreferrer" className={`${linkClass} mt-5`}>Open Upwork <ExternalLink size={14}/></a></>}
 {section==="jarvis"&&<><SectionHeader title="Jarvis control center" detail="Review project scope, draft proposals and validate deliverables with your existing Sync Assist."/><div className={panelClass}><div className="grid gap-3 sm:grid-cols-2">{[["Evaluate a job","Review this freelance job for scope, risks, price, estimated effort, and automation opportunities. Do not invent facts."],["Draft a proposal","Write a concise Upwork proposal tailored to the job and my actual experience. Do not submit it."],["Plan a data cleanup","Create a data cleaning plan with duplicate handling, validation, exception review and a change log."],["Quality-control delivery","Verify outputs against the provided project requirements, flag uncertain results, and create a client-ready summary."]].map(([title,prompt])=><button key={title} type="button" className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left hover:border-cyan-400/40" onClick={()=>{navigator.clipboard?.writeText(prompt).catch(()=>{});nav("/sync/assist");}}><span className="block font-semibold text-white">{title}</span><span className="mt-1 block text-xs text-slate-400">Copies a starter prompt when supported, then opens Sync Assist</span></button>)}</div></div></>}
 {section==="updates"&&<><SectionHeader title="Activity & updates" detail="Internal pilot notes; not live Upwork alerts."/><div className={panelClass}><p className="font-semibold text-white">Founder-only preview</p><p className="mt-2 text-sm text-slate-400">Track job status manually. Automatic job alerts, client messages and payment notifications will require approved external connections and backend event handling.</p>{data.updatedAt&&<p className="mt-4 text-xs text-slate-500">Last local edit: {new Date(data.updatedAt).toLocaleString()}</p>}</div></>}
 <p className="mt-8 text-xs text-slate-500">Visual pilot data is stored in this browser on this device, not in SyncWorks cloud storage. Do not enter client secrets, contact lists, credentials or confidential financial details. Account-scoped backend access is required before general release.</p>
 </div></main>;
}

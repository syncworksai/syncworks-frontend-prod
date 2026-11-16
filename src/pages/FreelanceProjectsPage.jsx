import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, ClipboardCheck, ArrowRight, Clock3, ShieldAlert, CheckCircle2, ExternalLink } from "lucide-react";

const ACTIVE = ["Contracted","In progress","Submitted"];
const STEP = ["Review funded contract and client rules","Define deliverables and deadline","Confirm processing consent and data privacy","Process and validate file","Review exceptions and sample records","Approve and deliver through Upwork"];
const panel = "rounded-2xl border border-white/10 bg-slate-900/75 p-5";
const money = n => Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"});

export default function FreelanceProjectsPage({items,updateJob}){
 const nav=useNavigate();
 const [showCompleted,setShowCompleted]=useState(false);
 const projects=useMemo(()=>items.filter(j=>ACTIVE.includes(j.status)||(showCompleted&&j.status==="Paid")),[items,showCompleted]);
 const startStudio=(id)=>nav(`/customer/freelance/studio?job=${encodeURIComponent(id)}`);
 return <section>
  <header className="mb-5"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200"><BriefcaseBusiness size={15}/> Project operations</p><h2 className="mt-1 text-2xl font-bold text-white">Projects & delivery pipeline</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Your contract workflow, approvals, deliverables, and next actions. Jobs are manually tracked and not synchronized with Upwork yet.</p></header>
  
  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
   {[[ "Active",items.filter(j=>ACTIVE.includes(j.status)).length ],["Awaiting delivery",items.filter(j=>j.status==="Submitted").length],["Marked paid",items.filter(j=>j.status==="Paid").length]].map(([label,value])=><div className={panel} key={label}><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>)}
  </div>
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button type="button" className="rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100" onClick={()=>nav("/customer/freelance/studio")}>Open Automation Studio <ArrowRight size={15} className="ml-1 inline"/></button><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={showCompleted} onChange={e=>setShowCompleted(e.target.checked)}/> Show completed</label></div>
  {projects.length ? <div className="space-y-4">{projects.map(j=>{
   const checks=j.projectChecks||[];
   return <article key={j.id} className={panel}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-white">{j.title}</h3><p className="mt-1 text-xs text-slate-400">{j.platform||"Freelance"} · {money(j.budget)} {j.type==="Hourly"?"reported hourly rate":"potential fixed-price amount"}</p></div><span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">{j.status}</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     <label className="text-xs text-slate-400">Project status<select className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 p-2.5 text-sm text-white" value={j.status} onChange={e=>updateJob(j.id,{status:e.target.value})}>{["Contracted","In progress","Submitted","Paid","Declined"].map(s=><option key={s}>{s}</option>)}</select></label>
     <label className="text-xs text-slate-400">Deadline (manually recorded)<input type="date" className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 p-2.5 text-sm text-white" value={j.deadline||""} onChange={e=>updateJob(j.id,{deadline:e.target.value})}/></label>
    </div>
    <div className="mt-5"><h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><ClipboardCheck size={16}/> Delivery checklist <span className="text-xs font-normal text-slate-400">({checks.length}/{STEP.length})</span></h4><div className="grid gap-2 sm:grid-cols-2">{STEP.map((s,i)=><label key={s} className="flex items-start gap-2 text-xs leading-5 text-slate-300"><input className="mt-1" type="checkbox" checked={checks.includes(i)} onChange={e=>updateJob(j.id,{projectChecks:e.target.checked?[...checks,i]:checks.filter(x=>x!==i)})}/>{s}</label>)}</div></div>
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200" onClick={()=>startStudio(j.id)}>Open in Studio <ArrowRight size={15}/></button>{j.url&&<a href={j.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300">Original posting <ExternalLink size={15}/></a>}</div>
    {j.status==="Submitted"&&<p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><Clock3 size={14}/> Submitted is not the same as approved or paid.</p>}
   </article>;
  })}</div>:<div className={panel}><CheckCircle2 className="mb-3 text-slate-500"/><p className="font-semibold text-white">No active projects recorded</p><p className="mt-2 text-sm text-slate-400">Once you win a funded contract, change its job status to Contracted. You can practice Studio workflows with synthetic data now.</p></div>}
  <aside className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100"><ShieldAlert className="mt-0.5 shrink-0" size={17}/><p>This pilot records only project metadata in this browser. Do not enter private client documents, passwords, payment information or confidential records. Server-enforced permissions and secure storage are required before production client work.</p></aside>
 </section>;
}

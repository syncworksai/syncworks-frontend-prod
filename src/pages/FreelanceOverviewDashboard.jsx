import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bot, Briefcase, ClipboardList, FileCheck2, Link2, Search, ShieldAlert, Wallet, Workflow } from "lucide-react";

const linkBase="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-500/10";
const money=v=>Number(v||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const tile=(label,value,detail)=><div className="rounded-2xl border border-white/10 bg-[#101b30]/85 p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{label}</p><div className="mt-2 text-2xl font-black text-white">{value}</div><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
export default function FreelanceOverviewDashboard({items=[],totals,accessNotice=""}){
 const nav=useNavigate();
 const inProgress=items.filter(j=>["Contracted","In progress"].includes(j.status));
 const proposals=items.filter(j=>["Proposal drafted","Applied","Interview"].includes(j.status));
 const submitted=items.filter(j=>j.status==="Submitted");
 const actions=[
  ["Find opportunities","Evaluate pay, effort and automation fit","/customer/freelance/jobs",Search],
  ["Manage projects","Review active work and delivery checklists","/customer/freelance/projects",Briefcase],
  ["Automation Studio","Test CSV cleanup; review before exporting","/customer/freelance/studio",Workflow],
  ["Jarvis assistant","Ask for a job or processing plan","/customer/freelance/jarvis",Bot],
  ["Earnings center","Track recorded payments and future pipeline","/customer/freelance/earnings",Wallet],
  ["Connections","See provider availability and authorization","/customer/freelance/connections",Link2],
 ];
 return <div className="space-y-5">
  <section className="overflow-hidden rounded-[1.6rem] border border-cyan-400/20 bg-gradient-to-br from-[#122c4f] via-[#161c43] to-[#25153c] p-5 shadow-[0_18px_60px_rgba(12,17,38,.35)] sm:p-7">
   <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">Freelance command center</p>
   <div className="mt-3 grid gap-5 md:grid-cols-[1.4fr_.8fr] md:items-center">
    <div><h2 className="max-w-lg text-2xl font-black leading-tight text-white sm:text-3xl">Your work. Your earnings. Jarvis at your side.</h2>
    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Keep the entire freelance workflow in SyncWorks—from evaluating an opportunity to checking a deliverable. Review and approval stay with you.</p>
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-200" onClick={()=>nav("/customer/freelance/projects")}>Open my projects</button><button type="button" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15" onClick={()=>nav("/customer/freelance/studio")}>Open Automation Studio</button></div>
    </div>
    <div className="rounded-2xl border border-white/15 bg-black/20 p-4"><div className="flex items-center gap-2 text-sm font-bold text-cyan-100"><Bot size={18}/> Jarvis work status</div><p className="mt-2 text-lg font-bold text-white">Planning assistance</p><p className="mt-2 text-xs leading-5 text-slate-300">Jarvis can help plan tasks with explicit consent after the backend is enabled. Autonomous file completion and Upwork delivery are not connected.</p><button onClick={()=>nav("/customer/freelance/connections")} className="mt-3 flex items-center gap-1 text-xs font-bold text-cyan-200" type="button">Check connections <ArrowUpRight size={13}/></button></div>
   </div>
  </section>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tile("Tracked opportunities",items.length,"Manually recorded")}{tile("In progress",inProgress.length,"Contracted or being processed")}{tile("Recorded gross earnings",money(totals.paid),"Unreconciled, before fees/taxes")}{tile("Potential pipeline",money(totals.pipeline),"Not income or guaranteed work")}</div>
  <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-white/10 bg-slate-900/75 p-5">
   <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-bold text-white"><ClipboardList size={18}/> Your work queue</h3><p className="mt-1 text-xs text-slate-400">Quick view of locally tracked freelance jobs</p></div><button type="button" className="text-xs font-bold text-cyan-200" onClick={()=>nav("/customer/freelance/jobs")}>View all <ArrowUpRight size={13} className="inline"/></button></div>
   {items.length?<div className="space-y-2">{[...inProgress,...submitted,...proposals,...items.filter(j=>j.status==="Saved")].slice(0,5).map(job=><button key={job.id} type="button" onClick={()=>nav(job.status==="Contracted"||job.status==="In progress"||job.status==="Submitted"?"/customer/freelance/projects":"/customer/freelance/jobs")} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:bg-white/5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{job.title}</p><p className="mt-1 text-xs text-slate-400">{job.status}</p></div><span className="shrink-0 text-sm font-semibold text-cyan-200">{money(job.budget)}</span></button>)}</div>:<div className="rounded-xl border border-dashed border-white/15 p-6 text-center"><FileCheck2 className="mx-auto text-slate-500"/><p className="mt-2 font-bold text-slate-200">No jobs recorded yet</p><p className="mt-1 text-xs text-slate-400">Save a job to start building your work queue.</p></div>}
  </section><section className="rounded-2xl border border-white/10 bg-slate-900/75 p-5"><h3 className="text-lg font-bold text-white">What needs attention</h3><div className="mt-4 space-y-3">{[[submitted.length,"Submitted; awaiting review","/customer/freelance/projects"],[proposals.length,"Proposals and interviews","/customer/freelance/proposals"],[inProgress.length,"Active assignments","/customer/freelance/projects"]].map(([count,label,path])=><button key={label} type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 p-3 text-sm text-slate-300 hover:bg-white/5" onClick={()=>nav(path)}><span>{label}</span><span className="text-base font-black text-white">{count}</span></button>)}</div><div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3"><ShieldAlert size={16} className="shrink-0 text-amber-200"/><p className="text-xs leading-5 text-amber-100">Development pilot only. Do not upload confidential client files until permissions, security review and deployment are verified.</p></div></section></div>
  <section><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold text-white">Your workspace</h3><span className="text-xs text-slate-500">Select an area</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.map(([title,detail,path,Icon])=><button key={title} type="button" className={linkBase} onClick={()=>nav(path)}><div className="flex min-w-0 items-start gap-3"><div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2 text-cyan-200"><Icon size={19}/></div><div><p className="font-bold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div></div><ArrowUpRight size={15} className="shrink-0 text-slate-400"/></button>)}</div></section>
  {accessNotice&&<p className="text-xs text-slate-500">{accessNotice}</p>}
 </div>;
}

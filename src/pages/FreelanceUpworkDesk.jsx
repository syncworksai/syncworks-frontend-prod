import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, BriefcaseBusiness, Bot, CheckCircle2, CircleDollarSign, ClipboardCheck, Coins, ExternalLink, FileClock, ShieldCheck } from "lucide-react";

/* Snapshot verified through the account-owner's ChatGPT Upwork connection.
 * Not an Upwork OAuth integration for the SyncWorks server.
 * Keep this founder-only view informational; status must NOT auto-advance.
 */
const FIRST = {
  title: "Manual Amazon Product Research and Spreadsheet Curation",
  jobUrl: "https://www.upwork.com/jobs/~022124978383444007582",
  proposalId: "2124993311948001281",
  jobId: "2124978383444007582",
  bid: 30,
  connects: 8,
  confirmedAt: "2026-11-23T22:27:40.691Z",
};
const tile="rounded-2xl border border-white/15 bg-slate-900/65 p-4 backdrop-blur-md";
const button="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20";
export default function FreelanceUpworkDesk({items=[],addJob}){
 const nav=useNavigate();
 const tracked=items.find(j=>j.upworkJobId===FIRST.jobId||j.proposalId===FIRST.proposalId);
 const record=()=>{
   if(tracked)return nav("/customer/freelance/proposals");
   addJob({title:FIRST.title,platform:"Upwork",url:FIRST.jobUrl,budget:FIRST.bid,type:"Fixed price",
     status:"Applied",proposalId:FIRST.proposalId,upworkJobId:FIRST.jobId,
     connectsSpent:FIRST.connects,source:"Verified Upwork snapshot via ChatGPT 2026-11-23"});
 };
 return <div className="space-y-4" aria-label="Upwork freelance desk">
  <section className="rounded-3xl border border-white/20 bg-slate-900/60 p-5 backdrop-blur-xl sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-200">SYNCWORKS · FREELANCE OPERATIONS</p>
      <h2 className="mt-2 text-2xl font-black text-white">Upwork Desk</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">Manage opportunities, applications, work, and earnings from one place. The first proposal below was confirmed in your Upwork account through ChatGPT; this website does not yet have its own authorized Upwork feed.</p>
    </div>
    <a className={button} href="https://www.upwork.com/nx/find-work/" target="_blank" rel="noreferrer noopener">Find jobs on Upwork <ExternalLink size={15}/></a>
   </div>
   <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-amber-100">
    <ShieldCheck size={15}/> Upwork in ChatGPT: connected · SyncWorks server: not connected · Status: dated verification snapshot
   </div>
  </section>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[
    ["Submitted proposals",1,"Verified snapshot",FileClock],
    ["Proposed contract value","$30.00","Not earned or contracted",CircleDollarSign],
    ["Connects spent",8,"For first proposal; not cash expense",Coins],
    ["Received payments","$0.00","No payments verified for this proposal",ClipboardCheck],
   ].map(([label,value,note,Icon])=><div key={label} className={tile}>
    <p className="flex items-center gap-2 text-xs text-slate-300"><Icon size={15}/>{label}</p>
    <p className="mt-2 text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p>
   </div>)}
  </div>
  <section className="rounded-2xl border border-white/15 bg-slate-900/65 p-5 backdrop-blur-lg">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold text-white">First submitted application</h3><span className="rounded-full border border-emerald-300/30 bg-emerald-600/15 px-3 py-1 text-xs font-bold text-emerald-100">Submitted · Awaiting client</span></div>
   <h4 className="mt-3 text-base font-semibold text-white">{FIRST.title}</h4>
   <p className="mt-1 text-xs text-slate-400">Proposal #{FIRST.proposalId} · Verified November 23, 2026 · Not yet viewed at verification</p>
   <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
    {[["Bid","$30.00"],["Bid boost","None"],["Duration","Less than 1 month"],["Payment","On project completion"]].map(([a,b])=><div className="rounded-xl border border-white/10 p-3" key={a}><span className="block text-xs text-slate-400">{a}</span><strong className="mt-1 block text-white">{b}</strong></div>)}
   </div>
   <div className="mt-4 flex flex-wrap gap-2">
    <button type="button" className={button} onClick={record}>{tracked?<><CheckCircle2 size={16}/> Open tracked proposal</>:<><BriefcaseBusiness size={16}/> Add to my local pipeline</>}</button>
    <a className={button} target="_blank" rel="noopener noreferrer" href={FIRST.jobUrl}>Open job on Upwork <ArrowUpRight size={15}/></a>
    <button className={button} onClick={()=>nav("/customer/freelance/jarvis")} type="button"><Bot size={16}/> Open Jarvis</button>
   </div>
   <p className="mt-3 text-xs text-slate-400">Tracking is browser-local until the secure business ledger is deployed. Recording a proposal here does not submit another application or spend Connects.</p>
  </section>
  <section className="grid gap-3 sm:grid-cols-3">
   {[["Find & qualify jobs","Review fit, expected profit and client requirements","/customer/freelance/jobs"],["Proposal pipeline","Review submitted applications and interview stages","/customer/freelance/proposals"],["Earnings & costs","Separate applications, revenue and payments","/customer/freelance/earnings"]].map(([title,note,path])=><button key={title} onClick={()=>nav(path)} type="button" className={tile+" text-left hover:border-cyan-300/40"}><p className="font-semibold text-white">{title} <ArrowUpRight size={14} className="inline"/></p><p className="mt-2 text-xs text-slate-300">{note}</p></button>)}
  </section>
 </div>;
}

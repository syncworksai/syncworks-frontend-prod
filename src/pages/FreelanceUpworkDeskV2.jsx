import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, BriefcaseBusiness, CheckCircle2, Clock3, ExternalLink, FileText, ShieldAlert, Sparkles, Wallet, X } from "lucide-react";
import { useWorkspaceAppearance } from "../components/customer/CustomerWorkspace";
import "./FreelanceUpworkDesk.css";
import "./FreelanceUpworkPipeline.css";

/**
 * Founder pilot. The Upwork data below is an explicitly dated read-only snapshot.
 * Never infer a hire, payment, or current view status from manually changed stages.
 * This screen does not authenticate with Upwork or schedule server-side agents.
 */
const SNAPSHOT_AT="2026-11-25T18:03:46Z";
const CONFIRMED=[
 {id:"2124993311948001281",jobId:"2124978383444007582",title:"Manual Amazon Product Research and Spreadsheet Curation",url:"https://www.upwork.com/jobs/~022124978383444007582",stage:"Submitted",amount:"$30 fixed",details:"33 proposals · 8 opened · Not viewed at verification",bot:"Proposal Agent",note:"Do not resubmit or boost. Await client response.",submitted:"Nov 23"},
 {id:"2125302184257974793",jobId:"2125160830223473195",title:"AI Research Assistant (Remote, Part-Time) — UpForward",url:"https://www.upwork.com/jobs/~022125160830223473195",stage:"Invitation accepted",amount:"$30/hr",details:"21 proposals · 4 shortlisted · Not viewed at verification",bot:"Victoria",note:"Invitation accepted, not hired. Submitted terms propose 15% rate increases every three months.",submitted:"Nov 25"}
];
const CANDIDATES=[
 {id:"2125509670158062800",title:"Online English Teaching Job Researcher",url:"https://www.upwork.com/jobs/~022125509670158062800",price:"$150 fixed",reason:"Low competition at last check (3 proposals). Confirm scope and realistic hours.",risk:"Client has limited hiring history",score:82},
 {id:"2125631238757032170",title:"U.S.-Based Market Research Participants",url:"https://www.upwork.com/jobs/~022125631238757032170",price:"$45 fixed",reason:"Remote and flexible; client has previous hires.",risk:"Verify expected time and client requirements",score:68}
];
const WORKFLOW=[
 {id:"screen",name:"Screen job opportunities",agent:"Research Agent",state:"Suggested",detail:"Check client history, scope, pay and competition; reject misleading or low-value work."},
 {id:"draft",name:"Prepare two tailored proposals",agent:"Proposal Agent",state:"Awaiting build",detail:"Draft against the complete postings and genuine portfolio, then place in approval queue."},
 {id:"monitor",name:"Check existing proposal status",agent:"Victoria",state:"Awaiting connection",detail:"Read Upwork statuses once server-side authorization is available; do not auto-advance."},
 {id:"deliver",name:"Prepare work deliverables",agent:"Operations Agent",state:"Awaiting contract",detail:"Only after an actual contract and permission for AI assistance; require QA approval."}
];
const stages=["Discovered","Qualified","Drafted","Approval","Submitted","Viewed","Interview","Offer","Contract","Delivery","Paid"];
const cls="sw-pipe-card rounded-2xl backdrop-blur-md";
function dollars(n){return "$"+Number(n).toFixed(2);}
export default function FreelanceUpworkDesk({items=[],addJob,updateJob}){
 const nav=useNavigate();
 const [appearance]=useWorkspaceAppearance();
 const [tab,setTab]=useState("pipeline");
 const [selected,setSelected]=useState(null);
 const [message,setMessage]=useState("");
 const [approvals,setApprovals]=useState({});
 const [paused,setPaused]=useState(true);
 const stored=useMemo(()=>CONFIRMED.map(p=>({...p,local:items.find(x=>x.proposalId===p.id||x.upworkJobId===p.jobId)})),[items]);
 const imported=stored.filter(p=>p.local).length;
 const saveCandidate=c=>{if(items.some(x=>x.upworkJobId===c.id)){setMessage("Already recorded locally.");return;}
  addJob({title:c.title,platform:"Upwork",url:c.url,type:"Fixed price",budget:Number(c.price.match(/\d+/)?.[0]||0),upworkJobId:c.id,status:"Saved",source:"Manual shortlist from 2026-11-25; not a live SyncWorks feed"});
  setMessage("Saved to this browser only. No proposal submitted or Connects spent.");
 };
 const saveKnown=p=>{if(p.local)return setSelected(p);
  addJob({title:p.title,platform:"Upwork",url:p.url,type:p.amount.includes("/hr")?"Hourly":"Fixed price",budget:p.amount.includes("/hr")?0:30,proposalId:p.id,upworkJobId:p.jobId,status:"Applied",source:"Upwork snapshot verified 2026-11-25; not live"});
  setMessage("Saved locally. This does not send an application.");
 };
 const card=(children,extra="")=><div className={cls+" "+extra}>{children}</div>;
 const select=(record)=>{setSelected(record);setMessage("");};
 const current=selected?.id?selected:null;
 return <main className="sw-upwork-stage sw-upwork-pipeline relative flex flex-col gap-3 overflow-hidden rounded-3xl p-3 sm:p-5" data-upwork-theme={appearance.theme||"legacy"} aria-label="Upwork AI pipeline">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><div className="text-[10px] font-bold uppercase tracking-[.19em] sw-pipe-accent">SyncWorks / AI Workforce / Founder pilot</div><h1 className="text-2xl font-semibold">Upwork <span className="sw-pipe-accent">Income Pipeline</span></h1><p className="text-xs sw-pipe-muted">Static account snapshot · November 25, 2026 · Browser-local changes, no site sync</p></div>
   <div className="flex flex-wrap gap-2"><button className="sw-pipe-control rounded-xl border px-3 py-2 text-xs" onClick={()=>nav("/sync/assist")}> <Bot size={14} className="inline"/> Victoria / Sync Assist</button><button className="rounded-xl border sw-pipe-line px-3 py-2 text-xs" onClick={()=>setPaused(v=>!v)} aria-pressed={!paused}>{paused?"Automation paused":"Preview only · not live"}</button></div>
  </header>
  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
   {[["Verified proposals","2","Both require follow-up"],["Saved locally",String(imported)+"/2","Confirmed snapshot imported"],["Connects snapshot","138","Not live balance"],["Verified active contracts","0","No income recorded"]].map(([label,value,description])=><section key={label} className={cls+" p-3"}><p className="text-[11px] sw-pipe-muted">{label}</p><strong className="block text-2xl">{value}</strong><small className="text-[10px] sw-pipe-muted">{description}</small></section>)}
  </div>
  <nav aria-label="Pipeline sections" className="flex shrink-0 gap-2 overflow-x-auto pb-1">
   {[["pipeline","Pipeline"],["discover","Shortlist"],["agents","AI tasks"],["approvals","Approvals"]].map(([id,name])=><button type="button" key={id} onClick={()=>setTab(id)} aria-pressed={tab===id} className={"shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold "+(tab===id?"sw-pipe-active-border sw-pipe-active-bg sw-pipe-ink":"sw-pipe-line sw-pipe-muted")}>{name}</button>)}
  </nav>
  {tab==="pipeline"&&<div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Pipeline stages">{stages.map(s=><span key={s} className={"shrink-0 rounded-lg border px-2 py-1 text-[10px] "+(["Submitted"].includes(s)?"sw-pipe-line sw-pipe-accent":"sw-pipe-line sw-pipe-muted")}>{s}</span>)}</div>
    <section className="grid gap-3 lg:grid-cols-2">{stored.map(p=><article key={p.id} className={cls+" p-4"}>
     <div className="mb-2 flex justify-between gap-2"><span className="text-[10px] uppercase tracking-wide sw-pipe-accent">{p.stage} · {p.submitted}</span><span className="text-xs font-bold">{p.amount}</span></div>
     <h2 className="text-sm font-semibold">{p.title}</h2><p className="mt-2 text-xs sw-pipe-muted">{p.details}</p><p className="mt-1 text-[11px] sw-pipe-accent">{p.note}</p>
     <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>select(p)} className="sw-pipe-control rounded-lg border px-3 py-2 text-xs">Details & actions</button><button className="rounded-lg border sw-pipe-line px-3 py-2 text-xs" onClick={()=>saveKnown(p)}>{p.local?"Tracked locally":"Track locally"}</button><a className="rounded-lg border sw-pipe-line px-3 py-2 text-xs" href={p.url} target="_blank" rel="noopener noreferrer">Upwork <ExternalLink size={12} className="inline"/></a></div>
    </article>)}</section>
    {card(<div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-semibold">Victoria's next decision</p><p className="text-xs sw-pipe-muted">Review the new shortlist, then queue only the best-fitting applications. No current automated application sending.</p></div><button className="sw-pipe-primary rounded-xl px-3 py-2 text-xs font-bold" onClick={()=>setTab("discover")}>Review candidates</button></div>,"p-4")}
   </div>}
  {tab==="discover"&&<section className="grid gap-3 lg:grid-cols-2">{CANDIDATES.map(c=><article key={c.id} className={cls+" p-4"}><div className="flex items-center justify-between"><span className="text-xs sw-pipe-accent">Review first · score {c.score}/100</span><strong className="text-sm">{c.price}</strong></div><h2 className="mt-2 text-base font-semibold">{c.title}</h2><p className="mt-2 text-xs sw-pipe-muted">{c.reason}</p><p className="mt-2 text-xs sw-pipe-warning"><ShieldAlert size={13} className="inline"/> {c.risk}</p><div className="mt-4 flex gap-2"><button className="rounded-lg border sw-pipe-line px-3 py-2 text-xs" onClick={()=>saveCandidate(c)}>Save locally</button><a className="rounded-lg border sw-pipe-line px-3 py-2 text-xs" href={c.url} target="_blank" rel="noopener noreferrer">Full posting <ExternalLink size={12} className="inline"/></a></div></article>)}</section>}
  {tab==="agents"&&<section className="grid gap-2 lg:grid-cols-2">{WORKFLOW.map(t=><article key={t.id} className={cls+" p-4"}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{t.name}</strong><span className="text-[10px] sw-pipe-accent">{t.state}</span></div><small className="sw-pipe-accent">{t.agent}</small><p className="mt-2 text-xs sw-pipe-muted">{t.detail}</p></article>)}</section>}
  {tab==="approvals"&&<section className={cls+" p-4"}><h2 className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18}/> Approval desk</h2><p className="mt-2 text-xs sw-pipe-muted">These are planning approvals stored only in this browser session. They do not authorize an Upwork submission.</p>{CANDIDATES.map(c=><label key={c.id} className="mt-3 flex items-center gap-3 rounded-xl border sw-pipe-line p-3 text-xs"><input type="checkbox" checked={!!approvals[c.id]} onChange={e=>setApprovals(s=>({...s,[c.id]:e.target.checked}))}/><span>Request a tailored proposal draft for: {c.title}</span></label>)}<button className="sw-pipe-control mt-4 rounded-xl border px-3 py-2 text-xs" onClick={()=>{const names=CANDIDATES.filter(c=>approvals[c.id]).map(c=>c.title); if(!names.length)return setMessage("Select at least one opportunity."); navigator.clipboard?.writeText("Draft and review only; do not submit. Jobs: "+names.join("; "));setMessage("Draft request copied. Paste into Sync Assist; no automated job was launched.");}}>Copy draft request</button></section>}
  {message&&<p role="status" className="rounded-lg border sw-pipe-line sw-pipe-inset px-3 py-2 text-xs">{message}</p>}
  <footer className="mt-auto flex flex-wrap justify-between gap-2 border-t sw-pipe-line pt-3 text-[10px] sw-pipe-muted"><span>Snapshot at {new Date(SNAPSHOT_AT).toLocaleString()} · Live Upwork API not connected to SyncWorks</span><button className="underline" onClick={()=>nav("/customer/freelance/earnings")}>Open earnings ledger</button></footer>
  {current&&<div className="fixed inset-0 z-[1000] flex items-center justify-center sw-pipe-overlay p-3" onMouseDown={()=>setSelected(null)}><aside role="dialog" aria-modal="true" aria-label="Application detail" onMouseDown={e=>e.stopPropagation()} className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-2xl border sw-pipe-line sw-pipe-modal p-5 shadow-2xl"><div className="flex justify-between"><span className="text-xs sw-pipe-accent">{current.stage}</span><button onClick={()=>setSelected(null)} aria-label="Close"><X size={19}/></button></div><h2 className="mt-2 text-lg font-semibold">{current.title}</h2><p className="mt-3 text-xs sw-pipe-muted">{current.details}</p><p className="mt-3 text-xs sw-pipe-accent">{current.note}</p><p className="mt-4 text-xs">Assigned: {current.bot} · Proposal ID: {current.id}</p><p className="mt-2 text-xs sw-pipe-muted">Last verified November 25, 2026. Do not interpret local tracking as a current Upwork status.</p><div className="mt-5 flex gap-2"><a href={current.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border sw-pipe-line px-3 py-2 text-xs">View Upwork record</a><button className="rounded-xl border sw-pipe-line px-3 py-2 text-xs" onClick={()=>{setSelected(null);nav("/sync/assist");}}>Ask Victoria</button></div></aside></div>}
 </main>;
}

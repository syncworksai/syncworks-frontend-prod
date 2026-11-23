import React,{useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate} from "react-router-dom";
import {ArrowLeft,ArrowUpRight,Activity,Bot,BriefcaseBusiness,Check,ChevronRight,Coins,FileText,FolderKanban,LayoutGrid,Link2,Search,Settings2,ShieldAlert,Sparkles,Wallet,X} from "lucide-react";
import {useWorkspaceAppearance,WORKSPACE_THEMES} from "../components/customer/CustomerWorkspace";
import FreelanceOverviewDashboard from "./FreelanceOverviewDashboard";
import FreelanceJobsPage from "./FreelanceJobsPage";
import FreelanceProjectsPage from "./FreelanceProjectsPage";
import FreelanceAutomationStudio from "./FreelanceAutomationStudio";
import FreelanceCloudLedger from "./FreelanceCloudLedger";
import FreelanceExecutionControl from "./FreelanceExecutionControl";
import FreelanceBackendStatus from "./FreelanceBackendStatus";
import "./FreelanceUpworkDesk.css";
import "./FreelanceWorkspaceShell.css";

const SECTIONS=[
 ["overview","Overview",LayoutGrid,"Founder command","Your work, assignments and metrics in one view."],
 ["upwork","Upwork Desk",BriefcaseBusiness,"Upwork Desk","Review the first submitted proposal and its application cost."],
 ["jobs","Jobs",Search,"Opportunity Intelligence","Filter, qualify and score jobs before applying."],
 ["proposals","Proposals",FileText,"Proposal Pipeline","Separate drafts, applications and interviews."],
 ["projects","Projects",FolderKanban,"Project Operations","Track authorized assignments and delivery milestones."],
 ["studio","Automation Studio",Sparkles,"Automation Studio","Practice CSV validation with synthetic, non-confidential files."],
 ["earnings","Earnings",Wallet,"Finance & Earnings","Separate expected revenue, contracted work and received cash."],
 ["connections","Connections",Link2,"Integrations","Review which external services are actually connected."],
 ["jarvis","Jarvis",Bot,"AI Operations","Plan and review work with approval gates."],
 ["updates","Updates",Activity,"Activity Center","Review recorded changes and upcoming actions."],
];
const fmt=n=>Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const PIPELINE=["Saved","Proposal drafted","Applied","Interview","Contracted","In progress","Submitted","Paid","Declined"];
const FIRST_ID="2124993311948001281";
const SIMPLE_PANELS=[
 ["Proposal reviews","Review and track applications","proposals",FileText],
 ["Active project work","Scope, deliverables and QA","projects",FolderKanban],
 ["Earnings ledger","Paid and prospective separated","earnings",Wallet],
 ["AI operations","Planning and controlled tasks","jarvis",Bot],
];
export default function FreelanceWorkspaceShell({section,items,totals,addJob,updateJob,deleteJob,updatedAt}){
 const nav=useNavigate();
 const [appearance]=useWorkspaceAppearance();
 const [drawer,setDrawer]=useState(null);
 const [notice,setNotice]=useState("");
 const [expandedId,setExpandedId]=useState("");
 const [jobNotes,setJobNotes]=useState("");
 const meta=SECTIONS.find(x=>x[0]===section)||SECTIONS[0];
 const current=items.filter(j=>j.status!=="Declined");
 const applied=items.filter(j=>["Applied","Interview"].includes(j.status)).length;
 const active=items.filter(j=>["Contracted","In progress","Submitted"].includes(j.status)).length;
 const recordedPaid=items.filter(j=>j.status==="Paid").reduce((sum,j)=>sum+Number(j.budget||0),0);
 const summary=[
  ["Tracked",items.length,"Browser-local opportunities",BriefcaseBusiness],
  ["Proposals",applied,"Submitted or interviewing",FileText],
  ["Working",active,"Local active assignments",FolderKanban],
  ["Recorded paid",fmt(recordedPaid),"Manual, not reconciled",Wallet]
 ];
 useEffect(()=>{if(!drawer)return;const key=e=>{if(e.key==="Escape")setDrawer(null);};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[drawer]);
 const go=id=>{if(id==="upwork")return nav("/customer/freelance/upwork");nav("/customer/freelance/"+id);setDrawer(null)};
 const trackFirst=()=>{
  if(items.some(j=>j.proposalId===FIRST_ID)){setNotice("This proposal is already tracked locally.");return;}
  addJob({title:"Manual Amazon Product Research and Spreadsheet Curation",platform:"Upwork",url:"https://www.upwork.com/jobs/~022124978383444007582",budget:30,type:"Fixed price",status:"Applied",proposalId:FIRST_ID,upworkJobId:"2124978383444007582",connectsSpent:8,source:"Verified Upwork snapshot via ChatGPT 2026-11-23"});
  setNotice("First Upwork proposal added to local pipeline.");
 };
 const renderWorkspace=()=>{
  if(drawer==="overview")return <FreelanceOverviewDashboard items={items} totals={totals}/>;
  if(drawer==="jobs")return <FreelanceJobsPage items={items} addJob={addJob} updateJob={updateJob} deleteJob={deleteJob}/>;
  if(drawer==="projects")return <FreelanceProjectsPage items={items} updateJob={updateJob}/>;
  if(drawer==="studio")return <div className="sw-freelance-drawer-stack"><FreelanceExecutionControl/><details className="sw-upwork-drawer-card"><summary style={{cursor:"pointer",fontWeight:750}}>Open local CSV demo (browser-only)</summary><div style={{paddingTop:12}}><FreelanceAutomationStudio items={items} updateJob={updateJob}/></div></details></div>;
  if(drawer==="proposals")return <div className="sw-freelance-drawer-stack">{items.filter(j=>["Proposal drafted","Applied","Interview"].includes(j.status)).length===0?<div className="sw-upwork-drawer-card"><h3>No proposal records in this browser</h3><p>Upwork application #2124993311948001281 was submitted through ChatGPT. Add it to the browser-local pipeline from Upwork Desk, or use the button below.</p><button className="sw-upwork-action" onClick={trackFirst}>Track the first proposal</button></div>:items.filter(j=>["Proposal drafted","Applied","Interview"].includes(j.status)).map(j=><article className="sw-upwork-drawer-card" key={j.id}><h3>{j.title}</h3><p>{j.platform||"Freelance"} · {fmt(j.budget)} potential · {j.status}</p><p>Internal status only, not verified with Upwork.</p><label className="sw-upwork-field">Local stage<select value={j.status} onChange={e=>updateJob(j.id,{status:e.target.value})}>{PIPELINE.map(s=><option key={s}>{s}</option>)}</select></label><button type="button" className="sw-upwork-action" onClick={()=>{setExpandedId(expandedId===j.id?"":j.id);setJobNotes(j.notes||"");}}>Notes <ChevronRight size={14}/></button>{expandedId===j.id&&<><textarea className="sw-freelance-input" value={jobNotes} onChange={e=>setJobNotes(e.target.value)} rows={4}/><button className="sw-upwork-action" onClick={()=>{updateJob(j.id,{notes:jobNotes});setExpandedId("");}}>Save notes locally</button></>}</article>)}</div>;
  if(drawer==="earnings")return <FreelanceCloudLedger/>;
  if(drawer==="connections")return <div className="sw-freelance-drawer-stack">{[["Upwork","Connected in ChatGPT only","SyncWorks does not have Upwork server OAuth. Automated client and payment status updates are not enabled."],["Sync Assist","Separate workspace","Planning exists; no autonomous Upwork submission or delivery workflow."],["Payment reconciliation","Not connected","Do not treat manually marked Paid as a verified deposit."],["Synthetic worker","Founder-only API deployed","Synthetic queue is available in Automation Studio; separate scheduled worker execution is still disabled pending validation."]].map(([name,state,desc])=><div className="sw-upwork-drawer-card" key={name}><h3>{name}</h3><p><strong>{state}</strong></p><p>{desc}</p></div>)}</div>;
  if(drawer==="jarvis")return <div className="sw-freelance-drawer-stack"><div className="sw-upwork-drawer-card"><h3>Freelance Manager / Jarvis</h3><p>Use AI for job triage, honest proposal drafts, processing plans and quality checks. No automatic bidding or Upwork messaging is enabled.</p></div>{["Evaluate a job for profit, risks, scope and allowed automation.","Draft an accurate proposal using only my real experience.","Prepare a quality-control and approval plan for synthetic CSV processing."].map(p=><button key={p} className="sw-freelance-task" type="button" onClick={()=>{navigator.clipboard?.writeText(p).catch(()=>{});nav("/sync/assist")}}><Bot size={16}/><span>{p}</span><ArrowUpRight size={15}/></button>)}<button className="sw-upwork-action" onClick={()=>nav("/sync/assist")}>Open Sync Assist</button></div>;
  if(drawer==="updates")return <div className="sw-freelance-drawer-stack"><div className="sw-upwork-drawer-card"><h3>Upwork first proposal confirmed</h3><p>November 23, 2026 · #2124993311948001281 · $30 fixed · 8 Connects, no boost</p><p>This is a dated verification, not current live Upwork status.</p></div><div className="sw-upwork-drawer-card"><h3>Local pilot status</h3><p>{updatedAt?"Last local edit: "+new Date(updatedAt).toLocaleString():"No local edits recorded."}</p></div><button className="sw-upwork-action" onClick={()=>go("upwork")}>Open Upwork Desk</button></div>;
  return null;
 };
 const ActiveIcon=meta[2];
 return <div className="sw-upwork-stage sw-freelance-unified" data-upwork-theme={WORKSPACE_THEMES.includes(appearance.theme)?appearance.theme:"legacy"} data-upwork-motion={appearance.motion===false?"off":"on"}>
  <div className="sw-upwork-room"><div className="sw-upwork-art" aria-hidden="true"/><div className="sw-upwork-content sw-freelance-unified-content">
   <header className="sw-upwork-top sw-upwork-glass sw-freelance-unified-top"><div className="sw-upwork-heading"><p className="sw-upwork-kicker"><span className="sw-upwork-live-dot"/> SYNCWORKS / FREELANCE COMMAND</p><h1>{meta[3]}</h1><p className="sw-upwork-lead">{meta[4]}</p></div><div className="sw-freelance-header-buttons"><button className="sw-upwork-icon-button" type="button" aria-label="Back to customer dashboard" onClick={()=>nav("/customer")}><ArrowLeft size={18}/></button><button className="sw-upwork-action sw-upwork-action-primary" type="button" onClick={()=>setDrawer(section)}><LayoutGrid size={15}/> Open workspace</button></div></header>
   <nav className="sw-freelance-unified-nav" aria-label="Freelance sections">{SECTIONS.map(([id,label,Icon])=><button type="button" key={id} onClick={()=>go(id)} aria-current={section===id?"page":undefined} className={"sw-freelance-tab "+(section===id?"selected":"")}><Icon size={15}/><span>{label}</span></button>)}</nav>
   <div className="sw-upwork-stats">{summary.map(([title,value,description,Icon])=><button className="sw-upwork-glass sw-upwork-metric" onClick={()=>setDrawer(title==="Recorded paid"?"earnings":title==="Proposals"?"proposals":title==="Working"?"projects":"jobs")} type="button" key={title}><span className="sw-upwork-metric-label"><Icon size={15}/>{title}</span><strong>{value}</strong><small>{description}</small></button>)}</div>
   <div className="sw-upwork-main sw-freelance-unified-main">
    <section className="sw-upwork-glass sw-freelance-focus"><div className="sw-upwork-section-head"><span className="sw-upwork-eyebrow"><ActiveIcon size={15}/> {meta[1].toUpperCase()} WORKSPACE</span><span className="sw-freelance-mini-status">Founder pilot</span></div>
     <div className="sw-freelance-focus-center"><div className="sw-freelance-big-icon"><ActiveIcon size={32}/></div><div><h2>{section==="overview"?"Run the freelance business from one place.":meta[3]}</h2><p>{section==="studio"?"Practice with synthetic data. Approval before real client work.":section==="earnings"?"Track cash, obligations and revenue as separate events.":section==="jobs"?"Score each opportunity before spending Connects.":meta[4]}</p></div></div>
     <div className="sw-freelance-focus-actions"><button className="sw-upwork-action sw-upwork-action-primary" onClick={()=>setDrawer(section)} type="button">Open {meta[1]} <ChevronRight size={15}/></button><button className="sw-upwork-action" onClick={()=>go("upwork")} type="button">First Upwork proposal <ArrowUpRight size={14}/></button></div>
    </section>
    <aside className="sw-upwork-insights sw-freelance-right">
     <section className="sw-upwork-glass sw-freelance-insight-card"><div className="sw-upwork-section-head"><span className="sw-upwork-eyebrow">CURRENT FOCUS</span></div><strong>First application submitted</strong><p>Amazon Product Research · $30 proposed · 8 Connects. Awaiting a verified client response.</p><button onClick={()=>go("upwork")} className="sw-upwork-plain" type="button">Review submission <ArrowUpRight size={14}/></button></section>
     <FreelanceBackendStatus onOpen={()=>setDrawer("studio")}/>
    </aside>
   </div>
   <nav className="sw-upwork-quick" aria-label="Business quick actions">{SIMPLE_PANELS.map(([name,IconLabel,id,Icon])=><button className="sw-upwork-glass" type="button" key={id} onClick={()=>setDrawer(id)}><Icon size={17}/><span>{name}</span><ChevronRight size={14}/></button>)}</nav>
   <p className="sw-upwork-footnote">All detailed workspaces open in a drawer · Internal records are browser-local · No autonomous applications or payments</p>
  </div></div>
  {drawer&&createPortal(<div className="sw-upwork-backdrop sw-freelance-drawer-backdrop" data-upwork-theme={appearance.theme} data-upwork-motion={appearance.motion?"on":"off"} onMouseDown={()=>setDrawer(null)}>
   <aside className="sw-upwork-drawer sw-freelance-wide-drawer" role="dialog" aria-modal="true" aria-label={SECTIONS.find(x=>x[0]===drawer)?.[1]||"Workspace"} onMouseDown={e=>e.stopPropagation()}>
    <header className="sw-upwork-drawer-head"><div className="sw-upwork-drawer-title"><div><small>SYNCWORKS / FREELANCE</small><h2>{SECTIONS.find(x=>x[0]===drawer)?.[1]||"Workspace"}</h2></div></div><button className="sw-upwork-icon-button" aria-label="Close drawer" type="button" onClick={()=>setDrawer(null)}><X size={20}/></button></header>
    <div className="sw-upwork-drawer-scroll sw-freelance-drawer-body">{renderWorkspace()}</div>
    <footer className="sw-upwork-drawer-footer">{notice||"Founder-only browser pilot · Client payments and status require independent verification"}</footer>
   </aside>
  </div>,document.body)}
 </div>;
}

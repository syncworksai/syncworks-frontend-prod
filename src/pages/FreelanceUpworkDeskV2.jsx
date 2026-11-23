import React, {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate} from "react-router-dom";
import {ArrowUpRight,BriefcaseBusiness,Bot,Check,CheckCircle2,ChevronRight,Coins,ExternalLink,FileClock,FileText,LayoutGrid,MessageCircle,ShieldCheck,Sparkles,Wallet,X,Activity,Clock3,Search} from "lucide-react";
import {useWorkspaceAppearance} from "../components/customer/CustomerWorkspace";
import "./FreelanceUpworkDesk.css";

const FIRST = {
  title:"Manual Amazon Product Research and Spreadsheet Curation",
  jobUrl:"https://www.upwork.com/jobs/~022124978383444007582",
  proposalId:"2124993311948001281",
  jobId:"2124978383444007582",
  bid:30,
  connects:8,
  verifiedAt:"November 23, 2026",
  letter:`Hello Chin,

I’d be glad to help with the initial six-product Amazon research spreadsheet. Your focus on product judgment, accurate ASINs, exact variants, and original writing matches the way I approach research and data-quality work.

My background includes business operations and project management, and I work with Excel, data cleanup, and online research. For each of your six categories, I’ll manually review candidate listings, verify the exact Amazon.com product and variant available to U.S. shoppers, and record the ASIN, direct URL, date checked, a concise original title, a 20–40-word note, and a clear reason for selecting it. I’ll avoid duplicates and questionable sellers or unsupported claims.

I understand your no-scraping, no-copying requirement and will follow it. I can complete this initial six-product assignment at your listed $30 fixed price, and I’m happy to use your category brief and spreadsheet template.

Best,
Jacob`
};
const stages=["Submitted","Client viewed","Interview","Offer","Hired","Delivered","Paid"];
const money=n=>Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
export default function FreelanceUpworkDesk({items=[],addJob,updateJob}){
 const nav=useNavigate();
 const [appearance]=useWorkspaceAppearance();
 const [panel,setPanel]=useState(null);
 const [notice,setNotice]=useState("");
 const tracked=items.find(j=>j.upworkJobId===FIRST.jobId||j.proposalId===FIRST.proposalId);
 const latestStage=tracked?.status||"Applied";
 const motion=appearance.motion!==false;
 useEffect(()=>{
   if(!panel)return;
   const onKey=e=>{if(e.key==="Escape")setPanel(null)};
   window.addEventListener("keydown",onKey);
   return()=>window.removeEventListener("keydown",onKey);
 },[panel]);
 const track=()=>{
  if(tracked){setPanel("pipeline");return;}
  addJob({title:FIRST.title,platform:"Upwork",url:FIRST.jobUrl,budget:FIRST.bid,type:"Fixed price",status:"Applied",proposalId:FIRST.proposalId,upworkJobId:FIRST.jobId,connectsSpent:FIRST.connects,source:"Verified Upwork snapshot via ChatGPT 2026-11-23"});
  setNotice("Proposal saved in this browser's local pipeline; no new application was sent.");
  setPanel("pipeline");
 };
 const changeStatus=status=>{
   if(!tracked)return;
   updateJob(tracked.id,{status});
   setNotice("Local stage updated. This is not a verified Upwork status.");
 };
 const open=key=>{setNotice("");setPanel(key)};
 const panels={
  proposal:["Proposal details",FileText],
  finances:["Financial breakdown",Wallet],
  pipeline:["Job pipeline",BriefcaseBusiness],
  activity:["Activity & status",Activity],
  jarvis:["AI operations",Bot],
  search:["Find more work",Search]
 };
 const metricData=[
  ["Proposals","01","Submitted · verified",FileClock],
  ["Potential",money(FIRST.bid),"Not earned",Wallet],
  ["Connects",String(FIRST.connects),"Units used · no cash",Coins],
  ["Received","$0.00","Not verified paid",CheckCircle2]
 ];
 return <div className="sw-upwork-stage" data-upwork-theme={appearance.theme||"legacy"} data-upwork-motion={motion?"on":"off"}>
  <div className="sw-upwork-room">
   <div className="sw-upwork-art" aria-hidden="true"/>
   <div className="sw-upwork-content">
    <header className="sw-upwork-top sw-upwork-glass">
     <div className="sw-upwork-heading">
      <p className="sw-upwork-kicker"><span className="sw-upwork-live-dot"/> SYNCWORKS / FREELANCE COMMAND</p>
      <h1>Upwork <span>Desk</span></h1>
      <p className="sw-upwork-lead">One workspace for proposals, deliverables & earnings.</p>
     </div>
     <div className="sw-upwork-header-actions">
      <span className="sw-upwork-connection"><ShieldCheck size={14}/> ChatGPT connected <i/> Site sync pending</span>
      <button className="sw-upwork-action sw-upwork-action-primary" type="button" onClick={()=>open("search")}><Search size={16}/> Find work</button>
      <button className="sw-upwork-icon-button" aria-label="Open activity" title="Activity" onClick={()=>open("activity")} type="button"><Activity size={18}/></button>
     </div>
    </header>
    <div className="sw-upwork-stats" aria-label="Upwork account snapshot">
     {metricData.map(([name,value,caption,Icon],i)=><button type="button" className="sw-upwork-glass sw-upwork-metric" key={name} onClick={()=>open(i===0?"pipeline":i===2?"activity":"finances")}><span className="sw-upwork-metric-label"><Icon size={15}/>{name}</span><strong>{value}</strong><small>{caption}</small></button>)}
    </div>
    <div className="sw-upwork-main">
     <section className="sw-upwork-glass sw-upwork-deal">
      <div className="sw-upwork-section-head"><span className="sw-upwork-eyebrow"><BriefcaseBusiness size={15}/> FEATURED APPLICATION</span><span className="sw-upwork-status"><Check size={13}/> Submitted</span></div>
      <div className="sw-upwork-deal-body">
       <div className="sw-upwork-emblem" aria-hidden="true"><BriefcaseBusiness size={25}/></div>
       <div className="sw-upwork-deal-info">
        <h2>{FIRST.title}</h2>
        <p>Proposal #{FIRST.proposalId}</p>
       </div>
       <div className="sw-upwork-bid"><small>FIXED BID</small><strong>{money(FIRST.bid)}</strong></div>
      </div>
      <div className="sw-upwork-deal-meta">
       <span><Clock3 size={14}/> Less than 1 month</span>
       <span><Coins size={14}/> 8 Connects</span>
       <span><ShieldCheck size={14}/> No bid boost</span>
      </div>
      <div className="sw-upwork-deal-bottom">
       <p><span className="sw-upwork-live-dot"/> Awaiting client response <small>· verified {FIRST.verifiedAt}</small></p>
       <div className="sw-upwork-deal-actions">
        <button type="button" className="sw-upwork-action sw-upwork-action-primary" onClick={()=>open("proposal")}>View proposal <ChevronRight size={15}/></button>
        <button type="button" className="sw-upwork-action" onClick={track}>{tracked?"Open pipeline":"Track job"}</button>
        <a className="sw-upwork-action sw-upwork-external" href={FIRST.jobUrl} target="_blank" rel="noopener noreferrer" title="View original Upwork posting"><ExternalLink size={15}/><span>Upwork</span></a>
       </div>
      </div>
     </section>
     <aside className="sw-upwork-insights">
      <section className="sw-upwork-glass sw-upwork-timeline">
       <div className="sw-upwork-section-head"><span className="sw-upwork-eyebrow">DEAL PROGRESS</span><button type="button" onClick={()=>open("activity")} className="sw-upwork-plain">Details <ChevronRight size={14}/></button></div>
       <div className="sw-upwork-steps">{stages.map((s,i)=><div key={s} className={"sw-upwork-step "+(i===0?"done":i===1?"current":"")}><span className="sw-upwork-step-marker">{i===0?<Check size={11}/>:i+1}</span><span>{s}</span></div>)}</div>
      </section>
      <section className="sw-upwork-glass sw-upwork-next">
       <div className="sw-upwork-section-head"><span className="sw-upwork-eyebrow"><Sparkles size={14}/> NEXT MOVE</span></div>
       <strong>Stay ready for the response.</strong>
       <p>Continue qualifying jobs while this proposal is pending.</p>
       <div className="sw-upwork-next-buttons"><button type="button" onClick={()=>open("search")}>Find jobs <ArrowUpRight size={13}/></button><button type="button" onClick={()=>open("jarvis")}>AI tools <Bot size={13}/></button></div>
      </section>
     </aside>
    </div>
    <nav className="sw-upwork-quick" aria-label="Upwork quick actions">
     {[["Job pipeline",BriefcaseBusiness,"pipeline"],["Finance ledger",Wallet,"finances"],["Activity log",Activity,"activity"],["AI assistant",Bot,"jarvis"]].map(([title,Icon,key])=><button className="sw-upwork-glass" type="button" key={key} onClick={()=>open(key)}><Icon size={17}/><span>{title}</span><ChevronRight size={15}/></button>)}
    </nav>
    {notice&&<p className="sw-upwork-toast" role="status">{notice}</p>}
    <p className="sw-upwork-footnote">Data verified {FIRST.verifiedAt} through ChatGPT; no live SyncWorks–Upwork feed. Manual entries remain browser-local. No client payment verified.</p>
   </div>
  </div>
  {panel&&createPortal(<div className="sw-upwork-backdrop" data-upwork-theme={appearance.theme||"legacy"} data-upwork-motion={motion?"on":"off"} onMouseDown={()=>setPanel(null)}>
    <aside className="sw-upwork-drawer" role="dialog" aria-modal="true" aria-label={panels[panel][0]} onMouseDown={e=>e.stopPropagation()}>
     <header className="sw-upwork-drawer-head"><div className="sw-upwork-drawer-title">{React.createElement(panels[panel][1],{size:20})}<div><small>SYNCWORKS / UPWORK</small><h2>{panels[panel][0]}</h2></div></div><button className="sw-upwork-icon-button" type="button" onClick={()=>setPanel(null)} aria-label="Close panel"><X size={20}/></button></header>
     <div className="sw-upwork-drawer-scroll">
      {panel==="proposal"&&<><div className="sw-upwork-drawer-card"><small>VERIFIED SUBMISSION</small><h3>{FIRST.title}</h3><p>Submitted November 23, 2026 · ID #{FIRST.proposalId}</p><p>$30 fixed price · Less than 1 month · No attachments · No bid boost</p></div><h3>Sent cover letter</h3><div className="sw-upwork-letter">{FIRST.letter}</div><a className="sw-upwork-action" href={FIRST.jobUrl} target="_blank" rel="noopener noreferrer">Open on Upwork <ExternalLink size={14}/></a></>}
      {panel==="finances"&&<><p>Accounting separates potential income, signed contracts, received payments and Connects usage.</p>{[["Potential contract","$30.00"],["Signed contract","$0.00"],["Verified billed","$0.00"],["Verified received","$0.00"],["Application Connects","8 units"],["Cash cost for free Connects","$0.00"]].map(([a,b])=><div key={a} className="sw-upwork-ledger-row"><span>{a}</span><strong>{b}</strong></div>)}<p className="sw-upwork-caution">This is a snapshot of the first proposal, not reconciled Upwork or banking data. Actual Upwork fees and payout remain unverified.</p><button className="sw-upwork-action" onClick={()=>nav("/customer/freelance/earnings")}>Open earnings workspace</button></>}
      {panel==="pipeline"&&<><div className="sw-upwork-drawer-card"><small>FIRST PROPOSAL</small><h3>{FIRST.title}</h3><p>Upwork submission verified. {tracked?"Tracked locally":"Not yet added to this browser's local pipeline"}.</p></div>{!tracked?<button className="sw-upwork-action sw-upwork-action-primary" type="button" onClick={track}>Add to my pipeline</button>:<><label className="sw-upwork-field">Internal tracking stage<select value={latestStage} onChange={e=>changeStatus(e.target.value)}>{["Applied","Interview","Contracted","In progress","Submitted","Paid","Declined"].map(s=><option key={s}>{s}</option>)}</select></label><p className="sw-upwork-caution">Manual stage updates are not confirmation of client acceptance or payment.</p></>}{notice&&<p role="status">{notice}</p>}<button className="sw-upwork-action" onClick={()=>nav("/customer/freelance/proposals")}>Open all proposals</button></>}
      {panel==="activity"&&<><div className="sw-upwork-drawer-card"><small>VERIFICATION SNAPSHOT</small><h3>Application sent</h3><p>November 23, 2026</p><p>Upwork confirmed proposal #{FIRST.proposalId} with $30 fixed bid, 8 Connects and no boost.</p></div><div className="sw-upwork-ledger-row"><span>Client viewed at verification</span><strong>No</strong></div><div className="sw-upwork-ledger-row"><span>Interview / offer</span><strong>Not verified</strong></div><div className="sw-upwork-ledger-row"><span>Payment</span><strong>Not verified</strong></div><p className="sw-upwork-caution">Status may have changed since the snapshot. Check Upwork for current results.</p><a className="sw-upwork-action" href={FIRST.jobUrl} target="_blank" rel="noopener noreferrer">Check on Upwork <ExternalLink size={14}/></a></>}
      {panel==="jarvis"&&<><div className="sw-upwork-drawer-card"><small>CONTROLLED ASSISTANCE</small><h3>AI Freelance Operations</h3><p>Evaluate jobs, draft messages and plan deliverables. Actions still require review and authorization.</p></div>{[["Evaluate job","Assess budget, scope and quality risks."],["Draft proposal","Tailor the bid to my real experience."],["Prepare work plan","Outline manual validation and deliverable QA."]].map(([label,description])=><div className="sw-upwork-ledger-row" key={label}><span><strong>{label}</strong><small>{description}</small></span><button type="button" className="sw-upwork-plain" onClick={()=>nav("/customer/freelance/jarvis")}>Open <ChevronRight size={13}/></button></div>)}<button type="button" className="sw-upwork-action" onClick={()=>nav("/sync/assist")}>Open Sync Assist <Bot size={14}/></button></>}
      {panel==="search"&&<><div className="sw-upwork-drawer-card"><small>DISCOVERY</small><h3>Qualify the next job</h3><p>Choose lower-competition, payment-verified work aligned with research, Excel or CSV skills. Check work terms before bidding.</p></div><a className="sw-upwork-action sw-upwork-action-primary" href="https://www.upwork.com/nx/find-work/" target="_blank" rel="noopener noreferrer">Open Upwork search <ExternalLink size={14}/></a><button className="sw-upwork-action" type="button" onClick={()=>nav("/customer/freelance/jobs")}>Open local jobs workspace</button></>}
     </div>
     <footer className="sw-upwork-drawer-footer">Founder pilot · No autonomous submissions · No live Upwork website connection</footer>
    </aside>
   </div>,document.body)}
 </div>;
}

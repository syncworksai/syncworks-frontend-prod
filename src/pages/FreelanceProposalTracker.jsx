import React,{useCallback,useEffect,useMemo,useState} from "react";
import api from "../api/client";
import {Activity,CheckCircle2,Cloud,ExternalLink,RefreshCw,ShieldAlert,Wallet} from "lucide-react";
import "./FreelanceProposalTracker.css";

const ROOT="/sync-ai/freelance/pilot/business-ledger/";
// Read back in ChatGPT directly from connected Upwork on November 25, 2026.
// IMPORTANT: static verification snapshots, never a live provider feed.
const SNAPSHOTS=[
 {proposalId:"2125302184257974793",upworkJobId:"2125160830223473195",
  title:"AI Research Assistant (Remote, Part-Time) — UpForward",
  url:"https://www.upwork.com/jobs/~022125160830223473195",
  statusLabel:"Invitation accepted",hourlyRate:"30.00",connects:0,viewed:false,
  summary:"$30/hour · not contracted · client has not viewed proposal",
  notes:"Proposal #2125302184257974793; Upwork status Activated = invitation accepted (not hired). $30/hour, 0 Connects for application, no boost; viewedByClient=false on 2026-11-25. IMPORTANT: proposal terms contain a 15% rate increase every 3 months. Previously reported client suspension; verify restrictions before future action.",
  proposalUrl:"https://www.upwork.com/nx/proposals/interview/uid/2125302184257974793",
  expected:"0.00"},
 {proposalId:"2124993311948001281",upworkJobId:"2124978383444007582",
  title:"Manual Amazon Product Research and Spreadsheet Curation",
  url:"https://www.upwork.com/jobs/~022124978383444007582",
  statusLabel:"Submitted — awaiting client",hourlyRate:null,connects:8,viewed:false,
  summary:"$30 fixed · 8 Connects spent · client has not viewed proposal",
  notes:"Proposal #2124993311948001281; Upwork Accepted = submitted, NOT client acceptance. Fixed $30; no boost; 8 Connects spent, not equivalent to $8 cash. viewedByClient=false on 2026-11-25. Competition: 33 proposals, 8 opened, 2 applicants messaged at last check.",
  proposalUrl:"https://www.upwork.com/jobs/~022124978383444007582",
  expected:"30.00"}
];
const money=x=>Number(x||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
export default function FreelanceProposalTracker(){
 const [records,setRecords]=useState([]),[connected,setConnected]=useState(false);
 const [busy,setBusy]=useState(""),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [selected,setSelected]=useState(SNAPSHOTS[0].proposalId);
 const refresh=useCallback(async()=>{
  try{
   const {data}=await api.get(ROOT);
   setRecords(data.records||[]);setConnected(true);setError("");
  }catch(e){setConnected(false);setError(e.response?.status===403?"Your founder account is not authorized for the cloud ledger.":"Cloud ledger unavailable. Your existing Upwork proposals are not affected.");}
 },[]);
 useEffect(()=>{refresh()},[refresh]);
 const active=SNAPSHOTS.find(j=>j.proposalId===selected)||SNAPSHOTS[0];
 const cloud=useMemo(()=>records.find(x=>x.category==="JOB"&&x.upwork_job_id===active.upworkJobId),[records,active]);
 const inCloud=useMemo(()=>new Set(records.filter(x=>x.category==="JOB").map(x=>x.upwork_job_id)),[records]);
 const save=async job=>{
  setBusy(job.proposalId);setError("");setMessage("");
  const payload={
   category:"JOB",title:job.title.slice(0,140),url:job.url,
   upwork_job_id:job.upworkJobId,status:"APPLIED",expected_gross:job.expected,
   contract_gross:"0.00",billed_gross:"0.00",paid_gross:"0.00",
   connects_used:job.connects,connects_unit_cost:"0.00",cash_spent:"0.00",
   source:"MANUAL",notes:"Manual entry based on Upwork account review 2026-11-25. "+job.notes
  };
  try{
   await api.post(ROOT,payload);await refresh();setMessage("Saved to the founder cloud ledger. Upwork itself was not changed.");
  }catch(e){
   if(e.response?.status===409){await refresh();setMessage("This application was already recorded; no duplicate created.");}
   else setError("Cloud save failed. "+(typeof e.response?.data?.detail==="string"?e.response.data.detail:"Please retry from this workspace."));
  }finally{setBusy("")}
 };
 return <section className="sw-tracker" aria-label="Freelance proposal cloud tracking">
  <header className="sw-tracker-top"><div><strong><Cloud size={16}/> Application Command Desk</strong><p>Dated Upwork verification · cloud storage is separate from live provider status</p></div><button type="button" disabled={!!busy} onClick={refresh}><RefreshCw size={15}/> Refresh cloud</button></header>
  {message&&<p className="sw-tracker-message" role="status"><CheckCircle2 size={14}/>{message}</p>}
  {error&&<p className="sw-tracker-message error" role="alert"><ShieldAlert size={14}/>{error}</p>}
  <div className="sw-tracker-body">
   <aside className="sw-tracker-list"><div className="sw-tracker-list-head">APPLICATIONS <span>{SNAPSHOTS.length} checked</span></div>{SNAPSHOTS.map(job=><button type="button" key={job.proposalId} onClick={()=>setSelected(job.proposalId)} className={"sw-tracker-record "+(selected===job.proposalId?"selected":"")}><strong>{job.title}</strong><span>{job.statusLabel}</span><small>{inCloud.has(job.upworkJobId)?"In cloud ledger":"Not yet saved to cloud"}</small></button>)}
   <button type="button" className="sw-tracker-ledgerlink" onClick={()=>{const target=document.querySelector('[data-freelance-ledger-action]');if(target)target.click()}}>Full ledger <Wallet size={13}/></button>
   </aside>
   <article className="sw-tracker-detail">
    <div className="sw-tracker-detail-heading"><div><small>UPWORK PROPOSAL · LAST CHECKED NOVEMBER 25</small><h3>{active.title}</h3><p>{active.summary}</p></div><span className="sw-tracker-state">{active.statusLabel}</span></div>
    <div className="sw-tracker-metrics"><div><small>Client viewed?</small><strong>{active.viewed?"Yes":"Not yet"}</strong></div><div><small>Connects spent on application</small><strong>{active.connects}</strong></div><div><small>Contracted revenue</small><strong>$0.00</strong></div><div><small>Verified paid</small><strong>$0.00</strong></div></div>
    {active.proposalId==="2125302184257974793"&&<div className="sw-tracker-alert"><ShieldAlert size={15}/><span>UpForward includes a 15% scheduled raise every 3 months. We cannot remove that with the available integration; review it with the client before agreeing to a contract. The earlier account-suspension warning also warrants caution.</span></div>}
    <div className="sw-tracker-actions"><a href={active.proposalUrl} target="_blank" rel="noopener noreferrer">Open on Upwork <ExternalLink size={13}/></a>{cloud?<span className="sw-tracker-cloud-ok"><CheckCircle2 size={15}/> Saved in secure ledger · manual status</span>:<button type="button" disabled={busy===active.proposalId||!connected} onClick={()=>save(active)}><Cloud size={15}/>{busy===active.proposalId?"Saving…":"Save checked application to cloud"}</button>}</div>
    <p className="sw-tracker-warning"><Activity size={14}/> Refresh cloud checks only SyncWorks records. It does not check Upwork for messages or changing proposal statuses. Update status only after independently verifying a client action.</p>
   </article>
  </div>
 </section>;
}

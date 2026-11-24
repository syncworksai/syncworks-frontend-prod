import React,{useCallback,useEffect,useMemo,useState} from "react";
import api from "../api/client";
import {AlertTriangle,CheckCircle2,Cloud,Download,FileSpreadsheet,Play,Plus,RefreshCw,ShieldCheck,SlidersHorizontal,TerminalSquare,XCircle} from "lucide-react";
import "./FreelanceStudioConsole.css";

const ROOT="/sync-ai/freelance/pilot/synthetic-jobs/";
const ACCESS="/sync-ai/freelance/pilot/access/";
const label=state=>({QUEUED:"Queued",RUNNING:"Processing",REVIEW:"Needs review",APPROVED:"Approved",CANCELLED:"Cancelled",FAILED:"Failed"}[state]||state);
const detail=value=>typeof value==="string"?value:typeof value?.detail==="string"?value.detail:"The request could not be completed.";
function saveDownload(name,content){
 const data=Uint8Array.from(atob(content),letter=>letter.charCodeAt(0));
 const uri=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a");link.href=uri;link.download=name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(uri),1500);
}

export default function FreelanceExecutionControl({demo}){
 const [tab,setTab]=useState("jobs");
 const [jobs,setJobs]=useState([]),[selected,setSelected]=useState(null);
 const [loading,setLoading]=useState(true),[connected,setConnected]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [rowCount,setRowCount]=useState(100),[seed,setSeed]=useState(42),[queueConsent,setQueueConsent]=useState(false);
 const [runConsents,setRunConsents]=useState({}),[reviewConsents,setReviewConsents]=useState({});
 const refresh=useCallback(async()=>{
   setLoading(true);setError("");
   try{
     const [access,queue]=await Promise.all([api.get(ACCESS),api.get(ROOT)]);
     if(!access?.data?.enabled)throw new Error("Founder access was not granted.");
     const records=queue?.data?.jobs||[];
     setConnected(true);setJobs(records);
     setSelected(current=>current&&records.some(j=>j.id===current)?current:records[0]?.id||null);
   }catch(e){
     setConnected(false);setError(e.response?.status===403?"Your signed-in account does not have founder access.":detail(e.response?.data||e.message));
   }finally{setLoading(false)}
 },[]);
 useEffect(()=>{refresh()},[refresh]);
 const job=useMemo(()=>jobs.find(x=>x.id===selected)||null,[jobs,selected]);
 const pending=jobs.filter(j=>j.state==="QUEUED").length;
 const needsReview=jobs.filter(j=>j.state==="REVIEW").length;
 const formInput=e=>{if(e.target.name==="rows")setRowCount(e.target.value);else setSeed(e.target.value)};
 const queue=async(e)=>{
   e.preventDefault();if(!queueConsent)return;
   setBusy(true);setError("");setNotice("");
   try{
     const {data}=await api.post(ROOT,{row_count:Number(rowCount),seed:Number(seed),consent_synthetic_only:true});
     setQueueConsent(false);setTab("jobs");await refresh();setSelected(data?.job?.id||null);
     setNotice("Synthetic test queued. It has not executed or incurred AI costs.");
   }catch(e){setError(detail(e.response?.data||e.message))}finally{setBusy(false)}
 };
 const run=async()=>{
   if(!job||!runConsents[job.id])return;
   setBusy(true);setError("");setNotice("");
   try{
     const {data}=await api.post(ROOT+job.id+"/run-test/",{consent_synthetic_only:true});
     setRunConsents(v=>({...v,[job.id]:false}));await refresh();
     setNotice(data?.job?.state==="REVIEW"?"Execution completed. Inspect the quality report before approval.":"Check the updated job status.");
   }catch(e){setError(e.response?.status===403?"Single-test execution is currently disabled or access was denied.":detail(e.response?.data||e.message))}finally{setBusy(false)}
 };
 const decide=async decision=>{
   if(!job||(decision==="approve"&&!reviewConsents[job.id]))return;
   setBusy(true);setError("");setNotice("");
   try{
     await api.post(ROOT+job.id+"/",{decision});
     setReviewConsents(v=>({...v,[job.id]:false}));await refresh();
     setNotice(decision==="approve"?"Result approved for private download only. No Upwork delivery occurred.":"Test job cancelled.");
   }catch(e){setError(detail(e.response?.data||e.message))}finally{setBusy(false)}
 };
 const download=async()=>{
   if(!job)return;
   setBusy(true);setError("");
   try{
     const {data}=await api.get(ROOT+job.id+"/download/");
     if(!data.synthetic_only)throw Error("Only synthetic CSV is permitted.");
     saveDownload(data.filename||"synthetic-cleaned.csv",data.content_base64);
     setNotice("Synthetic CSV downloaded locally. No external delivery was made.");
   }catch(e){setError(detail(e.response?.data||e.message))}finally{setBusy(false)}
 };
 return <section className="sw-studio-console" aria-label="Freelance synthetic execution console">
   <header className="sw-studio-toolbar">
     <div className="sw-studio-toolbar-heading"><span className={"sw-studio-signal "+(connected?"connected":"")}/><span>{loading?"Checking backend":connected?"Founder backend connected":"Backend unavailable"}</span><small>Synthetic only · $0 AI spend</small></div>
     <button type="button" className="sw-studio-mini-btn" onClick={refresh} disabled={loading||busy}><RefreshCw size={14}/> <span>Refresh</span></button>
   </header>
   <nav className="sw-studio-tabs" aria-label="Automation Studio views">
     <button type="button" className={tab==="jobs"?"active":""} onClick={()=>setTab("jobs")}><TerminalSquare size={16}/> Work queue <span className="sw-studio-count">{jobs.length}</span></button>
     <button type="button" className={tab==="new"?"active":""} onClick={()=>setTab("new")}><Plus size={16}/> New test</button>
     <button type="button" className={tab==="demo"?"active":""} onClick={()=>setTab("demo")}><FileSpreadsheet size={16}/> Local CSV lab</button>
   </nav>
   {(error||notice)&&<div className={"sw-studio-feedback "+(error?"error":"")} role={error?"alert":"status"}>{error?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}<span>{error||notice}</span><button type="button" aria-label="Dismiss message" onClick={()=>{setError("");setNotice("")}}>×</button></div>}
   <div className="sw-studio-panel" data-mode={tab}>
     {tab==="jobs"&&<div className="sw-studio-jobs">
       <aside className="sw-studio-job-list" aria-label="Synthetic job records">
         <div className="sw-studio-mini-heading"><strong>Recorded tests</strong><span>{pending} queued · {needsReview} reviews</span></div>
         <div className="sw-studio-list-items">
           {jobs.length===0?<p className="sw-studio-muted">No synthetic jobs. Use New test to create one.</p>:jobs.map(j=><button type="button" key={j.id} className={"sw-studio-job-item "+(selected===j.id?"selected":"")} onClick={()=>setSelected(j.id)}>
             <span className="sw-studio-job-item-top"><strong>{j.row_count} rows</strong><span className={"sw-studio-state state-"+j.state.toLowerCase()}>{label(j.state)}</span></span>
             <span className="sw-studio-muted">{new Date(j.created_at).toLocaleString()} · {j.attempts} attempts</span>
           </button>)}
         </div>
         <button type="button" className="sw-studio-bottom-action" onClick={()=>setTab("new")}><Plus size={14}/> New synthetic test</button>
       </aside>
       <section className="sw-studio-detail" aria-label="Selected job details">
         {job?<><div className="sw-studio-detail-head"><div><small>SELECTED TEST</small><h3>{job.row_count} simulated records</h3><p>Seed {job.seed??42} · Attempt {job.attempts} · No client files</p></div><span className={"sw-studio-state state-"+job.state.toLowerCase()}>{label(job.state)}</span></div>
           {(job.state==="REVIEW"||job.state==="APPROVED")&&<div className="sw-studio-report">{[["Source rows",job.result?.source_rows],["Cleaned",job.result?.cleaned_rows],["Duplicates",job.result?.duplicates_removed],["Flagged",job.result?.flagged_count]].map(([name,value])=><div key={name}><small>{name}</small><strong>{value??"—"}</strong></div>)}</div>}
           {job.error_code&&<p className="sw-studio-error-line">{job.error_code}</p>}
           <div className="sw-studio-workflow"><span className={job.state!=="QUEUED"?"done":""}>1. Queue</span><span className={["REVIEW","APPROVED"].includes(job.state)?"done":""}>2. Execute</span><span className={job.state==="APPROVED"?"done":""}>3. Review</span><span>4. Download</span></div>
           {job.state==="QUEUED"&&<div className="sw-studio-task-action"><label><input type="checkbox" checked={!!runConsents[job.id]} onChange={e=>setRunConsents(v=>({...v,[job.id]:e.target.checked}))}/> I authorize running this one synthetic test now.</label><button className="sw-studio-primary" type="button" disabled={busy||!connected||!runConsents[job.id]} onClick={run}><Play size={15}/> Run this test</button><small>One-time founder action · background worker disabled</small></div>}
           {job.state==="REVIEW"&&<div className="sw-studio-task-action"><label><input type="checkbox" checked={!!reviewConsents[job.id]} onChange={e=>setReviewConsents(v=>({...v,[job.id]:e.target.checked}))}/> I reviewed the synthetic report and approve private download.</label><button className="sw-studio-primary" type="button" disabled={busy||!reviewConsents[job.id]} onClick={()=>decide("approve")}><ShieldCheck size={15}/> Approve result</button></div>}
           {job.state==="APPROVED"&&<div className="sw-studio-task-action"><p className="sw-studio-muted">Approved for private download. No client delivery is connected.</p><button className="sw-studio-primary" type="button" disabled={busy} onClick={download}><Download size={15}/> Download cleaned CSV</button></div>}
           {job.state==="RUNNING"&&<p className="sw-studio-muted">The server is processing this job. Refresh its status to check the result.</p>}
           {job.state==="FAILED"&&<p className="sw-studio-muted">The worker failed. Inspect the error and cancel if appropriate.</p>}
           {job.state==="CANCELLED"&&<p className="sw-studio-muted">This test was cancelled. Create a fresh job to try again.</p>}
           {["QUEUED","REVIEW","FAILED"].includes(job.state)&&<button className="sw-studio-secondary" type="button" disabled={busy} onClick={()=>decide("cancel")}><XCircle size={14}/> Cancel selected test</button>}
         </>:<div className="sw-studio-empty"><Cloud size={28}/><strong>No test selected</strong><p>Choose a job to inspect it or create a synthetic sample.</p></div>}
       </section>
     </div>}
     {tab==="new"&&<form className="sw-studio-create" onSubmit={queue}>
       <div className="sw-studio-create-heading"><SlidersHorizontal size={21}/><div><h3>Queue synthetic work</h3><p>Fabricated data only. No AI providers or Upwork calls.</p></div></div>
       <div className="sw-studio-create-fields"><label>Simulated rows (1–1,000)<input name="rows" type="number" min="1" max="1000" step="1" required value={rowCount} onChange={formInput}/></label><label>Reproducible seed<input name="seed" type="number" min="0" max="999999" required value={seed} onChange={formInput}/></label></div>
       <label className="sw-studio-consent"><input type="checkbox" checked={queueConsent} onChange={e=>setQueueConsent(e.target.checked)}/> I authorize creating one simulated-data job. No client files.</label>
       <div className="sw-studio-actions"><button type="button" className="sw-studio-secondary" onClick={()=>setTab("jobs")}>Back to queue</button><button type="submit" className="sw-studio-primary" disabled={!queueConsent||busy||!connected}><Plus size={15}/> Queue test</button></div>
     </form>}
     {tab==="demo"&&<div className="sw-studio-demo"><div className="sw-studio-demo-head"><FileSpreadsheet size={18}/><div><strong>Local CSV practice</strong><p>Browser-only. Use non-confidential example data.</p></div></div><div className="sw-studio-demo-body">{demo||<p className="sw-studio-muted">The CSV practice lab is not available.</p>}</div></div>}
   </div>
   <footer className="sw-studio-footnote"><ShieldCheck size={13}/> Founder-only pilot · Synthetic tests require explicit approval · Upwork sync and paid AI disabled</footer>
 </section>;
}

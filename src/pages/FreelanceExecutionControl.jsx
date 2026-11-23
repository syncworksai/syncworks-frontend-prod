import React,{useCallback,useEffect,useMemo,useState} from "react";
import api from "../api/client";
import {Activity,AlertTriangle,CheckCircle2,Cloud,Download,FileSpreadsheet,Play,RefreshCw,ShieldCheck,Trash2} from "lucide-react";
const ROOT="/sync-ai/freelance/pilot/synthetic-jobs/";
const ACCESS="/sync-ai/freelance/pilot/access/";
const btn="sw-upwork-action";
const detail=x=>typeof x==="string"?x:typeof x?.detail==="string"?x.detail:"The request could not be completed.";
const stat=(state)=>({QUEUED:"Queued for worker",RUNNING:"Processing",REVIEW:"Review required",APPROVED:"Approved for download",CANCELLED:"Cancelled",FAILED:"Failed"}[state]||state);
function saveDownload(name,base64) {
 const bytes=Uint8Array.from(atob(base64),ch=>ch.charCodeAt(0));
 const blob=new Blob([bytes],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement("a");anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export default function FreelanceExecutionControl(){
 const [enabled,setEnabled]=useState(false),[loading,setLoading]=useState(true),[jobs,setJobs]=useState([]),[msg,setMsg]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [rowCount,setRowCount]=useState(100),[seed,setSeed]=useState(42),[consent,setConsent]=useState(false);
 const [reviewed,setReviewed]=useState({});
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try {
   const [access,queue]=await Promise.all([api.get(ACCESS),api.get(ROOT)]);
   if(!access?.data?.enabled)throw Error("Founder access has not been enabled for this account.");
   setEnabled(true);setJobs(queue.data.jobs||[]);
  }catch(e){
   setEnabled(false);
   setError(e.response?.status===403?"The signed-in account does not have backend founder access.":"The backend queue could not be reached. "+detail(e.response?.data||e.message));
  }finally{setLoading(false);}
 },[]);
 useEffect(()=>{refresh();},[refresh]);
 const submit=async e=>{
  e.preventDefault();if(!consent)return;
  setBusy(true);setMsg("");setError("");
  try{
   await api.post(ROOT,{row_count:Number(rowCount),seed:Number(seed),consent_synthetic_only:true});
   setMsg("Synthetic-only job queued. Execution requires the separately enabled worker; this request did not upload any client files or call paid AI.");
   setConsent(false);await refresh();
  }catch(e){setError(detail(e.response?.data));}finally{setBusy(false);}
 };
 const decide=async(job,decision)=>{
  if(decision==="approve"&&!reviewed[job.id])return;
  setBusy(true);setMsg("");setError("");
  try{
   await api.post(ROOT+job.id+"/",{decision});
   setMsg(decision==="approve"?"Synthetic result approved for private download. No client delivery was made.":"Synthetic job cancelled.");
   await refresh();
  }catch(e){setError(detail(e.response?.data));}finally{setBusy(false);}
 };
 const download=async job=>{
  setBusy(true);setError("");
  try{
   const {data}=await api.get(ROOT+job.id+"/download/");
   if(!data.synthetic_only)throw Error("Unexpected non-synthetic output.");
   saveDownload(data.filename||"synthetic-cleaned.csv",data.content_base64);
   setMsg("Downloaded deterministic synthetic demonstration CSV. No client or Upwork upload occurred.");
  }catch(e){setError(detail(e.response?.data||e.message));}finally{setBusy(false);}
 };
 return <section className="sw-freelance-drawer-stack" aria-label="Synthetic execution monitor">
   <div className="sw-upwork-drawer-card">
    <div style={{display:"flex",alignItems:"center",gap:9}}><Cloud size={19}/><h3>Backend Execution Monitor</h3></div>
    <p>Private, account-scoped job queue. This test creates only simulated CSV rows and uses a deterministic rules engine; it is <strong>not an AI freelancer</strong> and cannot process client documents or submit to Upwork.</p>
    <p style={{fontSize:12,color:"var(--uw-accent)"}}>{loading?"Checking backend…":enabled?"Backend connected · synthetic processing only":"Connection unavailable"}</p>
    <button type="button" className={btn} onClick={refresh} disabled={loading||busy}><RefreshCw size={14}/> Refresh status</button>
   </div>
   {error&&<p className="sw-upwork-caution" role="alert"><AlertTriangle size={15}/> {error}</p>}
   {msg&&<p role="status" className="sw-upwork-drawer-card">{msg}</p>}
   {enabled&&<form onSubmit={submit} className="sw-upwork-drawer-card">
      <h3>Queue a synthetic-only test job</h3>
      <p>No client upload, no paid model, no external messages. Results require your review before download.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <label className="sw-upwork-field">Simulated rows (1–1,000)<input type="number" required min="1" max="1000" step="1" value={rowCount} onChange={e=>setRowCount(e.target.value)} /></label>
        <label className="sw-upwork-field">Reproducible seed<input type="number" required min="0" max="999999" step="1" value={seed} onChange={e=>setSeed(e.target.value)} /></label>
      </div>
      <label style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:12,color:"var(--uw-muted)"}}>
       <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
       I authorize one synthetic-only job; no real customer or Upwork files.
      </label>
      <button className={btn+" sw-upwork-action-primary"} disabled={busy||!consent} type="submit"><Play size={15}/> Queue test job</button>
   </form>}
   {enabled&&<div className="sw-upwork-drawer-card">
     <h3>Recorded worker jobs</h3>
     <p>Jobs do not begin until an operator enables a separate worker deployment. Queued state is not a processing failure.</p>
     {jobs.length===0?<p>No synthetic tests queued yet.</p>:jobs.map(j=><article key={j.id} style={{padding:"13px 0",borderBottom:"1px solid var(--uw-border)",display:"flex",flexDirection:"column",gap:8}}>
       <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <strong>{j.row_count} simulated records</strong><span style={{fontSize:11,color:"var(--uw-accent)"}}>{stat(j.state)}</span>
       </div>
       <p style={{fontSize:11}}>Attempts {j.attempts} · Created {new Date(j.created_at).toLocaleString()} · No paid AI cost</p>
       {j.error_code&&<p style={{fontSize:12}} role="alert">Worker exception: {j.error_code}</p>}
       {(j.state==="REVIEW"||j.state==="APPROVED")&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
        {[["Source rows",j.result?.source_rows],["Cleaned rows",j.result?.cleaned_rows],["Duplicates removed",j.result?.duplicates_removed],["Flagged rows",j.result?.flagged_count]].map(([name,val])=><div key={name} style={{padding:9,border:"1px solid var(--uw-border)",borderRadius:9}}><small>{name}</small><strong style={{display:"block"}}>{val??"—"}</strong></div>)}
       </div>}
       {j.state==="REVIEW"&&<><label style={{fontSize:12,display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={!!reviewed[j.id]} onChange={e=>setReviewed(p=>({...p,[j.id]:e.target.checked}))}/> I reviewed the simulated report and approve download only.</label><button className={btn} type="button" disabled={busy||!reviewed[j.id]} onClick={()=>decide(j,"approve")}><ShieldCheck size={14}/> Approve synthetic result</button></>}
       {j.state==="APPROVED"&&<button type="button" className={btn} disabled={busy} onClick={()=>download(j)}><Download size={14}/> Download approved synthetic CSV</button>}
       {["QUEUED","FAILED","REVIEW"].includes(j.state)&&<button type="button" className={btn} disabled={busy} onClick={()=>decide(j,"cancel")}>Cancel job</button>}
     </article>)}
   </div>}
   <p className="sw-upwork-caution">Execution status here is backed by SyncWorks, not Upwork. This pilot never guarantees that an arbitrary client project can be automated at 90–100% accuracy. Real assignments require explicit client permissions, QA, secure data handling and milestone confirmation.</p>
 </section>;
}
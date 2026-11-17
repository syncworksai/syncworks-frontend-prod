import React, { useCallback, useEffect, useState } from "react";
import { Bot, CheckCircle2, Clock3, Database, Download, ShieldAlert, RefreshCcw } from "lucide-react";
import api from "../api/client";

const ENDPOINT="/sync-ai/freelance/pilot/synthetic-jobs/";
const box="rounded-2xl border border-white/10 bg-slate-900/75 p-5";
const button="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-40";
const statusNames={QUEUED:"Queued",RUNNING:"Processing",REVIEW:"Review required",APPROVED:"Approved for download",FAILED:"Failed",CANCELLED:"Cancelled"};
const errorMessage=e=>{const value=e?.response?.data?.detail;return typeof value==="string"?value:"Execution API unavailable. The private backend may not be deployed or your account isn't authorized.";};
function saveCSV(encoded,name){
 const text=atob(encoded);
 const bytes=new Uint8Array(text.length);
 for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);
 const url=URL.createObjectURL(new Blob([bytes],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function FreelanceExecutionMonitor(){
 const [jobs,setJobs]=useState([]),[available,setAvailable]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [count,setCount]=useState("500"),[consent,setConsent]=useState(false);
 const refresh=useCallback(async()=>{
  try{
   const res=await api.get(ENDPOINT);setJobs(res.data.jobs||[]);setAvailable(true);setError("");
  }catch(e){setAvailable(false);setError(errorMessage(e));}
 },[]);
 useEffect(()=>{refresh();},[refresh]);
 const create=async e=>{
  e.preventDefault();setBusy(true);setError("");
  try{
   const res=await api.post(ENDPOINT,{row_count:Number(count),consent_synthetic_only:consent});
   setJobs(previous=>[res.data.job,...previous]);setConsent(false);
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const decide=async(id,decision)=>{
  setBusy(true);setError("");
  try{
   const res=await api.post(ENDPOINT+id+"/",{decision});
   setJobs(previous=>previous.map(j=>j.id===id?res.data.job:j));
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const download=async id=>{
  setBusy(true);setError("");
  try{
   const res=await api.get(ENDPOINT+id+"/download/");
   saveCSV(res.data.content_base64,res.data.filename||"synthetic-cleaned.csv");
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 return <section className={box} aria-label="Durable synthetic execution pilot">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200"><Bot size={16}/> Jarvis execution test</p><h3 className="mt-1 text-xl font-bold text-white">Background Work Monitor</h3><p className="mt-1 text-xs text-slate-400">A real queued-job demonstration using generated records only. No Upwork connection, client files, paid AI calls, or autonomous delivery.</p></div>
   <button type="button" onClick={refresh} className={button}><RefreshCcw size={15}/> Refresh status</button>
  </div>
  {!available?<div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 p-3"><ShieldAlert className="shrink-0 text-amber-200" size={18}/><p className="text-sm text-amber-100">The private backend is not enabled yet. Queue controls remain disabled until the authenticated server passes its checks.</p></div>:null}
  {error&&<p role="alert" className="mt-3 text-xs text-amber-200">{error}</p>}
  <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
   <label className="block text-xs text-slate-300">Synthetic test record count
    <select className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-sm text-white" value={count} onChange={e=>setCount(e.target.value)}><option value="100">100 synthetic records</option><option value="500">500 synthetic records</option><option value="1000">1,000 synthetic records</option></select>
   </label>
   <button type="submit" className={button} disabled={!available||busy||!consent}>Queue synthetic test</button>
   <label className="flex items-start gap-2 text-xs text-slate-300 sm:col-span-2"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I understand this generates test data only and requires a separately enabled worker; it does not process client documents.</label>
  </form>
  <div className="mt-5 space-y-3">{jobs.length?jobs.map(j=><article key={j.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-white"><Database size={15}/> Synthetic data cleanup · {j.row_count} rows</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12}/>{statusNames[j.state]||j.state} · {new Date(j.created_at).toLocaleString()}</p></div><div className="flex flex-wrap gap-2">
    {j.state==="REVIEW"&&<button className={button} disabled={busy} onClick={()=>decide(j.id,"approve")} type="button"><CheckCircle2 size={14}/> Approve results</button>}
    {j.state==="APPROVED"&&<button className={button} disabled={busy} onClick={()=>download(j.id)} type="button"><Download size={14}/> Download CSV</button>}
    {["QUEUED","REVIEW","FAILED"].includes(j.state)&&<button className={button} disabled={busy} onClick={()=>decide(j.id,"cancel")} type="button">Cancel</button>}
   </div></div>
   {j.result?.synthetic_only&&<div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{[["Source",j.result.source_rows],["Cleaned",j.result.cleaned_rows],["Duplicates removed",j.result.duplicates_removed],["AI cost","$0.00"]].map(([name,v])=><div key={name} className="rounded-lg border border-white/10 p-2"><span className="block text-slate-400">{name}</span><strong className="mt-1 block text-white">{v}</strong></div>)}</div>}
  </article>):<p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-400">No synthetic tasks queued. Submit a test after the secure backend and worker are enabled.</p>}</div>
  <p className="mt-4 text-xs text-slate-500">The worker is opt-in and runs independently. Status changes only after it runs. Refresh to retrieve the latest state. Downloads remain locked until you approve a completed result.</p>
 </section>;
}

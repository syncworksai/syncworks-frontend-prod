import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, FileUp, Download, Bot, Database, RefreshCcw } from "lucide-react";
import api from "../api/client";

const API = "/sync-ai/freelance/pilot";
const box = "rounded-2xl border border-white/10 bg-slate-900/75 p-5";
const field = "w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none";
const STEPS = ["Confirm funded contract", "Define deliverables and deadline", "Confirm file-processing permission", "Process and validate", "Review exceptions", "Approve manual delivery"];
const button = "inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40";
function errorMessage(e){const d=e?.response?.data?.detail;return typeof d==="string"?d:typeof d==="object"?JSON.stringify(d):"The connection could not be completed. Check backend deployment and your login.";}
function downloadBlob(data,filename){
  const binary=atob(data), bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([bytes],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function FreelanceSecurePanel({mode="projects"}){
 const [access,setAccess]=useState(null),[projects,setProjects]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [title,setTitle]=useState(""),[budget,setBudget]=useState(""),[projectId,setProjectId]=useState(""),[file,setFile]=useState(null),[result,setResult]=useState(null),[reviewed,setReviewed]=useState(false);
 const [task,setTask]=useState("Plan a safe CSV cleanup and verification workflow for this assignment."),[consent,setConsent]=useState(false),[plan,setPlan]=useState("");
 const fileRef=useRef(null);
 const refresh=async()=>{
  setLoading(true);setError("");
  try{
   const [status,records]=await Promise.all([api.get(API+"/access/"),api.get(API+"/projects/")]);
   setAccess(status.data);setProjects(records.data.projects||[]);
  }catch(e){setAccess(null);setProjects([]);setError(errorMessage(e));}
  finally{setLoading(false);}
 };
 useEffect(()=>{refresh();return()=>{setResult(null);setFile(null);};},[]);
 const create=async(e)=>{
  e.preventDefault();setBusy(true);setError("");
  try{
   const r=await api.post(API+"/projects/",{title:title.trim(),budget:Number(budget||0),status:"Contracted"});
   setProjects(r.data.projects||[]);setTitle("");setBudget("");
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const updateProject=async(id,changes)=>{
  setBusy(true);setError("");
  try{const r=await api.patch(API+"/projects/"+encodeURIComponent(id)+"/",changes);setProjects(r.data.projects||[]);}
  catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const process=async(e)=>{
  e.preventDefault();if(!file)return;
  setBusy(true);setError("");setResult(null);setReviewed(false);
  try{
   const form=new FormData();form.append("file",file);
   const r=await api.post(API+"/process-csv/",form);
   setResult(r.data);
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 const requestPlan=async()=>{
  setBusy(true);setError("");setPlan("");
  try{
   const r=await api.post(API+"/jarvis-plan/",{task,consent});
   setPlan(r.data.plan||"");
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 };
 if(loading)return <div className={box}><p className="text-sm text-slate-400">Checking your authenticated freelance pilot access…</p></div>;
 if(!access)return <div className={box}><p className="flex items-center gap-2 font-semibold text-amber-200"><ShieldAlert size={17}/> Secure backend not available</p><p className="mt-2 text-sm text-slate-400">The backend API may not be deployed yet, or this account is not authorized. No client files can be submitted from this panel.</p><p role="alert" className="mt-2 text-xs text-amber-200">{error}</p><button type="button" className={`${button} mt-4`} onClick={refresh}><RefreshCcw size={15}/> Retry connection</button></div>;
 return <div className="space-y-4">
  <div className="flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/5 p-4"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-300"/><div><p className="text-sm font-semibold text-emerald-200">Authenticated private pilot API available</p><p className="mt-1 text-xs text-slate-400">Project metadata is saved under your account. CSV uploads are processed in memory without server-side file storage. This is not encrypted cloud document storage or a production privacy certification.</p></div></div>
  {error&&<p role="alert" className="rounded-xl border border-rose-400/30 p-3 text-sm text-rose-300">{error}</p>}
  {mode==="projects"?<div className={box}>
   <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Database size={17}/> Account-scoped projects</h3><p className="mt-2 text-sm text-slate-400">These records are persisted in the authenticated SyncWorks backend. Keep titles generic; do not enter client secrets.</p>
   <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-[1fr_130px_auto]">
    <input value={title} required maxLength={150} onChange={e=>setTitle(e.target.value)} className={field} placeholder="Project name (no client PII)"/>
    <input value={budget} type="number" min="0" max="100000" step="0.01" onChange={e=>setBudget(e.target.value)} className={field} placeholder="Budget $"/>
    <button className={button} disabled={busy||!title.trim()} type="submit">Create project</button>
   </form>
   <div className="mt-5 space-y-3">{projects.length?projects.map(p=><div key={p.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-white">{p.title}</p><p className="mt-1 text-xs text-slate-400">Recorded budget: ${Number(p.budget||0).toFixed(2)}</p></div><select disabled={busy} value={p.status||"Saved"} onChange={e=>updateProject(p.id,{status:e.target.value})} aria-label={`Status of ${p.title}`} className={field}>{["Saved","Contracted","In progress","Submitted","Paid","Declined"].map(s=><option key={s}>{s}</option>)}</select></div><p className="mt-3 text-xs font-semibold text-slate-300">Backend delivery checklist</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{STEPS.map((step,index)=><label className="flex items-start gap-2 text-xs text-slate-300" key={step}><input type="checkbox" disabled={busy} checked={(p.project_checks||[]).includes(index)} onChange={e=>updateProject(p.id,{project_checks:e.target.checked?[...(p.project_checks||[]),index]:(p.project_checks||[]).filter(i=>i!==index)})}/>{step}</label>)}</div></div>):<p className="text-sm text-slate-400">No backend projects yet. Add your first project above.</p>}</div>
  </div>:<>
    <div className={box}><h3 className="flex items-center gap-2 text-lg font-bold text-white"><FileUp size={18}/> Secure API CSV processor</h3><p className="mt-2 text-sm text-slate-400">Upload a UTF-8 CSV up to 512 KB. Results return directly to your browser; the API does not retain uploaded files or cleaned contents. Test with synthetic data until the security review is complete.</p>
     <form onSubmit={process} className="mt-4 space-y-3"><label className="block text-xs text-slate-400">Project reference (optional metadata only)<select className={`${field} mt-1`} value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Practice / unassigned</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
     <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>{setFile(e.target.files?.[0]||null);setResult(null);setReviewed(false);}} className="block w-full text-sm text-slate-300" aria-label="Choose CSV file"/>
     <button type="submit" className={button} disabled={busy||!file||file.size>512*1024}>Process CSV on server</button></form>
     {result&&<div className="mt-5"><h4 className="font-bold text-white">Quality review</h4><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(result.report||{}).filter(([k,v])=>typeof v==="number").map(([key,value])=><div key={key} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-slate-400">{key.replaceAll("_"," ")}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>
      {result.report?.flagged_count>0&&<p className="mt-3 text-xs text-amber-200">Some rows were excluded due to invalid column counts. Review before delivering.</p>}
      <div className="mt-3 max-h-48 overflow-auto text-xs text-slate-400">{(result.preview||[]).map((row,i)=><div key={i} className="border-b border-white/5 py-2">{JSON.stringify(row)}</div>)}</div>
      <label className="mt-4 flex items-start gap-2 text-sm text-slate-300"><input checked={reviewed} onChange={e=>setReviewed(e.target.checked)} type="checkbox"/>I have reviewed the output and exceptions before downloading.</label>
      <button type="button" disabled={!reviewed} onClick={()=>downloadBlob(result.cleaned_csv_base64,(file?.name||"result.csv").replace(/\.csv$/i,"")+"_clean.csv")} className={`${button} mt-3`}><Download size={15}/> Download reviewed CSV</button>
     </div>}
    </div>
    <div className={box}><h3 className="flex items-center gap-2 text-lg font-bold text-white"><Bot size={17}/> Jarvis planning connection</h3><p className="mt-2 text-sm text-slate-400">Send only a generic task description, never client names, personal records, confidential files or credentials. This calls the existing Sync Assist AI provider only after consent.</p>
    <textarea rows={3} value={task} maxLength={1200} onChange={e=>setTask(e.target.value)} className={`${field} mt-4`} aria-label="Jarvis planning description"/>
    <label className="mt-3 flex items-start gap-2 text-sm text-slate-300"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I approve sending this non-confidential task description to Sync Assist's AI provider.</label>
    <button type="button" onClick={requestPlan} disabled={busy||!consent||!task.trim()} className={`${button} mt-3`}>Ask Jarvis to plan</button>
    {plan&&<div className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-200">{plan}</div>}
    </div>
  </>}
 </div>;
}

import React,{useCallback,useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {BriefcaseBusiness,RefreshCw,ArrowRight,CheckCircle2} from "lucide-react";
import api from "../api/client";
import {useAuth} from "../auth/AuthContext";

export default function PartnerFreeWorkspace(){
 const nav=useNavigate(),{activeBusinessId}=useAuth();
 const [jobs,setJobs]=useState([]),[busy,setBusy]=useState(""),[err,setErr]=useState("");
 const load=useCallback(async()=>{
  if(!activeBusinessId)return;
  try{const r=await api.get("/partner-work-tickets/");const rows=Array.isArray(r.data)?r.data:r.data?.results||[];
   setJobs(rows.filter(j=>String(j.partner_business)===String(activeBusinessId)));
  }catch(e){setErr(e.response?.data?.detail||"Could not load subcontractor work.");}
 },[activeBusinessId]);
 useEffect(()=>{load();const id=window.setInterval(load,30000);return()=>window.clearInterval(id);},[load]);
 const respond=async(id,decision)=>{setBusy(String(id));setErr("");try{await api.post(`/partner-work-tickets/${id}/respond/`,{decision});await load();}catch(e){setErr(e.response?.data?.detail||"Could not respond to offer.");}finally{setBusy("");}};
 const update=async(id,status)=>{setBusy(String(id));setErr("");try{await api.post(`/partner-work-tickets/${id}/status/`,{status});await load();}catch(e){setErr(e.response?.data?.detail||"Could not update work status.");}finally{setBusy("");}};
 const open=jobs.filter(j=>!["COMPLETED","DECLINED","CANCELLED"].includes(j.status));
 return <div className="relative h-[calc(100dvh-155px)] min-h-[390px] overflow-hidden bg-[#061227] p-3 text-white" style={{backgroundImage:"linear-gradient(110deg,rgba(2,9,25,.83),rgba(5,13,34,.7)),url('/office-themes/syncworks-future.webp')",backgroundSize:"cover",backgroundPosition:"center"}}>
 <div className="mx-auto flex h-full max-w-5xl flex-col gap-3">
  <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-400/25 bg-[#07172c]/75 p-3 backdrop-blur-xl"><div><div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Free partner workspace</div><h1 className="text-xl font-bold">My Subcontractor Board</h1><p className="text-xs text-slate-300">Work offers, status updates and schedule</p></div><div className="flex gap-2"><button onClick={load} aria-label="Refresh jobs" className="rounded-lg border border-cyan-400/30 p-2"><RefreshCw size={16}/></button><button onClick={()=>nav("/upgrade")} className="rounded-lg border border-violet-400/35 bg-violet-400/10 px-3 py-2 text-xs text-violet-100">Upgrade business tools <ArrowRight size={13} className="inline"/></button></div></header>
  <div className="grid grid-cols-3 gap-2">{[["Active jobs",open.length],["New offers",jobs.filter(j=>j.status==="OFFERED").length],["Completed",jobs.filter(j=>j.status==="COMPLETED").length]].map(([label,val])=><div key={label} className="rounded-xl border border-cyan-400/20 bg-[#06162e]/65 p-3 backdrop-blur-lg"><strong className="text-lg text-cyan-200">{val}</strong><p className="text-[10px] text-slate-300">{label}</p></div>)}</div>
  {err&&<p role="alert" className="rounded-lg bg-rose-900/40 p-2 text-xs text-rose-200">{err}</p>}
  {!activeBusinessId?<div className="rounded-xl border border-amber-400/30 p-4 text-sm">Select or set up your business profile to view offers addressed to that business.</div>:
  <main className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-2xl border border-cyan-400/20 bg-[#06152c]/75 p-3 backdrop-blur-xl">{jobs.length?jobs.map(j=><article key={j.id} className="rounded-xl border border-cyan-300/20 bg-[#0c203a]/75 p-3">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm">{j.title||"Service job"}</strong><p className="text-[11px] text-slate-300">From {j.hiring_business_name||"Partner business"} · {j.status?.replaceAll("_"," ")}</p></div><span className="rounded-lg border border-cyan-400/25 p-2 text-xs">{j.scheduled_at?new Date(j.scheduled_at).toLocaleString():"Schedule pending"}</span></div>
   {j.scope&&<p className="mt-2 line-clamp-2 text-xs text-slate-300">{j.scope}</p>}
   {j.status==="OFFERED"?<div className="mt-3 flex gap-2"><button disabled={busy===String(j.id)} onClick={()=>respond(j.id,"ACCEPT")} className="flex-1 rounded-xl border border-emerald-400/40 bg-emerald-400/15 p-2 text-xs">Accept</button><button disabled={busy===String(j.id)} onClick={()=>respond(j.id,"DECLINE")} className="flex-1 rounded-xl border border-rose-400/40 bg-rose-400/10 p-2 text-xs">Decline</button></div>:["ACCEPTED","SCHEDULED","EN_ROUTE","ON_SITE","IN_PROGRESS","BLOCKED"].includes(j.status)?<div className="mt-3 flex flex-wrap gap-2">{["SCHEDULED","EN_ROUTE","ON_SITE","IN_PROGRESS","AWAITING_REVIEW"].map(st=><button key={st} disabled={busy===String(j.id)} onClick={()=>update(j.id,st)} className="rounded-lg border border-cyan-400/25 px-3 py-2 text-[11px]">{st.replaceAll("_"," ")}</button>)}</div>:null}
  </article>):<div className="grid h-full place-items-center text-center"><div><BriefcaseBusiness size={32} className="mx-auto text-cyan-300"/><strong className="mt-3 block">No partner jobs yet</strong><p className="mt-1 text-xs text-slate-300">Work offers will appear here once a connected business assigns them.</p></div></div>}</main>}
  <p className="text-[11px] text-slate-400">Basic offer and status tools are available in the partner work board. Full invoicing, marketing, scheduling management and business analytics are separate business features.</p>
 </div></div>;
}

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import DashboardShell from "../../components/dashboard/DashboardShell";

function localDate() {
  const d = new Date(); const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function hour(value) { return value ? new Date(value).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }) : "Time pending"; }
function Job({ job, onOpen, onAssign, members, busy }) {
  return <article className="rounded-xl border border-slate-700 bg-slate-950/75 p-3">
    <div className="flex items-start justify-between gap-2">
      <button className="min-w-0 text-left text-sm font-bold text-white hover:text-cyan-200" onClick={() => onOpen(job.ticket_id)}>{job.title || "Service ticket"} <span className="text-xs font-normal text-slate-500">#{job.ticket_id}</span></button>
      <span className="shrink-0 rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-200">{String(job.status || "NEW").replaceAll("_"," ")}</span>
    </div>
    <div className="mt-1 text-xs text-slate-400">{[job.customer, job.address].filter(Boolean).join(" · ") || "Location not provided"}</div>
    <div className="mt-2 text-xs text-slate-300">{hour(job.scheduled_start)} {job.scheduled_end ? `– ${hour(job.scheduled_end)}` : ""} · {job.priority || "STANDARD"}</div>
    {Array.isArray(job.required_skills) && job.required_skills.length ? <div className="mt-2 text-xs text-amber-200">Skills: {job.required_skills.join(", ")}</div> : null}
    {onAssign ? <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">Assign <select className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-white" disabled={busy} defaultValue="" onChange={e=>{if(e.target.value)onAssign(job.ticket_id,e.target.value)}}><option value="">Select technician</option>{members.filter(m=>(m.role==="TECHNICIAN"||m.role==="TECH"||m.is_schedulable) && (job.required_skills||[]).every(skill=>(m.skills||[]).some(s=>String(s).toLowerCase()===String(skill).toLowerCase()))).map(m=><option key={m.member_id} value={m.member_id}>{m.name}</option>)}</select></label> : null}
  </article>;
}
export default function BusinessTechBoard() {
  const nav = useNavigate();const [params] = useSearchParams();
  const supportId = params.get("support_business");
  const support = Boolean(supportId);
  const back = support ? "/platform?tab=businesses" : "/sbo";
  const [date,setDate]=useState(localDate);
  const [data,setData]=useState({staff:[],unassigned:[],summary:{}}),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState("");
  const [bizId,setBizId]=useState(()=>localStorage.getItem("sw_active_business_id")||"");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const path=support?`/platform/businesses/${encodeURIComponent(supportId)}/assist/tech-board/`:"/business/tech-board/";
      const res=await api.get(path,{params:{date},...(!support?{headers:{"X-Business-Id":bizId}}:{})});
      setData(res.data||{staff:[],unassigned:[],summary:{}});
    }catch(e){setError(e?.response?.data?.detail||"Unable to load the technician board.")}finally{setLoading(false)}
  },[support,supportId,date,bizId]);
  useEffect(()=>{load()},[load]);
  async function assign(ticketId,memberId) {
    if(support){setError("Founder support mode is read-only for technician assignments. Open the business's assigned dispatcher account.");return;}
    setBusy(String(ticketId));setError("");
    try{await api.post(`/tickets/${ticketId}/assign_member/`,{business_member_id:Number(memberId)},{headers:{"X-Business-Id":bizId}});await load();}
    catch(e){setError(e?.response?.data?.detail||"Assignment failed.")}finally{setBusy("")}
  }
  const staff=data.staff||[], backlog=data.unassigned||[];
  return <DashboardShell modeBarTitle={support?"God Mode · Business Tech Board":"Business Tech Board"} modeBarSubtitle="Dispatch · Unassigned · Scheduled">
    <div className="mx-auto max-w-7xl space-y-4 pb-24">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900 p-5">
        <button className="mb-3 text-xs font-bold text-cyan-200" onClick={()=>nav(back)}>← Back</button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-black text-white">Technician Board</h1><p className="mt-1 text-xs text-slate-400">Team assignments and open work. Scheduling changes remain manual.</p></div>
          <div className="flex gap-2"><input className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" type="date" value={date} onChange={e=>setDate(e.target.value)}/><button onClick={load} className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-white">Refresh</button></div>
        </div>
        {support?<p className="mt-3 text-xs text-violet-200">Audited founder support view. Technician assignment requires business dispatch permissions.</p>:null}
        <div className="mt-4 grid grid-cols-3 gap-2">{[["Active",data.summary?.active_tickets||0],["Unassigned",data.summary?.unassigned||0],["Scheduled today",data.summary?.scheduled_today||0]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-950 p-3"><div className="text-xs text-slate-400">{label}</div><div className="text-2xl font-black text-white">{value}</div></div>)}</div>
        {!support?<button className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950" onClick={()=>nav("/sbo/quick-intake")}>+ Quick Phone Ticket</button>:<button className="mt-4 rounded-xl border border-cyan-500/30 px-4 py-2 text-sm font-bold text-cyan-200" onClick={()=>nav(`/platform/business-assist?support_business=${supportId}`)}>+ Assist with customer ticket</button>}
      </section>
      {error?<div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>:null}
      {loading?<p className="text-sm text-slate-400">Loading jobs…</p>:null}
      <section className="rounded-2xl border border-amber-500/25 bg-slate-900 p-4"><div className="mb-3 font-black text-white">Unassigned / Dispatcher Queue <span className="text-amber-200">({backlog.length})</span></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{backlog.map(j=><Job key={j.ticket_id} job={j} members={staff} onOpen={id=>nav(`/tickets/${id}`)} onAssign={support?null:assign} busy={busy===String(j.ticket_id)}/>)}{!backlog.length?<div className="text-sm text-slate-500">No unassigned tickets.</div>:null}</div></section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{staff.map(m=><div key={m.member_id} className="rounded-2xl border border-cyan-400/15 bg-slate-900 p-4"><div className="mb-3 flex justify-between gap-2"><div><div className="font-black text-white">{m.name}</div><div className="text-xs text-slate-400">{m.role} · {m.jobs?.length||0} jobs</div>{Array.isArray(m.skills)&&m.skills.length?<div className="mt-1 text-xs text-cyan-200">{m.skills.join(", ")}</div>:null}</div></div><div className="space-y-2">{(m.jobs||[]).map(j=><Job key={j.ticket_id} job={j} members={staff} onOpen={id=>nav(`/tickets/${id}`)}/>)}{!m.jobs?.length?<div className="rounded-xl border border-dashed border-slate-700 p-4 text-xs text-slate-500">No work scheduled for this day.</div>:null}</div></div>)}</section>
    </div>
  </DashboardShell>;
}

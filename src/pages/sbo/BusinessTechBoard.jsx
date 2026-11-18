import React,{useCallback,useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ChevronDown,ChevronRight,RefreshCw,Users,ClipboardList,X,ArrowLeft} from "lucide-react";
import api from "../../api/client";
import TechnicianJobActions from "../../components/sbo/TechnicianJobActions";
import "./BusinessTechBoard.css";
const dateNow=()=>new Date().toLocaleDateString("en-CA");
const hour=v=>v?new Date(v).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Unscheduled";
export default function BusinessTechBoard({employeeMode=false}){
 const nav=useNavigate(),[params]=useSearchParams();
 const supportId=params.get("support_business"),support=Boolean(supportId);
 const businessId=localStorage.getItem("sw_active_business_id")||"";
 const [date,setDate]=useState(dateNow),[search,setSearch]=useState(""),[skill,setSkill]=useState("");
 const [data,setData]=useState({staff:[],unassigned:[],summary:{}}),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[expanded,setExpanded]=useState(null),[busy,setBusy]=useState("");
 const [pickups,setPickups]=useState([]);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const path=employeeMode?"/business/technician/team-board/":support?`/platform/businesses/${encodeURIComponent(supportId)}/assist/tech-board/`:"/business/tech-board/";
   const opts={params:{date},...(!support?{headers:{"X-Business-Id":businessId}}:{})};
   const result=await api.get(path,opts);
   setData(result.data||{staff:[],unassigned:[],summary:{}});
   if(!employeeMode&&!support){
    try{const pending=await api.get("/business/technician/pickups/",opts);setPickups(pending.data?.requests||[]);}catch{setPickups([]);}
   }
  }catch(e){setError(e.response?.data?.detail||"Unable to load technician assignments.");}
  finally{setLoading(false);}
 },[employeeMode,support,supportId,date,businessId]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{const timer=setInterval(load,30000);return()=>clearInterval(timer);},[load]);
 const staff=data.staff||[],backlog=data.unassigned||[];
 const skills=useMemo(()=>[...new Set(staff.flatMap(s=>s.skills||[]))].sort(),[staff]);
 const filtered=staff.filter(p=>(!skill||(p.skills||[]).some(s=>s.toLowerCase()===skill.toLowerCase()))&&(!search||p.name.toLowerCase().includes(search.toLowerCase())));
 const assign=async(ticket,member)=>{if(support||employeeMode)return;setBusy(String(ticket));setError("");
  try{await api.post(`/tickets/${ticket}/assign_member/`,{business_member_id:Number(member)},{headers:{"X-Business-Id":businessId}});setNotice("Job assigned");await load();}
  catch(e){setError(e.response?.data?.detail||"Assignment failed.");}finally{setBusy("");}
 };
 const pickup=async(ticket)=>{setBusy(String(ticket));try{const r=await api.post(`/business/technician/jobs/${ticket}/pickup/`,{});setNotice(r.data?.detail||"Pickup requested. Dispatch approval required.");}catch(e){setError(e.response?.data?.detail||"Cannot request pickup.");}finally{setBusy("");}};
 const decide=async(id,decision)=>{setBusy(String(id));try{await api.post(`/business/technician/pickups/${id}/respond/`,{decision});setNotice(`Pickup ${decision.toLowerCase()}d`);await load();}catch(e){setError(e.response?.data?.detail||"Approval failed.");}finally{setBusy("");}};
 const jobCard=(j,person=null)=> <article key={j.ticket_id} className="sw-tech-job rounded-xl border border-white/10 p-2.5">
  <div className="flex justify-between gap-2"><button type="button" onClick={()=>nav(`/tickets/${j.ticket_id}`)} className="min-w-0 truncate text-left text-xs font-semibold text-white">{j.title||"Service request"} <span className="text-slate-400">#{j.ticket_id}</span></button><span className="shrink-0 text-[10px] text-cyan-200">{String(j.status||"NEW").replaceAll("_"," ")}</span></div>
  <div className="mt-1 text-[11px] text-slate-300">{hour(j.scheduled_start)}{j.scheduled_end?`–${hour(j.scheduled_end)}`:""} · {(j.required_skills||[]).join(", ")||"General"}</div>
  {person&&<TechnicianJobActions ticket={j} compact canDispatch={!support&&!employeeMode} isAssigned={person.is_self} onSaved={load}/>}
  {!person&&!employeeMode&&!support&&<select aria-label="Assign technician" disabled={busy===String(j.ticket_id)} defaultValue="" onChange={e=>e.target.value&&assign(j.ticket_id,e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#09182e] p-2 text-xs"><option value="">Assign technician…</option>{staff.filter(m=>(j.required_skills||[]).every(sk=>(m.skills||[]).some(x=>x.toLowerCase()===sk.toLowerCase()))).map(m=><option key={m.member_id} value={m.member_id}>{m.name}</option>)}</select>}
  {employeeMode&&!(person?.is_self)&&<button disabled={busy===String(j.ticket_id)} onClick={()=>pickup(j.ticket_id)} className="mt-2 rounded-lg border border-cyan-400/35 px-3 py-1.5 text-[11px] text-cyan-200">Request pickup · dispatch approves</button>}
 </article>;
 return <div className="sw-tech-page relative isolate h-[calc(100dvh-110px)] min-h-[370px] overflow-hidden p-3 text-white">
  <div aria-hidden className="sw-tech-bg absolute inset-0 -z-20"/><div aria-hidden className="absolute inset-0 -z-10 bg-[#020817]/70"/>
  <div className="mx-auto flex h-full max-w-7xl flex-col gap-3">
   <header className="sw-tech-glass flex flex-wrap items-center justify-between gap-2 rounded-xl p-3">
    <div><button onClick={()=>nav(employeeMode?"/employee":support?"/platform":"/sbo/dispatch")} className="mb-1 flex items-center gap-1 text-[11px] text-cyan-200"><ArrowLeft size={13}/>Back</button><h1 className="text-lg font-bold sm:text-xl">Technician Board</h1><p className="text-[11px] text-slate-300">Assigned jobs, status, handoffs and skills</p></div>
    <div className="flex flex-wrap gap-2"><input aria-label="Schedule date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-lg border border-white/20 bg-[#061327] p-2 text-xs"/><button onClick={load} aria-label="Refresh" className="rounded-lg border border-white/15 p-2"><RefreshCw size={16} className={loading?"animate-spin":""}/></button>{!employeeMode&&!support&&<button onClick={()=>nav("/sbo/quick-intake")} className="rounded-lg bg-cyan-500/20 px-3 py-2 text-xs">+ Ticket</button>}</div>
   </header>
   <div className="flex flex-wrap items-center gap-2">
    <input aria-label="Search technicians" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find technician…" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#061327]/75 p-2 text-xs"/>
    <select aria-label="Filter specialty" value={skill} onChange={e=>setSkill(e.target.value)} className="rounded-lg border border-white/15 bg-[#061327] p-2 text-xs"><option value="">All skills</option>{skills.map(s=><option key={s}>{s}</option>)}</select>
    {!employeeMode&&!support&&<button onClick={()=>nav("/sbo/settings/workforce")} className="rounded-lg border border-white/15 p-2 text-xs">Edit skills</button>}
   </div>
   {error&&<p role="alert" className="rounded-lg bg-rose-800/40 p-2 text-xs">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-cyan-800/30 p-2 text-xs">{notice}</p>}
   <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="sw-tech-glass min-h-0 overflow-y-auto rounded-xl p-3"><div className="mb-2 text-xs font-bold">Dispatch queue ({backlog.length})</div><div className="space-y-2">{backlog.map(j=>jobCard(j))}{!backlog.length&&<p className="text-xs text-slate-400">No unassigned jobs</p>}</div>
     {!employeeMode&&!support&&pickups.length>0&&<div className="mt-3 border-t border-white/15 pt-3"><strong className="text-xs text-amber-200">Pickup approvals ({pickups.length})</strong>{pickups.map(p=><div key={p.id} className="mt-2 rounded-lg border border-amber-300/20 p-2 text-xs"><p>{p.body}</p><div className="mt-2 flex gap-2"><button disabled={busy===String(p.id)} onClick={()=>decide(p.id,"APPROVE")} className="rounded border border-emerald-400/30 px-2 py-1">Approve</button><button disabled={busy===String(p.id)} onClick={()=>decide(p.id,"DECLINE")} className="rounded border border-rose-400/30 px-2 py-1">Decline</button></div></div>)}</div>}
    </aside>
    <main className="sw-tech-glass min-h-0 overflow-y-auto rounded-xl p-3"><div className="mb-2 flex items-center justify-between text-xs"><strong>Technicians ({filtered.length})</strong><span className="text-slate-400">Tap name to open board</span></div>
     <div className="space-y-2">{filtered.map(p=><section key={p.member_id} className="rounded-xl border border-cyan-400/15 bg-[#07172d]/40">
      <button className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left" onClick={()=>setExpanded(x=>x===p.member_id?null:p.member_id)} aria-expanded={expanded===p.member_id}><div className="min-w-0"><strong className="text-sm">{p.name}{p.is_self?" · You":""}</strong><p className="text-[11px] text-slate-400">{(p.skills||[]).join(" · ")||"Skills not configured"} · {p.jobs?.length||0} jobs</p></div><ChevronDown size={16} className={expanded===p.member_id?"rotate-180":""}/></button>
      {expanded===p.member_id&&<div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">{(p.jobs||[]).map(j=>jobCard(j,p))}{!p.jobs?.length&&<p className="text-xs text-slate-400">No assigned jobs on this board.</p>}</div>}
     </section>)}{!filtered.length&&<p className="text-xs text-slate-400">No matching technicians</p>}</div>
    </main>
   </div>
  </div>
 </div>;
}

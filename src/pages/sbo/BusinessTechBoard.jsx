import React,{useCallback,useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {ChevronDown,ChevronRight,RefreshCw,Users,ClipboardList,X,ArrowLeft} from "lucide-react";
import api from "../../api/client";
import TechnicianJobActions from "../../components/sbo/TechnicianJobActions";
import TicketQuickMessage from "../../components/tickets/TicketQuickMessage";
import {getBusinessWorkforce,saveWorkforceMember} from "../../api/workforce";
import "./BusinessTechBoard.css";
import "../../styles/BusinessWorkspaceTheme.css";
import {useBusinessWorkspaceTheme} from "../../hooks/useBusinessWorkspaceTheme";
const dateNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const hour=v=>v?new Date(v).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Unscheduled";
export default function BusinessTechBoard({employeeMode=false}){
 const nav=useNavigate(),[params]=useSearchParams();
 const {themeProps}=useBusinessWorkspaceTheme();
 const supportId=params.get("support_business"),support=Boolean(supportId);
 const businessId=localStorage.getItem("sw_active_business_id")||"";
 const [date,setDate]=useState(dateNow),[search,setSearch]=useState(""),[skill,setSkill]=useState("");
 const [data,setData]=useState({staff:[],unassigned:[],summary:{}}),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[expanded,setExpanded]=useState(null),[busy,setBusy]=useState("");
 const [pickups,setPickups]=useState([]);
 const [groups,setGroups]=useState([]),[group,setGroup]=useState(""),[groupName,setGroupName]=useState(""),[groupPanel,setGroupPanel]=useState(false),[messageTicket,setMessageTicket]=useState(null);
 const [offset,setOffset]=useState(0),[workforce,setWorkforce]=useState([]);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const path=employeeMode?"/business/technician/team-board/":support?`/platform/businesses/${encodeURIComponent(supportId)}/assist/tech-board/`:"/business/tech-board/";
   const opts={params:{date},...(!support?{headers:{"X-Business-Id":businessId}}:{})};
   const result=await api.get(path,opts);
   setData(result.data||{staff:[],unassigned:[],summary:{}});
   if(!support){
    try{const [gr,workers]=await Promise.all([api.get("/sync-ai/business/technician-groups/"),getBusinessWorkforce()]);setGroups(gr.data?.groups||[]);setWorkforce(workers?.members||[]);}catch{setGroups([]);}
   }
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
 const profileMap=useMemo(()=>new Map(workforce.map(w=>[String(w.user_id),w.workforce||{}])),[workforce]);
 const filtered=staff.filter(p=>(!group||(String((profileMap.get(String(p.user_id))||p).technician_group_id||"")===group))&&(!skill||(p.skills||[]).some(s=>s.toLowerCase()===skill.toLowerCase()))&&(!search||p.name.toLowerCase().includes(search.toLowerCase())));
 const pageSize=16;
 const shown=filtered.slice(offset,offset+pageSize);
 const createGroup=async()=>{if(!groupName.trim())return;try{const r=await api.post("/sync-ai/business/technician-groups/",{name:groupName.trim()});setGroups(v=>[...v,r.data]);setGroup(String(r.data.id));setGroupName("");setNotice("Crew / region saved.");}catch(e){setError(e.response?.data?.detail||"Could not create group.");}};
 const moveGroup=async(member,groupId)=>{try{await saveWorkforceMember(member,{technician_group_id:groupId?Number(groupId):null});setNotice("Technician group updated.");await load();}catch(e){setError(e.response?.data?.detail||"Could not update technician group.");}};
 const assign=async(ticket,member)=>{if(support||employeeMode)return;setBusy(String(ticket));setError("");
  try{await api.post(`/tickets/${ticket}/assign_member/`,{business_member_id:Number(member)},{headers:{"X-Business-Id":businessId}});setNotice("Job assigned");await load();}
  catch(e){setError(e.response?.data?.detail||"Assignment failed.");}finally{setBusy("");}
 };
 const pickup=async(ticket)=>{setBusy(String(ticket));try{const r=await api.post(`/business/technician/jobs/${ticket}/pickup/`,{});setNotice(r.data?.detail||"Pickup requested. Dispatch approval required.");}catch(e){setError(e.response?.data?.detail||"Cannot request pickup.");}finally{setBusy("");}};
 const decide=async(id,decision)=>{setBusy(String(id));try{await api.post(`/business/technician/pickups/${id}/respond/`,{decision});setNotice(`Pickup ${decision.toLowerCase()}d`);await load();}catch(e){setError(e.response?.data?.detail||"Approval failed.");}finally{setBusy("");}};
 const jobCard=(j,person=null)=> <article key={j.ticket_id} className="sw-tech-job rounded-xl border border-white/10 p-2.5">
  <div className="flex justify-between gap-2"><button type="button" onClick={()=>nav(`/tickets/${j.ticket_id}`)} className="min-w-0 truncate text-left text-xs font-semibold text-white">{j.title||"Service request"} <span className="text-slate-400">#{j.ticket_id}</span></button><span className="shrink-0 text-[10px] text-cyan-200">{String(j.status||"NEW").replaceAll("_"," ")}</span></div>
  <div className="mt-1 text-[11px] text-slate-300">{hour(j.scheduled_start)}{j.scheduled_end?`–${hour(j.scheduled_end)}`:""} · {(j.required_skills||[]).join(", ")||"General"}</div>
  <button type="button" onClick={()=>setMessageTicket(j.ticket_id)} className="mt-2 rounded-lg border border-cyan-400/30 px-3 py-1 text-[11px] text-cyan-200">Quick message</button>
  {person&&!["COMPLETED","CANCELLED","CLOSED","PAID","INVOICED"].includes(String(j.status||"").toUpperCase())&&<TechnicianJobActions ticket={j} compact canDispatch={!support&&!employeeMode} isAssigned={person.is_self} onSaved={load}/>}
  {!person&&!employeeMode&&!support&&<select aria-label="Assign technician" disabled={busy===String(j.ticket_id)} defaultValue="" onChange={e=>e.target.value&&assign(j.ticket_id,e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#09182e] p-2 text-xs"><option value="">Assign technician…</option>{staff.filter(m=>(j.required_skills||[]).every(sk=>(m.skills||[]).some(x=>x.toLowerCase()===sk.toLowerCase()))).map(m=><option key={m.member_id} value={m.member_id}>{m.name}</option>)}</select>}
  {employeeMode&&!(person?.is_self)&&<button disabled={busy===String(j.ticket_id)} onClick={()=>pickup(j.ticket_id)} className="mt-2 rounded-lg border border-cyan-400/35 px-3 py-1.5 text-[11px] text-cyan-200">Request pickup · dispatch approves</button>}
 </article>;
 return <div {...themeProps} className="sw-tech-page relative isolate h-[calc(100dvh-110px)] min-h-[370px] overflow-hidden p-3 text-white">
  <div aria-hidden className="sw-tech-bg sw-business-themed-photo absolute inset-0 -z-20"/><div aria-hidden className="sw-business-themed-overlay absolute inset-0 -z-10"/>
  <div className="mx-auto flex h-full max-w-7xl flex-col gap-3">
   <header className="sw-tech-glass sw-business-themed-card flex flex-wrap items-center justify-between gap-2 rounded-xl p-3">
    <div><button onClick={()=>nav(employeeMode?"/employee":support?"/platform":"/sbo/dispatch")} className="mb-1 flex items-center gap-1 text-[11px] text-cyan-200"><ArrowLeft size={13}/>Back</button><h1 className="text-lg font-bold sm:text-xl">Technician Board</h1><p className="text-[11px] text-slate-300">Assigned jobs, status, handoffs and skills</p></div>
    <div className="flex flex-wrap gap-2"><input aria-label="Schedule date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-lg border border-white/20 bg-[#061327] p-2 text-xs"/><button onClick={load} aria-label="Refresh" className="rounded-lg border border-white/15 p-2"><RefreshCw size={16} className={loading?"animate-spin":""}/></button>{employeeMode&&<button onClick={()=>nav("/calendar")} className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs">My calendar</button>}{!employeeMode&&!support&&<button onClick={()=>nav("/sbo/quick-intake")} className="rounded-lg bg-cyan-500/20 px-3 py-2 text-xs">+ Ticket</button>}</div>
   </header>
   <div className="flex flex-wrap items-center gap-2">
    <input aria-label="Search technicians" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find technician…" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#061327]/75 p-2 text-xs"/>
    <select aria-label="Filter specialty" value={skill} onChange={e=>setSkill(e.target.value)} className="rounded-lg border border-white/15 bg-[#061327] p-2 text-xs"><option value="">All skills</option>{skills.map(s=><option key={s}>{s}</option>)}</select>
    <select aria-label="Region / crew" value={group} onChange={e=>{setGroup(e.target.value);setOffset(0)}} className="rounded-lg border border-white/15 bg-[#061327] p-2 text-xs"><option value="">All crews / regions</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name} ({g.members??0})</option>)}</select>
    {!employeeMode&&!support&&<button onClick={()=>setGroupPanel(true)} className="rounded-lg border border-cyan-400/30 p-2 text-xs">Manage crews</button>}
    {!employeeMode&&!support&&<button onClick={()=>nav("/sbo/settings/workforce")} className="rounded-lg border border-white/15 p-2 text-xs">Edit skills</button>}
   </div>
   {error&&<p role="alert" className="rounded-lg bg-rose-800/40 p-2 text-xs">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-cyan-800/30 p-2 text-xs">{notice}</p>}
   <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside className="sw-tech-glass sw-business-themed-card min-h-0 overflow-y-auto rounded-xl p-3"><div className="mb-2 text-xs font-bold">Dispatch queue ({backlog.length})</div><div className="space-y-2">{backlog.map(j=>jobCard(j))}{!backlog.length&&<p className="text-xs text-slate-400">No unassigned jobs</p>}</div>
     {!employeeMode&&!support&&pickups.length>0&&<div className="mt-3 border-t border-white/15 pt-3"><strong className="text-xs text-amber-200">Pickup approvals ({pickups.length})</strong>{pickups.map(p=><div key={p.id} className="mt-2 rounded-lg border border-amber-300/20 p-2 text-xs"><p>{p.body}</p><div className="mt-2 flex gap-2"><button disabled={busy===String(p.id)} onClick={()=>decide(p.id,"APPROVE")} className="rounded border border-emerald-400/30 px-2 py-1">Approve</button><button disabled={busy===String(p.id)} onClick={()=>decide(p.id,"DECLINE")} className="rounded border border-rose-400/30 px-2 py-1">Decline</button></div></div>)}</div>}
    </aside>
    <main className="sw-tech-glass sw-business-themed-card min-h-0 overflow-y-auto rounded-xl p-3"><div className="mb-2 flex items-center justify-between text-xs"><strong>Technicians ({filtered.length})</strong><span className="text-slate-400">One technician at a time · {Math.min(offset+1,filtered.length)}–{Math.min(offset+pageSize,filtered.length)}</span></div>
     <div className="space-y-2">{shown.map(p=><section key={p.member_id} className="rounded-xl border border-cyan-400/15 bg-[#07172d]/40">
      <button className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left" onClick={()=>setExpanded(x=>x===p.member_id?null:p.member_id)} aria-expanded={expanded===p.member_id}><div className="min-w-0"><strong className="text-sm">{p.name}{p.is_self?" · You":""}</strong><p className="text-[11px] text-slate-400">{(p.skills||[]).join(" · ")||"Skills not configured"} · {p.jobs?.length||0} jobs</p></div><ChevronDown size={16} className={expanded===p.member_id?"rotate-180":""}/></button>
      {expanded===p.member_id&&<div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">{!employeeMode&&!support&&<div className="sm:col-span-2"><label className="text-xs">Crew / region <select className="ml-2 rounded-lg border border-white/20 bg-[#07152c] p-2" value={(profileMap.get(String(p.user_id))||p).technician_group_id||""} onChange={e=>moveGroup(p.member_id,e.target.value)}><option value="">Unassigned crew</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label></div>}{(p.jobs||[]).map(j=>jobCard(j,p))}{!p.jobs?.length&&<p className="text-xs text-slate-400">No assigned jobs on this board.</p>}</div>}
     </section>)}{filtered.length>pageSize&&<div className="flex items-center justify-between gap-2 rounded-lg border border-white/15 p-2 text-xs"><button disabled={offset===0} onClick={()=>setOffset(o=>Math.max(0,o-pageSize))} className="rounded-lg border border-cyan-400/30 px-3 py-2 disabled:opacity-30">Previous</button><span>{Math.min(offset+1,filtered.length)}–{Math.min(offset+pageSize,filtered.length)} of {filtered.length}</span><button disabled={offset+pageSize>=filtered.length} onClick={()=>setOffset(o=>o+pageSize)} className="rounded-lg border border-cyan-400/30 px-3 py-2 disabled:opacity-30">Next</button></div>}{!filtered.length&&<p className="text-xs text-slate-400">No matching technicians</p>}</div>
    </main>
   </div>
  </div>
  {groupPanel&&<div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020817]/75 p-3 backdrop-blur-md" onMouseDown={e=>{if(e.target===e.currentTarget)setGroupPanel(false)}}><section role="dialog" aria-modal="true" aria-label="Manage technician crews" className="w-full max-w-md rounded-2xl border border-cyan-300/30 bg-[#09172d]/95 p-4"><div className="mb-3 flex justify-between"><strong>Crew & region groups</strong><button onClick={()=>setGroupPanel(false)}>Close</button></div><p className="mb-3 text-xs text-slate-300">Create an area or crew, then expand a technician to assign them. Groups are saved for this business.</p><div className="flex gap-2"><input value={groupName} onChange={e=>setGroupName(e.target.value)} maxLength={80} placeholder="e.g. Montgomery North" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-[#020a19] p-2 text-sm"/><button onClick={createGroup} className="rounded-lg bg-cyan-400/20 px-3">Create</button></div><div className="mt-3 max-h-52 overflow-y-auto">{groups.map(g=><div key={g.id} className="flex justify-between border-b border-white/10 p-2 text-xs"><span>{g.name}</span><span>{g.members} members</span></div>)}</div></section></div>}
  {messageTicket&&<TicketQuickMessage ticketId={messageTicket} onClose={()=>setMessageTicket(null)}/>}
 </div>;
}

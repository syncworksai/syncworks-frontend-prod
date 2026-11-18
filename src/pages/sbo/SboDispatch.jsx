import React,{useCallback,useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {ArrowLeft,CalendarDays,Clock3,MapPinned,Plus,RefreshCw,Route,Settings2,X,ChevronRight} from "lucide-react";
import {getLiveOperations,updateDispatchDelay} from "../../api/dispatch";
import {getBusinessWorkforce} from "../../api/workforce";
import "./SboDispatch.css";
import "../../styles/BusinessWorkspaceTheme.css";
import {useBusinessWorkspaceTheme} from "../../hooks/useBusinessWorkspaceTheme";
import TechnicianJobActions from "../../components/sbo/TechnicianJobActions";

const isoDate=(d)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;};
const addDays=(day,n)=>{const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()+n);return isoDate(d);};
const time=(v)=>v?new Date(v).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Not set";
const asMinutes=(n)=>Number.isFinite(Number(n))?Number(n):null;
function RiskBadge({value}){const k=String(value||"ON_TIME");return <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${k==="LATE"?"border-rose-400/50 text-rose-200":k==="AT_RISK"?"border-amber-400/40 text-amber-100":"border-cyan-300/30 text-cyan-200"}`}>{k.replaceAll("_"," ")}</span>;}
function JobLine({job,onOpen,onDelay,busy,onSaved}){
 const clock=job.clock||{};
 const route=job.travel||{};
 return <div className="sw-dispatch-job sw-business-themed-card rounded-xl border border-cyan-300/15 p-3">
   <div className="flex items-start justify-between gap-2"><button onClick={()=>onOpen(job.ticket_id)} className="min-w-0 text-left"><strong className="block truncate text-sm text-white">{job.title||"Service job"}</strong><span className="text-xs text-slate-400">#{job.ticket_id} · {job.priority||"Standard"}</span></button><RiskBadge value={job.risk}/></div>
   <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><span className="block text-slate-400">Scheduled</span>{time(job.scheduled_start)}–{time(job.scheduled_end)}</div><div><span className="block text-slate-400">Expected finish</span>{time(job.expected_finish_at||job.scheduled_end)}</div></div>
   <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300"><span>{String(job.status||"").toUpperCase()==="EN_ROUTE"?"➜ En route":clock.running?"● Working now":clock.finished_at?"✓ Clock finished":String(job.status||"").replaceAll("_"," ")||"Not started"}</span><span>{route.minutes==null?"Travel unknown":`${route.minutes}m travel`}</span><span>{route.basis==="google_live_traffic"?"Live traffic":"Estimated route"}</span></div>
   {job.route_conflict&&<div className="mt-2 text-xs text-amber-200">Route conflict: {job.available_gap_minutes??"?"}m free, {job.required_gap_minutes??"?"}m required</div>}
   <div className="mt-2 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[11px] text-slate-400">{job.address||"Address not configured"}</span><button onClick={()=>onDelay(job.ticket_id,15)} disabled={busy} className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[11px] disabled:opacity-50">+15m</button></div>
   <TechnicianJobActions ticket={job} canDispatch compact onSaved={onSaved}/>
 </div>;
}
export default function SboDispatch(){
 const nav=useNavigate();
 const {themeProps}=useBusinessWorkspaceTheme();
 const [date,setDate]=useState(()=>isoDate(new Date()));
 const [view,setView]=useState("day"),[data,setData]=useState({staff:[],summary:{},recommendations:[]}),[week,setWeek]=useState([]),[workforce,setWorkforce]=useState([]);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[updated,setUpdated]=useState(null),[drawer,setDrawer]=useState(null),[refreshKey,setRefreshKey]=useState(0);
 const load=useCallback(async()=>{
   setBusy(true);setNotice("");
   try{
    const [operations,workers]=await Promise.allSettled([getLiveOperations(date),getBusinessWorkforce()]);
    if(operations.status==="fulfilled"){setData(operations.value);setUpdated(new Date());}else{setNotice(operations.reason?.response?.data?.detail||"Dispatch data temporarily unavailable.");setData({staff:[],summary:{},recommendations:[]});}
    if(workers.status==="fulfilled")setWorkforce(workers.value.members||[]);
    if(view==="week"){
      const start=new Date(`${date}T12:00:00`);start.setDate(start.getDate()-((start.getDay()+6)%7));
      const days=Array.from({length:7},(_,i)=>addDays(isoDate(start),i));
      const results=await Promise.allSettled(days.map(day=>getLiveOperations(day)));
      setWeek(results.map((x,i)=>({date:days[i],data:x.status==="fulfilled"?x.value:null})));
    }
   }finally{setBusy(false);}
 },[date,view,refreshKey]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{const timer=setInterval(()=>setRefreshKey(x=>x+1),30000);const focus=()=>setRefreshKey(x=>x+1);window.addEventListener("focus",focus);return()=>{clearInterval(timer);window.removeEventListener("focus",focus)}},[]);
 const staff=data.staff||[],summary=data.summary||{};
 const skillsById=useMemo(()=>new Map(workforce.map(p=>[String(p.member_id),p.workforce||{}])),[workforce]);
 const proposed=useMemo(()=>staff.map(person=>({person,stops:[...(person.jobs||[])].sort((a,b)=>String(a.scheduled_start||"").localeCompare(String(b.scheduled_start||"")))})),[staff]);
 const changeDelay=async(id,minutes)=>{
   setBusy(true);
   try{await updateDispatchDelay(id,minutes);setNotice(`Job #${id} adjusted ${minutes>0?"+":""}${minutes} minutes. Later stops were not automatically shifted.`);setRefreshKey(x=>x+1);}
   catch(e){setNotice(e?.response?.data?.detail||"Unable to change timing.");}finally{setBusy(false);}
 };
 const stats=[["Available technicians",staff.length],["Scheduled jobs",summary.scheduled_jobs??0],["Working now",summary.active_clocks??0],["At risk",summary.at_risk_or_late??0],["Route conflicts",summary.route_conflicts??0]];
 return <div {...themeProps} className="sw-dispatch-page relative isolate flex h-[calc(100dvh-110px)] min-h-[430px] flex-col overflow-hidden p-3 text-white sm:p-5">
  <div className="sw-dispatch-photo sw-business-themed-photo absolute inset-0 -z-20"/><div className="sw-business-themed-overlay absolute inset-0 -z-10"/>
  <header className="sw-business-themed-card flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-300/20 bg-slate-950/40 p-3 backdrop-blur-lg">
   <div><button onClick={()=>nav("/sbo")} className="flex items-center gap-1 text-[11px] text-slate-300"><ArrowLeft size={13}/>Business office</button><h1 className="mt-1 text-xl font-bold sm:text-2xl">Dispatch Board</h1><p className="text-xs text-slate-300">Plan the team’s day, track progress, and review route risk</p></div>
   <div className="flex flex-wrap items-center gap-2"><button onClick={()=>setView("day")} className={`rounded-lg px-2 py-2 text-xs ${view==="day"?"bg-cyan-500/35":"border border-white/15"}`}>Day</button><button onClick={()=>setView("week")} className={`rounded-lg px-2 py-2 text-xs ${view==="week"?"bg-cyan-500/35":"border border-white/15"}`}>Week</button><input aria-label="Dispatch date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="h-9 rounded-xl border border-white/15 bg-[#041127] px-2 text-xs text-white"/><button onClick={()=>setRefreshKey(x=>x+1)} aria-label="Refresh dispatch" className="rounded-lg border border-white/15 p-2"><RefreshCw size={16} className={busy?"animate-spin":""}/></button><button onClick={()=>nav("/sbo/quick-intake")} className="flex items-center gap-1 rounded-xl bg-cyan-500/25 px-3 py-2 text-xs font-bold text-cyan-100"><Plus size={16}/>New Ticket</button></div>
  </header>
  <div className="my-2 grid shrink-0 grid-cols-5 gap-1.5">{stats.map(([label,val])=><div key={label} className="sw-business-themed-card rounded-xl border border-white/10 bg-slate-950/35 p-2 backdrop-blur-md"><strong className="text-lg text-cyan-200">{val}</strong><span className="block text-[10px] text-slate-300">{label}</span></div>)}</div>
  {notice&&<p role="status" className="mb-2 shrink-0 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-100">{notice}</p>}
  <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_270px]">
   <main className="sw-business-themed-card min-h-0 overflow-y-auto rounded-2xl border border-cyan-300/20 bg-slate-950/35 p-3 backdrop-blur-md">
    <div className="mb-3 flex items-center justify-between text-xs"><strong>{view==="week"?"Weekly schedule":"Technician schedule"} · {date}</strong><span className="text-slate-400">{updated?`Updated ${time(updated)}`:"Loading"}</span></div>
    {view==="week"?<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{week.map(day=><button key={day.date} onClick={()=>{setDate(day.date);setView("day");}} className="rounded-xl border border-white/15 bg-white/5 p-3 text-left"><strong>{new Date(day.date+"T12:00:00").toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</strong><div className="mt-2 text-xs text-slate-300">{day.data?`${day.data.summary?.scheduled_jobs||0} jobs · ${day.data.summary?.at_risk_or_late||0} at risk`:"Unavailable"}</div></button>)}</div>:
    <div className="grid gap-3 xl:grid-cols-2">{staff.map(p=>{const profile=skillsById.get(String(p.member_id))||{};return <section key={p.member_id} className="sw-business-themed-card rounded-xl border border-white/15 bg-[#020a19]/35 p-3">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong>{p.name}</strong><p className="text-xs text-slate-400">{p.title} · {(p.jobs||[]).length} scheduled stops</p></div><button onClick={()=>setDrawer({type:"route",person:p})} className="rounded-lg border border-cyan-400/30 px-2 py-1.5 text-xs text-cyan-200">Route</button></div>
      <p className="mt-1 truncate text-[11px] text-slate-400">Base: {p.route_start_address||"not set"}</p>
      <p className="mt-1 text-[11px] text-cyan-200">Specialties: {profile.skills?.length?profile.skills.join(" · "):"Not configured"}</p>
      <div className="mt-3 space-y-2">{p.jobs?.length?p.jobs.map(j=><JobLine key={j.ticket_id} job={j} onOpen={id=>nav(`/tickets/${id}`)} onDelay={changeDelay} busy={busy} onSaved={()=>setRefreshKey(x=>x+1)}/>):<p className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-slate-400">No scheduled work. Use the Tech Board to assign tickets.</p>}</div>
    </section>})}</div>}
    {!busy&&!staff.length&&<p className="text-sm text-slate-300">No schedulable technicians found. Configure specialties and working hours in Workforce Settings.</p>}
   </main>
   <aside className="sw-business-themed-card flex min-h-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-cyan-300/20 bg-slate-950/35 p-3 backdrop-blur-md">
    <strong className="text-sm">Dispatch controls</strong>
    <button onClick={()=>nav("/sbo/tech-board")} className="flex justify-between rounded-xl border border-white/15 p-3 text-left text-xs">Assign unassigned tickets <ChevronRight size={15}/></button>
    <button onClick={()=>nav("/sbo/settings/workforce")} className="flex justify-between rounded-xl border border-white/15 p-3 text-left text-xs">Tech specialties & hours <ChevronRight size={15}/></button>
    <button onClick={()=>setDrawer({type:"plan"})} className="flex justify-between rounded-xl border border-white/15 p-3 text-left text-xs">Review route sequence <Route size={16}/></button>
    <button onClick={()=>nav("/calendar")} className="flex justify-between rounded-xl border border-white/15 p-3 text-left text-xs">Business calendar <CalendarDays size={16}/></button>
    <div className="mt-2 text-xs font-bold text-amber-200">Requires attention ({data.recommendations?.length||0})</div>
    {(data.recommendations||[]).slice(0,6).map((rec,i)=><button key={i} onClick={()=>nav(`/tickets/${rec.ticket_id}`)} className="rounded-xl border border-amber-300/20 p-2 text-left text-xs"><strong>{rec.type?.replaceAll("_"," ")}</strong><span className="block text-slate-300">{rec.message}</span></button>)}
    <p className="mt-auto text-[11px] leading-4 text-slate-400">Auto-refresh every 30 seconds while this page is open. Traffic is estimated unless the API explicitly reports live traffic.</p>
   </aside>
  </div>
  {drawer&&<div className="absolute inset-0 z-50 flex items-end justify-end bg-[#010615]/70 p-2 backdrop-blur-md sm:p-4" onClick={()=>setDrawer(null)}><section role="dialog" aria-modal="true" aria-label="Route planning" onClick={e=>e.stopPropagation()} className="max-h-[92%] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-300/35 bg-[#07152c]/95 p-4">
    <div className="mb-3 flex items-center justify-between"><strong>{drawer.person?.name||"Route review"} · Planned stops</strong><button onClick={()=>setDrawer(null)} aria-label="Close route review"><X size={20}/></button></div>
    <p className="mb-3 text-xs text-slate-300">Stops are shown in their scheduled order. This is a planning preview, not an automatic route optimization or reassignment.</p>
    {(drawer.person?[{person:drawer.person,stops:drawer.person.jobs||[]}]:proposed).map(({person,stops})=><div key={person.member_id} className="mb-4"><h3 className="mb-2 text-sm font-bold text-cyan-200">{person.name}</h3>{stops.length>0&&<a className="mb-3 inline-block rounded-lg border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(person.route_start_address||stops[0].address||"")}&destination=${encodeURIComponent(stops[stops.length-1].address||"")}${stops.length>1?`&waypoints=${encodeURIComponent(stops.slice(0,-1).map(j=>j.address).filter(Boolean).join("|"))}`:""}`}>Open scheduled route in Maps</a>}{stops.length?stops.map((j,i)=><div key={j.ticket_id} className="mb-2 rounded-lg border border-white/15 bg-white/5 p-3 text-xs"><div className="flex justify-between"><strong>{i+1}. {j.title}</strong><span>{time(j.scheduled_start)} → {time(j.expected_finish_at||j.scheduled_end)}</span></div><p className="mt-1 text-slate-300">{j.address||"Location not set"} · Travel {j.travel?.minutes??"unknown"}m ({j.travel?.basis==="google_live_traffic"?"Live":"estimated"})</p>{j.address&&<a className="mt-1 inline-block text-cyan-200 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address)}`}>Directions to stop</a>}</div>):<p className="text-slate-400">No stops planned</p>}</div>)}
    <button onClick={()=>{setDrawer(null);nav("/sbo/tech-board")}} className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100">Open technician assignments</button>
  </section></div>}
 </div>;
}

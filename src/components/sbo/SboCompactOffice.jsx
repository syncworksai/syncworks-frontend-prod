import "./SboCompactOffice.css";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardList, DollarSign, Users, X, Settings2, Megaphone, BarChart3, Clock3, Route, Plus, ChevronRight, RefreshCw, Activity, Wrench, PanelLeftClose } from "lucide-react";
import api from "../../api/client";
import { getLiveOperations } from "../../api/dispatch";
import TicketQuickMessage from "../tickets/TicketQuickMessage";
import SubcontractorQuickInvite from "./SubcontractorQuickInvite";

const links = {
  jobs: [["Job board","/tickets"],["New phone request","/sbo/quick-intake"],["Dispatch","/sbo/dispatch"],["Technician board","/sbo/tech-board"]],
  schedule: [["Calendar","/calendar"],["Appointments","/sbo/appointments"]],
  team: [["Employees","/team/invites"],["HR & availability","/sbo/settings/workforce"],["Technician board","/sbo/tech-board"],["Customers","/sbo/customers"],["Import customers","/sbo/customers/import"]],
  finance: [["Invoices","/sbo/invoices"],["Financial overview","/sbo/finance"],["Reports","/sbo/reports"]],
  growth: [["Leads","/sbo/leads"],["Social media","/sbo/growth"]],
  tools: [["Services & pricing","/sbo/catalog"],["Business settings","/sbo/settings"],["Business setup","/sbo/settings/general?setup=1"]],
  operations: [["Dispatch board","/sbo/dispatch"],["Live technician routes","/sbo/tech-board"],["Job history","/tickets"],["Business reports","/sbo/reports"]],
};
const menu = [
  {id:"jobs",title:"Jobs & requests",icon:ClipboardList},
  {id:"schedule",title:"Schedule",icon:CalendarDays},
  {id:"operations",title:"Operations KPIs",icon:Activity},
  {id:"team",title:"Team & customers",icon:Users},
  {id:"finance",title:"Finance",icon:DollarSign},
  {id:"growth",title:"Growth",icon:Megaphone},
  {id:"tools",title:"Tools & settings",icon:Settings2},
];
const readTheme=()=>{try{return JSON.parse(localStorage.getItem("sw_workspace_appearance_v1")||"{}").theme||"legacy";}catch{return "legacy";}};
const fmt=(n)=>new Intl.NumberFormat("en-US").format(Number(n||0));
const sec=(n)=>{const v=Number(n);return Number.isFinite(v)&&v>0?Math.round(v/60):null;};
const finished=(t)=>["completed","complete","closed","done"].includes(String(t?.status||"").toLowerCase());

function MiniBars({rows}) {
  const sorted=(rows||[]).slice(-12);
  const max=Math.max(1,...sorted.map(x=>Number(x?.tickets_completed_count||0)));
  return <div className="flex h-14 items-end gap-1" aria-label="Completed jobs trend, last available KPI periods">
    {sorted.length?sorted.map((r,i)=><div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-600/70 to-fuchsia-400/85" style={{height:`${Math.max(7,100*Number(r?.tickets_completed_count||0)/max)}%`}} title={`${r?.date||"Period"}: ${r?.tickets_completed_count||0} completed`}/>):<div className="text-xs text-slate-400">No KPI history</div>}
  </div>;
}

export default function SboCompactOffice({businessName,loading,err,ticketRows=[],kpiRows=[],openTickets,revenueThisMonth,completedJobs,onRefresh,activeBusinessId}) {
  const nav=useNavigate();
  const [panel,setPanel]=useState(null);
  const [quickMessageTicket,setQuickMessageTicket]=useState(null);
  const [theme,setTheme]=useState(readTheme);
  const [ops,setOps]=useState(null);
  const [opsError,setOpsError]=useState("");
  const [team,setTeam]=useState([]);
  const [refreshKey,setRefreshKey]=useState(0);
  useEffect(()=>{
    const sync=()=>setTheme(readTheme());
    window.addEventListener("sw:workspace-appearance",sync);window.addEventListener("storage",sync);
    return ()=>{window.removeEventListener("sw:workspace-appearance",sync);window.removeEventListener("storage",sync);};
  },[]);
  useEffect(()=>{
    if(!activeBusinessId)return;
    let mounted=true;
    setOps(null);setOpsError("");
    Promise.allSettled([getLiveOperations(),api.get(`/businesses/${activeBusinessId}/members/`)]).then(results=>{
      if(!mounted)return;
      if(results[0].status==="fulfilled")setOps(results[0].value);
      else setOpsError("Live technician metrics unavailable");
      if(results[1].status==="fulfilled"){const d=results[1].value.data;setTeam(Array.isArray(d)?d:d?.results||[]);}
      else setTeam([]);
    });
    return ()=>{mounted=false;};
  },[activeBusinessId,refreshKey]);
  useEffect(()=>{
    if(!panel)return;
    const key=e=>{if(e.key==="Escape")setPanel(null);};
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[panel]);
  const staff=ops?.staff||[];
  const summary=ops?.summary||{};
  const leaderboard=useMemo(()=>{
    const map=new Map();
    for(const m of team){const id=String(m.user||m.user_id||"");if(id)map.set(id,{name:m.user_name||[m.user_first_name,m.user_last_name].filter(Boolean).join(" ")||m.user_email||"Employee",count:0});}
    for(const person of staff){const id=String(person.user_id||"");if(id){const prev=map.get(id)||{name:person.name||"Employee",count:0};map.set(id,{...prev,name:person.name||prev.name});}}
    for(const ticket of ticketRows){if(!finished(ticket))continue;const id=String(ticket.assigned_member||ticket.assigned_member_id||"");if(!map.has(id))continue;map.get(id).count+=1;}
    return [...map.values()].filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,4);
  },[staff,team,ticketRows]);
  const hours=staff.flatMap(p=>p.jobs||[]).map(j=>sec(j?.clock?.elapsed_seconds)).filter(n=>n!==null);
  const averageMinutes=hours.length?Math.round(hours.reduce((a,b)=>a+b,0)/hours.length):null;
  const lastTicket=ticketRows.find(t=>t?.id||t?.ticket_id);
  const lastTicketId=lastTicket?.id||lastTicket?.ticket_id;
  const room=({future:"syncworks-future",classic:"classic-office",modern:"modern-dark",light:"clean-light",legacy:"syncworks-future"}[theme]||"syncworks-future");
  const tile="sw-sbo-glass-tile rounded-2xl px-3 py-3 text-left transition hover:border-cyan-300/70";
  const button=(label,url)=><button key={url} type="button" onClick={()=>nav(url)} className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-white/[.045] px-3 py-3 text-left text-sm text-white hover:bg-cyan-500/10">{label}<ChevronRight size={16} className="text-cyan-200"/></button>;
  return <div className={`sw-sbo-compact relative isolate h-[calc(100dvh-172px)] min-h-[380px] overflow-hidden text-white sm:h-[calc(100dvh-110px)] ${theme==="light"?"sw-sbo-light":""}`} style={{"--sw-sbo-room":`url("/office-themes/${room}.webp")`}}>
    <div aria-hidden="true" className="sw-sbo-room-art absolute inset-0 -z-20"/><div aria-hidden="true" className="sw-sbo-room-shade absolute inset-0 -z-10"/>
    <div className="mx-auto grid h-full max-w-[1540px] grid-cols-1 gap-3 px-3 py-3 md:grid-cols-[165px_minmax(0,1fr)_225px] md:px-5 lg:grid-cols-[205px_minmax(0,1fr)_270px]">
      <aside className="sw-sbo-rail hidden min-h-0 flex-col gap-2 rounded-2xl p-3 md:flex">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Business workspace</div>
        {menu.map(item=><button key={item.id} onClick={()=>setPanel(item.id)} className="sw-sbo-rail-link flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm"><item.icon size={17} className="shrink-0 text-cyan-300"/><span>{item.title}</span><ChevronRight size={13} className="ml-auto shrink-0 text-slate-400"/></button>)}
      </aside>
      <main className="flex min-h-0 flex-col gap-3">
        <header className="sw-sbo-topbar flex shrink-0 items-start justify-between gap-2 rounded-2xl p-3">
          <div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300">Your office · Today</span><h1 className="truncate text-xl font-semibold sm:text-2xl">{businessName||"Business"}</h1><p className="hidden text-xs text-slate-300 sm:block">One command center. Your next action is one tap away.</p></div>
          <div className="flex gap-2">{lastTicketId&&<button type="button" title="Message latest ticket" onClick={()=>setQuickMessageTicket(lastTicketId)} className="rounded-xl border border-cyan-400/35 px-3 py-2 text-xs text-cyan-200">Message</button>}<button aria-label="Refresh dashboard" title="Refresh metrics" onClick={()=>{onRefresh?.();setRefreshKey(v=>v+1);}} className="rounded-xl border border-white/15 p-2"><RefreshCw size={17} className={loading?"animate-spin":""}/></button><button onClick={()=>nav("/sbo/quick-intake")} className="flex items-center gap-1.5 rounded-xl border border-cyan-300/60 bg-cyan-500/25 px-3 py-2 text-xs font-bold text-cyan-50"><Plus size={17}/>New Call</button></div>
        </header>
        {err&&<p role="alert" className="shrink-0 truncate rounded-lg bg-rose-900/45 p-2 text-xs">{err}</p>}
        <section className="sw-sbo-briefing flex shrink-0 items-center justify-between gap-2 rounded-2xl p-3">
          <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Operations pulse</div><div className="truncate text-xs text-slate-200">{summary.at_risk_or_late ? `${summary.at_risk_or_late} job(s) at risk`:"Review calls, scheduling and team performance"}</div></div>
          <button onClick={()=>setPanel("operations")} className="shrink-0 text-xs font-semibold text-cyan-200">Details →</button>
        </section>
        <div className="grid shrink-0 grid-cols-3 gap-2">
          <button className="sw-sbo-stat rounded-xl p-2 text-left" onClick={()=>setPanel("jobs")}><strong className="block text-lg text-cyan-200">{fmt(openTickets)}</strong><small className="text-[10px] text-slate-300">Open jobs</small></button>
          <button className="sw-sbo-stat rounded-xl p-2 text-left" onClick={()=>setPanel("operations")}><strong className="block text-lg text-amber-200">{ops?fmt(summary.at_risk_or_late):"—"}</strong><small className="text-[10px] text-slate-300">At risk</small></button>
          <button className="sw-sbo-stat rounded-xl p-2 text-left" onClick={()=>setPanel("operations")}><strong className="block text-lg text-emerald-200">{ops?fmt(summary.active_clocks):"—"}</strong><small className="text-[10px] text-slate-300">Active clocks</small></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
          <button className={tile} onClick={()=>nav("/sbo/quick-intake")}><Plus className="mb-2 text-cyan-200" size={23}/><div className="font-semibold">New request</div><p className="text-xs text-slate-300">Customer calling in</p></button>
          <button className={tile} onClick={()=>setPanel("schedule")}><CalendarDays className="mb-2 text-cyan-200" size={23}/><div className="font-semibold">Schedule</div><p className="text-xs text-slate-300">Jobs and appointments</p></button>
          <button className={tile} onClick={()=>setPanel("operations")}><Route className="mb-2 text-cyan-200" size={23}/><div className="font-semibold">Tech routes</div><p className="text-xs text-slate-300">Timing and risk</p></button>
          <button className={tile} onClick={()=>setPanel("jobs")}><ClipboardList className="mb-2 text-cyan-200" size={23}/><div className="font-semibold">Job board</div><p className="text-xs text-slate-300">Assignments and follow-ups</p></button>
        </div>
        <div className="flex shrink-0 justify-between gap-2 md:hidden"><button onClick={()=>setPanel("team")} className="sw-sbo-stat flex-1 rounded-xl p-2 text-xs">Team</button><button onClick={()=>setPanel("finance")} className="sw-sbo-stat flex-1 rounded-xl p-2 text-xs">Finance</button><button onClick={()=>setPanel("tools")} className="sw-sbo-stat flex-1 rounded-xl p-2 text-xs">More</button></div>
      </main>
      <aside className="sw-sbo-rail hidden min-h-0 flex-col gap-3 overflow-hidden rounded-2xl p-3 md:flex">
        <div className="flex items-center justify-between"><strong className="text-sm">Quick intelligence</strong><button onClick={()=>setPanel("operations")} aria-label="Open KPI details" className="text-cyan-200"><ChevronRight size={17}/></button></div>
        <div className="sw-sbo-stat shrink-0 rounded-xl p-3"><div className="flex justify-between text-xs"><span>Jobs completed</span><strong className="text-emerald-200">{fmt(completedJobs)}</strong></div><MiniBars rows={kpiRows}/><p className="mt-1 text-[10px] text-slate-400">Available KPI history</p></div>
        <div className="sw-sbo-stat min-h-0 flex-1 overflow-hidden rounded-xl p-3"><div className="mb-2 text-xs font-semibold">Technician leaderboard</div>{leaderboard.length?leaderboard.map((person,i)=><div key={i} className="flex justify-between border-b border-white/10 py-2 text-xs"><span className="truncate">{i+1}. {person.name}</span><strong className="ml-2">{person.count}</strong></div>):<p className="text-xs text-slate-400">No completed assignments in the loaded job records.</p>}<p className="mt-2 text-[10px] text-slate-400">Completed jobs in loaded records, not all-time totals</p></div>
        <button onClick={()=>setPanel("operations")} className="sw-sbo-stat shrink-0 rounded-xl px-3 py-2 text-left text-xs">Route conflicts: {ops?fmt(summary.route_conflicts):"—"} · Travel delay: {ops?fmt(summary.traffic_delay_minutes):"—"} min</button>
      </aside>
    </div>
    {quickMessageTicket&&<TicketQuickMessage ticketId={quickMessageTicket} onClose={()=>setQuickMessageTicket(null)}/>}
    {panel&&<div className="absolute inset-0 z-40 flex items-end justify-end bg-[#010513]/65 p-2 backdrop-blur-sm sm:p-4" onClick={()=>setPanel(null)}>
      <section role="dialog" aria-modal="true" aria-label={panel==="subcontractors"?"Subcontractors":menu.find(m=>m.id===panel)?.title||"Operations"} onClick={e=>e.stopPropagation()} className="sw-sbo-drawer flex h-auto max-h-[96%] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-cyan-300/40 p-4 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">{panel==="subcontractors"?"Subcontractors":menu.find(m=>m.id===panel)?.title||"Operations"}</h2><button aria-label="Close drawer" onClick={()=>setPanel(null)} className="rounded-xl border border-white/15 p-2"><X size={18}/></button></div>
        {panel==="operations"&&<div className="mb-3 space-y-3 overflow-y-auto text-sm">
          <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/5 p-2"><strong className="block text-xl">{ops?summary.scheduled_jobs:"—"}</strong><small>Scheduled</small></div><div className="rounded-xl bg-white/5 p-2"><strong className="block text-xl">{ops?summary.route_conflicts:"—"}</strong><small>Conflicts</small></div><div className="rounded-xl bg-white/5 p-2"><strong className="block text-xl">{averageMinutes??"—"}</strong><small>Avg clock min*</small></div></div>
          {opsError&&<div className="text-xs text-amber-200">{opsError}</div>}
          <div className="text-xs text-slate-400">*Average elapsed time across available job clocks. Not a completed-call average.</div>
          <h3 className="font-semibold">Technician routes today</h3>
          {staff.length?staff.map(p=><div key={p.user_id} className="rounded-xl border border-white/15 bg-white/5 p-3"><div className="flex justify-between"><strong>{p.name}</strong><span>{p.jobs?.length||0} jobs</span></div>{(p.jobs||[]).map(j=><button key={j.ticket_id} onClick={()=>nav(`/tickets/${j.ticket_id}`)} className="mt-2 flex w-full justify-between gap-2 border-t border-white/10 pt-2 text-left text-xs"><span className="truncate">{j.title}</span><span className="shrink-0 text-cyan-200">{j.travel?.minutes??"—"} min travel · {j.risk||"—"}</span></button>)}</div>):<p className="text-slate-400">No schedulable technician routes returned for today.</p>}
        </div>}
        {panel==="subcontractors"?<SubcontractorQuickInvite activeBusinessId={activeBusinessId}/>:<div className="grid min-h-0 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">{(links[panel]||[]).map(([label,url])=>button(label,url))}{panel==="team"&&<button type="button" onClick={()=>setPanel("subcontractors")} className="flex items-center justify-between rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-3 text-left text-sm text-white hover:bg-cyan-500/20">Subcontractors · Invite <ChevronRight size={16} className="text-cyan-200"/></button>}</div>}
      </section>
    </div>}
  </div>;
}

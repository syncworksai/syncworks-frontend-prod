import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays, ChevronRight, ClipboardList, DollarSign, Menu, Settings2, Users, X, Zap, Megaphone, Package, Activity, Wrench } from "lucide-react";

const sections = [
  { id:"jobs", title:"Jobs & Requests", icon:ClipboardList, subtitle:"Requests, assignments, follow-ups", items:[["Job board","/tickets"],["New ticket","/sbo/quick-intake"],["Dispatch","/sbo/dispatch"],["Technician board","/sbo/tech-board"]] },
  { id:"schedule", title:"Schedule", icon:CalendarDays, subtitle:"Appointments and calendar", items:[["Calendar","/calendar"],["Appointments","/sbo/appointments"]] },
  { id:"team", title:"Team & Customers", icon:Users, subtitle:"Employees and customers", items:[["Employees","/team/invites"],["Customers","/sbo/customers"],["Import customers","/sbo/customers/import"]] },
  { id:"finance", title:"Finance", icon:DollarSign, subtitle:"Revenue, invoices, reports", items:[["Invoices","/sbo/invoices"],["Financial overview","/sbo/finance"],["Reports","/sbo/reports"]] },
  { id:"growth", title:"Growth", icon:Megaphone, subtitle:"Leads and campaigns", items:[["Leads","/sbo/leads"],["Social media","/sbo/growth"]] },
  { id:"tools", title:"Tools & Settings", icon:Settings2, subtitle:"Catalog and configuration", items:[["Services & pricing","/sbo/catalog"],["Business settings","/sbo/settings"],["Business setup","/sbo/settings/general?setup=1"]] },
];
const readTheme = () => {
  try { return JSON.parse(localStorage.getItem("sw_workspace_appearance_v1") || "{}").theme || "legacy"; } catch { return "legacy"; }
};

export default function SboCompactOffice({ businessName, loading, err, ticketRows = [], openTickets, revenueThisMonth, completedJobs, onRefresh }) {
  const nav = useNavigate();
  const [panel, setPanel] = useState(null);
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const sync = () => setTheme(readTheme());
    window.addEventListener("sw:workspace-appearance",sync);
    window.addEventListener("storage",sync);
    return () => { window.removeEventListener("sw:workspace-appearance",sync);window.removeEventListener("storage",sync); };
  },[]);
  useEffect(() => {
    if (!panel) return;
    const handle = (e) => { if (e.key === "Escape") setPanel(null); };
    window.addEventListener("keydown",handle);
    return () => window.removeEventListener("keydown",handle);
  },[panel]);
  const chosen = sections.find(x => x.id === panel);
  const money = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(revenueThisMonth || 0));
  const nextTicket = ticketRows.find(t => !["completed","cancelled","closed"].includes(String(t?.status || "").toLowerCase())) || ticketRows[0];
  const appearance = {
    future:"radial-gradient(ellipse at 22% 5%,rgba(91,33,182,.36),transparent 52%),radial-gradient(ellipse at 95% 88%,rgba(8,145,178,.25),transparent 45%),#070b20",
    classic:"linear-gradient(140deg,#1a1611,#26211b 60%,#101520)",
    modern:"linear-gradient(140deg,#070c14,#151e2c)",
    light:"linear-gradient(135deg,#f1f0ed,#e5edf2)",
    legacy:"radial-gradient(ellipse at 8% 15%,rgba(15,118,172,.2),transparent 50%),radial-gradient(ellipse at 90% 75%,rgba(147,51,234,.15),transparent 55%),#050b1b"
  }[theme] || "#050b1b";
  const light = theme === "light";
  const tileClass = `group flex min-h-0 flex-col justify-between gap-1 rounded-2xl border border-cyan-400/20 bg-slate-950/30 p-3 text-left backdrop-blur-lg transition hover:border-cyan-300/60 hover:bg-cyan-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300`;
  return <div className={`sw-sbo-compact relative flex h-[calc(100dvh-172px)] min-h-[370px] w-full flex-col overflow-hidden px-3 pb-2 pt-2 sm:h-[calc(100dvh-110px)] sm:px-6 ${light ? "text-slate-900":"text-white"}`} style={{background:appearance}}>
    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-2">
      <header className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-400">SYNCWORKS OFFICE</div><h1 className="truncate text-lg font-bold sm:text-2xl">{businessName || "Business Command"}</h1></div>
        <div className="flex items-center gap-2"><button type="button" onClick={onRefresh} className="rounded-xl border border-cyan-400/20 px-3 py-2 text-xs">{loading?"Syncing":"Refresh"}</button><button type="button" onClick={()=>setPanel("tools")} aria-label="Open office tools" className="rounded-xl border border-cyan-400/20 p-2"><Menu size={18}/></button></div>
      </header>
      {err && <p role="alert" className="shrink-0 truncate text-xs text-rose-300">{err}</p>}
      <div className="grid shrink-0 grid-cols-3 gap-2">
        <button className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-2 text-left" onClick={()=>setPanel("jobs")}><span className="block text-xl font-bold text-cyan-200">{openTickets ?? 0}</span><span className="text-[10px] text-slate-400">Open tickets</span></button>
        <button className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-2 text-left" onClick={()=>setPanel("finance")}><span className="block truncate text-xl font-bold text-fuchsia-200">{money}</span><span className="text-[10px] text-slate-400">Revenue</span></button>
        <button className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-2 text-left" onClick={()=>setPanel("jobs")}><span className="block text-xl font-bold text-emerald-200">{completedJobs ?? 0}</span><span className="text-[10px] text-slate-400">Completed</span></button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2 lg:grid-cols-3 lg:grid-rows-2">
        {sections.map(s => <button key={s.id} type="button" className={tileClass} onClick={()=>setPanel(s.id)}><s.icon className="h-6 w-6 text-cyan-300 sm:h-8 sm:w-8" strokeWidth={1.6}/><span className="block"><strong className="block text-[13px] leading-5 sm:text-lg">{s.title}</strong><small className="hidden text-xs text-slate-400 sm:block">{s.subtitle}</small></span><ChevronRight className="absolute opacity-0" size={15}/></button>)}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-slate-950/35 px-3 py-2 text-xs">
        <span className="min-w-0 truncate text-slate-300">{nextTicket ? `Recent: ${nextTicket.title || nextTicket.name || "Service request"}`:"All caught up · No recent requests"}</span>
        <button className="shrink-0 font-semibold text-cyan-300" onClick={()=>nav("/tickets")}>Open board</button>
      </div>
    </div>
    {chosen && <div className="absolute inset-0 z-[40] flex items-end justify-center bg-[#010513]/75 p-2 backdrop-blur-sm sm:items-center" role="presentation" onClick={()=>setPanel(null)}>
      <section role="dialog" aria-modal="true" aria-label={chosen.title} onClick={e=>e.stopPropagation()} className="flex max-h-[95%] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-cyan-400/35 bg-[#090f24]/95 p-4 text-white shadow-[0_0_70px_rgba(34,211,238,.2)]">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><chosen.icon className="text-cyan-300"/><div><h2 className="font-bold">{chosen.title}</h2><p className="text-xs text-slate-400">{chosen.subtitle}</p></div></div><button type="button" aria-label="Close panel" onClick={()=>setPanel(null)} className="rounded-xl border border-white/15 p-2"><X size={18}/></button></div>
        <div className="grid min-h-0 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">{chosen.items.map(([label,url])=><button type="button" key={url} onClick={()=>nav(url)} className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-white/[.035] px-4 py-3 text-left text-sm hover:bg-cyan-400/10">{label}<ChevronRight size={17} className="text-cyan-300"/></button>)}</div>
      </section>
    </div>}
  </div>;
}

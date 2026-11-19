import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, BriefcaseBusiness, CalendarDays, Crown, DollarSign, FileText, RefreshCw, ShieldCheck, Users } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "../components/sbo/SboCompactOffice.css";

const list = (value) => Array.isArray(value) ? value : (Array.isArray(value?.results) ? value.results : []);
const money = cents => (Number(cents || 0) / 100).toLocaleString("en-US", {style:"currency", currency:"USD"});
const isClosed = ticket => ["COMPLETED","CLOSED","PAID","CANCELLED"].includes(String(ticket?.status || "").toUpperCase());

export default function CeoCommandCenter() {
  const nav = useNavigate();
  const { activeBusinessId } = useAuth();
  const [context, setContext] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");
  const [metrics, setMetrics] = useState(null);
  const [dataError, setDataError] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [updated, setUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setAuthStatus("loading");
    setContext(null);
    setMetrics(null);
    setDataError("");
    if (!activeBusinessId) { setAuthStatus("no-business"); return; }
    try {
      const response = await api.get("/businesses/access-contexts/");
      const found = list(response.data?.businesses).find(item => String(item.business_id) === String(activeBusinessId));
      if (!found?.can_access_ceo) { setAuthStatus("denied"); return; }
      setContext(found);
      setAuthStatus("authorized");
      const settled = await Promise.allSettled([
        api.get("/kpis/business/", {params:{days:30}}),
        api.get("/tickets/"),
        api.get("/business-members/me/")
      ]);
      const [kpi, tickets, employees] = settled;
      if (kpi.status !== "fulfilled" || tickets.status !== "fulfilled" || employees.status !== "fulfilled") {
        setDataError("Some business metrics could not be verified. Unavailable fields are hidden.");
      }
      const rows = kpi.status === "fulfilled" ? list(kpi.value.data) : null;
      const jobs = tickets.status === "fulfilled" ? list(tickets.value.data) : null;
      const memberRows = employees.status === "fulfilled" ? list(employees.value.data) : null;
      setMetrics({
        revenue: rows === null ? null : rows.reduce((sum, item) => sum + Number(item.gmv_paid_cents || 0), 0),
        openJobs: jobs === null ? null : jobs.filter(ticket => !isClosed(ticket)).length,
        completedJobs: jobs === null ? null : jobs.filter(ticket => String(ticket.status || "").toUpperCase() === "COMPLETED").length,
        teamSize: memberRows === null ? null : memberRows.filter(item => String(item.business) === String(activeBusinessId) && item.is_active && item.role !== "OWNER").length,
      });
      setUpdated(new Date());
    } catch (error) {
      setAuthStatus(error?.response?.status === 403 ? "denied" : "unavailable");
    }
  }, [activeBusinessId]);

  useEffect(() => { refresh(); }, [refresh]);
  const cards = useMemo(() => [
    {title:"Paid GMV · 30 days", value: metrics?.revenue == null ? "—" : money(metrics.revenue), icon:DollarSign, path:"/sbo/finance"},
    {title:"Open jobs", value: metrics?.openJobs ?? "—", icon:BriefcaseBusiness, path:"/tickets"},
    {title:"Completed jobs · loaded", value:metrics?.completedJobs ?? "—", icon:Activity, path:"/sbo/reports"},
    {title:"Employees", value:metrics?.teamSize ?? "—", icon:Users, path:"/team/invites"},
  ], [metrics]);

  const modules = [
    {name:"Business operations", icon:BriefcaseBusiness, links:[["Operations office","/sbo"],["Dispatch","/sbo/dispatch"],["Technician board","/sbo/tech-board"]]},
    {name:"Finance", icon:DollarSign, links:[["Financial overview","/sbo/finance"],["Invoices","/sbo/invoices"],["Reports","/sbo/reports"]]},
    {name:"Team & HR", icon:Users, links:[["Manage team roles","/team/invites"],["Workforce settings","/sbo/settings/workforce"]]},
    {name:"Scheduling", icon:CalendarDays, links:[["Calendar","/calendar"],["Appointments","/sbo/appointments"]]},
    {name:"Executive reports", icon:FileText, links:[["Operational reports","/sbo/reports"],["Business intelligence","/sbo/finance-intelligence"]]},
  ];

  if (authStatus !== "authorized") {
    return <main className="mx-auto flex h-[calc(100dvh-112px)] max-w-xl flex-col justify-center gap-4 p-5 text-slate-100">
      <Crown className="text-amber-300" size={34}/>
      <h1 className="text-2xl font-bold">CEO Command Center</h1>
      <p role="status">{authStatus === "loading" ? "Verifying business ownership…" : authStatus === "denied" ? "This business is not owned by your current account. Switch businesses or ask its owner." : authStatus === "no-business" ? "Select a business from My Workspaces." : "Business ownership could not be verified. Access is not available until verification succeeds."}</p>
      <div className="flex gap-3"><button className="rounded-xl border border-white/20 p-3" onClick={() => nav("/sbo")}>Back to business</button><button className="rounded-xl border border-cyan-400/30 p-3" onClick={refresh}>Retry verification</button></div>
    </main>;
  }

  return <div className="sw-sbo-compact relative isolate h-[calc(100dvh-172px)] min-h-[380px] overflow-hidden text-white sm:h-[calc(100dvh-110px)]" style={{"--sw-sbo-room":'url("/office-themes/modern-dark.webp")'}}>
    <div aria-hidden="true" className="sw-sbo-room-art absolute inset-0 -z-20"/><div aria-hidden="true" className="sw-sbo-room-shade absolute inset-0 -z-10"/>
    <main className="mx-auto flex h-full max-w-7xl flex-col gap-3 overflow-hidden p-3 sm:p-5">
      <header className="flex shrink-0 items-center justify-between rounded-2xl border border-white/15 bg-slate-950/55 p-3 backdrop-blur-xl">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">Executive office · Owner access</p><h1 className="text-xl font-bold sm:text-2xl">{context.business_name} · CEO</h1><p className="text-xs text-slate-300">Solo operation or delegated team management</p></div>
        <div className="flex gap-2"><button aria-label="Return to operations" onClick={() => nav("/sbo")} className="rounded-lg border border-white/15 p-2"><ArrowLeft size={18}/></button><button aria-label="Refresh executive metrics" onClick={refresh} className="rounded-lg border border-white/15 p-2"><RefreshCw size={18}/></button></div>
      </header>
      {dataError && <p className="shrink-0 text-xs text-amber-200" role="status">{dataError}</p>}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map(({title,value,icon:Icon,path}) => <button key={title} type="button" onClick={() => nav(path)} className="rounded-xl border border-white/15 bg-slate-950/55 p-3 text-left backdrop-blur-lg transition hover:border-amber-300/60"><div className="flex items-center justify-between gap-1 text-xs text-slate-300">{title}<Icon size={16}/></div><strong className="mt-2 block text-xl">{value}</strong></button>)}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/40 p-3 backdrop-blur-lg">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Executive controls</h2><span className="flex items-center gap-1 text-xs text-emerald-200"><ShieldCheck size={14}/> Verified owner</span></div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {modules.map(({name,icon:Icon}) => <button key={name} type="button" onClick={() => setDrawer(name)} className="flex min-h-24 flex-col items-start justify-between rounded-xl border border-white/15 bg-white/5 p-3 text-left hover:border-amber-300/50"><Icon size={20} className="text-amber-200"/><span className="text-sm font-medium">{name}</span></button>)}
        </div>
        <p className="mt-3 text-xs text-slate-400">Revenue represents paid gross merchandise volume, not profit. Job totals reflect loaded ticket records. {updated ? "Refreshed "+updated.toLocaleTimeString() : ""}</p>
      </div>
    </main>
    {drawer && <div className="absolute inset-0 z-20 flex justify-end bg-black/55 backdrop-blur-sm" onClick={() => setDrawer(null)}>
      <section role="dialog" aria-modal="true" aria-label={drawer} onClick={event => event.stopPropagation()} className="flex h-full w-full max-w-md flex-col gap-3 border-l border-cyan-300/30 bg-slate-950/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{drawer}</h2><button className="rounded-lg border border-white/20 px-3 py-2" onClick={() => setDrawer(null)}>Close</button></div>
        {modules.find(item => item.name === drawer)?.links.map(([name,path]) => <button key={path} onClick={() => nav(path)} className="rounded-xl border border-white/20 p-3 text-left hover:border-cyan-300">{name}</button>)}
      </section>
    </div>}
  </div>;
}

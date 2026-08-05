import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

function Card({ children, className = "" }) {
  return <section className={`rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 ${className}`}>{children}</section>;
}

function Kpi({ label, value, hint }) {
  return <Card className="p-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-3 text-3xl font-black text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></Card>;
}

export default function PropertyManagerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectSummary, setProjectSummary] = useState({ active: 0, blocked: 0, overdue: 0 });

  async function load() {
    setLoading(true);
    try {
      const workspace = (await api.get("/pm-hub/workspaces/current/")).data;
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const [propertyRes, orderRes, projectRes, metricsRes] = await Promise.allSettled([
        api.get("/pm-hub/properties/", { headers }),
        api.get("/pm-hub/work-orders/", { headers }),
        api.get("/pm-hub/projects/", { headers }),
        api.get("/pm-hub/projects/metrics/", { headers }),
      ]);
      if (propertyRes.status === "fulfilled") setProperties(list(propertyRes.value.data));
      if (orderRes.status === "fulfilled") setWorkOrders(list(orderRes.value.data));
      if (projectRes.status === "fulfilled") setProjects(list(projectRes.value.data));
      if (metricsRes.status === "fulfilled") setProjectSummary(metricsRes.value.data || {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const occupancy = properties.length ? Math.round(properties.reduce((sum, item) => sum + Number(item.occupancy_rate || 0), 0) / properties.length * 100) : 0;
    const atRisk = properties.filter((item) => item.status === "AT_RISK").length;
    const makeReady = workOrders.filter((item) => item.category === "MAKE_READY" && item.status !== "COMPLETED").length;
    return { occupancy, atRisk, makeReady };
  }, [properties, workOrders]);

  return <PMShell><main className="space-y-5 px-4 py-6 sm:px-6">
    <Card className="overflow-hidden bg-gradient-to-br from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-5 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Portfolio operations</div><h2 className="mt-2 text-3xl font-black text-white">Portfolio Command Center</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Real-time oversight of properties, occupants, maintenance, make-ready work, projects, messages, and financial health.</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => nav("/pm/tenants")} className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950">Create Tenant</button><button type="button" onClick={() => nav("/pm/settings?view=messages")} className="rounded-2xl border border-slate-700 bg-black/25 px-5 py-3 text-sm font-black text-white">Open Messages</button><button type="button" onClick={() => nav("/pm/settings?view=make-ready")} className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/15 px-5 py-3 text-sm font-black text-fuchsia-100">Open Make Ready</button></div></div>
        <div className="rounded-3xl border border-cyan-500/15 bg-black/25 p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Portfolio Health</div><div className="mt-3 text-5xl font-black text-white">{Math.max(0, 100 - stats.atRisk * 15 - Number(projectSummary.blocked || 0) * 8)}</div><div className="mt-2 text-sm text-slate-400">{stats.atRisk || projectSummary.blocked ? "Needs attention" : "Performing well"}</div></div>
      </div>
    </Card>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Kpi label="Properties" value={properties.length} hint="Portfolio inventory" />
      <Kpi label="Occupancy" value={`${stats.occupancy}%`} hint="Live average" />
      <Kpi label="At Risk" value={stats.atRisk} hint="Requires review" />
      <Kpi label="Work Orders" value={workOrders.filter((item) => item.status !== "COMPLETED").length} hint="Open requests" />
      <Kpi label="Make Ready" value={stats.makeReady} hint="Vacant-property work" />
      <Kpi label="Projects" value={projectSummary.active || projects.length} hint={`${projectSummary.blocked || 0} blocked`} />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card><div className="flex items-center justify-between border-b border-cyan-500/10 px-5 py-4"><div><h3 className="text-lg font-black text-white">Portfolio Snapshot</h3><p className="mt-1 text-xs text-slate-500">Property health, occupancy, status, and balance.</p></div><button type="button" onClick={() => nav("/pm/properties")} className="text-xs font-black text-cyan-300">View all →</button></div><div className="space-y-3 p-4">{loading ? <div className="p-6 text-sm text-slate-500">Loading properties...</div> : properties.length ? properties.slice(0, 5).map((property) => <button key={property.id} type="button" onClick={() => nav(`/pm/properties/${property.id}`)} className="w-full rounded-2xl border border-slate-800 bg-black/25 p-4 text-left hover:border-cyan-400/35"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{property.name}</div><div className="mt-1 text-xs text-slate-500">{[property.address, property.city, property.state].filter(Boolean).join(", ")}</div></div><span className="rounded-full border border-cyan-400/25 px-3 py-1 text-[10px] font-black text-cyan-200">{String(property.status || "HEALTHY").replaceAll("_", " ")}</span></div><div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: `${Math.round(Number(property.occupancy_rate || 0) * 100)}%` }} /></div><span className="text-xs font-black text-white">{Math.round(Number(property.occupancy_rate || 0) * 100)}%</span></div></button>) : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No properties yet.</div>}</div></Card>
      <div className="space-y-5">
        <Card><div className="border-b border-cyan-500/10 px-5 py-4"><h3 className="text-lg font-black text-white">Quick Operations</h3><p className="mt-1 text-xs text-slate-500">High-frequency PM actions.</p></div><div className="grid grid-cols-2 gap-3 p-4">{[["Messages", "/pm/settings?view=messages"], ["Make Ready", "/pm/settings?view=make-ready"], ["Add Property", "/pm/properties/new"], ["Add Tenant", "/pm/tenants"], ["Work Orders", "/pm/work-orders"], ["Team", "/pm/employees"]].map(([label, path]) => <button key={label} type="button" onClick={() => nav(path)} className="rounded-2xl border border-slate-700 bg-black/25 px-4 py-4 text-sm font-black text-slate-200 hover:border-cyan-400/35">{label}</button>)}</div></Card>
        <Card><div className="border-b border-cyan-500/10 px-5 py-4"><h3 className="text-lg font-black text-white">Executive Attention</h3></div><div className="space-y-3 p-4"><div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4"><div className="font-black text-rose-100">{stats.atRisk} properties at risk</div></div><div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4"><div className="font-black text-amber-100">{projectSummary.overdue || 0} overdue projects</div></div><div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4"><div className="font-black text-fuchsia-100">{stats.makeReady} make-ready properties</div></div></div></Card>
      </div>
    </div>
  </main></PMShell>;
}

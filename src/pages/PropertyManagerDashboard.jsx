import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";
import PMHeader from "../components/pm/PMHeader";

function Metric({ label, value, hint, tone = "cyan" }) {
  const tones = { cyan: "border-cyan-500/30 text-cyan-200", emerald: "border-emerald-500/30 text-emerald-200", rose: "border-rose-500/30 text-rose-200", amber: "border-amber-500/30 text-amber-200" };
  return <div className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/95 p-5"><div className="flex items-center justify-between gap-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div><span className={`rounded-full border bg-black/20 px-2.5 py-1 text-[10px] font-bold ${tones[tone]}`}>LIVE</span></div><div className="mt-4 text-3xl font-semibold text-white">{value}</div><div className="mt-2 text-xs text-slate-500">{hint}</div></div>;
}

function Panel({ title, subtitle, children }) {
  return <section className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/90"><div className="border-b border-slate-800/70 px-5 py-4"><h2 className="text-sm font-semibold text-white">{title}</h2>{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}</div><div className="p-5">{children}</div></section>;
}

function ActionCard({ title, description, price, onClick, tone = "slate" }) {
  const active = tone === "cyan" ? "border-cyan-400/35 bg-cyan-500/10 hover:border-cyan-300/60" : tone === "fuchsia" ? "border-fuchsia-500/30 bg-fuchsia-500/10 hover:border-fuchsia-300/55" : "border-slate-700 bg-black/25 hover:border-cyan-400/40";
  return <button type="button" onClick={onClick} className={`min-h-32 rounded-3xl border p-4 text-left transition ${active}`}><div className="flex items-start justify-between gap-3"><div className="text-base font-semibold text-white">{title}</div>{price ? <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-bold text-fuchsia-100">{price}</span> : null}</div><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></button>;
}

export default function PropertyManagerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [workspace, setWorkspace] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    try {
      const workspaceResponse = await api.get("/pm-hub/workspaces/current/");
      const currentWorkspace = workspaceResponse.data;
      setWorkspace(currentWorkspace);
      const headers = { "X-PM-Workspace-ID": String(currentWorkspace.id) };
      const [propertiesResult, workOrdersResult] = await Promise.allSettled([api.get("/pm-hub/properties/", { headers }), api.get("/pm/work-orders/")]);
      if (propertiesResult.status === "fulfilled") {
        const data = propertiesResult.value.data;
        setProperties(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
      } else setProperties([]);
      if (workOrdersResult.status === "fulfilled") {
        const data = workOrdersResult.value.data;
        setWorkOrders(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
      } else setWorkOrders([]);
    } catch {
      setWorkspace(null);
      setProperties([]);
      setWorkOrders([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDashboard(); }, []);

  const stats = useMemo(() => ({
    total: properties.length,
    occupied: properties.filter((item) => Number(item?.occupancy_rate || 0) >= 0.9).length,
    risk: properties.filter((item) => String(item?.status || "").toUpperCase() === "AT_RISK").length,
    workOrders: workOrders.length,
  }), [properties, workOrders]);

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <PMHeader title={workspace?.name || "Property Management"} subtitle="Portfolio operations, tenants, maintenance, and scheduling" actions={<><Button tone="slate" onClick={loadDashboard} disabled={loading}>Refresh</Button><Button tone="cyan" onClick={() => nav("/pm/properties/new")}>Add Property</Button></>} />
      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-6">
        <Panel title="Get Started" subtitle="Set up and run your Property Management portfolio from one place.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActionCard title="Set Up Portfolio" description="Complete or edit the identity, contact information, and communication settings for your free portfolio." tone="cyan" onClick={() => nav("/pm/settings")} />
            <ActionCard title="Create New Portfolio" description="Add another independent portfolio with its own properties, tenants, and communication identity." price="$9.99/mo" tone="fuchsia" onClick={() => nav("/pm/settings?new=1")} />
            <ActionCard title="Create Tenant" description="Add a tenant record, assign a property or unit, and send onboarding." onClick={() => nav("/pm/tenants")} />
            <ActionCard title="Create Property" description="Add a property to the currently selected portfolio." onClick={() => nav(workspace?.id ? "/pm/properties/new" : "/pm/settings")} />
          </div>
          <div className="mt-4 text-xs text-slate-500">Your first portfolio is free. Each additional portfolio requires the $9.99 monthly plan.</div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total Properties" value={stats.total} hint="Portfolio total" />
          <Metric label="Healthy Occupancy" value={stats.occupied} hint="90%+ occupied" tone="emerald" />
          <Metric label="At Risk" value={stats.risk} hint="Needs attention" tone="rose" />
          <Metric label="Work Orders" value={stats.workOrders} hint="Active requests" tone="amber" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Panel title="Property Portfolio" subtitle="Open a property to manage units, leases, tenants, and documents.">
            {loading ? <div className="text-sm text-slate-500">Loading properties...</div> : properties.length ? <div className="grid gap-3">{properties.map((property) => <button key={property.id} type="button" onClick={() => nav(`/pm/properties/${property.id}`)} className="w-full rounded-3xl border border-blue-500/15 bg-black/25 p-4 text-left transition hover:border-cyan-400/40"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{property.name || "Unnamed Property"}</div><div className="mt-1 truncate text-xs text-slate-500">{[property.address, property.city, property.state].filter(Boolean).join(", ") || "Address not entered"}</div></div><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-200">{String(property.status || "HEALTHY").replaceAll("_", " ")}</span></div></button>)}</div> : <div className="rounded-3xl border border-dashed border-slate-800 bg-black/20 p-8 text-center"><div className="text-sm text-slate-400">No properties have been added.</div><div className="mt-4"><Button tone="cyan" onClick={() => nav(workspace?.id ? "/pm/properties/new" : "/pm/settings")}>{workspace?.id ? "Create First Property" : "Set Up Portfolio"}</Button></div></div>}
          </Panel>

          <div className="space-y-6">
            <Panel title="Operations" subtitle="Daily Property Management tools."><div className="grid gap-3"><Button tone="cyan" onClick={() => nav("/pm/tenants")}>Tenant Center</Button><Button tone="slate" onClick={() => nav("/pm/settings")}>Portfolio Settings</Button><Button tone="slate" onClick={() => nav("/pm/employees")}>Team</Button><Button tone="slate" onClick={() => nav("/pm/calendar")}>Schedule</Button></div></Panel>
            <Panel title="Work Orders" subtitle="Current maintenance queue.">{workOrders.length ? <div className="space-y-3">{workOrders.slice(0, 6).map((item) => <div key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="text-sm font-semibold text-white">{item.title || "Work Order"}</div><div className="mt-1 text-xs text-slate-500">{item.property_name || "Property"} · {item.status || "OPEN"}</div></div>)}</div> : <div className="text-sm text-slate-500">No active work orders.</div>}</Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

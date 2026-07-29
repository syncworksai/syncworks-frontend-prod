import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";
import PMHeader from "../components/pm/PMHeader";

const NAV_ITEMS = [
  ["Dashboard", "/pm", "⌂"],
  ["Projects", "/pm/projects", "▣"],
  ["Properties", "/pm/properties", "▥"],
  ["Tenants", "/pm/tenants", "♙"],
  ["Work Orders", "/pm/work-orders", "⌁"],
  ["Schedule", "/pm/calendar", "□"],
  ["Team", "/pm/employees", "♢"],
  ["Settings", "/pm/settings", "⚙"],
];

const toneStyles = {
  cyan: "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-200",
  emerald: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200",
  rose: "border-rose-400/25 bg-rose-400/[0.06] text-rose-200",
  amber: "border-amber-400/25 bg-amber-400/[0.06] text-amber-200",
  violet: "border-violet-400/25 bg-violet-400/[0.06] text-violet-200",
};

function Surface({ children, className = "" }) {
  return (
    <section className={`rounded-[26px] border border-cyan-500/15 bg-[#07111f]/95 shadow-[0_20px_70px_rgba(0,0,0,0.34)] ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 px-5 py-4">
      <div>
        <h2 className="text-sm font-bold text-white sm:text-base">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function KpiCard({ label, value, hint, tone = "cyan", bars = false }) {
  const barHeights = [32, 48, 38, 70, 56, 86, 72];
  return (
    <div className="relative min-w-[225px] overflow-hidden rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-[#0a1728] to-[#060d18] p-4 shadow-[0_14px_45px_rgba(0,0,0,0.26)]">
      <div className={`absolute -right-8 -top-12 h-28 w-28 rounded-full blur-3xl ${tone === "rose" ? "bg-rose-500/20" : tone === "amber" ? "bg-amber-500/15" : tone === "violet" ? "bg-violet-500/20" : "bg-cyan-500/15"}`} />
      <div className="relative flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${toneStyles[tone]}`}>Live</span>
      </div>
      <div className="relative mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-black tracking-tight text-white">{value}</div>
          <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
        </div>
        {bars ? (
          <div className="flex h-12 items-end gap-1">
            {barHeights.map((height, index) => (
              <span key={index} className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500/20 to-cyan-300" style={{ height: `${height}%` }} />
            ))}
          </div>
        ) : (
          <div className={`grid h-12 w-12 place-items-center rounded-full border-4 ${toneStyles[tone]}`}>
            <span className="h-3 w-3 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressRing({ value = 0, tone = "cyan" }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  const ring = tone === "rose" ? "#fb7185" : tone === "amber" ? "#fbbf24" : tone === "violet" ? "#a78bfa" : "#22d3ee";
  return (
    <div className="relative h-11 w-11 shrink-0 rounded-full" style={{ background: `conic-gradient(${ring} ${safe * 3.6}deg, rgba(51,65,85,.55) 0deg)` }}>
      <div className="absolute inset-[5px] grid place-items-center rounded-full bg-[#07111f] text-[9px] font-black text-white">{safe}%</div>
    </div>
  );
}

function PropertyVisual({ property, index }) {
  const source = property?.image_url || property?.photo_url || property?.cover_image_url || property?.logo_url;
  if (source) return <img src={source} alt="" className="h-full w-full object-cover" />;
  const gradients = [
    "from-cyan-500/70 via-blue-700/40 to-fuchsia-600/40",
    "from-violet-500/60 via-sky-700/40 to-cyan-500/30",
    "from-fuchsia-500/50 via-indigo-700/50 to-cyan-600/40",
  ];
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${gradients[index % gradients.length]}`}>
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-[linear-gradient(135deg,transparent_25%,rgba(0,0,0,.34)_25%,rgba(0,0,0,.34)_50%,transparent_50%,transparent_75%,rgba(0,0,0,.22)_75%)] bg-[length:26px_26px]" />
      <div className="absolute inset-x-4 bottom-3 flex items-end gap-2">
        {[42, 68, 54, 82, 48].map((height, itemIndex) => <span key={itemIndex} className="flex-1 rounded-t border border-cyan-200/20 bg-black/40" style={{ height }} />)}
      </div>
    </div>
  );
}

function DesktopSidebar({ nav, workspace }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] border-r border-cyan-500/15 bg-[#030812] xl:flex xl:flex-col">
      <button type="button" onClick={() => nav("/pm")} className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-5 text-left">
        <img src="/brands/syncworks new logo.jpg" alt="SyncWorks" className="h-11 w-11 rounded-2xl object-cover shadow-[0_0_28px_rgba(34,211,238,.2)]" />
        <div>
          <div className="text-base font-black text-white">SyncWorks</div>
          <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Property Manager</div>
        </div>
      </button>
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
        {NAV_ITEMS.map(([label, path, icon], index) => (
          <button key={path} type="button" onClick={() => nav(path)} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition ${index === 0 ? "border-cyan-400/40 bg-gradient-to-r from-fuchsia-500/15 to-cyan-500/20 text-white shadow-[0_0_24px_rgba(34,211,238,.16)]" : "border-transparent text-slate-400 hover:border-cyan-500/20 hover:bg-cyan-500/[0.06] hover:text-white"}`}>
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-current/20 text-base text-cyan-200">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-800/80 p-4">
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-violet-300">Current Portfolio</div>
          <div className="mt-1 truncate text-sm font-bold text-white">{workspace?.name || "Property Management"}</div>
        </div>
      </div>
    </aside>
  );
}

export default function PropertyManagerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectSummary, setProjectSummary] = useState({ active: 0, overdue: 0, blocked: 0, awaiting_approval: 0 });
  const [workspace, setWorkspace] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    try {
      const workspaceResponse = await api.get("/pm-hub/workspaces/current/");
      const currentWorkspace = workspaceResponse.data;
      setWorkspace(currentWorkspace);
      const headers = { "X-PM-Workspace-ID": String(currentWorkspace.id) };
      const [propertiesResult, workOrdersResult, projectsResult, metricsResult] = await Promise.allSettled([
        api.get("/pm-hub/properties/", { headers }),
        api.get("/pm/work-orders/"),
        api.get("/pm-hub/projects/", { headers }),
        api.get("/pm-hub/projects/metrics/", { headers }),
      ]);
      const unwrap = (result) => result.status === "fulfilled" ? (Array.isArray(result.value.data?.results) ? result.value.data.results : Array.isArray(result.value.data) ? result.value.data : []) : [];
      setProperties(unwrap(propertiesResult));
      setWorkOrders(unwrap(workOrdersResult));
      setProjects(unwrap(projectsResult));
      if (metricsResult.status === "fulfilled") setProjectSummary(metricsResult.value.data || {});
    } catch {
      setWorkspace(null);
      setProperties([]);
      setWorkOrders([]);
      setProjects([]);
      setProjectSummary({ active: 0, overdue: 0, blocked: 0, awaiting_approval: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const stats = useMemo(() => {
    const healthy = properties.filter((item) => Number(item?.occupancy_rate || 0) >= 0.9).length;
    const risk = properties.filter((item) => String(item?.status || "").toUpperCase() === "AT_RISK").length;
    const occupancyValues = properties.map((item) => Number(item?.occupancy_rate || 0)).filter((item) => item > 0);
    const averageOccupancy = occupancyValues.length ? Math.round((occupancyValues.reduce((sum, item) => sum + item, 0) / occupancyValues.length) * 100) : 0;
    return { total: properties.length, healthy, risk, workOrders: workOrders.length, averageOccupancy };
  }, [properties, workOrders]);

  const attentionTotal = Number(projectSummary.overdue || 0) + Number(projectSummary.blocked || 0) + Number(projectSummary.awaiting_approval || 0) + stats.risk;
  const portfolioScore = Math.max(0, Math.min(100, 82 - attentionTotal * 4));
  const projectRows = projects.slice(0, 4);
  const propertyRows = properties.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#02060d] text-slate-100">
      <DesktopSidebar nav={nav} workspace={workspace} />
      <div className="xl:pl-[220px]">
        <div className="xl:hidden">
          <PMHeader title={workspace?.name || "Property Management"} subtitle="Portfolio command center" actions={<Button tone="cyan" onClick={() => nav("/pm/properties/new")}>Add Property</Button>} />
        </div>

        <header className="sticky top-0 z-30 hidden border-b border-cyan-500/15 bg-[#030812]/95 px-5 py-3 backdrop-blur-xl xl:block">
          <div className="mx-auto flex max-w-[1500px] items-center gap-4">
            <button type="button" onClick={() => nav("/pm/settings")} className="min-w-[250px] rounded-2xl border border-cyan-500/20 bg-[#07111f] px-4 py-3 text-left">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Current Portfolio</div>
              <div className="mt-1 flex items-center justify-between gap-3 text-sm font-bold text-white"><span className="truncate">{workspace?.name || "Property Management"}</span><span className="text-cyan-300">⌄</span></div>
            </button>
            <div className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-slate-700/70 bg-[#07111f] px-4 text-sm text-slate-500"><span className="text-cyan-300">⌕</span><span>Search properties, projects, tenants...</span></div>
            <button type="button" onClick={loadDashboard} disabled={loading} className="h-12 rounded-2xl border border-slate-700 bg-[#07111f] px-4 text-xs font-bold text-slate-200">{loading ? "Loading" : "Refresh"}</button>
            <button type="button" onClick={() => nav("/pm/properties/new")} className="h-12 rounded-2xl border border-cyan-300/50 bg-cyan-400 px-5 text-xs font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,.2)]">+ Add Property</button>
            <button type="button" onClick={() => nav("/pm/projects")} className="h-12 rounded-2xl border border-fuchsia-400/50 bg-fuchsia-500/15 px-5 text-xs font-black text-fuchsia-100">+ New Project</button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-4 px-3 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 xl:pb-10">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_250px]">
            <div className="space-y-4">
              <Surface className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_30%,rgba(34,211,238,.18),transparent_28%),radial-gradient(circle_at_70%_20%,rgba(217,70,239,.12),transparent_30%)]" />
                <div className="relative grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-7">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Portfolio operations</div>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Portfolio Command Center</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Real-time oversight of your properties, projects, maintenance, tenants, and operational health.</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button tone="cyan" onClick={() => nav("/pm/tenants")}>Create Tenant</Button>
                      <Button tone="slate" onClick={() => nav("/pm/projects")}>Open Project Dashboard</Button>
                      <Button tone="slate" onClick={() => nav("/pm/settings")}>Portfolio Settings</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 rounded-3xl border border-cyan-500/15 bg-black/25 p-4">
                    <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-[8px] border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_34px_rgba(52,211,153,.15)]"><span className="text-2xl font-black text-white">{portfolioScore}</span></div>
                    <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Portfolio Health</div><div className="mt-1 text-sm font-bold text-white">{attentionTotal ? "Needs attention" : "Performing well"}</div><div className="mt-1 text-xs leading-5 text-slate-500">{attentionTotal ? `${attentionTotal} items need review.` : "Operations are currently on track."}</div></div>
                  </div>
                </div>
              </Surface>

              <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                <div className="flex min-w-max gap-3 xl:grid xl:min-w-0 xl:grid-cols-5">
                  <KpiCard label="Total Properties" value={stats.total} hint={`${stats.healthy} healthy`} tone="cyan" bars />
                  <KpiCard label="Occupancy Health" value={`${stats.averageOccupancy}%`} hint="Portfolio average" tone="emerald" />
                  <KpiCard label="At Risk" value={stats.risk} hint="Requires attention" tone="rose" bars />
                  <KpiCard label="Work Orders" value={stats.workOrders} hint="Active requests" tone="amber" bars />
                  <KpiCard label="Active Projects" value={projectSummary.active || 0} hint={`${projectSummary.blocked || 0} blocked`} tone="violet" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_1.15fr]">
                <Surface>
                  <SectionHeading title="Portfolio Snapshot" subtitle="Properties, occupancy, and attention signals." action={<button type="button" onClick={() => nav("/pm/properties")} className="text-xs font-bold text-cyan-300">View all →</button>} />
                  <div className="space-y-3 p-4">
                    {loading ? <div className="p-6 text-sm text-slate-500">Loading properties...</div> : propertyRows.length ? propertyRows.map((property, index) => {
                      const occupancy = Math.round(Number(property?.occupancy_rate || 0) * 100);
                      return <button key={property.id} type="button" onClick={() => nav(`/pm/properties/${property.id}`)} className="grid w-full grid-cols-[86px_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-black/25 text-left transition hover:border-cyan-400/35 sm:grid-cols-[110px_minmax(0,1fr)]"><div className="h-full min-h-[96px]"><PropertyVisual property={property} index={index} /></div><div className="min-w-0 p-3 pl-0"><div className="truncate text-sm font-bold text-white">{property.name || "Unnamed Property"}</div><div className="mt-1 truncate text-[11px] text-slate-500">{[property.address, property.city, property.state].filter(Boolean).join(", ") || "Address not entered"}</div><div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.max(4, occupancy)}%` }} /></div><span className="text-[10px] font-black text-cyan-200">{occupancy || 0}%</span></div></div></button>;
                    }) : <div className="rounded-2xl border border-dashed border-slate-700 p-7 text-center"><div className="text-sm text-slate-500">No properties added yet.</div><div className="mt-4"><Button tone="cyan" onClick={() => nav("/pm/properties/new")}>Add First Property</Button></div></div>}
                  </div>
                </Surface>

                <Surface>
                  <SectionHeading title="Project Center" subtitle="Progress, deadlines, budgets, and blockers." action={<button type="button" onClick={() => nav("/pm/projects")} className="text-xs font-bold text-cyan-300">View all →</button>} />
                  <div className="space-y-3 p-4">
                    {projectRows.length ? projectRows.map((project) => {
                      const status = String(project.status || "REQUESTED").replaceAll("_", " ");
                      const tone = project.is_overdue ? "rose" : project.is_blocked ? "amber" : Number(project.progress_percent || 0) > 70 ? "cyan" : "violet";
                      return <button key={project.id} type="button" onClick={() => nav("/pm/projects")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-black/25 p-3 text-left transition hover:border-cyan-400/35"><ProgressRing value={project.progress_percent} tone={tone} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-white">{project.title || "Project"}</div><div className="mt-1 truncate text-[11px] text-slate-500">{project.property_name || "Portfolio-wide"} · {status}</div>{project.blocker_summary ? <div className="mt-1 truncate text-[10px] text-rose-300">Blocker: {project.blocker_summary}</div> : null}</div><div className="hidden text-right sm:block"><div className="text-xs font-bold text-white">{project.target_date || "No date"}</div><div className="mt-1 text-[10px] text-slate-500">{project.budget_amount ? `$${Number(project.budget_amount).toLocaleString()}` : "Budget not set"}</div></div></button>;
                    }) : <div className="rounded-2xl border border-dashed border-slate-700 p-7 text-center"><div className="text-sm text-slate-500">No active projects yet.</div><div className="mt-4"><Button tone="cyan" onClick={() => nav("/pm/projects")}>Create Project</Button></div></div>}
                  </div>
                </Surface>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Surface><SectionHeading title="Work Order Queue" subtitle="Current maintenance activity." action={<button type="button" onClick={() => nav("/pm/work-orders")} className="text-xs font-bold text-cyan-300">View all →</button>} /><div className="space-y-2 p-4">{workOrders.length ? workOrders.slice(0, 4).map((item) => <div key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-3"><div className="flex items-start justify-between gap-3"><div className="text-sm font-bold text-white">{item.title || "Work Order"}</div><span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[9px] font-black text-amber-200">{item.priority || "OPEN"}</span></div><div className="mt-1 text-[11px] text-slate-500">{item.property_name || "Property"} · {item.status || "OPEN"}</div></div>) : <div className="p-5 text-sm text-slate-500">No active work orders.</div>}</div></Surface>
                <Surface><SectionHeading title="Quick Operations" subtitle="High-frequency PM actions." /><div className="grid grid-cols-2 gap-2 p-4"><Button tone="cyan" onClick={() => nav("/pm/tenants")}>Tenants</Button><Button tone="slate" onClick={() => nav("/pm/properties/new")}>Add Property</Button><Button tone="slate" onClick={() => nav("/pm/calendar")}>Schedule</Button><Button tone="slate" onClick={() => nav("/pm/employees")}>Team</Button></div></Surface>
                <Surface><SectionHeading title="Executive Attention" subtitle="Items requiring intervention." /><div className="space-y-2 p-4">{[[`${stats.risk} properties at risk`, "Review property health", "rose"], [`${projectSummary.overdue || 0} projects overdue`, "Past target date", "amber"], [`${projectSummary.awaiting_approval || 0} awaiting approval`, "Decision required", "violet"]].map(([title, hint, tone]) => <button key={title} type="button" onClick={() => nav("/pm/projects")} className={`w-full rounded-2xl border p-3 text-left ${toneStyles[tone]}`}><div className="text-sm font-bold text-white">{title}</div><div className="mt-1 text-[11px] opacity-75">{hint}</div></button>)}</div></Surface>
              </div>
            </div>

            <aside className="space-y-4">
              <Surface className="overflow-hidden"><SectionHeading title="SYNC AI Insights" subtitle="Portfolio intelligence · Beta" /><div className="space-y-5 p-5">{[["Occupancy", stats.averageOccupancy], ["Financial Health", properties.length ? 78 : 0], ["Project Delivery", Math.max(0, 100 - Number(projectSummary.overdue || 0) * 12)], ["Operational Health", portfolioScore]].map(([label, score], index) => <div key={label}><div className="flex items-center justify-between text-xs"><span className="text-slate-400">{label}</span><span className="font-black text-cyan-200">{score}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${index % 2 ? "bg-gradient-to-r from-violet-500 to-fuchsia-400" : "bg-gradient-to-r from-cyan-500 to-emerald-400"}`} style={{ width: `${score}%` }} /></div></div>)}</div></Surface>
              <Surface className="border-fuchsia-500/20 bg-gradient-to-br from-[#101226] to-[#1a0b23]"><div className="p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">AI recommendation</div><div className="mt-3 text-lg font-black text-white">Complete portfolio setup</div><p className="mt-2 text-xs leading-5 text-slate-400">Add property details, occupancy, tenants, and photos so SYNC can generate useful operational recommendations.</p><button type="button" onClick={() => nav("/pm/settings")} className="mt-4 rounded-xl border border-cyan-400/35 px-4 py-2 text-xs font-bold text-cyan-200">View setup →</button></div></Surface>
              <Surface><div className="p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Data status</div><div className="mt-3 flex items-center gap-2 text-sm font-bold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]" />Live portfolio data</div><div className="mt-1 text-xs text-slate-500">Refresh to pull the latest updates.</div></div></Surface>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

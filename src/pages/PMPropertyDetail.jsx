import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const dateText = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not set";

function statusTone(value) {
  const key = String(value || "").toUpperCase();
  if (["HEALTHY", "AVAILABLE", "COMPLETED", "CURRENT", "CONNECTED"].includes(key)) return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (["WATCH", "NOTICE", "MAKE_READY", "APPROVAL", "PENDING"].includes(key)) return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if (["AT_RISK", "BLOCKED", "OVERDUE"].includes(key)) return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  return "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
}

function Pill({ value, children }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusTone(value)}`}>{children || String(value || "Unknown").replaceAll("_", " ")}</span>;
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return <section className={`rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-500/10 px-5 py-4">
      <div><h2 className="text-lg font-black text-white">{title}</h2>{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}</div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>;
}

function ActionButton({ children, onClick, tone = "dark" }) {
  const toneClass = tone === "cyan" ? "bg-cyan-400 text-slate-950" : tone === "purple" ? "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-100" : "border-slate-700 bg-black/25 text-slate-200";
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-2xl border border-transparent px-4 text-sm font-black transition hover:-translate-y-0.5 ${toneClass}`}>{children}</button>;
}

export default function PMPropertyDetail() {
  const nav = useNavigate();
  const { propertyId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [projects, setProjects] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setWarnings([]);
      try {
        const workspaceResponse = await api.get("/pm-hub/workspaces/current/");
        if (!active) return;
        const current = workspaceResponse.data;
        const headers = { "X-PM-Workspace-ID": String(current.id) };
        setWorkspace(current);

        const propertyResponse = await api.get(`/pm-hub/properties/${propertyId}/`, { headers });
        if (!active) return;
        setProperty(propertyResponse.data);

        const requests = [
          ["units", api.get("/pm-hub/units/", { headers, params: { property_id: propertyId } })],
          ["tenants", api.get("/pm-hub/tenants/", { headers })],
          ["projects", api.get("/pm-hub/projects/", { headers, params: { property_id: propertyId } })],
          ["ledger", api.get("/pm-hub/ledger-entries/", { headers })],
          ["documents", api.get("/pm-hub/document-packets/", { headers })],
        ];
        const results = await Promise.allSettled(requests.map(([, request]) => request));
        if (!active) return;
        const warningItems = [];
        results.forEach((result, index) => {
          const name = requests[index][0];
          if (result.status === "rejected") { warningItems.push(`${name} data is temporarily unavailable`); return; }
          const values = list(result.value.data);
          if (name === "units") setUnits(values.filter((item) => Number(item.property) === Number(propertyId)));
          if (name === "tenants") setTenants(values.filter((item) => String(item.property_name || "").toLowerCase() === String(propertyResponse.data.name || "").toLowerCase()));
          if (name === "projects") setProjects(values.filter((item) => Number(item.property) === Number(propertyId)));
          if (name === "ledger") setLedger(values);
          if (name === "documents") setDocuments(values.filter((item) => Number(item.property) === Number(propertyId) || !item.property));
        });
        setWarnings(warningItems);
      } catch (caught) {
        const detail = caught?.response?.data?.detail;
        setError(caught?.response?.status === 404 ? "This property record could not be found in the active portfolio." : detail || caught?.message || "Could not load this property.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [propertyId]);

  const tenantIds = useMemo(() => new Set(tenants.map((item) => Number(item.id))), [tenants]);
  const propertyLedger = useMemo(() => ledger.filter((entry) => tenantIds.has(Number(entry.tenant))), [ledger, tenantIds]);
  const balance = useMemo(() => propertyLedger.reduce((total, entry) => {
    const amount = Number(entry.amount || 0);
    return ["PAYMENT", "CREDIT"].includes(String(entry.entry_type).toUpperCase()) ? total - amount : total + amount;
  }, 0), [propertyLedger]);
  const occupied = units.filter((item) => String(item.availability || item.status).toUpperCase() === "OCCUPIED").length;
  const available = units.filter((item) => String(item.availability || item.status).toUpperCase() === "AVAILABLE").length;
  const activeProjects = projects.filter((item) => !["COMPLETED", "ARCHIVED"].includes(String(item.status).toUpperCase()));
  const overdueProjects = activeProjects.filter((item) => item.is_overdue).length;

  const quickActions = [
    ["Add Tenant", () => nav(`/pm/tenants?property=${propertyId}`), "cyan"],
    ["Add Unit", () => nav(`/pm/leasing?property=${propertyId}&tab=units`), "dark"],
    ["Add Ledger Entry", () => nav(`/pm/payments?property=${propertyId}`), "dark"],
    ["Create Work Order", () => nav(`/pm/work-orders?property=${propertyId}`), "dark"],
    ["Create Project", () => nav(`/pm/projects?property=${propertyId}&create=1`), "purple"],
    ["Build Lease", () => nav(`/pm/properties/${propertyId}/lease-builder`), "purple"],
  ];

  if (loading) return <main className="px-4 py-10 sm:px-6"><div className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-10 text-center text-sm text-slate-500">Loading property command center...</div></main>;
  if (error || !property) return <main className="space-y-4 px-4 py-6 sm:px-6"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">{error || "Property not found."}</div><ActionButton onClick={() => nav("/pm/properties")}>Back to Properties</ActionButton></main>;

  return <main className="space-y-5 px-4 py-6 sm:px-6">
    <section className="overflow-hidden rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/14 via-[#07111f] to-fuchsia-500/12">
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Pill value={property.status} /><span className="text-xs text-slate-500">Property #{property.id}</span></div>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{property.name}</h1>
          <p className="mt-2 text-sm text-slate-400">{[property.address, property.city, property.state, property.zip].filter(Boolean).join(", ")}</p>
          <div className="mt-5 flex flex-wrap gap-2">{quickActions.map(([label, onClick, tone]) => <ActionButton key={label} onClick={onClick} tone={tone}>{label}</ActionButton>)}</div>
        </div>
        <div className="grid min-w-[280px] grid-cols-2 gap-3">
          {[["Units", units.length], ["Available", available], ["Tenants", tenants.length], ["Balance Due", money(balance)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-cyan-500/15 bg-black/25 p-4"><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>)}
        </div>
      </div>
    </section>

    {warnings.length ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">Some sections are still loading independently: {warnings.join(" · ")}</div> : null}

    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-cyan-500/15 bg-[#07111f]/90 p-2">
      {["overview", "units", "tenants", "ledger", "maintenance", "projects", "documents", "reports"].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black capitalize ${tab === item ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{item}</button>)}
    </div>

    {tab === "overview" ? <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel title="Property Health" subtitle="Live operating snapshot for this property.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Occupancy", units.length ? `${Math.round((occupied / units.length) * 100)}%` : "0%"], ["Open Projects", activeProjects.length], ["Overdue Projects", overdueProjects], ["Outstanding Balance", money(balance)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>)}</div>
        <div className="mt-5 rounded-2xl border border-slate-800 bg-black/20 p-4 text-sm text-slate-400"><span className="font-bold text-white">Internal notes:</span> {property.notes || "No property notes have been added."}</div>
      </Panel>
      <Panel title="Executive Attention" subtitle="Items requiring action at this property.">
        <div className="space-y-3">
          {balance > 0 ? <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4"><div className="font-bold text-rose-100">Tenant balance outstanding</div><div className="mt-1 text-xs text-rose-200/70">{money(balance)} currently due across this property.</div></div> : null}
          {overdueProjects ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4"><div className="font-bold text-amber-100">{overdueProjects} overdue project{overdueProjects === 1 ? "" : "s"}</div></div> : null}
          {!balance && !overdueProjects ? <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">No immediate executive attention items.</div> : null}
        </div>
      </Panel>
    </div> : null}

    {tab === "units" ? <Panel title="Units & Availability" subtitle="Occupancy, make-ready, construction, rent, and Section 8 readiness." action={<ActionButton tone="cyan" onClick={() => nav(`/pm/leasing?property=${propertyId}&tab=units`)}>Add Unit</ActionButton>}>
      {units.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{units.map((unit) => <article key={unit.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{unit.label}</div><div className="mt-1 text-xs text-slate-500">{unit.bedrooms ?? unit.beds ?? 0} bed · {unit.bathrooms ?? unit.baths ?? 0} bath</div></div><Pill value={unit.availability || unit.status} /></div><div className="mt-4 flex justify-between text-sm"><span className="text-slate-500">Market rent</span><span className="font-bold text-white">{money(unit.market_rent)}</span></div><div className="mt-2 text-xs text-slate-500">Section 8: {unit.accepts_section8 || unit.section8_eligible ? "Accepted" : "Not marked"}</div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No units have been added to this property.</div>}
    </Panel> : null}

    {tab === "tenants" ? <Panel title="Tenants & Leases" subtitle="Residents, lease status, rent, and onboarding." action={<ActionButton tone="cyan" onClick={() => nav(`/pm/tenants?property=${propertyId}`)}>Add Tenant</ActionButton>}>
      {tenants.length ? <div className="space-y-3">{tenants.map((tenant) => <article key={tenant.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-black/25 p-4"><div><div className="font-black text-white">{tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}</div><div className="mt-1 text-xs text-slate-500">{tenant.unit_label || "Unit not assigned"} · {tenant.email}</div></div><div className="text-right"><Pill value={tenant.status} /><div className="mt-2 text-xs text-slate-500">Lease end: {dateText(tenant.active_lease?.end_date || tenant.lease_end)}</div></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No tenants are assigned to this property yet.</div>}
    </Panel> : null}

    {tab === "ledger" ? <Panel title="Property Ledger" subtitle="Charges, payments, credits, adjustments, and historical balances." action={<ActionButton tone="cyan" onClick={() => nav(`/pm/payments?property=${propertyId}`)}>Open Full Ledger</ActionButton>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">{[["Current Balance", money(balance)], ["Ledger Entries", propertyLedger.length], ["Tenants", tenants.length]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>)}</div>
      {propertyLedger.length ? <div className="space-y-2">{propertyLedger.slice(0, 10).map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-black/20 p-3 text-sm"><div><div className="font-bold text-white">{entry.category || entry.entry_type}</div><div className="text-xs text-slate-500">{dateText(entry.entry_date)} · {entry.tenant_name || "Tenant"}</div></div><div className="font-black text-white">{money(entry.amount)}</div></div>)}</div> : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No ledger entries exist for this property.</div>}
    </Panel> : null}

    {tab === "maintenance" ? <Panel title="Maintenance & Work Orders" subtitle="Property-scoped service requests, inspections, and make-ready work." action={<ActionButton tone="cyan" onClick={() => nav(`/pm/work-orders?property=${propertyId}&create=1`)}>Create Work Order</ActionButton>}><div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center"><div className="text-sm text-slate-400">Open the work-order queue filtered to this property.</div><div className="mt-4"><ActionButton onClick={() => nav(`/pm/work-orders?property=${propertyId}`)}>View Property Work Orders</ActionButton></div></div></Panel> : null}

    {tab === "projects" ? <Panel title="Projects" subtitle="Capital work, renovations, vendors, budgets, and blockers." action={<ActionButton tone="purple" onClick={() => nav(`/pm/projects?property=${propertyId}&create=1`)}>Create Project</ActionButton>}>
      {projects.length ? <div className="space-y-3">{projects.map((project) => <article key={project.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black text-white">{project.title}</div><div className="mt-1 text-xs text-slate-500">Target: {dateText(project.target_date)} · Budget: {money(project.budget_amount)}</div></div><Pill value={project.status} /></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${Math.min(100, Number(project.progress_percent || 0))}%` }} /></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No projects are linked to this property.</div>}
    </Panel> : null}

    {tab === "documents" ? <Panel title="Documents & Signatures" subtitle="Leases, renewals, Section 8 packets, inspections, and e-signature status." action={<div className="flex flex-wrap gap-2"><ActionButton tone="cyan" onClick={() => nav(`/pm/properties/${propertyId}/lease-builder`)}>Build Lease</ActionButton><ActionButton tone="purple" onClick={() => nav(`/pm/tenants?property=${propertyId}&documents=1`)}>Create Packet</ActionButton></div>}>
      {documents.length ? <div className="space-y-3">{documents.map((packet) => <article key={packet.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-black/25 p-4"><div><div className="font-black text-white">{packet.template_name || packet.packet_type || "Document Packet"}</div><div className="mt-1 text-xs text-slate-500">{packet.state || property.state} · {packet.housing_authority || "Standard"} · Version {packet.template_version || "1"}</div></div><Pill value={packet.status} /></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No document packets are linked to this property.</div>}
    </Panel> : null}

    {tab === "reports" ? <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Operating Report" subtitle="Live property-level rollup."><div className="space-y-3">{[["Property status", property.status], ["Total units", units.length], ["Occupied units", occupied], ["Available units", available], ["Tenants", tenants.length], ["Active projects", activeProjects.length], ["Outstanding balance", money(balance)]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-slate-800 pb-3 text-sm"><span className="text-slate-500">{label}</span><span className="font-black text-white">{String(value).replaceAll("_", " ")}</span></div>)}</div></Panel>
      <Panel title="Report Actions" subtitle="Export and share property data."><div className="grid gap-3"><ActionButton onClick={() => nav(`/pm/payments?property=${propertyId}&export=1`)}>Export Property Ledger</ActionButton><ActionButton onClick={() => nav(`/pm/projects?property=${propertyId}&report=1`)}>Open Project Report</ActionButton><ActionButton onClick={() => nav(`/pm/properties?export=${propertyId}`)}>Export Property Record</ActionButton><ActionButton onClick={() => window.print()}>Print Property Summary</ActionButton></div></Panel>
    </div> : null}
  </main>;
}

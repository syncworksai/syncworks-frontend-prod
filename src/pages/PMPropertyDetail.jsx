import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import PMPropertyPaperworkDock from "../components/pm/PMPropertyPaperworkDock";
import PMPropertyDetailsDrawer from "../components/pm/PMPropertyDetailsDrawer";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const tabs = ["overview", "units", "tenants", "ledger", "maintenance", "projects", "messages", "documents", "reports"];

function Panel({ title, subtitle, action, children }) {
  return <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-500/10 px-5 py-4"><div><h2 className="text-lg font-black text-white">{title}</h2>{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}</div>{action}</div><div className="p-5">{children}</div></section>;
}

function Button({ children, onClick, tone = "dark" }) {
  const style = tone === "cyan" ? "bg-cyan-400 text-slate-950" : tone === "purple" ? "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-100" : tone === "amber" ? "border-amber-400/30 bg-amber-500/10 text-amber-100" : "border-slate-700 bg-black/25 text-slate-200";
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-2xl border border-transparent px-4 text-sm font-black ${style}`}>{children}</button>;
}

function Badge({ children, tone = "cyan" }) {
  const style = tone === "green" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : tone === "amber" ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : tone === "rose" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-cyan-400/25 bg-cyan-500/10 text-cyan-200";
  return <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${style}`}>{children}</span>;
}

function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">{text}</div>; }

function Checklist({ title, subtitle, items, action }) {
  const complete = items.filter((item) => item.done).length;
  return <Panel title={title} subtitle={subtitle} action={<div className="text-right"><div className="text-xl font-black text-cyan-200">{complete}/{items.length}</div>{action}</div>}>
    <div className="grid gap-2 sm:grid-cols-2">{items.map((item) => <button key={item.label} type="button" onClick={item.onClick} className={`flex min-h-12 items-center gap-3 rounded-2xl border p-3 text-left text-sm ${item.done ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-slate-700 bg-black/20 text-slate-300 hover:border-cyan-400/30"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${item.done ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-slate-600"}`}>{item.done ? "✓" : ""}</span><span>{item.label}</span></button>)}</div>
  </Panel>;
}

export default function PMPropertyDetail() {
  const nav = useNavigate();
  const { propertyId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [occupancies, setOccupancies] = useState([]);
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("overview");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const ws = (await api.get("/pm-hub/workspaces/current/")).data;
      setWorkspace(ws);
      const headers = { "X-PM-Workspace-ID": String(ws.id) };
      const propertyRes = await api.get(`/pm-hub/properties/${propertyId}/`, { headers });
      setProperty(propertyRes.data);
      const requests = await Promise.allSettled([
        api.get("/pm-hub/units/", { headers, params: { property_id: propertyId } }),
        api.get("/pm-hub/tenants/", { headers }),
        api.get("/pm-hub/ledger/", { headers }),
        api.get("/pm-hub/projects/", { headers, params: { property_id: propertyId } }),
        api.get("/pm-hub/work-orders/", { headers, params: { property_id: propertyId } }),
        api.get("/pm-hub/occupancies/", { headers }),
        api.get("/pm-hub/tenant-cases/", { headers }),
      ]);
      const values = requests.map((result) => result.status === "fulfilled" ? list(result.value.data) : []);
      setUnits(values[0].filter((item) => Number(item.property) === Number(propertyId)));
      const propertyTenants = values[1].filter((item) => String(item.property_name || "").toLowerCase() === String(propertyRes.data.name || "").toLowerCase());
      setTenants(propertyTenants);
      setLedger(values[2]);
      setProjects(values[3].filter((item) => Number(item.property) === Number(propertyId)));
      setWorkOrders(values[4].filter((item) => Number(item.property) === Number(propertyId)));
      setOccupancies(values[5].filter((item) => Number(item.property) === Number(propertyId)));
      const tenantIds = new Set(propertyTenants.map((item) => Number(item.id)));
      setCases(values[6].filter((item) => Number(item.property) === Number(propertyId) || tenantIds.has(Number(item.tenant))));
    } catch (caught) {
      setError(caught?.response?.data?.detail || "Could not load this property.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [propertyId]);

  const tenantIds = useMemo(() => new Set(tenants.map((item) => Number(item.id))), [tenants]);
  const propertyLedger = useMemo(() => ledger.filter((item) => tenantIds.has(Number(item.tenant))), [ledger, tenantIds]);
  const balance = useMemo(() => propertyLedger.reduce((sum, item) => ["PAYMENT", "CREDIT"].includes(String(item.entry_type).toUpperCase()) ? sum - Number(item.amount || 0) : sum + Number(item.amount || 0), 0), [propertyLedger]);
  const occupiedUnits = units.filter((item) => String(item.availability).toUpperCase() === "OCCUPIED").length;
  const occupancy = units.length ? Math.round(occupiedUnits / units.length * 100) : Number(property?.occupancy_rate || 0) * 100;
  const makeReadyOrder = workOrders.find((item) => String(item.category).toUpperCase() === "MAKE_READY" && String(item.status).toUpperCase() !== "COMPLETED");
  const latestOccupancy = [...occupancies].sort((a, b) => Number(b.id) - Number(a.id))[0];
  const evictionCase = cases.find((item) => String(item.case_type || item.type).toUpperCase() === "EVICTION");
  const collectionsCase = cases.find((item) => String(item.case_type || item.type).toUpperCase() === "COLLECTIONS");
  const occupancyState = occupancy > 0 ? "Occupied" : makeReadyOrder ? "Make Ready" : latestOccupancy?.status === "EVICTED" ? "Evicted / Make Ready" : "Vacant";
  const openOrders = workOrders.filter((item) => String(item.status).toUpperCase() !== "COMPLETED");
  const activeProjects = projects.filter((item) => !["COMPLETED", "ARCHIVED"].includes(String(item.status).toUpperCase()));
  const healthScore = Math.max(0, Math.min(100, 100 - (property?.status === "WATCH" ? 15 : property?.status === "AT_RISK" ? 35 : 0) - openOrders.filter((item) => item.priority === "URGENT").length * 10 - activeProjects.filter((item) => item.is_overdue).length * 8));

  const moveInItems = [
    { label: "Property and unit selected", done: Boolean(property && (units.length || property.property_type === "HOME")), onClick: () => setTab("units") },
    { label: "Tenant connected", done: tenants.length > 0, onClick: () => setTab("tenants") },
    { label: "Lease terms entered", done: tenants.some((item) => item.lease_start || item.active_lease), onClick: () => setTab("tenants") },
    { label: "Lease document uploaded", done: false, onClick: () => setTab("documents") },
    { label: "Security deposit recorded", done: propertyLedger.some((item) => String(item.category).includes("DEPOSIT")), onClick: () => setTab("ledger") },
    { label: "Move-in inspection completed", done: false, onClick: () => setTab("documents") },
    { label: "Keys and access documented", done: Boolean(property?.notes), onClick: () => setDetailsOpen(true) },
    { label: "Welcome / move-in message sent", done: false, onClick: () => setTab("messages") },
  ];

  const moveOutItems = [
    { label: "Notice or eviction recorded", done: Boolean(latestOccupancy && ["NOTICE_GIVEN", "MOVED_OUT", "EVICTED"].includes(String(latestOccupancy.status).toUpperCase())), onClick: () => nav(`/pm/settings?view=messages&tab=occupancy`) },
    { label: "Occupancy closed", done: Boolean(latestOccupancy && ["MOVED_OUT", "EVICTED"].includes(String(latestOccupancy.status).toUpperCase())), onClick: () => nav(`/pm/settings?view=messages&tab=occupancy`) },
    { label: "Final ledger reviewed", done: propertyLedger.length > 0, onClick: () => setTab("ledger") },
    { label: "Collections / eviction case opened if needed", done: Boolean(evictionCase || collectionsCase || balance <= 0), onClick: () => nav(`/pm/settings?view=messages&tab=occupancy`) },
    { label: "Move-out inspection completed", done: false, onClick: () => setTab("documents") },
    { label: "Deposit disposition completed", done: propertyLedger.some((item) => String(item.category).includes("DEPOSIT_APPLIED")), onClick: () => setTab("ledger") },
    { label: "Make-ready work order created", done: Boolean(makeReadyOrder), onClick: () => nav(`/pm/settings?view=make-ready&property=${propertyId}`) },
    { label: "Property ready to list / move in", done: occupancyState === "Vacant" && !makeReadyOrder, onClick: () => nav(`/pm/settings?view=make-ready&property=${propertyId}`) },
  ];

  async function changeStatus(status) {
    if (!workspace || !property || status === property.status) return;
    setSavingStatus(true);
    setNotice("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.patch(`/pm-hub/properties/${property.id}/`, { status }, { headers });
      setProperty((current) => ({ ...current, ...response.data }));
      setNotice("Property health status updated.");
    } catch (caught) {
      setNotice(caught?.response?.data?.detail || "Could not update property status.");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) return <main className="px-4 py-10 sm:px-6"><div className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-10 text-center text-sm text-slate-500">Loading property command center...</div></main>;
  if (error || !property) return <main className="space-y-4 px-4 py-6 sm:px-6"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">{error || "Property not found."}</div><Button onClick={() => nav("/pm/properties")}>Back to Properties</Button></main>;

  return <main className="space-y-5 px-4 py-6 sm:px-6">
    {notice ? <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-100">{notice}</div> : null}
    <section className="overflow-hidden rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/14 via-[#07111f] to-fuchsia-500/12 p-5 lg:p-7">
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div><div className="flex flex-wrap items-center gap-2"><Badge tone={property.status === "AT_RISK" ? "rose" : property.status === "WATCH" ? "amber" : "green"}>{String(property.status).replaceAll("_", " ")}</Badge><Badge tone={occupancyState === "Occupied" ? "green" : occupancyState.includes("Make Ready") ? "amber" : "cyan"}>{occupancyState}</Badge>{evictionCase ? <Badge tone="rose">Eviction case open</Badge> : null}{collectionsCase ? <Badge tone="amber">Collections</Badge> : null}<span className="text-xs text-slate-500">Property #{property.id}</span></div><h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">{property.name}</h2><p className="mt-2 text-sm text-slate-400">{[property.address, property.city, property.state, property.zip].filter(Boolean).join(", ")}</p><div className="mt-5 flex flex-wrap gap-2"><Button tone="cyan" onClick={() => nav(`/pm/work-orders?property=${propertyId}&create=1`)}>+ Maintenance</Button><Button onClick={() => nav(`/pm/tenants?property=${propertyId}`)}>+ Add Tenant</Button><Button onClick={() => nav(`/pm/settings?view=messages&property=${propertyId}`)}>Message</Button><Button tone="purple" onClick={() => nav(`/pm/projects?property=${propertyId}&create=1`)}>+ Project</Button><Button onClick={() => nav(`/pm/payments?property=${propertyId}&add=1`)}>+ Ledger Entry</Button><Button tone="cyan" onClick={() => setDetailsOpen(true)}>Property Details</Button><Button onClick={() => setTab("overview")}>Move-In Checklist</Button><Button tone="amber" onClick={() => setTab("overview")}>Move-Out Checklist</Button><Button tone="purple" onClick={() => setTab("documents")}>Documents & Photos</Button></div></div>
        <div className="rounded-3xl border border-cyan-500/15 bg-black/25 p-5"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Property health</div><div className="mt-2 text-4xl font-black text-white">{healthScore}</div></div><div className="text-right"><label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Operational status</label><select disabled={savingStatus} value={property.status || "HEALTHY"} onChange={(event) => changeStatus(event.target.value)} className="mt-2 block min-h-11 rounded-2xl border border-slate-700 bg-[#07111f] px-3 text-sm font-black text-white"><option value="HEALTHY">Healthy</option><option value="WATCH">Watch</option><option value="AT_RISK">At Risk</option></select></div></div><div className="mt-5 grid grid-cols-2 gap-3">{[["Occupancy", `${Math.round(occupancy)}%`], ["Balance", money(balance)], ["Open work", openOrders.length], ["Projects", activeProjects.length]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-black/25 p-3"><div className="text-[9px] uppercase tracking-[0.15em] text-slate-500">{label}</div><div className="mt-2 text-xl font-black text-white">{value}</div></div>)}</div></div>
      </div>
    </section>

    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-cyan-500/15 bg-[#07111f]/90 p-2">{tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black capitalize ${tab === item ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{item}</button>)}</div>

    {tab === "overview" ? <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><Panel title="Property Profile & Health" subtitle="Start here before triaging maintenance, tenants, messages, or paperwork." action={<Button tone="cyan" onClick={() => setDetailsOpen(true)}>Edit Details & Inventory</Button>}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Health score", healthScore], ["Lifecycle", occupancyState], ["Open maintenance", openOrders.length], ["Outstanding balance", money(balance)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-xl font-black text-white">{value}</div></div>)}</div><div className="mt-5 rounded-2xl border border-slate-800 bg-black/20 p-4 text-sm text-slate-400"><span className="font-black text-white">Internal notes:</span> {property.notes || "No property notes have been added."}</div></Panel><Panel title="Triage & Attention" subtitle="Items that need the PM company’s next action."><div className="space-y-3">{evictionCase ? <button type="button" onClick={() => nav(`/pm/settings?view=messages&tab=occupancy`)} className="w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-left text-rose-100"><div className="font-black">Former tenant has an active eviction case</div></button> : null}{makeReadyOrder ? <button type="button" onClick={() => nav(`/pm/settings?view=make-ready&property=${propertyId}`)} className="w-full rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4 text-left text-fuchsia-100"><div className="font-black">Property is in Make Ready</div></button> : null}{openOrders.length ? <button type="button" onClick={() => setTab("maintenance")} className="w-full rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-left text-amber-100"><div className="font-black">{openOrders.length} open maintenance item{openOrders.length === 1 ? "" : "s"}</div></button> : null}{balance > 0 ? <button type="button" onClick={() => setTab("ledger")} className="w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-left text-rose-100"><div className="font-black">{money(balance)} outstanding</div></button> : null}{!evictionCase && !makeReadyOrder && !openOrders.length && !balance ? <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-100">No immediate attention items.</div> : null}</div></Panel></div><div className="grid gap-5 xl:grid-cols-2"><Checklist title="Move-In Checklist" subtitle="Everything needed before a tenant takes possession." items={moveInItems} action={<Button onClick={() => setTab("documents")}>Documents</Button>} /><Checklist title="Move-Out & Make-Ready Checklist" subtitle="Preserve the former tenant record while preparing the property for the next resident." items={moveOutItems} action={<Button tone="amber" onClick={() => nav(`/pm/settings?view=make-ready&property=${propertyId}`)}>Make Ready</Button>} /></div></div> : null}

    {tab === "units" ? <Panel title="Units & Availability" action={<div className="flex flex-wrap gap-2"><Button tone="cyan" onClick={() => nav(`/pm/leasing?property=${propertyId}&tab=units`)}>Add Unit</Button><Button onClick={() => setDetailsOpen(true)}>Inventory</Button></div>}>{units.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{units.map((unit) => <article key={unit.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex items-start justify-between"><div><div className="font-black text-white">{unit.label}</div><div className="mt-1 text-xs text-slate-500">{unit.bedrooms || 0} bed · {unit.bathrooms || 0} bath</div></div><Badge>{String(unit.availability || "AVAILABLE").replaceAll("_", " ")}</Badge></div><div className="mt-4 text-sm text-slate-400">Market rent: <strong className="text-white">{money(unit.market_rent)}</strong></div></article>)}</div> : <Empty text="No units have been added." />}</Panel> : null}
    {tab === "tenants" ? <Panel title="Current & Former Tenant Records" action={<Button tone="cyan" onClick={() => nav(`/pm/tenants?property=${propertyId}`)}>Add Tenant</Button>}>{tenants.length ? <div className="space-y-3">{tenants.map((tenant) => <article key={tenant.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}</div><div className="mt-1 text-xs text-slate-500">{tenant.email} · {tenant.unit_label || "Unit not assigned"}</div></div><Badge tone={tenant.status === "INACTIVE" ? "amber" : "green"}>{tenant.status || "ACTIVE"}</Badge></div></article>)}</div> : <Empty text="No tenant record is connected to this property." />}</Panel> : null}
    {tab === "ledger" ? <Panel title="Tenant Ledger" action={<div className="flex flex-wrap gap-2"><Button tone="cyan" onClick={() => nav(`/pm/payments?property=${propertyId}&add=1`)}>+ Add Entry</Button><Button onClick={() => nav(`/pm/payments?property=${propertyId}`)}>Open Full Ledger</Button></div>}>{propertyLedger.length ? <div className="space-y-2">{propertyLedger.slice(0, 20).map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-black/25 p-4"><div><div className="font-black text-white">{item.category || item.entry_type}</div><div className="mt-1 text-xs text-slate-500">{item.memo || item.reference || "Ledger entry"}</div></div><div className="font-black text-white">{money(item.amount)}</div></div>)}</div> : <Empty text="No ledger entries for the property’s tenant records." />}</Panel> : null}
    {tab === "maintenance" ? <Panel title="Maintenance & Work Orders" subtitle="Property-scoped work remains here even when the property is vacant." action={<Button tone="cyan" onClick={() => nav(`/pm/work-orders?property=${propertyId}&create=1`)}>Create Work Order</Button>}>{workOrders.length ? <div className="grid gap-3 md:grid-cols-2">{workOrders.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div className="font-black text-white">{item.title}</div><Badge tone={item.priority === "URGENT" ? "rose" : "amber"}>{item.status}</Badge></div><p className="mt-2 text-sm text-slate-400">{item.description || "No description."}</p></article>)}</div> : <Empty text="No maintenance or work orders for this property." />}</Panel> : null}
    {tab === "projects" ? <Panel title="Property Projects" action={<Button tone="purple" onClick={() => nav(`/pm/projects?property=${propertyId}&create=1`)}>Create Project</Button>}>{projects.length ? <div className="space-y-3">{projects.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex items-center justify-between"><div className="font-black text-white">{item.title}</div><Badge>{String(item.status).replaceAll("_", " ")}</Badge></div><div className="mt-2 text-xs text-slate-500">Progress {item.progress_percent || 0}% · Target {item.target_date || "not set"}</div></article>)}</div> : <Empty text="No projects are connected to this property." />}</Panel> : null}
    {tab === "messages" ? <Panel title="Property Messages" subtitle="Open the PM inbox already filtered to this property."><div className="flex flex-wrap gap-3"><Button tone="cyan" onClick={() => nav(`/pm/settings?view=messages&property=${propertyId}`)}>Open Property Messages</Button><Button onClick={() => nav(`/pm/settings?view=messages&property=${propertyId}&compose=1`)}>New Message</Button></div></Panel> : null}
    {tab === "documents" ? <PMPropertyPaperworkDock embeddedPropertyId={propertyId} /> : null}
    {tab === "reports" ? <Panel title="Owner & Investor Reporting" subtitle="Property health, lifecycle, work history, projects, costs, and supporting documents."><div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => nav(`/pm/settings?view=messages&property=${propertyId}`)}>Owner Communications</Button><Button onClick={() => setTab("documents")}>Operating Statements & Documents</Button><Button onClick={() => nav(`/pm/settings?view=make-ready&property=${propertyId}`)}>Make-Ready Report</Button><Button onClick={() => setTab("overview")}>Lifecycle & Checklists</Button></div></Panel> : null}

    <PMPropertyDetailsDrawer open={detailsOpen} onClose={() => setDetailsOpen(false)} workspace={workspace} property={property} units={units} onChanged={() => setNotice("Property profile updated.")} />
  </main>;
}

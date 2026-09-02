import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, Building2, ChevronRight, ClipboardList, DollarSign, FileSearch, FolderKanban, Gauge, Mail, MessageSquare, Plus, RefreshCw, Sparkles, Upload, Users, WalletCards, Wrench, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";

const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactMoney = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const words = (value) => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const list = (value) => Array.isArray(value?.results) ? value.results : Array.isArray(value) ? value : [];
const tones = {
  cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  fuchsia: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100",
  emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  amber: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  rose: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  violet: "border-violet-400/25 bg-violet-500/10 text-violet-100",
};

async function loadLegacyCommandCenter() {
  const workspace = (await api.get("/pm-hub/workspaces/current/")).data;
  const headers = { "X-PM-Workspace-ID": String(workspace.id) };
  const requests = await Promise.allSettled([
    api.get("/pm-hub/properties/", { headers }), api.get("/pm-hub/units/", { headers }), api.get("/pm-hub/work-orders/", { headers }),
    api.get("/pm-hub/projects/", { headers }), api.get("/pm-hub/ledger/", { headers }), api.get("/pm-hub/tenant-cases/", { headers }),
    api.get("/pm-hub/document-packets/", { headers }), api.get("/pm-hub/property-documents/", { headers }), api.get("/pm-hub/leads/", { headers }),
    api.get("/personal-calendar/connections/"),
  ]);
  const result = (index) => requests[index].status === "fulfilled" ? requests[index].value.data : [];
  const properties = list(result(0));
  const units = list(result(1));
  const workOrders = list(result(2));
  const projects = list(result(3));
  const ledger = list(result(4));
  const tenantCases = list(result(5));
  const packets = list(result(6));
  const documents = list(result(7));
  const leads = result(8)?.leads || list(result(8));
  const connections = result(9)?.connections || [];
  const openOrders = workOrders.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status));
  const activeProjects = projects.filter((item) => !["COMPLETED", "ARCHIVED"].includes(item.status));
  const openCases = tenantCases.filter((item) => item.status !== "CLOSED");
  const occupiedUnits = units.filter((item) => item.availability === "OCCUPIED").length;
  const monthStarts = Array.from({ length: 6 }, (_, index) => { const value = new Date(); value.setDate(1); value.setMonth(value.getMonth() - (5 - index)); return value; });
  const monthly = monthStarts.map((start) => ({ month: start.toLocaleDateString(undefined, { month: "short" }), month_key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`, charges: 0, payments: 0 }));
  ledger.forEach((entry) => {
    const bucket = monthly.find((item) => item.month_key === String(entry.entry_date || "").slice(0, 7));
    if (!bucket) return;
    if (["CHARGE", "ADJUSTMENT"].includes(entry.entry_type)) bucket.charges += Number(entry.amount || 0);
    if (entry.entry_type === "PAYMENT") bucket.payments += Number(entry.amount || 0);
  });
  const current = monthly[monthly.length - 1];
  const totalCharges = ledger.filter((item) => ["CHARGE", "ADJUSTMENT"].includes(item.entry_type)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalPayments = ledger.filter((item) => ["PAYMENT", "CREDIT"].includes(item.entry_type)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const today = new Date().toISOString().slice(0, 10);
  const schedule = [];
  openOrders.filter((item) => item.scheduled_for && new Date(item.scheduled_for) <= weekEnd).forEach((item) => schedule.push({ id: `work-order-${item.id}`, type: "WORK_ORDER", title: item.title, subtitle: `${item.property_name || "Property"} · ${words(item.status)}`, date: String(item.scheduled_for).slice(0, 10), datetime: item.scheduled_for, href: `/pm/work-orders?property=${item.property}` }));
  activeProjects.filter((item) => item.target_date && item.target_date >= today && new Date(`${item.target_date}T12:00:00`) <= weekEnd).forEach((item) => schedule.push({ id: `project-${item.id}`, type: "PROJECT", title: item.next_action || item.title, subtitle: `${item.property_name || "Portfolio"} · ${words(item.status)}`, date: item.target_date, datetime: "", href: "/pm/projects" }));
  schedule.sort((a, b) => a.date.localeCompare(b.date));
  const atRisk = properties.filter((item) => item.status === "AT_RISK").length;
  const urgent = openOrders.filter((item) => ["URGENT", "EMERGENCY"].includes(item.priority)).length;
  const blocked = activeProjects.filter((item) => item.blocker).length;
  const collections = openCases.filter((item) => item.case_type === "COLLECTIONS").length;
  const evictions = openCases.filter((item) => item.case_type === "EVICTION").length;
  const section8Packets = packets.filter((item) => String(item.packet_type).includes("SECTION8") && !["COMPLETED", "VOID"].includes(item.status)).length;
  const section8Documents = documents.filter((item) => item.category === "SECTION8" && ["DRAFT", "PENDING_SIGNATURE", "SUBMITTED"].includes(item.status)).length;
  const mailAccounts = connections.filter((item) => item.provider === "MICROSOFT" && item.connected);
  const routedAccounts = mailAccounts.filter((item) => item.mail_enabled && item.mail_destinations?.includes("PM") && (item.pm_workspace_ids || []).map(String).includes(String(workspace.id)));
  return {
    workspace: { id: workspace.id, name: workspace.name }, health: { score: Math.max(0, 100 - atRisk * 12 - urgent * 5 - blocked * 6 - openCases.length * 3) },
    kpis: { properties: properties.length, units: units.length, occupied_units: occupiedUnits, occupancy_rate: units.length ? Math.round(occupiedUnits / units.length * 100) : 0, at_risk: atRisk, open_work_orders: openOrders.length, make_ready: openOrders.filter((item) => item.category === "MAKE_READY").length, active_projects: activeProjects.length, blocked_projects: blocked, active_leads: leads.filter((item) => !["WON", "LOST"].includes(item.stage)).length },
    financials: { month_revenue: current.payments, month_charges: current.charges, collection_rate: current.charges ? Math.round(current.payments / current.charges * 1000) / 10 : 0, outstanding_balance: Math.max(0, totalCharges - totalPayments), monthly },
    cases: { open: openCases.length, collections, evictions, payment_plans: openCases.filter((item) => item.case_type === "PAYMENT_PLAN").length },
    section8: { active_leases: 0, pending_packets: section8Packets, pending_documents: section8Documents, waiting_responses: 0, attention: section8Packets + section8Documents },
    email: { microsoft_connected: mailAccounts.length > 0, pm_routing_enabled: routedAccounts.length > 0, account_count: routedAccounts.length },
    schedule: { today_count: schedule.filter((item) => item.date === today).length, week_count: schedule.length, items: schedule.slice(0, 10) },
    attention: [
      { key: "urgent-work-orders", label: "Urgent work orders", count: urgent, detail: "Emergency and urgent maintenance", tone: "rose", href: "/pm/work-orders?filter=URGENT" },
      { key: "collections", label: "Collections", count: collections, detail: "Open collection cases", tone: "amber", href: "/pm/settings?view=messages&tab=occupancy&case=collections" },
      { key: "evictions", label: "Evictions", count: evictions, detail: "Open eviction workflows", tone: "rose", href: "/pm/settings?view=messages&tab=occupancy&case=evictions" },
      { key: "section8", label: "Section 8 follow-up", count: section8Packets + section8Documents, detail: "Packets and documents waiting", tone: "violet", href: "/pm/leasing?focus=section8" },
      { key: "projects", label: "Blocked projects", count: blocked, detail: "Projects with an active blocker", tone: "amber", href: "/pm/projects" },
    ],
    active_work_orders: openOrders.slice(0, 6).map((item) => ({ ...item, href: `/pm/work-orders?property=${item.property}` })),
    properties: properties.slice(0, 6).map((item) => { const propertyUnits = units.filter((unit) => String(unit.property) === String(item.id)); const occupied = propertyUnits.filter((unit) => unit.availability === "OCCUPIED").length; return { id: item.id, name: item.name, address: [item.address, item.city, item.state].filter(Boolean).join(", "), status: item.status, occupancy_rate: propertyUnits.length ? Math.round(occupied / propertyUnits.length * 100) : 0, href: `/pm/properties/${item.id}` }; }),
    documents: { ownership_records: documents.filter((item) => item.category === "OWNERSHIP").length, pending: documents.filter((item) => ["DRAFT", "PENDING_SIGNATURE", "SUBMITTED"].includes(item.status)).length },
  };
}

function Card({ children, className = "" }) {
  return <section className={`rounded-[24px] border border-cyan-500/15 bg-[#07111f]/92 shadow-[0_18px_60px_rgba(0,0,0,.16)] ${className}`}>{children}</section>;
}
function Header({ eyebrow, title, detail, action }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[.06] px-4 py-3.5 sm:px-5"><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">{eyebrow}</div><h2 className="mt-1 text-base font-black text-white sm:text-lg">{title}</h2>{detail ? <p className="mt-1 text-[11px] text-slate-500">{detail}</p> : null}</div>{action}</div>;
}
function Kpi({ label, value, hint, tone, icon: Icon, onClick }) {
  return <button type="button" onClick={onClick} className={`group relative min-h-[118px] overflow-hidden rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 ${tones[tone] || tones.cyan}`}><div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-current opacity-[.05] blur-xl" /><div className="flex items-start justify-between gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl border border-current/20 bg-black/20">{React.createElement(Icon, { className: "h-4 w-4" })}</span><ChevronRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></div><div className="mt-3 flex items-end justify-between gap-2"><div><div className="text-2xl font-black tracking-tight text-white">{value}</div><div className="mt-0.5 text-[9px] font-black uppercase tracking-[.14em] opacity-80">{label}</div></div><span className="max-w-[88px] text-right text-[9px] leading-3 opacity-55">{hint}</span></div></button>;
}
function Empty({ children }) { return <div className="rounded-2xl border border-dashed border-slate-700/80 bg-black/15 px-4 py-7 text-center text-xs text-slate-500">{children}</div>; }
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-cyan-400/20 bg-[#020611]/95 p-3 shadow-xl"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>{payload.map((item) => <div key={item.dataKey} className="mt-1.5 flex min-w-32 items-center justify-between gap-5 text-xs"><span style={{ color: item.color }}>{item.name}</span><strong className="text-white">{money(item.value)}</strong></div>)}</div>;
}

function QuickOperations({ open, onClose, navigate, firstProperty }) {
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  const actions = [
    [DollarSign, "Add ledger entry", "Record a charge, payment, credit, or adjustment", "/pm/payments?add=1", "cyan"],
    [Wrench, "Create work order", "Open and dispatch maintenance", "/pm/work-orders?create=1", "amber"],
    [Users, "Add tenant", "Create or invite a resident", "/pm/tenants", "fuchsia"],
    [Building2, "Add property", "Add a property to this portfolio", "/pm/properties/new", "emerald"],
    [MessageSquare, "New message", "Tenant, owner, team, or collections", "/pm/settings?view=messages&compose=1", "violet"],
    [FolderKanban, "Create project", "Start and assign project work", "/pm/projects?create=1", "cyan"],
    [Mail, "Connect email", "Route Outlook leads and PM replies", "/pm/settings?view=leads&connect=email", "fuchsia"],
    [Upload, "Upload property record", "Deed, Section 8, lease, or notice", firstProperty ? `${firstProperty.href}?tab=documents` : "/pm/properties", "emerald"],
  ];
  return <div className="fixed inset-0 z-[260] bg-black/75 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside role="dialog" aria-modal="true" aria-label="Quick operations" className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[30px] border-t border-cyan-400/25 bg-[#040a15] p-4 shadow-2xl sm:inset-y-0 sm:left-auto sm:w-[440px] sm:rounded-none sm:border-l sm:border-t-0 sm:p-5"><div className="sticky top-0 z-10 flex items-center justify-between bg-[#040a15]/95 pb-4 backdrop-blur"><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Command drawer</div><h2 className="mt-1 text-2xl font-black text-white">Quick Operations</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300" aria-label="Close quick operations"><X className="h-5 w-5" /></button></div><div className="grid gap-3 sm:grid-cols-2">{actions.map(([Icon, label, detail, href, tone]) => <button key={label} type="button" onClick={() => { onClose(); navigate(href); }} className={`rounded-2xl border p-4 text-left transition hover:brightness-125 ${tones[tone]}`}>{React.createElement(Icon, { className: "h-5 w-5" })}<div className="mt-3 text-sm font-black text-white">{label}</div><p className="mt-1 text-[10px] leading-4 opacity-60">{detail}</p></button>)}</div><div className="mt-4 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-4"><Sparkles className="h-5 w-5 text-violet-200" /><div className="mt-2 font-black text-white">Need something less routine?</div><p className="mt-1 text-xs leading-5 text-slate-400">Ask SYNC to organize a property record request, summarize a case, or plan the next action.</p><button type="button" onClick={() => { onClose(); navigate("/sync?prompt=Help%20me%20with%20a%20property%20management%20task."); }} className="mt-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-xs font-black text-white">Open SYNC Assistant</button></div></aside></div>;
}

export default function PropertyManagerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [operationsOpen, setOperationsOpen] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try { setData((await api.get("/pm-hub/dashboard/command-center/")).data); }
    catch (caught) {
      if (caught?.response?.status === 404) {
        try { setData(await loadLegacyCommandCenter()); }
        catch (fallbackError) { setError(fallbackError?.response?.data?.detail || "Could not load the portfolio command center."); }
      } else setError(caught?.response?.data?.detail || "Could not load the portfolio command center.");
    }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const kpis = data?.kpis || {};
  const financials = data?.financials || {};
  const schedule = data?.schedule || { items: [], today_count: 0, week_count: 0 };
  const section8 = data?.section8 || {};
  const cases = data?.cases || {};
  const email = data?.email || {};
  const firstProperty = data?.properties?.[0];
  const chartData = useMemo(() => (financials.monthly || []).map((item) => ({ ...item, charges: Number(item.charges || 0), payments: Number(item.payments || 0) })), [financials.monthly]);
  const occupancyData = useMemo(() => [{ name: "Occupied", value: Number(kpis.occupied_units || 0) }, { name: "Available", value: Math.max(0, Number(kpis.units || 0) - Number(kpis.occupied_units || 0)) }], [kpis.occupied_units, kpis.units]);
  const nonZeroAttention = (data?.attention || []).filter((item) => Number(item.count) > 0);
  const dashboardKpis = [
    ["Revenue", compactMoney(financials.month_revenue), `${financials.collection_rate || 0}% collected this month`, "emerald", DollarSign, "/pm/payments"],
    ["Properties", kpis.properties || 0, `${kpis.units || 0} total units`, "cyan", Building2, "/pm/properties"],
    ["Occupancy", `${kpis.occupancy_rate || 0}%`, `${kpis.occupied_units || 0} of ${kpis.units || 0} units`, "fuchsia", Gauge, "/pm/settings?view=messages&tab=occupancy"],
    ["At risk", kpis.at_risk || 0, "Properties requiring review", "rose", AlertTriangle, "/pm/properties?focus=at-risk"],
    ["Work orders", kpis.open_work_orders || 0, "Open maintenance", "amber", Wrench, "/pm/work-orders?filter=OPEN"],
    ["Make ready", kpis.make_ready || 0, "Vacant-property work", "violet", ClipboardList, "/pm/settings?view=make-ready"],
    ["Projects", kpis.active_projects || 0, `${kpis.blocked_projects || 0} blocked`, "cyan", FolderKanban, "/pm/projects"],
    ["Evictions", cases.evictions || 0, `${cases.collections || 0} collections cases`, "rose", AlertTriangle, "/pm/settings?view=messages&tab=occupancy&case=evictions"],
  ];

  return <PMShell><main className="space-y-4 px-3 py-4 sm:px-5">
    <Card className="overflow-hidden bg-[radial-gradient(circle_at_12%_20%,rgba(34,211,238,.16),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(217,70,239,.16),transparent_32%),#07111f] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-500/10"><BarChart3 className="h-6 w-6 text-cyan-200" /><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#07111f] bg-emerald-400" /></div><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">Live portfolio pulse</div><div className="mt-1 flex flex-wrap items-baseline gap-2"><h2 className="text-xl font-black text-white">{data?.workspace?.name || "Your portfolio"}</h2><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${Number(data?.health?.score || 0) >= 85 ? tones.emerald : tones.amber}`}>{data?.health?.score ?? "—"} health</span></div><p className="mt-1 text-xs text-slate-400">Revenue, residents, work, cases, messages, and this week—one operating view.</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={load} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-slate-300 disabled:opacity-40" aria-label="Refresh command center"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button><button type="button" onClick={() => nav("/pm/settings?view=leads&connect=email")} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ${email.pm_routing_enabled ? tones.emerald : tones.fuchsia}`}><Mail className="h-4 w-4" />{email.pm_routing_enabled ? `${email.account_count} email routed` : "Connect email"}</button><button type="button" onClick={() => setOperationsOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 px-4 text-xs font-black text-slate-950"><Plus className="h-4 w-4" />Quick operations</button></div></div></Card>
    {error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><span>{error}</span><button type="button" onClick={load} className="rounded-xl border border-rose-300/30 px-3 py-2 text-xs font-black">Try again</button></div> : null}
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 2xl:grid-cols-8">{dashboardKpis.map(([label, value, hint, tone, Icon, href]) => <Kpi key={label} label={label} value={loading ? "—" : value} hint={hint} tone={tone} icon={Icon} onClick={() => nav(href)} />)}</div>

    <div className="grid gap-4 xl:grid-cols-[1.55fr_.65fr]">
      <Card><Header eyebrow="Financial performance" title="Revenue & collections" detail="Posted charges compared with payments received." action={<button type="button" onClick={() => nav("/pm/payments")} className="text-[10px] font-black text-cyan-300">Open ledger →</button>} /><div className="grid gap-3 p-4 sm:grid-cols-3">{[["Collected", financials.month_revenue, "emerald"], ["Collection rate", `${financials.collection_rate || 0}%`, "cyan"], ["Outstanding", financials.outstanding_balance, "amber"]].map(([label, value, tone], index) => <div key={label} className={`rounded-2xl border p-3 ${tones[tone]}`}><div className="text-[9px] font-black uppercase tracking-wider opacity-75">{label}</div><div className="mt-2 text-xl font-black text-white">{index === 1 ? value : money(value)}</div></div>)}</div><div className="h-52 px-2 pb-3 sm:h-60 sm:px-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="pmPayments" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.38} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient><linearGradient id="pmCharges" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.24} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.09)" vertical={false} /><XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={9} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="charges" name="Charges" stroke="#22d3ee" strokeWidth={2} fill="url(#pmCharges)" /><Area type="monotone" dataKey="payments" name="Payments" stroke="#34d399" strokeWidth={2.5} fill="url(#pmPayments)" /></AreaChart></ResponsiveContainer></div></Card>
      <Card><Header eyebrow="Portfolio utilization" title="Occupancy" detail={`${kpis.occupied_units || 0} occupied · ${Math.max(0, Number(kpis.units || 0) - Number(kpis.occupied_units || 0))} available`} action={<button type="button" onClick={() => nav("/pm/settings?view=messages&tab=occupancy")} className="text-[10px] font-black text-fuchsia-300">Records →</button>} /><div className="relative mx-auto h-52 max-w-[270px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={88} paddingAngle={4} startAngle={90} endAngle={-270} stroke="none"><Cell fill="#d946ef" /><Cell fill="#172033" /></Pie><Tooltip formatter={(value, name) => [`${value} units`, name]} contentStyle={{ background: "#020611", border: "1px solid rgba(217,70,239,.25)", borderRadius: 12, fontSize: 11 }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><div className="text-4xl font-black text-white">{kpis.occupancy_rate || 0}%</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.15em] text-fuchsia-300">Occupied</div></div></div></div><div className="grid grid-cols-2 gap-2 px-4 pb-4"><button type="button" onClick={() => nav("/pm/leasing")} className={`rounded-xl border p-3 text-left ${tones.cyan}`}><div className="text-lg font-black">{kpis.active_leads || 0}</div><div className="text-[9px] uppercase opacity-60">Active leads</div></button><button type="button" onClick={() => nav("/pm/settings?view=make-ready")} className={`rounded-xl border p-3 text-left ${tones.violet}`}><div className="text-lg font-black">{kpis.make_ready || 0}</div><div className="text-[9px] uppercase opacity-60">Make ready</div></button></div></Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <Card><Header eyebrow="Today & next 7 days" title="Operations schedule" detail={`${schedule.today_count || 0} today · ${schedule.week_count || 0} this week`} action={<button type="button" onClick={() => nav("/pm/calendar")} className="text-[10px] font-black text-cyan-300">Calendar →</button>} /><div className="space-y-2 p-3">{schedule.items?.length ? schedule.items.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => nav(item.href)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[.07] bg-black/20 p-3 text-left transition hover:border-cyan-400/25"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${item.date === new Date().toISOString().slice(0, 10) ? tones.fuchsia : tones.cyan}`}><div className="text-center"><div className="text-[8px] font-black uppercase">{new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</div><div className="text-base font-black leading-4">{new Date(`${item.date}T12:00:00`).getDate()}</div></div></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-white">{item.title}</div><div className="mt-1 truncate text-[10px] text-slate-500">{item.subtitle}</div></div><ChevronRight className="h-4 w-4 shrink-0 text-slate-600" /></button>) : <Empty>No scheduled work, project deadlines, lease expirations, or document dates in the next seven days.</Empty>}</div></Card>
      <Card><Header eyebrow="Maintenance control" title="Active work orders" detail="Priority work stays visible until completed." action={<button type="button" onClick={() => nav("/pm/work-orders")} className="text-[10px] font-black text-amber-300">View all →</button>} /><div className="space-y-2 p-3">{data?.active_work_orders?.length ? data.active_work_orders.map((item) => <button key={item.id} type="button" onClick={() => nav(item.href)} className="w-full rounded-2xl border border-white/[.07] bg-black/20 p-3 text-left hover:border-amber-400/25"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-black text-white">{item.title}</div><div className="mt-1 truncate text-[10px] text-slate-500">{item.property_name}{item.unit_label ? ` · ${item.unit_label}` : ""}</div></div><span className={`rounded-full border px-2 py-1 text-[8px] font-black ${["URGENT", "EMERGENCY"].includes(item.priority) ? tones.rose : item.priority === "HIGH" ? tones.amber : tones.cyan}`}>{words(item.priority)}</span></div><div className="mt-2 flex items-center justify-between text-[9px]"><span className="text-slate-500">{words(item.status)}</span><span className="font-black text-slate-300">{item.scheduled_for ? new Date(item.scheduled_for).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Not scheduled"}</span></div></button>) : <Empty>No active work orders.</Empty>}</div></Card>
      <Card><Header eyebrow="Executive attention" title="Needs your next action" detail="Cases, replies, paperwork, and blocked work." action={<span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${nonZeroAttention.length ? tones.rose : tones.emerald}`}>{nonZeroAttention.length ? `${nonZeroAttention.length} queues` : "All clear"}</span>} /><div className="space-y-2 p-3">{nonZeroAttention.length ? nonZeroAttention.map((item) => <button key={item.key} type="button" onClick={() => nav(item.href)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:brightness-125 ${tones[item.tone] || tones.cyan}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-current/15 bg-black/20 text-base font-black">{item.count}</div><div className="min-w-0 flex-1"><div className="text-xs font-black text-white">{item.label}</div><div className="mt-0.5 truncate text-[9px] opacity-55">{item.detail}</div></div><ChevronRight className="h-4 w-4 opacity-45" /></button>) : <Empty>No urgent work, overdue projects, open cases, or waiting replies.</Empty>}</div></Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-4">
      <button type="button" onClick={() => nav("/pm/leasing?focus=section8")} className={`rounded-[22px] border p-4 text-left ${tones.violet}`}><div className="flex items-center justify-between"><ClipboardList className="h-5 w-5" /><span className="text-2xl font-black text-white">{section8.attention || 0}</span></div><div className="mt-3 text-sm font-black text-white">Section 8 follow-up</div><p className="mt-1 text-[10px] leading-4 opacity-60">{section8.pending_packets || 0} packets · {section8.pending_documents || 0} documents · {section8.waiting_responses || 0} replies</p></button>
      <button type="button" onClick={() => nav("/pm/settings?view=messages&tab=occupancy&case=collections")} className={`rounded-[22px] border p-4 text-left ${tones.amber}`}><div className="flex items-center justify-between"><WalletCards className="h-5 w-5" /><span className="text-2xl font-black text-white">{cases.collections || 0}</span></div><div className="mt-3 text-sm font-black text-white">Collections & payment plans</div><p className="mt-1 text-[10px] leading-4 opacity-60">{cases.payment_plans || 0} payment plans · {money(financials.outstanding_balance)} outstanding</p></button>
      <button type="button" onClick={() => nav("/pm/settings?view=leads&connect=email")} className={`rounded-[22px] border p-4 text-left ${email.pm_routing_enabled ? tones.emerald : tones.fuchsia}`}><div className="flex items-center justify-between"><Mail className="h-5 w-5" /><span className="rounded-full border border-current/20 px-2 py-1 text-[8px] font-black">{email.pm_routing_enabled ? "CONNECTED" : "SET UP"}</span></div><div className="mt-3 text-sm font-black text-white">Email intelligence</div><p className="mt-1 text-[10px] leading-4 opacity-60">Route Outlook leads, Section 8, collections, tenant, and vendor mail into the right PM queue.</p></button>
      <button type="button" onClick={() => nav(firstProperty ? `${firstProperty.href}?tab=documents` : "/pm/properties")} className={`rounded-[22px] border p-4 text-left ${tones.cyan}`}><div className="flex items-center justify-between"><FileSearch className="h-5 w-5" /><span className="text-2xl font-black text-white">{data?.documents?.ownership_records || 0}</span></div><div className="mt-3 text-sm font-black text-white">Property records</div><p className="mt-1 text-[10px] leading-4 opacity-60">Upload deeds and ownership records now, or start a source-verified retrieval request with SYNC.</p></button>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
      <Card><Header eyebrow="Portfolio snapshot" title="Property health & occupancy" detail="Open a property for units, residents, work, projects, and records." action={<button type="button" onClick={() => nav("/pm/properties")} className="text-[10px] font-black text-cyan-300">All properties →</button>} /><div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">{data?.properties?.length ? data.properties.map((property) => <button key={property.id} type="button" onClick={() => nav(property.href)} className="rounded-2xl border border-white/[.07] bg-black/20 p-3 text-left hover:border-cyan-400/30"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-black text-white">{property.name}</div><div className="mt-1 truncate text-[9px] text-slate-500">{property.address}</div></div><span className={`rounded-full border px-2 py-1 text-[8px] font-black ${property.status === "AT_RISK" ? tones.rose : property.status === "WATCH" ? tones.amber : tones.emerald}`}>{words(property.status)}</span></div><div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: `${property.occupancy_rate}%` }} /></div><span className="text-[9px] font-black text-white">{property.occupancy_rate}%</span></div></button>) : <div className="sm:col-span-2 xl:col-span-3"><Empty>No properties yet. Add the first property to activate portfolio intelligence.</Empty></div>}</div></Card>
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_80%_10%,rgba(139,92,246,.2),transparent_35%),#07111f]"><div className="p-5"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-300/25 bg-violet-500/10"><Sparkles className="h-5 w-5 text-violet-200" /></div><div className="mt-4 text-[9px] font-black uppercase tracking-[.2em] text-violet-300">SYNC document assistant</div><h2 className="mt-2 text-xl font-black text-white">Find or organize a recorded deed</h2><p className="mt-2 text-xs leading-5 text-slate-400">Upload the deed to the property record, or ask SYNC to organize a public-record request. Online retrieval depends on the county recorder’s access, fees, and verification requirements; sources should be shown before a document is saved or sent.</p><div className="mt-4 grid gap-2"><button type="button" onClick={() => nav("/sync?prompt=I%20need%20help%20finding%20or%20requesting%20a%20recorded%20deed%20for%20a%20property%20and%20organizing%20it%20for%20Section%208.")} className="min-h-10 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 text-xs font-black text-white">Ask SYNC about a deed</button><button type="button" onClick={() => nav(firstProperty ? `${firstProperty.href}?tab=documents` : "/pm/properties")} className="min-h-10 rounded-xl border border-white/10 px-4 text-xs font-black text-slate-200">Upload to property record</button></div></div></Card>
    </div>
    <QuickOperations open={operationsOpen} onClose={() => setOperationsOpen(false)} navigate={nav} firstProperty={firstProperty} />
  </main></PMShell>;
}

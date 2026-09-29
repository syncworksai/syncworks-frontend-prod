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
  return <section className={`rounded-[18px] border border-cyan-500/15 bg-[#07111f]/92 shadow-[0_18px_60px_rgba(0,0,0,.16)] sm:rounded-[24px] ${className}`}>{children}</section>;
}
function Header({ eyebrow, title, detail, action }) {
  return <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[.06] px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3.5"><div><div className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300 sm:text-[9px] sm:tracking-[.2em]">{eyebrow}</div><h2 className="mt-0.5 text-sm font-black text-white sm:mt-1 sm:text-lg">{title}</h2>{detail ? <p className="mt-0.5 text-[10px] leading-4 text-slate-500 sm:mt-1 sm:text-[11px]">{detail}</p> : null}</div>{action}</div>;
}
function Kpi({ label, value, hint, tone, icon: Icon, onClick }) {
  return <button type="button" onClick={onClick} className={`group relative min-h-[88px] overflow-hidden rounded-[18px] border p-3 text-left transition hover:-translate-y-0.5 hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 sm:min-h-[118px] sm:rounded-[22px] sm:p-4 ${tones[tone] || tones.cyan}`}><div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-current opacity-[.05] blur-xl" /><div className="flex items-start justify-between gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-current/20 bg-black/20 sm:h-9 sm:w-9 sm:rounded-xl">{React.createElement(Icon, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4" })}</span><ChevronRight className="h-3.5 w-3.5 opacity-35 transition group-hover:translate-x-0.5 group-hover:opacity-100 sm:h-4 sm:w-4" /></div><div className="mt-2 sm:mt-3"><div className="text-xl font-black tracking-tight text-white sm:text-2xl">{value}</div><div className="mt-0.5 text-[8px] font-black uppercase tracking-[.12em] opacity-80 sm:text-[9px] sm:tracking-[.14em]">{label}</div><span className="mt-0.5 hidden text-[9px] leading-3 opacity-55 sm:block">{hint}</span></div></button>;
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

  return <PMShell><main className="space-y-3 px-3 py-3 sm:space-y-4 sm:px-5 sm:py-4">
    <Card className="overflow-hidden bg-[radial-gradient(circle_at_12%_20%,rgba(34,211,238,.16),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(217,70,239,.16),transparent_32%),#07111f] p-3 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3 sm:gap-4"><div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-500/10 sm:h-14 sm:w-14 sm:rounded-2xl"><BarChart3 className="h-4 w-4 text-cyan-200 sm:h-6 sm:w-6" /><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#07111f] bg-emerald-400 sm:h-3 sm:w-3" /></div><div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-[.18em] text-cyan-300 sm:text-[9px] sm:tracking-[.2em]">Live portfolio pulse</div><div className="mt-0.5 flex min-w-0 items-center gap-2 sm:mt-1 sm:flex-wrap sm:items-baseline"><h2 className="truncate text-base font-black text-white sm:text-xl">{data?.workspace?.name || "Your portfolio"}</h2><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black sm:px-2.5 sm:py-1 sm:text-[9px] ${Number(data?.health?.score || 0) >= 85 ? tones.emerald : tones.amber}`}>{data?.health?.score ?? "—"} health</span></div><p className="mt-1 hidden text-xs text-slate-400 sm:block">Revenue, residents, work, cases, messages, and this week—one operating view.</p></div></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><button type="button" onClick={load} disabled={loading} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/20 text-slate-300 disabled:opacity-40 sm:h-10 sm:w-10 sm:rounded-xl" aria-label="Refresh command center"><RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`} /></button><button type="button" onClick={() => setOperationsOpen(true)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-400 px-2.5 text-[10px] font-black text-slate-950 sm:min-h-10 sm:rounded-xl sm:px-4 sm:text-xs"><Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="sm:hidden">Quick</span><span className="hidden sm:inline">Quick operations</span></button></div></div></Card>
    {error ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100 sm:gap-3 sm:rounded-2xl sm:p-4 sm:text-sm"><span>{error}</span><button type="button" onClick={load} className="rounded-lg border border-rose-300/30 px-2.5 py-1.5 text-[10px] font-black sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">Try again</button></div> : null}
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button type="button" onClick={() => nav("/pm/settings?view=leads&connect=email")} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-black sm:min-h-10 sm:text-xs ${email.pm_routing_enabled ? tones.emerald : tones.fuchsia}`}><Mail className="h-3.5 w-3.5" /><span>{email.pm_routing_enabled ? "Email connected" : "Connect email"}</span><span className="text-[8px] font-semibold opacity-55">{email.pm_routing_enabled ? `${email.account_count} routed` : "helper"}</span></button>
      <button type="button" onClick={() => nav("/sync?prompt=Help%20me%20with%20my%20property%20management%20dashboard%2C%20records%2C%20tenants%2C%20collections%2C%20or%20next%20action.")} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 text-[10px] font-black text-violet-100 sm:min-h-10 sm:text-xs"><Sparkles className="h-3.5 w-3.5" /><span>Ask SYNC</span><span className="text-[8px] font-semibold opacity-55">PM helper</span></button>
    </div>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">{dashboardKpis.map(([label, value, hint, tone, Icon, href]) => <Kpi key={label} label={label} value={loading ? "—" : value} hint={hint} tone={tone} icon={Icon} onClick={() => nav(href)} />)}</div>

    <div className="grid gap-4 xl:grid-cols-[1.55fr_.65fr]">
      <Card><Header eyebrow="Financial performance" title="Revenue & collections" detail="Posted charges compared with payments received." action={<button type="button" onClick={() => nav("/pm/payments")} className="text-[9px] font-black text-cyan-300 sm:text-[10px]">Open ledger →</button>} /><div className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">{[["Collected", financials.month_revenue, "emerald"], ["Collection rate", `${financials.collection_rate || 0}%`, "cyan"], ["Outstanding", financials.outstanding_balance, "amber"]].map(([label, value, tone], index) => <div key={label} className={`rounded-xl border p-2.5 sm:rounded-2xl sm:p-3 ${tones[tone]}`}><div className="text-[8px] font-black uppercase tracking-wide opacity-75 sm:text-[9px]">{label}</div><div className="mt-1 text-base font-black text-white sm:mt-2 sm:text-xl">{index === 1 ? value : money(value)}</div></div>)}</div><div className="h-40 px-1 pb-2 sm:h-60 sm:px-4 sm:pb-3"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="pmPayments" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.38} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient><linearGradient id="pmCharges" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.24} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.09)" vertical={false} /><XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={9} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="charges" name="Charges" stroke="#22d3ee" strokeWidth={2} fill="url(#pmCharges)" /><Area type="monotone" dataKey="payments" name="Payments" stroke="#34d399" strokeWidth={2.5} fill="url(#pmPayments)" /></AreaChart></ResponsiveContainer></div></Card>
      <Card><Header eyebrow="Portfolio utilization" title="Occupancy" detail={`${kpis.occupied_units || 0} occupied · ${Math.max(0, Number(kpis.units || 0) - Number(kpis.occupied_units || 0))} available`} action={<button type="button" onClick={() => nav("/pm/settings?view=messages&tab=occupancy")} className="text-[9px] font-black text-fuchsia-300 sm:text-[10px]">Records →</button>} /><div className="relative mx-auto h-40 max-w-[230px] sm:h-52 sm:max-w-[270px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={88} paddingAngle={4} startAngle={90} endAngle={-270} stroke="none"><Cell fill="#d946ef" /><Cell fill="#172033" /></Pie><Tooltip formatter={(value, name) => [`${value} units`, name]} contentStyle={{ background: "#020611", border: "1px solid rgba(217,70,239,.25)", borderRadius: 12, fontSize: 11 }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><div className="text-4xl font-black text-white">{kpis.occupancy_rate || 0}%</div><div className="mt-1 text-[9px] font-black uppercase tracking-[.15em] text-fuchsia-300">Occupied</div></div></div></div><div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:px-4 sm:pb-4"><button type="button" onClick={() => nav("/pm/leasing")} className={`rounded-lg border p-2.5 text-left sm:rounded-xl sm:p-3 ${tones.cyan}`}><div className="text-base font-black sm:text-lg">{kpis.active_leads || 0}</div><div className="text-[8px] uppercase opacity-60 sm:text-[9px]">Active leads</div></button><button type="button" onClick={() => nav("/pm/settings?view=make-ready")} className={`rounded-lg border p-2.5 text-left sm:rounded-xl sm:p-3 ${tones.violet}`}><div className="text-base font-black sm:text-lg">{kpis.make_ready || 0}</div><div className="text-[8px] uppercase opacity-60 sm:text-[9px]">Make ready</div></button></div></Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <Card><Header eyebrow="Today & next 7 days" title="Operations schedule" detail={`${schedule.today_count || 0} today · ${schedule.week_count || 0} this week`} action={<button type="button" onClick={() => nav("/pm/calendar")} className="text-[10px] font-black text-cyan-300">Calendar →</button>} /><div className="space-y-2 p-3">{schedule.items?.length ? schedule.items.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => nav(item.href)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[.07] bg-black/20 p-3 text-left transition hover:border-cyan-400/25"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${item.date === new Date().toISOString().slice(0, 10) ? tones.fuchsia : tones.cyan}`}><div className="text-center"><div className="text-[8px] font-black uppercase">{new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</div><div className="text-base font-black leading-4">{new Date(`${item.date}T12:00:00`).getDate()}</div></div></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-white">{item.title}</div><div className="mt-1 truncate text-[10px] text-slate-500">{item.subtitle}</div></div><ChevronRight className="h-4 w-4 shrink-0 text-slate-600" /></button>) : <Empty>No scheduled work, project deadlines, lease expirations, or document dates in the next seven days.</Empty>}</div></Card>
      <Card><Header eyebrow="Maintenance control" title="Active work orders" detail="Priority work stays visible until completed." action={<button type="button" onClick={() => nav("/pm/work-orders")} className="text-[10px] font-black text-amber-300">View all →</button>} /><div className="space-y-2 p-3">{data?.active_work_orders?.length ? data.active_work_orders.map((item) => <button key={item.id} type="button" onClick={() => nav(item.href)} className="w-full rounded-2xl border border-white/[.07] bg-black/20 p-3 text-left hover:border-amber-400/25"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-black text-white">{item.title}</div><div className="mt-1 truncate text-[10px] text-slate-500">{item.property_name}{item.unit_label ? ` · ${item.unit_label}` : ""}</div></div><span className={`rounded-full border px-2 py-1 text-[8px] font-black ${["URGENT", "EMERGENCY"].includes(item.priority) ? tones.rose : item.priority === "HIGH" ? tones.amber : tones.cyan}`}>{words(item.priority)}</span></div><div className="mt-2 flex items-center justify-between text-[9px]"><span className="text-slate-500">{words(item.status)}</span><span className="font-black text-slate-300">{item.scheduled_for ? new Date(item.scheduled_for).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Not scheduled"}</span></div></button>) : <Empty>No active work orders.</Empty>}</div></Card>
      <Card><Header eyebrow="Executive attention" title="Needs your next action" detail="Cases, replies, paperwork, and blocked work." action={<span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${nonZeroAttention.length ? tones.rose : tones.emerald}`}>{nonZeroAttention.length ? `${nonZeroAttention.length} queues` : "All clear"}</span>} /><div className="space-y-2 p-3">{nonZeroAttention.length ? nonZeroAttention.map((item) => <button key={item.key} type="button" onClick={() => nav(item.href)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:brightness-125 ${tones[item.tone] || tones.cyan}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-current/15 bg-black/20 text-base font-black">{item.count}</div><div className="min-w-0 flex-1"><div className="text-xs font-black text-white">{item.label}</div><div className="mt-0.5 truncate text-[9px] opacity-55">{item.detail}</div></div><ChevronRight className="h-4 w-4 opacity-45" /></button>) : <Empty>No urgent work, overdue projects, open cases, or waiting replies.</Empty>}</div></Card>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:gap-4">
      <button type="button" onClick={() => nav("/pm/leasing?focus=section8")} className={`rounded-[18px] border p-3 text-left sm:rounded-[22px] sm:p-4 ${tones.violet}`}><div className="flex items-center justify-between"><ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" /><span className="text-xl font-black text-white sm:text-2xl">{section8.attention || 0}</span></div><div className="mt-2 text-xs font-black text-white sm:mt-3 sm:text-sm">Section 8 follow-up</div><p className="mt-1 text-[9px] leading-3 opacity-60 sm:text-[10px] sm:leading-4">{section8.pending_packets || 0} packets · {section8.pending_documents || 0} documents · {section8.waiting_responses || 0} replies</p></button>
      <button type="button" onClick={() => nav("/pm/settings?view=messages&tab=occupancy&case=collections")} className={`rounded-[18px] border p-3 text-left sm:rounded-[22px] sm:p-4 ${tones.amber}`}><div className="flex items-center justify-between"><WalletCards className="h-4 w-4 sm:h-5 sm:w-5" /><span className="text-xl font-black text-white sm:text-2xl">{cases.collections || 0}</span></div><div className="mt-2 text-xs font-black text-white sm:mt-3 sm:text-sm">Collections & payment plans</div><p className="mt-1 text-[9px] leading-3 opacity-60 sm:text-[10px] sm:leading-4">{cases.payment_plans || 0} payment plans · {money(financials.outstanding_balance)} outstanding</p></button>
      <button type="button" onClick={() => nav(firstProperty ? `${firstProperty.href}?tab=documents` : "/pm/properties")} className={`col-span-2 rounded-[18px] border p-3 text-left sm:rounded-[22px] sm:p-4 md:col-span-1 ${tones.cyan}`}><div className="flex items-center justify-between"><FileSearch className="h-4 w-4 sm:h-5 sm:w-5" /><span className="text-xl font-black text-white sm:text-2xl">{data?.documents?.ownership_records || 0}</span></div><div className="mt-2 text-xs font-black text-white sm:mt-3 sm:text-sm">Property records</div><p className="mt-1 text-[9px] leading-3 opacity-60 sm:text-[10px] sm:leading-4">Upload deeds and ownership records. Use the SYNC helper above when you need research or organization.</p></button>
    </div>

    <Card><Header eyebrow="Portfolio snapshot" title="Property health & occupancy" detail="Open a property for units, residents, work, projects, and records." action={<button type="button" onClick={() => nav("/pm/properties")} className="text-[9px] font-black text-cyan-300 sm:text-[10px]">All properties →</button>} /><div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">{data?.properties?.length ? data.properties.map((property) => <button key={property.id} type="button" onClick={() => nav(property.href)} className="rounded-xl border border-white/[.07] bg-black/20 p-2.5 text-left hover:border-cyan-400/30 sm:rounded-2xl sm:p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[11px] font-black text-white sm:text-xs">{property.name}</div><div className="mt-0.5 truncate text-[8px] text-slate-500 sm:mt-1 sm:text-[9px]">{property.address}</div></div><span className={`rounded-full border px-2 py-0.5 text-[7px] font-black sm:py-1 sm:text-[8px] ${property.status === "AT_RISK" ? tones.rose : property.status === "WATCH" ? tones.amber : tones.emerald}`}>{words(property.status)}</span></div><div className="mt-2 flex items-center gap-2 sm:mt-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: `${property.occupancy_rate}%` }} /></div><span className="text-[8px] font-black text-white sm:text-[9px]">{property.occupancy_rate}%</span></div></button>) : <div className="sm:col-span-2 xl:col-span-3"><Empty>No properties yet. Add the first property to activate portfolio intelligence.</Empty></div>}</div></Card>
    <QuickOperations open={operationsOpen} onClose={() => setOperationsOpen(false)} navigate={nav} firstProperty={firstProperty} />
  </main></PMShell>;
}

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CloudSun,
  ClipboardList,
  Compass,
  Dumbbell,
  HeartHandshake,
  Home,
  ListTodo,
  Mail,
  MapPinned,
  MessageSquareText,
  Mic2,
  Network,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AroundYouPanel from "../components/customer/AroundYouPanel";
import DashboardShell from "../components/dashboard/DashboardShell";
import CustomerAudioSummaryDrawer from "../components/sync/CustomerAudioSummaryDrawer";

const DAY_TRADING_EMAIL = "jacoblord7@outlook.com";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function firstName(user) {
  const name = String(user?.first_name || user?.name || "").trim();
  if (name) return name.split(/\s+/)[0];
  const email = String(user?.email || "").trim();
  return email ? email.split("@")[0] : "there";
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function hasProfile(profiles, key) {
  if (!profiles || typeof profiles !== "object") return false;
  return Object.keys(profiles).some((name) => String(name).toLowerCase() === String(key).toLowerCase());
}

function invoiceIsOverdue(item) {
  const state = String(item?.derived_state || item?.status || "").toUpperCase();
  if (state === "OVERDUE" || state === "PAST_DUE") return true;
  const raw = item?.due_date || item?.due_at || item?.payment_due_at;
  if (!raw) return false;
  const due = new Date(raw);
  return Number.isFinite(due.getTime()) && due.getTime() < Date.now() && !["PAID", "VOID"].includes(state);
}

const toneClasses = {
  cyan: "border-cyan-400/20 bg-cyan-500/[.06] text-cyan-200",
  violet: "border-violet-400/20 bg-violet-500/[.06] text-violet-200",
  amber: "border-amber-400/20 bg-amber-500/[.07] text-amber-200",
  rose: "border-rose-400/25 bg-rose-500/[.08] text-rose-200",
  emerald: "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200",
  sky: "border-sky-400/20 bg-sky-500/[.06] text-sky-200",
  fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/[.06] text-fuchsia-200",
};

function NavItem({ icon: Icon, label, active = false, onClick, tone = "cyan", badge }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-xs font-bold transition ${active ? toneClasses[tone] : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${toneClasses[tone]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white">{badge}</span> : null}
    </button>
  );
}

function QuickIntent({ icon: Icon, label, detail, onClick, tone = "cyan", primary = false }) {
  return (
    <button type="button" onClick={onClick} className={`group flex min-h-[72px] items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${primary ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/18 via-blue-500/10 to-violet-500/14" : "border-white/10 bg-white/[.025] hover:border-white/20"}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${toneClasses[tone]}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block text-sm font-black text-white">{label}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{detail}</span></span>
    </button>
  );
}

function ToolTile({ icon: Icon, label, detail, onClick, badge, tone = "cyan" }) {
  return (
    <button type="button" onClick={onClick} className="relative min-h-24 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.04]">
      {badge ? <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-300">{badge}</span> : null}
      <span className={`grid h-9 w-9 place-items-center rounded-xl border ${toneClasses[tone]}`}><Icon className="h-4.5 w-4.5" /></span>
      <div className="mt-2 text-sm font-black text-white">{label}</div>
      <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{detail}</div>
    </button>
  );
}

function AttentionCard({ tone, title, detail, onClick }) {
  const cls = tone === "rose" ? "border-rose-400/35 bg-rose-500/[.12]" : "border-amber-400/30 bg-amber-500/[.10]";
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left ${cls}`}>
      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] ${tone === "rose" ? "text-rose-200" : "text-amber-200"}`}><AlertTriangle className="h-4 w-4" />{title}</div>
      <div className="mt-2 text-sm font-bold leading-5 text-white">{detail}</div>
    </button>
  );
}

export default function CustomerDashboard() {
  const nav = useNavigate();
  const { user, profiles, myBusinesses, moduleAccess } = useAuth();
  const [audioOpen, setAudioOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get("/tickets/"), api.get("/sync-ai/customer/invoices/")]).then(([ticketResult, invoiceResult]) => {
      if (!active) return;
      setTickets(ticketResult.status === "fulfilled" ? safeList(ticketResult.value?.data) : []);
      setInvoices(invoiceResult.status === "fulfilled" ? safeList(invoiceResult.value?.data) : []);
    });
    return () => { active = false; };
  }, []);

  const openTickets = useMemo(() => tickets.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED", "PAID"].includes(String(item?.status || "").toUpperCase())), [tickets]);
  const urgentTickets = useMemo(() => openTickets.filter((item) => ["EMERGENCY", "URGENT", "PAST_DUE", "OVERDUE"].includes(String(item?.priority || item?.status || "").toUpperCase())), [openTickets]);
  const dueInvoices = useMemo(() => invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.derived_state || item?.status || "").toUpperCase())), [invoices]);
  const overdueInvoices = useMemo(() => dueInvoices.filter(invoiceIsOverdue), [dueInvoices]);
  const amountDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.balance_due ?? item?.total ?? 0), 0), [dueInvoices]);
  const overdueAmount = useMemo(() => overdueInvoices.reduce((sum, item) => sum + Number(item?.balance_due ?? item?.total ?? 0), 0), [overdueInvoices]);
  const businessConnected = (Array.isArray(myBusinesses) && myBusinesses.length > 0) || !!moduleAccess?.sbo;
  const pmConnected = hasProfile(profiles, "pm") || !!moduleAccess?.pm;
  const tenantConnected = hasProfile(profiles, "tenant");
  const propertyRoute = pmConnected ? "/pm" : tenantConnected ? "/tenant" : "/tenant/accept";
  const dayTradingEnabled = String(user?.email || "").trim().toLowerCase() === DAY_TRADING_EMAIL;

  const tools = [
    [ClipboardList, "Requests", "Track service requests and provider progress.", "/customer/tickets", openTickets.length ? `${openTickets.length} open` : null, "cyan"],
    [MessageSquareText, "Inbox", "Internal service conversations and connected email setup.", "/customer/inbox", null, "violet"],
    [CalendarDays, "Calendar", "Your real connected master calendar.", "/calendar", null, "sky"],
    [ListTodo, "To-do", "Personal tasks and reminders.", "/customer/tasks", null, "amber"],
    [Compass, "Local", "Food, shopping, services and things to do around you.", "/customer/discover", null, "emerald"],
    [MapPinned, "Traffic", "Live Mapbox traffic, ETA and delays.", "/customer/traffic", "live", "rose"],
    [CloudSun, "Weather", "Live conditions and minute forecast.", "/customer/weather", "live", "sky"],
    [Network, "Social", "Groups, events, shared collections and connections.", "/connect", null, "fuchsia"],
    [Dumbbell, "Health", "Workouts, nutrition, readiness and recovery.", "/customer/health", null, "emerald"],
    [CircleDollarSign, "Money", "Budgets, bills, accounts and financial planning.", "/customer/finance", dueInvoices.length ? `${dueInvoices.length} due` : null, overdueInvoices.length ? "rose" : "amber"],
    [Search, "EDGE", "Sports research and paper-trading tools.", "/customer/edge", "beta", "violet"],
    ...(dayTradingEnabled ? [[Activity, "Day Trade", "MNQ futures signal dashboard and analysis mode.", "/customer/day-trading-futures", "signal", "emerald"]] : []),
    [Users, "Family", "Shared routines, plans and household coordination.", "/customer/family", null, "cyan"],
    [Building2, "Property", "Rental property, tenant and maintenance workflows.", propertyRoute, null, "violet"],
    [BriefcaseBusiness, "Business", "Customers, leads, jobs and team operations.", businessConnected ? "/sbo" : "/customer/settings", null, "cyan"],
    [HeartHandshake, "Plans & pricing", "See what is free, paid, and useful.", "/customer/plans", null, "fuchsia"],
    [Settings, "Connections", "Manage connected calendars, services and account settings.", "/settings?tab=CONNECTIONS", null, "sky"],
  ];

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-[1540px] pb-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-5 2xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="sticky top-4 hidden h-fit rounded-[1.6rem] border border-white/10 bg-slate-950/65 p-3 lg:block">
          <div className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">Personal workspace</div>
          <NavItem icon={Home} label="Home" active onClick={() => nav("/customer")} tone="cyan" />
          <NavItem icon={CalendarDays} label="Calendar" onClick={() => nav("/calendar")} tone="sky" />
          <NavItem icon={ListTodo} label="To-do" onClick={() => nav("/customer/tasks")} tone="amber" />
          <NavItem icon={MessageSquareText} label="Inbox" onClick={() => nav("/customer/inbox")} tone="violet" />
          <NavItem icon={Compass} label="Local" onClick={() => nav("/customer/discover")} tone="emerald" />
          <NavItem icon={MapPinned} label="Traffic" onClick={() => nav("/customer/traffic")} tone="rose" />
          <NavItem icon={CloudSun} label="Weather" onClick={() => nav("/customer/weather")} tone="sky" />
          <NavItem icon={Store} label="Services" onClick={() => nav("/customer/marketplace")} tone="cyan" />
          <NavItem icon={Network} label="Social" onClick={() => nav("/connect")} tone="fuchsia" />
          <NavItem icon={Search} label="EDGE" onClick={() => nav("/customer/edge")} tone="violet" />
          {dayTradingEnabled ? <NavItem icon={Activity} label="Day Trade" onClick={() => nav("/customer/day-trading-futures")} tone="emerald" badge="LIVE" /> : null}
          <div className="my-2 h-px bg-white/10" />
          <NavItem icon={Settings} label="Settings" onClick={() => nav("/settings?tab=CONNECTIONS")} tone="sky" />
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="rounded-[1.8rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_12%,rgba(139,92,246,.17),transparent_30%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 shadow-[0_20px_65px_rgba(0,0,0,.28)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Personal command center</span><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-200">Live intelligence ready</span></div>
                <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Good afternoon, {firstName(user)}.</h1>
                <p className="mt-1 text-sm text-slate-400">See what needs attention, then jump straight into the right tool.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => nav("/customer/new-request")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100"><Sparkles className="h-4 w-4" />New request</button>
                <button type="button" onClick={() => setAudioOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 text-xs font-black text-violet-100"><Mic2 className="h-4 w-4" />Briefing</button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <QuickIntent icon={Utensils} label="Food" detail="Nearby now" tone="amber" onClick={() => nav("/customer/discover?category=FOOD")} />
              <QuickIntent icon={ShoppingBag} label="Shopping" detail="Stores nearby" tone="fuchsia" onClick={() => nav("/customer/discover?category=RETAIL")} />
              <QuickIntent icon={CloudSun} label="Weather" detail="Live + next hour" tone="sky" onClick={() => nav("/customer/weather")} />
              <QuickIntent icon={MapPinned} label="Traffic" detail="Live ETA + delay" tone="rose" onClick={() => nav("/customer/traffic")} />
              <QuickIntent icon={Compass} label="Local" detail="Explore around you" tone="emerald" onClick={() => nav("/customer/discover")} />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-3">
            <button type="button" onClick={() => nav("/customer/tickets")} className={`rounded-2xl border p-4 text-left ${urgentTickets.length ? "border-rose-400/35 bg-rose-500/[.10]" : openTickets.length ? "border-amber-400/25 bg-amber-500/[.06]" : "border-cyan-400/15 bg-cyan-500/[.04]"}`}><div className={`text-[9px] font-black uppercase tracking-wider ${urgentTickets.length ? "text-rose-200" : openTickets.length ? "text-amber-200" : "text-cyan-200"}`}>Requests</div><div className="mt-2 text-2xl font-black text-white">{openTickets.length}</div><div className="mt-1 text-xs text-slate-500">{urgentTickets.length ? `${urgentTickets.length} urgent item${urgentTickets.length === 1 ? "" : "s"}` : "Active service work"}</div></button>
            <button type="button" onClick={() => nav("/calendar")} className="rounded-2xl border border-violet-400/15 bg-violet-500/[.04] p-4 text-left"><div className="text-[9px] font-black uppercase tracking-wider text-violet-200">Schedule</div><div className="mt-2 text-lg font-black text-white">Today & upcoming</div><div className="mt-1 text-xs text-slate-500">Open the real master calendar</div></button>
            <button type="button" onClick={() => nav("/customer/invoices")} className={`rounded-2xl border p-4 text-left ${overdueInvoices.length ? "border-rose-400/35 bg-rose-500/[.11]" : dueInvoices.length ? "border-amber-400/25 bg-amber-500/[.06]" : "border-emerald-400/15 bg-emerald-500/[.04]"}`}><div className={`text-[9px] font-black uppercase tracking-wider ${overdueInvoices.length ? "text-rose-200" : dueInvoices.length ? "text-amber-200" : "text-emerald-200"}`}>{overdueInvoices.length ? "Past due" : "Money due"}</div><div className="mt-2 text-2xl font-black text-white">{overdueInvoices.length ? money(overdueAmount) : money(amountDue)}</div><div className="mt-1 text-xs text-slate-500">{overdueInvoices.length ? `${overdueInvoices.length} overdue` : dueInvoices.length ? `${dueInvoices.length} awaiting payment` : "All clear"}</div></button>
          </div>

          <AroundYouPanel />

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Your SyncWorks tools</div><h2 className="mt-1 text-lg font-black text-white">Open the workspace you need</h2><p className="mt-1 text-xs text-slate-500">Web is intentionally wider than the phone app so everything important stays visible.</p></div><button type="button" onClick={() => nav("/settings?tab=CONNECTIONS")} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100">Connection settings</button></div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {tools.map(([Icon, label, detail, route, badge, tone]) => <ToolTile key={label} icon={Icon} label={label} detail={detail} badge={badge} tone={tone} onClick={() => nav(route)} />)}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex items-end justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Service activity</div><h2 className="mt-1 text-lg font-black text-white">What is happening now</h2></div><button type="button" onClick={() => nav("/customer/tickets")} className="text-xs font-black text-cyan-200">View all</button></div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {openTickets.slice(0, 4).map((ticket) => <button key={ticket.id} type="button" onClick={() => nav(`/tickets/${ticket.id}`)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><div className="text-sm font-black text-white">{ticket?.taxonomy_label || ticket?.category_label || ticket?.service_category_label || ticket?.display_title || ticket?.title || "Service request"}</div><div className="mt-1 text-xs text-slate-500">{String(ticket?.status || "Open").replaceAll("_", " ")}</div></button>)}
              {!openTickets.length ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Nothing active right now.</div> : null}
            </div>
          </section>
        </div>

        <aside className="sticky top-4 hidden h-fit space-y-3 2xl:block">
          <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/65 p-4">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Needs attention</div>
            <div className="mt-3 space-y-2">
              {overdueInvoices.length ? <AttentionCard tone="rose" title="Past due" detail={`${money(overdueAmount)} across ${overdueInvoices.length} overdue item${overdueInvoices.length === 1 ? "" : "s"}.`} onClick={() => nav("/customer/invoices")} /> : null}
              {!overdueInvoices.length && dueInvoices.length ? <AttentionCard tone="amber" title="Payment due" detail={`${money(amountDue)} across ${dueInvoices.length} item${dueInvoices.length === 1 ? "" : "s"}.`} onClick={() => nav("/customer/invoices")} /> : null}
              {urgentTickets.length ? <AttentionCard tone="rose" title="Urgent service" detail={`${urgentTickets.length} request${urgentTickets.length === 1 ? "" : "s"} need attention.`} onClick={() => nav("/customer/tickets")} /> : null}
              {!urgentTickets.length && openTickets.length ? <AttentionCard tone="amber" title="Open requests" detail={`${openTickets.length} active request${openTickets.length === 1 ? "" : "s"} still in progress.`} onClick={() => nav("/customer/tickets")} /> : null}
              {!dueInvoices.length && !openTickets.length ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] p-4"><div className="text-xs font-black text-emerald-200">All clear</div><div className="mt-1 text-xs leading-5 text-slate-500">No known payment or service item needs action right now.</div></div> : null}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-violet-400/15 bg-violet-500/[.04] p-4">
            <div className="flex items-center gap-2 text-xs font-black text-violet-100"><Mail className="h-4 w-4" />Inbox intelligence</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Internal service conversations stay together. Connect external services from the Inbox/Connections area so SYNC can surface what matters.</p>
            <button type="button" onClick={() => nav("/customer/inbox")} className="mt-3 w-full rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-100">Open Inbox</button>
          </section>
        </aside>
      </div>
      <CustomerAudioSummaryDrawer open={audioOpen} onClose={() => setAudioOpen(false)} displayName={firstName(user)} />
    </DashboardShell>
  );
}

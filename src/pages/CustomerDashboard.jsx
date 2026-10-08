import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CloudSun,
  Compass,
  CreditCard,
  Dumbbell,
  HeartHandshake,
  Home,
  Inbox,
  ListTodo,
  MapPin,
  MapPinned,
  MessageSquareText,
  Network,
  Search,
  Settings,
  Sparkles,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { getBrowserCurrentLocation } from "../api/locationContext";
import { getLiveWeather } from "../api/liveContext";
import { useAuth } from "../auth/AuthContext";
import AroundYouPanel from "../components/customer/AroundYouPanel";
import CalendarDailySnapshot from "../components/calendar/CalendarDailySnapshot";
import DashboardShell from "../components/dashboard/DashboardShell";

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
  if (["OVERDUE", "PAST_DUE"].includes(state)) return true;
  const raw = item?.due_date || item?.due_at || item?.payment_due_at;
  if (!raw) return false;
  const due = new Date(raw);
  return Number.isFinite(due.getTime()) && due.getTime() < Date.now() && !["PAID", "VOID"].includes(state);
}

function eventLocation(event) {
  const meta = event?.metadata || {};
  return String(meta.routing_address_override || event?.location || event?.location_name || [event?.address_line1, event?.city, event?.state, event?.postal_code].filter(Boolean).join(", ") || "").trim();
}

function eventTime(event) {
  if (!event?.start_at) return "";
  const date = new Date(event.start_at);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function leaveBy(event) {
  const meta = event?.metadata || {};
  const raw = meta.leave_by || meta.route?.leave_by || meta.routing?.leave_by || event?.leave_by;
  if (!raw) return "Plan route";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return String(raw);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const tone = {
  cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
  sky: "border-sky-400/25 bg-sky-500/10 text-sky-200",
  violet: "border-violet-400/25 bg-violet-500/10 text-violet-200",
  fuchsia: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200",
  emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  rose: "border-rose-400/30 bg-rose-500/10 text-rose-200",
};

function NavButton({ icon: Icon, label, onClick, color = "cyan", active = false, badge }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:-translate-y-px ${active ? tone[color] : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${tone[color]}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 truncate text-xs font-black">{label}</span>
      {badge ? <span className="rounded-full border border-white/10 bg-white/[.05] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-300">{badge}</span> : null}
    </button>
  );
}

function Metric({ icon: Icon, label, value, detail, color = "cyan", onClick }) {
  const body = <><div className="flex items-center justify-between gap-2"><div className={`text-[9px] font-black uppercase tracking-[.16em] ${tone[color].split(" ").at(-1)}`}>{label}</div>{Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}</div><div className="mt-2 text-2xl font-black text-white">{value}</div><div className="mt-1 line-clamp-2 text-[10px] text-slate-500">{detail}</div></>;
  if (onClick) return <button type="button" onClick={onClick} className="rounded-2xl border border-white/10 bg-black/15 p-4 text-left transition hover:border-white/20 hover:bg-white/[.03]">{body}</button>;
  return <div className="rounded-2xl border border-white/10 bg-black/15 p-4">{body}</div>;
}

function AttentionItem({ title, detail, urgent = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-px ${urgent ? "border-rose-400/35 bg-rose-500/[.12]" : "border-amber-400/30 bg-amber-500/[.10]"}`}>
      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] ${urgent ? "text-rose-200" : "text-amber-200"}`}><AlertTriangle className="h-4 w-4" />{title}</div>
      <div className="mt-2 text-sm font-bold leading-5 text-white">{detail}</div>
    </button>
  );
}

function SectionCard({ eyebrow, title, action, onAction, children, className = "" }) {
  return <section className={`rounded-[1.6rem] border border-white/10 bg-slate-950/65 p-4 ${className}`}><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">{eyebrow}</div><h2 className="mt-1 text-base font-black text-white">{title}</h2></div>{action ? <button type="button" onClick={onAction} className="text-[10px] font-black text-cyan-200">{action}</button> : null}</div>{children}</section>;
}

export default function CustomerDashboard() {
  const nav = useNavigate();
  const { user, profiles, myBusinesses, moduleAccess } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [finance, setFinance] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/tickets/"),
      api.get("/sync-ai/customer/invoices/"),
      api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } }),
      api.get("/personal-finance/dashboard/"),
    ]).then(([ticketResult, invoiceResult, calendarResult, financeResult]) => {
      if (!mounted) return;
      setTickets(ticketResult.status === "fulfilled" ? safeList(ticketResult.value?.data) : []);
      setInvoices(invoiceResult.status === "fulfilled" ? safeList(invoiceResult.value?.data) : []);
      setCalendarEvents(calendarResult.status === "fulfilled" ? safeList(calendarResult.value?.data) : []);
      setFinance(financeResult.status === "fulfilled" ? (financeResult.value?.data || {}) : null);
    });

    getBrowserCurrentLocation({ enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 })
      .then((location) => getLiveWeather(location))
      .then((value) => { if (mounted) setWeather(value || null); })
      .catch(() => { if (mounted) setWeather(null); })
      .finally(() => { if (mounted) setWeatherLoading(false); });

    return () => { mounted = false; };
  }, []);

  const openTickets = useMemo(() => tickets.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED", "PAID"].includes(String(item?.status || "").toUpperCase())), [tickets]);
  const urgentTickets = useMemo(() => openTickets.filter((item) => ["EMERGENCY", "URGENT", "PAST_DUE", "OVERDUE"].includes(String(item?.priority || item?.status || "").toUpperCase())), [openTickets]);
  const dueInvoices = useMemo(() => invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.derived_state || item?.status || "").toUpperCase())), [invoices]);
  const overdueInvoices = useMemo(() => dueInvoices.filter(invoiceIsOverdue), [dueInvoices]);
  const amountDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.balance_due ?? item?.total ?? 0), 0), [dueInvoices]);
  const upcomingEvents = useMemo(() => calendarEvents.filter((item) => item?.start_at && new Date(item.start_at).getTime() >= Date.now()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)), [calendarEvents]);
  const todayKey = new Date().toDateString();
  const todayEvents = useMemo(() => calendarEvents.filter((item) => item?.start_at && new Date(item.start_at).toDateString() === todayKey).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)), [calendarEvents, todayKey]);
  const nextEvent = upcomingEvents[0] || null;
  const nextDestination = upcomingEvents.find((item) => eventLocation(item)) || null;
  const healthEvents = useMemo(() => todayEvents.filter((item) => String(item?.source || "").toUpperCase() === "HEALTH" || /workout|gym|training/i.test(String(item?.title || ""))), [todayEvents]);
  const workout = healthEvents[0] || null;

  const financeLiabilities = safeList(finance?.liabilities).filter((item) => !item?.is_hidden);
  const financeAccounts = safeList(finance?.accounts).filter((item) => !item?.is_hidden);
  const minimums = financeLiabilities.reduce((sum, item) => sum + Number(item?.minimum_payment ?? item?.next_payment_amount ?? 0), 0);
  const alertCount = overdueInvoices.length + urgentTickets.length + (safeList(weather?.alerts).length || 0);
  const attentionCount = alertCount + (!overdueInvoices.length ? dueInvoices.length : 0);
  const currentWeather = weather?.current || {};
  const weatherValue = weatherLoading ? "…" : weather ? `${Math.round(Number(currentWeather.temp_f || 0))}°` : "Open";
  const weatherDetail = weather ? (currentWeather.description || currentWeather.condition || "Current weather") : "Tap for live forecast";

  const businessConnected = (Array.isArray(myBusinesses) && myBusinesses.length > 0) || !!moduleAccess?.sbo;
  const pmConnected = hasProfile(profiles, "pm") || !!moduleAccess?.pm;
  const tenantConnected = hasProfile(profiles, "tenant");
  const propertyRoute = pmConnected ? "/pm" : tenantConnected ? "/tenant" : "/tenant/accept";
  const dayTradingEnabled = String(user?.email || "").trim().toLowerCase() === DAY_TRADING_EMAIL;

  const briefParts = [];
  if (nextEvent) briefParts.push(`Next: ${nextEvent.title || "calendar event"} ${eventTime(nextEvent) ? `· ${eventTime(nextEvent)}` : ""}.`);
  if (overdueInvoices.length) briefParts.push(`${overdueInvoices.length} overdue payment${overdueInvoices.length === 1 ? "" : "s"} need attention.`);
  else if (dueInvoices.length) briefParts.push(`${money(amountDue)} is due across ${dueInvoices.length} SyncWorks payment${dueInvoices.length === 1 ? "" : "s"}.`);
  if (financeLiabilities.length) briefParts.push(`Personal Finance is tracking ${financeLiabilities.length} debt account${financeLiabilities.length === 1 ? "" : "s"}.`);
  if (workout) briefParts.push(`Today's workout: ${workout.title || "Workout"}.`);
  if (weather) briefParts.push(`Weather is ${Math.round(Number(currentWeather.temp_f || 0))}° and ${String(currentWeather.description || currentWeather.condition || "available").toLowerCase()}.`);
  const brief = briefParts.length ? briefParts.slice(0, 4).join(" ") : "Nothing urgent is competing for your attention right now. Connect more of your life and SYNC will build a fuller daily brief here.";

  const updates = useMemo(() => {
    const rows = [];
    upcomingEvents.slice(0, 2).forEach((item) => rows.push({ icon: CalendarDays, title: item.title || "Calendar event", detail: eventTime(item), route: "/calendar", tone: "sky" }));
    openTickets.slice(0, 2).forEach((item) => rows.push({ icon: Sparkles, title: item.title || item.category_name || "Service request", detail: String(item.status || "Active").replaceAll("_", " "), route: item?.id ? `/tickets/${item.id}` : "/customer/tickets", tone: "cyan" }));
    if (businessConnected) rows.push({ icon: BriefcaseBusiness, title: "Business connected", detail: "Open Business for customers, jobs, leads and team activity.", route: "/sbo", tone: "violet" });
    if (pmConnected || tenantConnected) rows.push({ icon: Building2, title: "Property connected", detail: "Property activity is part of your connected life.", route: propertyRoute, tone: "emerald" });
    return rows.slice(0, 5);
  }, [upcomingEvents, openTickets, businessConnected, pmConnected, tenantConnected, propertyRoute]);

  return (
    <DashboardShell maxWidth="max-w-none" className="px-4 sm:px-6 lg:px-6 xl:px-8">
      <div className="grid w-full grid-cols-[230px_minmax(0,1fr)_310px] items-start gap-5 pb-10 max-xl:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="sticky top-4 rounded-[1.6rem] border border-white/10 bg-slate-950/75 p-3 shadow-[0_20px_60px_rgba(0,0,0,.25)] backdrop-blur-xl">
          <div className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300/70">Personal workspace</div>
          <div className="space-y-1">
            <NavButton icon={Home} label="Home" active onClick={() => nav("/customer")} color="cyan" />
            <NavButton icon={CalendarDays} label="Calendar" onClick={() => nav("/calendar")} color="sky" />
            <NavButton icon={ListTodo} label="To-do" onClick={() => nav("/customer/tasks")} color="amber" />
            <NavButton icon={MessageSquareText} label="Inbox" onClick={() => nav("/customer/inbox")} color="violet" />
            <NavButton icon={Compass} label="Local" onClick={() => nav("/customer/discover")} color="emerald" />
            <NavButton icon={MapPinned} label="Traffic" onClick={() => nav("/customer/traffic")} color="rose" badge="LIVE" />
            <NavButton icon={CloudSun} label="Weather" onClick={() => nav("/customer/weather")} color="sky" badge="LIVE" />
            <NavButton icon={Store} label="Services" onClick={() => nav("/customer/marketplace")} color="cyan" />
            <NavButton icon={Network} label="Social" onClick={() => nav("/connect")} color="fuchsia" />
            <NavButton icon={Search} label="EDGE" onClick={() => nav("/customer/edge")} color="violet" />
            {dayTradingEnabled ? <NavButton icon={Activity} label="Day Trade" onClick={() => nav("/customer/day-trading-futures")} color="emerald" badge="LIVE" /> : null}
          </div>
          <div className="my-3 h-px bg-white/10" />
          <NavButton icon={Settings} label="Connections & settings" onClick={() => nav("/settings?tab=CONNECTIONS")} color="sky" />
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-[1.8rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(168,85,247,.20),transparent_33%),radial-gradient(circle_at_0%_100%,rgba(34,211,238,.14),transparent_30%),linear-gradient(145deg,rgba(8,18,35,.98),rgba(2,6,23,.98))] p-6 shadow-[0_20px_70px_rgba(0,0,0,.35)]">
            <div className="flex items-start justify-between gap-5">
              <div><div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Personal command center</div><h1 className="mt-2 text-3xl font-black text-white">Good afternoon, {firstName(user)}.</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Your day, destinations, money, health and connected life — prioritized in one place.</p></div>
              <div className="flex gap-2"><button type="button" onClick={() => nav("/customer/new-request")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100"><Sparkles className="h-4 w-4" />New request</button><button type="button" onClick={() => nav("/sync")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-4 text-xs font-black text-violet-100">Ask SYNC</button></div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-3 max-lg:grid-cols-2">
              <Metric icon={CloudSun} label="Weather" value={weatherValue} detail={weatherDetail} color="sky" onClick={() => nav("/customer/weather")} />
              <Metric icon={MapPin} label="Next destination" value={nextDestination ? (nextDestination.title || "Event") : "No trip"} detail={nextDestination ? `${eventTime(nextDestination)} · ${eventLocation(nextDestination)}` : "Nothing with an address coming up"} color="cyan" onClick={() => nav("/calendar")} />
              <Metric icon={MapPinned} label="Leave by" value={nextDestination ? leaveBy(nextDestination) : "—"} detail={nextDestination ? "Open route for live traffic timing" : "Add an address to an event for routing"} color="rose" onClick={() => nav(nextDestination ? "/customer/traffic" : "/calendar")} />
              <Metric icon={BellRing} label="Attention" value={attentionCount || "Clear"} detail={attentionCount ? `${alertCount} alert${alertCount === 1 ? "" : "s"} · ${dueInvoices.length} payment item${dueInvoices.length === 1 ? "" : "s"}` : "Nothing urgent right now"} color={alertCount ? "rose" : "emerald"} />
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-violet-400/20 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,.14),transparent_36%),rgba(15,23,42,.55)] p-5">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-200"><Sparkles className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">SYNC brief</div><div className="mt-1 text-sm font-bold leading-6 text-white">{brief}</div></div><button type="button" onClick={() => nav("/sync")} className="shrink-0 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 py-2 text-[10px] font-black text-violet-100">Ask SYNC</button></div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <CalendarDailySnapshot title="Today · Calendar" />
            <SectionCard eyebrow="Money" title="Payments & personal finance" action="Open finance" onAction={() => nav("/customer/finance")}>
              {financeLiabilities.length || financeAccounts.length ? <div className="mt-3 space-y-2"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[8px] font-black uppercase tracking-wider text-slate-500">Tracked debts</div><div className="mt-1 text-xl font-black text-white">{financeLiabilities.length}</div></div><div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[8px] font-black uppercase tracking-wider text-slate-500">Monthly minimums</div><div className="mt-1 text-xl font-black text-white">{money(minimums)}</div></div></div>{dueInvoices.length ? <button type="button" onClick={() => nav("/customer/invoices")} className="flex w-full items-center justify-between rounded-xl border border-amber-400/20 bg-amber-500/[.07] p-3 text-left"><span><span className="block text-[10px] font-black text-amber-100">SyncWorks payments due</span><span className="mt-1 block text-sm font-black text-white">{money(amountDue)} · {dueInvoices.length} item{dueInvoices.length === 1 ? "" : "s"}</span></span><ChevronRight className="h-4 w-4 text-amber-300" /></button> : null}</div> : <button type="button" onClick={() => nav("/customer/finance")} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/[.06] p-3 text-left"><WalletCards className="h-5 w-5 text-cyan-200" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-black text-white">Set up Personal Finance</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">Add cards, bills and accounts so SYNC can warn you before payments are due.</span></span><ChevronRight className="h-4 w-4 text-slate-500" /></button>}
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard eyebrow="Workout briefing" title={workout ? (workout.title || "Today's workout") : "Health for today"} action="Open health" onAction={() => nav("/customer/health")}>
              {workout ? <button type="button" onClick={() => nav("/customer/health")} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] p-3 text-left"><Dumbbell className="h-5 w-5 text-emerald-200" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-black text-white">{eventTime(workout) || "Scheduled today"}</span><span className="mt-1 block text-[10px] text-slate-400">Tap to open your workout and start the session.</span></span><ChevronRight className="h-4 w-4 text-emerald-300" /></button> : <button type="button" onClick={() => nav("/customer/health")} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-left"><Dumbbell className="h-5 w-5 text-emerald-200" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-black text-white">No workout on today's calendar</span><span className="mt-1 block text-[10px] text-slate-400">Open Health to plan today or ask SYNC to build one.</span></span><ChevronRight className="h-4 w-4 text-slate-500" /></button>}
            </SectionCard>

            <SectionCard eyebrow="Connections" title="Make your command center smarter" action="Manage" onAction={() => nav("/settings?tab=CONNECTIONS")}>
              <div className="mt-3 grid gap-2 sm:grid-cols-3"><button type="button" onClick={() => nav("/settings?tab=CONNECTIONS")} className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-left"><CalendarDays className="h-4 w-4 text-sky-200" /><div className="mt-2 text-[10px] font-black text-white">Calendar sources</div></button><button type="button" onClick={() => nav("/settings?tab=CONNECTIONS")} className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-left"><Inbox className="h-4 w-4 text-violet-200" /><div className="mt-2 text-[10px] font-black text-white">Email</div></button><button type="button" onClick={() => nav("/customer/finance")} className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-left"><CreditCard className="h-4 w-4 text-amber-200" /><div className="mt-2 text-[10px] font-black text-white">Finance</div></button></div>
            </SectionCard>
          </div>

          <AroundYouPanel />
        </main>

        <aside className="sticky top-4 space-y-4 max-xl:col-start-2 max-xl:static max-xl:grid max-xl:grid-cols-2 max-xl:gap-4 max-xl:space-y-0">
          <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/75 p-4 shadow-[0_20px_60px_rgba(0,0,0,.25)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-amber-200">Alerts</div><h2 className="mt-1 text-lg font-black text-white">Needs attention</h2></div><AlertTriangle className={`h-5 w-5 ${alertCount ? "text-rose-300" : "text-emerald-300"}`} /></div>
            <div className="mt-4 space-y-3">
              {overdueInvoices.slice(0, 2).map((item, index) => <AttentionItem key={`overdue-${item?.id || index}`} urgent title="Past due" detail={`${item?.memo || item?.title || "Payment"} · ${money(item?.balance_due ?? item?.total ?? 0)}`} onClick={() => nav("/customer/invoices")} />)}
              {urgentTickets.slice(0, 2).map((item, index) => <AttentionItem key={`urgent-${item?.id || index}`} urgent title="Urgent request" detail={item?.title || item?.category_name || item?.category || "Service request needs attention"} onClick={() => nav(item?.id ? `/tickets/${item.id}` : "/customer/tickets")} />)}
              {safeList(weather?.alerts).slice(0, 1).map((item, index) => <AttentionItem key={`weather-${index}`} urgent title="Weather alert" detail={item?.event || item?.headline || "Weather alert in your area"} onClick={() => nav("/customer/weather")} />)}
              {!alertCount && dueInvoices.slice(0, 2).map((item, index) => <AttentionItem key={`due-${item?.id || index}`} title="Payment due" detail={`${item?.memo || item?.title || "Payment"} · ${money(item?.balance_due ?? item?.total ?? 0)}`} onClick={() => nav("/customer/invoices")} />)}
              {!alertCount && !dueInvoices.length ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.08] p-4"><div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-200">Clear</div><div className="mt-2 text-sm font-bold text-white">No urgent action required.</div><div className="mt-1 text-[10px] leading-4 text-slate-500">Routine activity stays in Updates. Alerts are reserved for things that truly need attention.</div></div> : null}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-500/[.05] p-4">
            <div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Updates</div><h3 className="mt-1 text-base font-black text-white">Across your connected life</h3></div><button type="button" onClick={() => nav("/sync/history")} className="text-[9px] font-black text-cyan-200">History</button></div>
            <div className="mt-3 space-y-2">{updates.length ? updates.map((item, index) => { const Icon = item.icon; return <button key={`${item.title}-${index}`} type="button" onClick={() => nav(item.route)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-left"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${tone[item.tone] || tone.cyan}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black text-white">{item.title}</span><span className="mt-0.5 block truncate text-[9px] text-slate-500">{item.detail}</span></span><ChevronRight className="h-4 w-4 text-slate-600" /></button>; }) : <div className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-[10px] leading-4 text-slate-500">No new updates. Read items can quietly fall out of Home while remaining available in history.</div>}</div>
          </section>

          <section className="rounded-[1.6rem] border border-violet-400/20 bg-violet-500/[.06] p-4 max-xl:col-span-2">
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Quick capture</div><h3 className="mt-1 text-base font-black text-white">Turn a message into an action</h3><p className="mt-2 text-[11px] leading-5 text-slate-400">Paste or forward appointment details to SYNC, then confirm before adding them to your calendar.</p><button type="button" onClick={() => nav("/sync?prompt=Help%20me%20turn%20an%20appointment%20message%20into%20a%20calendar%20event.")} className="mt-3 w-full rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 py-2.5 text-xs font-black text-violet-100">Open smart capture</button>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}

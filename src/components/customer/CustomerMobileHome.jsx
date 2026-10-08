import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CloudSun,
  CreditCard,
  Dumbbell,
  Inbox,
  Mail,
  MapPin,
  MapPinned,
  Menu,
  Mic2,
  ReceiptText,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { getBrowserCurrentLocation } from "../../api/locationContext";
import { getLiveWeather } from "../../api/liveContext";
import "./CustomerMobileHome.css";

const list = (value) => (Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : []);
const upper = (value) => String(value || "NEW").toUpperCase();

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function invoiceIsOverdue(item) {
  const state = upper(item?.derived_state || item?.status);
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

function eventTime(event, includeDay = false) {
  if (!event?.start_at) return "";
  const date = new Date(event.start_at);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("en-US", includeDay ? { weekday: "short", hour: "numeric", minute: "2-digit" } : { hour: "numeric", minute: "2-digit" });
}

function leaveBy(event) {
  const meta = event?.metadata || {};
  const raw = meta.leave_by || meta.route?.leave_by || meta.routing?.leave_by || event?.leave_by;
  if (!raw) return "Plan route";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return String(raw);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function titleFor(ticket) {
  return ticket?.taxonomy_label || ticket?.category_label || ticket?.service_category_label || ticket?.display_title || ticket?.title || "Service request";
}

const MORE = [
  ["Social", "People, groups, events and teams.", "/connect"],
  ["Store", "Products recommended from your connected life.", "/customer/store"],
  ["Marketplace & services", "Find providers and track service work.", "/customer/marketplace"],
  ["Invoices & payments", "Review SyncWorks invoices and payments.", "/customer/invoices"],
  ["Health & nutrition", "Training, meals, recovery and progress.", "/customer/health"],
  ["Personal Finance", "Cards, bills, budgets, debts and planning.", "/customer/finance"],
  ["SYNC Assistant", "Your daily briefing and connected-life action layer.", "/sync"],
  ["Connections", "Connect calendar, email and other apps.", "/settings?tab=CONNECTIONS"],
];

function MiniCard({ icon: Icon, label, value, detail, tone = "cyan", onClick }) {
  const toneClass = tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : tone === "violet" ? "text-violet-300" : tone === "emerald" ? "text-emerald-300" : tone === "sky" ? "text-sky-300" : "text-cyan-300";
  return <button type="button" onClick={onClick} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3 text-left"><div className="flex items-center justify-between gap-2"><div className="truncate text-[8px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div><Icon className={`h-3.5 w-3.5 shrink-0 ${toneClass}`} /></div><div className="mt-1 truncate text-[15px] font-black text-white">{value}</div><div className="mt-0.5 line-clamp-2 text-[8px] leading-3 text-slate-500">{detail}</div></button>;
}

function Panel({ eyebrow, title, action, onAction, children, className = "" }) {
  return <section className={`mt-3 rounded-[1.3rem] border border-white/10 bg-white/[.025] p-3.5 ${className}`}><div className="flex items-start justify-between gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-200">{eyebrow}</div><h2 className="mt-1 text-[13px] font-black text-white">{title}</h2></div>{action ? <button type="button" onClick={onAction} className="shrink-0 text-[9px] font-black text-cyan-300">{action}</button> : null}</div>{children}</section>;
}

export default function CustomerMobileHome({
  displayName,
  profilePhotoUrl,
  tickets,
  invoices,
  openCount,
  totalDue,
  loading,
  onNewRequest,
  onOpenTicket,
  onOpenRequests,
  onOpenCalendar,
  onOpenMessages,
  onOpenInvoices,
  onOpenMoney,
  onOpenHealth,
  onOpenAudioSummary,
}) {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [finance, setFinance] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } }),
      api.get("/personal-finance/dashboard/"),
    ]).then(([calendarResult, financeResult]) => {
      if (!mounted) return;
      setEvents(calendarResult.status === "fulfilled" ? list(calendarResult.value?.data) : []);
      setFinance(financeResult.status === "fulfilled" ? (financeResult.value?.data || {}) : null);
    });
    getBrowserCurrentLocation({ enableHighAccuracy: false, timeout: 9000, maximumAge: 120000 })
      .then((location) => getLiveWeather(location))
      .then((value) => { if (mounted) setWeather(value || null); })
      .catch(() => { if (mounted) setWeather(null); })
      .finally(() => { if (mounted) setWeatherLoading(false); });
    return () => { mounted = false; };
  }, []);

  const active = useMemo(() => list(tickets).filter((ticket) => !["COMPLETED", "PAID", "CLOSED", "CANCELLED"].includes(upper(ticket?.status))).slice(0, 2), [tickets]);
  const dueItems = useMemo(() => list(invoices).filter((item) => !["PAID", "VOID"].includes(upper(item?.derived_state || item?.status))), [invoices]);
  const overdueItems = useMemo(() => dueItems.filter(invoiceIsOverdue), [dueItems]);
  const upcoming = useMemo(() => events.filter((event) => event?.start_at && new Date(event.start_at).getTime() >= Date.now()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)), [events]);
  const todayKey = new Date().toDateString();
  const todayEvents = useMemo(() => events.filter((event) => event?.start_at && new Date(event.start_at).toDateString() === todayKey).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)), [events, todayKey]);
  const nextEvent = upcoming[0] || null;
  const nextDestination = upcoming.find((event) => eventLocation(event)) || null;
  const workout = todayEvents.find((event) => String(event?.source || "").toUpperCase() === "HEALTH" || /workout|gym|training/i.test(String(event?.title || ""))) || null;
  const liabilities = list(finance?.liabilities).filter((item) => !item?.is_hidden);
  const accounts = list(finance?.accounts).filter((item) => !item?.is_hidden);
  const minimums = liabilities.reduce((sum, item) => sum + Number(item?.minimum_payment ?? item?.next_payment_amount ?? 0), 0);
  const currentWeather = weather?.current || {};
  const weatherAlerts = list(weather?.alerts);
  const attentionCount = overdueItems.length + weatherAlerts.length;

  const briefParts = [];
  if (nextEvent) briefParts.push(`Next: ${nextEvent.title || "calendar event"} ${eventTime(nextEvent, true)}.`);
  if (overdueItems.length) briefParts.push(`${overdueItems.length} overdue payment${overdueItems.length === 1 ? "" : "s"} need attention.`);
  else if (dueItems.length) briefParts.push(`${money(totalDue)} is due across ${dueItems.length} SyncWorks payment${dueItems.length === 1 ? "" : "s"}.`);
  if (workout) briefParts.push(`Today's workout is ${workout.title || "scheduled"}.`);
  if (weather) briefParts.push(`${Math.round(Number(currentWeather.temp_f || 0))}° and ${String(currentWeather.description || currentWeather.condition || "current weather").toLowerCase()}.`);
  const brief = briefParts.length ? briefParts.slice(0, 4).join(" ") : "Nothing urgent right now. Connect more of your calendar, finances and life to make this brief smarter.";

  const updates = useMemo(() => {
    const rows = [];
    upcoming.slice(0, 2).forEach((event) => rows.push({ icon: CalendarDays, title: event.title || "Calendar event", detail: eventTime(event, true), action: onOpenCalendar }));
    active.slice(0, 2).forEach((ticket) => rows.push({ icon: Wrench, title: titleFor(ticket), detail: upper(ticket.status).replaceAll("_", " "), action: () => onOpenTicket(ticket.id) }));
    return rows.slice(0, 4);
  }, [upcoming, active, onOpenCalendar, onOpenTicket]);

  function submitSearch(event) {
    event.preventDefault();
    const clean = query.trim();
    nav(clean ? `/customer/new-request?query=${encodeURIComponent(clean)}` : "/customer/new-request");
  }

  return (
    <section className="customer-mobile-cockpit lg:hidden">
      <div className="customer-mobile-hero p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><div className="customer-mobile-brand">Personal command center</div><h1 className="mt-1 text-[24px] font-black tracking-tight text-white">Hey {displayName}</h1><p className="mt-1 text-[11px] text-slate-400">Here’s what matters across your day.</p></div>
          <div className="flex shrink-0 items-start gap-2"><button type="button" onClick={() => nav("/profile")} className="grid h-[50px] w-[50px] place-items-center overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-950/70" aria-label="Open profile">{profilePhotoUrl ? <img src={profilePhotoUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-cyan-200" />}</button><button type="button" onClick={() => setMoreOpen(true)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[.04]" aria-label="Open more"><Menu className="h-5 w-5" /></button></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniCard icon={CloudSun} label="Weather" value={weatherLoading ? "…" : weather ? `${Math.round(Number(currentWeather.temp_f || 0))}°` : "Open"} detail={weather ? (currentWeather.description || currentWeather.condition || "Live weather") : "Tap for live forecast"} tone="sky" onClick={() => nav("/customer/weather")} />
          <MiniCard icon={MapPin} label="Next destination" value={nextDestination ? (nextDestination.title || "Event") : "No trip"} detail={nextDestination ? `${eventTime(nextDestination, true)} · ${eventLocation(nextDestination)}` : "Add an address to an event"} onClick={onOpenCalendar} />
          <MiniCard icon={MapPinned} label="Leave by" value={nextDestination ? leaveBy(nextDestination) : "—"} detail={nextDestination ? "Open traffic for live route timing" : "No routed event coming up"} tone="rose" onClick={() => nav(nextDestination ? "/customer/traffic" : "/calendar")} />
          <MiniCard icon={AlertTriangle} label="Attention" value={attentionCount ? attentionCount : "Clear"} detail={attentionCount ? `${overdueItems.length} overdue · ${weatherAlerts.length} weather alert${weatherAlerts.length === 1 ? "" : "s"}` : `${dueItems.length} routine payment item${dueItems.length === 1 ? "" : "s"}`} tone={attentionCount ? "rose" : "emerald"} onClick={attentionCount ? onOpenInvoices : undefined} />
        </div>
      </div>

      <Panel eyebrow="SYNC brief" title="Your day in one glance" action="Play" onAction={onOpenAudioSummary} className="border-violet-400/20 bg-violet-500/[.05]"><div className="mt-2 text-[11px] font-semibold leading-5 text-slate-200">{brief}</div><button type="button" onClick={() => nav("/sync")} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 text-[10px] font-black text-violet-100"><Sparkles className="h-3.5 w-3.5" />Ask SYNC</button></Panel>

      {attentionCount ? <Panel eyebrow="Alerts" title="Needs your attention"><div className="mt-2 space-y-2">{overdueItems.slice(0, 2).map((item, index) => <button key={item?.id || index} type="button" onClick={onOpenInvoices} className="flex w-full items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-500/[.08] p-3 text-left"><AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" /><span className="min-w-0 flex-1"><span className="block text-[10px] font-black text-white">Payment overdue</span><span className="mt-0.5 block truncate text-[9px] text-slate-400">{item?.memo || item?.title || "Payment"} · {money(item?.balance_due ?? item?.total ?? 0)}</span></span></button>)}{weatherAlerts.slice(0, 1).map((item, index) => <button key={`weather-${index}`} type="button" onClick={() => nav("/customer/weather")} className="flex w-full items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-500/[.08] p-3 text-left"><CloudSun className="h-4 w-4 shrink-0 text-rose-300" /><span className="min-w-0 flex-1"><span className="block text-[10px] font-black text-white">Weather alert</span><span className="mt-0.5 block truncate text-[9px] text-slate-400">{item?.event || item?.headline || "Open weather for details"}</span></span></button>)}</div></Panel> : null}

      <Panel eyebrow="Today" title={new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} action="Calendar" onAction={onOpenCalendar}>
        <div className="mt-2 space-y-1.5">{todayEvents.length ? todayEvents.slice(0, 5).map((event, index) => <button key={event?.id || index} type="button" onClick={onOpenCalendar} className="flex w-full items-start gap-3 rounded-xl border border-white/[.07] bg-black/20 p-2.5 text-left"><div className="w-[54px] shrink-0 text-[9px] font-black text-cyan-200">{eventTime(event) || "All day"}</div><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-black text-white">{event.title || "Calendar event"}</div>{eventLocation(event) ? <div className="mt-0.5 truncate text-[8px] text-slate-500"><MapPin className="mr-1 inline h-2.5 w-2.5" />{eventLocation(event)}</div> : null}</div></button>) : <button type="button" onClick={onOpenCalendar} className="w-full rounded-xl border border-dashed border-white/10 p-3 text-left"><div className="text-[10px] font-black text-white">Nothing scheduled today</div><div className="mt-1 text-[9px] leading-4 text-slate-500">Connect all calendars so birthdays, anniversaries, family events and appointments can appear here.</div></button>}</div>
      </Panel>

      <Panel eyebrow="Money" title="Payments & personal finance" action="Open" onAction={onOpenMoney}>
        {liabilities.length || accounts.length ? <div className="mt-2"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="text-[8px] uppercase text-slate-500">Tracked debts</div><div className="mt-1 text-lg font-black text-white">{liabilities.length}</div></div><div className="rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="text-[8px] uppercase text-slate-500">Minimums</div><div className="mt-1 text-lg font-black text-white">{money(minimums)}</div></div></div>{dueItems.length ? <button type="button" onClick={onOpenInvoices} className="mt-2 flex w-full items-center justify-between rounded-xl border border-amber-400/20 bg-amber-500/[.07] p-2.5 text-left"><span><span className="block text-[9px] font-black text-amber-100">SyncWorks payments due</span><span className="block text-[11px] font-black text-white">{money(totalDue)}</span></span><ChevronRight className="h-4 w-4 text-amber-300" /></button> : null}</div> : <button type="button" onClick={onOpenMoney} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/[.05] p-3 text-left"><WalletCards className="h-5 w-5 text-cyan-200" /><span className="min-w-0 flex-1"><span className="block text-[10px] font-black text-white">Set up Personal Finance</span><span className="mt-1 block text-[9px] leading-4 text-slate-400">Add credit cards, bills and accounts and SYNC will notify you before payments are due.</span></span><ChevronRight className="h-4 w-4 text-slate-500" /></button>}
      </Panel>

      <Panel eyebrow="Workout briefing" title={workout ? (workout.title || "Today's workout") : "Health for today"} action="Health" onAction={onOpenHealth}>
        <button type="button" onClick={onOpenHealth} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[.045] p-3 text-left"><Dumbbell className="h-5 w-5 text-emerald-200" /><span className="min-w-0 flex-1"><span className="block text-[10px] font-black text-white">{workout ? (eventTime(workout) || "Scheduled today") : "No workout on today's calendar"}</span><span className="mt-1 block text-[9px] leading-4 text-slate-500">{workout ? "Tap to open the session." : "Open Health to plan today or ask SYNC to build one."}</span></span><ChevronRight className="h-4 w-4 text-emerald-300" /></button>
      </Panel>

      {updates.length ? <Panel eyebrow="Updates" title="Across your connected life"><div className="mt-2 space-y-1.5">{updates.map((item, index) => { const Icon = item.icon; return <button key={`${item.title}-${index}`} type="button" onClick={item.action} className="flex w-full items-center gap-3 rounded-xl border border-white/[.07] bg-black/20 p-2.5 text-left"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-200"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black text-white">{item.title}</span><span className="block truncate text-[8px] text-slate-500">{item.detail}</span></span><ChevronRight className="h-4 w-4 text-slate-600" /></button>; })}</div></Panel> : null}

      <Panel eyebrow="Connections" title="Make SYNC smarter" action="Manage" onAction={() => nav("/settings?tab=CONNECTIONS")}><div className="mt-2 grid grid-cols-3 gap-2"><button type="button" onClick={() => nav("/settings?tab=CONNECTIONS")} className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-left"><CalendarDays className="h-4 w-4 text-sky-200" /><div className="mt-1.5 text-[8px] font-black text-white">Calendars</div></button><button type="button" onClick={() => nav("/settings?tab=CONNECTIONS")} className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-left"><Inbox className="h-4 w-4 text-violet-200" /><div className="mt-1.5 text-[8px] font-black text-white">Email</div></button><button type="button" onClick={onOpenMoney} className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-left"><CreditCard className="h-4 w-4 text-amber-200" /><div className="mt-1.5 text-[8px] font-black text-white">Finance</div></button></div></Panel>

      <form onSubmit={submitSearch} className="mt-3 flex gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-cyan-300/15 bg-slate-950/70 px-3"><Search className="h-4 w-4 shrink-0 text-cyan-300" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Need a service? Plumber, lawn care…" className="min-w-0 flex-1 bg-transparent py-3 text-[11px] text-white outline-none placeholder:text-slate-600" /></label><button type="submit" className="grid w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600" aria-label="Find service"><Wrench className="h-5 w-5" /></button></form>

      {active.length ? <Panel eyebrow="Service activity" title={`${openCount} active request${openCount === 1 ? "" : "s"}`} action="View all" onAction={onOpenRequests}><div className="mt-2 space-y-2">{active.map((ticket) => <button key={ticket.id} type="button" onClick={() => onOpenTicket(ticket.id)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left"><Wrench className="h-4 w-4 text-cyan-300" /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-black text-white">{titleFor(ticket)}</span><span className="block text-[8px] uppercase tracking-wider text-slate-500">{upper(ticket.status).replaceAll("_", " ")}</span></span><ChevronRight className="h-4 w-4 text-slate-600" /></button>)}</div></Panel> : null}

      <div className="mt-4 -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">{[[Users,"Social",()=>nav("/connect")],[ShoppingBag,"Store",()=>nav("/customer/store")],[CalendarDays,"Calendar",onOpenCalendar],[Mail,"Inbox",onOpenMessages],[ReceiptText,"Invoices",onOpenInvoices],[Dumbbell,"Health",onOpenHealth],[CircleDollarSign,"Money",onOpenMoney],[Mic2,"Briefing",onOpenAudioSummary]].map(([Icon,label,action]) => <button key={label} type="button" onClick={action} className="min-w-[82px] rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><Icon className="h-4 w-4 text-cyan-300" /><div className="mt-2 text-[9px] font-black text-white">{label}</div></button>)}</div>

      {moreOpen ? <div className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm" onMouseDown={() => setMoreOpen(false)}><aside className="absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto border-l border-cyan-300/15 bg-[#020817] p-4" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SyncWorks</div><h2 className="mt-1 text-xl font-black text-white">Everything else</h2></div><button type="button" onClick={() => setMoreOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-2">{MORE.map(([title,body,url]) => <button key={title} type="button" onClick={() => nav(url)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><span className="min-w-0 flex-1"><span className="block text-[12px] font-black text-white">{title}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{body}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-600" /></button>)}</div></aside></div> : null}
    </section>
  );
}

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
  MapPinned,
  MessageSquareText,
  Network,
  Search,
  Settings,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AroundYouPanel from "../components/customer/AroundYouPanel";
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
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:-translate-y-px ${active ? tone[color] : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${tone[color]}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 truncate text-xs font-black">{label}</span>
      {badge ? <span className="rounded-full border border-white/10 bg-white/[.05] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-300">{badge}</span> : null}
    </button>
  );
}

function ActionCard({ icon: Icon, title, detail, onClick, color = "cyan", badge }) {
  return (
    <button type="button" onClick={onClick} className="group relative rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.045]">
      {badge ? <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-300">{badge}</span> : null}
      <span className={`grid h-10 w-10 place-items-center rounded-xl border ${tone[color]}`}><Icon className="h-5 w-5" /></span>
      <div className="mt-3 text-sm font-black text-white">{title}</div>
      <div className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</div>
    </button>
  );
}

function Metric({ label, value, detail, color = "cyan" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <div className={`text-[9px] font-black uppercase tracking-[.16em] ${tone[color].split(" ").at(-1)}`}>{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
    </div>
  );
}

function AttentionItem({ title, detail, urgent = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-px ${urgent ? "border-rose-400/35 bg-rose-500/[.12]" : "border-amber-400/30 bg-amber-500/[.10]"}`}>
      <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] ${urgent ? "text-rose-200" : "text-amber-200"}`}><AlertTriangle className="h-4 w-4" />{title}</div>
      <div className="mt-2 text-sm font-bold leading-5 text-white">{detail}</div>
    </button>
  );
}

export default function CustomerDashboard() {
  const nav = useNavigate();
  const { user, profiles, myBusinesses, moduleAccess } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.get("/tickets/"), api.get("/sync-ai/customer/invoices/")]).then(([ticketResult, invoiceResult]) => {
      if (!mounted) return;
      setTickets(ticketResult.status === "fulfilled" ? safeList(ticketResult.value?.data) : []);
      setInvoices(invoiceResult.status === "fulfilled" ? safeList(invoiceResult.value?.data) : []);
    });
    return () => { mounted = false; };
  }, []);

  const openTickets = useMemo(() => tickets.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED", "PAID"].includes(String(item?.status || "").toUpperCase())), [tickets]);
  const urgentTickets = useMemo(() => openTickets.filter((item) => ["EMERGENCY", "URGENT", "PAST_DUE", "OVERDUE"].includes(String(item?.priority || item?.status || "").toUpperCase())), [openTickets]);
  const dueInvoices = useMemo(() => invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.derived_state || item?.status || "").toUpperCase())), [invoices]);
  const overdueInvoices = useMemo(() => dueInvoices.filter(invoiceIsOverdue), [dueInvoices]);
  const amountDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.balance_due ?? item?.total ?? 0), 0), [dueInvoices]);

  const businessConnected = (Array.isArray(myBusinesses) && myBusinesses.length > 0) || !!moduleAccess?.sbo;
  const pmConnected = hasProfile(profiles, "pm") || !!moduleAccess?.pm;
  const tenantConnected = hasProfile(profiles, "tenant");
  const propertyRoute = pmConnected ? "/pm" : tenantConnected ? "/tenant" : "/tenant/accept";
  const dayTradingEnabled = String(user?.email || "").trim().toLowerCase() === DAY_TRADING_EMAIL;

  const toolCards = [
    [ClipboardList, "Requests", "Track service requests and provider progress.", "/customer/tickets", "cyan", openTickets.length ? `${openTickets.length} open` : null],
    [MessageSquareText, "Inbox", "Service conversations and external email setup.", "/customer/inbox", "violet", null],
    [CalendarDays, "Calendar", "Your connected master calendar and appointments.", "/calendar", "sky", null],
    [ListTodo, "To-do", "Tasks, reminders and follow-ups.", "/customer/tasks", "amber", null],
    [Compass, "Local", "Food, shopping, services and things to do.", "/customer/discover", "emerald", null],
    [MapPinned, "Traffic", "Live traffic, ETA and delay intelligence.", "/customer/traffic", "rose", "live"],
    [CloudSun, "Weather", "Live weather and minute forecast.", "/customer/weather", "sky", "live"],
    [Network, "Social", "Groups, events, collections and connections.", "/connect", "fuchsia", null],
    [Dumbbell, "Health", "Fitness, nutrition, readiness and recovery.", "/customer/health", "emerald", null],
    [CircleDollarSign, "Money", "Bills, budgets, accounts and planning.", "/customer/finance", overdueInvoices.length ? "rose" : "amber", dueInvoices.length ? `${dueInvoices.length} due` : null],
    [Search, "EDGE", "Sports research and paper trading.", "/customer/edge", "violet", "beta"],
    ...(dayTradingEnabled ? [[Activity, "Day Trade", "MNQ futures signal dashboard.", "/customer/day-trading-futures", "emerald", "signal"]] : []),
    [Users, "Family", "Shared household routines and plans.", "/customer/family", "cyan", null],
    [Building2, "Property", "Property, tenant and maintenance workflows.", propertyRoute, "violet", null],
    [BriefcaseBusiness, "Business", "Customers, jobs, leads and team operations.", businessConnected ? "/sbo" : "/customer/settings", "cyan", null],
    [HeartHandshake, "Plans", "Pricing, features and connected upgrades.", "/customer/plans", "fuchsia", null],
  ];

  return (
    <DashboardShell maxWidth="max-w-none" className="px-4 sm:px-6 lg:px-6 xl:px-8">
      <div className="w-full pb-10" style={{ display: "grid", gridTemplateColumns: "230px minmax(0,1fr) 310px", gap: "20px", alignItems: "start" }}>
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
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Personal command center</div>
                <h1 className="mt-2 text-3xl font-black text-white">Good afternoon, {firstName(user)}.</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">One place to see what matters, act quickly and move between the parts of your life connected to SyncWorks.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => nav("/customer/new-request")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100"><Sparkles className="h-4 w-4" />New request</button>
                <button type="button" onClick={() => nav("/sync")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-4 text-xs font-black text-violet-100">Ask SYNC</button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3">
              <Metric label="Open requests" value={openTickets.length} detail="Active service work" color="cyan" />
              <Metric label="Due" value={money(amountDue)} detail={dueInvoices.length ? `${dueInvoices.length} item${dueInvoices.length === 1 ? "" : "s"}` : "Nothing due"} color={overdueInvoices.length ? "rose" : "amber"} />
              <Metric label="Traffic" value="LIVE" detail="Route intelligence ready" color="rose" />
              <Metric label="Weather" value="LIVE" detail="Current-location forecast" color="sky" />
            </div>
          </section>

          <section className="grid grid-cols-4 gap-3">
            <ActionCard icon={CalendarDays} title="Calendar" detail="Appointments, events and travel timing." onClick={() => nav("/calendar")} color="sky" />
            <ActionCard icon={MessageSquareText} title="Inbox" detail="Internal messages and connected email." onClick={() => nav("/customer/inbox")} color="violet" />
            <ActionCard icon={MapPinned} title="Traffic" detail="Check live delays before you leave." onClick={() => nav("/customer/traffic")} color="rose" badge="live" />
            <ActionCard icon={CloudSun} title="Weather" detail="Minute weather and alerts." onClick={() => nav("/customer/weather")} color="sky" badge="live" />
          </section>

          <AroundYouPanel />

          <section className="rounded-[1.7rem] border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Your SyncWorks tools</div>
                <h2 className="mt-1 text-xl font-black text-white">Jump straight into what you need</h2>
              </div>
              <button type="button" onClick={() => nav("/settings?tab=CONNECTIONS")} className="rounded-xl border border-cyan-300/20 bg-cyan-500/[.06] px-3 py-2 text-[10px] font-black text-cyan-100">Connections & settings</button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {toolCards.map(([Icon, title, detail, route, color, badge]) => (
                <ActionCard key={title} icon={Icon} title={title} detail={detail} onClick={() => nav(route)} color={color} badge={badge} />
              ))}
            </div>
          </section>
        </main>

        <aside className="sticky top-4 space-y-4">
          <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/75 p-4 shadow-[0_20px_60px_rgba(0,0,0,.25)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.18em] text-amber-200">Needs attention</div>
                <h2 className="mt-1 text-lg font-black text-white">What matters now</h2>
              </div>
              <AlertTriangle className={`h-5 w-5 ${overdueInvoices.length || urgentTickets.length ? "text-rose-300" : "text-amber-300"}`} />
            </div>
            <div className="mt-4 space-y-3">
              {overdueInvoices.slice(0, 2).map((item, index) => (
                <AttentionItem key={`overdue-${item?.id || index}`} urgent title="Past due" detail={`${item?.memo || item?.title || "Payment"} · ${money(item?.balance_due ?? item?.total ?? 0)}`} onClick={() => nav("/customer/invoices")} />
              ))}
              {urgentTickets.slice(0, 2).map((item, index) => (
                <AttentionItem key={`urgent-${item?.id || index}`} urgent title="Urgent request" detail={item?.title || item?.category_name || item?.category || "Service request needs attention"} onClick={() => nav(item?.id ? `/tickets/${item.id}` : "/customer/tickets")} />
              ))}
              {!overdueInvoices.length && dueInvoices.slice(0, 2).map((item, index) => (
                <AttentionItem key={`due-${item?.id || index}`} title="Payment due" detail={`${item?.memo || item?.title || "Payment"} · ${money(item?.balance_due ?? item?.total ?? 0)}`} onClick={() => nav("/customer/invoices")} />
              ))}
              {!overdueInvoices.length && !urgentTickets.length && !dueInvoices.length ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.08] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-200">Clear</div>
                  <div className="mt-2 text-sm font-bold text-white">No immediate action required.</div>
                  <div className="mt-1 text-[10px] leading-4 text-slate-500">SYNC will surface overdue, urgent and due-soon items here.</div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-violet-400/20 bg-violet-500/[.06] p-4">
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Quick capture</div>
            <h3 className="mt-1 text-base font-black text-white">Turn a message into an action</h3>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">Paste or forward appointment details to SYNC, then confirm before adding them to your calendar.</p>
            <button type="button" onClick={() => nav("/sync?prompt=Help%20me%20turn%20an%20appointment%20message%20into%20a%20calendar%20event.")} className="mt-3 w-full rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 py-2.5 text-xs font-black text-violet-100">Open smart capture</button>
          </section>

          <section className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-500/[.05] p-4">
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Connected life</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => nav(propertyRoute)} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-left"><Building2 className="h-4 w-4 text-violet-200" /><div className="mt-2 text-xs font-black text-white">Property</div></button>
              <button type="button" onClick={() => nav(businessConnected ? "/sbo" : "/customer/settings")} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-left"><BriefcaseBusiness className="h-4 w-4 text-cyan-200" /><div className="mt-2 text-xs font-black text-white">Business</div></button>
              <button type="button" onClick={() => nav("/customer/family")} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-left"><Users className="h-4 w-4 text-emerald-200" /><div className="mt-2 text-xs font-black text-white">Family</div></button>
              <button type="button" onClick={() => nav("/customer/plans")} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-left"><HeartHandshake className="h-4 w-4 text-fuchsia-200" /><div className="mt-2 text-xs font-black text-white">Plans</div></button>
            </div>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}

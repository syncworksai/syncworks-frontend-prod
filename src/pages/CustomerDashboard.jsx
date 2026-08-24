import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CloudSun,
  ClipboardList,
  Dumbbell,
  HeartHandshake,
  Home,
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
import DashboardShell from "../components/dashboard/DashboardShell";
import CustomerAudioSummaryDrawer from "../components/sync/CustomerAudioSummaryDrawer";

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

function NavItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-10 w-full items-center gap-3 rounded-xl border px-3 text-left text-xs font-bold transition ${active ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100" : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[.04] hover:text-white"}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function QuickIntent({ icon: Icon, label, detail, onClick, primary = false }) {
  return (
    <button type="button" onClick={onClick} className={`group flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${primary ? "border-cyan-300/45 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-violet-500/15 shadow-[0_0_30px_rgba(34,211,238,.12)]" : "border-white/10 bg-white/[.025] hover:border-cyan-300/25 hover:bg-cyan-500/[.04]"}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${primary ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-slate-950/70 text-slate-300"}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block text-sm font-black text-white">{label}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{detail}</span></span>
    </button>
  );
}

function ToolTile({ icon: Icon, label, detail, onClick, badge }) {
  return (
    <button type="button" onClick={onClick} className="relative min-h-24 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-cyan-400/20 hover:bg-cyan-500/[.04]">
      {badge ? <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-300">{badge}</span> : null}
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-2 text-sm font-black text-white">{label}</div>
      <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{detail}</div>
    </button>
  );
}

export default function CustomerDashboard() {
  const nav = useNavigate();
  const { user, myBusinesses, moduleAccess } = useAuth();
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
  const dueInvoices = useMemo(() => invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.derived_state || item?.status || "").toUpperCase())), [invoices]);
  const amountDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.balance_due ?? item?.total ?? 0), 0), [dueInvoices]);
  const businessConnected = (Array.isArray(myBusinesses) && myBusinesses.length > 0) || !!moduleAccess?.sbo;

  function askSync(prompt) {
    sessionStorage.setItem("syncAssistantPendingPrompt", prompt);
    nav("/sync?return=%2Fcustomer");
  }

  const tools = [
    [ClipboardList, "Requests", "Track service requests and provider progress.", "/customer/tickets", openTickets.length ? `${openTickets.length} open` : null],
    [MessageSquareText, "Inbox", "SyncWorks conversations and external email intelligence.", "/customer/inbox"],
    [CalendarDays, "Calendar", "Connected calendars, appointments and leave-time planning.", "/calendar"],
    [Dumbbell, "Health", "Workouts, nutrition, readiness and recovery.", "/customer/health"],
    [CircleDollarSign, "Money", "Budgets, bills, accounts and financial planning.", "/customer/finance", dueInvoices.length ? `${dueInvoices.length} due` : null],
    [Search, "EDGE", "Sports research and paper-trading tools.", "/customer/edge", "beta"],
    [Users, "Family", "Shared routines, plans and household coordination.", "/customer/family"],
    [Network, "Social", "Groups, events, shared collections and connections.", "/connect"],
    [Building2, "Property", "Rental property, tenant and maintenance workflows.", "/pm"],
    [BriefcaseBusiness, "Business", "Customers, leads, jobs and team operations.", businessConnected ? "/sbo" : "/settings"],
    [HeartHandshake, "Plans & pricing", "See what is free, what is paid, and why it is useful.", "/customer/plans"],
    [Settings, "Connections", "Connect calendars, email and other services.", "/customer/settings"],
  ];

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-7xl pb-8 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-5">
        <aside className="sticky top-4 hidden h-fit rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-3 lg:block">
          <NavItem icon={Home} label="Home" active onClick={() => nav("/customer")} />
          <NavItem icon={Store} label="Services" onClick={() => nav("/customer/marketplace")} />
          <NavItem icon={ClipboardList} label="Requests" onClick={() => nav("/customer/tickets")} />
          <NavItem icon={MessageSquareText} label="Inbox" onClick={() => nav("/customer/inbox")} />
          <NavItem icon={CalendarDays} label="Calendar" onClick={() => nav("/calendar")} />
          <NavItem icon={Dumbbell} label="Health" onClick={() => nav("/customer/health")} />
          <NavItem icon={CircleDollarSign} label="Money" onClick={() => nav("/customer/finance")} />
          <NavItem icon={Settings} label="More" onClick={() => nav("/customer/settings")} />
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="rounded-[1.75rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_12%,rgba(139,92,246,.16),transparent_30%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 shadow-[0_20px_65px_rgba(0,0,0,.28)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200">Personal</span><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-200">SYNC Local ready</span></div>
                <h1 className="mt-2 text-2xl font-black text-white">Good morning, {firstName(user)}.</h1>
                <p className="mt-1 text-sm text-slate-400">What do you need SyncWorks to handle?</p>
              </div>
              <button type="button" onClick={() => setAudioOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-violet-300/25 bg-violet-500/10 px-4 text-xs font-black text-violet-100"><Mic2 className="h-4 w-4" />Play briefing</button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <QuickIntent icon={Sparkles} label="Book a service" detail="Tell us what you need done." primary onClick={() => nav("/customer/new-request")} />
              <QuickIntent icon={Utensils} label="Food nearby" detail="Find something close now." onClick={() => askSync("Find good food near me right now.")} />
              <QuickIntent icon={ShoppingBag} label="Shops nearby" detail="Find stores around me." onClick={() => askSync("Find useful shops near me right now.")} />
              <QuickIntent icon={CloudSun} label="Weather" detail="What affects today?" onClick={() => askSync("What is the weather where I am and what should I know today?")} />
              <QuickIntent icon={MapPinned} label="Traffic" detail="Check delays and travel." onClick={() => askSync("Check traffic around me and tell me if anything affects my schedule.")} />
              <QuickIntent icon={Mic2} label="Briefing" detail="Hear what matters now." onClick={() => setAudioOpen(true)} />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-3">
            <button type="button" onClick={() => nav("/customer/tickets")} className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-4 text-left"><div className="text-[9px] font-black uppercase tracking-wider text-cyan-200">Active requests</div><div className="mt-2 text-2xl font-black text-white">{openTickets.length}</div><div className="mt-1 text-xs text-slate-500">See provider status and next steps</div></button>
            <button type="button" onClick={() => nav("/calendar")} className="rounded-2xl border border-violet-400/15 bg-violet-500/[.04] p-4 text-left"><div className="text-[9px] font-black uppercase tracking-wider text-violet-200">Schedule</div><div className="mt-2 text-lg font-black text-white">Today & upcoming</div><div className="mt-1 text-xs text-slate-500">Events, appointments and leave times</div></button>
            <button type="button" onClick={() => nav("/customer/finance")} className="rounded-2xl border border-amber-400/15 bg-amber-500/[.04] p-4 text-left"><div className="text-[9px] font-black uppercase tracking-wider text-amber-200">Money due</div><div className="mt-2 text-2xl font-black text-white">{money(amountDue)}</div><div className="mt-1 text-xs text-slate-500">Known payments requiring attention</div></button>
          </div>

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex items-end justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Service activity</div><h2 className="mt-1 text-lg font-black text-white">What is happening now</h2></div><button type="button" onClick={() => nav("/customer/tickets")} className="text-xs font-black text-cyan-200">View all</button></div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {openTickets.slice(0, 4).map((ticket) => <button key={ticket.id} type="button" onClick={() => nav(`/tickets/${ticket.id}`)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><div className="text-sm font-black text-white">{ticket?.taxonomy_label || ticket?.category_label || ticket?.service_category_label || ticket?.display_title || ticket?.title || "Service request"}</div><div className="mt-1 text-xs text-slate-500">{String(ticket?.status || "Open").replaceAll("_", " ")}</div></button>)}
              {!openTickets.length ? <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Nothing active right now. Book a service whenever you need help.</div> : null}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Tools & features</div><h2 className="mt-1 text-lg font-black text-white">Everything else is still here</h2><p className="mt-1 text-xs text-slate-500">Open the detail only when you need it.</p></div><button type="button" onClick={() => nav("/customer/plans")} className="rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-100">Why pay for features?</button></div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {tools.map(([Icon, label, detail, route, badge]) => <ToolTile key={label} icon={Icon} label={label} detail={detail} badge={badge} onClick={() => nav(route)} />)}
            </div>
          </section>
        </div>
      </div>
      <CustomerAudioSummaryDrawer open={audioOpen} onClose={() => setAudioOpen(false)} displayName={firstName(user)} />
    </DashboardShell>
  );
}

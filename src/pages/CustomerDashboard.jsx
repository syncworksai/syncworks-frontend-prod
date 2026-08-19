import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Dumbbell,
  Gauge,
  HeartHandshake,
  Home,
  KeyRound,
  MessageSquareText,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DashboardShell from "../components/dashboard/DashboardShell";
import CustomerAudioSummaryDrawer from "../components/sync/CustomerAudioSummaryDrawer";
import SyncLauncherButton from "../components/sync/SyncLauncherButton";

const GOD_MODE_EMAILS = new Set(["jacoblord7@outlook.com"]);

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

function NavItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3 text-left text-sm font-bold transition ${
        active
          ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"
          : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[.04] hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = "cyan", onClick }) {
  const toneClass = {
    cyan: "text-cyan-200 border-cyan-400/15 bg-cyan-500/[.05]",
    emerald: "text-emerald-200 border-emerald-400/15 bg-emerald-500/[.05]",
    violet: "text-violet-200 border-violet-400/15 bg-violet-500/[.05]",
    amber: "text-amber-200 border-amber-400/15 bg-amber-500/[.05]",
    rose: "text-rose-200 border-rose-400/15 bg-rose-500/[.05]",
  }[tone] || "text-cyan-200 border-cyan-400/15 bg-cyan-500/[.05]";

  return (
    <button type="button" onClick={onClick} className={`min-h-28 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[.06] active:scale-[.99] ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em]"><Icon className="h-4 w-4" />{label}</div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </button>
  );
}

function QuickAction({ icon: Icon, label, detail, onClick, badge, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/[.06] text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200",
    violet: "border-violet-400/20 bg-violet-500/[.06] text-violet-200",
    amber: "border-amber-400/20 bg-amber-500/[.06] text-amber-200",
  };
  return (
    <button type="button" onClick={onClick} className={`relative min-h-24 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[.07] active:scale-[.98] ${tones[tone] || tones.cyan}`}>
      {badge ? <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-200">{badge}</span> : null}
      <Icon className="h-5 w-5" />
      <div className="mt-3 text-sm font-black text-white">{label}</div>
      <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{detail}</div>
    </button>
  );
}

function Section({ eyebrow, title, action, onAction, children, className = "" }) {
  return (
    <section className={`rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">{eyebrow}</div>
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        </div>
        {action ? <button type="button" onClick={onAction} className="text-xs font-black text-cyan-200 hover:text-white">{action}</button> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
    Promise.allSettled([api.get("/tickets/"), api.get("/cash-fee-invoices/")]).then(([ticketResult, invoiceResult]) => {
      if (!active) return;
      setTickets(ticketResult.status === "fulfilled" ? safeList(ticketResult.value?.data) : []);
      setInvoices(invoiceResult.status === "fulfilled" ? safeList(invoiceResult.value?.data) : []);
    });
    return () => { active = false; };
  }, []);

  const email = String(user?.email || "").toLowerCase();
  const isGodMode = GOD_MODE_EMAILS.has(email);
  const openTickets = useMemo(() => tickets.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED", "PAID"].includes(String(item?.status || "").toUpperCase())), [tickets]);
  const dueInvoices = useMemo(() => invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.status || "").toUpperCase())), [invoices]);
  const amountDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.amount || item?.total || Number(item?.amount_cents || 0) / 100 || 0), 0), [dueInvoices]);
  const attentionCount = openTickets.length + dueInvoices.length;
  const tenantConnected = hasProfile(profiles, "tenant");
  const pmConnected = hasProfile(profiles, "pm") || !!moduleAccess?.pm;
  const businessConnected = (Array.isArray(myBusinesses) && myBusinesses.length > 0) || !!moduleAccess?.sbo;

  const quickActions = [
    [Dumbbell, "Health", "Training, nutrition, progress and recovery.", "/customer/health", null, "emerald"],
    [CircleDollarSign, "Money", "Accounts, budgets, bills and financial planning.", "/customer/finance", dueInvoices.length ? `${dueInvoices.length} due` : null, "amber"],
    [CalendarDays, "Calendar", "Your connected schedule and event planning.", "/calendar", null, "violet"],
    [Network, "Social", "Friends, groups, events and shared collections.", "/connect", "connect", "cyan"],
    [Users, "Family", "Household plans, shared routines and coordination.", "/customer/family", null, "emerald"],
    [ClipboardList, "Requests", "Service requests, status and marketplace work.", "/customer/tickets", openTickets.length ? `${openTickets.length} open` : null, "violet"],
    [MessageSquareText, "Messages", "Conversations and items waiting on you.", "/customer/inbox", null, "cyan"],
    [Search, "EDGE", "Sports prediction-market research and paper trading.", "/customer/edge", "beta", "emerald"],
    [Settings, "Settings", "Connections, access, fees and navigation.", "/settings", null, "cyan"],
  ];

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-7xl pb-8 lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-5">
        <aside className="sticky top-4 hidden h-fit rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-3 lg:block">
          <NavItem icon={Home} label="Home" active onClick={() => nav("/customer")} />
          <NavItem icon={Dumbbell} label="Health" onClick={() => nav("/customer/health")} />
          <NavItem icon={CircleDollarSign} label="Money" onClick={() => nav("/customer/finance")} />
          <NavItem icon={CalendarDays} label="Calendar" onClick={() => nav("/calendar")} />
          <NavItem icon={Network} label="Social" onClick={() => nav("/connect")} />
          <NavItem icon={ClipboardList} label="Requests" onClick={() => nav("/customer/tickets")} />
          <NavItem icon={MessageSquareText} label="Messages" onClick={() => nav("/customer/inbox")} />
          <NavItem icon={Building2} label="Property" onClick={() => nav(pmConnected ? "/pm" : "/tenant/accept")} />
          <NavItem icon={Settings} label="Settings" onClick={() => nav("/settings")} />
          {isGodMode ? <NavItem icon={ShieldCheck} label="God Mode" onClick={() => nav("/god-mode")} /> : null}
          <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/[.07] p-4">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-200">SYNC Assistant</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">One place to ask what needs attention across your connected life.</p>
            <button type="button" onClick={() => nav("/sync")} className="mt-3 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 py-2 text-xs font-black text-white">Ask SYNC</button>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_82%_16%,rgba(139,92,246,.22),transparent_34%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.32)] sm:p-7">
            <div className="relative flex items-start gap-4 sm:items-center">
              <SyncLauncherButton onClick={() => setAudioOpen(true)} label="Play complete SYNC briefing" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal command center</span><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200">SYNC ready</span></div>
                <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">Good afternoon, {firstName(user)}.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Here is what is happening across the parts of your life connected to SyncWorks.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => nav("/sync")} className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 text-sm font-black text-white">Ask SYNC anything</button>
                  <button type="button" onClick={() => setAudioOpen(true)} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-200">Play briefing</button>
                  <button type="button" onClick={() => nav("/settings")} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-200">Connections</button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <MetricCard icon={Dumbbell} label="Health" value="Open" detail="Workout & recovery" tone="emerald" onClick={() => nav("/customer/health")} />
            <MetricCard icon={WalletCards} label="Money" value={amountDue > 0 ? money(amountDue) : "$0.00"} detail={dueInvoices.length ? "Currently due" : "No visible fees due"} tone="amber" onClick={() => nav("/customer/finance")} />
            <MetricCard icon={CalendarDays} label="Calendar" value="Today" detail="View your schedule" tone="violet" onClick={() => nav("/calendar")} />
            <MetricCard icon={ClipboardList} label="Requests" value={openTickets.length} detail="Open requests" tone="cyan" onClick={() => nav("/customer/tickets")} />
            <MetricCard icon={Gauge} label="Attention" value={attentionCount} detail="Items SYNC sees" tone={attentionCount ? "rose" : "emerald"} onClick={() => nav("/sync")} />
          </div>

          <Section eyebrow="Quick actions" title="Everything important, one tap" action="Manage" onAction={() => nav("/settings")}> 
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {quickActions.map(([Icon, label, detail, route, badge, tone]) => <QuickAction key={label} icon={Icon} label={label} detail={detail} badge={badge} tone={tone} onClick={() => nav(route)} />)}
            </div>
          </Section>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
            <Section eyebrow="Today" title="Needs your attention" action="Open SYNC" onAction={() => nav("/sync")}> 
              <div className="space-y-3">
                {dueInvoices.slice(0, 3).map((invoice) => (
                  <button key={`invoice-${invoice.id}`} type="button" onClick={() => nav("/customer/finance")} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-left">
                    <div><div className="font-black text-white">Payment needs attention</div><div className="mt-1 text-xs text-slate-400">{invoice.memo || invoice.description || "Open invoice"}</div></div>
                    <div className="font-black text-amber-100">{money(invoice.amount || invoice.total || Number(invoice.amount_cents || 0) / 100)}</div>
                  </button>
                ))}
                {openTickets.slice(0, 4).map((ticket) => (
                  <button key={`ticket-${ticket.id}`} type="button" onClick={() => nav(`/tickets/${ticket.id}`)} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-4 text-left">
                    <div><div className="font-black text-white">{ticket.title || ticket.category_label || `Request #${ticket.id}`}</div><div className="mt-1 text-xs text-slate-400">{String(ticket.status || "Open").replaceAll("_", " ")}</div></div>
                    <span className="text-xs font-black text-cyan-100">Review</span>
                  </button>
                ))}
                {!attentionCount ? <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" /><div><div className="font-black text-white">Nothing urgent right now</div><div className="mt-1 text-xs leading-5 text-slate-400">SYNC will still use your connected modules to build a daily briefing.</div></div></div> : null}
              </div>
            </Section>

            <Section eyebrow="SYNC assistant" title="Your connected life"> 
              <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[.08] to-violet-500/[.08] p-4">
                <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-cyan-200" /><div><div className="font-black text-white">Ask across everything</div><p className="mt-1 text-sm leading-6 text-slate-400">Money, Health, Calendar, Social, Requests, Property and other connected workspaces can all feed one recommendation layer.</p></div></div>
                <button type="button" onClick={() => nav("/sync")} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-sm font-black text-white">Talk this through with SYNC</button>
              </div>
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-[1.75rem] border border-violet-400/20 bg-violet-500/[.05] p-5">
              <Network className="h-6 w-6 text-violet-200" /><div className="mt-3 text-[10px] font-black uppercase tracking-[.18em] text-violet-200">SyncWorks Social</div><h3 className="mt-1 text-lg font-black text-white">People, groups and events</h3><p className="mt-2 text-sm leading-6 text-slate-400">Connect friends, teams, clubs and event groups, coordinate shared costs and keep accepted events connected to your calendar.</p><button type="button" onClick={() => nav("/connect")} className="mt-4 rounded-2xl border border-violet-300/25 bg-violet-500/10 px-4 py-2 text-sm font-black text-violet-100">Open Social</button>
            </section>

            <section className="rounded-[1.75rem] border border-cyan-400/20 bg-cyan-500/[.05] p-5">
              <KeyRound className="h-6 w-6 text-cyan-200" /><div className="mt-3 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Tenant access</div><h3 className="mt-1 text-lg font-black text-white">Are you a tenant?</h3><p className="mt-2 text-sm leading-6 text-slate-400">{tenantConnected ? "Your tenant profile is available. Open the tenant portal or enter another invite when needed." : "Use the secure invite code from your property manager to connect this account to your property, unit and lease."}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => nav(tenantConnected ? "/tenant" : "/tenant/accept")} className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-2 text-sm font-black text-cyan-100">{tenantConnected ? "Open tenant portal" : "Connect to PM group"}</button>{tenantConnected ? <button type="button" onClick={() => nav("/tenant/accept")} className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-black text-slate-200">Enter invite</button> : null}</div>
            </section>

            <section className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-500/[.05] p-5">
              <Settings className="h-6 w-6 text-emerald-200" /><div className="mt-3 text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">Settings & connections</div><h3 className="mt-1 text-lg font-black text-white">See what is connected</h3><p className="mt-2 text-sm leading-6 text-slate-400">Review active workspaces, available paid modules, invite-based access, mobile navigation and the full SyncWorks fee schedule.</p><button type="button" onClick={() => nav("/settings")} className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-100">Open settings</button>
            </section>
          </div>

          <Section eyebrow="Connected life" title="Workspaces and access" action="See all connections" onAction={() => nav("/settings?tab=CONNECTIONS")}> 
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => nav("/sbo")} className={`rounded-2xl border p-4 text-left ${businessConnected ? "border-emerald-400/20 bg-emerald-500/[.06]" : "border-white/10 bg-white/[.025]"}`}><BriefcaseBusiness className="h-5 w-5 text-cyan-200" /><div className="mt-2 font-black text-white">Business</div><div className="mt-1 text-xs text-slate-400">{businessConnected ? "Connected" : "Available to create"}</div></button>
              <button type="button" onClick={() => nav(pmConnected ? "/pm" : "/upgrade")} className={`rounded-2xl border p-4 text-left ${pmConnected ? "border-emerald-400/20 bg-emerald-500/[.06]" : "border-white/10 bg-white/[.025]"}`}><Building2 className="h-5 w-5 text-violet-200" /><div className="mt-2 font-black text-white">Property Management</div><div className="mt-1 text-xs text-slate-400">{pmConnected ? "Connected" : "Optional workspace"}</div></button>
              <button type="button" onClick={() => nav(tenantConnected ? "/tenant" : "/tenant/accept")} className={`rounded-2xl border p-4 text-left ${tenantConnected ? "border-emerald-400/20 bg-emerald-500/[.06]" : "border-white/10 bg-white/[.025]"}`}><UserRound className="h-5 w-5 text-cyan-200" /><div className="mt-2 font-black text-white">Tenant</div><div className="mt-1 text-xs text-slate-400">{tenantConnected ? "Connected" : "Connect by invite"}</div></button>
              <button type="button" onClick={() => nav("/employee")} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left"><HeartHandshake className="h-5 w-5 text-emerald-200" /><div className="mt-2 font-black text-white">Employee / team</div><div className="mt-1 text-xs text-slate-400">Invite-based access</div></button>
            </div>
          </Section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" onClick={() => nav("/customer/new-request")} className="rounded-3xl border border-white/10 bg-white/[.025] p-4 text-left"><ClipboardList className="h-5 w-5 text-cyan-200" /><div className="mt-2 font-black text-white">New service request</div><div className="mt-1 text-xs text-slate-400">Start a request from Personal.</div></button>
            <button type="button" onClick={() => nav("/customer/affiliate")} className="rounded-3xl border border-white/10 bg-white/[.025] p-4 text-left"><BadgeDollarSign className="h-5 w-5 text-amber-200" /><div className="mt-2 font-black text-white">Affiliate</div><div className="mt-1 text-xs text-slate-400">Track eligible referrals and commissions.</div></button>
            <button type="button" onClick={() => nav("/profile")} className="rounded-3xl border border-white/10 bg-white/[.025] p-4 text-left"><UserRound className="h-5 w-5 text-violet-200" /><div className="mt-2 font-black text-white">Profile</div><div className="mt-1 text-xs text-slate-400">Identity and account details.</div></button>
            <button type="button" onClick={() => nav("/settings?tab=FEES")} className="rounded-3xl border border-white/10 bg-white/[.025] p-4 text-left"><CircleDollarSign className="h-5 w-5 text-emerald-200" /><div className="mt-2 font-black text-white">Fee schedule</div><div className="mt-1 text-xs text-slate-400">See current SyncWorks charges.</div></button>
          </div>
        </div>
      </div>

      <CustomerAudioSummaryDrawer open={audioOpen} onClose={() => setAudioOpen(false)} />
    </DashboardShell>
  );
}

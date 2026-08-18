import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckSquare2,
  CircleDollarSign,
  Dumbbell,
  KeyRound,
  MessageSquare,
  Network,
  Search,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Users,
  Wrench,
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
  const amount = Number(value || 0);
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ActionCard({ icon: Icon, label, detail, onClick, badge, accent = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/[.07] text-cyan-100",
    violet: "border-violet-400/20 bg-violet-500/[.07] text-violet-100",
    amber: "border-amber-400/20 bg-amber-500/[.07] text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-500/[.07] text-emerald-100",
    rose: "border-rose-400/20 bg-rose-500/[.07] text-rose-100",
  };
  return (
    <button type="button" onClick={onClick} className={`relative min-h-24 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[.06] active:scale-[.98] ${tones[accent] || tones.cyan}`}>
      {badge ? <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em]">{badge}</span> : null}
      <Icon className="h-6 w-6" aria-hidden="true" />
      <div className="mt-3 text-sm font-black text-white">{label}</div>
      <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{detail}</div>
    </button>
  );
}

function PromoCard({ icon: Icon, eyebrow, title, body, action, onClick, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/20 from-cyan-500/[.09] to-blue-500/[.03]",
    violet: "border-violet-400/20 from-violet-500/[.09] to-fuchsia-500/[.03]",
    amber: "border-amber-400/20 from-amber-500/[.09] to-orange-500/[.03]",
  };
  return (
    <section className={`rounded-[1.75rem] border bg-gradient-to-br p-5 ${tones[tone] || tones.cyan}`}>
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-black/25"><Icon className="h-6 w-6 text-cyan-100" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">{eyebrow}</div>
          <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
          <button type="button" onClick={onClick} className="mt-4 min-h-11 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">{action}</button>
        </div>
      </div>
    </section>
  );
}

export default function CustomerDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
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
  const amountDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.amount || item?.total || (Number(item?.amount_cents || 0) / 100) || 0), 0), [dueInvoices]);
  const attentionCount = openTickets.length + dueInvoices.length;

  const actions = [
    [CalendarDays, "Calendar", "Events, schedules and calendar connections.", "/calendar", null, "cyan"],
    [Network, "SyncWorks Social", "Friends, groups, events, shared fees and invitations.", "/connect", "new", "violet"],
    [Users, "Family", "Household calendar, tasks, shopping, meals, goals and permission-based sharing.", "/customer/family", "new", "emerald"],
    [Wrench, "Request Service", "Schedule help through a connection or Marketplace.", "/customer/new-request", null, "cyan"],
    [Dumbbell, "Health", "Workout, nutrition, readiness and recovery.", "/customer/health", null, "emerald"],
    [CircleDollarSign, "Money", "Payments, budgets, invoices and financial plans.", "/customer/finance", dueInvoices.length ? `${dueInvoices.length} due` : null, "amber"],
    [Search, "EDGE", "Live sports prediction-market value, signals and paper trading.", "/customer/edge", "beta", "emerald"],
    [MessageSquare, "Messages", "Conversations and items that need a response.", "/customer/inbox", null, "violet"],
    [CheckSquare2, "To-Do", "Personal, family, event and work tasks.", "/customer/todo", null, "cyan"],
    [ShoppingBag, "Shop", "Local businesses, food, products and services.", "/customer/deals", null, "amber"],
    [Building2, "Property", "Properties, tenants and maintenance operations.", "/pm", null, "violet"],
    [BriefcaseBusiness, "Business", "Customers, leads, jobs, schedule and finances.", "/business", null, "cyan"],
    [Users, "Workday", "Employee assignments, schedule and daily tasks.", "/employee", null, "violet"],
  ];

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_82%_20%,rgba(139,92,246,.2),transparent_32%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.32)] sm:p-7">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex items-center gap-5">
            <SyncLauncherButton onClick={() => setAudioOpen(true)} label="Play complete SYNC briefing" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal assistant</div>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">Good day, {firstName(user)}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Press the glowing S for your complete audio briefing. SYNC will review your attention items category by category, then let you repeat or continue by voice.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setAudioOpen(true)} className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 text-sm font-black text-white">Play full briefing</button>
                <button type="button" onClick={() => nav("/sync")} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-200">Open chat</button>
                <span className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-xs font-black text-slate-300">{attentionCount ? `${attentionCount} items need attention` : "No urgent items detected"}</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Launch</div><h2 className="mt-1 text-xl font-black text-white">What do you want to do?</h2></div></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {actions.map(([Icon, label, detail, href, badge, accent]) => <ActionCard key={label} icon={Icon} label={label} detail={detail} badge={badge} accent={accent} onClick={() => nav(href)} />)}
            {isGodMode ? <ActionCard icon={ShieldCheck} label="God Mode" detail="Private platform administration and recovery controls." accent="rose" onClick={() => nav("/god-mode")} /> : null}
          </div>
        </section>

        <PromoCard
          icon={Network}
          eyebrow="New • SyncWorks Social"
          title="Your people, groups, events and shared costs — connected."
          body="Add friends, build teams or clubs, organize tournaments, book clubs, church or school events, neighborhood activities and trips, collect each person's share, and keep accepted events synced to the calendar when organizers change the details."
          action="Explore SyncWorks Social"
          onClick={() => nav("/connect")}
          tone="violet"
        />

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Immediate actions</div><h2 className="mt-1 text-xl font-black text-white">Needs your attention</h2></div><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-black text-slate-300">{attentionCount}</span></div>
          <div className="mt-4 space-y-3">
            {dueInvoices.slice(0, 3).map((invoice) => <button key={`invoice-${invoice.id}`} type="button" onClick={() => nav("/customer/finance")} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-left"><div><div className="font-black text-white">Payment needs attention</div><div className="mt-1 text-xs text-slate-400">{invoice.memo || invoice.description || "Open invoice"}</div></div><div className="font-black text-amber-100">{money(invoice.amount || invoice.total || Number(invoice.amount_cents || 0) / 100)}</div></button>)}
            {openTickets.slice(0, 3).map((ticket) => <button key={`ticket-${ticket.id}`} type="button" onClick={() => nav(`/tickets/${ticket.id}`)} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-4 text-left"><div><div className="font-black text-white">{ticket.title || ticket.category_label || `Request #${ticket.id}`}</div><div className="mt-1 text-xs text-slate-400">{String(ticket.status || "Open").replaceAll("_", " ")}</div></div><span className="text-xs font-black text-cyan-100">Review</span></button>)}
            {!attentionCount ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">Nothing urgent is currently available. SYNC will still review your calendar, work, To-Do and Health briefing.</div> : null}
          </div>
          {amountDue > 0 ? <div className="mt-3 text-right text-xs font-black text-amber-100">Total currently visible: {money(amountDue)}</div> : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <PromoCard icon={BriefcaseBusiness} eyebrow="Business" title="Open a SyncWorks business" body="Use the same login to manage customers, leads, requests, schedules, invoices, team members and automation." action="Open or create business" onClick={() => nav("/business")} tone="cyan" />
          <PromoCard icon={KeyRound} eyebrow="Access" title="Have an access code?" body="Apply an employee, tenant, investor, organization or other approved access code to unlock the correct workspace." action="Apply access code" onClick={() => nav("/connect")} tone="violet" />
          <PromoCard icon={Search} eyebrow="Affiliate" title="Earn with SyncWorks" body="Refer businesses to SyncWorks and track eligible lifetime commissions without cluttering your main actions." action="Open affiliate" onClick={() => nav("/customer/affiliate")} tone="amber" />
        </div>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5">
          <div className="flex items-start gap-3"><Stethoscope className="mt-1 h-5 w-5 text-emerald-300" /><div><div className="font-black text-white">Connected routine</div><p className="mt-1 text-sm leading-6 text-slate-400">Calendar, SyncWorks Social, Family, work, payments, To-Do and Health remain separate sources, while SYNC combines their attention items into one Personal briefing. Household Finance remains private until each member explicitly enables a sharing category.</p></div></div>
        </section>
      </main>

      <CustomerAudioSummaryDrawer open={audioOpen} onClose={() => setAudioOpen(false)} displayName={firstName(user)} />
    </DashboardShell>
  );
}
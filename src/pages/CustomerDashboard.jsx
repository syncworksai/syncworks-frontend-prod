import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DashboardShell from "../components/dashboard/DashboardShell";

const GOD_MODE_EMAIL = "jacoblord7@outlook.com";

function Icon({ name }) {
  const common = { viewBox: "0 0 24 24", fill: "none", className: "h-6 w-6", "aria-hidden": true };
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    connections: <><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6M14.5 15.2c3.2.2 5 1.8 5.5 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    request: <><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/></>,
    health: <><path d="M12 21s-7-4.4-7-10.2A4.8 4.8 0 0 1 13.4 7a4.8 4.8 0 0 1 8.1 3.8C21.5 16.6 12 21 12 21Z" stroke="currentColor" strokeWidth="1.7"/><path d="M8 12h2l1.2-3 1.8 6 1.2-3H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
    money: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M15 8.8c-.7-.6-1.6-.9-2.8-.9-1.6 0-2.7.7-2.7 1.8 0 1.1.9 1.6 2.9 2 2 .4 2.9 1 2.9 2.2 0 1.3-1.2 2.2-3 2.2-1.3 0-2.5-.4-3.3-1.2M12 6.5v11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    messages: <><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7"/><path d="M7 9h10M7 13h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    todo: <><rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="m8 9 1.5 1.5L12 8M8 15l1.5 1.5L12 14M14 9h3M14 15h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
    shop: <><path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.7"/><path d="M9 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    property: <><path d="m3 11 9-8 9 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 10v10h14V10M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7"/></>,
    business: <><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" stroke="currentColor" strokeWidth="1.7"/></>,
    employee: <><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M4 21c.7-5 3.4-7 8-7s7.3 2 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    admin: <><path d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z" stroke="currentColor" strokeWidth="1.7"/><path d="M9 12.5 11 14l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>,
    affiliate: <><path d="M8 12a4 4 0 1 1 4 4H8a4 4 0 1 1 0-8h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M16 12a4 4 0 1 1-4-4h4a4 4 0 1 1 0 8h-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
    settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5h-4L10.7 6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></>,
    microphone: <><rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.7"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>,
  };
  return <svg {...common}>{paths[name] || paths.request}</svg>;
}

function ActionCard({ icon, label, subtitle, onClick, badge, accent = "cyan" }) {
  const tones = {
    cyan: "border-cyan-500/25 bg-cyan-500/[0.07] text-cyan-100",
    lime: "border-lime-400/25 bg-lime-400/[0.07] text-lime-100",
    purple: "border-violet-500/25 bg-violet-500/[0.07] text-violet-100",
    amber: "border-amber-400/25 bg-amber-400/[0.07] text-amber-100",
    rose: "border-rose-500/25 bg-rose-500/[0.07] text-rose-100",
  };
  return (
    <button type="button" onClick={onClick} className={`relative min-h-[104px] rounded-3xl border p-4 text-left transition active:scale-[0.98] ${tones[accent] || tones.cyan}`}>
      {badge ? <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-black uppercase tracking-wide">{badge}</span> : null}
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25"><Icon name={icon} /></div>
      <div className="mt-3 text-sm font-black text-white">{label}</div>
      <div className="mt-1 text-[11px] leading-4 text-slate-400">{subtitle}</div>
    </button>
  );
}

function Section({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#07101f]/88 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-black text-white">{title}</h2>{subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}</div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function CustomerDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attention, setAttention] = useState([]);

  const email = String(user?.email || user?.username || "").toLowerCase();
  const displayName = user?.first_name || user?.firstName || email?.split("@")[0] || "there";
  const isGodMode = email === GOD_MODE_EMAIL;

  useEffect(() => {
    let active = true;
    async function loadAttention() {
      const items = [];
      const requests = await Promise.allSettled([
        api.get("/tickets/"),
        api.get("/cash-fee-invoices/"),
      ]);
      const ticketData = requests[0].status === "fulfilled" ? requests[0].value?.data : null;
      const invoiceData = requests[1].status === "fulfilled" ? requests[1].value?.data : null;
      const tickets = Array.isArray(ticketData) ? ticketData : ticketData?.results || [];
      const invoices = Array.isArray(invoiceData) ? invoiceData : invoiceData?.results || [];
      const openTickets = tickets.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED", "PAID"].includes(String(item?.status || "").toUpperCase()));
      const unpaid = invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.status || "").toUpperCase()));
      if (openTickets.length) items.push({ title: `${openTickets.length} open service ${openTickets.length === 1 ? "request" : "requests"}`, detail: "Review status, messages, and next steps.", path: "/customer/tickets", tone: "cyan" });
      if (unpaid.length) items.push({ title: `${unpaid.length} unpaid ${unpaid.length === 1 ? "invoice" : "invoices"}`, detail: "Open Money to review and pay securely.", path: "/customer/finance", tone: "amber" });
      if (active) { setAttention(items); setLoading(false); }
    }
    loadAttention();
    return () => { active = false; };
  }, []);

  const briefing = useMemo(() => {
    if (loading) return `Hello ${displayName}. I am checking your schedule and attention items now.`;
    if (!attention.length) return `Hello ${displayName}. You have no urgent service or payment items showing right now. You can ask me about your calendar, health, business, messages, or to-do list.`;
    const detail = attention.map((item) => item.title).join(" and ");
    return `Hello ${displayName}. You currently have ${detail}. Tell me to repeat business, health, workout, nutrition, calendar, messages, or your to-do list.`;
  }, [attention, displayName, loading]);

  function playBriefing() {
    if (!("speechSynthesis" in window)) { nav("/sync"); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(briefing);
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  const coreActions = [
    ["calendar", "Calendar", "Your day, events, travel, and shared schedules.", "/calendar", "cyan"],
    ["connections", "Connections", "People, businesses, organizations, groups, and events.", "/connect", "purple"],
    ["request", "Request Service", "Book direct or send a request to Marketplace.", "/customer/new-request", "cyan"],
    ["health", "Health", "Workout, nutrition, recovery, and daily readiness.", "/customer/health", "lime"],
    ["money", "Money", "Invoices, payments, budgets, and financial actions.", "/customer/finance", "amber"],
    ["messages", "Messages", "Action requests, updates, and conversations.", "/customer/inbox", "purple"],
    ["todo", "To-Do", "Personal, family, work, and accepted shared tasks.", "/customer?tab=todo", "cyan"],
    ["shop", "Shop", "Local businesses, food, products, and services.", "/customer/new-request", "rose"],
  ];

  return (
    <DashboardShell mode="customer" title="Personal Home" subtitle="Your connected daily command center">
      <div className="mx-auto max-w-7xl space-y-4 px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pt-6">
        <section className="overflow-hidden rounded-[30px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_45%),#06101f] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.36)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">SYNC Personal Assistant</div>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Good day, {displayName}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{briefing}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={playBriefing} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-black text-cyan-100"><Icon name="microphone" />{speaking ? "Playing briefing" : "Play briefing"}</button>
                <button type="button" onClick={() => nav("/sync")} className="min-h-11 rounded-2xl border border-violet-400/25 bg-violet-400/10 px-4 text-sm font-black text-violet-100">Open chat</button>
                <button type="button" onClick={() => nav("/customer/settings")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200"><Icon name="settings" />Preferences</button>
              </div>
            </div>
            <button type="button" onClick={playBriefing} className={`mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-[34px] border bg-black/35 shadow-[0_0_50px_rgba(34,211,238,0.24)] transition active:scale-95 lg:mx-0 ${speaking ? "border-lime-300/60 shadow-[0_0_65px_rgba(112,255,61,0.38)]" : "border-cyan-400/35"}`} aria-label="Open and play SYNC briefing">
              <img src="/brands/syncworks new logo.jpg" alt="SYNC" className="h-20 w-20 rounded-3xl object-cover" />
            </button>
          </div>
        </section>

        <Section title="What do you want to do today?" subtitle="Open the part of SyncWorks you need. Your permissions and subscriptions control what is available.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {coreActions.map(([icon, label, subtitle, path, accent]) => <ActionCard key={label} icon={icon} label={label} subtitle={subtitle} accent={accent} onClick={() => nav(path)} />)}
            <ActionCard icon="property" label="Property Management" subtitle="Portfolio, tenants, maintenance, and schedules." accent="purple" onClick={() => nav("/pm")} />
            <ActionCard icon="business" label="Business" subtitle="Leads, requests, customers, schedule, finance, and team." accent="cyan" onClick={() => nav("/sbo")} />
            <ActionCard icon="employee" label="Workday" subtitle="Assignments, daily tasks, messages, and schedule." accent="amber" onClick={() => nav("/employee")} />
            {isGodMode ? <ActionCard icon="admin" label="God Mode" subtitle="Private platform administration and recovery controls." accent="rose" onClick={() => nav("/platform")} /> : null}
          </div>
        </Section>

        <Section title="Needs your attention" subtitle="Only unresolved items stay here. Completed actions move out of the way.">
          {loading ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">Checking requests and payments...</div> : attention.length ? (
            <div className="space-y-3">{attention.map((item) => <button key={item.title} type="button" onClick={() => nav(item.path)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left"><div><div className="font-black text-white">{item.title}</div><div className="mt-1 text-xs text-slate-400">{item.detail}</div></div><span className="text-cyan-200">Open</span></button>)}</div>
          ) : <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4 text-sm text-emerald-100">No urgent service or payment actions are showing. SYNC can still review your calendar, health, messages, and to-do list.</div>}
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Today" subtitle="Your calendar remains private. Shared group calendars contribute only the events you choose to show.">
            <div className="space-y-3">
              <button type="button" onClick={() => nav("/calendar")} className="flex w-full items-center justify-between rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4 text-left"><div><div className="font-black text-white">Open today&apos;s timeline</div><div className="mt-1 text-xs text-slate-400">Events, tentative holds, reminders, and travel planning.</div></div><Icon name="calendar" /></button>
              <button type="button" onClick={() => nav("/calendar")} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"><div><div className="font-black text-white">Connect calendars</div><div className="mt-1 text-xs text-slate-400">Google, Outlook, and Apple options live together instead of on every event.</div></div><span className="text-xs font-black text-cyan-200">Manage</span></button>
            </div>
          </Section>

          <Section title="Your connected modules" subtitle="Open a module for the full details. Home shows only the information that changes your next action.">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => nav("/customer/health")} className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.05] p-4 text-left"><Icon name="health" /><div className="mt-3 font-black text-white">Health today</div><div className="mt-1 text-xs leading-5 text-slate-400">Workout, nutrition, recovery, and readiness.</div></button>
              <button type="button" onClick={() => nav("/sbo")} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4 text-left"><Icon name="business" /><div className="mt-3 font-black text-white">Business attention</div><div className="mt-1 text-xs leading-5 text-slate-400">Leads, invoices, jobs, team, and social approvals.</div></button>
              <button type="button" onClick={() => nav("/employee")} className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-left"><Icon name="employee" /><div className="mt-3 font-black text-white">Workday</div><div className="mt-1 text-xs leading-5 text-slate-400">Assignments and accepted To-Do requests.</div></button>
              <button type="button" onClick={() => nav("/connect")} className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.05] p-4 text-left"><Icon name="connections" /><div className="mt-3 font-black text-white">Connections</div><div className="mt-1 text-xs leading-5 text-slate-400">Friends, family, businesses, groups, and events.</div></button>
            </div>
          </Section>
        </div>

        <section className="rounded-[28px] border border-violet-400/20 bg-gradient-to-r from-violet-500/[0.08] to-cyan-500/[0.06] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-black/20 text-violet-100"><Icon name="affiliate" /></div><div><div className="font-black text-white">Earn with SyncWorks</div><div className="mt-1 text-xs leading-5 text-slate-400">Become an affiliate, refer businesses, and track eligible lifetime commissions.</div></div></div>
            <button type="button" onClick={() => nav("/customer/affiliate")} className="min-h-11 rounded-2xl border border-violet-400/25 bg-violet-400/10 px-4 text-sm font-black text-violet-100">Open affiliate</button>
          </div>
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-slate-500">This command center uses existing routes and production data where available. Connections memberships, shared To-Do requests, email invitations, full calendar synchronization, verbal payments, live business KPI aggregation, and background SYNC automation require their own backend integrations.</div>
      </div>
    </DashboardShell>
  );
}

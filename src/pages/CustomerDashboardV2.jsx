import React, { useState } from "react";
import { BriefcaseBusiness, Building2, CalendarDays, CheckSquare2, CircleDollarSign, Dumbbell, MessageSquare, Search, ShoppingBag, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardShell from "../components/dashboard/DashboardShell";
import CustomerAudioSummaryDrawer from "../components/sync/CustomerAudioSummaryDrawer";
import SyncAssistantMorningBrief from "../components/sync/SyncAssistantMorningBrief";
import SyncUnifiedInboxCard from "../components/sync/SyncUnifiedInboxCard";
import { useAuth } from "../auth/AuthContext";

function firstName(user) {
  const name = String(user?.first_name || user?.name || "").trim();
  if (name) return name.split(/\s+/)[0];
  const email = String(user?.email || "").trim();
  return email ? email.split("@")[0] : "there";
}

const ACTIONS = [
  [Wrench, "Request service", "Marketplace help when something needs fixing or doing.", "/customer/new-request"],
  [CalendarDays, "Calendar", "Your combined SyncWorks and connected calendars.", "/customer/calendar"],
  [Dumbbell, "Health", "Workout, nutrition, readiness and recovery.", "/customer/health"],
  [CircleDollarSign, "Money", "Balances, bills, budgets and financial plans.", "/customer/finance"],
  [CheckSquare2, "To-Do", "Personal and shared tasks.", "/customer/todo"],
  [MessageSquare, "Inbox", "SyncWorks conversations and items needing a response.", "/customer/inbox"],
  [Building2, "Property", "Rental properties, tenants and maintenance.", "/pm"],
  [BriefcaseBusiness, "Business", "Customers, leads, jobs, team and finances.", "/business"],
  [ShoppingBag, "Local", "Browse local businesses, products and services.", "/customer/deals"],
  [Search, "EDGE", "Sports prediction-market research and paper trading.", "/customer/edge"],
];

export default function CustomerDashboardV2() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [audioOpen, setAudioOpen] = useState(false);
  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <SyncAssistantMorningBrief onPlayBriefing={() => setAudioOpen(true)} />
        <SyncUnifiedInboxCard />

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Go somewhere</div><h2 className="mt-1 text-xl font-black text-white">Your SyncWorks tools</h2><p className="mt-1 text-xs text-slate-500">SYNC Assistant brings important items to you. Open a module when you want the detail.</p></div><button type="button" onClick={() => nav("/customer/settings")} className="rounded-2xl border border-cyan-300/20 bg-cyan-500/[.07] px-4 py-2 text-xs font-black text-cyan-100">Connections & settings</button></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ACTIONS.map(([Icon, label, detail, url]) => (
              <button key={label} type="button" onClick={() => nav(url)} className="min-h-28 rounded-3xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-cyan-400/20 hover:bg-cyan-500/[.04]">
                <Icon className="h-5 w-5 text-cyan-200" />
                <div className="mt-3 text-sm font-black text-white">{label}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{detail}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-violet-400/15 bg-violet-500/[.035] p-5">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-200">Connected communication</div>
          <div className="mt-1 text-lg font-black text-white">SyncWorks Inbox first · external email when needed</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Outlook can now feed Personal email intelligence into SYNC Assistant when the user opts in. Gmail is the next provider lane. Detailed SyncWorks service conversations remain in the internal Inbox.</p>
        </section>
      </main>
      <CustomerAudioSummaryDrawer open={audioOpen} onClose={() => setAudioOpen(false)} displayName={firstName(user)} />
    </DashboardShell>
  );
}

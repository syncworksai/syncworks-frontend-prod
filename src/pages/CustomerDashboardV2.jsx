import React from "react";
import {
  BriefcaseBusiness, Building2, CalendarDays, CheckSquare2, ChevronRight,
  CircleDollarSign, Dumbbell, Mail, MessageSquare, Plus, Search, ShoppingBag, Trophy,
  Sparkles, Utensils, Weight, Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardShell from "../components/dashboard/DashboardShell";
import SyncAssistantMorningBrief from "../components/sync/SyncAssistantMorningBrief";
import SyncAssistantStickyDock from "../components/sync/SyncAssistantStickyDock";
import SyncUnifiedInboxCard from "../components/sync/SyncUnifiedInboxCard";
import SyncQuickNotificationsCard from "../components/sync/SyncQuickNotificationsCard";
import { useAuth } from "../auth/AuthContext";

function firstName(user) {
  const name = String(user?.first_name || user?.name || "").trim();
  if (name) return name.split(/\s+/)[0];
  const email = String(user?.email || "").trim();
  return email ? email.split("@")[0] : "there";
}

const QUICK = [
  [MessageSquare, "Message", "/customer/inbox"],
  [Mail, "Email", "/customer/inbox"],
  [Utensils, "Meal", "/customer/health"],
  [Dumbbell, "Workout", "/customer/health"],
  [Weight, "Weight", "/customer/health"],
  [CheckSquare2, "Task", "/customer/tasks"],
  [CalendarDays, "Event", "/calendar"],
  [Wrench, "Request", "/customer/new-request"],
];

const PORTAL = [
  [Wrench, "Services", "/customer/marketplace"],
  [CalendarDays, "Calendar", "/calendar"],
  [Dumbbell, "Health", "/customer/health"],
  [CircleDollarSign, "Money", "/customer/finance"],
  [CheckSquare2, "To-Do", "/customer/tasks"],
  [MessageSquare, "Inbox", "/customer/inbox"],
  [Building2, "Property", "/pm"],
  [BriefcaseBusiness, "Business", "/sbo"],
  [ShoppingBag, "Local", "/customer/discover"],
  [Trophy, "Sports", "/connect/sports"],
  [Search, "EDGE", "/customer/edge"],
];

export default function CustomerDashboardV2() {
  const nav = useNavigate();
  const { user, moduleAccess } = useAuth();
  const playBriefing = () => window.dispatchEvent(new Event("sync-assistant:play-briefing"));

  function openQuick(label, url) {
    const healthAction = ["Meal", "Workout", "Weight"].includes(label);
    if (healthAction && moduleAccess?.health === false) {
      nav("/customer/plans?product=health");
      return;
    }
    if (label === "Email") {
      nav("/customer/inbox?quick=email");
      return;
    }
    nav(url);
  }

  return (
    <DashboardShell>
      <main className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-36 pt-4 sm:px-5 lg:px-8">
        <section className="rounded-[1.75rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(139,92,246,.16),transparent_34%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 shadow-[0_22px_70px_rgba(0,0,0,.28)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal command center</div>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Good day, {firstName(user)}.</h1>
              <p className="mt-1 text-sm text-slate-400">What needs you, what changed, and the fastest way to act.</p>
            </div>
            <button type="button" onClick={() => nav("/sync")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-violet-300/25 bg-violet-500/10 px-4 text-xs font-black text-violet-100"><Sparkles className="h-4 w-4" />Ask SYNC</button>
          </div>
        </section>

        <SyncAssistantMorningBrief onPlayBriefing={playBriefing} compact />

        <SyncQuickNotificationsCard />

        <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Quick update</div><h2 className="mt-1 text-lg font-black text-white">Do it without leaving Home</h2></div>
            <button type="button" onClick={() => nav("/customer/settings")} className="text-[10px] font-black text-slate-400 hover:text-white">Manage access</button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {QUICK.map(([Icon, label, url]) => (
              <button key={label} type="button" onClick={() => openQuick(label, url)} className="group rounded-2xl border border-white/10 bg-white/[.025] px-2 py-3 text-center transition hover:-translate-y-px hover:border-cyan-400/25 hover:bg-cyan-500/[.05]">
                <Icon className="mx-auto h-4 w-4 text-cyan-200" />
                <div className="mt-2 text-[10px] font-black text-slate-200">{label}</div>
              </button>
            ))}
          </div>
        </section>

        <SyncUnifiedInboxCard compact />

        <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/50 p-4 sm:p-5">
          <button type="button" onClick={() => nav("/customer/settings")} className="flex w-full items-center justify-between gap-3 text-left">
            <div><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-200">Personal portal</div><h2 className="mt-1 text-lg font-black text-white">All your SyncWorks tools</h2><p className="mt-1 text-xs text-slate-500">Home stays focused. Open the portal when you want the full toolbox.</p></div>
            <ChevronRight className="h-5 w-5 text-violet-200" />
          </button>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-11">
            {PORTAL.map(([Icon, label, url]) => (
              <button key={label} type="button" onClick={() => nav(url)} className="rounded-2xl border border-white/10 bg-white/[.02] p-3 text-center transition hover:border-violet-400/20 hover:bg-violet-500/[.04]">
                <Icon className="mx-auto h-4 w-4 text-slate-300" />
                <div className="mt-2 truncate text-[9px] font-black text-slate-400">{label}</div>
              </button>
            ))}
          </div>
        </section>

        <button type="button" onClick={() => nav("/customer/new-request")} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-500/[.06] py-3 text-xs font-black text-cyan-100"><Plus className="h-4 w-4" />New request</button>
      </main>

      <SyncAssistantStickyDock displayName={firstName(user)} defaultMinimized />
    </DashboardShell>
  );
}

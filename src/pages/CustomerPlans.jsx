import React from "react";
import { ArrowLeft, CalendarDays, CircleDollarSign, Dumbbell, Mail, MapPinned, MessageSquareText, Sparkles, Users, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  [Wrench, "Marketplace & service requests", "Free foundation", "Find local help, create requests, track providers and keep service conversations organized."],
  [Sparkles, "SYNC Assistant", "Paid", "A daily briefing that reviews connected parts of your life and tells you what matters next."],
  [CalendarDays, "Calendar intelligence", "Paid", "Combine calendars, surface conflicts and build leave-by guidance instead of checking schedules manually."],
  [Mail, "Email intelligence", "Paid", "Bring important outside email into the same decision layer as your SyncWorks Inbox."],
  [MapPinned, "Weather & traffic", "Paid", "Use your real location, forecast and traffic to protect appointments, travel and outdoor plans."],
  [Dumbbell, "Health & nutrition", "Paid", "Turn workouts, meals, recovery and goals into guidance that fits around the rest of your day."],
  [CircleDollarSign, "Money", "Paid", "Put bills, budgets and financial priorities beside the calendar and tasks that affect them."],
  [Users, "Family coordination", "Family+", "Coordinate household schedules, routines and shared responsibilities from one assistant."],
  [MessageSquareText, "Business & property depth", "Executive", "Bring deeper Business and Property Management information into the same personal command layer."],
];

const PLANS = [
  { name: "Free", price: "$0", detail: "The original SyncWorks foundation.", accent: "cyan", bullets: ["Marketplace & local services", "Create and track service requests", "SyncWorks Inbox", "Core Personal account"] },
  { name: "Personal", price: "$12.99/mo", detail: "For one person who wants less app-switching and fewer missed details.", accent: "cyan", bullets: ["SYNC Assistant", "Calendar intelligence", "Weather & traffic", "Health & Money context", "Connected email intelligence"] },
  { name: "Family", price: "$22.99/mo", detail: "For a household coordinating more than one person.", accent: "violet", bullets: ["Everything in Personal", "Shared household coordination", "Family routines and schedules", "More shared context for SYNC"] },
  { name: "Executive", price: "$34.99/mo", detail: "For users managing work, properties or more complex finances too.", accent: "emerald", bullets: ["Everything in Family", "Business context", "Property Management depth", "Deeper work and finance coordination"] },
];

export default function CustomerPlans() {
  const nav = useNavigate();
  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,.10),transparent_34%)]" />
      <main className="relative mx-auto max-w-6xl px-3 pb-24 pt-4 sm:px-5">
        <button type="button" onClick={() => nav(-1)} className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-3 text-xs font-black text-slate-200"><ArrowLeft className="h-4 w-4" />Back</button>

        <section className="mt-4 rounded-[1.75rem] border border-cyan-300/15 bg-slate-950/70 p-5 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Plans & features</div>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">Why would I pay for SyncWorks?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">The Marketplace stays the free foundation. Paid plans are for the intelligence layer that saves time by connecting information you would otherwise check across several apps.</p>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => <div key={plan.name} className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">{plan.name}</div><div className="mt-2 text-2xl font-black text-white">{plan.price}</div><p className="mt-2 min-h-12 text-xs leading-5 text-slate-400">{plan.detail}</p><div className="mt-4 space-y-2">{plan.bullets.map((item) => <div key={item} className="flex gap-2 text-xs text-slate-300"><span className="text-emerald-300">✓</span><span>{item}</span></div>)}</div><button type="button" onClick={() => plan.name === "Free" ? nav("/customer/marketplace") : nav("/upgrade?product=assistant")} className="mt-5 min-h-10 w-full rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100">{plan.name === "Free" ? "Use SyncWorks free" : `Choose ${plan.name}`}</button></div>)}
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 sm:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">What the paid layer actually does</div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{FEATURES.map(([Icon,title,tier,body]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300"><Icon className="h-4 w-4" /></span><div><div className="text-sm font-black text-white">{title}</div><div className="text-[9px] font-black uppercase tracking-wider text-violet-300">{tier}</div></div></div><p className="mt-3 text-xs leading-5 text-slate-400">{body}</p></div>)}</div>
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-cyan-300/15 bg-cyan-500/[.04] p-5 text-center"><div className="text-lg font-black text-white">The goal is not more dashboards.</div><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">The value is opening SyncWorks and immediately knowing what needs attention, what changed, and what you should do next.</p><button type="button" onClick={() => nav("/upgrade?product=assistant")} className="mt-4 min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white">See subscription options</button></section>
      </main>
    </div>
  );
}

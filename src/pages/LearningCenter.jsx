import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  HeartPulse,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";

import ModeBar from "../components/ModeBar";

const GUIDES = [
  {
    key: "personal.start",
    category: "Getting Started",
    audience: "Personal",
    title: "Set up your Personal workspace",
    summary: "Prepare your profile, location, notifications, calendar, payments, and SYNC preferences.",
    steps: [
      "Confirm your name, phone number, email, home location, and preferred service area.",
      "Choose notification preferences for in-app messages, email, reminders, and future paid SMS.",
      "Add important calendar events, work hours, family responsibilities, and recurring reminders.",
      "Save trusted providers and review their digital business cards.",
      "Open SYNC and ask for a summary of what needs your attention today.",
    ],
  },
  {
    key: "personal.request",
    category: "Requests",
    audience: "Personal",
    title: "Request and track a service",
    summary: "Create a service request, communicate with the provider, follow the schedule, and pay from one record.",
    steps: [
      "Tap the center Request button from the Personal mobile navigation.",
      "Describe the problem, choose a category, add photos, and provide the service location.",
      "Review provider responses, estimates, messages, and appointment updates.",
      "Use the ticket timeline to follow progress from request through completion.",
      "Review the final invoice and payment status before closing the request.",
    ],
  },
  {
    key: "personal.calendar",
    category: "Calendar",
    audience: "Personal",
    title: "Use the calendar as your daily hub",
    summary: "Combine appointments, service visits, work hours, workouts, bills, and family responsibilities.",
    steps: [
      "Add personal events manually while connected business appointment invitations are being built.",
      "Use Today and Agenda views to see what is happening and where conflicts exist.",
      "Add locations so SYNC can eventually estimate travel time, weather, and departure time.",
      "Treat work hours as scheduling context or choose to block those hours later.",
      "Ask SYNC what you have today and approve any suggested changes before they happen.",
    ],
  },
  {
    key: "business.setup",
    category: "Getting Started",
    audience: "Business",
    title: "Set up your Business workspace",
    summary: "Create the business, configure services, choose how work enters SyncWorks, and prepare the team.",
    steps: [
      "Create the business from the Personal side of SyncWorks.",
      "Confirm business name, phone, service area, customer contact information, and marketplace settings.",
      "Add owners, managers, dispatchers, technicians, accounting users, or other employees.",
      "Choose services, role permissions, scheduling rules, and customer communication preferences.",
      "Create one test ticket and move it through scheduling, work, invoicing, payment, and completion.",
    ],
  },
  {
    key: "business.ticket",
    category: "Operations",
    audience: "Business",
    title: "Run work from the ticket detail page",
    summary: "Use one command center for customer information, schedule, notes, files, status, invoice, and payment.",
    steps: [
      "Open the customer and request summary before assigning the work.",
      "Assign a dispatcher, technician, crew, resource, or schedule.",
      "Keep customer-facing communication in the ticket conversation whenever possible.",
      "Use Call only when the customer provides a number and a live call is necessary.",
      "Complete notes, photos, invoice, payment confirmation, and customer follow-up before closing.",
    ],
  },
  {
    key: "business.performance",
    category: "Reporting",
    audience: "Business",
    title: "Use KPIs to improve business performance",
    summary: "Track response, scheduling, labor, completion, communication, collection, and team performance.",
    steps: [
      "Review average first-response time and unanswered-request count.",
      "Track priority handling, scheduling delay, completion time, reopen rate, and customer follow-up.",
      "Compare estimated labor, active work time, travel, idle time, and clocked time.",
      "Surface overdue work, unassigned tickets, missed appointments, unpaid invoices, and weak conversion.",
      "Give CEOs and dispatchers role-appropriate views without exposing unnecessary financial data.",
    ],
  },
  {
    key: "payments.invoice",
    category: "Payments",
    audience: "Personal + Business",
    title: "Send, pay, and reconcile an invoice",
    summary: "Make sure the invoice, Stripe transaction, webhook, receipt, and local payment status agree.",
    steps: [
      "Business creates and sends an invoice connected to the correct ticket and customer.",
      "Customer opens the invoice and completes payment through the configured Stripe flow.",
      "Stripe confirms the payment and sends the verified webhook to the SyncWorks backend.",
      "SyncWorks marks the invoice paid, stores the transaction reference and paid timestamp, and displays a receipt.",
      "Use reconciliation tools when an older completed Stripe payment is not reflected locally.",
    ],
  },
  {
    key: "communication.sms",
    category: "Communication",
    audience: "Business",
    title: "Plan in-app, email, call, and paid text messaging",
    summary: "Keep communication inside SyncWorks while offering paid SMS when the business needs external delivery.",
    steps: [
      "Use in-app messaging as the default record of customer communication.",
      "Use email for receipts, formal notices, and messages that need delivery outside the app.",
      "Use the Call action only when the customer has supplied a valid number.",
      "For SMS, connect a supported messaging provider or subscribe to a managed SyncWorks messaging plan.",
      "Show usage, phone-number cost, message cost, limits, consent, opt-out status, and billing clearly.",
    ],
  },
  {
    key: "sync.daily",
    category: "SYNC",
    audience: "All",
    title: "Ask SYNC for a daily operating briefing",
    summary: "SYNC should combine schedules, conflicts, payments, tickets, property, health, weather, and travel context.",
    steps: [
      "Ask what needs your attention today.",
      "Review appointments, conflicts, payment obligations, unread messages, tickets, and workout plans.",
      "Let SYNC suggest actions such as drafting a message, moving a workout, or preparing a notice.",
      "Confirm any action that communicates externally, changes a schedule, or spends money.",
      "Use audio controls to hear, stop, mute, or replay the briefing.",
    ],
  },
];

const FAQS = [
  { question: "Where do I create a business?", answer: "Create Business appears only while you are in Personal mode. After the business is created, switch into Business mode to configure and operate it." },
  { question: "Can a doctor, dentist, or service business add an appointment to my calendar?", answer: "The planned workflow is an appointment invitation. A business proposes the date and time, and the customer accepts, declines, or requests another time unless that provider has explicit auto-accept permission." },
  { question: "Why does a completed Stripe payment still show unpaid?", answer: "The Stripe payment and the SyncWorks invoice record may not have reconciled. Common causes include missing or rejected webhooks, incorrect metadata, test/live key mismatch, or historical payments that were never backfilled." },
  { question: "Can businesses send text messages from SyncWorks?", answer: "Yes, through a paid messaging provider. A business could connect its own provider account, or use a managed SyncWorks messaging plan that includes a phone number, usage limits, consent controls, and metered billing." },
  { question: "Can I customize the mobile sticky buttons?", answer: "That is part of the planned navigation settings. The center action remains fixed for New Request, while the other Personal or Business buttons can use role-based defaults and later be reordered by the user." },
  { question: "Who can see employee performance information?", answer: "Business owners and authorized dispatch or management roles should see operational KPIs. Technician-level users should see only the information needed to complete their assigned work." },
  { question: "What should stay inside the app?", answer: "Tickets, status changes, appointment details, notes, files, invoices, receipts, and in-app messages should remain connected to the record. Calls, email, and SMS are additional delivery options rather than replacements for the internal history." },
];

const CAPABILITIES = [
  { icon: UserRound, title: "Personal", description: "Requests, providers, schedule, messages, money, health, tasks, and daily planning." },
  { icon: BriefcaseBusiness, title: "Business", description: "Tickets, dispatch, customers, team, services, leads, finance, reporting, and automation." },
  { icon: CalendarDays, title: "Connected Calendar", description: "Personal events, work schedules, appointments, travel context, conflicts, and reminders." },
  { icon: Sparkles, title: "SYNC", description: "Voice and text briefings, recommendations, approved actions, and cross-module assistance." },
  { icon: CircleDollarSign, title: "Payments", description: "Invoices, Stripe payments, receipts, reconciliation, platform fees, and billing history." },
  { icon: MessageSquareText, title: "Communication", description: "In-app messaging, email, calling, and optional paid text-message delivery." },
  { icon: HeartPulse, title: "Health", description: "Workouts, coaching, timers, sleep, goals, nutrition context, and progress." },
  { icon: ShieldCheck, title: "Roles and permissions", description: "Personal, owner, manager, dispatcher, technician, accounting, PM, tenant, and admin access." },
];

function cx(...parts) { return parts.filter(Boolean).join(" "); }

function StatusBadge({ children, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    fuchsia: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100",
  };
  return <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]", tones[tone] || tones.cyan)}>{children}</span>;
}

export default function LearningCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("article") || "";
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("All");
  const [selectedKey, setSelectedKey] = useState(GUIDES.some((guide) => guide.key === requested) ? requested : GUIDES[0].key);
  const [openFaq, setOpenFaq] = useState(0);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return GUIDES.filter((guide) => {
      const audienceMatch = audience === "All" || guide.audience === "All" || guide.audience.includes(audience);
      const searchMatch = !term || [guide.title, guide.summary, guide.category, guide.audience, ...guide.steps].join(" ").toLowerCase().includes(term);
      return audienceMatch && searchMatch;
    });
  }, [audience, query]);

  const selected = GUIDES.find((guide) => guide.key === selectedKey) || filtered[0] || GUIDES[0];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Help & Learning" subtitle="Capabilities, step-by-step guides, FAQs, and best practices" rightActions={[{ label: "Back", onClick: () => navigate(-1) }]} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 pb-28 md:py-7">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/12 via-indigo-500/8 to-fuchsia-500/10 p-5 md:p-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative max-w-4xl">
            <StatusBadge>SyncWorks Help Center</StatusBadge>
            <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">Learn what SyncWorks can do and how to use it.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">Search a task, follow a walkthrough, understand what is included today, and see which connected capabilities are being prepared for future paid plans.</p>
            <div className="relative mt-6 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-300" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests, calendar, invoices, SMS, roles, SYNC..." className="h-14 w-full rounded-2xl border border-cyan-500/25 bg-slate-950/75 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60" />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-black text-white">What SyncWorks connects</h2><p className="mt-1 text-sm text-slate-400">One operating system for personal life, service requests, and business operations.</p></div>
            <div className="flex flex-wrap gap-2"><StatusBadge tone="emerald">Available / Building</StatusBadge><StatusBadge tone="amber">Paid features later</StatusBadge></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(({ icon, title, description }) => (
              <article key={title} className="rounded-[1.5rem] border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-200">{React.createElement(icon, { className: "h-5 w-5", "aria-hidden": true })}</div>
                <h3 className="mt-4 font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[350px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex flex-wrap gap-2">
              {["All", "Personal", "Business"].map((item) => <button key={item} type="button" onClick={() => setAudience(item)} className={cx("rounded-full border px-3 py-2 text-xs font-black transition", audience === item ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100" : "border-slate-800 bg-slate-950/60 text-slate-400")}>{item}</button>)}
            </div>
            <div className="mt-4 space-y-2">
              {filtered.length ? filtered.map((guide) => (
                <button key={guide.key} type="button" onClick={() => setSelectedKey(guide.key)} className={cx("w-full rounded-2xl border p-3 text-left transition", selected?.key === guide.key ? "border-cyan-400/40 bg-cyan-500/12" : "border-slate-800 bg-slate-950/60 hover:border-slate-700")}>
                  <div className="flex items-center justify-between gap-2"><div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">{guide.category}</div><div className="text-[10px] font-bold text-slate-500">{guide.audience}</div></div>
                  <div className="mt-1 text-sm font-black text-white">{guide.title}</div>
                </button>
              )) : <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">No guide matched that search.</div>}
            </div>
          </aside>

          <article className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge tone="fuchsia">{selected.category}</StatusBadge><StatusBadge>{selected.audience}</StatusBadge></div>
            <h2 className="mt-4 text-2xl font-black text-white">{selected.title}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{selected.summary}</p>
            <ol className="mt-6 space-y-3">{selected.steps.map((step, index) => <li key={`${selected.key}-${index}`} className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-slate-950">{index + 1}</span><span className="pt-1 text-sm leading-6 text-slate-200">{step}</span></li>)}</ol>
            <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200"><Sparkles className="h-4 w-4" aria-hidden="true" />SYNC coaching prompt</div><p className="mt-2 text-sm leading-6 text-emerald-50">Ask: “Show me how to do this.” SYNC should explain the workflow, identify missing setup, and take only the actions you approve.</p></div>
          </article>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-5 md:p-7">
          <div className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-cyan-300" aria-hidden="true" /><div><h2 className="text-xl font-black text-white">Frequently asked questions</h2><p className="mt-1 text-sm text-slate-400">Clear answers for the features users and businesses will ask about most.</p></div></div>
          <div className="mt-5 space-y-3">{FAQS.map((faq, index) => { const open = openFaq === index; return <article key={faq.question} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/65"><button type="button" onClick={() => setOpenFaq(open ? -1 : index)} className="flex w-full items-center justify-between gap-4 p-4 text-left" aria-expanded={open}><span className="font-black text-white">{faq.question}</span><ChevronDown className={cx("h-5 w-5 shrink-0 text-cyan-300 transition", open && "rotate-180")} aria-hidden="true" /></button>{open ? <div className="border-t border-slate-800 px-4 py-4 text-sm leading-6 text-slate-300">{faq.answer}</div> : null}</article>; })}</div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/8 p-5"><Wrench className="h-6 w-6 text-cyan-300" aria-hidden="true" /><h3 className="mt-3 font-black text-white">Need technical help?</h3><p className="mt-2 text-sm leading-6 text-slate-300">Report a broken link, missing route, payment mismatch, or workflow problem.</p><button type="button" onClick={() => navigate("/support")} className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-500/12 px-4 py-2 text-sm font-black text-cyan-100">Open Support</button></article>
          <article className="rounded-[2rem] border border-fuchsia-500/20 bg-fuchsia-500/8 p-5"><MessageSquareText className="h-6 w-6 text-fuchsia-300" aria-hidden="true" /><h3 className="mt-3 font-black text-white">Messaging plans</h3><p className="mt-2 text-sm leading-6 text-slate-300">In-app messaging stays central. Email and future SMS plans extend delivery outside the app.</p><div className="mt-4"><StatusBadge tone="amber">Paid SMS planned</StatusBadge></div></article>
          <article className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/8 p-5"><ShieldCheck className="h-6 w-6 text-emerald-300" aria-hidden="true" /><h3 className="mt-3 font-black text-white">Safe actions</h3><p className="mt-2 text-sm leading-6 text-slate-300">External messages, schedule changes, payments, and account changes should require confirmation.</p><div className="mt-4"><StatusBadge tone="emerald">Approval first</StatusBadge></div></article>
        </section>
      </main>
    </div>
  );
}

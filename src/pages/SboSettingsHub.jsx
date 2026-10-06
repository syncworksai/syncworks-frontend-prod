import React from "react";
import {
  BadgeDollarSign,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Database,
  MapPinned,
  PackageCheck,
  ReceiptText,
  Route,
  Settings2,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";

const CARDS = [
  {
    icon: CircleHelp,
    title: "Business setup",
    detail: "Finish the guided setup first. Your answers configure how SyncWorks handles requests, scheduling, payments, invoicing and Marketplace matching.",
    route: "/sbo/settings/general?setup=1&return=%2Fsbo%2Fsettings",
    tone: "fuchsia",
    badge: "Start here",
  },
  {
    icon: Building2,
    title: "Profile & operations",
    detail: "Business identity, contact information, logo, digital business card and operating details.",
    route: "/sbo/settings/general?section=business&return=%2Fsbo%2Fsettings",
    tone: "cyan",
  },
  {
    icon: MapPinned,
    title: "Marketplace & coverage",
    detail: "Service ZIP, travel radius, availability and the rules SyncWorks uses to match customer requests.",
    route: "/sbo/settings/general?section=marketplace&return=%2Fsbo%2Fsettings",
    tone: "cyan",
  },
  {
    icon: PackageCheck,
    title: "Services & catalog",
    detail: "Define what customers can request and maintain priced services, products and fees used by quotes and invoices.",
    route: "/sbo/catalog",
    tone: "emerald",
  },
  {
    icon: CreditCard,
    title: "Payments & fees",
    detail: "Connect Stripe, review payment readiness and manage how payment and transaction settings apply to the business.",
    route: "/sbo/finance?section=payments",
    tone: "fuchsia",
  },
  {
    icon: ReceiptText,
    title: "Billing automation & receivables",
    detail: "Invoice delivery, payment terms, reminders, aging and overdue-customer guardrails.",
    route: "/sbo/settings/billing-automation",
    tone: "cyan",
  },
  {
    icon: UsersRound,
    title: "Team & workforce",
    detail: "Staff roles, skills, work hours, breaks, buffers and route start locations for assignment and scheduling.",
    route: "/sbo/settings/workforce",
    tone: "emerald",
  },
  {
    icon: Route,
    title: "Dispatch & schedule control",
    detail: "Review routes, travel gaps, late work and schedule risk across active jobs.",
    route: "/sbo/dispatch",
    tone: "violet",
  },
  {
    icon: CalendarClock,
    title: "Appointments & capacity",
    detail: "For appointment businesses: appointment types, office hours, providers, rooms, chairs and bookable capacity.",
    route: "/sbo/settings/practice",
    tone: "violet",
  },
  {
    icon: Database,
    title: "Business data",
    detail: "Import existing customers, tickets and invoices or export a backup of your SyncWorks business data.",
    route: "/sbo/settings/general?section=data&return=%2Fsbo%2Fsettings",
    tone: "slate",
  },
];

export default function SboSettingsHub() {
  const nav = useNavigate();
  const tone = {
    cyan: "border-cyan-400/20 bg-cyan-500/[.06] text-cyan-200",
    violet: "border-violet-400/20 bg-violet-500/[.06] text-violet-200",
    emerald: "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/[.06] text-fuchsia-200",
    slate: "border-white/10 bg-white/[.025] text-slate-200",
  };

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Settings">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_10%,rgba(139,92,246,.2),transparent_32%),rgba(2,6,23,.92)] p-5 sm:p-7">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">
            <Settings2 className="h-4 w-4" /> Business control center
          </div>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Configure the business once. Keep each area easy to manage.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Start with Business Setup and enter the information accurately the first time. SyncWorks uses it to configure your dashboard, Marketplace matching, scheduling, payments, invoices and automations around the way this business actually operates. Everything can be changed later.
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          {CARDS.map(({ icon: Icon, title, detail, route, tone: cardTone, badge }) => (
            <button
              key={title}
              type="button"
              onClick={() => nav(route)}
              className={`group rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[.07] sm:p-5 ${tone[cardTone]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {badge ? <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-fuchsia-100">{badge}</span> : null}
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 transition group-hover:text-white" />
              </div>
              <div className="mt-3 text-base font-black text-white sm:text-lg">{title}</div>
              <div className="mt-1.5 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">{detail}</div>
            </button>
          ))}
        </div>

        <section className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-500/[.04] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
              <BadgeDollarSign className="h-5 w-5" />
            </span>
            <div>
              <div className="font-black text-white">Money belongs in Finance</div>
              <div className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                Revenue, expenses, invoices, receivables, transaction fees and operating performance live in the Finance workspace. Settings only controls the rules.
              </div>
              <button type="button" onClick={() => nav("/sbo/finance")} className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 text-xs font-black text-emerald-100">
                Open Finance
              </button>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

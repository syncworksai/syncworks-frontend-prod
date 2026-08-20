import React from "react";
import { Building2, CalendarClock, ChevronRight, CreditCard, DoorOpen, MessageSquareText, Settings2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";

const CARDS = [
  { icon: Building2, title: "Business profile & operations", detail: "Name, contact information, logo, service areas, offerings, marketplace and digital business card.", route: "/sbo/settings/general", tone: "cyan" },
  { icon: CalendarClock, title: "Professional practice & scheduling", detail: "Dentist, eye care and other appointment businesses: insurance, appointment types, office hours and scheduling matrix.", route: "/sbo/settings/practice", tone: "violet" },
  { icon: DoorOpen, title: "Scheduling automation", detail: "Providers, hygienists, rooms, chairs and equipment. Build real bookable capacity and prevent double-booking.", route: "/sbo/settings/practice/automation", tone: "cyan" },
  { icon: MessageSquareText, title: "Appointments", detail: "Propose appointment times and manage patient scheduling responses inside SyncWorks.", route: "/sbo/appointments", tone: "emerald" },
];

export default function SboSettingsHub() {
  const nav = useNavigate();
  const tone = {
    cyan: "border-cyan-400/20 bg-cyan-500/[.06] text-cyan-200",
    violet: "border-violet-400/20 bg-violet-500/[.06] text-violet-200",
    emerald: "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200",
  };

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Settings">
      <div className="mx-auto max-w-5xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_10%,rgba(139,92,246,.2),transparent_32%),rgba(2,6,23,.92)] p-5 sm:p-7">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-cyan-200"><Settings2 className="h-4 w-4" />Business control center</div>
          <h1 className="mt-2 text-3xl font-black text-white">Set the business up once.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Business information, professional workflows and connections live here so SyncWorks can reuse them across discovery, scheduling, communication and operations.</p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          {CARDS.map(({ icon: Icon, title, detail, route, tone: cardTone }) => (
            <button key={title} type="button" onClick={() => nav(route)} className={`group rounded-[1.75rem] border p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/[.07] ${tone[cardTone]}`}>
              <div className="flex items-start justify-between gap-3"><Icon className="h-6 w-6" /><ChevronRight className="h-5 w-5 text-slate-600 transition group-hover:text-white" /></div>
              <div className="mt-4 text-lg font-black text-white">{title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-400">{detail}</div>
            </button>
          ))}
        </div>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-200" /><h2 className="font-black text-white">Automation model</h2></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><CreditCard className="h-4 w-4 text-cyan-200" /><div className="mt-2 text-sm font-black text-white">Set rules once</div><div className="mt-1 text-xs text-slate-500">Office hours, appointment durations, provider capabilities and scarce rooms/resources become reusable scheduling rules.</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><MessageSquareText className="h-4 w-4 text-violet-200" /><div className="mt-2 text-sm font-black text-white">Automate communication</div><div className="mt-1 text-xs text-slate-500">Appointment notifications use the existing in-app bell and no-reply email delivery system, with the same event ready for push delivery.</div></div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

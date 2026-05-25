import React from "react";
import DashboardCard from "./DashboardCard";

const actions = [
  {
    title: "Request Service",
    desc: "Book local businesses and marketplace providers instantly.",
    tone: "cyan",
  },
  {
    title: "Track Orders",
    desc: "Monitor tickets, invoices, schedules, and updates.",
    tone: "fuchsia",
  },
  {
    title: "Affiliate Revenue",
    desc: "Earn recurring payouts from referred businesses.",
    tone: "emerald",
  },
  {
    title: "Business Cards",
    desc: "Save and organize your preferred providers.",
    tone: "amber",
  },
];

function toneClasses(tone) {
  switch (tone) {
    case "cyan":
      return "border-cyan-500/25 bg-cyan-500/10 text-cyan-100";
    case "fuchsia":
      return "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100";
    case "emerald":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
    case "amber":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    default:
      return "border-slate-700 bg-slate-900/40 text-slate-100";
  }
}

export default function CustomerQuickActionsGrid() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {actions.map((a) => (
        <DashboardCard key={a.title} className="overflow-hidden">
          <div
            className={`inline-flex items-center justify-center h-10 w-10 rounded-2xl border ${toneClasses(a.tone)}`}
          >
            ✦
          </div>

          <div className="mt-4 text-lg font-bold text-slate-100">
            {a.title}
          </div>

          <div className="mt-2 text-sm text-slate-400 leading-relaxed">
            {a.desc}
          </div>

          <button
            type="button"
            className={`mt-5 h-10 w-full rounded-2xl border text-sm font-semibold transition ${toneClasses(a.tone)}`}
          >
            Open
          </button>
        </DashboardCard>
      ))}
    </div>
  );
}
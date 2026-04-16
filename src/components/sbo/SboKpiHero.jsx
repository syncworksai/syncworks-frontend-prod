import React from "react";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function MiniKpi({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-extrabold mt-1 text-slate-100">{value}</div>
      {sub ? <div className="text-[11px] text-slate-500 mt-1">{sub}</div> : null}
    </div>
  );
}

function ProgressBar({ pct = 0 }) {
  const clean = Math.max(0, Math.min(100, Number(pct || 0)));
  return (
    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400"
        style={{ width: `${clean}%` }}
      />
    </div>
  );
}

export default function SboKpiHero({
  loading,
  revenueThisMonth,
  revenueGoal,
  baselineRevenue,
  growthPct,
  goalPct,
  paidInvoices,
  outstandingInvoices,
  completedJobs,
  openTickets,
  newCustomers,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-slate-100">Financial Overview</div>
          <div className="text-xs text-slate-400 mt-1">
            Revenue first, but balanced with the operational metrics that actually run the business.
          </div>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-200">
          {loading ? "Loading…" : "Live business snapshot"}
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MiniKpi label="Revenue This Month" value={money(revenueThisMonth)} />
        <MiniKpi label="Revenue Goal" value={revenueGoal ? money(revenueGoal) : "—"} />
        <MiniKpi
          label="Growth vs Baseline"
          value={`${Number(growthPct || 0).toFixed(1)}%`}
          sub={baselineRevenue ? `Baseline ${money(baselineRevenue)}` : "Add setup baseline"}
        />
        <MiniKpi label="New Customers" value={newCustomers} />
      </div>

      <div className="mt-4 grid md:grid-cols-4 gap-3">
        <MiniKpi label="Paid Invoices" value={paidInvoices} />
        <MiniKpi label="Outstanding Invoices" value={outstandingInvoices} />
        <MiniKpi label="Jobs Completed" value={completedJobs} />
        <MiniKpi label="Open Tickets" value={openTickets} />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-100">Goal Progress</div>
          <div className="text-xs text-slate-400">{Number(goalPct || 0).toFixed(0)}%</div>
        </div>
        <div className="mt-3">
          <ProgressBar pct={goalPct} />
        </div>
      </div>
    </div>
  );
}
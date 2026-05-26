import React from "react";

function StatCard({ label, value, tone = "cyan" }) {
  const toneMap = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100",
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div
        className={`mt-3 inline-flex rounded-2xl border px-4 py-3 text-2xl font-black ${toneMap[tone]}`}
      >
        {value}
      </div>
    </div>
  );
}

export default function AffiliateFinancialSummary({
  metrics = {},
}) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Expected Monthly Payout"
        value={`$${Number(metrics.expected_monthly_payout || 0).toFixed(2)}`}
        tone="emerald"
      />

      <StatCard
        label="Pending Commission"
        value={`$${Number(metrics.pending_commission || 0).toFixed(2)}`}
        tone="amber"
      />

      <StatCard
        label="Lifetime Paid"
        value={`$${Number(metrics.lifetime_paid || 0).toFixed(2)}`}
        tone="cyan"
      />

      <StatCard
        label="Active Businesses"
        value={metrics.active_businesses || 0}
        tone="fuchsia"
      />
    </div>
  );
}
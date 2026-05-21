import React from "react";

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

export default function AffiliateKpiCards({ metrics = {}, godMode = false }) {
  const cards = godMode
    ? [
        ["Total Affiliates", metrics.total_affiliates || 0],
        ["Pending", metrics.pending_affiliates || 0],
        ["Active", metrics.active_affiliates || 0],
        ["Referred Businesses", metrics.referred_businesses || 0],
        ["Monthly SyncWorks Revenue", money(metrics.monthly_syncworks_revenue)],
        ["Monthly Commission Owed", money(metrics.monthly_commissions_owed)],
        ["Lifetime Paid", money(metrics.lifetime_commissions_paid)],
      ]
    : [
        ["Businesses Referred", metrics.referred_businesses || 0],
        ["Active Businesses", metrics.active_referred_businesses || 0],
        ["Monthly SyncWorks Revenue", money(metrics.monthly_syncworks_revenue)],
        ["Pending Commission", money(metrics.pending_commission)],
        ["Paid Commission", money(metrics.paid_commission)],
        ["Lifetime Commission", money(metrics.lifetime_commission)],
      ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(([label, value]) => (
        <div
          key={label}
          className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_40px_rgba(34,211,238,0.05)]"
        >
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-100">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
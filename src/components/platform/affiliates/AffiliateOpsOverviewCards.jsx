import React from "react";

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

export default function AffiliateOpsOverviewCards({ overview = {}, affiliates = [], payoutBatches = [] }) {
  const pendingPayoutTotal = payoutBatches
    .filter((p) => String(p.status || "").toUpperCase() !== "PAID")
    .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  const paidPayoutTotal = payoutBatches
    .filter((p) => String(p.status || "").toUpperCase() === "PAID")
    .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  const pendingAffiliates = affiliates.filter((a) => String(a.status || "").toUpperCase() === "PENDING").length;

  const cards = [
    ["Total Affiliates", overview.total_affiliates ?? affiliates.length],
    ["Pending Approval", overview.pending_affiliates ?? pendingAffiliates],
    ["Active Affiliates", overview.active_affiliates ?? affiliates.filter((a) => String(a.status || "").toUpperCase() === "ACTIVE").length],
    ["Referred Businesses", overview.referred_businesses ?? affiliates.reduce((s, a) => s + Number(a.referred_business_count || 0), 0)],
    ["Pending Payouts", money(overview.monthly_commissions_owed ?? pendingPayoutTotal)],
    ["Paid Payouts", money(overview.lifetime_commissions_paid ?? paidPayoutTotal)],
  ];

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-100">{value}</div>
        </div>
      ))}
    </div>
  );
}
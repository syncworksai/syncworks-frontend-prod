import React from "react";

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

export default function AffiliateDetailDrawer({ open, affiliate, loading, onClose }) {
  if (!open) return null;

  const metrics = affiliate?.ops_metrics || {};
  const businesses = affiliate?.businesses || [];
  const commissions = affiliate?.recent_commissions || [];
  const payouts = affiliate?.payout_batches || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-3xl h-full bg-[#020617] border-l border-slate-800 text-slate-100 overflow-y-auto">
        <div className="sticky top-0 bg-[#020617]/95 backdrop-blur border-b border-slate-800 p-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Affiliate Ops Detail</div>
            <div className="text-2xl font-black mt-1">{affiliate?.name || "Loading..."}</div>
            <div className="text-sm text-slate-400 mt-1">{affiliate?.email}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl border border-slate-800 hover:bg-slate-900"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="p-5 text-slate-400">Loading affiliate details...</div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-xs text-slate-500">Pending</div>
                <div className="text-xl font-black text-cyan-100">{money(metrics.pending_commission)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-xs text-slate-500">Paid</div>
                <div className="text-xl font-black">{money(metrics.paid_commission)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-xs text-slate-500">Lifetime</div>
                <div className="text-xl font-black">{money(metrics.lifetime_commission)}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-xs text-slate-500">Businesses</div>
                <div className="text-xl font-black">{metrics.referred_business_count || businesses.length}</div>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
              <div className="font-bold">Profile</div>
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Code:</span> <span className="font-mono text-cyan-200">{affiliate?.code}</span></div>
                <div><span className="text-slate-500">Status:</span> {affiliate?.status}</div>
                <div><span className="text-slate-500">Payout:</span> {affiliate?.payout_provider || "—"}</div>
                <div><span className="text-slate-500">Payout Email:</span> {affiliate?.payout_email || "—"}</div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
              <div className="font-bold">Businesses Attached</div>
              <div className="mt-3 space-y-2">
                {businesses.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3">
                    <div className="font-semibold">{b.business_name || `Business #${b.business}`}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Code {b.referral_code} • {b.attribution_source} • {b.effective_from}
                    </div>
                  </div>
                ))}
                {!businesses.length ? <div className="text-sm text-slate-500">No businesses attached.</div> : null}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
              <div className="font-bold">Recent Commissions</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="text-left py-2">Business</th>
                      <th className="text-left py-2">Source</th>
                      <th className="text-left py-2">Revenue</th>
                      <th className="text-left py-2">Commission</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className="border-t border-slate-800">
                        <td className="py-3">{c.business_name || `Business #${c.business}`}</td>
                        <td className="py-3">{c.revenue_source}</td>
                        <td className="py-3">{money(c.net_syncworks_revenue_amount)}</td>
                        <td className="py-3 text-cyan-200 font-semibold">{money(c.commission_amount)}</td>
                        <td className="py-3">{c.status}</td>
                      </tr>
                    ))}
                    {!commissions.length ? (
                      <tr><td colSpan="5" className="py-5 text-slate-500">No commissions yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
              <div className="font-bold">Payout Batches</div>
              <div className="mt-3 space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{money(p.total_amount)} • {p.status}</div>
                      <div className="text-xs text-slate-500 mt-1">{p.period_start} → {p.period_end}</div>
                    </div>
                    <div className="text-xs text-slate-500">{p.external_reference || "No ref"}</div>
                  </div>
                ))}
                {!payouts.length ? <div className="text-sm text-slate-500">No payout batches yet.</div> : null}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
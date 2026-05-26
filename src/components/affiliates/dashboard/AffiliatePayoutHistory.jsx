import React from "react";

function statusTone(status) {
  switch ((status || "").toUpperCase()) {
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";

    default:
      return "border-slate-700 bg-slate-900/50 text-slate-300";
  }
}

export default function AffiliatePayoutHistory({
  payouts = [],
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5 overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div>
          <div className="text-xl font-black text-slate-100">
            Payout History
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Historical affiliate payouts and payout status.
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-slate-500 border-b border-slate-800">
              <th className="pb-3 font-semibold">Period</th>
              <th className="pb-3 font-semibold">Revenue</th>
              <th className="pb-3 font-semibold">Commission</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Paid At</th>
            </tr>
          </thead>

          <tbody>
            {payouts.length ? (
              payouts.map((payout) => (
                <tr
                  key={payout.id}
                  className="border-b border-slate-900/80"
                >
                  <td className="py-4 text-sm text-slate-200">
                    {payout.period || "—"}
                  </td>

                  <td className="py-4 text-sm text-slate-300">
                    $
                    {Number(
                      payout.platform_revenue || 0
                    ).toFixed(2)}
                  </td>

                  <td className="py-4 text-sm font-bold text-cyan-100">
                    $
                    {Number(
                      payout.commission_amount || 0
                    ).toFixed(2)}
                  </td>

                  <td className="py-4">
                    <span
                      className={`px-3 py-1 rounded-full border text-[11px] font-semibold ${statusTone(
                        payout.status
                      )}`}
                    >
                      {payout.status || "PENDING"}
                    </span>
                  </td>

                  <td className="py-4 text-sm text-slate-400">
                    {payout.paid_at || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-slate-500"
                >
                  No payout history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
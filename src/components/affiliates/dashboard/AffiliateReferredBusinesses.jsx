import React from "react";

function StatusPill({ active }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-slate-700 bg-slate-900/50 text-slate-400"
      }`}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}

export default function AffiliateReferredBusinesses({
  businesses = [],
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-black text-slate-100">
            Referred Businesses
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Businesses currently attributed to your affiliate account.
          </div>
        </div>

        <div className="text-sm text-cyan-300">
          {businesses.length} total
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {businesses.length ? (
          businesses.map((business) => (
            <div
              key={business.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold text-slate-100 truncate">
                    {business.name}
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    {business.city || "—"}
                    {business.state ? `, ${business.state}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <StatusPill active={business.active !== false} />

                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-cyan-300/75">
                      Monthly Revenue
                    </div>

                    <div className="mt-1 text-sm font-bold text-cyan-100">
                      $
                      {Number(
                        business.monthly_platform_revenue || 0
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-500">
            No referred businesses yet.
          </div>
        )}
      </div>
    </div>
  );
}
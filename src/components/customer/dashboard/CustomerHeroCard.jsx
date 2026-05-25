import React from "react";

export default function CustomerHeroCard({
  displayName = "User",
  activeBusinessId = "auto",
  onNewRequest,
  onViewOrders,
  onBusinessCards,
  onAffiliate,
}) {
  return (
    <section className="rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-slate-950/80 via-slate-950/45 to-cyan-950/20 backdrop-blur-xl p-6 shadow-[0_0_80px_rgba(0,0,0,0.40)] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-16 w-16 rounded-3xl border border-cyan-500/25 bg-slate-950/70 overflow-hidden shrink-0 shadow-[0_0_35px_rgba(34,211,238,0.10)]">
            <img
              src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=400&auto=format&fit=crop"
              alt="profile"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/75">
              Customer Command Center
            </div>

            <div className="mt-1 text-3xl font-black text-slate-100 truncate">
              {displayName}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-[11px] px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                Requests
              </span>

              <span className="text-[11px] px-3 py-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200">
                Marketplace
              </span>

              <span className="text-[11px] px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                Affiliate Revenue
              </span>
            </div>

            <div className="mt-3 text-sm text-slate-400">
              Business Context: {activeBusinessId || "Personal"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onNewRequest}
            className="h-14 px-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 hover:bg-cyan-500/24 text-cyan-100 text-sm font-semibold transition"
          >
            + New Request
          </button>

          <button
            type="button"
            onClick={onViewOrders}
            className="h-14 px-4 rounded-2xl border border-slate-700 bg-slate-950/55 hover:bg-slate-900/45 text-slate-100 text-sm font-semibold transition"
          >
            View Orders
          </button>

          <button
            type="button"
            onClick={onBusinessCards}
            className="h-14 px-4 rounded-2xl border border-slate-700 bg-slate-950/55 hover:bg-slate-900/45 text-slate-100 text-sm font-semibold transition"
          >
            Business Cards
          </button>

          <button
            type="button"
            onClick={onAffiliate}
            className="h-14 px-4 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/18 hover:bg-fuchsia-500/24 text-fuchsia-100 text-sm font-semibold transition"
          >
            Affiliate
          </button>
        </div>
      </div>
    </section>
  );
}
import React from "react";

export default function CustomerCommandHero({
  displayName = "User",
  onNewRequest,
  onViewOrders,
  onAffiliate,
  onBusinessCards,
}) {
  return (
    <section className="rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-950/60 to-cyan-950/20 p-6 overflow-hidden relative">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
            Customer Command Center
          </div>

          <h1 className="mt-2 text-3xl md:text-5xl font-black text-slate-100">
            Welcome back, {displayName}
          </h1>

          <p className="mt-3 text-sm md:text-base text-slate-400 max-w-2xl">
            Request service, track jobs, manage payments, connect with local businesses, and grow with SyncWorks.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3 xl:min-w-[360px]">
          <button onClick={onNewRequest} className="h-14 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 hover:bg-cyan-500/24 text-cyan-100 text-sm font-semibold">
            + Request
          </button>
          <button onClick={onViewOrders} className="h-14 rounded-2xl border border-slate-700 bg-slate-950/60 hover:bg-slate-900/50 text-slate-100 text-sm font-semibold">
            Orders
          </button>
          <button onClick={onAffiliate} className="h-14 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/18 hover:bg-fuchsia-500/24 text-fuchsia-100 text-sm font-semibold">
            Affiliate
          </button>
          <button onClick={onBusinessCards} className="h-14 rounded-2xl border border-emerald-500/30 bg-emerald-500/12 hover:bg-emerald-500/18 text-emerald-100 text-sm font-semibold">
            Business Cards
          </button>
        </div>
      </div>
    </section>
  );
}
import React from "react";

export default function CustomerAffiliateProgramCard({ onOpen }) {
  return (
    <div className="rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/12 via-slate-950/45 to-cyan-500/10 p-5 shadow-[0_0_50px_rgba(217,70,239,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/80">
            Affiliate Program
          </div>

          <div className="text-xl font-black mt-2 text-slate-100">
            Earn recurring commissions.
          </div>

          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Refer service businesses to SyncWorks and earn 10% of SyncWorks revenue
            generated from businesses tied to your code.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-[11px] px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold">
              Lifetime attribution
            </span>
            <span className="text-[11px] px-3 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 font-semibold">
              QR code included
            </span>
            <span className="text-[11px] px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 font-semibold">
              Monthly payouts
            </span>
          </div>
        </div>

        <div className="hidden sm:flex h-14 w-14 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 items-center justify-center text-2xl">
          🤝
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-5 w-full h-11 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/18 hover:bg-fuchsia-500/24 text-fuchsia-100 text-sm font-semibold transition"
      >
        Open Affiliate Portal
      </button>
    </div>
  );
}
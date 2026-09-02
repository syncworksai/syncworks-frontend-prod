import React, { useState } from "react";
import { BarChart3, X } from "lucide-react";
import StorefrontRevenueKpis from "../storefront/StorefrontRevenueKpis";

export default function PlatformCommerceDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[70] inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/20 bg-slate-950/95 px-3 text-[10px] font-black text-cyan-100 shadow-2xl backdrop-blur-xl"
      >
        <BarChart3 className="h-4 w-4" />
        Commerce KPIs
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Storefront revenue KPIs">
          <button type="button" className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Close commerce KPIs" />
          <aside className="absolute inset-y-0 right-0 z-10 w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#020617] p-3 shadow-2xl sm:p-5">
            <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/95 p-3 backdrop-blur-xl">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">God Mode</div>
                <div className="text-sm font-black text-white">Storefront Revenue</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <StorefrontRevenueKpis />
          </aside>
        </div>
      ) : null}
    </>
  );
}

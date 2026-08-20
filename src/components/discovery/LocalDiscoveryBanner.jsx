import React from "react";
import { Compass, MapPin, UtensilsCrossed } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function LocalDiscoveryBanner() {
  const location = useLocation();
  const nav = useNavigate();
  if (location.pathname !== "/customer") return null;

  return (
    <div className="relative z-10 border-b border-cyan-400/15 bg-cyan-500/[.04]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10"><Compass className="h-5 w-5 text-cyan-200" /></div>
          <div>
            <div className="text-sm font-black text-white">SYNC Local is ready</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">Find food, retail, services and things to do using your current location when allowed, with Home as a safe fallback.</div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => nav("/customer/discover?category=FOOD")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[.08] px-3 text-xs font-black text-violet-100"><UtensilsCrossed className="h-3.5 w-3.5" /> Find food</button>
          <button type="button" onClick={() => nav("/customer/discover")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-500 px-3 text-xs font-black text-slate-950"><MapPin className="h-3.5 w-3.5" /> Explore nearby</button>
        </div>
      </div>
    </div>
  );
}

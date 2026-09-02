import React from "react";
import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

export default function PersonalStorefrontDock() {
  return (
    <Link
      to="/customer/store"
      className="fixed bottom-6 right-6 z-[145] hidden items-center gap-3 rounded-2xl border border-fuchsia-300/25 bg-[#07101f]/95 px-4 py-3 text-left shadow-[0_18px_55px_rgba(0,0,0,.45),0_0_28px_rgba(217,70,239,.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-fuchsia-300/45 lg:flex"
      aria-label="Open SyncWorks Storefront"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-fuchsia-300/25 bg-fuchsia-500/10 text-fuchsia-200">
        <ShoppingBag className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[9px] font-black uppercase tracking-[.16em] text-fuchsia-200">SyncWorks Storefront</span>
        <span className="mt-0.5 block text-xs font-black text-white">Projects · Lists · Reorder</span>
      </span>
    </Link>
  );
}

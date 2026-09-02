import React from "react";
import { ShoppingBag } from "lucide-react";

export default function StorefrontShortcut({ onOpen, compact = false }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={compact
        ? "flex w-full items-center gap-3 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/[.06] px-3 py-2.5 text-left text-slate-100 transition hover:border-fuchsia-300/35 hover:bg-fuchsia-500/[.10]"
        : "group relative rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/[.055] p-4 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-300/35 hover:bg-fuchsia-500/[.09]"}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200">
        <ShoppingBag className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black text-white">Storefront</span>
        {!compact ? <span className="mt-1 block text-[11px] leading-4 text-slate-500">Projects, shopping lists, saved supplies and merchant handoff.</span> : null}
      </span>
      <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-fuchsia-200">Shop</span>
    </button>
  );
}

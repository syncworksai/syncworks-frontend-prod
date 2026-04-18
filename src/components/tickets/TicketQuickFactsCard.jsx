import React from "react";

function Row({ k, v, tone = "default" }) {
  const toneCls =
    tone === "cyan"
      ? "border-cyan-500/20 bg-cyan-500/5"
      : tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "amber"
      ? "border-amber-500/20 bg-amber-500/5"
      : "border-slate-800 bg-slate-950/30";

  return (
    <div className={`rounded-2xl border p-3 ${toneCls}`}>
      <div className="text-[11px] text-slate-400">{k}</div>
      <div className="text-sm font-semibold mt-1 break-words">{v || "—"}</div>
    </div>
  );
}

export default function TicketQuickFactsCard({
  paymentPref,
  contactPref,
  bestPhone,
  smsAllowed,
  categoryPath,
  priority,
  zip,
  cityState,
  isMarketplace,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="text-lg font-extrabold">Quick Reads</div>
      <div className="text-xs text-slate-400 mt-1">
        Fast info for SBOs and marketplace review.
      </div>

      <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        <Row k="Payment" v={paymentPref || "—"} tone="emerald" />
        <Row k="Contact Preference" v={contactPref || "—"} tone="cyan" />
        <Row k="Best Phone" v={bestPhone || "—"} tone="cyan" />
        <Row k="Text Allowed" v={smsAllowed || "—"} tone="amber" />
        <Row k="Type of Work" v={categoryPath || "—"} />
        <Row k="Priority" v={priority || "—"} />
        <Row k="ZIP" v={zip || "—"} />
        <Row k="City / State" v={cityState || "—"} />
        <Row k="Routing" v={isMarketplace ? "Marketplace" : "Direct"} />
      </div>
    </div>
  );
}
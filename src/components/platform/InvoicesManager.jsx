import React from "react";

export default function InvoicesManager() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="font-semibold">Invoices (Next)</div>
      <div className="text-sm text-slate-400 mt-2">
        This will show platform-level billing + future paid invoice volume (for the 1% fee).
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Wiring plan:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Aggregate monthly gross paid invoices per business</li>
          <li>Compute 1% platform fee + subscriptions + seat overages</li>
          <li>Stripe invoice generated monthly</li>
        </ul>
      </div>
    </div>
  );
}

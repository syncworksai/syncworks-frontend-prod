// src/pages/BusinessBillingSettings.jsx
import React from "react";
import StripeConnectCTA from "../components/StripeConnectCTA";

export default function BusinessBillingSettings() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Billing & Payouts</h1>
        <p className="mt-1 text-sm text-white/70">
          Connect Stripe so your business can receive payouts automatically to your bank.
        </p>
      </div>

      <StripeConnectCTA />

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-white">How money moves</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-white/70 space-y-1">
          <li>Customer pays by card via Stripe Checkout.</li>
          <li>SyncWorks collects the platform fee (ex: 1%).</li>
          <li>Remaining funds route to the business’s Stripe Connect account.</li>
          <li>Stripe pays out to the business’s linked bank account (Express).</li>
        </ul>
      </div>
    </div>
  );
}

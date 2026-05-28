// src/components/requests/new-request/MarketplaceAgreementCard.jsx
import React from "react";
import { cx } from "./requestMarketplaceCatalog";

export default function MarketplaceAgreementCard({
  marketplaceAgreement,
  setMarketplaceAgreement,
  mode = "CUSTOMER_MARKETPLACE",
  selectedService = null,
}) {
  const isBusinessInternal = mode === "BUSINESS_INTERNAL";

  if (isBusinessInternal) {
    return (
      <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-4 shadow-[0_0_34px_rgba(99,102,241,0.08)] md:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-indigo-500/25 bg-indigo-500/10 text-lg">
            🏢
          </div>

          <div className="min-w-0">
            <div className="text-sm font-black text-indigo-100">
              Business-only ticket
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              This ticket is being created by the business because a customer
              contacted you directly. It should stay scoped to your business,
              your employees, your queue, your quotes, and your invoices.
            </div>

            {selectedService ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                Selected service:{" "}
                <span className="font-bold text-slate-100">
                  {selectedService.label}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">
            Marketplace agreement
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            SyncWorks helps connect customers and local providers. The ticket
            keeps everything organized.
          </div>
        </div>

        <div className="hidden rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:inline-flex">
          Required
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/65 p-4">
        <div className="text-xs leading-6 text-slate-300">
          I understand SyncWorks connects customers and providers. SyncWorks is
          not the service provider unless explicitly stated. Service quality,
          scheduling, warranties, disputes, damages, pricing, refunds, pickup,
          delivery, fulfillment, and completion are between me and the provider
          accepting or handling the ticket.
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMarketplaceAgreement(!marketplaceAgreement)}
        className={cx(
          "mt-3 flex w-full items-start gap-3 rounded-3xl border p-4 text-left transition",
          marketplaceAgreement
            ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
            : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-cyan-500/30 hover:bg-slate-900/60"
        )}
      >
        <span
          className={cx(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-black",
            marketplaceAgreement
              ? "border-emerald-300 bg-emerald-400 text-black"
              : "border-slate-700 bg-slate-900 text-slate-500"
          )}
        >
          {marketplaceAgreement ? "✓" : ""}
        </span>

        <span>
          <span className="block text-sm font-black">
            I agree. Create my SyncWorks ticket.
          </span>
          <span className="mt-1 block text-xs leading-5 opacity-80">
            The request will be sent into the marketplace flow and tracked as a
            SyncWorks ticket.
          </span>
        </span>
      </button>
    </div>
  );
}
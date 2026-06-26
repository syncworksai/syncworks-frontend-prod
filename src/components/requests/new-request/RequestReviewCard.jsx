// src/components/requests/new-request/RequestReviewCard.jsx
import React from "react";
import { cx } from "./requestMarketplaceCatalog";

function ReviewRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-100">
        {value || "—"}
      </div>
    </div>
  );
}

function PrettyJson({ data }) {
  const entries = Object.entries(data || {}).filter(([, value]) =>
    String(value || "").trim()
  );

  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-500">
        No extra smart-intake answers yet.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3"
        >
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {key.replaceAll("_", " ")}
          </div>
          <div className="mt-1 text-sm text-slate-200">{String(value)}</div>
        </div>
      ))}
    </div>
  );
}

export default function RequestReviewCard({
  selectedService,
  priority,
  fulfillmentType,
  neededByDate,
  preferredTimeWindow,
  preferredStartDate,
  preferredEndDate,
  fullServiceAddress,
  accessNotes,
  details,
  bestPhone,
  contactPreference,
  paymentPreference,
  dynamicIntake,
  marketplaceAgreement,
  directProvider = null,
  mode = "CUSTOMER_MARKETPLACE",
}) {
  const isBusinessInternal = mode === "BUSINESS_INTERNAL";

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/55 p-5 shadow-[0_0_70px_rgba(34,211,238,0.10)] md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
            Review Ticket
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white md:text-4xl">
            {isBusinessInternal
              ? "Ready to create this business ticket?"
              : "Ready to send this into SyncWorks?"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {isBusinessInternal
              ? "This will create an internal business-scoped ticket from the customer call-in flow."
              : "Customers get a simple marketplace experience. SyncWorks creates the structured ticket behind the scenes."}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-100">
              Ticket summary
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Review the important details before creating the ticket.
            </div>
          </div>

          <div className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] font-black text-slate-300">
            {selectedService?.ticketType || "TICKET"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ReviewRow
            label="Need"
            value={
              selectedService
                ? `${selectedService.verticalIcon || "🎫"} ${
                    selectedService.label
                  }`
                : ""
            }
          />
          <ReviewRow
            label="Category"
            value={
              selectedService
                ? `${selectedService.verticalLabel} • ${selectedService.categoryLabel}`
                : ""
            }
          />
          {directProvider ? (
            <ReviewRow label="Send directly to" value={directProvider.name} />
          ) : null}
          <ReviewRow label="Priority" value={priority} />
          <ReviewRow label="Fulfillment" value={fulfillmentType} />
          <ReviewRow label="Needed by" value={neededByDate} />
          <ReviewRow label="Time window" value={preferredTimeWindow} />
          <ReviewRow label="Preferred start" value={preferredStartDate} />
          <ReviewRow label="Preferred end" value={preferredEndDate} />
          <ReviewRow label="Service address" value={fullServiceAddress} />
          <ReviewRow label="Best phone" value={bestPhone} />
          <ReviewRow label="Contact" value={contactPreference} />
          <ReviewRow label="Payment" value={paymentPreference} />
        </div>

        {accessNotes ? (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Access notes
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-200">
              {accessNotes}
            </div>
          </div>
        ) : null}

        {details ? (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Description
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">
              {details}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 md:p-5">
        <div className="text-sm font-black text-cyan-100">
          Smart intake answers
        </div>
        <div className="mt-1 text-xs text-slate-400">
          These values are stored inside the SyncWorks intake payload for future
          routing, automations, quotes, messages, and reporting.
        </div>

        <div className="mt-4">
          <PrettyJson data={dynamicIntake} />
        </div>
      </section>

      {!isBusinessInternal && !directProvider && !marketplaceAgreement ? (
        <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Marketplace agreement must be accepted before submitting.
        </div>
      ) : null}

    </div>
  );
}
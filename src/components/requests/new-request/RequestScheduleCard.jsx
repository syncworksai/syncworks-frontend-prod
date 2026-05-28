// src/components/requests/new-request/RequestScheduleCard.jsx
import React from "react";
import { FULFILLMENT_TYPES, cx } from "./requestMarketplaceCatalog";

const TIME_WINDOW_PRESETS = [
  "ASAP",
  "Morning",
  "Afternoon",
  "Evening",
  "After 5 PM",
  "Weekend",
  "Flexible",
];

const FULFILLMENT_LABELS = {
  [FULFILLMENT_TYPES.ONSITE]: "Onsite service",
  [FULFILLMENT_TYPES.PICKUP]: "Pickup",
  [FULFILLMENT_TYPES.DELIVERY]: "Delivery",
  [FULFILLMENT_TYPES.VIRTUAL]: "Virtual",
  [FULFILLMENT_TYPES.QUOTE]: "Quote first",
  [FULFILLMENT_TYPES.BOOKING]: "Booking",
};

function getRecommendedFulfillment(service) {
  const options = Array.isArray(service?.fulfillmentTypes)
    ? service.fulfillmentTypes
    : [];

  if (!options.length) return FULFILLMENT_TYPES.ONSITE;

  if (options.includes(FULFILLMENT_TYPES.ONSITE)) return FULFILLMENT_TYPES.ONSITE;
  if (options.includes(FULFILLMENT_TYPES.BOOKING)) return FULFILLMENT_TYPES.BOOKING;

  return options[0];
}

function FulfillmentButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border px-3 py-2 text-xs font-black transition",
        active
          ? "border-cyan-400/50 bg-cyan-500/18 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
          : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:bg-slate-900/70"
      )}
    >
      {children}
    </button>
  );
}

export default function RequestScheduleCard({
  selectedService = null,
  priority,
  neededByDate,
  setNeededByDate,
  preferredTimeWindow,
  setPreferredTimeWindow,
  preferredStartDate,
  setPreferredStartDate,
  preferredEndDate,
  setPreferredEndDate,
  fulfillmentType,
  setFulfillmentType,
  mode = "CUSTOMER_MARKETPLACE",
}) {
  const isBusinessInternal = mode === "BUSINESS_INTERNAL";
  const serviceFulfillmentTypes = Array.isArray(selectedService?.fulfillmentTypes)
    ? selectedService.fulfillmentTypes
    : [FULFILLMENT_TYPES.ONSITE];

  const recommended = getRecommendedFulfillment(selectedService);
  const currentFulfillment = fulfillmentType || recommended;

  function pickPreset(value) {
    setPreferredTimeWindow(value);
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">
            Scheduling & fulfillment
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {isBusinessInternal
              ? "Set the expected timing and how your business will fulfill the ticket."
              : "Tell local providers when you need help and whether this is onsite, pickup, delivery, virtual, or quote-first."}
          </div>
        </div>

        <div className="hidden rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100 sm:inline-flex">
          {FULFILLMENT_LABELS[currentFulfillment] || "Ticket"}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="text-[11px] font-semibold text-slate-400">
            Fulfillment type
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {serviceFulfillmentTypes.map((type) => (
              <FulfillmentButton
                key={type}
                active={currentFulfillment === type}
                onClick={() => setFulfillmentType(type)}
              >
                {FULFILLMENT_LABELS[type] || type}
              </FulfillmentButton>
            ))}
          </div>

          {selectedService ? (
            <div className="mt-2 text-[11px] leading-5 text-slate-500">
              Based on{" "}
              <span className="text-slate-300">{selectedService.label}</span>, the
              recommended default is{" "}
              <span className="text-cyan-200">
                {FULFILLMENT_LABELS[recommended] || recommended}
              </span>
              .
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-400">
              Needed by date
            </span>
            <input
              type="date"
              value={neededByDate}
              onChange={(e) => setNeededByDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-slate-400">
              Preferred time window
            </span>
            <input
              value={preferredTimeWindow}
              onChange={(e) => setPreferredTimeWindow(e.target.value)}
              placeholder="Morning, afternoon, after 5 PM, ASAP..."
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
            />
          </label>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-400">
            Quick windows
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {TIME_WINDOW_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => pickPreset(preset)}
                className={cx(
                  "rounded-2xl border px-3 py-2 text-xs font-bold transition",
                  preferredTimeWindow === preset
                    ? "border-emerald-400/50 bg-emerald-500/18 text-emerald-100"
                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:bg-slate-900/70"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {priority === "P4" ||
        currentFulfillment === FULFILLMENT_TYPES.BOOKING ||
        currentFulfillment === FULFILLMENT_TYPES.QUOTE ? (
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              Flexible / scheduled window
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-400">
                  Preferred start date
                </span>
                <input
                  type="date"
                  value={preferredStartDate}
                  onChange={(e) => setPreferredStartDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-emerald-500/25 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/10"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold text-slate-400">
                  Preferred end date
                </span>
                <input
                  type="date"
                  value={preferredEndDate}
                  onChange={(e) => setPreferredEndDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-emerald-500/25 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/10"
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-3 text-xs leading-5 text-slate-400">
          {currentFulfillment === FULFILLMENT_TYPES.DELIVERY ? (
            <>
              Delivery tickets can later power retail, restaurant, supply, and
              local product workflows while still using the same SyncWorks ticket
              engine.
            </>
          ) : currentFulfillment === FULFILLMENT_TYPES.PICKUP ? (
            <>
              Pickup tickets are ideal for food, retail, parts, and local product
              requests.
            </>
          ) : currentFulfillment === FULFILLMENT_TYPES.VIRTUAL ? (
            <>
              Virtual tickets work for tutoring, business help, tech help,
              estimates, and consultations.
            </>
          ) : currentFulfillment === FULFILLMENT_TYPES.QUOTE ? (
            <>
              Quote-first tickets are best when pricing depends on photos,
              property details, scope, size, or availability.
            </>
          ) : (
            <>
              Onsite tickets are best for service providers, property work,
              home repair, auto/mobile services, cleaning, and local appointments.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// src/components/requests/RequestDetailsCard.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ChoiceButton({ active, children, onClick, tone = "cyan" }) {
  const activeTone =
    tone === "emerald"
      ? "border-emerald-400/50 bg-emerald-500/18 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.14)]"
      : tone === "amber"
      ? "border-amber-400/50 bg-amber-500/18 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.14)]"
      : "border-cyan-400/50 bg-cyan-500/18 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border px-3 py-2 text-xs font-bold transition",
        active
          ? activeTone
          : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:bg-slate-900/70"
      )}
    >
      {children}
    </button>
  );
}

export default function RequestDetailsCard({
  details,
  setDetails,
  paymentPreference,
  setPaymentPreference,
  contactPreference,
  setContactPreference,
  bestPhone,
  setBestPhone,
  customerName = "",
  setCustomerName = null,
  customerEmail = "",
  setCustomerEmail = null,
  savedCustomers = [],
  selectedCustomerId = "",
  onSelectSavedCustomer = null,
  mode = "CUSTOMER_MARKETPLACE",
}) {
  const isBusinessInternal = mode === "BUSINESS_INTERNAL";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">
            {isBusinessInternal ? "Customer & request details" : "Tell us what’s going on"}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {isBusinessInternal
              ? "Use this when a customer called, texted, or walked in and your business is creating the ticket."
              : "Add enough detail so the right local provider can respond quickly."}
          </div>
        </div>

        <div className="hidden rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:inline-flex">
          SyncWorks Ticket
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {isBusinessInternal ? (
          <>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.07] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                Repeat customer
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => onSelectSavedCustomer?.(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
              >
                <option value="">New customer - enter details below</option>
                {(savedCustomers || []).map((customer) => (
                  <option key={customer.id} value={String(customer.id)}>
                    {customer.name || customer.email || customer.phone}
                    {customer.phone ? ` • ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[11px] leading-5 text-slate-500">
                Selecting a saved customer prefills contact, location, and preference fields.
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-400">
                Customer name
              </span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName?.(e.target.value)}
                placeholder="Customer name"
                className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-slate-400">
                Customer email
              </span>
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail?.(e.target.value)}
                placeholder="customer@example.com"
                type="email"
                className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
              />
            </label>
            </div>
          </>
        ) : null}

        <label className="block">
          <span className="text-[11px] font-semibold text-slate-400">
            Description
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={
              isBusinessInternal
                ? "Example: Customer called in about AC not cooling. Wants someone out today after 3 PM."
                : "Example: My AC is not cooling and the outside unit is running. I need someone today if possible."
            }
            rows={5}
            className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold text-slate-400">
            Best phone number
          </span>
          <input
            value={bestPhone}
            onChange={(e) => setBestPhone(e.target.value)}
            placeholder="Best phone number"
            inputMode="tel"
            className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold text-slate-400">
              Contact preference
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "call", label: "Call" },
                { key: "text", label: "Text" },
                { key: "either", label: "Either" },
              ].map((opt) => (
                <ChoiceButton
                  key={opt.key}
                  active={contactPreference === opt.key}
                  onClick={() => setContactPreference(opt.key)}
                >
                  {opt.label}
                </ChoiceButton>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-400">
              Payment preference
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "card", label: "Card" },
                { key: "cash", label: "Cash" },
                { key: "invoice", label: "Invoice" },
                { key: "quote_first", label: "Quote first" },
              ].map((opt) => (
                <ChoiceButton
                  key={opt.key}
                  tone="emerald"
                  active={paymentPreference === opt.key}
                  onClick={() => setPaymentPreference(opt.key)}
                >
                  {opt.label}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-3 text-xs leading-5 text-slate-400">
          {isBusinessInternal ? (
            <>
              Business-created tickets stay scoped to your business. The customer
              should not have to search the full public marketplace when they already
              contacted you.
            </>
          ) : (
            <>
              This creates a SyncWorks ticket behind the scenes, but the customer
              experience stays marketplace-first: search, choose, send, and track.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
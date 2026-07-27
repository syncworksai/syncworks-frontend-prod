// src/components/requests/RequestDetailsCard.jsx
import React, { useEffect, useState } from "react";
import { loadCustomerRequestProfile } from "../../hooks/useCustomerRequestPrefill";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ChoiceButton({ active, children, onClick, tone = "cyan" }) {
  const activeTone =
    tone === "emerald"
      ? "border-emerald-400/50 bg-emerald-500/18 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.14)]"
      : "border-cyan-400/50 bg-cyan-500/18 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]";
  return (
    <button type="button" onClick={onClick} className={cx("rounded-2xl border px-3 py-2 text-xs font-bold transition", active ? activeTone : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:bg-slate-900/70")}>
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
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (isBusinessInternal) return undefined;
    loadCustomerRequestProfile().then((profile) => {
      if (!active || !profile) return;
      if (!bestPhone?.trim() && profile.phone) setBestPhone(profile.phone);
      if (!customerName?.trim()) {
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
        if (fullName) setCustomerName?.(fullName);
      }
      if (!customerEmail?.trim() && profile.email) setCustomerEmail?.(profile.email);
      if (contactPreference === "either" && profile.preferredContactMethod === "SMS") {
        setContactPreference("text");
      }
      setProfileLoaded(true);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">{isBusinessInternal ? "Customer & request details" : "Tell us what’s going on"}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {isBusinessInternal ? "Use an existing customer or enter the person who contacted your business." : "Your saved contact details are reused automatically when available."}
          </div>
        </div>
        {!isBusinessInternal && profileLoaded ? (
          <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">Contact loaded</div>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        {isBusinessInternal ? (
          <>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.07] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Repeat customer</div>
              <select value={selectedCustomerId} onChange={(e) => onSelectSavedCustomer?.(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/50">
                <option value="">New customer - enter details below</option>
                {(savedCustomers || []).map((customer) => (
                  <option key={customer.id} value={String(customer.id)}>
                    {customer.name || customer.email || customer.phone}{customer.phone ? ` • ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[11px] leading-5 text-slate-500">Selecting a saved customer prefills contact, location, and preference fields.</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-400">Customer name</span>
                <input value={customerName} onChange={(e) => setCustomerName?.(e.target.value)} placeholder="Customer name" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-400">Customer email</span>
                <input value={customerEmail} onChange={(e) => setCustomerEmail?.(e.target.value)} placeholder="customer@example.com" type="email" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60" />
              </label>
            </div>
          </>
        ) : null}

        <label className="block">
          <span className="text-[11px] font-semibold text-slate-400">Description</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={isBusinessInternal ? "Example: Customer called about AC not cooling and wants service after 3 PM." : "Example: My AC is not cooling and the outside unit is running."} rows={5} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10" />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold text-slate-400">Best phone number</span>
          <input value={bestPhone} onChange={(e) => setBestPhone(e.target.value)} placeholder="Best phone number" inputMode="tel" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Contact preference</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[["call","Call"],["text","Text"],["either","Either"]].map(([key,label]) => (
                <ChoiceButton key={key} active={contactPreference === key} onClick={() => setContactPreference(key)}>{label}</ChoiceButton>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Payment preference</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[["card","Card"],["cash","Cash"],["invoice","Invoice"],["quote_first","Quote first"]].map(([key,label]) => (
                <ChoiceButton key={key} tone="emerald" active={paymentPreference === key} onClick={() => setPaymentPreference(key)}>{label}</ChoiceButton>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-3 text-xs leading-5 text-slate-400">
          {isBusinessInternal
            ? "Business-created requests remain scoped to the active business and reuse saved customer information."
            : "SyncWorks securely reuses your saved profile so requests are faster. You remain in control and can edit every value before submission."}
        </div>
      </div>
    </div>
  );
}

// src/components/requests/RequestLocationCard.jsx
import React, { useEffect, useState } from "react";
import { loadCustomerRequestProfile } from "../../hooks/useCustomerRequestPrefill";

function normalizeZip(value) {
  return String(value || "").replace(/[^\d-]/g, "").slice(0, 10);
}

export default function RequestLocationCard({
  address,
  setAddress,
  unit,
  setUnit,
  city = "",
  setCity = null,
  stateRegion = "",
  setStateRegion = null,
  serviceZip = "",
  setServiceZip = null,
  accessNotes,
  setAccessNotes,
  mode = "CUSTOMER_MARKETPLACE",
}) {
  const isBusinessInternal = mode === "BUSINESS_INTERNAL";
  const [prefillStatus, setPrefillStatus] = useState(isBusinessInternal ? "idle" : "loading");

  useEffect(() => {
    let active = true;
    if (isBusinessInternal) return undefined;
    loadCustomerRequestProfile().then((profile) => {
      if (!active) return;
      if (!profile) {
        setPrefillStatus("unavailable");
        return;
      }
      if (!address?.trim() && profile.address) setAddress(profile.address);
      if (!unit?.trim() && profile.unit) setUnit(profile.unit);
      if (!city?.trim() && profile.city) setCity?.(profile.city);
      if (!stateRegion?.trim() && profile.stateRegion) setStateRegion?.(profile.stateRegion);
      if (!serviceZip?.trim() && profile.serviceZip) setServiceZip?.(profile.serviceZip);
      setPrefillStatus("ready");
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">Service location</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {isBusinessInternal
              ? "Where is your team going, delivering, quoting, or performing the work?"
              : "We use your saved address when available. Review it before continuing."}
          </div>
        </div>
        {!isBusinessInternal && prefillStatus === "ready" ? (
          <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
            Profile loaded
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-400">Street address</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="9073 Chastain Park Dr" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10" />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-400">Unit / Apt</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-400">City</span>
            <input value={city} onChange={(e) => setCity?.(e.target.value)} placeholder="Montgomery" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-400">State</span>
            <input value={stateRegion} onChange={(e) => setStateRegion?.(e.target.value.toUpperCase())} placeholder="AL" maxLength={2} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-400">ZIP code</span>
            <input value={serviceZip} onChange={(e) => setServiceZip?.(normalizeZip(e.target.value))} placeholder="36109" inputMode="numeric" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10" />
          </label>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold text-slate-400">Access notes</span>
          <textarea value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder="Gate code, lockbox, pets, parking, entry instructions, tenant notes..." rows={4} className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10" />
        </label>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-5 text-slate-400">
          {isBusinessInternal
            ? "This business-only request uses the selected customer and business data for dispatch, quoting, and invoicing."
            : "Marketplace routing uses your saved profile, location, service type, urgency, and provider service radius. You can edit any prefilled value."}
        </div>
      </div>
    </div>
  );
}

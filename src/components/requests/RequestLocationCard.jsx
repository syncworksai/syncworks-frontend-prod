// src/components/requests/RequestLocationCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Home, LoaderCircle, MapPin, Navigation } from "lucide-react";
import { getBrowserPosition, resolveCurrentLocation } from "../../api/identity";
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
  const [profile, setProfile] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  function applyLocation(location = {}) {
    setAddress(location.address_line1 || location.address || "");
    setUnit(location.address_line2 || location.unit || "");
    setCity?.(location.city || "");
    setStateRegion?.(location.state || location.stateRegion || "");
    setServiceZip?.(location.postal_code || location.serviceZip || "");
  }

  useEffect(() => {
    let active = true;
    if (isBusinessInternal) return undefined;
    loadCustomerRequestProfile().then((loaded) => {
      if (!active) return;
      setProfile(loaded);
      if (!loaded) {
        setPrefillStatus("unavailable");
        return;
      }
      if (!address?.trim() && loaded.address) setAddress(loaded.address);
      if (!unit?.trim() && loaded.unit) setUnit(loaded.unit);
      if (!city?.trim() && loaded.city) setCity?.(loaded.city);
      if (!stateRegion?.trim() && loaded.stateRegion) setStateRegion?.(loaded.stateRegion);
      if (!serviceZip?.trim() && loaded.serviceZip) setServiceZip?.(loaded.serviceZip);
      setPrefillStatus("ready");
    });
    return () => { active = false; };
  }, []);

  const savedLocations = useMemo(
    () => (Array.isArray(profile?.savedLocations) ? profile.savedLocations : []).filter((item) => item.kind !== "HOME"),
    [profile]
  );

  async function useCurrentLocation() {
    setLocating(true);
    setLocationMessage("");
    try {
      const point = await getBrowserPosition();
      const resolved = await resolveCurrentLocation(point.latitude, point.longitude);
      if (!resolved?.available || !resolved?.address_line1) {
        setLocationMessage("Current location was found, but the street address could not be resolved. You can enter it manually.");
        return;
      }
      applyLocation(resolved);
      setLocationMessage("Using your current device location for this request only. Home was not changed.");
    } catch (err) {
      setLocationMessage(err?.response?.data?.detail || err?.message || "Current location is not available. Check browser location permission or enter the address manually.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">Service location</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {isBusinessInternal
              ? "Where is your team going, delivering, quoting, or performing the work?"
              : "Home is the default. Use your current location or another saved place whenever this service is somewhere else."}
          </div>
        </div>
        {!isBusinessInternal && prefillStatus === "ready" ? (
          <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
            Profile loaded
          </div>
        ) : null}
      </div>

      {!isBusinessInternal ? (
        <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!profile}
              onClick={() => applyLocation(profile?.homeLocation || profile?.defaultServiceLocation || profile)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/[.07] px-3 text-[11px] font-black text-cyan-100 disabled:opacity-40"
            >
              <Home className="h-3.5 w-3.5" /> Home
            </button>
            <button
              type="button"
              disabled={locating}
              onClick={useCurrentLocation}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[.08] px-3 text-[11px] font-black text-violet-100 disabled:opacity-50"
            >
              {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              Use current location
            </button>
            {savedLocations.length ? (
              <label className="relative inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 text-[11px] font-black text-slate-300">
                <MapPin className="h-3.5 w-3.5" />
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const selected = savedLocations.find((item) => String(item.id) === event.target.value);
                    if (selected) applyLocation(selected);
                    event.target.value = "";
                  }}
                  className="max-w-[180px] bg-transparent text-[11px] font-black text-slate-300 outline-none"
                >
                  <option value="" className="bg-slate-950">Saved places</option>
                  {savedLocations.map((item) => (
                    <option key={item.id} value={item.id} className="bg-slate-950">{item.label || item.formatted_address || "Saved place"}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="mt-2 text-[10px] leading-4 text-slate-500">
            Home stays saved as Home even if you are traveling. Current location applies only to this request unless you explicitly save a new place in Settings.
          </div>
          {locationMessage ? <div className="mt-2 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-[10px] leading-4 text-slate-400">{locationMessage}</div> : null}
        </div>
      ) : null}

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
            : "Marketplace routing uses the service location selected here — not necessarily your Home location — along with service type, urgency, and provider service radius."}
        </div>
      </div>
    </div>
  );
}

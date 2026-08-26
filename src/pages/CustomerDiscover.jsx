import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  Compass,
  Eye,
  LoaderCircle,
  MapPin,
  Navigation,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardShell from "../components/dashboard/DashboardShell";
import { searchLocalDiscovery } from "../api/localDiscovery";
import { discoverProfessionalPractices } from "../api/professionalServices";

const LOCAL_CATEGORIES = [
  { id: "FOOD", label: "Food", icon: UtensilsCrossed, hint: "Restaurants, coffee and places to eat" },
  { id: "RETAIL", label: "Retail", icon: ShoppingBag, hint: "Shopping and stores nearby" },
  { id: "LOCAL_SERVICES", label: "Local services", icon: Store, hint: "Broader Google-backed local providers" },
  { id: "EVENTS", label: "Things to do", icon: Compass, hint: "Activities and places worth exploring" },
];

const PROFESSIONAL_CATEGORIES = [
  { id: "DENTAL", label: "Dentist", icon: Stethoscope, hint: "Claimed SyncWorks dental practices" },
  { id: "OPTOMETRY", label: "Eye doctor", icon: Eye, hint: "Claimed SyncWorks vision practices" },
  { id: "CHIROPRACTIC", label: "Chiropractor", icon: Stethoscope, hint: "Claimed SyncWorks chiropractic practices" },
  { id: "PHYSICAL_THERAPY", label: "Physical therapy", icon: Stethoscope, hint: "Claimed SyncWorks therapy practices" },
];

const FOOD_CHIPS = ["Fast Food", "Pizza", "Chinese", "Mexican", "Burgers", "Wings", "BBQ", "Seafood", "Italian", "Breakfast", "Coffee", "Desserts", "Healthy", "American"];
const SERVICE_CHIPS = ["Barber", "Mechanic", "Plumber", "Electrician", "HVAC", "Tree Service"];
const LOCAL_IDS = new Set(LOCAL_CATEGORIES.map((item) => item.id));
const PROFESSIONAL_IDS = new Set(PROFESSIONAL_CATEGORIES.map((item) => item.id));
const ALL_IDS = new Set([...LOCAL_IDS, ...PROFESSIONAL_IDS, "SYNCWORKS_SERVICES"]);

function requestedCategory(search) {
  const value = String(new URLSearchParams(search).get("category") || "FOOD").toUpperCase();
  return ALL_IDS.has(value) ? value : "FOOD";
}

function providerCategory(category) {
  return category === "LOCAL_SERVICES" ? "SERVICES" : category;
}

function locationLabel(payload) {
  const location = payload?.location || payload?.context?.location || {};
  if (payload?.context?.source === "CURRENT") return location.label || "Current location";
  return location.formatted_address || [location.city, location.state].filter(Boolean).join(", ") || "Home location";
}

function directionsUrl(place) {
  const destination = place?.place_id
    ? `place_id:${place.place_id}`
    : place?.latitude != null && place?.longitude != null
      ? `${place.latitude},${place.longitude}`
      : place?.address || place?.name || "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function PlaceMeta({ place }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400">
      {place.distance_miles !== null && place.distance_miles !== undefined ? <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[.05] px-2 py-1">{place.distance_miles} mi</span> : null}
      {place.rating ? <span className="rounded-full border border-amber-400/15 bg-amber-500/[.05] px-2 py-1">★ {place.rating} Google rating · {place.user_ratings_total || 0} reviews</span> : null}
      {place.open_now !== null && place.open_now !== undefined ? <span className={`rounded-full border px-2 py-1 ${place.open_now ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-rose-400/20 bg-rose-500/10 text-rose-200"}`}>{place.open_now ? "Open now" : "Closed"}</span> : null}
      {place.price_level !== null && place.price_level !== undefined ? <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1">{"$".repeat(Math.max(1, Math.min(4, Number(place.price_level) || 1)))}</span> : null}
    </div>
  );
}

export default function CustomerDiscover() {
  const nav = useNavigate();
  const location = useLocation();
  const [category, setCategory] = useState(() => requestedCategory(location.search));
  const [query, setQuery] = useState("");
  const [useCurrent, setUseCurrent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [professionalRows, setProfessionalRows] = useState([]);
  const [insurance, setInsurance] = useState("");
  const [zip, setZip] = useState("");

  const isProfessional = PROFESSIONAL_IDS.has(category);
  const isSyncWorksServices = category === "SYNCWORKS_SERVICES";

  async function runLocalSearch(nextCategory = category, nextQuery = query, current = useCurrent) {
    setLoading(true);
    setError("");
    setProfessionalRows([]);
    try {
      const result = await searchLocalDiscovery({ category: providerCategory(nextCategory), query: nextQuery, useCurrentLocation: current });
      setData(result);
      if (result?.available === false && result?.detail) setError(result.detail);
    } catch (err) {
      setError(err?.response?.data?.detail || "Local discovery is temporarily unavailable.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function runProfessionalSearch(nextType = category) {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const rows = await discoverProfessionalPractices({ practice_type: nextType, insurance, zip });
      setProfessionalRows(rows);
      if (!rows.length) setError("No claimed SyncWorks practices match those filters yet.");
    } catch (err) {
      setProfessionalRows([]);
      setError(err?.response?.data?.detail || "Professional search is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const next = requestedCategory(location.search);
    setCategory(next);
    setQuery("");
    setError("");
    if (PROFESSIONAL_IDS.has(next)) runProfessionalSearch(next);
    else if (next === "SYNCWORKS_SERVICES") {
      setData(null);
      setProfessionalRows([]);
    } else runLocalSearch(next, "", true);
  }, [location.search]);

  const results = useMemo(() => Array.isArray(data?.results) ? data.results : [], [data]);
  const topRated = useMemo(() => [...results].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0) || Number(b.user_ratings_total || 0) - Number(a.user_ratings_total || 0)), [results]);
  const sourceLabel = data?.context?.source === "CURRENT" ? "Current location" : data?.context?.source === "HOME_FALLBACK" ? "Home fallback" : "Home";
  const chips = category === "FOOD" ? FOOD_CHIPS : category === "LOCAL_SERVICES" ? SERVICE_CHIPS : [];

  function chooseCategory(id) {
    setCategory(id);
    setQuery("");
    setError("");
    nav(`/customer/discover?category=${id}`, { replace: true });
  }

  function chooseChip(value) {
    setQuery(value);
    runLocalSearch(category, value, useCurrent);
  }

  return (
    <DashboardShell modeBarTitle="SyncWorks" modeBarSubtitle="Local discovery">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_86%_12%,rgba(139,92,246,.22),transparent_32%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Local discovery</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find what you need where you are.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Explore nearby places, SyncWorks service businesses and claimed professional practices from one screen. Partner results and broader Google-backed results are labeled separately so you always know the source.</p>
            </div>
            <button type="button" onClick={() => nav("/profile")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-200"><Settings2 className="h-4 w-4" />Location settings</button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {LOCAL_CATEGORIES.map(({ id, label, icon: Icon, hint }) => (
              <button key={id} type="button" onClick={() => chooseCategory(id)} className={`min-h-28 rounded-2xl border p-3 text-left transition ${category === id ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/[.02]"}`}>
                <Icon className={`h-5 w-5 ${category === id ? "text-cyan-200" : "text-slate-500"}`} />
                <div className="mt-2 text-sm font-black text-white">{label}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{hint}</div>
              </button>
            ))}
            <button type="button" onClick={() => chooseCategory("SYNCWORKS_SERVICES")} className={`min-h-28 rounded-2xl border p-3 text-left transition ${isSyncWorksServices ? "border-emerald-400/30 bg-emerald-500/10" : "border-emerald-400/15 bg-emerald-500/[.04]"}`}>
              <ShieldCheck className="h-5 w-5 text-emerald-200" />
              <div className="mt-2 text-sm font-black text-white">SyncWorks services</div><div className="mt-1 text-[10px] leading-4 text-slate-500">Businesses signed up to serve customers in SyncWorks</div>
            </button>
            {PROFESSIONAL_CATEGORIES.map(({ id, label, icon: Icon, hint }) => (
              <button key={id} type="button" onClick={() => chooseCategory(id)} className={`min-h-28 rounded-2xl border p-3 text-left transition ${category === id ? "border-violet-400/30 bg-violet-500/10" : "border-white/10 bg-white/[.02]"}`}>
                <Icon className={`h-5 w-5 ${category === id ? "text-violet-200" : "text-slate-500"}`} />
                <div className="mt-2 text-sm font-black text-white">{label}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{hint}</div>
              </button>
            ))}
          </div>

          {isSyncWorksServices ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.05] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="text-sm font-black text-white">SyncWorks Marketplace businesses</div><p className="mt-1 text-xs leading-5 text-slate-400">These are businesses operating inside SyncWorks. Search by service and ZIP, then see businesses with configured service capacity and available staff.</p></div>
                <button type="button" onClick={() => nav("/customer/marketplace")} className="min-h-11 shrink-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white">Browse SyncWorks services</button>
              </div>
            </div>
          ) : isProfessional ? (
            <form onSubmit={(event) => { event.preventDefault(); runProfessionalSearch(); }} className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <input value={insurance} onChange={(event) => setInsurance(event.target.value)} placeholder="Insurance carrier, e.g. VSP or Delta Dental" className="h-12 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600" />
              <input value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="ZIP (optional)" className="h-12 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600" />
              <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search practices</button>
            </form>
          ) : (
            <>
              {chips.length ? <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{chips.map((chip) => <button key={chip} type="button" onClick={() => chooseChip(chip)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${query.toLowerCase() === chip.toLowerCase() ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-300"}`}>{chip}</button>)}</div> : null}
              <form onSubmit={(event) => { event.preventDefault(); runLocalSearch(); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={category === "FOOD" ? "Restaurant, pizza, tacos, coffee..." : "What are you looking for?"} className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" /></div>
                <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search</button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
                <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">{data?.context?.source === "CURRENT" ? <Navigation className="h-4 w-4 shrink-0 text-violet-200" /> : <MapPin className="h-4 w-4 shrink-0 text-cyan-200" />}<span className="truncate"><b className="text-white">{sourceLabel}</b> · {locationLabel(data)}</span></div>
                <button type="button" onClick={() => { const next = !useCurrent; setUseCurrent(next); runLocalSearch(category, query, next); }} className={`rounded-xl border px-3 py-2 text-[11px] font-black ${useCurrent ? "border-violet-400/25 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{useCurrent ? "Current location ON" : "Current location OFF"}</button>
              </div>
            </>
          )}
        </section>

        {error ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-sm text-amber-100">{error}</div> : null}

        {isProfessional && professionalRows.length ? (
          <section className="rounded-[1.75rem] border border-violet-400/15 bg-slate-950/45 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-200">SyncWorks partner practices</div><h2 className="mt-1 text-xl font-black text-white">Claimed practices</h2></div><span className="text-xs font-bold text-slate-500">{professionalRows.length} results</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {professionalRows.map((row) => (
                <article key={row.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-4">
                  <div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-widest text-violet-300">{row.practice_type_label || category.replaceAll("_", " ")}</div><h3 className="mt-1 text-base font-black text-white">{row.business_name}</h3></div>{row.accepting_new_patients ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-200">New patients</span> : null}</div>
                  <div className="mt-2 text-xs text-slate-500">{[row.address, row.city, row.state].filter(Boolean).join(", ") || "Location on business profile"}</div>
                  {(row.accepted_insurance || []).length ? <div className="mt-3 flex flex-wrap gap-1.5">{row.accepted_insurance.slice(0, 6).map((name) => <span key={name} className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[10px] font-bold text-slate-300">{name}</span>)}</div> : null}
                  <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => nav("/customer/appointments")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><CalendarPlus className="h-4 w-4" />Appointments</button>{row.phone ? <a href={`tel:${row.phone}`} className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/[.04] px-4 text-xs font-black text-slate-200">Call office</a> : null}</div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!isProfessional && !isSyncWorksServices && topRated.length ? (
          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Google-backed discovery</div><h2 className="mt-1 text-xl font-black text-white">Top rated near you</h2></div><span className="text-xs font-bold text-slate-500">{topRated.length} results</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {topRated.map((place, index) => (
                <article key={place.place_id || `${place.name}-${place.address}`} className="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">#{index + 1} by rating</div><h3 className="mt-1 text-base font-black text-white">{place.name}</h3><div className="mt-1 text-xs leading-5 text-slate-500">{place.address || "Nearby"}</div><PlaceMeta place={place} />
                  <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => window.open(directionsUrl(place), "_blank", "noopener,noreferrer")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.07] px-4 text-xs font-black text-cyan-100"><Route className="h-4 w-4" />Directions</button></div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !isProfessional && !isSyncWorksServices && data && !results.length && !error ? <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-slate-400">No nearby results found for this search.</div> : null}

        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs leading-5 text-slate-500"><b className="text-slate-300">Source clarity:</b> Food, Retail, Local services and Things to do use Google place data. SyncWorks services and professional-practice cards use businesses participating inside SyncWorks. Current device location is request-only and is never saved over Home.</div>
      </div>
    </DashboardShell>
  );
}

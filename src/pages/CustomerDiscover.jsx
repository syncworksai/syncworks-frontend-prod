import React, { useEffect, useMemo, useState } from "react";
import {
  Compass,
  Eye,
  LoaderCircle,
  MapPin,
  Navigation,
  Route,
  Search,
  Settings2,
  ShoppingBag,
  Stethoscope,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardShell from "../components/dashboard/DashboardShell";
import { searchLocalDiscovery } from "../api/localDiscovery";

const CATEGORIES = [
  { id: "FOOD", label: "Food", icon: UtensilsCrossed, hint: "Restaurants, coffee and places to eat" },
  { id: "RETAIL", label: "Retail", icon: ShoppingBag, hint: "Shopping and stores nearby" },
  { id: "SERVICES", label: "Services", icon: Store, hint: "Local businesses and service providers" },
  { id: "EVENTS", label: "Things to do", icon: Compass, hint: "Activities and places worth exploring" },
];

const FOOD_CHIPS = ["Fast Food", "Pizza", "Chinese", "Mexican", "Burgers", "Wings", "BBQ", "Seafood", "Italian", "Breakfast", "Coffee", "Desserts", "Healthy", "American"];
const SERVICE_CHIPS = ["Dentist", "Eye Doctor", "Barber", "Mechanic", "Plumber", "Electrician", "HVAC", "Tree Service"];

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
  const [category, setCategory] = useState("FOOD");
  const [query, setQuery] = useState("");
  const [useCurrent, setUseCurrent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function runSearch(nextCategory = category, nextQuery = query, current = useCurrent) {
    setLoading(true);
    setError("");
    try {
      const result = await searchLocalDiscovery({ category: nextCategory, query: nextQuery, useCurrentLocation: current });
      setData(result);
      if (result?.available === false && result?.detail) setError(result.detail);
    } catch (err) {
      setError(err?.response?.data?.detail || "Local discovery is temporarily unavailable.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runSearch("FOOD", "", true); }, []);

  const results = useMemo(() => Array.isArray(data?.results) ? data.results : [], [data]);
  const topRated = useMemo(() => [...results].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0) || Number(b.user_ratings_total || 0) - Number(a.user_ratings_total || 0)), [results]);
  const sourceLabel = data?.context?.source === "CURRENT" ? "Current location" : data?.context?.source === "HOME_FALLBACK" ? "Home fallback" : "Home";
  const chips = category === "FOOD" ? FOOD_CHIPS : category === "SERVICES" ? SERVICE_CHIPS : [];

  function chooseChip(value) {
    setQuery(value);
    runSearch(category, value, useCurrent);
  }

  return (
    <DashboardShell modeBarTitle="SyncWorks" modeBarSubtitle="Local discovery">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_86%_12%,rgba(139,92,246,.22),transparent_32%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Local discovery</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find what you need where you are.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Browse nearby places using Google-backed place information. Current Location is used when you allow it; otherwise SyncWorks safely falls back to Home.</p>
            </div>
            <button type="button" onClick={() => nav("/profile")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-200"><Settings2 className="h-4 w-4" />Location settings</button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-violet-400/18 bg-violet-500/[.045] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200"><Stethoscope className="h-5 w-5" /></div><div><div className="text-sm font-black text-white">Dentists, eye doctors & appointment businesses</div><p className="mt-1 text-xs leading-5 text-slate-400">Search claimed SyncWorks practices and filter by insurance, then manage appointment responses in your account.</p></div></div>
            <button type="button" onClick={() => nav("/customer/discover/professional")} className="min-h-11 shrink-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white">Professional search</button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map(({ id, label, icon: Icon, hint }) => (
              <button key={id} type="button" onClick={() => { setCategory(id); setQuery(""); runSearch(id, "", useCurrent); }} className={`min-h-28 rounded-2xl border p-3 text-left transition ${category === id ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/[.02]"}`}>
                <Icon className={`h-5 w-5 ${category === id ? "text-cyan-200" : "text-slate-500"}`} />
                <div className="mt-2 text-sm font-black text-white">{label}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{hint}</div>
              </button>
            ))}
          </div>

          {chips.length ? <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{chips.map((chip) => <button key={chip} type="button" onClick={() => chooseChip(chip)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${query.toLowerCase() === chip.toLowerCase() ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-300"}`}>{chip}</button>)}</div> : null}

          <form onSubmit={(event) => { event.preventDefault(); runSearch(); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={category === "FOOD" ? "Restaurant, pizza, tacos, coffee..." : "What are you looking for?"} className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" /></div>
            <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search</button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">{data?.context?.source === "CURRENT" ? <Navigation className="h-4 w-4 shrink-0 text-violet-200" /> : <MapPin className="h-4 w-4 shrink-0 text-cyan-200" />}<span className="truncate"><b className="text-white">{sourceLabel}</b> · {locationLabel(data)}</span></div>
            <button type="button" onClick={() => { const next = !useCurrent; setUseCurrent(next); runSearch(category, query, next); }} className={`rounded-xl border px-3 py-2 text-[11px] font-black ${useCurrent ? "border-violet-400/25 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{useCurrent ? "Current location ON" : "Current location OFF"}</button>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-sm text-amber-100">{error}</div> : null}

        {topRated.length ? (
          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Google-backed discovery</div><h2 className="mt-1 text-xl font-black text-white">Top rated near you</h2></div><span className="text-xs font-bold text-slate-500">{topRated.length} results</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {topRated.map((place, index) => (
                <article key={place.place_id || `${place.name}-${place.address}`} className="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">#{index + 1} by rating</div><h3 className="mt-1 text-base font-black text-white">{place.name}</h3><div className="mt-1 text-xs leading-5 text-slate-500">{place.address || "Nearby"}</div><PlaceMeta place={place} />
                  <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => window.open(directionsUrl(place), "_blank", "noopener,noreferrer")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.07] px-4 text-xs font-black text-cyan-100"><Route className="h-4 w-4" />Directions</button>{category === "SERVICES" ? <button type="button" onClick={() => nav("/customer/new-request")} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-xs font-black text-slate-200">Start request</button> : null}</div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && data && !results.length && !error ? <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-slate-400">No nearby results found for this search.</div> : null}

        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs leading-5 text-slate-500">Local results currently use available Google place data; they are not paid or proprietary SYNC recommendations. Current device location is request-only and is never saved over Home.</div>
      </div>
    </DashboardShell>
  );
}

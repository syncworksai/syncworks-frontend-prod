import React, { useEffect, useMemo, useState } from "react";
import { Compass, LoaderCircle, MapPin, Navigation, Search, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardShell from "../components/dashboard/DashboardShell";
import { searchLocalDiscovery } from "../api/localDiscovery";

const CATEGORIES = [
  { id: "FOOD", label: "Food", icon: UtensilsCrossed, hint: "Restaurants, coffee and places to eat" },
  { id: "RETAIL", label: "Retail", icon: ShoppingBag, hint: "Shopping and stores nearby" },
  { id: "SERVICES", label: "Services", icon: Store, hint: "Useful businesses and services around you" },
  { id: "EVENTS", label: "Things to do", icon: Compass, hint: "Activities and places worth exploring" },
];

function locationLabel(payload) {
  const location = payload?.location || payload?.context?.location || {};
  if (payload?.context?.source === "CURRENT") return location.label || "Current location";
  return location.formatted_address || [location.city, location.state].filter(Boolean).join(", ") || "Home location";
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
      const result = await searchLocalDiscovery({
        category: nextCategory,
        query: nextQuery,
        useCurrentLocation: current,
      });
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
  const sourceLabel = data?.context?.source === "CURRENT" ? "Current location" : data?.context?.source === "HOME_FALLBACK" ? "Home fallback" : "Home";

  return (
    <DashboardShell modeBarTitle="SyncWorks" modeBarSubtitle="Local discovery">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_15%,rgba(139,92,246,.2),transparent_34%),rgba(2,6,23,.9)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">SYNC Local</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find what you need where you are.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Food, retail, services and things to do use your current location when allowed. If location is unavailable, SyncWorks falls back to Home without changing it.</p>
            </div>
            <button type="button" onClick={() => nav("/profile")} className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-black text-slate-200">Location settings</button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map(({ id, label, icon: Icon, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setCategory(id); runSearch(id, query, useCurrent); }}
                className={`rounded-2xl border p-3 text-left transition ${category === id ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/10 bg-white/[.02]"}`}
              >
                <Icon className={`h-5 w-5 ${category === id ? "text-cyan-200" : "text-slate-500"}`} />
                <div className="mt-2 text-sm font-black text-white">{label}</div>
                <div className="mt-1 text-[10px] leading-4 text-slate-500">{hint}</div>
              </button>
            ))}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); runSearch(); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try sushi, sporting goods, barber, playground..." className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
            </div>
            <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search</button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {data?.context?.source === "CURRENT" ? <Navigation className="h-4 w-4 text-violet-200" /> : <MapPin className="h-4 w-4 text-cyan-200" />}
              <span><b className="text-white">{sourceLabel}</b> · {locationLabel(data)}</span>
            </div>
            <button type="button" onClick={() => { const next = !useCurrent; setUseCurrent(next); runSearch(category, query, next); }} className={`rounded-xl border px-3 py-2 text-[11px] font-black ${useCurrent ? "border-violet-400/25 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>
              {useCurrent ? "Use current location: ON" : "Use current location: OFF"}
            </button>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-sm text-amber-100">{error}</div> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((place) => (
            <article key={place.place_id || `${place.name}-${place.address}`} className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-white">{place.name}</h2>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{place.address || "Nearby"}</div>
                </div>
                {place.open_now !== null && place.open_now !== undefined ? <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${place.open_now ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-rose-400/20 bg-rose-500/10 text-rose-200"}`}>{place.open_now ? "Open" : "Closed"}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400">
                {place.rating ? <span className="rounded-full border border-amber-400/15 bg-amber-500/[.05] px-2 py-1">★ {place.rating} ({place.user_ratings_total || 0})</span> : null}
                {place.price_level !== null && place.price_level !== undefined ? <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1">{"$".repeat(Math.max(1, Number(place.price_level)))}</span> : null}
              </div>
            </article>
          ))}
        </section>

        {!loading && data && !results.length && !error ? <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-slate-400">No nearby results found for this search.</div> : null}

        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs leading-5 text-slate-500">Current device location is used for this request only and is not saved as Home. This is the shared discovery foundation for future restaurants, retail, events, services and SYNC recommendations.</div>
      </div>
    </DashboardShell>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Compass,
  LoaderCircle,
  MapPin,
  Navigation,
  Route,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
} from "lucide-react";
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

function priceLabel(value) {
  if (value === null || value === undefined) return "";
  return "$".repeat(Math.max(1, Math.min(4, Number(value) || 1)));
}

function directionsUrl(place) {
  const destination = place?.place_id
    ? `place_id:${place.place_id}`
    : place?.latitude != null && place?.longitude != null
      ? `${place.latitude},${place.longitude}`
      : place?.address || place?.name || "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function PlaceActions({ place, category, nav, primary = false }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => window.open(directionsUrl(place), "_blank", "noopener,noreferrer")}
        className={`${primary ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white" : "border border-cyan-400/20 bg-cyan-500/[.07] text-cyan-100"} inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black`}
      >
        <Route className="h-4 w-4" /> Directions
      </button>
      <button
        type="button"
        onClick={() => nav(`/sync?return=${encodeURIComponent("/customer/discover")}`)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/[.07] px-4 text-xs font-black text-violet-100"
      >
        <Sparkles className="h-4 w-4" /> Ask SYNC
      </button>
      {category === "SERVICES" ? (
        <button
          type="button"
          onClick={() => nav("/customer/new-request")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-xs font-black text-slate-200"
        >
          Start request <ArrowUpRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function PlaceMeta({ place }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400">
      {place.distance_miles !== null && place.distance_miles !== undefined ? (
        <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[.05] px-2 py-1">{place.distance_miles} mi away</span>
      ) : null}
      {place.rating ? (
        <span className="rounded-full border border-amber-400/15 bg-amber-500/[.05] px-2 py-1">★ {place.rating} ({place.user_ratings_total || 0})</span>
      ) : null}
      {priceLabel(place.price_level) ? (
        <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1">{priceLabel(place.price_level)}</span>
      ) : null}
      {place.open_now !== null && place.open_now !== undefined ? (
        <span className={`rounded-full border px-2 py-1 ${place.open_now ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-rose-400/20 bg-rose-500/10 text-rose-200"}`}>
          {place.open_now ? "Open now" : "Closed"}
        </span>
      ) : null}
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
  const recommended = results[0] || null;
  const remaining = results.slice(1);
  const sourceLabel = data?.context?.source === "CURRENT" ? "Current location" : data?.context?.source === "HOME_FALLBACK" ? "Home fallback" : "Home";

  return (
    <DashboardShell modeBarTitle="SyncWorks" modeBarSubtitle="SYNC Local">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_86%_12%,rgba(139,92,246,.24),transparent_32%),radial-gradient(circle_at_15%_90%,rgba(34,211,238,.10),transparent_30%),rgba(2,6,23,.94)] p-5 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-7">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">SYNC Local</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200">Context aware</span>
              </div>
              <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">Find what you need where you actually are.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">SYNC uses Current Location for nearby decisions when you allow it and automatically falls back to Home when you do not. Home is never replaced.</p>
            </div>
            <button type="button" onClick={() => nav("/profile")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-200">
              <Settings2 className="h-4 w-4" /> Location settings
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map(({ id, label, icon: Icon, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setCategory(id); runSearch(id, query, useCurrent); }}
                className={`min-h-28 rounded-2xl border p-3 text-left transition ${category === id ? "border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,.05)]" : "border-white/10 bg-white/[.02] hover:bg-white/[.04]"}`}
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
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try sushi, softball tape, barber, playground..." className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
            </div>
            <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
              {data?.context?.source === "CURRENT" ? <Navigation className="h-4 w-4 shrink-0 text-violet-200" /> : <MapPin className="h-4 w-4 shrink-0 text-cyan-200" />}
              <span className="truncate"><b className="text-white">{sourceLabel}</b> · {locationLabel(data)}</span>
            </div>
            <button type="button" onClick={() => { const next = !useCurrent; setUseCurrent(next); runSearch(category, query, next); }} className={`rounded-xl border px-3 py-2 text-[11px] font-black ${useCurrent ? "border-violet-400/25 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>
              {useCurrent ? "Current location ON" : "Current location OFF"}
            </button>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-sm text-amber-100">{error}</div> : null}

        {recommended ? (
          <section className="overflow-hidden rounded-[1.75rem] border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.18),transparent_38%),rgba(2,6,23,.72)] p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-violet-100"><Sparkles className="h-3 w-3" /> SYNC pick</span>
                  {recommended.sync_score !== null && recommended.sync_score !== undefined ? <span className="text-[10px] font-black uppercase tracking-[.15em] text-slate-500">Match {Math.round(recommended.sync_score)}%</span> : null}
                </div>
                <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">{recommended.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{recommended.address || "Nearby"}</p>
                <PlaceMeta place={recommended} />
                {Array.isArray(recommended.why) && recommended.why.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recommended.why.map((reason) => <span key={reason} className="rounded-full border border-emerald-400/15 bg-emerald-500/[.06] px-2.5 py-1 text-[10px] font-bold text-emerald-200">{reason}</span>)}
                  </div>
                ) : null}
                <PlaceActions place={recommended} category={category} nav={nav} primary />
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Why this is first</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{data?.decision?.reason || "SYNC compares nearby options using the location and available place information."}</p>
              </div>
            </div>
          </section>
        ) : null}

        {remaining.length ? (
          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Nearby options</div>
                <h2 className="mt-1 text-xl font-black text-white">More strong matches</h2>
              </div>
              <span className="text-xs font-bold text-slate-500">{results.length} results</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {remaining.map((place) => (
                <article key={place.place_id || `${place.name}-${place.address}`} className="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-4 transition hover:border-cyan-400/20 hover:bg-slate-950/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">#{place.rank || "–"}</div>
                      <h3 className="mt-1 truncate text-base font-black text-white">{place.name}</h3>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{place.address || "Nearby"}</div>
                    </div>
                    {place.sync_score !== null && place.sync_score !== undefined ? <span className="shrink-0 rounded-full border border-cyan-400/15 bg-cyan-500/[.05] px-2 py-1 text-[9px] font-black text-cyan-200">{Math.round(place.sync_score)}%</span> : null}
                  </div>
                  <PlaceMeta place={place} />
                  <PlaceActions place={place} category={category} nav={nav} />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && data && !results.length && !error ? <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-slate-400">No nearby results found for this search.</div> : null}

        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs leading-5 text-slate-500">
          Current device location is used only for the active request and is never saved as Home. SYNC recommendations are decision support based on available place data; availability, hours, pricing and service quality should be confirmed with the provider.
        </div>
      </div>
    </DashboardShell>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { ClipboardPaste, LoaderCircle, MapPin, Search, X } from "lucide-react";
import api from "../api/client";
import { resolveCurrentLocation } from "../api/identity";

function normalizePlace(row = {}) {
  const address = row.address_line1 || row.address || row.label || "";
  return {
    ...row,
    place_id: row.place_id || row.id || `${row.latitude || ""}:${row.longitude || ""}:${address}`,
    name: row.name || row.location_name || address,
    address,
    address_line1: row.address_line1 || address,
    formatted_address: row.label || row.formatted_address || address,
  };
}

export default function PlaceSearchField({ value = "", onChange, onSelect, label = "Find a place or address", placeholder = "8700 Minnie Brown Road, Lagoon Park, or McDonald’s" }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const requestRef = useRef(0);

  useEffect(() => { setQuery(value || ""); }, [value]);

  async function searchPlaces() {
    const text = String(query || "").trim();
    if (text.length < 3) {
      setMessage("Enter at least 3 characters, then press Search or Enter.");
      setResults([]);
      return;
    }

    const requestId = ++requestRef.current;
    setBusy(true);
    setMessage("");
    setResults([]);

    try {
      const addressResponse = await api.get("/personal-calendar/places/search/", { params: { q: text } });
      if (requestId !== requestRef.current) return;
      let rows = (addressResponse?.data?.results || []).map(normalizePlace);

      if (!rows.length) {
        try {
          const nearbyResponse = await api.post("/identity/discover/", {
            category: "NEARBY",
            query: text,
            radius_meters: 50000,
          });
          rows = (nearbyResponse?.data?.results || []).map(normalizePlace);
        } catch {
          // Street-address search is primary; named-place fallback is optional.
        }
      }

      setResults(rows.slice(0, 8));
      if (!rows.length) {
        setMessage("No match found. Check the city/state or keep the typed address and fill the fields manually.");
      }
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setMessage(error?.response?.data?.detail || "Address search is temporarily unavailable. You can still enter the address manually.");
    } finally {
      if (requestId === requestRef.current) setBusy(false);
    }
  }

  async function choose(rawPlace) {
    const place = normalizePlace(rawPlace);
    setQuery(place.formatted_address || place.address || place.name || "");
    onChange?.(place.formatted_address || place.address || place.name || "");
    setResults([]);
    setMessage("");

    if (place.address_line1 && (place.city || place.state || place.postal_code)) {
      onSelect?.({
        ...place,
        location_name: place.name || "",
        address_line1: place.address_line1,
        formatted_address: place.formatted_address || place.address,
      });
      return;
    }

    setBusy(true);
    try {
      const resolved = place.latitude != null && place.longitude != null
        ? await resolveCurrentLocation(place.latitude, place.longitude)
        : {};
      onSelect?.({
        ...place,
        ...resolved,
        location_name: place.name || resolved.label || "",
        address_line1: resolved.address_line1 || place.address_line1 || place.address || "",
        formatted_address: resolved.label || place.formatted_address || place.address || "",
      });
    } finally {
      setBusy(false);
    }
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setQuery(text);
      onChange?.(text);
      setMessage("Address pasted. Press Search or Enter to resolve it.");
    } catch {
      setMessage("Press and hold in the search box to paste.");
    }
  }

  return <label className="relative block">
    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
    <div className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); onChange?.(event.target.value); setMessage(""); }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); searchPlaces(); } }}
          placeholder={placeholder}
          autoComplete="street-address"
          className="h-11 w-full rounded-xl border border-cyan-400/20 bg-slate-950/90 pl-9 pr-9 text-sm text-white outline-none focus:border-cyan-300/50"
        />
        {busy ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-300" /> : query ? <button type="button" onClick={() => { setQuery(""); onChange?.(""); setResults([]); setMessage(""); }} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-slate-500" aria-label="Clear address"><X className="h-3.5 w-3.5" /></button> : null}
      </div>
      <button type="button" onClick={searchPlaces} disabled={busy} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 text-[11px] font-black text-cyan-100 disabled:opacity-50" aria-label="Search address"><Search className="h-4 w-4" /><span className="hidden sm:inline">Search</span></button>
      <button type="button" onClick={paste} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300" aria-label="Paste address"><ClipboardPaste className="h-4 w-4" /></button>
    </div>
    <span className="mt-1 block text-[9px] text-slate-600">Press Enter or Search to look up the full street address.</span>
    {results.length ? <div className="absolute z-[160] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-cyan-400/25 bg-[#050b16] p-2 shadow-2xl">{results.map((place) => <button type="button" key={place.place_id} onClick={() => choose(place)} className="flex w-full gap-3 rounded-xl p-3 text-left hover:bg-cyan-500/10"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><span className="min-w-0"><b className="block truncate text-sm text-white">{place.name || place.address}</b><span className="mt-0.5 block text-[11px] text-slate-400">{place.formatted_address || place.address}{place.distance_miles != null ? ` · ${place.distance_miles} mi` : ""}</span></span></button>)}</div> : null}
    {message ? <span className="mt-1.5 block text-[10px] text-slate-500">{message}</span> : null}
  </label>;
}

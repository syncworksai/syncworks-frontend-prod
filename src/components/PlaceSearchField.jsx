import React, { useEffect, useRef, useState } from "react";
import { ClipboardPaste, LoaderCircle, MapPin, Search, X } from "lucide-react";
import api from "../api/client";
import { resolveCurrentLocation } from "../api/identity";

export default function PlaceSearchField({ value = "", onChange, onSelect, label = "Find a place or address", placeholder = "Lagoon Park, McDonald’s, or paste an address" }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const requestRef = useRef(0);
  const skipSearchRef = useRef(false);

  useEffect(() => { setQuery(value || ""); }, [value]);
  useEffect(() => {
    const text = query.trim();
    if (skipSearchRef.current) { skipSearchRef.current = false; return undefined; }
    if (text.length < 3) { setResults([]); return undefined; }
    const timer = window.setTimeout(async () => {
      const requestId = ++requestRef.current;
      setBusy(true); setMessage("");
      try {
        const response = await api.post("/identity/discover/", { category: "NEARBY", query: text, radius_meters: 50000 });
        if (requestId !== requestRef.current) return;
        const rows = response?.data?.results || [];
        setResults(rows.slice(0, 6));
        if (!rows.length) setMessage("No nearby matches. You can still use the typed address.");
      } catch { if (requestId === requestRef.current) setMessage("Place search is unavailable. You can still enter the address manually."); }
      finally { if (requestId === requestRef.current) setBusy(false); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query, value]);

  async function choose(place) {
    skipSearchRef.current = true;
    setQuery(place.name || place.address || "");
    onChange?.(place.name || place.address || "");
    setResults([]); setBusy(true);
    try {
      const resolved = place.latitude != null && place.longitude != null ? await resolveCurrentLocation(place.latitude, place.longitude) : {};
      onSelect?.({ ...place, ...resolved, location_name: place.name || resolved.label || "", address_line1: resolved.address_line1 || place.address || "", formatted_address: resolved.label || place.address || "" });
    } finally { setBusy(false); }
  }

  async function paste() {
    try { const text = await navigator.clipboard.readText(); setQuery(text); onChange?.(text); }
    catch { setMessage("Press and hold in the search box to paste."); }
  }

  return <label className="relative block">
    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
    <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300"/><input value={query} onChange={(event) => { setQuery(event.target.value); onChange?.(event.target.value); }} placeholder={placeholder} autoComplete="off" className="h-11 w-full rounded-xl border border-cyan-400/20 bg-slate-950/90 pl-9 pr-9 text-sm text-white outline-none focus:border-cyan-300/50"/>{busy ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-300"/> : query ? <button type="button" onClick={() => { setQuery(""); onChange?.(""); setResults([]); }} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-slate-500"><X className="h-3.5 w-3.5"/></button> : null}</div><button type="button" onClick={paste} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300" aria-label="Paste address"><ClipboardPaste className="h-4 w-4"/></button></div>
    {results.length ? <div className="absolute z-[160] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-cyan-400/25 bg-[#050b16] p-2 shadow-2xl">{results.map((place) => <button type="button" key={place.place_id || `${place.name}-${place.address}`} onClick={() => choose(place)} className="flex w-full gap-3 rounded-xl p-3 text-left hover:bg-cyan-500/10"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300"/><span className="min-w-0"><b className="block truncate text-sm text-white">{place.name || place.address}</b><span className="mt-0.5 block text-[11px] text-slate-400">{place.address}{place.distance_miles != null ? ` · ${place.distance_miles} mi` : ""}</span></span></button>)}</div> : null}
    {message ? <span className="mt-1.5 block text-[10px] text-slate-500">{message}</span> : null}
  </label>;
}

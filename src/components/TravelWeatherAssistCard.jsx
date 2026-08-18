import React, { useMemo, useState } from "react";
import { AlertTriangle, Car, CloudRain, LocateFixed, Navigation, RefreshCw, Sparkles } from "lucide-react";
import api from "../api/client";

function minutes(seconds) {
  return Math.max(0, Math.round(Number(seconds || 0) / 60));
}

function miles(meters) {
  if (!meters) return null;
  return (Number(meters) / 1609.344).toFixed(Number(meters) > 160934 ? 0 : 1);
}

function riskTone(risk) {
  if (risk === "HIGH") return "border-rose-400/25 bg-rose-500/10 text-rose-100";
  if (risk === "MODERATE") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
}

function getDevicePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location services are not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      (error) => reject(new Error(error?.message || "Could not access your current location.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 },
    );
  });
}

export default function TravelWeatherAssistCard({ event, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [livePlan, setLivePlan] = useState(null);
  const cachedPlan = event?.metadata?.travel_assist || null;
  const plan = livePlan || cachedPlan;
  const route = plan?.route || {};
  const weather = plan?.weather || {};
  const hasDestination = Boolean(event && (event.location_name || event.address_line1 || (event.latitude != null && event.longitude != null)));
  const generated = useMemo(() => plan?.generated_at ? new Date(plan.generated_at) : null, [plan?.generated_at]);

  async function planTrip() {
    if (!event?.id) return;
    setBusy(true);
    setError("");
    try {
      const location = await getDevicePosition();
      const response = await api.post(`/personal-calendar/events/${event.id}/travel-plan/`, location);
      setLivePlan(response.data);
      onUpdated?.();
    } catch (e) {
      setError(e?.response?.data?.[0] || e?.response?.data?.detail || e?.message || "Could not build your travel briefing.");
    } finally {
      setBusy(false);
    }
  }

  if (!event) {
    return (
      <section className="rounded-[1.9rem] border border-white/10 bg-slate-950/55 p-4 sm:p-5">
        <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Travel + Weather Assist</div>
        <div className="mt-2 text-sm text-slate-400">Your next located calendar event will get a leave-by and weather briefing here.</div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.9rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.13),transparent_32%),linear-gradient(145deg,rgba(15,23,42,.96),rgba(2,6,23,.96))] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><Sparkles className="h-3.5 w-3.5" />SYNC Assist · Travel + Weather</div>
          <h2 className="mt-2 text-xl font-black text-white">Prepare for {event.title}</h2>
          <p className="mt-1 text-sm text-slate-400">Uses your current device location, event destination, arrival buffer, traffic and event-time weather to calculate when you should leave.</p>
        </div>
        <button type="button" disabled={busy || !hasDestination} onClick={planTrip} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {plan ? "Refresh from my location" : "Use my location"}
        </button>
      </div>

      {!hasDestination ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">Add a venue, address or destination coordinates to this calendar event before SYNC Assist can plan the trip.</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

      {plan ? <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500"><Navigation className="h-3.5 w-3.5" />Leave by</div>
            <div className="mt-2 text-lg font-black text-white">{route.leave_by ? new Date(route.leave_by).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Pending route"}</div>
            <div className="mt-1 text-xs text-slate-500">Target: {plan.arrival_buffer_minutes || 0} min early</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500"><Car className="h-3.5 w-3.5" />Drive</div>
            <div className="mt-2 text-lg font-black text-white">{route.status === "READY" ? `${minutes(route.duration_seconds)} min` : "Not ready"}</div>
            <div className="mt-1 text-xs text-slate-500">{miles(route.distance_meters) ? `${miles(route.distance_meters)} mi` : route.detail || route.status}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500"><AlertTriangle className="h-3.5 w-3.5" />Traffic</div>
            <div className={`mt-2 text-lg font-black ${minutes(route.traffic_delay_seconds) >= 10 ? "text-amber-200" : "text-white"}`}>{route.status === "READY" ? `+${minutes(route.traffic_delay_seconds)} min` : "Unavailable"}</div>
            <div className="mt-1 text-xs text-slate-500">{route.traffic_aware ? "Traffic-aware route" : "No live traffic yet"}</div>
          </div>
          <div className={`rounded-2xl border p-3 ${weather.status === "READY" ? riskTone(weather.risk) : "border-white/10 bg-black/20 text-slate-300"}`}>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] opacity-70"><CloudRain className="h-3.5 w-3.5" />Weather</div>
            <div className="mt-2 text-lg font-black">{weather.status === "READY" ? `${weather.temperature}°${weather.temperature_unit || "F"}` : "Pending"}</div>
            <div className="mt-1 text-xs opacity-75">{weather.status === "READY" ? `${weather.short_forecast} · ${weather.precipitation_probability || 0}% precip` : weather.detail || weather.status}</div>
          </div>
        </div>

        {Array.isArray(plan.recommendations) && plan.recommendations.length ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.035] p-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">SYNC briefing</div><div className="mt-2 space-y-1.5 text-sm leading-6 text-slate-200">{plan.recommendations.map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}</div></div> : null}
        <div className="mt-3 text-[10px] text-slate-600">{generated ? `Updated ${generated.toLocaleString()}` : ""} · Current location is used for calculation and is not stored in this briefing.</div>
      </> : <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Tap <b className="text-slate-300">Use my location</b> to generate the first travel and weather briefing.</div>}
    </section>
  );
}

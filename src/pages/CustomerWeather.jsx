import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, CloudRain, CloudSun, Droplets, LoaderCircle, MapPin, Navigation, RefreshCw, Wind } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { getBrowserCurrentLocation } from "../api/locationContext";
import { getLiveWeather, liveContextError } from "../api/liveContext";

function clock(timestamp, timezone) {
  if (!timestamp) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone || undefined }).format(new Date(timestamp * 1000));
  } catch {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
}

function dayLabel(timestamp, timezone, index) {
  if (index === 0) return "Today";
  try {
    return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone || undefined }).format(new Date(timestamp * 1000));
  } catch {
    return new Date(timestamp * 1000).toLocaleDateString([], { weekday: "short" });
  }
}

function highOf(item) {
  return item?.high_f ?? item?.temp_high_f ?? item?.max_temp_f ?? item?.temp?.max ?? item?.temperature?.max ?? item?.temp_f ?? "—";
}

function lowOf(item) {
  return item?.low_f ?? item?.temp_low_f ?? item?.min_temp_f ?? item?.temp?.min ?? item?.temperature?.min ?? item?.temp_f ?? "—";
}

export default function CustomerWeather() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [mapUrl, setMapUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedHour, setSelectedHour] = useState(0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const currentLocation = await getBrowserCurrentLocation({ enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 });
      const [weatherResult, mapResult] = await Promise.allSettled([
        getLiveWeather(currentLocation),
        api.get("/identity/map-preview/", {
          params: { latitude: currentLocation.latitude, longitude: currentLocation.longitude, zoom: 8 },
          responseType: "blob",
        }),
      ]);
      if (weatherResult.status === "rejected") throw weatherResult.reason;
      setData(weatherResult.value);
      setSelectedHour(0);
      if (mapResult.status === "fulfilled") {
        const nextUrl = URL.createObjectURL(mapResult.value.data);
        setMapUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return nextUrl;
        });
      }
    } catch (err) {
      setData(null);
      setError(liveContextError(err, "Live weather is temporarily unavailable."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      setMapUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
    };
  }, []);

  const current = data?.current || {};
  const timezone = data?.location?.timezone;
  const nextRain = data?.minute_forecast?.next_precipitation;
  const hourly = useMemo(() => (Array.isArray(data?.hourly) ? data.hourly.slice(0, 24) : []), [data]);
  const daily = useMemo(() => (Array.isArray(data?.daily) ? data.daily.slice(0, 8) : []), [data]);
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
  const focusHour = hourly[selectedHour] || null;

  return (
    <div className="min-h-dvh bg-[#020617] px-3 pb-32 pt-4 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => nav("/customer")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-4 text-sm font-black"><ArrowLeft className="h-4 w-4" />Back</button>
          <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</button>
        </div>

        {error ? <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
          <section className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_10%,rgba(59,130,246,.26),transparent_38%),radial-gradient(circle_at_10%_90%,rgba(139,92,246,.18),transparent_38%),rgba(3,8,23,.96)] p-5 shadow-[0_20px_70px_rgba(0,0,0,.3)]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Navigation className="h-4 w-4" />Live at your location</div>
            {loading && !data ? <div className="mt-8 flex items-center gap-3 text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" />Getting live weather…</div> : null}
            {data ? <>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div><div className="text-6xl font-black tracking-tight text-white">{Math.round(Number(current.temp_f || 0))}°</div><div className="mt-2 text-xl font-black capitalize text-white">{current.description || current.condition || "Current weather"}</div><div className="mt-1 text-sm text-slate-400">Feels like {Math.round(Number(current.feels_like_f ?? current.temp_f ?? 0))}°</div></div>
                <CloudSun className="h-14 w-14 text-cyan-200" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><Droplets className="h-4 w-4 text-cyan-300" /><div className="mt-2 text-lg font-black">{current.humidity ?? "—"}%</div><div className="text-[10px] text-slate-500">Humidity</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><Wind className="h-4 w-4 text-violet-300" /><div className="mt-2 text-lg font-black">{current.wind_mph ?? "—"}</div><div className="text-[10px] text-slate-500">mph wind</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><CloudRain className="h-4 w-4 text-blue-300" /><div className="mt-2 text-lg font-black">{data.minute_forecast?.available ? (nextRain ? clock(nextRain.timestamp, timezone) : "Clear") : "—"}</div><div className="text-[10px] text-slate-500">Next rain</div></div>
              </div>
            </> : null}
          </section>

          <section className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-blue-400/20 bg-[#06101f]">
            {mapUrl ? <img src={mapUrl} alt="Weather forecast map centered on your location" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020617]/95 via-[#020617]/20 to-[#020617]/35" />
            <div className="absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-blue-200"><MapPin className="h-3.5 w-3.5" />24-hour weather map</div>
              <div className="mt-1 text-xs text-slate-400">Scrub the next 24 hours for temperature and precipitation outlook.</div>
            </div>

            {focusHour ? <div className="absolute bottom-24 left-4 right-4 rounded-2xl border border-white/10 bg-slate-950/85 p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="text-xs font-black text-cyan-200">{selectedHour === 0 ? "Now" : clock(focusHour.timestamp, timezone)}</div><div className="mt-1 text-3xl font-black text-white">{Math.round(Number(focusHour.temp_f ?? current.temp_f ?? 0))}°</div></div>
                <div className="text-right"><div className="text-sm font-black capitalize text-white">{focusHour.description || focusHour.condition || "Forecast"}</div><div className="mt-1 text-xs text-blue-200">{focusHour.precip_probability || 0}% precipitation</div></div>
              </div>
            </div> : null}

            {hourly.length ? <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-slate-950/90 p-3 backdrop-blur-xl">
              <input aria-label="24 hour forecast timeline" type="range" min="0" max={Math.max(0, hourly.length - 1)} value={Math.min(selectedHour, Math.max(0, hourly.length - 1))} onChange={(event) => setSelectedHour(Number(event.target.value))} className="w-full accent-cyan-400" />
              <div className="mt-1 flex justify-between text-[9px] font-bold text-slate-500"><span>Now</span><span>+6h</span><span>+12h</span><span>+18h</span><span>+24h</span></div>
            </div> : null}
          </section>
        </div>

        {data?.minute_forecast?.available ? <section className="rounded-[1.75rem] border border-blue-400/15 bg-blue-500/[.04] p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-200">Next 60 minutes</div><div className="mt-2 text-lg font-black text-white">{nextRain ? `Precipitation starts around ${clock(nextRain.timestamp, timezone)}` : "No measurable precipitation expected in the next hour"}</div><div className="mt-1 text-xs text-slate-500">Minute-by-minute precipitation outlook.</div></section> : null}

        {alerts.length ? <section className="space-y-2">{alerts.map((alert, index) => <div key={`${alert.event}-${index}`} className="rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 p-4"><div className="flex items-center gap-2 text-sm font-black text-amber-100"><AlertTriangle className="h-4 w-4" />{alert.event}</div><p className="mt-2 line-clamp-5 text-xs leading-5 text-amber-100/75">{alert.description}</p></div>)}</section> : null}

        {hourly.length ? <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Next 24 hours</div><div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">{hourly.map((item, index) => <button type="button" onClick={() => setSelectedHour(index)} key={item.timestamp || index} className={`min-w-[92px] rounded-2xl border p-3 text-center ${selectedHour === index ? "border-cyan-300/30 bg-cyan-500/10" : "border-white/10 bg-slate-950/65"}`}><div className="text-[10px] font-bold text-slate-500">{index === 0 ? "Now" : clock(item.timestamp, timezone)}</div><div className="mt-2 text-xl font-black text-white">{Math.round(Number(item.temp_f || 0))}°</div><div className="mt-1 text-[9px] text-cyan-200">{item.precip_probability || 0}% rain</div><div className="mt-1 line-clamp-2 text-[9px] capitalize text-slate-500">{item.description || item.condition}</div></button>)}</div></section> : null}

        {daily.length ? <section className="rounded-[1.75rem] border border-violet-400/15 bg-violet-500/[.035] p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-violet-200"><CalendarDays className="h-4 w-4" />Daily forecast</div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{daily.map((item, index) => <div key={item.timestamp || item.date || index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="text-xs font-black text-white">{dayLabel(item.timestamp || item.dt || Math.floor(Date.now() / 1000) + index * 86400, timezone, index)}</div><div className="mt-2 flex items-center justify-between"><CloudSun className="h-6 w-6 text-cyan-200" /><div className="text-right"><div className="text-lg font-black text-white">{Math.round(Number(highOf(item)) || 0)}°</div><div className="text-xs text-slate-500">{Math.round(Number(lowOf(item)) || 0)}° low</div></div></div><div className="mt-2 text-[10px] capitalize text-slate-400">{item.description || item.condition || item.summary || "Forecast"}</div><div className="mt-1 text-[9px] text-blue-200">{item.precip_probability ?? item.pop ?? 0}% precipitation</div></div>)}</div></section> : null}

        <div className="text-center text-[10px] leading-5 text-slate-600">Weather uses your current device location for this request and does not save it as your Home address. The map timeline is a forecast outlook; true animated radar imagery can be added when a forecast-radar tile source is enabled on the backend.</div>
      </div>
    </div>
  );
}

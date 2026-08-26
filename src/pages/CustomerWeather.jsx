import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CloudRain, CloudSun, Droplets, LoaderCircle, Navigation, RefreshCw, Wind } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getLiveWeather, liveContextError } from "../api/liveContext";

function clock(timestamp, timezone) {
  if (!timestamp) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone || undefined }).format(new Date(timestamp * 1000));
  } catch {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
}

export default function CustomerWeather() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getLiveWeather());
    } catch (err) {
      setData(null);
      setError(liveContextError(err, "Live weather is temporarily unavailable."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const current = data?.current || {};
  const timezone = data?.location?.timezone;
  const nextRain = data?.minute_forecast?.next_precipitation;
  const hourly = useMemo(() => (Array.isArray(data?.hourly) ? data.hourly.slice(0, 8) : []), [data]);
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  return (
    <div className="min-h-dvh bg-[#020617] px-3 pb-32 pt-4 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => nav("/customer")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-4 text-sm font-black"><ArrowLeft className="h-4 w-4" />Back</button>
          <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</button>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_10%,rgba(59,130,246,.26),transparent_38%),radial-gradient(circle_at_10%_90%,rgba(139,92,246,.18),transparent_38%),rgba(3,8,23,.96)] p-5 shadow-[0_20px_70px_rgba(0,0,0,.3)]">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Navigation className="h-4 w-4" />Live at your location</div>
          {loading && !data ? <div className="mt-8 flex items-center gap-3 text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" />Getting live weather…</div> : null}
          {error ? <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">{error}</div> : null}
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

        {data?.minute_forecast?.available ? <section className="rounded-[1.75rem] border border-blue-400/15 bg-blue-500/[.04] p-4">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-200">Next 60 minutes</div>
          <div className="mt-2 text-lg font-black text-white">{nextRain ? `Precipitation starts around ${clock(nextRain.timestamp, timezone)}` : "No measurable precipitation expected in the next hour"}</div>
          <div className="mt-1 text-xs text-slate-500">Minute-by-minute precipitation from OpenWeather.</div>
        </section> : null}

        {alerts.length ? <section className="space-y-2">{alerts.map((alert, index) => <div key={`${alert.event}-${index}`} className="rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 p-4"><div className="flex items-center gap-2 text-sm font-black text-amber-100"><AlertTriangle className="h-4 w-4" />{alert.event}</div><p className="mt-2 line-clamp-5 text-xs leading-5 text-amber-100/75">{alert.description}</p></div>)}</section> : null}

        {hourly.length ? <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-4">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Next several hours</div>
          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">{hourly.map((item) => <div key={item.timestamp} className="min-w-[92px] rounded-2xl border border-white/10 bg-slate-950/65 p-3 text-center"><div className="text-[10px] font-bold text-slate-500">{clock(item.timestamp, timezone)}</div><div className="mt-2 text-xl font-black text-white">{Math.round(Number(item.temp_f || 0))}°</div><div className="mt-1 text-[9px] text-cyan-200">{item.precip_probability || 0}% rain</div><div className="mt-1 line-clamp-2 text-[9px] capitalize text-slate-500">{item.description || item.condition}</div></div>)}</div>
        </section> : null}

        <div className="text-center text-[10px] leading-5 text-slate-600">Live weather uses your current device location for this request and is not saved as your Home address.</div>
      </div>
    </div>
  );
}

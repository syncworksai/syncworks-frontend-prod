import React, { useState } from "react";
import { AlertTriangle, ArrowLeft, Clock3, Gauge, LoaderCircle, MapPin, Navigation, RefreshCw, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getLiveTraffic, liveContextError } from "../api/liveContext";

function durationLabel(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return "—";
  if (value < 60) return `${Math.round(value)} min`;
  const hours = Math.floor(value / 60);
  const rest = Math.round(value % 60);
  return `${hours}h ${rest ? `${rest}m` : ""}`.trim();
}

export default function CustomerTraffic() {
  const nav = useNavigate();
  const [destination, setDestination] = useState("");
  const [lastDestination, setLastDestination] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(value = destination) {
    const clean = String(value || "").trim();
    if (!clean) {
      setError("Enter where you are going first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getLiveTraffic(clean);
      setData(result);
      setLastDestination(clean);
    } catch (err) {
      setData(null);
      setError(liveContextError(err, "Live traffic is temporarily unavailable."));
    } finally {
      setLoading(false);
    }
  }

  const best = data?.best || {};
  const delay = Number(best.delay_minutes);
  const routes = Array.isArray(data?.routes) ? data.routes : [];

  return (
    <div className="min-h-dvh bg-[#020617] px-3 pb-32 pt-4 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => nav("/customer")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-4 text-sm font-black"><ArrowLeft className="h-4 w-4" />Back</button>
          {lastDestination ? <button type="button" onClick={() => run(lastDestination)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</button> : null}
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_8%,rgba(34,211,238,.18),transparent_34%),radial-gradient(circle_at_10%_90%,rgba(139,92,246,.18),transparent_38%),rgba(3,8,23,.96)] p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Navigation className="h-4 w-4" />Live traffic from your location</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Where are you going?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">SYNC checks the current drive against typical conditions using Mapbox live traffic.</p>
          <form onSubmit={(event) => { event.preventDefault(); run(); }} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-4"><MapPin className="h-4 w-4 shrink-0 text-violet-300" /><input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Address, park, business, city…" className="min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-slate-600" /></label>
            <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}Check traffic</button>
          </form>
          {error ? <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">{error}</div> : null}
        </section>

        {data ? <>
          <section className="rounded-[2rem] border border-violet-400/20 bg-violet-500/[.045] p-5">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-200">Best live route</div>
            <div className="mt-2 text-sm font-bold text-slate-400">To {data.destination?.label || lastDestination}</div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"><Clock3 className="h-4 w-4 text-cyan-300" /><div className="mt-2 text-2xl font-black text-white">{durationLabel(best.duration_minutes)}</div><div className="text-[10px] text-slate-500">Live drive</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"><Gauge className="h-4 w-4 text-violet-300" /><div className="mt-2 text-2xl font-black text-white">{durationLabel(best.typical_duration_minutes)}</div><div className="text-[10px] text-slate-500">Typical drive</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"><AlertTriangle className={`h-4 w-4 ${delay > 5 ? "text-amber-300" : "text-emerald-300"}`} /><div className="mt-2 text-2xl font-black text-white">{Number.isFinite(delay) ? `+${Math.max(0, Math.round(delay))}m` : "—"}</div><div className="text-[10px] text-slate-500">Traffic delay</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"><Route className="h-4 w-4 text-blue-300" /><div className="mt-2 text-2xl font-black text-white">{best.distance_miles ?? "—"}</div><div className="text-[10px] text-slate-500">Miles</div></div>
            </div>
            <div className={`mt-4 rounded-2xl border p-4 text-sm font-bold ${delay > 10 ? "border-amber-400/20 bg-amber-500/10 text-amber-100" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"}`}>{Number.isFinite(delay) ? (delay > 10 ? `Traffic is adding about ${Math.round(delay)} minutes right now.` : delay > 2 ? `Traffic is adding about ${Math.round(delay)} minutes.` : "Traffic is close to typical conditions right now.") : "Live ETA is ready. Typical travel time is not available for this route."}</div>
          </section>

          {routes.length > 1 ? <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Alternatives</div><div className="mt-3 space-y-2">{routes.slice(1).map((route) => <div key={route.rank} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div><div className="text-sm font-black text-white">Alternative {route.rank}</div><div className="mt-1 text-xs text-slate-500">{route.distance_miles} mi · {Number(route.delay_minutes) > 0 ? `+${route.delay_minutes}m traffic` : "near typical"}</div></div><div className="text-lg font-black text-white">{durationLabel(route.duration_minutes)}</div></div>)}</div></section> : null}

          {Array.isArray(best.incidents) && best.incidents.length ? <section className="rounded-[1.75rem] border border-amber-400/15 bg-amber-500/[.04] p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Reported incidents</div><div className="mt-3 space-y-2">{best.incidents.map((item, index) => <div key={`${item.type}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/55 p-3"><div className="text-sm font-black capitalize text-white">{item.type}</div>{item.description ? <div className="mt-1 text-xs leading-5 text-slate-400">{item.description}</div> : null}</div>)}</div></section> : null}
        </> : null}

        <div className="text-center text-[10px] leading-5 text-slate-600">Traffic uses your current location only for this request. Mapbox driving-traffic combines current and historical traffic conditions.</div>
      </div>
    </div>
  );
}

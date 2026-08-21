import React, { useMemo, useState } from "react";
import { AlertTriangle, Car, CloudRain, LocateFixed, Navigation, RefreshCw, Sparkles } from "lucide-react";
import api from "../api/client";

function minutes(seconds) { return Math.max(0, Math.round(Number(seconds || 0) / 60)); }
function miles(meters) { if (!meters) return null; return (Number(meters) / 1609.344).toFixed(Number(meters) > 160934 ? 0 : 1); }
function riskTone(risk) {
  if (risk === "HIGH") return "border-rose-400/25 bg-rose-500/10 text-rose-100";
  if (risk === "MODERATE") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
}
function getDevicePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location services are not available on this device."));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(error?.message || "Could not access your current location.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 },
    );
  });
}
function dateTimeLabel(value) {
  if (!value) return "No time available";
  return new Date(value).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function apiError(error, fallback) {
  return error?.response?.data?.detail || error?.response?.data?.[0] || error?.message || fallback;
}

export default function TravelWeatherAssistCard({ event, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [livePlan, setLivePlan] = useState(null);
  const [householdWeatherPlan, setHouseholdWeatherPlan] = useState(null);
  const [customTime, setCustomTime] = useState("");
  const cachedPlan = event?.metadata?.travel_assist || null;
  const plan = livePlan || cachedPlan;
  const route = plan?.route || {};
  const weather = plan?.weather || {};
  const monitor = event?.metadata?.travel_monitor || {};
  const monitoring = monitor.enabled === true;
  const alert = monitor.last_alert || null;
  const householdTaskId = event?.metadata?.household_task_id || null;
  const isHouseholdWeatherTask = Boolean(householdTaskId && event?.metadata?.weather_dependent === true);
  const hasDestination = Boolean(event && (event.location_name || event.address_line1 || (event.latitude != null && event.longitude != null)));
  const generated = useMemo(() => plan?.generated_at ? new Date(plan.generated_at) : null, [plan?.generated_at]);

  async function planTrip() {
    if (!event?.id) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const location = await getDevicePosition();
      const response = await api.post(`/personal-calendar/events/${event.id}/travel-plan/`, location);
      setLivePlan(response.data); onUpdated?.();
    } catch (e) { setError(apiError(e, "Could not build your travel briefing.")); }
    finally { setBusy(false); }
  }

  async function toggleMonitoring() {
    if (!event?.id) return;
    setBusy(true); setError(""); setNotice("");
    try {
      let payload = { enabled: !monitoring };
      if (!monitoring) payload = { ...payload, ...(await getDevicePosition()) };
      const response = await api.post(`/personal-calendar/events/${event.id}/travel-monitor/`, payload);
      if (response.data?.travel_assist) setLivePlan(response.data.travel_assist);
      onUpdated?.();
    } catch (e) { setError(apiError(e, "Could not update automatic trip monitoring.")); }
    finally { setBusy(false); }
  }

  async function checkHouseholdWeather() {
    if (!householdTaskId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await api.post(`/household/tasks/${householdTaskId}/weather-plan/`, {});
      setHouseholdWeatherPlan(response.data);
      if (response.data?.suggested_start_at) {
        const suggested = new Date(response.data.suggested_start_at);
        const local = new Date(suggested.getTime() - suggested.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setCustomTime(local);
      }
      onUpdated?.();
    } catch (e) { setError(apiError(e, "Could not check weather windows for this Household task.")); }
    finally { setBusy(false); }
  }

  async function makeWeatherDecision(decision, dueAt = null) {
    if (!householdTaskId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = { decision };
      if (dueAt) payload.due_at = new Date(dueAt).toISOString();
      await api.post(`/household/tasks/${householdTaskId}/weather-decision/`, payload);
      const labels = {
        ACCEPT_SUGGESTED: "Moved to the SYNC weather recommendation.",
        CUSTOM: "Moved to your selected time. SYNC will recheck weather for the new window.",
        KEEP: "Kept the current scheduled time.",
        HOLD: "Placed on Weather Hold.",
      };
      setNotice(labels[decision] || "Weather decision saved.");
      setHouseholdWeatherPlan(null);
      onUpdated?.();
    } catch (e) { setError(apiError(e, "Could not save your weather decision.")); }
    finally { setBusy(false); }
  }

  if (!event) return <section className="rounded-[1.9rem] border border-white/10 bg-slate-950/55 p-4 sm:p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Travel + Weather Assist</div><div className="mt-2 text-sm text-slate-400">Your next located calendar event will get a leave-by and weather briefing here.</div></section>;

  return (
    <section className="rounded-[1.9rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.13),transparent_32%),linear-gradient(145deg,rgba(15,23,42,.96),rgba(2,6,23,.96))] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><Sparkles className="h-3.5 w-3.5" />SYNC Assist · Travel + Weather</div><h2 className="mt-2 text-xl font-black text-white">Prepare for {event.title}</h2><p className="mt-1 text-sm text-slate-400">Traffic, weather and your preferred arrival buffer become one leave-by plan.</p></div>
        <div className="flex flex-wrap gap-2">
          {isHouseholdWeatherTask ? <button type="button" disabled={busy || !hasDestination} onClick={checkHouseholdWeather} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 text-xs font-black text-amber-100 disabled:opacity-50"><CloudRain className="h-4 w-4" />Check task weather</button> : null}
          <button type="button" disabled={busy || !hasDestination} onClick={planTrip} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100 disabled:opacity-50">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}{plan ? "Refresh now" : "Use my location"}</button>
          <button type="button" disabled={busy || !hasDestination} onClick={toggleMonitoring} className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 text-xs font-black ${monitoring ? "border border-emerald-300/25 bg-emerald-500/10 text-emerald-100" : "bg-gradient-to-r from-cyan-500 to-violet-600 text-white"}`}>{monitoring ? "Auto-monitoring on" : "Auto monitor trip"}</button>
        </div>
      </div>

      {!hasDestination ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">Add a venue, address or destination coordinates before SYNC Assist can plan weather or travel.</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
      {notice ? <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}
      {alert ? <div className={`mt-4 rounded-2xl border p-3 text-sm ${alert.severity === "HIGH" ? "border-rose-400/25 bg-rose-500/10 text-rose-100" : "border-amber-400/25 bg-amber-500/10 text-amber-100"}`}><div className="font-black">SYNC detected a change</div><div className="mt-1 space-y-1">{(alert.messages || []).map((message) => <div key={message}>{message}</div>)}</div></div> : null}

      {householdWeatherPlan ? <div className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-400/[.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">Household weather decision</div><div className="mt-1 text-base font-black text-white">{householdWeatherPlan.message}</div><div className="mt-1 text-xs text-slate-400">Current: {householdWeatherPlan.current?.short_forecast || "Forecast available"} · {householdWeatherPlan.current?.precipitation_probability || 0}% precip · risk {householdWeatherPlan.current?.risk || "unknown"}</div></div>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${riskTone(householdWeatherPlan.current?.risk)}`}>{householdWeatherPlan.recommendation}</span>
        </div>
        {householdWeatherPlan.suggested_start_at && householdWeatherPlan.recommendation === "MOVE" ? <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[.06] p-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-200">SYNC recommends</div><div className="mt-1 font-black text-white">{dateTimeLabel(householdWeatherPlan.suggested_start_at)}</div><button type="button" disabled={busy} onClick={() => makeWeatherDecision("ACCEPT_SUGGESTED", householdWeatherPlan.suggested_start_at)} className="mt-3 min-h-10 rounded-xl bg-emerald-300 px-4 text-xs font-black text-slate-950 disabled:opacity-50">Use suggested time</button></div> : null}
        {Array.isArray(householdWeatherPlan.alternatives) && householdWeatherPlan.alternatives.length ? <div className="mt-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Other low-risk windows</div><div className="mt-2 flex flex-wrap gap-2">{householdWeatherPlan.alternatives.map((candidate) => <button key={candidate.start_at} type="button" disabled={busy} onClick={() => makeWeatherDecision("CUSTOM", candidate.start_at)} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-left text-xs font-bold text-slate-200 disabled:opacity-50"><span className="block">{dateTimeLabel(candidate.start_at)}</span><span className="text-[10px] font-normal text-slate-500">{candidate.short_forecast || "Low risk"} · {candidate.precipitation_probability || 0}%</span></button>)}</div></div> : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="h-11 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white" />
          <button type="button" disabled={busy || !customTime} onClick={() => makeWeatherDecision("CUSTOM", customTime)} className="min-h-11 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100 disabled:opacity-50">Choose my time</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
          <button type="button" disabled={busy} onClick={() => makeWeatherDecision("KEEP")} className="min-h-10 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-black text-slate-200 disabled:opacity-50">Keep current time</button>
          <button type="button" disabled={busy} onClick={() => makeWeatherDecision("HOLD")} className="min-h-10 rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 text-xs font-black text-amber-100 disabled:opacity-50">Weather Hold</button>
        </div>
        <div className="mt-3 text-[10px] leading-4 text-slate-500">SYNC never moves this Household task just because the forecast changed. You choose the suggested time, another time, keep the current schedule, or place it on hold.</div>
      </div> : null}

      {plan ? <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500"><Navigation className="h-3.5 w-3.5" />Leave by</div><div className="mt-2 text-lg font-black text-white">{route.leave_by ? new Date(route.leave_by).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Pending route"}</div><div className="mt-1 text-xs text-slate-500">Target: {plan.arrival_buffer_minutes || 0} min early</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500"><Car className="h-3.5 w-3.5" />Drive</div><div className="mt-2 text-lg font-black text-white">{route.status === "READY" ? `${minutes(route.duration_seconds)} min` : "Not ready"}</div><div className="mt-1 text-xs text-slate-500">{miles(route.distance_meters) ? `${miles(route.distance_meters)} mi` : route.detail || route.status}</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-slate-500"><AlertTriangle className="h-3.5 w-3.5" />Traffic</div><div className={`mt-2 text-lg font-black ${minutes(route.traffic_delay_seconds) >= 10 ? "text-amber-200" : "text-white"}`}>{route.status === "READY" ? `+${minutes(route.traffic_delay_seconds)} min` : "Unavailable"}</div><div className="mt-1 text-xs text-slate-500">{route.traffic_aware ? "Traffic-aware route" : "No live traffic yet"}</div></div>
          <div className={`rounded-2xl border p-3 ${weather.status === "READY" ? riskTone(weather.risk) : "border-white/10 bg-black/20 text-slate-300"}`}><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] opacity-70"><CloudRain className="h-3.5 w-3.5" />Weather</div><div className="mt-2 text-lg font-black">{weather.status === "READY" ? `${weather.temperature}°${weather.temperature_unit || "F"}` : "Pending"}</div><div className="mt-1 text-xs opacity-75">{weather.status === "READY" ? `${weather.short_forecast} · ${weather.precipitation_probability || 0}% precip` : weather.detail || weather.status}</div></div>
        </div>
        {Array.isArray(plan.recommendations) && plan.recommendations.length ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.035] p-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">SYNC briefing</div><div className="mt-2 space-y-1.5 text-sm leading-6 text-slate-200">{plan.recommendations.map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}</div></div> : null}
        <div className="mt-3 text-[10px] text-slate-600">{generated ? `Updated ${generated.toLocaleString()}` : ""}{monitoring ? " · Automatic monitoring checks more often as departure approaches." : " · Current location is only saved if you explicitly enable trip monitoring."}</div>
      </> : <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">{isHouseholdWeatherTask ? <>For this Household task, tap <b className="text-slate-300">Check task weather</b> to compare nearby weather windows. Travel planning is optional.</> : <>Tap <b className="text-slate-300">Use my location</b> for a one-time plan or <b className="text-slate-300">Auto monitor trip</b> to let SYNC refresh it automatically.</>}</div>}
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudRain, Clock3, LoaderCircle, MapPinned, Navigation, RefreshCw, Route, TimerReset } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import { getEmployeeLiveDay, updateEmployeeJobClock } from "../api/dispatch";

function fmtTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function elapsed(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function riskClass(risk) {
  if (risk === "LATE") return "border-rose-400/30 bg-rose-500/10 text-rose-100";
  if (risk === "AT_RISK") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
}

function WeatherCard({ weather }) {
  if (!weather?.available) {
    return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3 text-xs text-slate-500">Weather unavailable for this stop.</div>;
  }
  const scheduled = weather.scheduled || {};
  return (
    <div className="rounded-2xl border border-sky-400/15 bg-sky-500/[.05] p-3">
      <div className="flex items-center gap-2 text-xs font-black text-sky-100"><CloudRain className="h-4 w-4" />Weather at stop</div>
      <div className="mt-2 text-sm font-black text-white">{scheduled.condition || weather.condition || "Weather available"}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>{scheduled.temperature_f ?? weather.temperature_f ?? "—"}°F</span>
        {scheduled.precip_probability != null ? <span>{scheduled.precip_probability}% precip</span> : null}
        {(scheduled.wind_mph ?? weather.wind_mph) != null ? <span>{scheduled.wind_mph ?? weather.wind_mph} mph wind</span> : null}
      </div>
    </div>
  );
}

function JobCard({ job, nowMs, busyId, onClock, onOpen }) {
  const clock = job.clock || {};
  let seconds = Number(clock.elapsed_seconds || 0);
  if (clock.running && clock.started_at) {
    const initial = Math.max(0, Math.floor((nowMs - new Date(clock.started_at).getTime()) / 1000));
    seconds = Math.max(seconds, initial);
  }
  const maps = job.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}` : "";
  return (
    <article className={`rounded-[1.8rem] border p-4 ${clock.running ? "border-emerald-400/30 bg-emerald-500/[.05]" : "border-white/10 bg-slate-950/65"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Job #{job.ticket_code || job.ticket_id}</div><h2 className="mt-1 text-xl font-black text-white">{job.title}</h2><div className="mt-1 text-xs text-slate-500">{job.priority} · {fmtTime(job.scheduled_start)}–{fmtTime(job.scheduled_end)}</div></div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${riskClass(job.risk)}`}>{String(job.risk || "ON_TIME").replaceAll("_", " ")}</span>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Job clock</div><div className={`mt-1 font-mono text-3xl font-black ${clock.running ? "text-emerald-200" : "text-white"}`}>{elapsed(seconds)}</div></div><Clock3 className={`h-7 w-7 ${clock.running ? "text-emerald-200" : "text-slate-500"}`} /></div>
        <div className="mt-3 flex gap-2">
          {!clock.running && !clock.finished_at ? <button disabled={busyId === job.ticket_id} onClick={() => onClock(job.ticket_id, "start")} className="min-h-11 flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 text-sm font-black text-white disabled:opacity-50">Start work</button> : null}
          {clock.running ? <button disabled={busyId === job.ticket_id} onClick={() => onClock(job.ticket_id, "finish")} className="min-h-11 flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-black text-white disabled:opacity-50">Finish job</button> : null}
          {clock.finished_at ? <div className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-sm font-black text-emerald-100"><CheckCircle2 className="h-4 w-4" />Completed</div> : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-center gap-2 text-xs font-black text-violet-100"><Route className="h-4 w-4" />Drive</div><div className="mt-2 text-lg font-black text-white">{job.travel?.minutes ?? 0} min</div><div className="mt-1 text-xs text-slate-500">{job.travel?.miles != null ? `${job.travel.miles} mi` : "Distance estimated"}{job.travel?.traffic_delay_minutes ? ` · +${job.travel.traffic_delay_minutes} min traffic` : ""}</div></div>
        <WeatherCard weather={job.weather} />
      </div>

      <div className="mt-3 flex items-start gap-2 text-sm text-slate-300"><MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />{job.address || "Service location pending"}</div>
      <div className="mt-4 grid grid-cols-2 gap-2"><a href={maps || undefined} target={maps ? "_blank" : undefined} rel={maps ? "noreferrer" : undefined} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-xs font-black text-cyan-100"><Navigation className="h-4 w-4" />Directions</a><button type="button" onClick={() => onOpen(job.ticket_id)} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.03] text-xs font-black text-slate-200">Open job</button></div>
    </article>
  );
}

export default function EmployeeLiveOperations() {
  const nav = useNavigate();
  const [data, setData] = useState({ jobs: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());

  async function load() {
    setLoading(true); setNotice("");
    try { setData(await getEmployeeLiveDay()); }
    catch (e) { setNotice(e?.response?.data?.detail || "Unable to load today's field plan."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const id = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(id); }, []);

  async function clock(ticketId, action) {
    setBusyId(ticketId); setNotice("");
    try { await updateEmployeeJobClock(ticketId, action); await load(); }
    catch (e) { setNotice(e?.response?.data?.detail || "Unable to update job clock."); }
    finally { setBusyId(null); }
  }

  const active = useMemo(() => (data.jobs || []).find((job) => job.clock?.running), [data.jobs]);
  return (
    <div className="min-h-screen bg-[#020617] pb-28 text-slate-100">
      <ModeBar title="Employee" subtitle="Live field operations" rightActions={<button onClick={load} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-slate-950"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>} />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_8%,rgba(14,165,233,.16),transparent_30%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SYNC Field Assistant</div><h1 className="mt-2 text-3xl font-black text-white">Know what you're doing, where you're going, and what can slow you down.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Today's jobs combine your work clock, live traffic when available, travel estimates, weather at each stop, SLA risk and directions. The clock follows the assigned job so the office can see real progress without calling the technician.</p>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-3xl font-black text-white">{data.summary?.jobs || 0}</div><div className="text-xs text-slate-500">Today's jobs</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><AlertTriangle className="h-5 w-5 text-amber-200"/><div className="mt-2 text-3xl font-black text-white">{data.summary?.at_risk || 0}</div><div className="text-xs text-slate-500">At risk</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Route className="h-5 w-5 text-violet-200"/><div className="mt-2 text-3xl font-black text-white">{data.summary?.traffic_delay_minutes || 0}</div><div className="text-xs text-slate-500">Traffic delay min</div></div>
          <div className={`rounded-2xl border p-4 ${active ? "border-emerald-400/25 bg-emerald-500/[.06]" : "border-white/10 bg-white/[.025]"}`}><TimerReset className="h-5 w-5 text-emerald-200"/><div className="mt-2 text-sm font-black text-white">{active ? active.title : "No active clock"}</div><div className="text-xs text-slate-500">{active ? "Work timer running" : "Start a job when work begins"}</div></div>
        </section>

        {notice ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-sm text-amber-100">{notice}</div> : null}
        {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-200" /></div> : null}
        {!loading && !(data.jobs || []).length ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm text-slate-400">No scheduled jobs are assigned to you today.</div> : null}
        <div className="grid gap-4 lg:grid-cols-2">{(data.jobs || []).map((job) => <JobCard key={job.ticket_id} job={job} nowMs={nowMs} busyId={busyId} onClock={clock} onOpen={(id) => nav(`/tickets/${id}`)} />)}</div>
      </main>
    </div>
  );
}

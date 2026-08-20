import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CloudRain, Clock3, LoaderCircle, MapPinned, RefreshCw, Route, TimerReset, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import { getLiveOperations, updateDispatchDelay } from "../../api/dispatch";

function riskClass(risk) {
  if (risk === "LATE") return "border-rose-400/30 bg-rose-500/10 text-rose-100";
  if (risk === "AT_RISK") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (risk === "DONE") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
}

function fmt(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function clockText(clock) {
  const seconds = Number(clock?.elapsed_seconds || 0);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function WeatherBlock({ weather }) {
  if (!weather?.available) return <div className="text-xs text-slate-600">Weather unavailable</div>;
  const s = weather.scheduled || {};
  return <div className="rounded-2xl border border-sky-400/15 bg-sky-500/[.05] p-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-sky-200"><CloudRain className="h-4 w-4"/>Weather</div><div className="mt-1 text-sm font-black text-white">{s.condition || weather.condition}</div><div className="mt-1 text-xs text-slate-400">{s.temperature_f ?? weather.temperature_f ?? "—"}°F{s.precip_probability != null ? ` · ${s.precip_probability}% precip` : ""}{(s.wind_mph ?? weather.wind_mph) != null ? ` · ${s.wind_mph ?? weather.wind_mph} mph wind` : ""}</div></div>;
}

function JobCard({ job, onDelay }) {
  const [busy, setBusy] = useState(false);
  async function delay(minutes) {
    setBusy(true);
    try { await onDelay(job.ticket_id, minutes); } finally { setBusy(false); }
  }
  return (
    <article className={`rounded-[1.6rem] border p-4 ${job.clock?.running ? "border-emerald-400/25 bg-emerald-500/[.04]" : "border-white/10 bg-slate-950/65"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="text-sm font-black text-white">{job.title}</div><div className="mt-1 text-xs text-slate-500">#{job.ticket_id} · {job.priority}</div></div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${riskClass(job.risk)}`}>{String(job.risk || "ON_TIME").replaceAll("_", " ")}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Schedule</div><div className="mt-1 text-sm font-bold text-white">{fmt(job.scheduled_start)}–{fmt(job.scheduled_end)}</div><div className="mt-1 text-[11px] text-slate-500">Expected finish {fmt(job.expected_finish_at)}</div></div>
        <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Live drive</div><div className="mt-1 text-sm font-bold text-white">{job.travel?.minutes ?? 0} min{job.travel?.miles != null ? ` · ${job.travel.miles} mi` : ""}</div><div className="mt-1 text-[11px] text-slate-500">{job.travel?.basis === "google_live_traffic" ? "Google live traffic" : "Route estimate"}{job.travel?.traffic_delay_minutes ? ` · +${job.travel.traffic_delay_minutes} min traffic` : ""}</div></div>
      </div>
      <div className="mt-2"><WeatherBlock weather={job.weather}/></div>
      <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-400"><MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />{job.address || "Service location not set"}</div>
      {job.clock?.running ? <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.07] p-3 text-xs text-emerald-100"><TimerReset className="h-4 w-4"/><b>Technician working:</b> {clockText(job.clock)} elapsed</div> : null}
      {job.route_conflict ? <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/[.07] p-3 text-xs text-amber-100"><b>Route risk:</b> {job.available_gap_minutes} min gap vs {job.required_gap_minutes} min needed for travel + buffer.</div> : null}
      <div className="mt-4 flex flex-wrap gap-2">{[15,30,60].map((m) => <button key={m} type="button" disabled={busy} onClick={() => delay(m)} className="min-h-10 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs font-black text-slate-200 hover:border-cyan-400/30 disabled:opacity-40">+{m} min</button>)}<button type="button" disabled={busy} onClick={() => delay(-15)} className="min-h-10 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs font-black text-slate-300 disabled:opacity-40">-15 min</button></div>
    </article>
  );
}

export default function SboDispatch() {
  const nav = useNavigate();
  const [data, setData] = useState({ staff: [], summary: {}, recommendations: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));

  async function load() {
    setLoading(true); setNotice("");
    try { setData(await getLiveOperations(date)); }
    catch (e) { setNotice(e?.response?.data?.detail || "Live operations are temporarily unavailable."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [date]);

  async function handleDelay(ticketId, minutes) {
    await updateDispatchDelay(ticketId, minutes);
    setNotice(`Ticket timing updated ${minutes >= 0 ? "+" : ""}${minutes} minutes. SYNC recalculated traffic, weather and downstream SLA risk; later jobs were not moved automatically.`);
    await load();
  }

  const riskJobs = useMemo(() => (data.staff || []).flatMap((s) => s.jobs || []).filter((j) => ["AT_RISK","LATE"].includes(j.risk)), [data.staff]);

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Live Operations">
      <div className="mx-auto max-w-7xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_8%,rgba(139,92,246,.2),transparent_32%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <button type="button" onClick={() => nav("/sbo")} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Business dashboard</button>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SYNC Live Operations</div><h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Traffic, weather, technician progress and SLA risk in one board.</h1><p className="mt-2 text-sm leading-6 text-slate-400">SYNC compares real work progress against the day's plan. Live traffic is used when Google traffic data is available, weather is attached to each service stop, and technician clocks show what is actually happening in the field. Humans still approve schedule changes.</p></div><div className="flex items-center gap-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"/><button onClick={load} className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100"><RefreshCw className="h-4 w-4"/></button></div></div>
        </section>

        <section className="grid gap-3 sm:grid-cols-5"><div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><UsersRound className="h-5 w-5 text-cyan-200"/><div className="mt-3 text-3xl font-black text-white">{data.staff?.length || 0}</div><div className="text-xs text-slate-500">Schedulable staff</div></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Route className="h-5 w-5 text-violet-200"/><div className="mt-3 text-3xl font-black text-white">{data.summary?.scheduled_jobs || 0}</div><div className="text-xs text-slate-500">Scheduled jobs</div></div><div className={`rounded-2xl border p-4 ${riskJobs.length ? "border-amber-400/20 bg-amber-500/[.06]" : "border-white/10 bg-white/[.025]"}`}><AlertTriangle className="h-5 w-5 text-amber-200"/><div className="mt-3 text-3xl font-black text-white">{data.summary?.at_risk_or_late || 0}</div><div className="text-xs text-slate-500">At risk / late</div></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Clock3 className="h-5 w-5 text-emerald-200"/><div className="mt-3 text-3xl font-black text-white">{data.summary?.active_clocks || 0}</div><div className="text-xs text-slate-500">Working now</div></div><div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Route className="h-5 w-5 text-rose-200"/><div className="mt-3 text-3xl font-black text-white">{data.summary?.traffic_delay_minutes || 0}</div><div className="text-xs text-slate-500">Traffic delay min</div></div></section>

        {(data.recommendations || []).length ? <section className="rounded-[1.8rem] border border-violet-400/20 bg-violet-500/[.05] p-4 sm:p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-200">SYNC recommendations</div><div className="mt-3 grid gap-2 lg:grid-cols-2">{data.recommendations.slice(0,8).map((r, i) => <div key={`${r.ticket_id}-${r.type}-${i}`} className="rounded-2xl border border-white/10 bg-slate-950/55 p-3"><div className="text-xs font-black text-white">{r.type.replaceAll("_"," ")} · Ticket #{r.ticket_id}</div><div className="mt-1 text-xs leading-5 text-slate-400">{r.message}</div><div className="mt-2 text-[11px] font-black text-cyan-200">{r.action}</div></div>)}</div></section> : null}

        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-4 text-sm text-cyan-100">{notice}</div> : null}
        {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-200"/></div> : null}
        {!loading && !(data.staff || []).length ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm text-slate-400">No schedulable workforce profiles are configured. Add staff availability and route start locations in Business Settings → Team & Workforce.</div> : null}

        <div className="grid gap-4 xl:grid-cols-2">{(data.staff || []).map((person) => <section key={person.member_id} className="rounded-[1.9rem] border border-white/10 bg-white/[.02] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black text-white">{person.name}</div><div className="mt-1 text-xs text-slate-500">{person.title}</div></div><Clock3 className="h-5 w-5 text-violet-200"/></div><div className="mt-2 text-xs text-slate-500">Starts from: {person.route_start_address || "not configured"}</div><div className="mt-4 space-y-3">{(person.jobs || []).length ? person.jobs.map((job) => <JobCard key={job.ticket_id} job={job} onDelay={handleDelay}/>) : <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-500">No scheduled work for this date.</div>}</div></section>)}</div>
      </div>
    </DashboardShell>
  );
}

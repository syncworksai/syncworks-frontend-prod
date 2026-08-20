import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Clock3, LoaderCircle, MapPin, RefreshCw, RotateCcw, X } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { listCustomerAppointments, respondToCustomerAppointment } from "../api/professionalServices";

function fmt(value) {
  if (!value) return "Time not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time not set" : date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const statusTone = {
  PROPOSED: "border-violet-400/25 bg-violet-500/10 text-violet-100",
  ACCEPTED: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  DECLINED: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  RESCHEDULE_REQUESTED: "border-amber-400/25 bg-amber-500/10 text-amber-100",
};

export default function CustomerAppointments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");
  const [reschedule, setReschedule] = useState(null);
  const [rescheduleNote, setRescheduleNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await listCustomerAppointments());
      setNotice("");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Appointments are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => rows.filter((row) => !["DECLINED", "CANCELLED", "COMPLETED"].includes(row.status)), [rows]);

  async function respond(row, action, extra = {}) {
    setBusyId(row.id);
    try {
      const updated = await respondToCustomerAppointment(row.id, { action, ...extra });
      setRows((current) => current.map((item) => item.id === row.id ? updated : item));
      setNotice(action === "ACCEPT" ? "Appointment accepted. The office has been notified." : action === "DECLINE" ? "Appointment declined. The office has been notified." : "New scheduling request sent to the office.");
      setReschedule(null);
      setRescheduleNote("");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "SyncWorks could not update this appointment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardShell modeBarTitle="SyncWorks" modeBarSubtitle="Appointments">
      <div className="mx-auto max-w-5xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(139,92,246,.2),transparent_32%),rgba(2,6,23,.92)] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Your schedule</div>
              <h1 className="mt-2 text-3xl font-black text-white">Appointments</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Accept, decline, or ask an office for a different time without calling. SyncWorks keeps the scheduling conversation in one place.</p>
            </div>
            <button type="button" onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-200"><RefreshCw className="h-4 w-4" />Refresh</button>
          </div>
        </section>

        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-4 text-sm text-cyan-100">{notice}</div> : null}

        {loading ? <div className="grid min-h-40 place-items-center rounded-3xl border border-white/10 bg-white/[.02]"><LoaderCircle className="h-7 w-7 animate-spin text-cyan-200" /></div> : null}

        {!loading && !upcoming.length ? <div className="rounded-3xl border border-white/10 bg-white/[.02] p-6 text-sm text-slate-400">You do not have any active professional appointments yet.</div> : null}

        <div className="space-y-3">
          {upcoming.map((row) => (
            <article key={row.id} className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">{row.business_name}</div>
                  <h2 className="mt-1 text-xl font-black text-white">{row.appointment_type || "Appointment"}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone[row.status] || "border-white/10 bg-white/[.03] text-slate-300"}`}>{String(row.status || "").replaceAll("_", " ")}</span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-sm text-slate-300"><Clock3 className="h-4 w-4 text-violet-200" />{fmt(row.proposed_start)}</div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-sm text-slate-300"><MapPin className="h-4 w-4 text-cyan-200" />{row.location || "Office location"}</div>
              </div>

              {row.insurance_plan ? <div className="mt-3 text-xs text-slate-400">Insurance noted for scheduling: <b className="text-white">{row.insurance_plan}</b>. Confirm benefits directly with your insurer or the practice.</div> : null}
              {row.scheduling_note ? <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.02] p-3 text-sm text-slate-300">{row.scheduling_note}</div> : null}

              {row.status === "PROPOSED" ? (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button type="button" disabled={busyId === row.id} onClick={() => respond(row, "ACCEPT")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-slate-950 disabled:opacity-50"><Check className="h-4 w-4" />Accept</button>
                  <button type="button" disabled={busyId === row.id} onClick={() => setReschedule(row)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 text-sm font-black text-amber-100 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Request new time</button>
                  <button type="button" disabled={busyId === row.id} onClick={() => respond(row, "DECLINE")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-black text-rose-100 disabled:opacity-50"><X className="h-4 w-4" />Decline</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs leading-5 text-slate-500">Appointment scheduling is operational communication only. Do not use scheduling notes for medical histories, diagnoses, test results, or other clinical information.</div>
      </div>

      {reschedule ? (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-[2rem] border border-white/10 bg-slate-950 p-5 sm:rounded-[2rem]">
            <CalendarClock className="h-6 w-6 text-amber-200" />
            <h2 className="mt-3 text-xl font-black text-white">Request a different time</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Tell the office when you are generally available. Keep this note about scheduling only.</p>
            <textarea value={rescheduleNote} onChange={(event) => setRescheduleNote(event.target.value)} rows={4} maxLength={1000} placeholder="Example: Tuesday or Thursday after 3 PM works best." className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900 p-3 text-sm text-white outline-none placeholder:text-slate-600" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setReschedule(null)} className="min-h-12 rounded-2xl border border-white/10 text-sm font-black text-slate-300">Cancel</button>
              <button type="button" disabled={!rescheduleNote.trim() || busyId === reschedule.id} onClick={() => respond(reschedule, "RESCHEDULE", { reschedule_note: rescheduleNote })} className="min-h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-black text-slate-950 disabled:opacity-50">Send request</button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

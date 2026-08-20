import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, LoaderCircle, Mail, RefreshCw, Send, Settings2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import {
  getPracticeSettings,
  getProfessionalAvailability,
  listBusinessAppointments,
  proposeBusinessAppointment,
} from "../../api/professionalServices";

function localInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fmt(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function appointmentDuration(practice, name, fallback = 60) {
  const row = (practice?.appointment_types || []).find((item) => String(item?.name || "").toLowerCase() === String(name || "").toLowerCase());
  return Number(row?.duration_minutes || fallback);
}

export default function SboAppointments() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ customer_email: "", appointment_type: "New patient visit", proposed_start: localInputValue(new Date(Date.now() + 86400000)), duration_minutes: 60, provider_id: "", resource_id: "", location: "", insurance_plan: "", scheduling_note: "" });

  async function load() {
    setLoading(true);
    try {
      const [appointmentRows, practiceData] = await Promise.all([listBusinessAppointments(), getPracticeSettings()]);
      setRows(appointmentRows);
      setPractice(practiceData);
      const firstType = (practiceData?.appointment_types || []).find((row) => row?.active !== false && row?.name);
      if (firstType) setForm((current) => ({ ...current, appointment_type: firstType.name, duration_minutes: Number(firstType.duration_minutes || current.duration_minutes) }));
      setNotice("");
    } catch (error) { setNotice(error?.response?.data?.detail || "Appointments are temporarily unavailable."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const providers = useMemo(() => (practice?.providers || []).filter((row) => row.active !== false), [practice]);
  const resources = useMemo(() => (practice?.resources || []).filter((row) => row.active !== false), [practice]);
  const visitTypes = useMemo(() => (practice?.appointment_types || []).filter((row) => row.active !== false && row.name), [practice]);
  const pending = useMemo(() => rows.filter((row) => ["PROPOSED", "RESCHEDULE_REQUESTED", "REQUESTED"].includes(row.status)), [rows]);

  const eligibleProviders = useMemo(() => providers.filter((row) => !row.appointment_types?.length || row.appointment_types.includes(form.appointment_type)), [providers, form.appointment_type]);
  const eligibleResources = useMemo(() => resources.filter((row) => !row.appointment_types?.length || row.appointment_types.includes(form.appointment_type)), [resources, form.appointment_type]);

  async function findSlots() {
    setSlotLoading(true);
    setNotice("");
    try {
      const found = await getProfessionalAvailability({
        date: new Date(form.proposed_start || Date.now()).toISOString().slice(0, 10),
        appointment_type: form.appointment_type,
        duration_minutes: form.duration_minutes,
        provider_id: form.provider_id,
        resource_id: form.resource_id,
      });
      setSlots(found.slice(0, 12));
      if (!found.length) setNotice("No open times were found in the next 14 days for that provider/resource combination.");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "SyncWorks could not calculate available times.");
    } finally { setSlotLoading(false); }
  }

  function chooseSlot(slot) {
    const date = new Date(slot.start);
    setForm((current) => ({ ...current, proposed_start: localInputValue(date) }));
  }

  function changeAppointmentType(name) {
    const duration = appointmentDuration(practice, name, form.duration_minutes);
    setForm((current) => ({ ...current, appointment_type: name, duration_minutes: duration, provider_id: "", resource_id: "" }));
    setSlots([]);
  }

  async function propose(event) {
    event.preventDefault();
    setSending(true);
    setNotice("");
    try {
      const created = await proposeBusinessAppointment({ ...form, proposed_start: new Date(form.proposed_start).toISOString(), provider_id: form.provider_id || null, resource_id: form.resource_id || null });
      setRows((current) => [created, ...current]);
      setNotice(created.email_sent ? "Appointment sent in SyncWorks and by email." : "Appointment sent in SyncWorks. Email delivery could not be confirmed.");
      setForm((current) => ({ ...current, customer_email: "", scheduling_note: "" }));
      setSlots([]);
    } catch (error) {
      setNotice(error?.response?.data?.detail || "SyncWorks could not send the appointment.");
    } finally { setSending(false); }
  }

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Appointments">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,.15),transparent_30%),rgba(2,6,23,.92)] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="text-[10px] font-black uppercase tracking-[.22em] text-violet-200">Scheduling workspace</div><h1 className="mt-2 text-3xl font-black text-white">Professional appointments</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Assign the correct provider and room/resource, let SyncWorks calculate open times, then send the proposed appointment to the patient.</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => nav("/sbo/settings/practice/automation")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/[.07] px-4 text-xs font-black text-cyan-100"><Sparkles className="h-4 w-4" />Automation setup</button><button type="button" onClick={() => nav("/sbo/settings/practice")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-xs font-black text-slate-200"><Settings2 className="h-4 w-4" />Practice settings</button><button type="button" onClick={load} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-slate-300"><RefreshCw className="h-4 w-4" /></button></div>
          </div>
        </section>

        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-4 text-sm text-cyan-100">{notice}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
          <form onSubmit={propose} className="h-fit rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-black text-white">Build appointment</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">The patient must already have a SyncWorks account. Capacity rules protect the selected provider and room/resource from conflicts.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-400">Patient SyncWorks email<input required type="email" value={form.customer_email} onChange={(e) => setForm((c) => ({ ...c, customer_email: e.target.value }))} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white" placeholder="patient@example.com" /></label>
              <label className="block text-xs font-bold text-slate-400">Appointment type{visitTypes.length ? <select value={form.appointment_type} onChange={(e) => changeAppointmentType(e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white">{visitTypes.map((row) => <option key={row.name} value={row.name}>{row.name} · {row.duration_minutes} min</option>)}</select> : <input required value={form.appointment_type} onChange={(e) => setForm((c) => ({ ...c, appointment_type: e.target.value }))} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />}</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-400">Provider<select value={form.provider_id} onChange={(e) => { setForm((c) => ({ ...c, provider_id: e.target.value })); setSlots([]); }} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white"><option value="">Any / not assigned</option>{eligibleProviders.map((row) => <option key={row.id} value={row.id}>{row.name}{row.role_label ? ` · ${row.role_label}` : ""}</option>)}</select></label>
                <label className="block text-xs font-bold text-slate-400">Room / resource<select value={form.resource_id} onChange={(e) => { setForm((c) => ({ ...c, resource_id: e.target.value })); setSlots([]); }} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white"><option value="">Any / not required</option>{eligibleResources.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.resource_type_label || row.resource_type}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-[1fr_110px] gap-2"><label className="block text-xs font-bold text-slate-400">Proposed date & time<input required type="datetime-local" value={form.proposed_start} onChange={(e) => { setForm((c) => ({ ...c, proposed_start: e.target.value })); setSlots([]); }} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label><label className="block text-xs font-bold text-slate-400">Minutes<input type="number" min="5" max="480" value={form.duration_minutes} onChange={(e) => { setForm((c) => ({ ...c, duration_minutes: Number(e.target.value) })); setSlots([]); }} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label></div>
              <button type="button" onClick={findSlots} disabled={slotLoading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 text-xs font-black text-emerald-100 disabled:opacity-50">{slotLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}Find open times</button>
              {slots.length ? <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-3"><div className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Next available</div><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{slots.map((slot) => <button key={slot.start} type="button" onClick={() => chooseSlot(slot)} className="shrink-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-left text-[10px] font-black text-white"><div>{fmt(slot.start)}</div>{slot.provider_name ? <div className="mt-1 font-medium text-slate-500">{slot.provider_name}</div> : null}</button>)}</div></div> : null}
              <label className="block text-xs font-bold text-slate-400">Office / appointment location<input value={form.location} onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white" placeholder="Defaults to business address" /></label>
              <label className="block text-xs font-bold text-slate-400">Insurance for scheduling<input value={form.insurance_plan} onChange={(e) => setForm((c) => ({ ...c, insurance_plan: e.target.value }))} className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white" placeholder="Optional carrier name" /></label>
              <label className="block text-xs font-bold text-slate-400">Scheduling note only<textarea value={form.scheduling_note} onChange={(e) => setForm((c) => ({ ...c, scheduling_note: e.target.value }))} maxLength={1000} rows={3} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900 p-3 text-sm text-white" placeholder="Arrival time, paperwork, parking, scheduling instructions..." /></label>
            </div>
            <button type="submit" disabled={sending} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send appointment</button>
            <div className="mt-3 text-[11px] leading-5 text-slate-500">Delivery: SyncWorks notification + no-reply email now. The event remains push-ready for the same appointment workflow.</div>
          </form>

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Queue</div><h2 className="mt-1 text-lg font-black text-white">Waiting on scheduling</h2></div><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-black text-slate-300">{pending.length}</span></div>
            {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-cyan-200" /></div> : null}
            {!loading && !rows.length ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-slate-400">No professional appointments yet.</div> : null}
            <div className="mt-4 space-y-2">
              {rows.map((row) => <article key={row.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-black text-white">{row.customer_name}</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{row.customer_email}</div></div><span className="rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-[9px] font-black uppercase text-slate-300">{String(row.status).replaceAll("_", " ")}</span></div>
                <div className="mt-3 text-sm font-bold text-slate-200">{row.appointment_type}</div><div className="mt-1 text-xs text-slate-400">{fmt(row.proposed_start)}</div>
                {(row.provider_name || row.resource_name) ? <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-cyan-200">{row.provider_name ? <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[.05] px-2 py-1">{row.provider_name}</span> : null}{row.resource_name ? <span className="rounded-full border border-violet-400/15 bg-violet-500/[.05] px-2 py-1 text-violet-200">{row.resource_name}</span> : null}</div> : null}
                {row.reschedule_note ? <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-500/[.06] p-3 text-xs leading-5 text-amber-100"><b>Patient requested another time:</b> {row.reschedule_note}</div> : null}
              </article>)}
            </div>
          </section>
        </div>

        <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[.05] p-4 text-xs leading-5 text-amber-100">Keep this workspace limited to scheduling and business operations. Clinical details, diagnoses, test results and medical histories should remain in the practice's appropriate clinical system.</div>
      </div>
    </DashboardShell>
  );
}

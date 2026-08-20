import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, CircleHelp, LoaderCircle, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import { getPracticeSettings, savePracticeSettings } from "../../api/professionalServices";

const PRACTICE_TYPES = [
  ["DENTAL", "Dentist / Dental practice"],
  ["OPTOMETRY", "Optometrist / Eye care"],
  ["CHIROPRACTIC", "Chiropractic"],
  ["PHYSICAL_THERAPY", "Physical therapy"],
  ["VETERINARY", "Veterinary"],
  ["MED_SPA", "Med spa"],
  ["OTHER", "Other appointment business"],
];

const COMMON_INSURANCE = ["Aetna", "Blue Cross Blue Shield", "Cigna", "Delta Dental", "Humana", "MetLife", "UnitedHealthcare", "VSP", "EyeMed"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function initialSchedule() {
  return Object.fromEntries(DAYS.map((day) => [day, { open: day !== "saturday" && day !== "sunday", start: "08:00", end: "17:00" }]));
}

export default function SboPracticeSettings() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    practice_type: "DENTAL",
    scheduling_enabled: true,
    accepting_new_patients: true,
    accepted_insurance: [],
    appointment_types: [{ name: "New patient visit", duration_minutes: 60, active: true }],
    weekly_schedule: initialSchedule(),
    booking_lead_minutes: 60,
    booking_buffer_minutes: 0,
  });
  const [insuranceInput, setInsuranceInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getPracticeSettings().then((data) => {
      if (!active) return;
      setForm((current) => ({
        ...current,
        ...data,
        accepted_insurance: Array.isArray(data?.accepted_insurance) ? data.accepted_insurance : [],
        appointment_types: Array.isArray(data?.appointment_types) && data.appointment_types.length ? data.appointment_types : current.appointment_types,
        weekly_schedule: data?.weekly_schedule && Object.keys(data.weekly_schedule).length ? data.weekly_schedule : current.weekly_schedule,
      }));
    }).catch((error) => setNotice(error?.response?.data?.detail || "Practice settings are temporarily unavailable."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const insuranceSet = useMemo(() => new Set(form.accepted_insurance.map((item) => String(item).toLowerCase())), [form.accepted_insurance]);

  function toggleInsurance(name) {
    setForm((current) => {
      const exists = current.accepted_insurance.some((item) => String(item).toLowerCase() === name.toLowerCase());
      return { ...current, accepted_insurance: exists ? current.accepted_insurance.filter((item) => String(item).toLowerCase() !== name.toLowerCase()) : [...current.accepted_insurance, name] };
    });
  }

  function addInsurance() {
    const value = insuranceInput.trim();
    if (!value || insuranceSet.has(value.toLowerCase())) return;
    setForm((current) => ({ ...current, accepted_insurance: [...current.accepted_insurance, value] }));
    setInsuranceInput("");
  }

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const updated = await savePracticeSettings(form);
      setForm((current) => ({ ...current, ...updated }));
      setNotice("Professional practice settings saved. Search and scheduling now use this profile.");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "SyncWorks could not save these settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <DashboardShell><div className="grid min-h-[50dvh] place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-200" /></div></DashboardShell>;

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Professional practice">
      <div className="mx-auto max-w-5xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.16),transparent_32%),rgba(2,6,23,.92)] p-5 sm:p-7">
          <button type="button" onClick={() => nav("/sbo/settings")} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Business settings</button>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-violet-200">Appointment business</div>
              <h1 className="mt-2 text-3xl font-black text-white">Practice & scheduling setup</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Configure what patients need before they request or confirm an appointment: practice type, insurance, visit types and your scheduling matrix.</p>
            </div>
            <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
          </div>
        </section>

        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-4 text-sm text-cyan-100">{notice}</div> : null}

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
          <h2 className="text-lg font-black text-white">Practice basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">Practice type
              <select value={form.practice_type} onChange={(e) => setForm((c) => ({ ...c, practice_type: e.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 text-white">
                {PRACTICE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="grid gap-2">
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-3 text-sm text-slate-300"><span><b className="text-white">Scheduling enabled</b><span className="mt-1 block text-xs text-slate-500">Allow appointment workflows in SyncWorks</span></span><input type="checkbox" checked={form.scheduling_enabled} onChange={(e) => setForm((c) => ({ ...c, scheduling_enabled: e.target.checked }))} className="h-5 w-5" /></label>
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-3 text-sm text-slate-300"><span><b className="text-white">Accepting new patients</b><span className="mt-1 block text-xs text-slate-500">Shown in professional discovery</span></span><input type="checkbox" checked={form.accepting_new_patients} onChange={(e) => setForm((c) => ({ ...c, accepting_new_patients: e.target.checked }))} className="h-5 w-5" /></label>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-200" /><h2 className="text-lg font-black text-white">Insurance accepted</h2></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Patients can filter claimed SyncWorks practices by insurance. This information is self-reported until separately verified and should be kept current.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {COMMON_INSURANCE.map((name) => {
              const active = insuranceSet.has(name.toLowerCase());
              return <button key={name} type="button" onClick={() => toggleInsurance(name)} className={`rounded-full border px-3 py-2 text-xs font-black ${active ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[.025] text-slate-400"}`}>{active ? <Check className="mr-1 inline h-3 w-3" /> : null}{name}</button>;
            })}
          </div>
          <div className="mt-4 flex gap-2"><input value={insuranceInput} onChange={(e) => setInsuranceInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInsurance(); } }} placeholder="Add another insurance carrier" className="h-12 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none" /><button type="button" onClick={addInsurance} className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-100"><Plus className="h-5 w-5" /></button></div>
          {form.accepted_insurance.length ? <div className="mt-3 flex flex-wrap gap-2">{form.accepted_insurance.map((name) => <span key={name} className="rounded-full bg-white/[.05] px-3 py-1 text-xs text-slate-300">{name}</span>)}</div> : null}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-200" /><h2 className="text-lg font-black text-white">Appointment types</h2></div>
          <div className="mt-4 space-y-2">
            {form.appointment_types.map((row, index) => (
              <div key={`${row.name}-${index}`} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-3 sm:grid-cols-[1fr_140px_44px]">
                <input value={row.name} onChange={(e) => setForm((c) => ({ ...c, appointment_types: c.appointment_types.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} placeholder="Appointment name" className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                <label className="flex items-center gap-2 text-xs text-slate-400"><input type="number" min="5" max="480" value={row.duration_minutes} onChange={(e) => setForm((c) => ({ ...c, appointment_types: c.appointment_types.map((item, i) => i === index ? { ...item, duration_minutes: Number(e.target.value) } : item) }))} className="h-11 w-20 rounded-xl border border-white/10 bg-slate-900 px-2 text-white" /> min</label>
                <button type="button" onClick={() => setForm((c) => ({ ...c, appointment_types: c.appointment_types.filter((_, i) => i !== index) }))} className="grid h-11 w-11 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-200"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setForm((c) => ({ ...c, appointment_types: [...c.appointment_types, { name: "", duration_minutes: 30, active: true }] }))} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100"><Plus className="h-4 w-4" />Add appointment type</button>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
          <h2 className="text-lg font-black text-white">Weekly scheduling matrix</h2>
          <p className="mt-2 text-xs text-slate-500">This is the office availability foundation. Individual providers and rooms can be layered into the matrix later.</p>
          <div className="mt-4 space-y-2">
            {DAYS.map((day) => {
              const row = form.weekly_schedule?.[day] || { open: false, start: "08:00", end: "17:00" };
              return <div key={day} className="grid grid-cols-[100px_1fr_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-3 sm:grid-cols-[120px_100px_1fr_1fr]">
                <div className="capitalize text-sm font-black text-white">{day}</div>
                <label className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><input type="checkbox" checked={row.open} onChange={(e) => setForm((c) => ({ ...c, weekly_schedule: { ...c.weekly_schedule, [day]: { ...row, open: e.target.checked } } }))} />Open</label>
                <input type="time" disabled={!row.open} value={row.start} onChange={(e) => setForm((c) => ({ ...c, weekly_schedule: { ...c.weekly_schedule, [day]: { ...row, start: e.target.value } } }))} className="h-10 rounded-xl border border-white/10 bg-slate-900 px-2 text-sm text-white disabled:opacity-40" />
                <input type="time" disabled={!row.open} value={row.end} onChange={(e) => setForm((c) => ({ ...c, weekly_schedule: { ...c.weekly_schedule, [day]: { ...row, end: e.target.value } } }))} className="h-10 rounded-xl border border-white/10 bg-slate-900 px-2 text-sm text-white disabled:opacity-40" />
              </div>;
            })}
          </div>
        </section>

        <div className="flex gap-2 rounded-2xl border border-amber-400/15 bg-amber-500/[.05] p-4 text-xs leading-5 text-amber-100"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /><span>SyncWorks is handling scheduling and business discovery here, not clinical records. Do not enter diagnoses, test results, treatment notes, or other protected medical details into appointment notes.</span></div>
      </div>
    </DashboardShell>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, DoorOpen, LoaderCircle, Plus, Stethoscope, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import {
  createProfessionalProvider,
  createProfessionalResource,
  deleteProfessionalProvider,
  deleteProfessionalResource,
  getPracticeSettings,
  listProfessionalProviders,
  listProfessionalResources,
} from "../../api/professionalServices";

const RESOURCE_TYPES = [["ROOM", "Room"], ["CHAIR", "Chair"], ["EQUIPMENT", "Equipment"], ["OTHER", "Other"]];

export default function SboSchedulingAutomation() {
  const nav = useNavigate();
  const [practice, setPractice] = useState(null);
  const [providers, setProviders] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [providerForm, setProviderForm] = useState({ name: "", role_label: "", appointment_types: [] });
  const [resourceForm, setResourceForm] = useState({ name: "", resource_type: "ROOM", appointment_types: [] });

  async function load() {
    setLoading(true);
    try {
      const [practiceData, providerRows, resourceRows] = await Promise.all([
        getPracticeSettings(),
        listProfessionalProviders(),
        listProfessionalResources(),
      ]);
      setPractice(practiceData);
      setProviders(providerRows);
      setResources(resourceRows);
      setNotice("");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Scheduling automation is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visitTypes = useMemo(() => Array.isArray(practice?.appointment_types) ? practice.appointment_types.filter((row) => row?.active !== false && row?.name) : [], [practice]);

  function toggleVisit(formSetter, value) {
    formSetter((current) => ({
      ...current,
      appointment_types: current.appointment_types.includes(value)
        ? current.appointment_types.filter((item) => item !== value)
        : [...current.appointment_types, value],
    }));
  }

  async function addProvider(event) {
    event.preventDefault();
    if (!providerForm.name.trim()) return;
    setSaving(true);
    try {
      const created = await createProfessionalProvider(providerForm);
      setProviders((current) => [...current, created]);
      setProviderForm({ name: "", role_label: "", appointment_types: [] });
      setNotice("Provider added. You can now assign appointments and availability to this provider.");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not add provider.");
    } finally { setSaving(false); }
  }

  async function addResource(event) {
    event.preventDefault();
    if (!resourceForm.name.trim()) return;
    setSaving(true);
    try {
      const created = await createProfessionalResource(resourceForm);
      setResources((current) => [...current, created]);
      setResourceForm({ name: "", resource_type: "ROOM", appointment_types: [] });
      setNotice("Room/resource added. SyncWorks can now protect it from double-booking.");
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not add room/resource.");
    } finally { setSaving(false); }
  }

  async function removeProvider(id) {
    await deleteProfessionalProvider(id);
    setProviders((current) => current.filter((row) => row.id !== id));
  }

  async function removeResource(id) {
    await deleteProfessionalResource(id);
    setResources((current) => current.filter((row) => row.id !== id));
  }

  if (loading) return <DashboardShell><div className="grid min-h-[50dvh] place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-200" /></div></DashboardShell>;

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Scheduling automation">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-violet-400/20 bg-[radial-gradient(circle_at_88%_8%,rgba(34,211,238,.16),transparent_30%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <button type="button" onClick={() => nav("/sbo/settings/practice")} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Practice settings</button>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div><div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Automation layer</div><h1 className="mt-2 text-3xl font-black text-white">Providers, rooms & bookable capacity</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Define who performs the work and what room, chair or equipment is required. SyncWorks uses these resources to calculate open times and prevent double-booking.</p></div>
            <button type="button" onClick={() => nav("/sbo/appointments")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><CalendarClock className="h-4 w-4" />Open appointments</button>
          </div>
        </section>

        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.06] p-4 text-sm text-cyan-100">{notice}</div> : null}

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Users className="h-5 w-5 text-cyan-200" /><div className="mt-2 text-2xl font-black text-white">{providers.length}</div><div className="text-xs text-slate-500">Active provider records</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><DoorOpen className="h-5 w-5 text-violet-200" /><div className="mt-2 text-2xl font-black text-white">{resources.length}</div><div className="text-xs text-slate-500">Rooms / chairs / resources</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><Stethoscope className="h-5 w-5 text-emerald-200" /><div className="mt-2 text-2xl font-black text-white">{visitTypes.length}</div><div className="text-xs text-slate-500">Appointment types configured</div></div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-black text-white">Providers</h2><p className="mt-1 text-xs leading-5 text-slate-500">Doctors, dentists, hygienists, therapists, technicians or anyone who owns appointment capacity.</p>
            <form onSubmit={addProvider} className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <input value={providerForm.name} onChange={(e) => setProviderForm((c) => ({ ...c, name: e.target.value }))} placeholder="Provider name" className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
              <input value={providerForm.role_label} onChange={(e) => setProviderForm((c) => ({ ...c, role_label: e.target.value }))} placeholder="Role — Dentist, Hygienist, Optometrist..." className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
              {visitTypes.length ? <div><div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Can perform</div><div className="flex flex-wrap gap-2">{visitTypes.map((row) => <button key={row.name} type="button" onClick={() => toggleVisit(setProviderForm, row.name)} className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${providerForm.appointment_types.includes(row.name) ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 text-slate-400"}`}>{row.name}</button>)}</div></div> : null}
              <button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100"><Plus className="h-4 w-4" />Add provider</button>
            </form>
            <div className="mt-4 space-y-2">{providers.map((row) => <article key={row.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div><div className="text-sm font-black text-white">{row.name}</div><div className="mt-1 text-xs text-slate-500">{row.role_label || "Provider"}</div>{row.appointment_types?.length ? <div className="mt-2 text-[10px] text-cyan-200">{row.appointment_types.join(" · ")}</div> : <div className="mt-2 text-[10px] text-slate-600">All appointment types</div>}</div><button type="button" onClick={() => removeProvider(row.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-200"><Trash2 className="h-4 w-4" /></button></article>)}</div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
            <h2 className="text-lg font-black text-white">Rooms, chairs & equipment</h2><p className="mt-1 text-xs leading-5 text-slate-500">Create scarce resources that cannot be booked by two appointments at the same time.</p>
            <form onSubmit={addResource} className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
              <div className="grid grid-cols-[1fr_130px] gap-2"><input value={resourceForm.name} onChange={(e) => setResourceForm((c) => ({ ...c, name: e.target.value }))} placeholder="Room 2 / Chair A" className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /><select value={resourceForm.resource_type} onChange={(e) => setResourceForm((c) => ({ ...c, resource_type: e.target.value }))} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-2 text-sm text-white">{RESOURCE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              {visitTypes.length ? <div><div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Used for</div><div className="flex flex-wrap gap-2">{visitTypes.map((row) => <button key={row.name} type="button" onClick={() => toggleVisit(setResourceForm, row.name)} className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${resourceForm.appointment_types.includes(row.name) ? "border-violet-400/30 bg-violet-500/10 text-violet-100" : "border-white/10 text-slate-400"}`}>{row.name}</button>)}</div></div> : null}
              <button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 text-xs font-black text-violet-100"><Plus className="h-4 w-4" />Add resource</button>
            </form>
            <div className="mt-4 space-y-2">{resources.map((row) => <article key={row.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div><div className="text-sm font-black text-white">{row.name}</div><div className="mt-1 text-xs text-slate-500">{row.resource_type_label || row.resource_type}</div>{row.appointment_types?.length ? <div className="mt-2 text-[10px] text-violet-200">{row.appointment_types.join(" · ")}</div> : <div className="mt-2 text-[10px] text-slate-600">Available to all appointment types</div>}</div><button type="button" onClick={() => removeResource(row.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-200"><Trash2 className="h-4 w-4" /></button></article>)}</div>
          </section>
        </div>

        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-4 text-xs leading-5 text-emerald-100"><b>What this unlocks:</b> SyncWorks can calculate bookable capacity instead of treating the office as one calendar. A 9:00 AM cleaning may use Hygienist Sarah + Chair 2 while Dr. Smith simultaneously performs a crown in Room 3. Conflicting provider/resource combinations are blocked automatically.</div>
      </div>
    </DashboardShell>
  );
}

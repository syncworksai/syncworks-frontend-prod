import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, LoaderCircle, Save, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import { getBusinessWorkforce, saveWorkforceMember } from "../../api/workforce";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function defaultAvailability() {
  return Object.fromEntries(DAYS.map((day) => [day, { open: !["saturday", "sunday"].includes(day), start: "08:00", end: "17:00" }]));
}

function MemberCard({ row, onSaved }) {
  const wf = row.workforce || {};
  const [form, setForm] = useState({
    title: wf.title || "",
    skillsText: Array.isArray(wf.skills) ? wf.skills.join(", ") : "",
    default_buffer_minutes: wf.default_buffer_minutes ?? 0,
    default_job_duration_minutes: wf.default_job_duration_minutes ?? 60,
    route_start_address: wf.route_start_address || "",
    is_schedulable: wf.is_schedulable !== false,
    weekly_availability: wf.weekly_availability && Object.keys(wf.weekly_availability).length ? wf.weekly_availability : defaultAvailability(),
    breaksText: Array.isArray(wf.breaks) ? wf.breaks.map((item) => typeof item === "string" ? item : item?.label || "").filter(Boolean).join(", ") : "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const payload = {
        title: form.title,
        skills: form.skillsText.split(",").map((x) => x.trim()).filter(Boolean),
        default_buffer_minutes: Number(form.default_buffer_minutes || 0),
        default_job_duration_minutes: Number(form.default_job_duration_minutes || 60),
        route_start_address: form.route_start_address,
        is_schedulable: form.is_schedulable,
        weekly_availability: form.weekly_availability,
        breaks: form.breaksText.split(",").map((x) => x.trim()).filter(Boolean),
      };
      const saved = await saveWorkforceMember(row.member_id, payload);
      setNotice("Saved");
      onSaved(saved);
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not save this team member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-black text-white">{row.name}</div>
          <div className="mt-1 text-xs text-slate-500">{row.email} · {String(row.role || "TEAM").replaceAll("_", " ")}</div>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-300"><input type="checkbox" checked={form.is_schedulable} onChange={(e) => setForm((c) => ({ ...c, is_schedulable: e.target.checked }))} />Schedulable</label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-400">Job title<input value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Receptionist, plumber, hygienist..." className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label>
        <label className="text-xs font-bold text-slate-400">Skills<input value={form.skillsText} onChange={(e) => setForm((c) => ({ ...c, skillsText: e.target.value }))} placeholder="water heater, cleaning, alignment" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label>
        <label className="text-xs font-bold text-slate-400">Default job length (min)<input type="number" min="5" value={form.default_job_duration_minutes} onChange={(e) => setForm((c) => ({ ...c, default_job_duration_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label>
        <label className="text-xs font-bold text-slate-400">Buffer between jobs (min)<input type="number" min="0" value={form.default_buffer_minutes} onChange={(e) => setForm((c) => ({ ...c, default_buffer_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label>
        <label className="text-xs font-bold text-slate-400 sm:col-span-2">Route / day start location<input value={form.route_start_address} onChange={(e) => setForm((c) => ({ ...c, route_start_address: e.target.value }))} placeholder="Office, shop, home base, yard..." className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label>
        <label className="text-xs font-bold text-slate-400 sm:col-span-2">Breaks / lunch labels<input value={form.breaksText} onChange={(e) => setForm((c) => ({ ...c, breaksText: e.target.value }))} placeholder="Lunch 12-1, school pickup 3:00" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" /></label>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Weekly availability</div>
        {DAYS.map((day) => {
          const value = form.weekly_availability?.[day] || { open: false, start: "08:00", end: "17:00" };
          return <div key={day} className="grid grid-cols-[86px_34px_1fr_1fr] items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] p-2">
            <div className="capitalize text-xs font-black text-slate-300">{day.slice(0, 3)}</div>
            <input type="checkbox" checked={Boolean(value.open)} onChange={(e) => setForm((c) => ({ ...c, weekly_availability: { ...c.weekly_availability, [day]: { ...value, open: e.target.checked } } }))} />
            <input type="time" disabled={!value.open} value={value.start || "08:00"} onChange={(e) => setForm((c) => ({ ...c, weekly_availability: { ...c.weekly_availability, [day]: { ...value, start: e.target.value } } }))} className="h-9 rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white disabled:opacity-40" />
            <input type="time" disabled={!value.open} value={value.end || "17:00"} onChange={(e) => setForm((c) => ({ ...c, weekly_availability: { ...c.weekly_availability, [day]: { ...value, end: e.target.value } } }))} className="h-9 rounded-lg border border-white/10 bg-slate-900 px-2 text-xs text-white disabled:opacity-40" />
          </div>;
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{notice}</span>
        <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</button>
      </div>
    </article>
  );
}

export default function SboWorkforceSettings() {
  const nav = useNavigate();
  const [data, setData] = useState({ members: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getBusinessWorkforce().then((value) => active && setData(value)).catch((error) => active && setNotice(error?.response?.data?.detail || "Workforce settings are temporarily unavailable.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const roleCounts = useMemo(() => {
    const out = {};
    for (const row of data.members || []) out[row.role] = (out[row.role] || 0) + 1;
    return out;
  }, [data.members]);

  function replaceMember(saved) {
    setData((current) => ({ ...current, members: current.members.map((row) => row.member_id === saved.member_id ? saved : row) }));
  }

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Workforce">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_8%,rgba(139,92,246,.2),transparent_32%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <button type="button" onClick={() => nav("/sbo/settings")} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Business settings</button>
          <div className="mt-4 flex items-start gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200"><UsersRound className="h-6 w-6" /></div><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Unified workforce</div><h1 className="mt-1 text-3xl font-black text-white">Tell SyncWorks who can do what — and when.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Roles control access. Skills control what work a person can perform. Availability, lunch/breaks, buffers and start locations give SYNC the information it needs to optimize appointments, routes and tickets.</p></div></div>
        </section>

        <section className="grid gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-2xl font-black text-white">{data.members?.length || 0}</div><div className="mt-1 text-xs text-slate-500">Team members</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-2xl font-black text-white">{roleCounts.TECHNICIAN || roleCounts.TECH || 0}</div><div className="mt-1 text-xs text-slate-500">Technicians</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-2xl font-black text-white">{roleCounts.DISPATCH || 0}</div><div className="mt-1 text-xs text-slate-500">Dispatch</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-2xl font-black text-white">{roleCounts.ACCOUNTING || 0}</div><div className="mt-1 text-xs text-slate-500">Accounting</div></div>
        </section>

        {notice ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4 text-sm text-amber-100">{notice}</div> : null}
        {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-200" /></div> : null}
        {!loading && !(data.members || []).length ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-sm text-slate-400"><BriefcaseBusiness className="mb-2 h-5 w-5 text-violet-200" />No active Business team members yet. Invite staff through Team first; once they become Business users, their scheduling profile appears here.</div> : null}
        <div className="grid gap-3 lg:grid-cols-2">{(data.members || []).map((row) => <MemberCard key={row.member_id} row={row} onSaved={replaceMember} />)}</div>
      </div>
    </DashboardShell>
  );
}

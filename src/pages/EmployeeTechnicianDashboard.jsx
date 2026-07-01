import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

const upper = (v) => String(v || "").toUpperCase();
const rowsOf = (v) => Array.isArray(v) ? v : Array.isArray(v?.results) ? v.results : [];
const titleOf = (t) => t?.title || t?.display_title || t?.service_category_label || t?.category_label || t?.category?.name || "Service job";
const customerOf = (t) => t?.customer_name || t?.customer_full_name || t?.customer?.full_name || t?.requester_name || "Customer";
const addressOf = (t) => t?.service_address || t?.address || [t?.city, t?.state, t?.service_zip].filter(Boolean).join(", ") || "Address pending";
const phoneOf = (t) => t?.customer_phone || t?.requester_phone || t?.customer?.phone || "";

function whenOf(t) {
  const value = t?.scheduled_start || t?.scheduled_at || t?.needed_by_date || t?.created_at;
  if (!value) return "Schedule pending";
  try {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch {
    return "Schedule pending";
  }
}

function nextAction(value) {
  const s = upper(value);
  if (["ASSIGNED", "ACCEPTED", "SCHEDULED"].includes(s)) return { label: "Start route", status: "EN_ROUTE", tone: "cyan" };
  if (s === "EN_ROUTE") return { label: "Arrived", status: "ON_SITE", tone: "violet" };
  if (s === "ON_SITE") return { label: "Start work", status: "IN_PROGRESS", tone: "emerald" };
  if (s === "IN_PROGRESS") return { label: "Complete job", status: "COMPLETED", tone: "emerald" };
  return null;
}

function toneFor(value) {
  const s = upper(value);
  if (s === "IN_PROGRESS") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (s === "ON_SITE") return "border-violet-400/30 bg-violet-400/10 text-violet-200";
  if (s === "EN_ROUTE") return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  if (s === "COMPLETED") return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

function Button({ children, tone = "slate", disabled, onClick }) {
  const tones = {
    cyan: "border-cyan-300/35 bg-gradient-to-r from-cyan-500 to-blue-600 text-white",
    violet: "border-violet-300/35 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white",
    emerald: "border-emerald-300/35 bg-gradient-to-r from-emerald-500 to-green-600 text-white",
    slate: "border-slate-700 bg-slate-950/80 text-slate-200",
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-4 text-sm font-black disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  );
}

function Metric({ label, value, hint, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-400/10",
    violet: "border-violet-400/20 bg-violet-400/10",
    emerald: "border-emerald-400/20 bg-emerald-400/10",
  };
  return (
    <div className={`rounded-3xl border p-4 ${tones[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function JobCard({ ticket, busyId, onStatus, onOpen }) {
  const action = nextAction(ticket?.status);
  const address = addressOf(ticket);
  const phone = phoneOf(ticket);
  const maps = address !== "Address pending"
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/75 shadow-xl">
      <button type="button" onClick={() => onOpen(ticket?.id)} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Job #{ticket?.id}</div>
            <h2 className="mt-2 truncate text-xl font-black text-white">{titleOf(ticket)}</h2>
            <div className="mt-1 text-sm text-slate-300">{customerOf(ticket)}</div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${toneFor(ticket?.status)}`}>
            {upper(ticket?.status).replaceAll("_", " ") || "ASSIGNED"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 rounded-3xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
          <div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Schedule</div><div className="mt-1 font-bold text-slate-100">{whenOf(ticket)}</div></div>
          <div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Location</div><div className="mt-1 text-slate-200">{address}</div></div>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-4">
        {maps ? <a href={maps} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-sm font-black text-cyan-200">Directions</a> : <Button disabled>Directions</Button>}
        {phone ? <a href={`tel:${String(phone).replace(/[^\d+]/g, "")}`} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 px-3 text-sm font-black text-violet-200">Call customer</a> : <Button disabled>Call customer</Button>}
        <Button onClick={() => onOpen(ticket?.id)}>Notes & photos</Button>
        {action ? <Button tone={action.tone} disabled={busyId === ticket?.id} onClick={() => onStatus(ticket, action.status)}>{busyId === ticket?.id ? "Updatingâ€¦" : action.label}</Button> : <Button onClick={() => onOpen(ticket?.id)}>Open job</Button>}
      </div>
    </article>
  );
}

export default function EmployeeTechnicianDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [meRes, ticketRes] = await Promise.all([api.get("/auth/me/"), api.get("/tickets/")]);
      const current = meRes?.data || null;
      const userId = Number(current?.id || current?.user?.id || 0);
      const all = rowsOf(ticketRes?.data);
      setMe(current);
      setTickets(userId ? all.filter((t) => {
        const assignedId = Number(t?.assigned_member || t?.assigned_member_id || t?.assigned_to || t?.assigned_to_id || 0);
        return !assignedId || assignedId === userId;
      }) : all);
    } catch (e) {
      setError(e?.response?.data?.detail || "Unable to load assigned jobs.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => tickets.filter((t) => ["ASSIGNED", "ACCEPTED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(upper(t?.status))), [tickets]);
  const completed = useMemo(() => tickets.filter((t) => upper(t?.status) === "COMPLETED"), [tickets]);
  const today = useMemo(() => {
    const key = new Date().toDateString();
    return active.filter((t) => {
      const value = t?.scheduled_start || t?.scheduled_at || t?.needed_by_date;
      if (!value) return true;
      try { return new Date(value).toDateString() === key; } catch { return true; }
    });
  }, [active]);
  const jobs = today.length ? today : active;

  async function updateStatus(ticket, status) {
    setBusyId(ticket.id); setError("");
    try {
      await api.post(`/tickets/${ticket.id}/set-status/`, { status });
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || "Unable to update job status.");
    } finally {
      setBusyId(null);
    }
  }

  const name = `${me?.first_name || ""} ${me?.last_name || ""}`.trim() || me?.name || me?.email || "Technician";
  const navItems = [
    ["Jobs", "â–¤", "/employee"], ["Calendar", "â—·", "/calendar"], ["Inbox", "âœ‰", "/employee/inbox"], ["Settings", "âš™", "/employee/settings"],
  ];

  return (
    <div className="min-h-screen bg-[#020617] pb-28 text-slate-100">
      <ModeBar title="Technician" subtitle="Assigned jobs and field workflow"
        rightActions={<button type="button" onClick={load} className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-xs font-black text-slate-200">Refresh</button>} />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/80 p-5 shadow-[0_0_60px_rgba(34,211,238,0.10)]">
          <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Field command</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Welcome, {name}</h1>
            <p className="mt-2 text-sm text-slate-400">Move each job from route to arrival, work, and completion.</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Today" value={loading ? "â€¦" : jobs.length} hint="Ready jobs" />
              <Metric label="Active" value={loading ? "â€¦" : active.length} hint="In workflow" tone="violet" />
              <Metric label="Done" value={loading ? "â€¦" : completed.length} hint="Completed" tone="emerald" />
            </div>
          </div>
        </section>

        {error ? <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><h2 className="text-xl font-black text-white">Your jobs</h2><p className="mt-1 text-xs text-slate-400">Assigned work available to this employee account.</p></div>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">{jobs.length} jobs</span>
          </div>
          <div className="space-y-4">
            {loading ? <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400">Loading assigned jobsâ€¦</div>
              : jobs.length ? jobs.map((ticket) => <JobCard key={ticket.id} ticket={ticket} busyId={busyId} onStatus={updateStatus} onOpen={(id) => navigate(`/tickets/${id}?return=/employee`)} />)
              : <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 text-center"><div className="text-3xl">âœ“</div><div className="mt-3 text-lg font-black text-white">No active jobs</div><div className="mt-1 text-sm text-slate-400">Assigned work will appear here automatically.</div></div>}
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {navItems.map(([label, icon, href], index) => <button key={label} type="button" onClick={() => navigate(href)} className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-[10px] font-black ${index === 0 ? "bg-cyan-400/10 text-cyan-200" : "text-slate-500"}`}><span className="text-lg">{icon}</span><span className="mt-0.5">{label}</span></button>)}
        </div>
      </nav>
    </div>
  );
}

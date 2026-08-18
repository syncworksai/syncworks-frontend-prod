import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Link2, MapPin, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import ModeBar from "../components/ModeBar";
import CalendarConnectionsDrawer from "../components/CalendarConnectionsDrawer";
import TravelWeatherAssistCard from "../components/TravelWeatherAssistCard";
import api from "../api/client";
import { getCalendarConnections } from "../api/calendarConnections";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function pad(value) { return String(value).padStart(2, "0"); }
function ymd(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function startOfWeek(value) {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}
function sourceTone(source) {
  const key = String(source || "MANUAL").toUpperCase();
  if (key === "GOOGLE") return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
  if (key === "OUTLOOK") return "border-violet-400/25 bg-violet-500/10 text-violet-100";
  if (key === "HEALTH") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (key === "TICKET") return "border-blue-400/25 bg-blue-500/10 text-blue-100";
  if (key === "SYNC") return "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100";
  return "border-slate-700 bg-slate-900/70 text-slate-200";
}
function sourceLabel(source) {
  const key = String(source || "MANUAL").toUpperCase();
  if (key === "OUTLOOK") return "Outlook";
  if (key === "GOOGLE") return "Google";
  if (key === "HEALTH") return "Health";
  if (key === "TICKET") return "Service";
  if (key === "SYNC") return "SYNC";
  if (key === "SYSTEM") return "SyncWorks";
  return "Personal";
}
function eventLocation(event) {
  return [event.location_name, event.address_line1, event.city, event.state].filter(Boolean).join(" · ");
}
function isExternal(source) { return ["GOOGLE", "OUTLOOK", "APPLE"].includes(String(source || "").toUpperCase()); }

function EventCard({ event, onCancel }) {
  const start = new Date(event.start_at);
  const end = event.end_at ? new Date(event.end_at) : null;
  const location = eventLocation(event);
  const editable = !isExternal(event.source) && event.status === "ACTIVE";
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_45px_rgba(0,0,0,.2)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] ${sourceTone(event.source)}`}>{sourceLabel(event.source)}</span>
            {event.all_day ? <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-slate-300">All day</span> : null}
            {event.status !== "ACTIVE" ? <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-rose-200">{event.status}</span> : null}
          </div>
          <h3 className="mt-3 text-base font-black text-white">{event.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: event.all_day ? undefined : "numeric", minute: event.all_day ? undefined : "2-digit" })}{end && !event.all_day ? ` – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}</span>
            {location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{location}</span> : null}
          </div>
          {event.arrival_buffer_minutes ? <div className="mt-2 text-[11px] font-bold text-amber-200">Arrival target: {event.arrival_buffer_minutes} min early</div> : null}
          {event.description ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{event.description}</p> : null}
        </div>
        {editable ? <button type="button" onClick={() => onCancel(event)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-200" aria-label={`Cancel ${event.title}`}><X className="h-4 w-4" /></button> : null}
      </div>
    </article>
  );
}

function ConnectionSummary({ data, onOpen, onRefresh, loading }) {
  const connections = data?.connections || [];
  const enabled = connections.filter((row) => row.enabled !== false && row.connected !== false);
  const lastSync = enabled.map((row) => row.last_synced_at).filter(Boolean).sort().at(-1);
  return (
    <section className="rounded-[1.9rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-slate-950/75 to-violet-500/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SYNC Assist Calendar</div>
          <h2 className="mt-1 text-xl font-black text-white">One schedule across your life.</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">Google, Outlook, SyncWorks services, Health, Social events and manual plans feed the same master calendar. SYNC Assist reads this schedule for briefings, conflicts and reminders.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-slate-300" aria-label="Refresh connections"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button type="button" onClick={onOpen} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100"><Link2 className="h-4 w-4" />Manage calendars</button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Connected</div><div className="mt-1 text-2xl font-black text-white">{enabled.length}</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Google</div><div className="mt-1 text-2xl font-black text-white">{enabled.filter((row) => row.provider === "GOOGLE").length}</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Outlook</div><div className="mt-1 text-2xl font-black text-white">{enabled.filter((row) => row.provider === "MICROSOFT").length}</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Last external sync</div><div className="mt-2 text-xs font-bold text-slate-200">{lastSync ? new Date(lastSync).toLocaleString() : "Not synced yet"}</div></div>
      </div>
    </section>
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [connections, setConnections] = useState({ connections: [], providers: {} });
  const [loading, setLoading] = useState(true);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState("agenda");
  const [filter, setFilter] = useState("ALL");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({ title: "", date: ymd(), time: "09:00", duration_minutes: "60", location_name: "", arrival_buffer_minutes: "0", reminder_minutes: "30", description: "" });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } });
      setEvents(safeList(response.data));
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not load your SyncWorks Calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    setConnectionLoading(true);
    try { setConnections(await getCalendarConnections()); }
    catch { setConnections({ connections: [], providers: {} }); }
    finally { setConnectionLoading(false); }
  }, []);

  useEffect(() => { loadEvents(); loadConnections(); }, [loadEvents, loadConnections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("calendar_oauth");
    const provider = params.get("provider");
    if (oauth === "connected") {
      setNotice(`${provider === "microsoft" ? "Outlook" : "Google"} connected. SyncWorks will import the calendars you select.`);
      loadConnections();
      loadEvents();
    } else if (oauth === "error") {
      setError(`Could not finish ${provider || "calendar"} connection. Open Manage calendars to try again.`);
    }
    if (oauth) window.history.replaceState({}, "", window.location.pathname);
  }, [loadConnections, loadEvents]);

  const filtered = useMemo(() => events.filter((event) => {
    if (filter === "ALL") return true;
    if (filter === "EXTERNAL") return isExternal(event.source);
    if (filter === "SYNCWORKS") return !isExternal(event.source) && String(event.source).toUpperCase() !== "MANUAL";
    return String(event.source).toUpperCase() === "MANUAL";
  }).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)), [events, filter]);

  const today = useMemo(() => filtered.filter((event) => ymd(event.start_at) === ymd()), [filtered]);
  const nextEvent = useMemo(() => filtered.find((event) => new Date(event.start_at) >= new Date()) || null, [filtered]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  async function createEvent() {
    const title = String(draft.title || "").trim();
    if (!title) return;
    const start = new Date(`${draft.date}T${draft.time || "09:00"}`);
    const duration = Math.max(0, Number(draft.duration_minutes || 0));
    const end = duration ? new Date(start.getTime() + duration * 60000) : null;
    setError("");
    try {
      await api.post("/personal-calendar/events/", {
        title,
        description: draft.description,
        start_at: start.toISOString(),
        end_at: end?.toISOString() || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
        location_name: draft.location_name,
        arrival_buffer_minutes: Number(draft.arrival_buffer_minutes || 0),
        reminder_minutes: Number(draft.reminder_minutes || 30),
        source: "MANUAL",
      });
      setDraft((value) => ({ ...value, title: "", location_name: "", description: "" }));
      setShowComposer(false);
      setNotice("Event added to your SyncWorks Calendar and SYNC Assist context.");
      await loadEvents();
    } catch (e) { setError(e?.response?.data?.detail || "Could not add this event."); }
  }

  async function cancelEvent(event) {
    if (!window.confirm(`Cancel ${event.title}?`)) return;
    try {
      await api.post(`/personal-calendar/events/${event.id}/cancel/`, {});
      await loadEvents();
    } catch (e) { setError(e?.response?.data?.detail || "Could not cancel this event."); }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Calendar" subtitle="Your master schedule for SYNC Assist" />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5 pb-28 sm:py-6 lg:pb-8">
        <ConnectionSummary data={connections} onOpen={() => setDrawerOpen(true)} onRefresh={() => { loadConnections(); loadEvents(); }} loading={connectionLoading || loading} />

        {notice ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Today</div><div className="mt-2 text-3xl font-black text-white">{today.length}</div><div className="mt-1 text-xs text-slate-500">scheduled item{today.length === 1 ? "" : "s"}</div></div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 sm:col-span-2"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Next</div>{nextEvent ? <><div className="mt-2 font-black text-white">{nextEvent.title}</div><div className="mt-1 text-xs text-slate-400">{new Date(nextEvent.start_at).toLocaleString()} · {sourceLabel(nextEvent.source)}</div></> : <div className="mt-2 text-sm text-slate-400">Nothing upcoming.</div>}</div>
        </section>

        <TravelWeatherAssistCard event={nextEvent} onUpdated={loadEvents} />

        <section className="rounded-[1.9rem] border border-white/10 bg-slate-950/45 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Master calendar</div><h2 className="mt-1 text-xl font-black text-white">Everything in one timeline.</h2></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowComposer((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><Plus className="h-4 w-4" />Add event</button>
              <button type="button" onClick={loadEvents} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[["ALL","All"],["PERSONAL","Personal"],["EXTERNAL","Google + Outlook"],["SYNCWORKS","SyncWorks"]].map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-black ${filter === value ? "border-cyan-300/35 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{label}</button>)}
          </div>

          {showComposer ? <div className="mt-4 rounded-3xl border border-cyan-400/15 bg-cyan-500/[.04] p-4">
            <div className="flex items-center gap-2 text-sm font-black text-white"><Sparkles className="h-4 w-4 text-cyan-200" />Add to SYNC Assist</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} placeholder="Event title" className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
              <input type="date" value={draft.date} onChange={(e) => setDraft((v) => ({ ...v, date: e.target.value }))} className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
              <input type="time" value={draft.time} onChange={(e) => setDraft((v) => ({ ...v, time: e.target.value }))} className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
              <input value={draft.location_name} onChange={(e) => setDraft((v) => ({ ...v, location_name: e.target.value }))} placeholder="Location" className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
              <label className="text-xs text-slate-400">Duration (min)<input type="number" min="0" value={draft.duration_minutes} onChange={(e) => setDraft((v) => ({ ...v, duration_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" /></label>
              <label className="text-xs text-slate-400">Arrive early (min)<input type="number" min="0" max="240" value={draft.arrival_buffer_minutes} onChange={(e) => setDraft((v) => ({ ...v, arrival_buffer_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" /></label>
              <label className="text-xs text-slate-400">Reminder (min)<input type="number" min="0" value={draft.reminder_minutes} onChange={(e) => setDraft((v) => ({ ...v, reminder_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" /></label>
              <button type="button" onClick={createEvent} className="min-h-11 self-end rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-sm font-black text-white">Save event</button>
            </div>
          </div> : null}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1"><button type="button" onClick={() => setView("agenda")} className={`rounded-xl px-3 py-2 text-xs font-black ${view === "agenda" ? "bg-white/10 text-white" : "text-slate-500"}`}>Agenda</button><button type="button" onClick={() => setView("week")} className={`rounded-xl px-3 py-2 text-xs font-black ${view === "week" ? "bg-white/10 text-white" : "text-slate-500"}`}>Week</button></div>
            {view === "week" ? <div className="flex items-center gap-2"><button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><ChevronLeft className="h-4 w-4" /></button><div className="text-xs font-black text-slate-300">{weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div><button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><ChevronRight className="h-4 w-4" /></button></div> : null}
          </div>

          {loading ? <div className="mt-5 text-sm text-slate-400">Loading master calendar…</div> : view === "agenda" ? <div className="mt-5 space-y-3">{filtered.length ? filtered.map((event) => <EventCard key={event.id} event={event} onCancel={cancelEvent} />) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No calendar items match this filter.</div>}</div> : <div className="mt-5 grid gap-2 md:grid-cols-7">{weekDays.map((day) => { const rows = filtered.filter((event) => ymd(event.start_at) === ymd(day)); return <div key={ymd(day)} className="min-h-44 rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="font-black text-white">{day.toLocaleDateString("en-US", { weekday: "short" })}</div><div className="text-xs text-slate-500">{day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div><div className="mt-3 space-y-2">{rows.map((event) => <div key={event.id} className={`rounded-xl border p-2 ${sourceTone(event.source)}`}><div className="truncate text-[11px] font-black">{event.title}</div><div className="mt-0.5 text-[10px] opacity-75">{new Date(event.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div></div>)}</div></div>; })}</div>}
        </section>
      </main>

      <CalendarConnectionsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} returnTo="/customer/calendar" onChanged={(next) => { setConnections(next); loadEvents(); }} />
    </div>
  );
}

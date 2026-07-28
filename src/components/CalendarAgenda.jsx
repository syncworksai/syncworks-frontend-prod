import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Grid3X3, List, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react";

import api from "../api/client";

const LIFE_EVENTS_KEY = "sw_customer_life_schedule_v1";
const LIFE_EVENTS_SIGNAL = "syncworks:life-events-changed";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function readLifeEvents() {
  try {
    const value = JSON.parse(localStorage.getItem(LIFE_EVENTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeLifeEvents(events) {
  try {
    localStorage.setItem(LIFE_EVENTS_KEY, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent(LIFE_EVENTS_SIGNAL, { detail: events }));
  } catch {
    // Keep the UI usable if browser storage is unavailable.
  }
}

function uid() {
  return `${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function ymd(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function ticketStart(ticket) {
  const raw = ticket?.scheduled_at || ticket?.schedule_time || ticket?.scheduled_start || ticket?.appointment_at;
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isFinite(value.getTime()) ? value : null;
}

function normalizeEvents(lifeEvents, tickets) {
  const personal = lifeEvents.map((item) => {
    const start = new Date(`${item.date || ymd()}T${item.all_day ? "09:00" : item.time || "09:00"}`);
    if (!Number.isFinite(start.getTime())) return null;
    return {
      id: `life-${item.id}`,
      sourceId: item.id,
      source: "Personal",
      title: item.title || "Personal event",
      category: item.category || "Personal",
      start,
      location: item.location || "",
      notes: item.notes || "",
      removable: true,
    };
  }).filter(Boolean);

  const service = tickets.map((ticket) => {
    const start = ticketStart(ticket);
    if (!start) return null;
    return {
      id: `ticket-${ticket.id}`,
      sourceId: ticket.id,
      source: "Service",
      title: ticket.taxonomy_label || ticket.category_label || ticket.category_name || ticket.title || `Service request #${ticket.id}`,
      category: ticket.status || "Service",
      start,
      location: ticket.service_address || "",
      notes: ticket.description || "",
      removable: false,
    };
  }).filter(Boolean);

  return [...personal, ...service].sort((a, b) => a.start - b.start);
}

function EventCard({ event, onRemove }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[.13em]">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">{event.source}</span>
            <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-violet-100">{event.category}</span>
          </div>
          <h4 className="mt-3 font-black text-white">{event.title}</h4>
          <div className="mt-1 text-xs text-slate-400">{event.start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          {event.location ? <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{event.location}</div> : null}
          {event.notes ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{event.notes}</p> : null}
        </div>
        {event.removable ? <button type="button" onClick={() => onRemove(event.sourceId)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-100" aria-label={`Remove ${event.title}`}><Trash2 className="h-4 w-4" /></button> : null}
      </div>
    </article>
  );
}

export default function CalendarAgenda({ modeLabel = "Life Schedule", showComposer = true }) {
  const [tickets, setTickets] = useState([]);
  const [lifeEvents, setLifeEvents] = useState(readLifeEvents);
  const [view, setView] = useState("agenda");
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const serializedRef = useRef(JSON.stringify(readLifeEvents()));
  const [draft, setDraft] = useState({ title: "", category: "Personal", date: ymd(), time: "09:00", duration_minutes: "60", location: "", notes: "", repeat: "None" });

  async function loadTickets() {
    setLoading(true);
    try {
      const response = await api.get("/tickets/");
      setTickets(safeList(response.data));
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    function reconcile(value = readLifeEvents()) {
      const next = Array.isArray(value) ? value : readLifeEvents();
      const serialized = JSON.stringify(next);
      if (serialized !== serializedRef.current) {
        serializedRef.current = serialized;
        setLifeEvents(next);
      }
    }
    const onSignal = (event) => reconcile(event.detail);
    const onStorage = (event) => { if (!event.key || event.key === LIFE_EVENTS_KEY) reconcile(); };
    window.addEventListener(LIFE_EVENTS_SIGNAL, onSignal);
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(() => reconcile(), 750);
    return () => {
      window.removeEventListener(LIFE_EVENTS_SIGNAL, onSignal);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, []);

  const events = useMemo(() => normalizeEvents(lifeEvents, tickets), [lifeEvents, tickets]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  function commitEvents(next) {
    serializedRef.current = JSON.stringify(next);
    setLifeEvents(next);
    writeLifeEvents(next);
  }

  function addEvent() {
    const title = String(draft.title || "").trim();
    if (!title) return;
    const next = [{ id: uid(), ...draft, title, status: "PLANNED", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...lifeEvents];
    commitEvents(next);
    setDraft((value) => ({ ...value, title: "", location: "", notes: "" }));
  }

  function removeEvent(id) {
    commitEvents(lifeEvents.filter((item) => item.id !== id));
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_60px_rgba(0,0,0,.25)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-lg font-black text-white">{modeLabel}</div><div className="mt-1 text-sm text-slate-400">Personal events and scheduled services now read from the same live browser source.</div></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setView("agenda")} className={`grid h-11 w-11 place-items-center rounded-2xl border ${view === "agenda" ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.04] text-slate-300"}`} aria-label="Agenda view"><List className="h-5 w-5" /></button>
          <button type="button" onClick={() => setView("grid")} className={`grid h-11 w-11 place-items-center rounded-2xl border ${view === "grid" ? "border-violet-300/35 bg-violet-500/12 text-violet-100" : "border-white/10 bg-white/[.04] text-slate-300"}`} aria-label="Week grid"><Grid3X3 className="h-5 w-5" /></button>
          <button type="button" onClick={loadTickets} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-slate-300" aria-label="Refresh"><RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {showComposer ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <div className="flex items-center gap-2 font-black text-white"><Plus className="h-4 w-4 text-cyan-200" />Add Personal event</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder="Event title" className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
          <input type="date" value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value }))} className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
          <input type="time" value={draft.time} onChange={(event) => setDraft((value) => ({ ...value, time: event.target.value }))} className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
          <input value={draft.location} onChange={(event) => setDraft((value) => ({ ...value, location: event.target.value }))} placeholder="Location" className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" />
        </div>
        <button type="button" onClick={addEvent} className="mt-3 min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white">Add event</button>
      </div> : null}

      {view === "agenda" ? <div className="mt-5 space-y-3">{events.length ? events.map((event) => <EventCard key={event.id} event={event} onRemove={removeEvent} />) : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">No events are currently available.</div>}</div> : <div className="mt-5">
        <div className="mb-3 flex items-center justify-between"><button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300">Previous</button><div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="h-4 w-4 text-cyan-200" />Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div><button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300">Next</button></div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">{weekDays.map((day) => { const dayEvents = events.filter((event) => ymd(event.start) === ymd(day)); return <div key={ymd(day)} className="min-h-36 rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="font-black text-white">{day.toLocaleDateString("en-US", { weekday: "short" })}</div><div className="text-xs text-slate-500">{day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div><div className="mt-3 space-y-2">{dayEvents.map((event) => <button type="button" key={event.id} onClick={() => setView("agenda")} className="w-full rounded-xl border border-cyan-400/15 bg-cyan-500/[.07] p-2 text-left text-[11px] font-black text-cyan-100"><div className="truncate">{event.title}</div><div className="mt-0.5 text-[10px] font-normal text-slate-400">{event.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div></button>)}</div></div>; })}</div>
      </div>}

      <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-500/[.05] p-3 text-xs leading-5 text-amber-100">Personal events currently synchronize between views on this device. Cross-device persistence will require the upcoming backend calendar event model.</div>
    </section>
  );
}

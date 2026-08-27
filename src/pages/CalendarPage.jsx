import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardPaste,
  CloudSun,
  Link2,
  MapPin,
  Mic,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
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
function recurrenceRule(value) {
  if (value === "DAILY") return "RRULE:FREQ=DAILY;INTERVAL=1";
  if (value === "WEEKLY") return "RRULE:FREQ=WEEKLY;INTERVAL=1";
  if (value === "MONTHLY") return "RRULE:FREQ=MONTHLY;INTERVAL=1";
  return "";
}
function recurrenceLabel(rule) {
  const value = String(rule || "").toUpperCase();
  if (value.includes("FREQ=DAILY")) return "Daily";
  if (value.includes("FREQ=WEEKLY")) return "Weekly";
  if (value.includes("FREQ=MONTHLY")) return "Monthly";
  if (value) return "Recurring";
  return "";
}
function sourceTone(source) {
  const key = String(source || "MANUAL").toUpperCase();
  if (key === "GOOGLE") return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
  if (key === "OUTLOOK" || key === "MICROSOFT") return "border-violet-400/25 bg-violet-500/10 text-violet-100";
  if (key === "HEALTH") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (key === "TICKET") return "border-blue-400/25 bg-blue-500/10 text-blue-100";
  if (key === "SOCIAL") return "border-pink-400/25 bg-pink-500/10 text-pink-100";
  if (key === "SYNC") return "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100";
  return "border-slate-700 bg-slate-900/70 text-slate-200";
}
function sourceLabel(source) {
  const key = String(source || "MANUAL").toUpperCase();
  if (key === "OUTLOOK" || key === "MICROSOFT") return "Outlook";
  if (key === "GOOGLE") return "Google";
  if (key === "HEALTH") return "Health";
  if (key === "TICKET") return "Service";
  if (key === "SOCIAL") return "Social";
  if (key === "SYNC") return "SYNC";
  if (key === "SYSTEM") return "SyncWorks";
  return "Personal";
}
function eventLocation(event) {
  return [event.location_name, event.address_line1, event.city, event.state].filter(Boolean).join(" · ");
}
function isExternal(source) { return ["GOOGLE", "OUTLOOK", "MICROSOFT", "APPLE"].includes(String(source || "").toUpperCase()); }

const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

function nextNamedDay(name) {
  const target = DAY_INDEX[String(name || "").toLowerCase()];
  if (target === undefined) return null;
  const now = new Date();
  const delta = (target - now.getDay() + 7) % 7 || 7;
  return addDays(now, delta);
}

function normalizeTime(hourRaw, minuteRaw, meridiem) {
  let hour = Number(hourRaw || 9);
  const minute = Number(minuteRaw || 0);
  const suffix = String(meridiem || "").toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return `${pad(Math.min(23, Math.max(0, hour)))}:${pad(Math.min(59, Math.max(0, minute)))}`;
}

function parseSmartCapture(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  let date = new Date();

  if (/\btomorrow\b/.test(lower)) date = addDays(date, 1);
  else {
    const named = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (named) date = nextNamedDay(named[1]) || date;
    const numeric = lower.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
    if (numeric) {
      const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : date.getFullYear();
      const candidate = new Date(year, Number(numeric[1]) - 1, Number(numeric[2]));
      if (Number.isFinite(candidate.getTime())) date = candidate;
    }
  }

  const timeMatch = lower.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || lower.match(/\b(?:at\s*)?(\d{1,2}):(\d{2})\b/);
  const time = timeMatch ? normalizeTime(timeMatch[1], timeMatch[2], timeMatch[3]) : "09:00";

  const locationMatch = raw.match(/(?:\bat\b|\b@\b)\s+([^,.]+(?:,\s*[^,.]+){0,2})\s*$/i);
  const location = locationMatch ? locationMatch[1].trim() : "";

  let title = raw
    .replace(/\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g, "")
    .replace(/\b(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "")
    .replace(/\b(?:at\s*)?\d{1,2}:\d{2}\b/gi, "")
    .replace(locationMatch?.[0] || "", "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s-]+|[,\s-]+$/g, "")
    .trim();
  if (!title) title = "Appointment";

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    date: ymd(date),
    time,
    location_name: location,
    duration_minutes: "60",
    arrival_buffer_minutes: location ? "30" : "0",
    reminder_minutes: "30",
    recurrence: "NONE",
    description: `Captured by SYNC from: ${raw}`,
  };
}

function EventCard({ event, onCancel }) {
  const start = new Date(event.start_at);
  const end = event.end_at ? new Date(event.end_at) : null;
  const location = eventLocation(event);
  const editable = !isExternal(event.source) && event.status === "ACTIVE";
  const repeats = recurrenceLabel(event.recurrence_rule);
  const weatherDependent = Boolean(event?.metadata?.weather_dependent);
  return (
    <article className="rounded-[1.4rem] border border-white/10 bg-slate-950/65 p-4 transition hover:border-white/20 hover:bg-white/[.035]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] ${sourceTone(event.source)}`}>{sourceLabel(event.source)}</span>
            {event.all_day ? <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-slate-300">All day</span> : null}
            {repeats ? <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-cyan-100">{repeats}</span> : null}
            {weatherDependent ? <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-amber-100">Weather permitting</span> : null}
          </div>
          <h3 className="mt-3 text-base font-black text-white">{event.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: event.all_day ? undefined : "numeric", minute: event.all_day ? undefined : "2-digit" })}{end && !event.all_day ? ` – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}</span>
            {location ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{location}</span> : null}
          </div>
          {event.arrival_buffer_minutes ? <div className="mt-2 text-[11px] font-bold text-amber-200">Arrive {event.arrival_buffer_minutes} min early</div> : null}
        </div>
        {editable ? <button type="button" onClick={() => onCancel(event)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-200" aria-label={`Cancel ${event.title}`}><X className="h-4 w-4" /></button> : null}
      </div>
    </article>
  );
}

function ConnectionSummary({ data, onOpen, onRefresh, loading }) {
  const connections = data?.connections || [];
  const enabled = connections.filter((row) => row.enabled !== false && row.connected !== false);
  return (
    <section className="rounded-[1.5rem] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-slate-950/75 to-violet-500/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Connected calendars</div><div className="mt-1 text-2xl font-black text-white">{enabled.length}</div></div>
        <button type="button" onClick={onRefresh} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/[.06] p-3"><div className="text-slate-500">Google</div><div className="mt-1 font-black text-cyan-100">{enabled.filter((row) => row.provider === "GOOGLE").length}</div></div>
        <div className="rounded-xl border border-violet-400/15 bg-violet-500/[.06] p-3"><div className="text-slate-500">Outlook</div><div className="mt-1 font-black text-violet-100">{enabled.filter((row) => row.provider === "MICROSOFT").length}</div></div>
      </div>
      <button type="button" onClick={onOpen} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100"><Link2 className="h-4 w-4" />Manage calendars</button>
    </section>
  );
}

function QuickCapture({ text, setText, onParse, onVoice, listening }) {
  return (
    <section className="rounded-[1.6rem] border border-violet-400/20 bg-[linear-gradient(145deg,rgba(76,29,149,.16),rgba(2,6,23,.88))] p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-violet-200"><WandSparkles className="h-4 w-4" />Quick capture</div>
      <p className="mt-2 text-xs leading-5 text-slate-400">Paste or say an appointment. SYNC will prepare the event for review before saving.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Dentist Thursday at 10:30 AM at 123 Main St" className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-sm text-white outline-none placeholder:text-slate-600" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onParse} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-xs font-black text-white"><ClipboardPaste className="h-4 w-4" />Prepare event</button>
        <button type="button" onClick={onVoice} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black ${listening ? "border-rose-400/30 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/[.04] text-slate-200"}`}><Mic className="h-4 w-4" />{listening ? "Listening…" : "Voice"}</button>
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
  const [captureText, setCaptureText] = useState("");
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState({ title: "", date: ymd(), time: "09:00", duration_minutes: "60", location_name: "", arrival_buffer_minutes: "0", reminder_minutes: "30", description: "", recurrence: "NONE" });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } });
      setEvents(safeList(response.data));
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not load your SyncWorks Calendar.");
    } finally { setLoading(false); }
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
    } else if (oauth === "error") setError(`Could not finish ${provider || "calendar"} connection. Open Manage calendars to try again.`);
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
  const upcoming = useMemo(() => filtered.filter((event) => new Date(event.start_at) >= new Date()).slice(0, 4), [filtered]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  function prepareCapture() {
    const parsed = parseSmartCapture(captureText);
    if (!parsed) return;
    setDraft(parsed);
    setShowComposer(true);
    setNotice("SYNC prepared this appointment. Review the details, then save it.");
  }

  function startVoiceCapture() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice capture is not supported by this browser. Paste the appointment text instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setCaptureText(transcript);
      const parsed = parseSmartCapture(transcript);
      if (parsed) { setDraft(parsed); setShowComposer(true); }
    };
    recognition.onerror = () => setError("Could not capture that voice input. Try again or paste the appointment text.");
    recognition.onend = () => setListening(false);
    recognition.start();
  }

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
        recurrence_rule: recurrenceRule(draft.recurrence),
        source: "MANUAL",
      });
      setDraft({ title: "", date: ymd(), time: "09:00", duration_minutes: "60", location_name: "", arrival_buffer_minutes: "0", reminder_minutes: "30", description: "", recurrence: "NONE" });
      setCaptureText("");
      setShowComposer(false);
      setNotice("Event added to your SyncWorks Calendar and SYNC context.");
      await loadEvents();
    } catch (e) { setError(e?.response?.data?.detail || "Could not add this event."); }
  }

  async function cancelEvent(event) {
    if (!window.confirm(`Cancel ${event.title}?`)) return;
    try { await api.post(`/personal-calendar/events/${event.id}/cancel/`, {}); await loadEvents(); }
    catch (e) { setError(e?.response?.data?.detail || "Could not cancel this event."); }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Calendar" subtitle="Your master schedule for SYNC Assist" />
      <main className="mx-auto w-full max-w-[1680px] px-3 py-4 pb-28 sm:px-4 lg:px-6 lg:pb-8">
        {notice ? <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}
        {error ? <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_330px]">
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <ConnectionSummary data={connections} onOpen={() => setDrawerOpen(true)} onRefresh={() => { loadConnections(); loadEvents(); }} loading={connectionLoading || loading} />
            <QuickCapture text={captureText} setText={setCaptureText} onParse={prepareCapture} onVoice={startVoiceCapture} listening={listening} />
            <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-3">
              <div className="px-2 pb-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Show calendars</div>
              {[["ALL", "Everything", "cyan"], ["PERSONAL", "Personal", "slate"], ["EXTERNAL", "Google + Outlook", "violet"], ["SYNCWORKS", "SyncWorks", "emerald"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`mb-1 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-black ${filter === value ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100" : "border-transparent text-slate-400 hover:bg-white/[.04] hover:text-white"}`}><span>{label}</span><span className="h-2 w-2 rounded-full bg-current opacity-80" /></button>
              ))}
            </section>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="rounded-[1.8rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.2),transparent_34%),linear-gradient(145deg,rgba(8,18,35,.98),rgba(2,6,23,.98))] p-5 shadow-[0_20px_70px_rgba(0,0,0,.3)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Master calendar</div><h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Your day, connected.</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Appointments, SyncWorks service work, connected calendars, Health and Social events in one timeline.</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => setShowComposer((v) => !v)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white"><Plus className="h-4 w-4" />Add event</button><button type="button" onClick={loadEvents} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">Today</div><div className="mt-1 text-2xl font-black text-white">{today.length}</div></div>
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.06] p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">Next</div><div className="mt-1 truncate text-sm font-black text-white">{nextEvent?.title || "Clear"}</div></div>
                <div className="rounded-2xl border border-rose-400/15 bg-rose-500/[.06] p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-rose-300">Traffic</div><div className="mt-1 text-sm font-black text-white">Live assist</div></div>
                <div className="rounded-2xl border border-sky-400/15 bg-sky-500/[.06] p-4"><div className="text-[9px] font-black uppercase tracking-[.16em] text-sky-300">Weather</div><div className="mt-1 text-sm font-black text-white">Route aware</div></div>
              </div>
            </div>

            {showComposer ? <section className="rounded-[1.7rem] border border-cyan-400/20 bg-cyan-500/[.04] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-black text-white"><Sparkles className="h-4 w-4 text-cyan-200" />Review event</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs text-slate-400 lg:col-span-2">Title<input value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-slate-400">Date<input type="date" value={draft.date} onChange={(e) => setDraft((v) => ({ ...v, date: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-slate-400">Time<input type="time" value={draft.time} onChange={(e) => setDraft((v) => ({ ...v, time: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-slate-400 lg:col-span-2">Location<input value={draft.location_name} onChange={(e) => setDraft((v) => ({ ...v, location_name: e.target.value }))} placeholder="Address or place" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-slate-400">Duration<input type="number" min="0" value={draft.duration_minutes} onChange={(e) => setDraft((v) => ({ ...v, duration_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-slate-400">Arrive early<input type="number" min="0" max="240" value={draft.arrival_buffer_minutes} onChange={(e) => setDraft((v) => ({ ...v, arrival_buffer_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-slate-400">Reminder<input type="number" min="0" value={draft.reminder_minutes} onChange={(e) => setDraft((v) => ({ ...v, reminder_minutes: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
                <label className="text-xs text-slate-400">Repeat<select value={draft.recurrence} onChange={(e) => setDraft((v) => ({ ...v, recurrence: e.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none"><option value="NONE">Does not repeat</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></label>
                <div className="flex items-end gap-2 sm:col-span-2"><button type="button" onClick={() => setShowComposer(false)} className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-black text-slate-300">Cancel</button><button type="button" onClick={createEvent} className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white">Save event</button></div>
              </div>
            </section> : null}

            <section className="rounded-[1.7rem] border border-white/10 bg-slate-950/50 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Schedule</div><h2 className="mt-1 text-lg font-black text-white">Everything in one timeline.</h2></div><div className="flex rounded-xl border border-white/10 bg-black/20 p-1"><button type="button" onClick={() => setView("agenda")} className={`rounded-lg px-3 py-2 text-xs font-black ${view === "agenda" ? "bg-white/10 text-white" : "text-slate-500"}`}>Agenda</button><button type="button" onClick={() => setView("week")} className={`rounded-lg px-3 py-2 text-xs font-black ${view === "week" ? "bg-white/10 text-white" : "text-slate-500"}`}>Week</button></div></div>
              {view === "week" ? <div className="mt-4 flex items-center justify-between"><button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><ChevronLeft className="h-4 w-4" /></button><div className="text-xs font-black text-slate-300">Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div><button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><ChevronRight className="h-4 w-4" /></button></div> : null}
              {loading ? <div className="mt-5 text-sm text-slate-400">Loading calendar…</div> : view === "agenda" ? <div className="mt-5 space-y-3">{filtered.length ? filtered.map((event) => <EventCard key={event.id} event={event} onCancel={cancelEvent} />) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No calendar items match this filter.</div>}</div> : <div className="mt-5 grid gap-2 md:grid-cols-7">{weekDays.map((day) => { const rows = filtered.filter((event) => ymd(event.start_at) === ymd(day)); return <div key={ymd(day)} className="min-h-44 rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="font-black text-white">{day.toLocaleDateString("en-US", { weekday: "short" })}</div><div className="text-xs text-slate-500">{day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div><div className="mt-3 space-y-2">{rows.map((event) => <div key={event.id} className={`rounded-xl border p-2 ${sourceTone(event.source)}`}><div className="truncate text-[11px] font-black">{event.title}</div><div className="mt-0.5 text-[10px] opacity-75">{new Date(event.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div></div>)}</div></div>; })}</div>}
            </section>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-[1.6rem] border border-amber-400/20 bg-amber-500/[.06] p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-amber-200"><AlertTriangle className="h-4 w-4" />Needs attention</div>
              {nextEvent ? <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-sm font-black text-white">{nextEvent.title}</div><div className="mt-1 text-xs text-slate-400">{new Date(nextEvent.start_at).toLocaleString()}</div>{eventLocation(nextEvent) ? <div className="mt-2 flex items-start gap-2 text-xs text-amber-100"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{eventLocation(nextEvent)}</div> : <div className="mt-2 text-xs font-bold text-amber-200">No location added — travel timing unavailable.</div>}</div> : <div className="mt-3 text-sm text-slate-400">Nothing urgent on your calendar.</div>}
            </section>

            <TravelWeatherAssistCard event={nextEvent} onUpdated={loadEvents} />

            <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-4">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Coming up</div>
              <div className="mt-3 space-y-2">{upcoming.length ? upcoming.map((event) => <div key={event.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="truncate text-xs font-black text-white">{event.title}</div><div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500"><CalendarDays className="h-3 w-3" />{new Date(event.start_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div></div>) : <div className="text-sm text-slate-500">No upcoming events.</div>}</div>
            </section>

            <section className="rounded-[1.6rem] border border-rose-400/15 bg-rose-500/[.04] p-4"><div className="flex items-center gap-2 text-xs font-black text-rose-100"><Route className="h-4 w-4" />Traffic-aware calendar</div><p className="mt-2 text-xs leading-5 text-slate-400">Events with a location can feed live ETA, delay and leave-by guidance. Weather context is shown when available.</p></section>
          </aside>
        </div>
      </main>

      <CalendarConnectionsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} returnTo="/calendar" onChanged={(next) => { setConnections(next); loadEvents(); }} />
    </div>
  );
}

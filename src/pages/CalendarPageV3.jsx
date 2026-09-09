import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  ExternalLink,
  HeartPulse,
  Link2,
  ListTodo,
  MapPin,
  Mic,
  Navigation,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Ruler,
  Scale,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";

import api from "../api/client";
import { getCalendarConnections } from "../api/calendarConnections";
import { getCustomerHealthProfile, patchCustomerHealthProfile } from "../api/customerHealth";
import CalendarConnectionsDrawer from "../components/CalendarConnectionsDrawer";
import ModeBar from "../components/ModeBar";
import PlaceSearchField from "../components/PlaceSearchField";
import TravelWeatherAssistCard from "../components/TravelWeatherAssistCard";

const CALENDAR_CACHE_KEY = "syncworks_calendar_last_good_v3";
const HEALTH_OPEN_ACTION_KEY = "syncworks_health_open_action_v1";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function ymd(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTime(value) {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function addMinutes(value, minutes) {
  return new Date(new Date(value).getTime() + minutes * 60000);
}

function startOfWeek(value) {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonthGrid(value) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  return addDays(first, -first.getDay());
}

function sourceKey(event) {
  return String(event?.source || "MANUAL").toUpperCase();
}

function eventKind(event) {
  return String(event?.metadata?.entity_type || "EVENT").toUpperCase();
}

function isTask(event) {
  return eventKind(event) === "TASK";
}

function taskDone(event) {
  return String(event?.metadata?.task_status || "OPEN").toUpperCase() === "DONE";
}

function editableEvent(event) {
  return sourceKey(event) === "MANUAL";
}

function blankDraft(kind = "EVENT") {
  const task = kind === "TASK";
  return {
    kind,
    title: "",
    date: ymd(),
    time: "09:00",
    end_date: ymd(),
    end_time: task ? "09:30" : "10:00",
    all_day: false,
    location_name: "",
    address_line1: "",
    city: "",
    state: "",
    postal_code: "",
    latitude: null,
    longitude: null,
    arrival_buffer_minutes: "0",
    reminder_minutes: "30",
    description: "",
    recurrence: "NONE",
    weather_dependent: false,
    flexible: task,
    task_priority: "NORMAL",
    task_status: "OPEN",
  };
}

function recurrenceRule(value) {
  if (value === "DAILY") return "RRULE:FREQ=DAILY;INTERVAL=1";
  if (value === "WEEKLY") return "RRULE:FREQ=WEEKLY;INTERVAL=1";
  if (value === "MONTHLY") return "RRULE:FREQ=MONTHLY;INTERVAL=1";
  return "";
}

function recurrenceLabel(rule) {
  const value = String(rule || "").toUpperCase();
  if (value.includes("FREQ=DAILY")) return "DAILY";
  if (value.includes("FREQ=WEEKLY")) return "WEEKLY";
  if (value.includes("FREQ=MONTHLY")) return "MONTHLY";
  return "NONE";
}

function draftFromEvent(event) {
  const start = new Date(event.start_at);
  const end = event.end_at ? new Date(event.end_at) : addMinutes(start, 60);
  const kind = eventKind(event);
  return {
    ...blankDraft(kind),
    kind,
    title: event.title || "",
    date: ymd(start),
    time: localTime(start),
    end_date: ymd(end),
    end_time: localTime(end),
    all_day: Boolean(event.all_day),
    location_name: event.location_name || "",
    address_line1: event.address_line1 || "",
    city: event.city || "",
    state: event.state || "",
    postal_code: event.postal_code || "",
    latitude: event.latitude,
    longitude: event.longitude,
    arrival_buffer_minutes: String(event.arrival_buffer_minutes || 0),
    reminder_minutes: String(event.reminder_minutes ?? 30),
    description: event.description || "",
    recurrence: recurrenceLabel(event.recurrence_rule),
    weather_dependent: Boolean(event?.metadata?.weather_dependent),
    flexible: event?.metadata?.fixed === false,
    task_priority: String(event?.metadata?.task_priority || "NORMAL").toUpperCase(),
    task_status: String(event?.metadata?.task_status || "OPEN").toUpperCase(),
  };
}

function routingOverride(event) {
  const metadata = event?.metadata || {};
  const value = String(metadata.routing_address_override || "").trim();
  if (!value) return null;
  return {
    label: String(metadata.routing_address_label || value),
    address: value,
    latitude: metadata.routing_latitude ?? null,
    longitude: metadata.routing_longitude ?? null,
  };
}

function eventLocation(event) {
  const override = routingOverride(event);
  if (override?.address) return override.address;
  return [event?.location_name, event?.address_line1, event?.city, event?.state, event?.postal_code]
    .filter(Boolean)
    .join(", ");
}

function eventDestination(event) {
  const override = routingOverride(event);
  if (override?.latitude != null && override?.longitude != null) {
    return `${override.latitude},${override.longitude}`;
  }
  if (override?.address) return override.address;
  if (event?.latitude != null && event?.longitude != null) return `${event.latitude},${event.longitude}`;
  return eventLocation(event);
}

function eventMapUrl(event) {
  const destination = eventDestination(event);
  return destination
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`
    : "";
}

function eventDriveUrl(event) {
  const destination = eventDestination(event);
  if (!destination) return "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  if (apple) return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

function eventDeepLink(event) {
  if (event?.metadata?.deep_link) return event.metadata.deep_link;
  if (sourceKey(event) === "HEALTH") return "/customer/health";
  return "";
}

function sourceLabel(event) {
  if (isTask(event)) return "Task";
  const key = sourceKey(event);
  if (key === "GOOGLE") return "Google";
  if (key === "MICROSOFT" || key === "OUTLOOK") return "Outlook";
  if (key === "HEALTH") return "Health";
  if (key === "TICKET") return "Service";
  if (key === "SYNC") return "SYNC";
  if (key === "SYSTEM") return "SyncWorks";
  return "Personal";
}

function sourceTone(event) {
  if (isTask(event)) return "border-violet-400/25 bg-violet-500/10 text-violet-100";
  const key = sourceKey(event);
  if (key === "HEALTH") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (key === "TICKET") return "border-blue-400/25 bg-blue-500/10 text-blue-100";
  if (key === "GOOGLE") return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
  if (key === "MICROSOFT" || key === "OUTLOOK") return "border-indigo-400/25 bg-indigo-500/10 text-indigo-100";
  if (key === "SYNC") return "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100";
  return "border-slate-700 bg-slate-900/70 text-slate-200";
}

function scheduleChange(event) {
  const change = event?.metadata?.schedule_change;
  return change && typeof change === "object" ? change : null;
}

function hasPendingScheduleChange(event) {
  const change = scheduleChange(event);
  return Boolean(change?.requires_response && String(change?.status || "").toUpperCase() === "PENDING");
}

function overlaps(a, b) {
  if (!a || !b || a.id === b.id || a.all_day || b.all_day) return false;
  const aStart = new Date(a.start_at).getTime();
  const aEnd = new Date(a.end_at || a.start_at).getTime();
  const bStart = new Date(b.start_at).getTime();
  const bEnd = new Date(b.end_at || b.start_at).getTime();
  return aStart < bEnd && bStart < aEnd;
}

function conflictIdsFor(events) {
  const ids = new Set();
  for (let i = 0; i < events.length; i += 1) {
    for (let j = i + 1; j < events.length; j += 1) {
      if (overlaps(events[i], events[j])) {
        ids.add(events[i].id);
        ids.add(events[j].id);
      }
    }
  }
  return ids;
}

function parseSmartCapture(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  let date = new Date();
  if (/\btomorrow\b/.test(lower)) date = addDays(date, 1);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < dayNames.length; i += 1) {
    if (!lower.includes(dayNames[i])) continue;
    const delta = (i - date.getDay() + 7) % 7 || 7;
    date = addDays(date, delta);
    break;
  }
  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  let hour = 9;
  let minute = 0;
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2] || 0);
    if (timeMatch[3] === "pm" && hour < 12) hour += 12;
    if (timeMatch[3] === "am" && hour === 12) hour = 0;
  }
  const locationMatch = raw.match(/(?:\bat\b|\b@\b)\s+(.+)$/i);
  const location = locationMatch?.[1]?.trim() || "";
  let title = raw
    .replace(/\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "")
    .replace(locationMatch?.[0] || "", "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s-]+|[,\s-]+$/g, "")
    .trim();
  if (!title) title = "Appointment";
  const endTotal = hour * 60 + minute + 60;
  return {
    ...blankDraft("EVENT"),
    title: title.charAt(0).toUpperCase() + title.slice(1),
    date: ymd(date),
    end_date: ymd(endTotal >= 1440 ? addDays(date, 1) : date),
    time: `${pad(hour)}:${pad(minute)}`,
    end_time: `${pad(Math.floor((endTotal % 1440) / 60))}:${pad(endTotal % 60)}`,
    location_name: location,
    arrival_buffer_minutes: location ? "30" : "0",
    description: `Captured by SYNC from: ${raw}`,
  };
}

function daysSince(value) {
  if (!value) return Infinity;
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  if (!Number.isFinite(date.getTime())) return Infinity;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function ActionButton({ children, onClick, tone = "slate", disabled = false }) {
  const tones = {
    slate: "border-white/10 bg-white/[.04] text-slate-200",
    cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    violet: "border-violet-400/25 bg-violet-500/10 text-violet-100",
    rose: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-[10px] font-black transition disabled:opacity-40 ${tones[tone] || tones.slate}`}>
      {children}
    </button>
  );
}

function EventBlock({ event, conflict, onEdit, onRoute, onServiceResponse, onMoveFlexible, onToggleTask }) {
  const task = isTask(event);
  const done = taskDone(event);
  const pending = hasPendingScheduleChange(event);
  const flexible = event?.metadata?.fixed === false;
  const location = eventLocation(event);
  const driveUrl = eventDriveUrl(event);
  const deepLink = eventDeepLink(event);
  const source = sourceKey(event);
  return (
    <div className={`rounded-xl border p-2.5 ${sourceTone(event)} ${done ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => editableEvent(event) && onEdit(event)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[.12em]">{sourceLabel(event)}</span>
            {flexible ? <span className="rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase">Flexible</span> : null}
            {pending ? <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-100">Time changed</span> : null}
            {conflict ? <span className="rounded-full bg-rose-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-100">Conflict</span> : null}
          </div>
          <div className={`mt-1 truncate text-[11px] font-black ${done ? "line-through" : ""}`}>{event.title}</div>
          <div className="mt-0.5 text-[9px] opacity-70">
            {event.all_day ? "All day" : `${new Date(event.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}${event.end_at ? ` – ${new Date(event.end_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}`}
          </div>
          {location ? <div className="mt-1 truncate text-[9px] opacity-70">{location}</div> : null}
        </button>
        {editableEvent(event) ? <button type="button" onClick={() => onEdit(event)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-current/20" aria-label={`Edit ${event.title}`}><Pencil className="h-3.5 w-3.5" /></button> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {task ? <ActionButton onClick={() => onToggleTask(event)} tone={done ? "slate" : "emerald"}><Check className="h-3 w-3" />{done ? "Reopen" : "Done"}</ActionButton> : null}
        {pending ? <><ActionButton onClick={() => onServiceResponse(event, "ACCEPT")} tone="emerald"><Check className="h-3 w-3" />Accept</ActionButton><ActionButton onClick={() => onServiceResponse(event, "REQUEST_CHANGE")} tone="amber"><Clock className="h-3 w-3" />Different time</ActionButton></> : null}
        {conflict && flexible && editableEvent(event) ? <ActionButton onClick={() => onMoveFlexible(event)} tone="violet"><Zap className="h-3 w-3" />Move +1h</ActionButton> : null}
        {!location ? <ActionButton onClick={() => onRoute(event)} tone="amber"><MapPin className="h-3 w-3" />Add route</ActionButton> : null}
        {source === "HEALTH" && deepLink ? <a href={deepLink} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 text-[10px] font-black text-emerald-100"><Dumbbell className="h-3 w-3" />Start workout</a> : deepLink ? <a href={deepLink} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-current/20 px-3 text-[10px] font-black"><ExternalLink className="h-3 w-3" />Open</a> : null}
        {driveUrl ? <a href={driveUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-current/20 px-3 text-[10px] font-black"><Navigation className="h-3 w-3" />Drive</a> : null}
      </div>
    </div>
  );
}

function MonthCalendar({ month, events, onSelectDay }) {
  const first = startOfMonthGrid(month);
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index));
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="p-2 text-center text-[9px] font-black uppercase text-slate-500">{day}</div>)}</div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const rows = events.filter((event) => ymd(new Date(event.start_at)) === ymd(day));
          const inMonth = day.getMonth() === month.getMonth();
          const today = ymd(day) === ymd();
          return (
            <button type="button" key={ymd(day)} onClick={() => onSelectDay(day)} className={`min-h-[82px] border-b border-r border-white/[.07] p-1.5 text-left sm:min-h-28 sm:p-2 ${inMonth ? "bg-white/[.015]" : "bg-black/20 opacity-40"}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${today ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>{day.getDate()}</span>
              <div className="mt-2 flex flex-wrap gap-1">{rows.slice(0, 5).map((event) => <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${sourceKey(event) === "HEALTH" ? "bg-emerald-400" : isTask(event) ? "bg-violet-400" : sourceKey(event) === "TICKET" ? "bg-blue-400" : "bg-cyan-400"}`} />)}</div>
              <span className="mt-1 block text-[8px] font-bold text-slate-500">{rows.length ? `${rows.length} scheduled` : "Open"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ day, events, conflictIds, onCreate, onEdit, onRoute, onServiceResponse, onMoveFlexible, onToggleTask }) {
  const allDay = events.filter((event) => event.all_day);
  const timed = events.filter((event) => !event.all_day);
  const hours = Array.from({ length: 18 }, (_, index) => index + 5);
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/15">
      {allDay.length ? <div className="grid grid-cols-[58px_minmax(0,1fr)] border-b border-white/10"><div className="p-2 text-right text-[9px] font-black uppercase text-slate-500">All day</div><div className="space-y-1.5 border-l border-white/10 p-2">{allDay.map((event) => <EventBlock key={event.id} event={event} conflict={conflictIds.has(event.id)} onEdit={onEdit} onRoute={onRoute} onServiceResponse={onServiceResponse} onMoveFlexible={onMoveFlexible} onToggleTask={onToggleTask} />)}</div></div> : null}
      {hours.map((hour) => {
        const rows = timed.filter((event) => new Date(event.start_at).getHours() === hour);
        const now = ymd(day) === ymd() && new Date().getHours() === hour;
        return (
          <div key={hour} className={`grid min-h-[58px] grid-cols-[58px_minmax(0,1fr)] border-b border-white/[.07] ${now ? "bg-cyan-500/[.04]" : ""}`}>
            <button type="button" onClick={() => onCreate(day, hour)} className={`p-2 text-right text-[10px] font-bold ${now ? "text-cyan-300" : "text-slate-500"}`}>{new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric" })}</button>
            <div className="space-y-1.5 border-l border-white/10 p-1.5">{rows.map((event) => <EventBlock key={event.id} event={event} conflict={conflictIds.has(event.id)} onEdit={onEdit} onRoute={onRoute} onServiceResponse={onServiceResponse} onMoveFlexible={onMoveFlexible} onToggleTask={onToggleTask} />)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarPageV3() {
  const [events, setEvents] = useState(() => {
    try { return safeList(JSON.parse(window.localStorage.getItem(CALENDAR_CACHE_KEY) || "[]")); }
    catch { return []; }
  });
  const eventsRef = useRef(events);
  const [connections, setConnections] = useState({ connections: [], providers: {} });
  const [healthProfile, setHealthProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState("week");
  const [filter, setFilter] = useState("ALL");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [monthStart, setMonthStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showComposer, setShowComposer] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [draft, setDraft] = useState(() => blankDraft("EVENT"));
  const [captureText, setCaptureText] = useState("");
  const [listening, setListening] = useState(false);
  const [routingEvent, setRoutingEvent] = useState(null);
  const [routeDraft, setRouteDraft] = useState({ label: "", address: "", latitude: null, longitude: null });

  useEffect(() => { eventsRef.current = events; }, [events]);

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } });
        const rows = safeList(response.data);
        eventsRef.current = rows;
        setEvents(rows);
        try { window.localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(rows)); } catch { /* optional */ }
        setLoading(false);
        return rows;
      } catch (loadError) {
        lastError = loadError;
        if (Number(loadError?.response?.status || 0) === 401) break;
        if (attempt < 2) await wait(attempt === 0 ? 450 : 1200);
      }
    }
    setLoading(false);
    const cachedRows = eventsRef.current;
    if (cachedRows.length) {
      setNotice("Showing your last successful calendar while SyncWorks reconnects. Tap refresh to retry live data.");
      return cachedRows;
    }
    setError(lastError?.response?.data?.detail || "Calendar could not reconnect yet. Tap Retry.");
    return [];
  }, []);

  const loadConnections = useCallback(async () => {
    setConnectionLoading(true);
    try { setConnections(await getCalendarConnections()); }
    catch { setConnections({ connections: [], providers: {} }); }
    finally { setConnectionLoading(false); }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try { setHealthProfile(await getCustomerHealthProfile()); }
    catch { setHealthProfile(null); }
    finally { setHealthLoading(false); }
  }, []);

  useEffect(() => {
    loadEvents();
    loadConnections();
    loadHealth();
  }, [loadEvents, loadConnections, loadHealth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("calendar_oauth");
    const provider = params.get("provider");
    if (oauth === "connected") {
      setNotice(`${provider === "microsoft" ? "Outlook" : "Google"} connected. Refreshing your calendar.`);
      loadConnections();
      loadEvents({ silent: true });
    } else if (oauth === "error") {
      setError(`Could not finish ${provider || "calendar"} connection. Open Connect calendars and try again.`);
    }
    if (oauth) window.history.replaceState({}, "", window.location.pathname);
  }, [loadConnections, loadEvents]);

  const filtered = useMemo(() => events.filter((event) => {
    if (filter === "ALL") return true;
    const source = sourceKey(event);
    if (filter === "TASKS") return isTask(event);
    if (filter === "SERVICE") return source === "TICKET";
    if (filter === "HEALTH") return source === "HEALTH";
    if (filter === "BUSINESS") return ["TICKET", "SOCIAL", "SYNC", "SYSTEM"].includes(source);
    return ["MANUAL", "GOOGLE", "MICROSOFT", "OUTLOOK", "APPLE"].includes(source) && !isTask(event);
  }).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)), [events, filter]);

  const todayEvents = useMemo(() => events.filter((event) => ymd(new Date(event.start_at)) === ymd()), [events]);
  const nextEvent = useMemo(() => events.filter((event) => !taskDone(event) && new Date(event.start_at) >= new Date()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0] || null, [events]);
  const upcoming = useMemo(() => events.filter((event) => !taskDone(event) && new Date(event.start_at) >= new Date()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)).slice(0, 4), [events]);
  const pendingServices = useMemo(() => events.filter(hasPendingScheduleChange), [events]);
  const tasks = useMemo(() => events.filter(isTask).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)), [events]);
  const todayConflictIds = useMemo(() => conflictIdsFor(todayEvents), [todayEvents]);
  const enabledConnections = useMemo(() => (connections?.connections || []).filter((row) => row.enabled !== false && row.connected !== false), [connections]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const dailyEvents = useMemo(() => filtered.filter((event) => ymd(new Date(event.start_at)) === ymd(selectedDay)), [filtered, selectedDay]);
  const dailyConflictIds = useMemo(() => conflictIdsFor(dailyEvents), [dailyEvents]);

  const healthSnapshot = healthProfile?.snapshot_json && typeof healthProfile.snapshot_json === "object" ? healthProfile.snapshot_json : {};
  const healthWeekPlan = Array.isArray(healthSnapshot.week_plan) ? healthSnapshot.week_plan : [];
  const todayHealthPlan = useMemo(() => healthWeekPlan.find((item) => item?.ymd === ymd() && (item?.workout_name || item?.name) && !["SKIPPED", "RESCHEDULED", "CANCELLED", "CANCELED"].includes(String(item?.status || "").toUpperCase())) || null, [healthWeekPlan]);
  const nextHealthPlan = useMemo(() => healthWeekPlan.filter((item) => item?.ymd > ymd() && (item?.workout_name || item?.name) && !["COMPLETED", "SKIPPED", "CANCELLED", "CANCELED"].includes(String(item?.status || "").toUpperCase())).sort((a, b) => `${a.ymd}T${a.time || "23:59"}`.localeCompare(`${b.ymd}T${b.time || "23:59"}`))[0] || null, [healthWeekPlan]);
  const progressLogs = Array.isArray(healthProfile?.progress_json) ? healthProfile.progress_json : [];
  const latestWeightLog = progressLogs.find((item) => item?.type === "weight" || item?.weight);
  const latestMeasurementLog = progressLogs.find((item) => item?.measurements && Object.values(item.measurements || {}).some(Boolean));
  const weightDue = daysSince(latestWeightLog?.ymd || latestWeightLog?.date || latestWeightLog?.created_at) >= 7;
  const measurementDue = daysSince(latestMeasurementLog?.ymd || latestMeasurementLog?.date || latestMeasurementLog?.created_at) >= 28;
  const todayWorkoutEvent = todayEvents.find((event) => sourceKey(event) === "HEALTH");

  function openNew(kind = "EVENT", day = new Date(), hour = null) {
    const next = blankDraft(kind);
    next.date = ymd(day);
    next.end_date = ymd(day);
    if (hour != null) {
      next.time = `${pad(hour)}:00`;
      next.end_time = `${pad((hour + 1) % 24)}:00`;
      if (hour === 23) next.end_date = ymd(addDays(day, 1));
    }
    setEditingEvent(null);
    setDraft(next);
    setShowComposer(true);
    window.requestAnimationFrame(() => document.getElementById("calendar-event-composer")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function editEvent(event) {
    if (!editableEvent(event)) return;
    setEditingEvent(event);
    setDraft(draftFromEvent(event));
    setShowComposer(true);
    window.requestAnimationFrame(() => document.getElementById("calendar-event-composer")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openRouteEditor(event) {
    const override = routingOverride(event);
    setRoutingEvent(event);
    setRouteDraft({
      label: override?.label || event?.location_name || "",
      address: override?.address || eventLocation(event) || "",
      latitude: override?.latitude ?? event?.latitude ?? null,
      longitude: override?.longitude ?? event?.longitude ?? null,
    });
  }

  async function saveRouteOverride() {
    if (!routingEvent) return;
    const address = String(routeDraft.address || routeDraft.label || "").trim();
    if (!address) {
      setError("Add a routing address first.");
      return;
    }
    try {
      await api.patch(`/personal-calendar/events/${routingEvent.id}/`, {
        metadata: {
          ...(routingEvent.metadata || {}),
          routing_address_override: address,
          routing_address_label: routeDraft.label || address,
          routing_latitude: routeDraft.latitude,
          routing_longitude: routeDraft.longitude,
          routing_updated_at: new Date().toISOString(),
        },
      });
      setNotice(`Routing address saved for ${routingEvent.title}.`);
      setRoutingEvent(null);
      await loadEvents({ silent: true });
    } catch (routeError) {
      setError(routeError?.response?.data?.detail || "Could not save that routing address.");
    }
  }

  function openHealth(target) {
    try { window.localStorage.setItem(HEALTH_OPEN_ACTION_KEY, target); } catch { /* optional */ }
    window.location.assign("/customer/health");
  }

  async function useNextWorkoutToday() {
    if (!healthProfile || !nextHealthPlan) {
      openHealth("plan-today");
      return;
    }
    setHealthLoading(true);
    try {
      const now = new Date();
      const scheduled = new Date(now);
      scheduled.setSeconds(0, 0);
      if (now.getMinutes() < 30) scheduled.setMinutes(30);
      else {
        scheduled.setHours(now.getHours() + 1);
        scheduled.setMinutes(0);
      }
      const moved = {
        ...nextHealthPlan,
        id: `calendar-continue-${Date.now()}`,
        ymd: ymd(),
        day_label: new Date().toLocaleDateString(undefined, { weekday: "short" }),
        time: localTime(scheduled),
        status: "Planned",
        original_workout_id: nextHealthPlan.id,
        original_ymd: nextHealthPlan.ymd,
        moved_to_today_at: new Date().toISOString(),
        source: "calendar_continue_plan",
      };
      const nextWeekPlan = healthWeekPlan.map((item) => item?.id === nextHealthPlan.id ? { ...item, status: "Rescheduled", rescheduled_to: ymd(), rescheduled_at: new Date().toISOString() } : item);
      nextWeekPlan.push(moved);
      const updated = await patchCustomerHealthProfile({
        snapshot_json: {
          ...healthSnapshot,
          workout: moved.workout_name || moved.name || healthSnapshot.workout || "",
          today_workout_id: moved.id,
          week_plan: nextWeekPlan,
          updated_at: new Date().toISOString(),
        },
      });
      setHealthProfile(updated);
      setNotice(`${moved.workout_name || moved.name || "Workout"} moved to today and added to Calendar.`);
      await loadEvents({ silent: true });
    } catch (healthError) {
      setError(healthError?.response?.data?.detail || "Could not move the next Health workout to today.");
    } finally {
      setHealthLoading(false);
    }
  }

  function prepareCapture() {
    const parsed = parseSmartCapture(captureText);
    if (!parsed) return;
    setEditingEvent(null);
    setDraft(parsed);
    setShowComposer(true);
    setNotice("SYNC prepared the appointment. Review the time and address, then save it.");
  }

  function startVoiceCapture() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice capture is not supported by this browser. Type the appointment instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setCaptureText(transcript);
      const parsed = parseSmartCapture(transcript);
      if (parsed) {
        setEditingEvent(null);
        setDraft(parsed);
        setShowComposer(true);
      }
    };
    recognition.onerror = () => setError("Could not capture that voice input. Try again or type it.");
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function saveEvent() {
    const title = String(draft.title || "").trim();
    if (!title) {
      setError("Add a title first.");
      return;
    }
    const start = new Date(`${draft.date}T${draft.all_day ? "00:00" : draft.time || "09:00"}`);
    const end = new Date(`${draft.end_date || draft.date}T${draft.all_day ? "23:59" : draft.end_time || "10:00"}`);
    if (end < start) {
      setError("The end must be after the start.");
      return;
    }
    const metadata = {
      ...(editingEvent?.metadata || {}),
      entity_type: draft.kind,
      weather_dependent: Boolean(draft.weather_dependent),
      fixed: !draft.flexible,
    };
    if (draft.kind === "TASK") {
      metadata.task_status = draft.task_status || "OPEN";
      metadata.task_priority = draft.task_priority || "NORMAL";
      metadata.task_deadline = end.toISOString();
      metadata.task_duration_minutes = Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000));
    }
    const payload = {
      title,
      description: draft.description,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: Boolean(draft.all_day),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
      location_name: draft.location_name,
      address_line1: draft.address_line1,
      city: draft.city,
      state: draft.state,
      postal_code: draft.postal_code,
      latitude: draft.latitude,
      longitude: draft.longitude,
      arrival_buffer_minutes: Number(draft.arrival_buffer_minutes || 0),
      reminder_minutes: Number(draft.reminder_minutes || 30),
      recurrence_rule: recurrenceRule(draft.recurrence),
      source: "MANUAL",
      metadata,
    };
    try {
      if (editingEvent) await api.patch(`/personal-calendar/events/${editingEvent.id}/`, payload);
      else await api.post("/personal-calendar/events/", payload);
      setShowComposer(false);
      setEditingEvent(null);
      setDraft(blankDraft("EVENT"));
      setCaptureText("");
      setNotice(editingEvent ? "Calendar item updated." : "Added to your master calendar.");
      await loadEvents({ silent: true });
    } catch (saveError) {
      setError(saveError?.response?.data?.detail || "Could not save this calendar item.");
    }
  }

  async function removeEditingEvent() {
    if (!editingEvent) return;
    try {
      await api.post(`/personal-calendar/events/${editingEvent.id}/cancel/`);
      setShowComposer(false);
      setEditingEvent(null);
      setNotice("Calendar item removed from the active schedule.");
      await loadEvents({ silent: true });
    } catch (removeError) {
      setError(removeError?.response?.data?.detail || "Could not remove this calendar item.");
    }
  }

  async function respondToService(event, response) {
    try {
      await api.post(`/personal-calendar/events/${event.id}/schedule-response/`, {
        response,
        note: response === "REQUEST_CHANGE" ? "Customer requested a different time from Calendar." : "",
      });
      setNotice(response === "ACCEPT" ? "Service time accepted." : "The business has been told you need a different time.");
      await loadEvents({ silent: true });
    } catch (responseError) {
      setError(responseError?.response?.data?.detail || "Could not save your service schedule response.");
    }
  }

  async function moveFlexible(event) {
    if (!editableEvent(event) || event?.metadata?.fixed !== false) return;
    try {
      await api.patch(`/personal-calendar/events/${event.id}/`, {
        start_at: addMinutes(event.start_at, 60).toISOString(),
        end_at: addMinutes(event.end_at || event.start_at, 60).toISOString(),
        metadata: { ...(event.metadata || {}), last_sync_resolution: { action: "MOVE_60_MINUTES", at: new Date().toISOString() } },
      });
      setNotice(`${event.title} moved one hour.`);
      await loadEvents({ silent: true });
    } catch (moveError) {
      setError(moveError?.response?.data?.detail || "Could not move that flexible item.");
    }
  }

  async function toggleTask(event) {
    if (!editableEvent(event) || !isTask(event)) return;
    const nextStatus = taskDone(event) ? "OPEN" : "DONE";
    try {
      await api.patch(`/personal-calendar/events/${event.id}/`, {
        metadata: {
          ...(event.metadata || {}),
          task_status: nextStatus,
          task_completed_at: nextStatus === "DONE" ? new Date().toISOString() : null,
        },
      });
      await loadEvents({ silent: true });
    } catch (taskError) {
      setError(taskError?.response?.data?.detail || "Could not update that task.");
    }
  }

  function resetToday() {
    const today = new Date();
    setWeekStart(startOfWeek(today));
    setMonthStart(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today);
  }

  const nextDriveUrl = nextEvent ? eventDriveUrl(nextEvent) : "";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Calendar" subtitle="Your master schedule for SYNC Assist" />
      <main className="mx-auto w-full max-w-[1680px] px-3 py-3 pb-28 sm:px-4 lg:px-6 lg:pb-8">
        {notice ? <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">{notice}</div> : null}
        {error ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-100"><span>{error}</span><button type="button" onClick={() => loadEvents()} className="rounded-lg border border-rose-300/25 px-3 py-1.5 font-black">Retry</button></div> : null}

        <section className="rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.12),transparent_34%),linear-gradient(145deg,rgba(8,47,73,.28),rgba(2,6,23,.96))] p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Master calendar</div>
              <h1 className="mt-1 text-lg font-black text-white sm:text-xl">Your schedule first</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openNew("EVENT")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-[11px] font-black text-white"><Plus className="h-4 w-4" />Add event</button>
              <button type="button" onClick={() => openNew("TASK")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 text-[11px] font-black text-violet-100"><ListTodo className="h-4 w-4" />Add task</button>
              <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-[11px] font-black text-slate-200"><Link2 className="h-4 w-4" />Connect calendars</button>
              <button type="button" onClick={resetToday} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-[11px] font-black text-slate-200"><CalendarDays className="h-4 w-4" />Today</button>
              <button type="button" onClick={() => { loadEvents(); loadConnections(); loadHealth(); }} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400" aria-label="Refresh calendar"><RefreshCw className={`h-4 w-4 ${loading || connectionLoading || healthLoading ? "animate-spin" : ""}`} /></button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {upcoming.length ? upcoming.map((event) => {
              const location = eventLocation(event);
              const drive = eventDriveUrl(event);
              return (
                <div key={event.id} className={`rounded-xl border p-3 ${sourceTone(event)}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[.14em] opacity-70">{sourceLabel(event)}</span><span className="text-[9px] opacity-70">{new Date(event.start_at).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}</span></div>
                  <div className="mt-1 truncate text-xs font-black">{event.title}</div>
                  <div className="mt-1 text-[10px] opacity-70">{event.all_day ? "All day" : new Date(event.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  {location ? <div className="mt-1 truncate text-[9px] opacity-70">{location}</div> : <div className="mt-1 text-[9px] font-bold text-amber-200">No routing address yet</div>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editableEvent(event) ? <ActionButton onClick={() => editEvent(event)}><Pencil className="h-3 w-3" />Edit</ActionButton> : null}
                    <ActionButton onClick={() => openRouteEditor(event)} tone={location ? "slate" : "amber"}><MapPin className="h-3 w-3" />{location ? "Route address" : "Add address"}</ActionButton>
                    {drive ? <a href={drive} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-current/20 px-3 text-[10px] font-black"><Navigation className="h-3 w-3" />Drive</a> : null}
                  </div>
                </div>
              );
            }) : <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-500 sm:col-span-2 xl:col-span-4">Nothing upcoming yet. Add an appointment, task, service visit, or workout above.</div>}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">{[["ALL", "Everything"], ["PERSONAL", "Personal"], ["TASKS", "Tasks"], ["SERVICE", "Services"], ["HEALTH", "Health"], ["BUSINESS", "Business"]].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${filter === value ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 text-slate-500"}`}>{label}</button>)}</div>
            <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">{[["month", "Month"], ["week", "Week"], ["daily", "Daily"]].map(([value, label]) => <button type="button" key={value} onClick={() => setView(value)} className={`rounded-lg px-3 py-2 text-[10px] font-black ${view === value ? "bg-white/10 text-white" : "text-slate-500"}`}>{label}</button>)}</div>
          </div>
          <div className="mt-3 flex items-center justify-between"><button type="button" onClick={() => view === "month" ? setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)) : view === "week" ? setWeekStart(addDays(weekStart, -7)) : setSelectedDay(addDays(selectedDay, -1))} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"><ChevronLeft className="h-4 w-4" /></button><div className="text-xs font-black text-slate-300">{view === "month" ? monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : view === "week" ? `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div><button type="button" onClick={() => view === "month" ? setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)) : view === "week" ? setWeekStart(addDays(weekStart, 7)) : setSelectedDay(addDays(selectedDay, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"><ChevronRight className="h-4 w-4" /></button></div>

          {loading && !events.length ? <div className="mt-5 text-sm text-slate-400">Loading calendar…</div> : view === "month" ? <MonthCalendar month={monthStart} events={filtered} onSelectDay={(day) => { setSelectedDay(day); setView("daily"); }} /> : view === "daily" ? <DayView day={selectedDay} events={dailyEvents} conflictIds={dailyConflictIds} onCreate={(day, hour) => openNew("EVENT", day, hour)} onEdit={editEvent} onRoute={openRouteEditor} onServiceResponse={respondToService} onMoveFlexible={moveFlexible} onToggleTask={toggleTask} /> : (
            <div className="mt-4 grid gap-2 md:grid-cols-7">{weekDays.map((day) => {
              const rows = filtered.filter((event) => ymd(new Date(event.start_at)) === ymd(day));
              const conflicts = conflictIdsFor(rows);
              return <div key={ymd(day)} className={`min-h-56 rounded-2xl border p-3 ${ymd(day) === ymd() ? "border-cyan-400/35 bg-cyan-500/[.07]" : "border-white/10 bg-black/20"}`}><button type="button" onClick={() => { setSelectedDay(day); setView("daily"); }} className="w-full text-left"><div className="flex items-baseline justify-between gap-2 md:block"><div className="text-sm font-black text-white">{day.toLocaleDateString("en-US", { weekday: "short" })}</div><div className="text-[10px] text-slate-500">{day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div></div></button><div className="mt-2 space-y-1.5">{rows.slice(0, 5).map((event) => <EventBlock key={event.id} event={event} conflict={conflicts.has(event.id)} onEdit={editEvent} onRoute={openRouteEditor} onServiceResponse={respondToService} onMoveFlexible={moveFlexible} onToggleTask={toggleTask} />)}{rows.length > 5 ? <button type="button" onClick={() => { setSelectedDay(day); setView("daily"); }} className="text-[9px] font-black text-cyan-200">+{rows.length - 5} more</button> : null}{!rows.length ? <button type="button" onClick={() => openNew("EVENT", day, 9)} className="mt-2 w-full rounded-xl border border-dashed border-white/10 p-3 text-[10px] font-bold text-slate-600 hover:border-cyan-400/20 hover:text-cyan-200">+ Add</button> : null}</div></div>;
            })}</div>
          )}
        </section>

        {showComposer ? <section id="calendar-event-composer" className="mt-4 scroll-mt-24 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-500/[.04] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div className="text-sm font-black text-white">{editingEvent ? `Edit ${draft.kind === "TASK" ? "task" : "event"}` : `Create ${draft.kind === "TASK" ? "task" : "event"}`}</div><button type="button" onClick={() => { setShowComposer(false); setEditingEvent(null); }} className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black text-slate-400">Close</button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-slate-400 lg:col-span-2">Title<input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">Date<input type="date" value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value, end_date: value.end_date < event.target.value ? event.target.value : value.end_date }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">Start time<input disabled={draft.all_day} type="time" value={draft.time} onChange={(event) => setDraft((value) => ({ ...value, time: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none disabled:opacity-40" /></label>
            <label className="text-xs text-slate-400">End date<input type="date" min={draft.date} value={draft.end_date} onChange={(event) => setDraft((value) => ({ ...value, end_date: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">End time<input disabled={draft.all_day} type="time" value={draft.end_time} onChange={(event) => setDraft((value) => ({ ...value, end_time: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none disabled:opacity-40" /></label>
            {draft.kind === "EVENT" ? <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/80 px-3 text-xs font-bold text-slate-300"><input type="checkbox" checked={draft.all_day} onChange={(event) => setDraft((value) => ({ ...value, all_day: event.target.checked }))} className="h-4 w-4 accent-cyan-400" />All day</label> : <label className="text-xs text-slate-400">Priority<select value={draft.task_priority} onChange={(event) => setDraft((value) => ({ ...value, task_priority: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none"><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option></select></label>}
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-500/[.04] px-3 text-xs font-bold text-violet-100"><input type="checkbox" checked={draft.flexible} onChange={(event) => setDraft((value) => ({ ...value, flexible: event.target.checked }))} className="h-4 w-4 accent-violet-400" />Flexible</label>
            <div className="sm:col-span-2 lg:col-span-4"><PlaceSearchField value={draft.location_name || draft.address_line1} onChange={(value) => setDraft((current) => ({ ...current, location_name: value }))} onSelect={(place) => setDraft((current) => ({ ...current, location_name: place.location_name, address_line1: place.address_line1, city: place.city || "", state: place.state || "", postal_code: place.postal_code || "", latitude: place.latitude, longitude: place.longitude }))} /></div>
            <label className="text-xs text-slate-400 lg:col-span-2">Street address<input value={draft.address_line1} onChange={(event) => setDraft((value) => ({ ...value, address_line1: event.target.value }))} placeholder="Exact work/home/venue address for routing" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">City<input value={draft.city} onChange={(event) => setDraft((value) => ({ ...value, city: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400">State<input value={draft.state} onChange={(event) => setDraft((value) => ({ ...value, state: event.target.value.toUpperCase() }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label><label className="text-xs text-slate-400">ZIP<input value={draft.postal_code} onChange={(event) => setDraft((value) => ({ ...value, postal_code: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label></div>
            <label className="text-xs text-slate-400">Arrive early<input type="number" min="0" max="240" value={draft.arrival_buffer_minutes} onChange={(event) => setDraft((value) => ({ ...value, arrival_buffer_minutes: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">Reminder<input type="number" min="0" value={draft.reminder_minutes} onChange={(event) => setDraft((value) => ({ ...value, reminder_minutes: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none" /></label>
            <label className="text-xs text-slate-400">Repeat<select value={draft.recurrence} onChange={(event) => setDraft((value) => ({ ...value, recurrence: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none"><option value="NONE">Does not repeat</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></label>
            {draft.kind === "EVENT" ? <label className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-500/[.04] px-3 text-xs font-bold text-amber-100"><input type="checkbox" checked={draft.weather_dependent} onChange={(event) => setDraft((value) => ({ ...value, weather_dependent: event.target.checked }))} className="h-4 w-4 accent-amber-400" />Weather aware</label> : null}
            <label className="text-xs text-slate-400 sm:col-span-2 lg:col-span-4">Notes<textarea rows={2} value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-white outline-none" /></label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">{editingEvent ? <button type="button" onClick={removeEditingEvent} className="min-h-10 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 text-[11px] font-black text-rose-100">Remove</button> : null}<button type="button" onClick={saveEvent} className="min-h-10 flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-[11px] font-black text-white">{editingEvent ? "Save changes" : draft.kind === "TASK" ? "Save task" : "Save event"}</button></div>
          </div>
        </section> : null}

        {routingEvent ? <section className="mt-4 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/[.05] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200">Routing address</div><h2 className="mt-1 text-lg font-black text-white">{routingEvent.title}</h2><p className="mt-1 text-xs text-slate-400">This local address override stays in SyncWorks even when Google or Outlook refreshes the event.</p></div><button type="button" onClick={() => setRoutingEvent(null)} className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black text-slate-400">Close</button></div><div className="mt-3"><PlaceSearchField value={routeDraft.label || routeDraft.address} onChange={(value) => setRouteDraft((current) => ({ ...current, label: value, address: value }))} onSelect={(place) => setRouteDraft({ label: place.location_name || place.address_line1 || "", address: [place.address_line1, place.city, place.state, place.postal_code].filter(Boolean).join(", ") || place.location_name, latitude: place.latitude, longitude: place.longitude })} /></div><div className="mt-3 flex flex-wrap gap-2"><ActionButton onClick={saveRouteOverride} tone="amber"><MapPin className="h-3.5 w-3.5" />Save routing address</ActionButton>{eventDriveUrl({ ...routingEvent, metadata: { ...(routingEvent.metadata || {}), routing_address_override: routeDraft.address, routing_address_label: routeDraft.label, routing_latitude: routeDraft.latitude, routing_longitude: routeDraft.longitude } }) ? <a href={eventDriveUrl({ ...routingEvent, metadata: { ...(routingEvent.metadata || {}), routing_address_override: routeDraft.address, routing_address_label: routeDraft.label, routing_latitude: routeDraft.latitude, routing_longitude: routeDraft.longitude } })} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black text-slate-200"><Navigation className="h-3.5 w-3.5" />Preview drive</a> : null}</div></section> : null}

        {pendingServices.length ? <section className="mt-4 rounded-[1.5rem] border border-amber-400/25 bg-amber-500/[.06] p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-amber-200"><AlertTriangle className="h-4 w-4" />Service schedule changes</div><div className="mt-3 grid gap-2 md:grid-cols-2">{pendingServices.map((event) => <EventBlock key={event.id} event={event} conflict={false} onEdit={editEvent} onRoute={openRouteEditor} onServiceResponse={respondToService} onMoveFlexible={moveFlexible} onToggleTask={toggleTask} />)}</div></section> : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <section className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/[.05] p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-emerald-200"><HeartPulse className="h-4 w-4" />Health today</div><h2 className="mt-2 text-lg font-black text-white">{todayWorkoutEvent || todayHealthPlan ? (todayWorkoutEvent?.title || todayHealthPlan?.workout_name || todayHealthPlan?.name || "Workout planned") : "No workout planned today"}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{todayWorkoutEvent || todayHealthPlan ? "Your workout is on the calendar. Start it or adjust the plan without leaving your day view." : "You can still train today. Build a workout, continue the next session, or ask SYNC Health to adjust today."}</p></div><Dumbbell className="h-6 w-6 text-emerald-300" /></div>
            <div className="mt-3 flex flex-wrap gap-2">{weightDue ? <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black text-cyan-100">Weigh-in due</span> : null}{measurementDue ? <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black text-violet-100">Measurements due</span> : null}</div>
            <div className="mt-4 flex flex-wrap gap-2">{todayWorkoutEvent ? <a href="/customer/health" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-3 text-[10px] font-black text-emerald-100"><Dumbbell className="h-3.5 w-3.5" />Start workout</a> : <ActionButton onClick={() => openHealth("plan-today")} tone="emerald"><Dumbbell className="h-3.5 w-3.5" />Need workout</ActionButton>}{!todayWorkoutEvent && !todayHealthPlan && nextHealthPlan ? <ActionButton onClick={useNextWorkoutToday} tone="cyan" disabled={healthLoading}><Zap className="h-3.5 w-3.5" />Continue plan today</ActionButton> : null}<ActionButton onClick={() => openHealth("coach-chat")} tone="violet"><Sparkles className="h-3.5 w-3.5" />AI adjust</ActionButton><ActionButton onClick={() => openHealth("weight")}><Scale className="h-3.5 w-3.5" />Weigh in</ActionButton><ActionButton onClick={() => openHealth("progress")}><Ruler className="h-3.5 w-3.5" />Measurements</ActionButton><ActionButton onClick={() => openHealth("planner")}><CalendarDays className="h-3.5 w-3.5" />Workout plan</ActionButton></div>
          </section>

          <section className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-500/[.04] p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><Route className="h-4 w-4" />Next up</div>
            {nextEvent ? <><h2 className="mt-2 text-lg font-black text-white">{nextEvent.title}</h2><div className="mt-1 text-xs text-slate-400">{new Date(nextEvent.start_at).toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" })}</div>{eventLocation(nextEvent) ? <div className="mt-2 text-xs leading-5 text-slate-300">{eventLocation(nextEvent)}</div> : <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 p-2.5 text-xs font-bold text-amber-100">No address saved. Add your friend's work address now so routing is ready when you leave.</div>}<div className="mt-3 flex flex-wrap gap-2">{editableEvent(nextEvent) ? <ActionButton onClick={() => editEvent(nextEvent)}><Pencil className="h-3.5 w-3.5" />Edit details</ActionButton> : null}<ActionButton onClick={() => openRouteEditor(nextEvent)} tone={eventLocation(nextEvent) ? "slate" : "amber"}><MapPin className="h-3.5 w-3.5" />{eventLocation(nextEvent) ? "Route address" : "Add address"}</ActionButton>{nextDriveUrl ? <a href={nextDriveUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 text-[10px] font-black text-cyan-100"><Navigation className="h-3.5 w-3.5" />Drive / CarPlay</a> : null}{eventMapUrl(nextEvent) ? <a href={eventMapUrl(nextEvent)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black text-slate-200"><MapPin className="h-3.5 w-3.5" />Map</a> : null}</div><p className="mt-3 text-[10px] leading-4 text-slate-500">On iPhone, Drive hands the destination to Apple Maps. If the phone is connected to CarPlay, supported navigation can display in the vehicle.</p></> : <div className="mt-3 text-xs text-slate-500">Nothing upcoming yet.</div>}
          </section>

          <section className="rounded-[1.5rem] border border-violet-400/20 bg-violet-500/[.04] p-4">
            <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-violet-200"><ListTodo className="h-4 w-4" />Task tray</div><div className="mt-1 text-xs text-slate-500">Flexible work SYNC can fit around fixed appointments.</div></div><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black text-violet-100">{tasks.filter((task) => !taskDone(task)).length} open</span></div>
            <div className="mt-3 space-y-2">{tasks.length ? tasks.slice(0, 4).map((task) => <EventBlock key={task.id} event={task} conflict={todayConflictIds.has(task.id)} onEdit={editEvent} onRoute={openRouteEditor} onServiceResponse={respondToService} onMoveFlexible={moveFlexible} onToggleTask={toggleTask} />) : <button type="button" onClick={() => openNew("TASK")} className="w-full rounded-xl border border-dashed border-violet-400/20 p-4 text-xs font-bold text-violet-200">+ Add your first task</button>}</div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[1.5rem] border border-violet-400/20 bg-violet-500/[.05] p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-violet-200"><WandSparkles className="h-4 w-4" />SYNC quick capture</div><p className="mt-1 text-xs text-slate-400">Say or paste “Meet Chris today at 10:30 AM at 123 Main St.”</p><div className="mt-3 flex gap-2"><input value={captureText} onChange={(event) => setCaptureText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") prepareCapture(); }} placeholder="Add something to my day…" className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none placeholder:text-slate-600" /><button type="button" onClick={prepareCapture} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white"><Sparkles className="h-4 w-4" /></button><button type="button" onClick={startVoiceCapture} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${listening ? "border-rose-400/30 bg-rose-500/10 text-rose-100" : "border-white/10 bg-white/[.04] text-slate-200"}`}><Mic className="h-4 w-4" /></button></div></section>
          <div className="space-y-4"><section className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-500/[.04] p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Connected calendars</div><div className="mt-1 text-2xl font-black text-white">{enabledConnections.length}</div></div><button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-[10px] font-black text-cyan-100"><Link2 className="h-3.5 w-3.5" />Manage</button></div></section><TravelWeatherAssistCard event={nextEvent} onUpdated={() => loadEvents({ silent: true })} /></div>
        </div>
      </main>
      <CalendarConnectionsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} returnTo="/calendar" onChanged={(next) => { setConnections(next); loadEvents({ silent: true }); }} />
    </div>
  );
}

// src/components/CalendarAgenda.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

const LIFE_EVENTS_KEY = "sw_customer_life_schedule_v1";
const MONEY_SNAPSHOT_KEY = "sw_customer_money_snapshot_v1";
const HEALTH_SNAPSHOT_KEY = "sw_customer_health_snapshot_v1";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function uid() {
  return `${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function safeResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

function toDate(x) {
  if (!x) return null;

  const d = new Date(x);
  return Number.isFinite(d.getTime()) ? d : null;
}

function ymd(date = new Date()) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function localDateTime(dateStr, timeStr = "09:00") {
  if (!dateStr) return null;

  const time = String(timeStr || "09:00").trim() || "09:00";
  return toDate(`${dateStr}T${time}`);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateOnlyLabel(value) {
  const d = toDate(value);
  if (!d) return "No date";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function dateTimeLabel(value) {
  const d = toDate(value);
  if (!d) return "No date";

  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(value) {
  const n = Number(value || 0);

  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function buildGoogleCalendarLink({ title, details, location, start, end }) {
  function fmt(d) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    const mm = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  }

  const safeStart = toDate(start);
  const safeEnd = toDate(end) || (safeStart ? new Date(safeStart.getTime() + 60 * 60 * 1000) : null);

  const s = safeStart ? fmt(safeStart) : null;
  const e = safeEnd ? fmt(safeEnd) : s;

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", title || "SyncWorks Event");

  if (details) params.set("details", details);
  if (location) params.set("location", location);
  if (s && e) params.set("dates", `${s}/${e}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function eventTone(type) {
  if (type === "ticket") return "cyan";
  if (type === "money") return "amber";
  if (type === "health") return "emerald";
  if (type === "todo") return "indigo";
  if (type === "life") return "fuchsia";
  return "slate";
}

function toneClasses(tone) {
  const tones = {
    cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    amber: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
    indigo: "border-indigo-400/25 bg-indigo-500/10 text-indigo-100",
    fuchsia: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100",
    rose: "border-rose-400/25 bg-rose-500/10 text-rose-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-200",
  };

  return tones[tone] || tones.slate;
}

function Pill({ children, tone = "slate" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        toneClasses(tone)
      )}
    >
      {children}
    </span>
  );
}

function Button({ children, onClick, tone = "slate", type = "button", disabled = false, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-xs font-black transition",
        toneClasses(tone),
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-white/[0.07]",
        className
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
      >
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function normalizeTicketTitle(ticket) {
  const title =
    ticket?.taxonomy_label ||
    ticket?.category_label ||
    ticket?.category_name ||
    ticket?.service_category_label ||
    ticket?.title ||
    "Service Request";

  return `Ticket #${ticket?.id || "—"} • ${title}`;
}

function ticketLocation(ticket) {
  return [ticket?.service_address, ticket?.service_zip ? `ZIP ${ticket.service_zip}` : ""]
    .filter(Boolean)
    .join(" • ");
}

function getTicketStart(ticket) {
  return (
    toDate(ticket?.scheduled_at) ||
    toDate(ticket?.schedule_time) ||
    toDate(ticket?.scheduled_start) ||
    toDate(ticket?.appointment_at) ||
    null
  );
}

function getCustomerTodoStorageKey(activeBusinessId) {
  const biz = activeBusinessId || "no_biz";
  return `sw_planner_drag_v2_customer_${biz}`;
}

function normalizeTodoStatus(status) {
  const s = String(status || "TODO").toUpperCase();
  if (s === "DONE") return "Done";
  if (s === "IN_PROGRESS") return "In Progress";
  return "To Do";
}

function buildTodoEvents(activeBusinessId) {
  const key = getCustomerTodoStorageKey(activeBusinessId);
  const items = readJson(key, []);

  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => !item?.archived)
    .filter((item) => item?.due_date)
    .map((item) => {
      const start = localDateTime(item.due_date, "09:00");
      if (!start) return null;

      const end = new Date(start.getTime() + 30 * 60 * 1000);

      const title = item.title || "To-Do Item";
      const details = [
        `Status: ${normalizeTodoStatus(item.status)}`,
        `Priority: ${item.priority || "MED"}`,
        item.notes ? `Notes: ${item.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        id: `todo-${item.id}`,
        source_id: item.id,
        type: "todo",
        title,
        subtitle: normalizeTodoStatus(item.status),
        details,
        location: "",
        start,
        end,
        status: item.status || "TODO",
        href: "",
        calendarUrl: buildGoogleCalendarLink({
          title: `To-Do: ${title}`,
          details,
          location: "",
          start,
          end,
        }),
      };
    })
    .filter(Boolean);
}

function buildMoneyEvents() {
  const snapshot = readJson(MONEY_SNAPSHOT_KEY, null);
  if (!snapshot || typeof snapshot !== "object") return [];

  const dueDate = snapshot.mortgage_due_date;
  const amount = Number(snapshot.mortgage_amount || 0);
  const label = snapshot.mortgage_label || "Mortgage / Rent";

  if (!dueDate && !amount) return [];

  const start = localDateTime(dueDate || ymd(addDays(new Date(), 7)), "09:00");
  if (!start) return [];

  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const details = [
    `${label}: ${money(amount)}`,
    snapshot.covered_percent != null ? `Bills covered: ${snapshot.covered_percent}%` : "",
    snapshot.top_priority ? `Priority: ${snapshot.top_priority}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      id: "money-main-payment",
      type: "money",
      title: `${label} due`,
      subtitle: amount ? money(amount) : "Amount not set",
      details,
      location: "",
      start,
      end,
      status: "PLANNED",
      href: "/customer/finance",
      calendarUrl: buildGoogleCalendarLink({
        title: `${label} due`,
        details,
        location: "",
        start,
        end,
      }),
    },
  ];
}

function buildHealthEvents() {
  const snapshot = readJson(HEALTH_SNAPSHOT_KEY, null);
  if (!snapshot || typeof snapshot !== "object") return [];

  const workout = String(snapshot.workout || "").trim();
  if (!workout) return [];

  const start = localDateTime(ymd(new Date()), "18:00");
  if (!start) return [];

  const end = new Date(start.getTime() + 45 * 60 * 1000);

  const details = [
    `Workout: ${workout}`,
    snapshot.readiness ? `Readiness: ${snapshot.readiness}` : "",
    snapshot.time_available ? `Time: ${snapshot.time_available}` : "",
    snapshot.equipment ? `Equipment: ${snapshot.equipment}` : "",
    snapshot.notes ? `Notes: ${snapshot.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      id: "health-today-workout",
      type: "health",
      title: workout,
      subtitle: snapshot.readiness || "Workout",
      details,
      location: "",
      start,
      end,
      status: "PLANNED",
      href: "/customer/health",
      calendarUrl: buildGoogleCalendarLink({
        title: `Workout: ${workout}`,
        details,
        location: "",
        start,
        end,
      }),
    },
  ];
}

function normalizeLifeEvent(item) {
  const date = item.date || item.due_date || "";
  const time = item.time || "09:00";
  const start = localDateTime(date, time);

  if (!start) return null;

  const minutes = Number(item.duration_minutes || 60);
  const end = new Date(start.getTime() + Math.max(15, minutes) * 60 * 1000);

  const details = [item.notes, item.repeat ? `Repeat: ${item.repeat}` : ""]
    .filter(Boolean)
    .join("\n");

  return {
    id: `life-${item.id}`,
    source_id: item.id,
    type: "life",
    title: item.title || "Life Event",
    subtitle: item.category || "Personal",
    details,
    location: item.location || "",
    start,
    end,
    status: item.status || "PLANNED",
    href: "",
    calendarUrl: buildGoogleCalendarLink({
      title: item.title || "Life Event",
      details,
      location: item.location || "",
      start,
      end,
    }),
  };
}

function groupLabel(key) {
  if (key === "today") return "Today";
  if (key === "week") return "Next 7 Days";
  if (key === "later") return "Later";
  return "Past / Needs Review";
}

function groupEvents(events) {
  const todayStart = startOfToday();
  const tomorrowStart = addDays(todayStart, 1);
  const weekEnd = addDays(todayStart, 7);

  const groups = {
    today: [],
    week: [],
    later: [],
    past: [],
  };

  events.forEach((event) => {
    if (!event?.start) return;

    if (event.start < todayStart) {
      groups.past.push(event);
    } else if (event.start < tomorrowStart) {
      groups.today.push(event);
    } else if (event.start <= weekEnd) {
      groups.week.push(event);
    } else {
      groups.later.push(event);
    }
  });

  return groups;
}

function EventRow({ event, onRemoveLifeEvent }) {
  const tone = eventTone(event.type);
  const isLife = event.type === "life";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={tone}>{event.type}</Pill>
            {event.status ? <Pill tone="slate">{String(event.status).replaceAll("_", " ")}</Pill> : null}
          </div>

          <div className="mt-3 truncate text-base font-black text-white">
            {event.title}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {dateTimeLabel(event.start)}
          </div>

          {event.subtitle ? (
            <div className="mt-1 text-xs text-slate-500">{event.subtitle}</div>
          ) : null}

          {event.location ? (
            <div className="mt-1 text-[11px] text-slate-500">{event.location}</div>
          ) : null}

          {event.details ? (
            <div className="mt-3 whitespace-pre-line rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-xs leading-5 text-slate-400">
              {event.details}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <a
            href={event.calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-500/18"
          >
            + Google
          </a>

          {event.href ? (
            <a
              href={event.href}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-slate-100 hover:bg-white/[0.07]"
            >
              Open
            </a>
          ) : null}

          {isLife ? (
            <button
              type="button"
              onClick={() => onRemoveLifeEvent(event.source_id)}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 text-xs font-black text-rose-100 hover:bg-rose-500/15"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CalendarAgenda({ modeLabel = "Life Schedule", showComposer = true }) {
  const { activeBusinessId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [tickets, setTickets] = useState([]);
  const [lifeEvents, setLifeEvents] = useState(() => {
    const saved = readJson(LIFE_EVENTS_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  const [draft, setDraft] = useState({
    title: "",
    category: "Personal",
    date: ymd(new Date()),
    time: "09:00",
    duration_minutes: "60",
    location: "",
    notes: "",
    repeat: "None",
  });

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const res = await api.get("/tickets/");
      setTickets(safeResults(res.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    writeJson(LIFE_EVENTS_KEY, lifeEvents);
  }, [lifeEvents]);

  function addLifeEvent() {
    const title = String(draft.title || "").trim();
    if (!title) return;

    const next = {
      id: uid(),
      title,
      category: draft.category || "Personal",
      date: draft.date || ymd(new Date()),
      time: draft.time || "09:00",
      duration_minutes: draft.duration_minutes || "60",
      location: draft.location || "",
      notes: draft.notes || "",
      repeat: draft.repeat || "None",
      status: "PLANNED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLifeEvents((prev) => [next, ...prev]);

    setDraft((prev) => ({
      ...prev,
      title: "",
      location: "",
      notes: "",
    }));
  }

  function removeLifeEvent(id) {
    setLifeEvents((prev) => prev.filter((item) => item.id !== id));
  }

  const ticketEvents = useMemo(() => {
    return safeResults(tickets)
      .map((ticket) => {
        const start = getTicketStart(ticket);
        if (!start) return null;

        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const title = normalizeTicketTitle(ticket);
        const location = ticketLocation(ticket);

        const details = [
          `Status: ${ticket.status || "—"}`,
          `Marketplace: ${ticket.is_marketplace ? "Yes" : "No"}`,
          ticket.category_path ? `Category: ${ticket.category_path}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        return {
          id: `ticket-${ticket.id}`,
          source_id: ticket.id,
          type: "ticket",
          title,
          subtitle: ticket.status || "Service",
          details,
          location,
          start,
          end,
          status: ticket.status || "NEW",
          href: `/tickets/${ticket.id}`,
          calendarUrl: buildGoogleCalendarLink({
            title,
            details,
            location,
            start,
            end,
          }),
        };
      })
      .filter(Boolean);
  }, [tickets]);

  const lifeScheduleEvents = useMemo(() => {
    return safeResults(lifeEvents).map(normalizeLifeEvent).filter(Boolean);
  }, [lifeEvents]);

  const todoEvents = useMemo(() => {
    return buildTodoEvents(activeBusinessId);
  }, [activeBusinessId, lifeEvents]);

  const moneyEvents = useMemo(() => buildMoneyEvents(), [lifeEvents]);
  const healthEvents = useMemo(() => buildHealthEvents(), [lifeEvents]);

  const allEvents = useMemo(() => {
    return [
      ...ticketEvents,
      ...moneyEvents,
      ...healthEvents,
      ...todoEvents,
      ...lifeScheduleEvents,
    ].sort((a, b) => {
      const at = a.start ? a.start.getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.start ? b.start.getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
  }, [ticketEvents, moneyEvents, healthEvents, todoEvents, lifeScheduleEvents]);

  const grouped = useMemo(() => groupEvents(allEvents), [allEvents]);

  const stats = useMemo(() => {
    return {
      total: allEvents.length,
      tickets: allEvents.filter((x) => x.type === "ticket").length,
      money: allEvents.filter((x) => x.type === "money").length,
      health: allEvents.filter((x) => x.type === "health").length,
      todo: allEvents.filter((x) => x.type === "todo").length,
      life: allEvents.filter((x) => x.type === "life").length,
    };
  }, [allEvents]);

  const noEvents = allEvents.length === 0;

  return (
    <div className="rounded-[1.65rem] border border-white/10 bg-slate-950/45 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-black text-white">{modeLabel}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            Tickets, bills, workouts, tasks, and life reminders in one schedule.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="cyan">Tickets {stats.tickets}</Pill>
            <Pill tone="amber">Money {stats.money}</Pill>
            <Pill tone="emerald">Health {stats.health}</Pill>
            <Pill tone="indigo">To-Do {stats.todo}</Pill>
            <Pill tone="fuchsia">Life {stats.life}</Pill>
          </div>
        </div>

        <Button tone="slate" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
          {err}
        </div>
      ) : null}

      {showComposer ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">Add life event</div>
              <div className="mt-1 text-xs text-slate-400">
                Mortgage reminder, appointment, practice, family task, subscription renewal, or anything else.
              </div>
            </div>

            <Pill tone="fuchsia">Manual</Pill>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field
              label="Title"
              value={draft.title}
              onChange={(value) => setDraft((p) => ({ ...p, title: value }))}
              placeholder="Mortgage due"
            />

            <SelectField
              label="Category"
              value={draft.category}
              onChange={(value) => setDraft((p) => ({ ...p, category: value }))}
              options={[
                "Personal",
                "Bill",
                "Family",
                "Health",
                "Appointment",
                "Subscription",
                "Service",
              ]}
            />

            <Field
              label="Date"
              type="date"
              value={draft.date}
              onChange={(value) => setDraft((p) => ({ ...p, date: value }))}
            />

            <Field
              label="Time"
              type="time"
              value={draft.time}
              onChange={(value) => setDraft((p) => ({ ...p, time: value }))}
            />

            <Field
              label="Duration minutes"
              type="number"
              value={draft.duration_minutes}
              onChange={(value) => setDraft((p) => ({ ...p, duration_minutes: value }))}
              placeholder="60"
            />

            <Field
              label="Location"
              value={draft.location}
              onChange={(value) => setDraft((p) => ({ ...p, location: value }))}
              placeholder="Home, gym, office..."
            />

            <SelectField
              label="Repeat"
              value={draft.repeat}
              onChange={(value) => setDraft((p) => ({ ...p, repeat: value }))}
              options={["None", "Daily", "Weekly", "Monthly", "Yearly"]}
            />

            <div className="flex items-end">
              <Button tone="fuchsia" onClick={addLifeEvent} className="w-full">
                + Add Event
              </Button>
            </div>
          </div>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">Notes</div>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
          Loading schedule...
        </div>
      ) : null}

      {!loading && noEvents ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
          <div className="text-sm font-black text-white">No scheduled items yet.</div>
          <div className="mt-1 text-sm text-slate-400">
            Add a life event, schedule a ticket, add a to-do due date, or update Money/Health.
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {["today", "week", "later", "past"].map((groupKey) => {
          const items = grouped[groupKey] || [];
          if (!items.length) return null;

          return (
            <section key={groupKey}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-black text-white">{groupLabel(groupKey)}</div>
                <Pill tone="slate">{items.length}</Pill>
              </div>

              <div className="space-y-3">
                {items.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    onRemoveLifeEvent={removeLifeEvent}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-500">
        Production note: this is frontend-first storage. Backend persistence can come next once the UX is locked.
      </div>
    </div>
  );
}
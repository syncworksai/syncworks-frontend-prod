import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import api from "../../api/client";
import "./MobileCalendarBoard.css";

const STORAGE_KEY = "sw_customer_life_schedule_v1";

function uid() {
  return `${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function readEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // no-op
  }
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function ymd(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

function localDateTime(date, time = "09:00") {
  const value = new Date(`${date}T${time || "09:00"}`);
  return Number.isFinite(value.getTime()) ? value : null;
}

function ticketStart(ticket) {
  const raw =
    ticket?.scheduled_at ||
    ticket?.schedule_time ||
    ticket?.scheduled_start ||
    ticket?.appointment_at;

  if (!raw) return null;
  const value = new Date(raw);
  return Number.isFinite(value.getTime()) ? value : null;
}

function ticketTitle(ticket) {
  return (
    ticket?.taxonomy_label ||
    ticket?.category_label ||
    ticket?.category_name ||
    ticket?.service_category_label ||
    ticket?.title ||
    `Service request #${ticket?.id || ""}`
  );
}

function timeLabel(value) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Drawer({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="sw-mobile-cal-overlay" onMouseDown={onClose}>
      <section
        className="sw-mobile-cal-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>Personal calendar</span>
            <h3>{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default function MobileCalendarBoard() {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDate, setSelectedDate] = useState(() => ymd(today));
  const [tickets, setTickets] = useState([]);
  const [lifeEvents, setLifeEvents] = useState(readEvents);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    category: "Personal",
    date: ymd(today),
    time: "09:00",
    duration_minutes: "60",
    location: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;

    async function loadTickets() {
      setLoading(true);
      try {
        const response = await api.get("/tickets/");
        if (active) setTickets(safeList(response.data));
      } catch {
        if (active) setTickets([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTickets();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    writeEvents(lifeEvents);
  }, [lifeEvents]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const events = useMemo(() => {
    const serviceEvents = tickets
      .map((ticket) => {
        const start = ticketStart(ticket);
        if (!start) return null;

        return {
          id: `ticket-${ticket.id}`,
          type: "ticket",
          title: ticketTitle(ticket),
          subtitle: ticket.status || "Service",
          start,
          end: new Date(start.getTime() + 60 * 60 * 1000),
          location: ticket.service_address || "",
          sourceId: ticket.id,
        };
      })
      .filter(Boolean);

    const personalEvents = lifeEvents
      .map((item) => {
        const start = localDateTime(item.date, item.time);
        if (!start) return null;

        return {
          id: `life-${item.id}`,
          type: "life",
          title: item.title || "Personal event",
          subtitle: item.category || "Personal",
          start,
          end: new Date(
            start.getTime() + Math.max(15, Number(item.duration_minutes || 60)) * 60 * 1000
          ),
          location: item.location || "",
          sourceId: item.id,
        };
      })
      .filter(Boolean);

    return [...serviceEvents, ...personalEvents].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );
  }, [lifeEvents, tickets]);

  const counts = useMemo(() => {
    return events.reduce((result, event) => {
      const key = ymd(event.start);
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }, [events]);

  const selectedEvents = useMemo(
    () => events.filter((event) => ymd(event.start) === selectedDate),
    [events, selectedDate]
  );

  function openCreate(date = selectedDate) {
    setEditingId("");
    setDraft({
      title: "",
      category: "Personal",
      date,
      time: "09:00",
      duration_minutes: "60",
      location: "",
      notes: "",
    });
    setDrawerOpen(true);
  }

  function openEdit(event) {
    const source = lifeEvents.find((item) => item.id === event.sourceId);
    if (!source) return;

    setEditingId(source.id);
    setDraft({
      title: source.title || "",
      category: source.category || "Personal",
      date: source.date || selectedDate,
      time: source.time || "09:00",
      duration_minutes: String(source.duration_minutes || 60),
      location: source.location || "",
      notes: source.notes || "",
    });
    setDrawerOpen(true);
  }

  function saveEvent() {
    const title = String(draft.title || "").trim();
    if (!title) return;

    if (editingId) {
      setLifeEvents((current) =>
        current.map((item) =>
          item.id === editingId
            ? { ...item, ...draft, title, updated_at: new Date().toISOString() }
            : item
        )
      );
    } else {
      setLifeEvents((current) => [
        {
          id: uid(),
          ...draft,
          title,
          status: "PLANNED",
          repeat: "None",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...current,
      ]);
    }

    setSelectedDate(draft.date);
    setDrawerOpen(false);
  }

  function deleteEvent(id) {
    setLifeEvents((current) => current.filter((item) => item.id !== id));
    setDrawerOpen(false);
  }

  function moveEvent(id, date) {
    setLifeEvents((current) =>
      current.map((item) =>
        item.id === id ? { ...item, date, updated_at: new Date().toISOString() } : item
      )
    );
    setSelectedDate(date);
  }

  return (
    <section className="sw-mobile-cal md:hidden">
      <div className="sw-mobile-cal-top">
        <div>
          <span>Life schedule</span>
          <h2>
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>

        <button type="button" className="sw-mobile-cal-add" onClick={() => openCreate()}>
          <Plus aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="sw-mobile-cal-nav">
        <button
          type="button"
          onClick={() => setWeekStart((current) => addDays(current, -7))}
          aria-label="Previous week"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="today"
          onClick={() => {
            setWeekStart(startOfWeek(today));
            setSelectedDate(ymd(today));
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setWeekStart((current) => addDays(current, 7))}
          aria-label="Next week"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="sw-mobile-cal-week">
        {weekDays.map((day) => {
          const key = ymd(day);
          const active = key === selectedDate;

          return (
            <button
              key={key}
              type="button"
              className={active ? "active" : ""}
              onClick={() => setSelectedDate(key)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData("text/plain");
                if (id) moveEvent(id, key);
              }}
            >
              <span>{day.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
              <strong>{day.getDate()}</strong>
              <i>{counts[key] || ""}</i>
            </button>
          );
        })}
      </div>

      <div className="sw-mobile-cal-date">
        <div>
          <CalendarDays aria-hidden="true" />
          <strong>
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </strong>
        </div>
        <span>{loading ? "Loading…" : `${selectedEvents.length} scheduled`}</span>
      </div>

      <div className="sw-mobile-cal-agenda">
        {selectedEvents.length ? (
          selectedEvents.map((event) => (
            <article
              key={event.id}
              className={`sw-mobile-cal-event ${event.type}`}
              draggable={event.type === "life"}
              onDragStart={(dragEvent) =>
                dragEvent.dataTransfer.setData("text/plain", event.sourceId)
              }
            >
              <div className="time">
                <strong>{timeLabel(event.start)}</strong>
                <span>{timeLabel(event.end)}</span>
              </div>

              <div className="body">
                <h3>{event.title}</h3>
                <p>{event.subtitle}</p>

                {event.location ? (
                  <div className="meta">
                    <MapPin aria-hidden="true" />
                    {event.location}
                  </div>
                ) : null}

                <div className="meta">
                  <Clock3 aria-hidden="true" />
                  {Math.round((new Date(event.end) - new Date(event.start)) / 60000)} min
                </div>
              </div>

              {event.type === "life" ? (
                <div className="actions">
                  <button type="button" onClick={() => openEdit(event)} aria-label="Edit">
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEvent(event.sourceId)}
                    aria-label="Delete"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <button type="button" className="sw-mobile-cal-empty" onClick={() => openCreate()}>
            <Plus aria-hidden="true" />
            <strong>Nothing scheduled</strong>
            <span>Tap to add an event.</span>
          </button>
        )}
      </div>

      <p className="sw-mobile-cal-hint">
        Drag personal events to another day on desktop. Tap Edit to reschedule on mobile.
      </p>

      <Drawer
        open={drawerOpen}
        title={editingId ? "Edit event" : "Add event"}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="sw-mobile-cal-form">
          <label className="wide">
            <span>Title</span>
            <input
              autoFocus
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Appointment, practice, bill…"
            />
          </label>

          <label>
            <span>Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft((current) => ({ ...current, date: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Time</span>
            <input
              type="time"
              value={draft.time}
              onChange={(event) =>
                setDraft((current) => ({ ...current, time: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Duration</span>
            <select
              value={draft.duration_minutes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  duration_minutes: event.target.value,
                }))
              }
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </label>

          <label>
            <span>Category</span>
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
            >
              {["Personal", "Family", "Health", "Appointment", "Bill", "Service"].map(
                (option) => (
                  <option key={option}>{option}</option>
                )
              )}
            </select>
          </label>

          <label className="wide">
            <span>Location</span>
            <input
              value={draft.location}
              onChange={(event) =>
                setDraft((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Home, office, gym…"
            />
          </label>

          <label className="wide">
            <span>Notes</span>
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="sw-mobile-cal-drawer-actions">
          {editingId ? (
            <button type="button" className="danger" onClick={() => deleteEvent(editingId)}>
              Delete
            </button>
          ) : (
            <span />
          )}

          <button type="button" className="primary" onClick={saveEvent}>
            {editingId ? "Save changes" : "Add event"}
          </button>
        </div>
      </Drawer>
    </section>
  );
}

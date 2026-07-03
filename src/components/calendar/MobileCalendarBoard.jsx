import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
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

function timeLabel(value, allDay = false) {
  if (allDay) return "All day";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateLabel(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function categoryClass(category) {
  return String(category || "Personal").toLowerCase().replace(/[^a-z]+/g, "-");
}

function Drawer({ open, title, onClose, children, className = "" }) {
  if (!open) return null;

  return (
    <div className="sw-mobile-cal-overlay" onMouseDown={onClose}>
      <section
        className={`sw-mobile-cal-drawer ${className}`}
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
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const touchStartX = useRef(null);
  const toastTimer = useRef(null);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDate, setSelectedDate] = useState(() => ymd(today));
  const [tickets, setTickets] = useState([]);
  const [lifeEvents, setLifeEvents] = useState(readEvents);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [draft, setDraft] = useState({
    title: "",
    category: "Personal",
    date: ymd(today),
    time: "09:00",
    duration_minutes: "60",
    location: "",
    notes: "",
    all_day: false,
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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }

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
          notes: ticket.description || "",
          sourceId: ticket.id,
          allDay: false,
          category: "Service",
        };
      })
      .filter(Boolean);

    const personalEvents = lifeEvents
      .map((item) => {
        const start = localDateTime(item.date, item.all_day ? "09:00" : item.time);
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
          notes: item.notes || "",
          sourceId: item.id,
          allDay: Boolean(item.all_day),
          category: item.category || "Personal",
        };
      })
      .filter(Boolean);

    return [...serviceEvents, ...personalEvents].sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return new Date(a.start) - new Date(b.start);
    });
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

  const nowMarkerPercent = useMemo(() => {
    if (selectedDate !== ymd(now)) return null;
    const minutes = now.getHours() * 60 + now.getMinutes();
    return Math.max(0, Math.min(100, (minutes / 1440) * 100));
  }, [now, selectedDate]);

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
      all_day: false,
    });
    setComposerOpen(true);
  }

  function openEdit(event) {
    const source = lifeEvents.find((item) => item.id === event.sourceId);
    if (!source) return;

    setDetailEvent(null);
    setEditingId(source.id);
    setDraft({
      title: source.title || "",
      category: source.category || "Personal",
      date: source.date || selectedDate,
      time: source.time || "09:00",
      duration_minutes: String(source.duration_minutes || 60),
      location: source.location || "",
      notes: source.notes || "",
      all_day: Boolean(source.all_day),
    });
    setComposerOpen(true);
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
      showToast("Event updated");
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
      showToast("Event added");
    }

    setSelectedDate(draft.date);
    setWeekStart(startOfWeek(new Date(`${draft.date}T12:00:00`)));
    setComposerOpen(false);
  }

  function requestDelete(id) {
    setDeleteId(id);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setLifeEvents((current) => current.filter((item) => item.id !== deleteId));
    setDeleteId("");
    setComposerOpen(false);
    setDetailEvent(null);
    showToast("Event deleted");
  }

  function moveEvent(id, date) {
    setLifeEvents((current) =>
      current.map((item) =>
        item.id === id ? { ...item, date, updated_at: new Date().toISOString() } : item
      )
    );
    setSelectedDate(date);
    showToast("Event moved");
  }

  function shiftWeek(amount) {
    setWeekStart((current) => addDays(current, amount * 7));
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches?.[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches?.[0]?.clientX;
    if (endX == null) return;

    const distance = endX - touchStartX.current;
    if (Math.abs(distance) > 55) {
      shiftWeek(distance < 0 ? 1 : -1);
    }
    touchStartX.current = null;
  }

  return (
    <section className="sw-mobile-cal md:hidden">
      {toast ? (
        <div className="sw-mobile-cal-toast" role="status">
          <CheckCircle2 aria-hidden="true" />
          {toast}
        </div>
      ) : null}

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
        <button type="button" onClick={() => shiftWeek(-1)} aria-label="Previous week">
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
        <button type="button" onClick={() => shiftWeek(1)} aria-label="Next week">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div
        className="sw-mobile-cal-week"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {weekDays.map((day) => {
          const key = ymd(day);
          const active = key === selectedDate;
          const isToday = key === ymd(today);

          return (
            <button
              key={key}
              type="button"
              className={`${active ? "active" : ""} ${isToday ? "is-today" : ""}`}
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
          <strong>{dateLabel(`${selectedDate}T12:00:00`)}</strong>
        </div>
        <span>{loading ? "Loading…" : `${selectedEvents.length} scheduled`}</span>
      </div>

      {nowMarkerPercent != null ? (
        <div className="sw-mobile-cal-now" aria-label={`Current time ${timeLabel(now)}`}>
          <span />
          <strong>{timeLabel(now)}</strong>
          <i style={{ width: `${nowMarkerPercent}%` }} />
        </div>
      ) : null}

      <div className="sw-mobile-cal-agenda">
        {selectedEvents.length ? (
          selectedEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className={`sw-mobile-cal-event ${event.type} category-${categoryClass(
                event.category
              )}`}
              draggable={event.type === "life"}
              onClick={() => setDetailEvent(event)}
              onDragStart={(dragEvent) => {
                if (event.type === "life") {
                  dragEvent.dataTransfer.setData("text/plain", event.sourceId);
                }
              }}
            >
              <div className="time">
                <strong>{timeLabel(event.start, event.allDay)}</strong>
                {!event.allDay ? <span>{timeLabel(event.end)}</span> : null}
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
                  {event.allDay
                    ? "All-day event"
                    : `${Math.round(
                        (new Date(event.end) - new Date(event.start)) / 60000
                      )} min`}
                </div>
              </div>

              <ChevronRight className="event-chevron" aria-hidden="true" />
            </button>
          ))
        ) : (
          <button type="button" className="sw-mobile-cal-empty" onClick={() => openCreate()}>
            <Plus aria-hidden="true" />
            <strong>Nothing scheduled</strong>
            <span>Tap to add an event for this day.</span>
          </button>
        )}
      </div>

      <p className="sw-mobile-cal-hint">
        Swipe the week strip to change weeks. Tap an event for details.
      </p>

      <button
        type="button"
        className="sw-mobile-cal-fab"
        onClick={() => openCreate()}
        aria-label="Add calendar event"
      >
        <Plus aria-hidden="true" />
      </button>

      <Drawer
        open={Boolean(detailEvent)}
        title={detailEvent?.title || "Event details"}
        onClose={() => setDetailEvent(null)}
        className="detail"
      >
        {detailEvent ? (
          <div className="sw-mobile-cal-detail">
            <div className={`sw-mobile-cal-detail-badge ${detailEvent.type}`}>
              {detailEvent.subtitle}
            </div>

            <div className="sw-mobile-cal-detail-row">
              <CalendarDays aria-hidden="true" />
              <div>
                <span>Date</span>
                <strong>{dateLabel(detailEvent.start)}</strong>
              </div>
            </div>

            <div className="sw-mobile-cal-detail-row">
              <Clock3 aria-hidden="true" />
              <div>
                <span>Time</span>
                <strong>
                  {detailEvent.allDay
                    ? "All day"
                    : `${timeLabel(detailEvent.start)} – ${timeLabel(detailEvent.end)}`}
                </strong>
              </div>
            </div>

            {detailEvent.location ? (
              <div className="sw-mobile-cal-detail-row">
                <MapPin aria-hidden="true" />
                <div>
                  <span>Location</span>
                  <strong>{detailEvent.location}</strong>
                </div>
              </div>
            ) : null}

            {detailEvent.notes ? (
              <div className="sw-mobile-cal-detail-notes">{detailEvent.notes}</div>
            ) : null}

            <div className="sw-mobile-cal-detail-actions">
              {detailEvent.type === "life" ? (
                <>
                  <button type="button" onClick={() => openEdit(detailEvent)}>
                    <Pencil aria-hidden="true" />
                    Edit / move
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => requestDelete(detailEvent.sourceId)}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/tickets/${detailEvent.sourceId}`)}
                >
                  <ExternalLink aria-hidden="true" />
                  Open request
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={composerOpen}
        title={editingId ? "Edit event" : "Add event"}
        onClose={() => setComposerOpen(false)}
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

          <label className="sw-mobile-cal-toggle wide">
            <input
              type="checkbox"
              checked={draft.all_day}
              onChange={(event) =>
                setDraft((current) => ({ ...current, all_day: event.target.checked }))
              }
            />
            <span>All-day event</span>
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
              disabled={draft.all_day}
              onChange={(event) =>
                setDraft((current) => ({ ...current, time: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Duration</span>
            <select
              value={draft.duration_minutes}
              disabled={draft.all_day}
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
              placeholder="Optional details"
            />
          </label>
        </div>

        <div className="sw-mobile-cal-drawer-actions">
          {editingId ? (
            <button type="button" className="danger" onClick={() => requestDelete(editingId)}>
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

      <Drawer
        open={Boolean(deleteId)}
        title="Delete event?"
        onClose={() => setDeleteId("")}
        className="confirm"
      >
        <div className="sw-mobile-cal-confirm">
          <p>This event will be removed from your Personal calendar.</p>
          <div>
            <button type="button" onClick={() => setDeleteId("")}>
              Cancel
            </button>
            <button type="button" className="danger" onClick={confirmDelete}>
              Delete event
            </button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}
